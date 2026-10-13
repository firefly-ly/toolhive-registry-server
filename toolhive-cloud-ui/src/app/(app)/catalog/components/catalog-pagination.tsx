"use client";

interface CatalogPaginationProps {
  /** 当前页（0 起） */
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** 总条目数与页容量：左侧「共 N 件 · 每页 M 件」（效果图 01 footer） */
  totalItems?: number;
  pageSize?: number;
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

/**
 * 分页 footer（效果图 01 精确规格）：左「共 N 件 · 每页 M 件」，
 * 右 30px 方形页码（1.5px 发丝边、选中黑底白字）+ 末尾「→」翻页。
 */
export function CatalogPagination({
  page,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
}: CatalogPaginationProps) {
  const current = page + 1; // 展示用 1 起
  const items = buildPageList(current, totalPages);

  const pgCls = (active: boolean) =>
    `flex size-9 cursor-pointer items-center justify-center rounded-lg text-[14px] tabular-nums transition-colors border-[1.5px] ${
      active
        ? "border-foreground bg-foreground font-semibold text-background"
        : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
    }`;

  return (
    <nav aria-label="分页" className="flex items-center py-4">
      {typeof totalItems === "number" && (
        <span className="text-xs text-muted-foreground">
          共 {totalItems} 件
          {typeof pageSize === "number" ? ` · 每页 ${pageSize} 件` : ""}
        </span>
      )}

      <div className="ml-auto flex items-center gap-1.5">
        {items.map((item, i) =>
          item === "ellipsis" ? (
            <span
              key={`ellipsis-${items.slice(0, i).filter((x) => x === "ellipsis").length}`}
              aria-hidden
              className="flex size-9 items-center justify-center text-[14px] text-muted-foreground select-none"
            >
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item - 1)}
              aria-label={`第 ${item} 页`}
              aria-current={item === current ? "page" : undefined}
              className={pgCls(item === current)}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages - 1}
          aria-label="下一页"
          className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-[14px] text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          →
        </button>
      </div>
    </nav>
  );
}
