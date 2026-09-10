import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type {
  GithubComStacklokToolhiveRegistryServerInternalServiceRegistryInfo,
  V0ServerJson,
} from "@/generated/types.gen";
import { CATALOG_PAGE_SIZE } from "../../constants";
import { ServersWrapper } from "../servers-wrapper";

const mockRegistries: GithubComStacklokToolhiveRegistryServerInternalServiceRegistryInfo[] =
  [{ name: "default-registry" }, { name: "custom-registry" }];

function makeServer(name: string, description: string): V0ServerJson {
  return {
    name,
    title: name,
    description,
    websiteUrl: `https://github.com/example/${name}`,
  };
}

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
];

// 超过一页容量（CATALOG_PAGE_SIZE=15）的数据集，用于翻页测试
const pagedServers: V0ServerJson[] = Array.from(
  { length: CATALOG_PAGE_SIZE + 3 },
  (_, i) =>
    makeServer(
      `server-${String(i + 1).padStart(2, "0")}`,
      `test server ${i + 1}`,
    ),
);

describe("ServersWrapper", () => {
  it("has header with title", () => {
    render(
      <ServersWrapper servers={mockServers} registries={mockRegistries} />,
    );

    expect(screen.getByText("MCP 目录")).toBeVisible();
  });

  it("has catalog filters", () => {
    render(
      <ServersWrapper servers={mockServers} registries={mockRegistries} />,
    );

    expect(screen.getByLabelText("List view")).toBeVisible();
    expect(screen.getByLabelText("Grid view")).toBeVisible();
    // 两个注册表时显示切换器
    expect(screen.getByLabelText("选择注册表")).toBeVisible();
    expect(screen.getByPlaceholderText("搜索")).toBeVisible();
  });

  it("hides registry selector when only one registry exists", () => {
    render(
      <ServersWrapper
        servers={mockServers}
        registries={[{ name: "default" }]}
      />,
    );

    expect(screen.queryByLabelText("选择注册表")).not.toBeInTheDocument();
  });

  it("displays servers in grid mode by default", () => {
    render(
      <ServersWrapper servers={mockServers} registries={mockRegistries} />,
    );

    expect(screen.getByText("AWS Nova Canvas")).toBeVisible();
    expect(screen.getByText("Google Applications")).toBeVisible();
  });

  it("switches to list mode when list button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ServersWrapper servers={mockServers} registries={mockRegistries} />,
    );

    await user.click(screen.getByLabelText("List view"));

    await waitFor(() => {
      expect(screen.getByText("名称")).toBeVisible();
      expect(screen.getByText("描述")).toBeVisible();
      expect(screen.getByText("AWS Nova Canvas")).toBeVisible();
    });
  });

  it("switches back to grid mode when grid button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ServersWrapper servers={mockServers} registries={mockRegistries} />,
    );

    await user.click(screen.getByLabelText("List view"));
    await user.click(screen.getByLabelText("Grid view"));

    await waitFor(() => {
      expect(screen.getByText("AWS Nova Canvas")).toBeVisible();
      expect(screen.queryByText("Server")).not.toBeInTheDocument();
    });
  });

  it("filters servers client-side while typing (instant, no server round trip)", async () => {
    const user = userEvent.setup();
    render(
      <ServersWrapper servers={mockServers} registries={mockRegistries} />,
    );

    const searchInput = screen.getByPlaceholderText("搜索") as HTMLInputElement;
    await user.type(searchInput, "aws");

    expect(searchInput.value).toBe("aws");
    expect(screen.getByText("AWS Nova Canvas")).toBeVisible();
    expect(screen.queryByText("Google Applications")).not.toBeInTheDocument();
  });

  it("maintains search value when switching view modes", async () => {
    const user = userEvent.setup();
    render(
      <ServersWrapper servers={mockServers} registries={mockRegistries} />,
    );

    const searchInput = screen.getByPlaceholderText("搜索") as HTMLInputElement;
    await user.type(searchInput, "aws");
    expect(searchInput.value).toBe("aws");

    await user.click(screen.getByLabelText("List view"));

    await waitFor(() => {
      expect(screen.getByText("名称")).toBeVisible();
    });

    expect(searchInput.value).toBe("aws");
  });

  it("hides pagination controls when all items fit on one page", () => {
    render(
      <ServersWrapper servers={mockServers} registries={mockRegistries} />,
    );

    expect(screen.queryByRole("button", { name: /上一页/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /下一页/ })).toBeNull();
  });

  it("renders pagination controls when items exceed one page", () => {
    render(
      <ServersWrapper servers={pagedServers} registries={mockRegistries} />,
    );

    expect(screen.getByRole("button", { name: /上一页/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /下一页/ })).toBeVisible();
    expect(screen.getByRole("button", { name: "第 1 页" })).toBeVisible();
    expect(screen.getByRole("button", { name: "第 2 页" })).toBeVisible();
  });

  it("disables previous button on first page", () => {
    render(
      <ServersWrapper servers={pagedServers} registries={mockRegistries} />,
    );

    expect(screen.getByRole("button", { name: /上一页/ })).toBeDisabled();
  });

  it("moves to the second page when next is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ServersWrapper servers={pagedServers} registries={mockRegistries} />,
    );

    const next = screen.getByRole("button", { name: /下一页/ });
    expect(next).not.toBeDisabled();

    await user.click(next);
    expect(screen.getByRole("button", { name: "第 2 页" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
