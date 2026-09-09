import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NotFound from "./not-found";

describe("NotFound", () => {
  it("displays the server not found heading", () => {
    render(<NotFound />);

    expect(screen.getByRole("heading", { name: /未找到该服务/ })).toBeVisible();
  });

  it("displays a descriptive message", () => {
    render(<NotFound />);

    expect(screen.getByText(/不存在，或已从 MCP 市场中移除/)).toBeVisible();
  });

  it("has a link to browse the catalog", () => {
    render(<NotFound />);

    const link = screen.getByRole("link", { name: /浏览 MCP 市场/ });
    expect(link).toHaveAttribute("href", "/catalog");
  });

  it("has a back button", () => {
    render(<NotFound />);

    expect(screen.getByRole("button", { name: /back/i })).toBeVisible();
  });

  it("displays a decorative illustration", () => {
    const { container } = render(<NotFound />);

    const svg = container.querySelector("svg[aria-hidden='true']");
    expect(svg).toBeVisible();
  });
});
