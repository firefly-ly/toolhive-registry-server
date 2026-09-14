"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CatalogPaginationProps {
  /** 当前页（0 起） */
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

type PageItem = number | "ellipsis";

/**
 * 生成带省略号的页码序列（1 起）。
 * 规则：始终保留首尾页和当前页前后各一页，中间断档用省略号填充。
 * 例：current=4, total=10 → [1, "…", 3, 4, 5, "…", 10]
 */
function buildPageList(current: number, total: number): PageItem[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const wanted = new Set<number>([1, total]);
  for (const p of [current - 1, current, current + 1]) {
    if (p >= 1 && p <= total) wanted.add(p);
  }
  const sorted = [...wanted].sort((a, b) => a - b);
  const list: PageItem[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) list.push("ellipsis");
    list.push(p);
    prev = p;
  }
  return list;
}

export function CatalogPagination({
  page,
  totalPages,
  onPageChange,
}: CatalogPaginationProps) {
  if (totalPages <= 1) return null;

  const current = page + 1; // 展示用 1 起
  const items = buildPageList(current, totalPages);

  return (
    <nav
      aria-label="分页"
      className="mx-auto mt-4 flex w-fit items-center gap-1"
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 0}
        aria-label="上一页"
        className="size-8 cursor-pointer"
      >
        <ChevronLeft className="size-4" />
      </Button>

      {items.map((item, i) =>
        item === "ellipsis" ? (
          <span
            key={`ellipsis-${items.slice(0, i).filter((x) => x === "ellipsis").length}`}
            aria-hidden
            className="flex size-8 items-center justify-center text-sm text-muted-foreground select-none"
          >
            …
          </span>
        ) : (
          <Button
            key={item}
            variant={item === current ? "outline" : "ghost"}
            size="icon"
            onClick={() => onPageChange(item - 1)}
            aria-label={`第 ${item} 页`}
            aria-current={item === current ? "page" : undefined}
            className="size-8 cursor-pointer text-sm tabular-nums"
          >
            {item}
          </Button>
        ),
      )}

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages - 1}
        aria-label="下一页"
        className="size-8 cursor-pointer"
      >
        <ChevronRight className="size-4" />
      </Button>
    </nav>
  );
}
