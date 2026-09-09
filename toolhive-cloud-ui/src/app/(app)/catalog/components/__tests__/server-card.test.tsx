import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { V0ServerJson } from "@/generated/types.gen";
import { ServerCard } from "../server-card";

describe("ServerCard", () => {
  const mockServer: V0ServerJson = {
    name: "test-org/test-server",
    description: "This is a test server for MCP",
    repository: {
      id: "test-org",
      source: "github",
      url: "https://github.com/test-org/test-server",
    },
  };

  it("display server information with name, author and description", () => {
    render(<ServerCard server={mockServer} serverUrl="/servers/test-server" />);

    expect(screen.getByText("test-org/test-server")).toBeTruthy();
    expect(screen.getByText("test-org")).toBeTruthy();
    expect(screen.getByText("This is a test server for MCP")).toBeTruthy();
  });

  it("does not show author when repository data is missing", () => {
    const minimalServer: V0ServerJson = {
      name: undefined,
      description: undefined,
      repository: undefined,
    };
    const { container } = render(<ServerCard server={minimalServer} />);

    const authorElement = container.querySelector(
      '[data-slot="card-description"]',
    );

    expect(authorElement?.textContent).toBeFalsy();
    expect(screen.getByText("暂无描述")).toBeTruthy();
  });

  it("has 调用 (connect) button", () => {
    render(<ServerCard server={mockServer} serverUrl="/servers/test-server" />);

    // 卡片上的接入动作已由 Copy URL 按钮升级为「调用」配置弹窗
    const callButton = screen.getByRole("button", { name: /调用/ });
    expect(callButton).toBeTruthy();
  });

  it("displays Virtual MCP badge for Virtual MCP servers", () => {
    const virtualMCPServer: V0ServerJson = {
      name: "com.toolhive.k8s.production/my-vmcp-server",
      description: "Virtual MCP server",
      _meta: {
        "io.modelcontextprotocol.registry/publisher-provided": {
          "io.github.stacklok": {
            "https://mcp.example.com/servers/my-vmcp-server": {
              metadata: {
                kubernetes: {
                  kind: "VirtualMCPServer",
                },
              },
            },
          },
        },
      },
    };

    render(<ServerCard server={virtualMCPServer} />);

    expect(screen.getByText("Virtual MCP")).toBeVisible();
  });

  it("does not display Virtual MCP badge for regular servers", () => {
    render(<ServerCard server={mockServer} />);

    expect(screen.queryByText("Virtual MCP")).not.toBeInTheDocument();
  });
});
