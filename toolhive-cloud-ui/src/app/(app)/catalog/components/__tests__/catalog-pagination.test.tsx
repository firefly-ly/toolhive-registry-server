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
  describe("First page button", () => {
    it("is disabled on the first page", () => {
      render(<CatalogPagination {...defaultProps} page={0} />);
      expect(screen.getByRole("button", { name: /第一页/ })).toBeDisabled();
    });

    it("is enabled when not on the first page", () => {
      render(<CatalogPagination {...defaultProps} page={2} />);
      expect(screen.getByRole("button", { name: /第一页/ })).not.toBeDisabled();
    });

    it("calls onPageChange(0) when clicked", async () => {
      const onPageChange = vi.fn();
      const user = userEvent.setup();
      render(
        <CatalogPagination
          {...defaultProps}
          page={2}
          onPageChange={onPageChange}
        />,
      );

      await user.click(screen.getByRole("button", { name: /第一页/ }));
      expect(onPageChange).toHaveBeenCalledWith(0);
    });
  });

  describe("Previous button", () => {
    it("is disabled on the first page", () => {
      render(<CatalogPagination {...defaultProps} page={0} />);
      expect(screen.getByRole("button", { name: /上一页/ })).toBeDisabled();
    });

    it("is enabled when not on the first page", () => {
      render(<CatalogPagination {...defaultProps} page={2} />);
      expect(screen.getByRole("button", { name: /上一页/ })).not.toBeDisabled();
    });

    it("calls onPageChange(page - 1) when clicked", async () => {
      const onPageChange = vi.fn();
      const user = userEvent.setup();
      render(
        <CatalogPagination
          {...defaultProps}
          page={3}
          onPageChange={onPageChange}
        />,
      );

      await user.click(screen.getByRole("button", { name: /上一页/ }));
      expect(onPageChange).toHaveBeenCalledWith(2);
    });
  });

  describe("Next button", () => {
    it("is disabled on the last page", () => {
      render(<CatalogPagination {...defaultProps} page={4} totalPages={5} />);
      expect(screen.getByRole("button", { name: /下一页/ })).toBeDisabled();
    });

    it("is enabled when not on the last page", () => {
      render(<CatalogPagination {...defaultProps} page={2} totalPages={5} />);
      expect(screen.getByRole("button", { name: /下一页/ })).not.toBeDisabled();
    });

    it("calls onPageChange(page + 1) when clicked", async () => {
      const onPageChange = vi.fn();
      const user = userEvent.setup();
      render(
        <CatalogPagination
          {...defaultProps}
          page={1}
          onPageChange={onPageChange}
        />,
      );

      await user.click(screen.getByRole("button", { name: /下一页/ }));
      expect(onPageChange).toHaveBeenCalledWith(2);
    });
  });

  describe("Page number", () => {
    it("displays the current page number (1-based)", () => {
      render(<CatalogPagination {...defaultProps} page={3} />);
      expect(screen.getByText("第 4 页 / 5")).toBeVisible();
    });

    it("hides total pages when there is only one page", () => {
      render(<CatalogPagination {...defaultProps} page={0} totalPages={1} />);
      expect(screen.getByText("第 1 页")).toBeVisible();
    });
  });
});
