import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NotFound from "./not-found";

describe("NotFound (root)", () => {
  it("displays a page not found heading", async () => {
    render(await NotFound());

    expect(screen.getByRole("heading", { name: /页面不存在/ })).toBeVisible();
  });

  it("displays a generic error message", async () => {
    render(await NotFound());

    expect(screen.getByText(/你要访问的页面不存在或已被移动/)).toBeVisible();
  });

  it("has a link to browse the catalog", async () => {
    render(await NotFound());

    const link = screen.getByRole("link", { name: /浏览 MCP 市场/ });
    expect(link).toHaveAttribute("href", "/catalog");
  });

  it("does not have a back button", async () => {
    render(await NotFound());

    expect(
      screen.queryByRole("button", { name: /back/i }),
    ).not.toBeInTheDocument();
  });

  it("displays a decorative illustration", async () => {
    const { container } = render(await NotFound());

    const svg = container.querySelector("svg[aria-hidden='true']");
    expect(svg).toBeVisible();
  });
});
