"use client";

import { Star } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/header-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toggleFavoriteAction } from "@/lib/platform-actions";
import { cn } from "@/lib/utils";

export interface FavRow {
  item_type: "mcp" | "skill";
  item_ref: string;
  title: string;
  /** 热度指标：MCP 显示调用次数，Skill 显示下载次数；无数据为空串 */
  metric: string;
  description: string;
  href: string;
}

export interface ActivityEntry {
  date: string;
  text: string;
  count: number;
}

const FILTERS: { key: "all" | "mcp" | "skill"; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "mcp", label: "MCP" },
  { key: "skill", label: "Skill" },
];

/**
 * 我的工作台：左侧常用磁贴（类型色图标块 + 快捷操作），右侧使用动态时间线。
 * 整页滚动由页面根承担，本组件不再内滚。
 */
export function FavsBlock({
  count,
  rows,
  activity = [],
}: {
  /** 兼容旧签名的标题参数（页头已展示，块内不再重复） */
  title?: string;
  count: number;
  rows: FavRow[];
  activity?: ActivityEntry[];
}) {
  const [filter, setFilter] = useState<"all" | "mcp" | "skill">("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    let list = rows;
    if (filter !== "all") {
      list = list.filter((r) => r.item_type === filter);
    }
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.item_ref.toLowerCase().includes(q),
    );
  }, [rows, filter, query]);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Star}
        title="还没有收藏"
        description="在 MCP 目录或技能市场点星标收藏，常用的条目会集中在这里。"
        actionHref="/catalog"
        actionLabel="去 MCP 目录逛逛"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[3fr_2fr]">
      {/* 左：常用磁贴 */}
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">常用能力（{count}）</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="inline-flex rounded-lg bg-muted p-1">
              {FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={cn(
                    "cursor-pointer rounded-md px-3 py-1 text-sm transition-colors",
                    filter === key
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="relative w-48">
              <Input
                type="text"
                placeholder="搜索收藏…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9 bg-card"
              />
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            没有匹配的收藏
          </p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3">
            {filtered.map((r) => {
              const unfav = toggleFavoriteAction.bind(
                null,
                r.item_type,
                r.item_ref,
                true,
              );
              const isMcp = r.item_type === "mcp";
              return (
                <div
                  key={`${r.item_type}-${r.item_ref}`}
                  className="flex flex-col rounded-xl border bg-card p-4 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-lg",
                        isMcp ? "bg-info/10" : "bg-success/10",
                      )}
                    >
                      <span
                        className={cn(
                          "size-2.5 rounded-sm",
                          isMcp ? "bg-info" : "bg-success",
                        )}
                      />
                    </span>
                    <p
                      className="min-w-0 flex-1 truncate text-sm font-medium"
                      title={r.title}
                    >
                      {r.title}
                    </p>
                    <span
                      className={cn(
                        "shrink-0 rounded-md px-1.5 py-0.5 text-[11px]",
                        isMcp
                          ? "bg-info/10 text-info"
                          : "bg-success/10 text-success",
                      )}
                    >
                      {isMcp ? "MCP" : "Skill"}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">
                    {r.description || "暂无描述"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    {r.metric || "暂无使用记录"}
                  </p>
                  <div className="mt-3 flex items-center gap-2 border-t pt-3">
                    <form action={unfav}>
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 px-2 text-muted-foreground hover:text-foreground"
                        aria-label="取消收藏"
                      >
                        <Star className="size-3.5 fill-star text-star" />
                        取消收藏
                      </Button>
                    </form>
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-auto h-8"
                      asChild
                    >
                      <Link href={r.href}>查看</Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 右：使用动态时间线 */}
      <div className="min-w-0">
        <div className="rounded-xl border bg-card p-4">
          <p className="mb-3 text-sm font-medium">
            使用动态
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              近 14 天 · 收藏条目
            </span>
          </p>
          {activity.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              近两周没有使用记录——从磁贴进入调用后，动态会出现在这里。
            </p>
          ) : (
            <div className="space-y-0">
              {activity.map((a, i) => (
                <div key={`${a.date}-${a.text}`} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-success" />
                    {i < activity.length - 1 && (
                      <span className="w-px flex-1 bg-border" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "min-w-0 flex-1",
                      i < activity.length - 1 && "pb-4",
                    )}
                  >
                    <p className="truncate text-sm">
                      {a.text}
                      {a.count > 1 && (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          ×{a.count}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground/70">{a.date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
