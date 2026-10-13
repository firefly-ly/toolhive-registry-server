import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSearchParams } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

// useSearchParams 在 vitest.setup.ts 里被 mock 成 vi.fn，这里按用例注入查询串
const mockedUseSearchParams = vi.mocked(useSearchParams);
function setSearchParams(qs: string) {
  mockedUseSearchParams.mockReturnValue(
    new URLSearchParams(qs) as unknown as ReturnType<typeof useSearchParams>,
  );
}

beforeEach(() => {
  setSearchParams("");
});

describe("ServersWrapper", () => {
  // 效果图 01：页头标题退场，hero 通栏即门面
  it("renders hero headline instead of page header", () => {
    render(
      <ServersWrapper servers={mockServers} registries={mockRegistries} />,
    );

    expect(screen.getByText(/找到你要的/)).toBeVisible();
  });

  it("has catalog filters (view switch + registry selector)", () => {
    render(
      <ServersWrapper servers={mockServers} registries={mockRegistries} />,
    );

    expect(screen.getByLabelText("列表视图")).toBeVisible();
    expect(screen.getByLabelText("网格视图")).toBeVisible();
    // 两个注册表时显示切换器
    expect(screen.getByLabelText("选择注册表")).toBeVisible();
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

    await user.click(screen.getByLabelText("列表视图"));

    await waitFor(() => {
      expect(screen.getByText("AWS Nova Canvas")).toBeVisible();
    });
  });

  it("switches back to grid mode when grid button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ServersWrapper servers={mockServers} registries={mockRegistries} />,
    );

    await user.click(screen.getByLabelText("列表视图"));
    await user.click(screen.getByLabelText("网格视图"));

    await waitFor(() => {
      expect(screen.getByText("AWS Nova Canvas")).toBeVisible();
      expect(screen.queryByText("Server")).not.toBeInTheDocument();
    });
  });

  // 效果图 01：搜索入口移到顶栏（?q=），wrapper 只负责接收查询串做客户端过滤
  it("filters servers from the ?q= URL param (topbar search)", () => {
    setSearchParams("q=aws");
    render(
      <ServersWrapper servers={mockServers} registries={mockRegistries} />,
    );

    expect(screen.getByText("AWS Nova Canvas")).toBeVisible();
    expect(screen.queryByText("Google Applications")).not.toBeInTheDocument();
  });

  it("keeps ?q= filtering applied across view mode switches", async () => {
    setSearchParams("q=aws");
    const user = userEvent.setup();
    render(
      <ServersWrapper servers={mockServers} registries={mockRegistries} />,
    );

    await user.click(screen.getByLabelText("列表视图"));

    await waitFor(() => {
      expect(screen.getByText("AWS Nova Canvas")).toBeVisible();
    });
    expect(screen.queryByText("Google Applications")).not.toBeInTheDocument();
  });

  it("single page keeps footer but no extra page buttons", () => {
    render(
      <ServersWrapper servers={mockServers} registries={mockRegistries} />,
    );

    // 分页组件重写后页脚常驻；单页时只有页码 1，无第二页
    expect(screen.getByRole("button", { name: "第 1 页" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "第 2 页" }),
    ).not.toBeInTheDocument();
  });

  it("renders pagination controls when items exceed one page", () => {
    render(
      <ServersWrapper servers={pagedServers} registries={mockRegistries} />,
    );

    expect(screen.getByRole("button", { name: "第 1 页" })).toBeVisible();
    expect(screen.getByRole("button", { name: "第 2 页" })).toBeVisible();
    expect(screen.getByRole("button", { name: /下一页/ })).toBeVisible();
  });

  it("next button enabled on first page (previous concept removed)", () => {
    render(
      <ServersWrapper servers={pagedServers} registries={mockRegistries} />,
    );

    expect(screen.getByRole("button", { name: /下一页/ })).not.toBeDisabled();
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
