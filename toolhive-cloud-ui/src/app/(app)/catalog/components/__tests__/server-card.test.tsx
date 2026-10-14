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

  it("display server information with name and description (grid)", () => {
    render(<ServerCard server={mockServer} />);

    // 效果图 01 网格卡：标题 + 描述；作者并入「N 次调用 · 作者」行（仅列表形态展示）
    expect(screen.getByText("test-org/test-server")).toBeTruthy();
    expect(screen.getByText("This is a test server for MCP")).toBeTruthy();
  });

  it("shows author in the list layout meta line", () => {
    render(<ServerCard server={mockServer} layout="list" />);

    expect(screen.getAllByText(/test-org/).length).toBeGreaterThan(0);
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

  it("does not show 接入 (connect) button in list layout", () => {
    // 2026-10-14 拍板：列表卡接入钮整体移除——registry 数据链无凭证字段，
    // 受限条目从列表卡复制出的配置必然 403；接入统一收口到详情页。
    render(<ServerCard server={mockServer} layout="list" />);

    expect(screen.queryByRole("button", { name: /接入/ })).toBeNull();
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
