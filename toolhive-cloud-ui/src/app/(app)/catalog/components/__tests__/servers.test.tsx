import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { V0ServerJson } from "@/generated/types.gen";
import { Servers } from "../servers";

const mockOnClearSearch = vi.fn();

const mockServers: V0ServerJson[] = [
  {
    name: "aws-nova-canvas",
    title: "AWS Nova Canvas",
    description: "Image generation using Amazon Nova Canvas",
    websiteUrl: "https://github.com/awslabs/aws-nova-canvas",
  },
  {
    name: "google-applications",
    title: "Google Applications",
    description: "Access your Google Workspace apps",
    websiteUrl: "https://github.com/google/mcp-google-apps",
  },
  {
    name: "azure-mcp",
    title: "Azure MCP",
    description: "Connect AI assistants to Azure services",
    remotes: [{ type: "http", url: "https://example.com/azure" }],
  },
];

describe("Servers", () => {
  describe("grid mode", () => {
    it("displays servers in grid layout", () => {
      render(
        <Servers
          servers={mockServers}
          registryName="default-registry"
          viewMode="grid"
          searchQuery=""
          onClearSearch={mockOnClearSearch}
        />,
      );

      expect(screen.getByText("AWS Nova Canvas")).toBeVisible();
      expect(screen.getByText("Google Applications")).toBeVisible();
      expect(screen.getByText("Azure MCP")).toBeVisible();
    });

    it("displays grid container", () => {
      const { container } = render(
        <Servers
          servers={mockServers}
          registryName="default-registry"
          viewMode="grid"
          searchQuery=""
          onClearSearch={mockOnClearSearch}
        />,
      );

      const grid = container.querySelector(".grid");
      expect(grid).toBeVisible();
    });
  });

  describe("list mode", () => {
    it("displays servers in table layout", () => {
      render(
        <Servers
          servers={mockServers}
          registryName="default-registry"
          viewMode="list"
          searchQuery=""
          onClearSearch={mockOnClearSearch}
        />,
      );

      expect(screen.getByText("AWS Nova Canvas")).toBeVisible();
      expect(screen.getByText("Google Applications")).toBeVisible();
      expect(screen.getByText("Azure MCP")).toBeVisible();
    });

    it("displays table headers", () => {
      render(
        <Servers
          servers={mockServers}
          registryName="default-registry"
          viewMode="list"
          searchQuery=""
          onClearSearch={mockOnClearSearch}
        />,
      );

      expect(screen.getByText("名称")).toBeVisible();
      expect(screen.getByText("描述")).toBeVisible();
    });
  });

  describe("empty state with active search", () => {
    it("shows no results message when servers list is empty and search is active", () => {
      render(
        <Servers
          servers={[]}
          registryName="default-registry"
          viewMode="grid"
          searchQuery="nonexistent"
          onClearSearch={mockOnClearSearch}
        />,
      );

      expect(screen.getByText("未找到匹配结果")).toBeVisible();
      expect(
        screen.getByText(/没有找到与"nonexistent"匹配的服务/),
      ).toBeVisible();
    });

    it("shows clear search button when servers list is empty and search is active", async () => {
      const user = userEvent.setup();
      const onClearSearch = vi.fn();

      render(
        <Servers
          servers={[]}
          registryName="default-registry"
          viewMode="grid"
          searchQuery="nonexistent"
          onClearSearch={onClearSearch}
        />,
      );

      const clearButton = screen.getByRole("button", {
        name: /清除搜索/,
      });
      expect(clearButton).toBeVisible();

      await user.click(clearButton);
      expect(onClearSearch).toHaveBeenCalledTimes(1);
    });
  });

  describe("empty state", () => {
    it("shows no servers message when list is empty", () => {
      render(
        <Servers
          servers={[]}
          registryName="default-registry"
          viewMode="grid"
          searchQuery=""
          onClearSearch={mockOnClearSearch}
        />,
      );

      expect(screen.getByText("暂无可用服务")).toBeVisible();
      expect(screen.getByText(/目录中还没有 MCP 服务/i)).toBeVisible();
    });

    it("shows no servers message in list mode", () => {
      render(
        <Servers
          servers={[]}
          registryName="default-registry"
          viewMode="list"
          searchQuery=""
          onClearSearch={mockOnClearSearch}
        />,
      );

      expect(screen.getByText("暂无可用服务")).toBeVisible();
    });

    it("displays illustration in empty state", () => {
      const { container } = render(
        <Servers
          servers={[]}
          registryName="default-registry"
          viewMode="grid"
          searchQuery=""
          onClearSearch={mockOnClearSearch}
        />,
      );

      expect(container.querySelector("svg")).toBeVisible();
    });

    it("does not show clear search button when no servers and no search", () => {
      render(
        <Servers
          servers={[]}
          registryName="default-registry"
          viewMode="grid"
          searchQuery=""
          onClearSearch={mockOnClearSearch}
        />,
      );

      expect(
        screen.queryByRole("button", { name: /清除搜索/ }),
      ).not.toBeInTheDocument();
    });
  });
});
