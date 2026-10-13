import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CatalogPagination } from "../catalog-pagination";

const defaultProps = {
  page: 0,
  totalPages: 5,
  onPageChange: vi.fn(),
};

describe("CatalogPagination", () => {
  // 效果图 01 分页重写后：单页也渲染页脚（「共 N 件」口径常驻），页码 1 常选、无翻页钮
  it("single page 时渲染页脚且只有页码 1", () => {
    render(<CatalogPagination {...defaultProps} totalPages={1} />);
    expect(screen.getByRole("navigation", { name: "分页" })).toBeVisible();
    expect(screen.getByRole("button", { name: "第 1 页" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("button", { name: /下一页/ })).toBeDisabled();
  });

  describe("Next button（→）", () => {
    it("is disabled on the last page", () => {
      render(<CatalogPagination {...defaultProps} page={4} totalPages={5} />);
      expect(screen.getByRole("button", { name: /下一页/ })).toBeDisabled();
    });

    it("is enabled when not on the last page", () => {
      render(<CatalogPagination {...defaultProps} page={2} />);
      expect(screen.getByRole("button", { name: /下一页/ })).not.toBeDisabled();
    });

    it("calls onPageChange(page + 1) when clicked", async () => {
      const onPageChange = vi.fn();
      const user = userEvent.setup();
      render(
        <CatalogPagination
          {...defaultProps}
          page={2}
          onPageChange={onPageChange}
        />,
      );

      await user.click(screen.getByRole("button", { name: /下一页/ }));
      expect(onPageChange).toHaveBeenCalledWith(3);
    });
  });

  describe("Page number buttons", () => {
    it("renders one button per page when totalPages <= 7", () => {
      render(<CatalogPagination {...defaultProps} page={2} totalPages={5} />);
      for (const n of [1, 2, 3, 4, 5]) {
        expect(
          screen.getByRole("button", { name: `第 ${n} 页` }),
        ).toBeVisible();
      }
    });

    it("marks the current page with aria-current", () => {
      render(<CatalogPagination {...defaultProps} page={2} totalPages={5} />);
      expect(screen.getByRole("button", { name: "第 3 页" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      expect(
        screen.getByRole("button", { name: "第 1 页" }),
      ).not.toHaveAttribute("aria-current");
    });

    it("calls onPageChange(n - 1) when a page number is clicked", async () => {
      const onPageChange = vi.fn();
      const user = userEvent.setup();
      render(
        <CatalogPagination
          {...defaultProps}
          page={2}
          totalPages={5}
          onPageChange={onPageChange}
        />,
      );

      await user.click(screen.getByRole("button", { name: "第 5 页" }));
      expect(onPageChange).toHaveBeenCalledWith(4);
    });

    it("collapses middle pages into ellipsis when totalPages > 7", () => {
      render(<CatalogPagination {...defaultProps} page={4} totalPages={10} />);
      // 首尾页与当前页邻域可见
      for (const n of [1, 4, 5, 6, 10]) {
        expect(
          screen.getByRole("button", { name: `第 ${n} 页` }),
        ).toBeVisible();
      }
      // 远端页被省略
      expect(
        screen.queryByRole("button", { name: "第 8 页" }),
      ).not.toBeInTheDocument();
      // 出现省略号（首尾各一处）
      expect(screen.getAllByText("…")).toHaveLength(2);
    });
  });
});
