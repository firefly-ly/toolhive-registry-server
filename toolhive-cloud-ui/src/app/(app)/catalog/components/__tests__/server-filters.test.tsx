import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ServerFilters } from "../server-filters";

describe("ServerFilters", () => {
  const defaultProps = {
    registries: [{ name: "default-registry" }, { name: "custom-registry" }],
    selectedRegistry: "all",
    onRegistryChange: vi.fn(),
    viewMode: "grid" as const,
    onViewModeChange: vi.fn(),
    typeFilter: "all" as const,
    onTypeFilterChange: vi.fn(),
    typeCounts: { all: 10, mcp: 8, skill: 2 },
    statusFilter: "all" as const,
    onStatusFilterChange: vi.fn(),
    sortFilter: "default" as const,
    onSortFilterChange: vi.fn(),
  };

  it("calls onViewModeChange when list button is clicked", async () => {
    const user = userEvent.setup();
    const onViewModeChange = vi.fn();

    render(
      <ServerFilters {...defaultProps} onViewModeChange={onViewModeChange} />,
    );

    await user.click(screen.getByLabelText("列表视图"));

    expect(onViewModeChange).toHaveBeenCalledWith("list");
  });

  it("calls onViewModeChange when grid button is clicked", async () => {
    const user = userEvent.setup();
    const onViewModeChange = vi.fn();

    render(
      <ServerFilters
        {...defaultProps}
        viewMode="list"
        onViewModeChange={onViewModeChange}
      />,
    );

    await user.click(screen.getByLabelText("网格视图"));

    expect(onViewModeChange).toHaveBeenCalledWith("grid");
  });

  it("marks grid button as checked when grid mode is selected", () => {
    render(<ServerFilters {...defaultProps} viewMode="grid" />);

    const gridButton = screen.getByLabelText("网格视图");
    expect(gridButton).toHaveAttribute("aria-checked", "true");
  });

  it("marks list button as checked when list mode is selected", () => {
    render(<ServerFilters {...defaultProps} viewMode="list" />);

    const listButton = screen.getByLabelText("列表视图");
    expect(listButton).toHaveAttribute("aria-checked", "true");
  });

  it("renders registry selector", () => {
    render(<ServerFilters {...defaultProps} />);

    expect(screen.getByLabelText("选择注册表")).toBeVisible();
  });

  it("renders status and sort selects with current values", () => {
    render(<ServerFilters {...defaultProps} />);

    expect(screen.getByLabelText("按运行状态筛选")).toBeVisible();
    expect(screen.getByLabelText("排序方式")).toBeVisible();
  });
});
