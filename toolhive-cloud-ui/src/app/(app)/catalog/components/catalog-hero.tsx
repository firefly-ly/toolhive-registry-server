"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { McpServer } from "@/lib/platform-backend";

/**
 * 「最新上架」主打卡 + 最近更新 feed（陈列馆门面）。
 * 数据源 = 已审批提交的 MCP 按 created_at 倒序；registry 条目无时间戳不参与排序。
 * 无提交条目时整体不渲染，不占位。
 */
export function CatalogHero({
  newest,
  feed,
}: {
  newest: McpServer | null;
  feed: McpServer[];
}) {
  const router = useRouter();
  if (!newest) return null;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
    });

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[2fr_1fr]">
      {/* 主打卡：红书脊 + 最新上架 */}
      <div
        className="flex flex-col justify-between rounded-xl border bg-card px-5 py-4"
        style={{ borderLeft: "4px solid hsl(var(--primary))" }}
      >
        <div>
          <span className="mb-2 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            最新上架
          </span>
          <p className="truncate text-lg font-medium">{newest.name}</p>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {newest.description || "暂无描述"}
          </p>
        </div>
        <div className="mt-3 flex items-center gap-2">
          {newest.version && (
            <span className="rounded-md border px-2 py-0.5 font-mono text-xs text-muted-foreground">
              v{newest.version}
            </span>
          )}
          <span className="rounded-md bg-info/10 px-2 py-0.5 text-xs text-info">
            MCP
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {newest.owner || "内部提交"}
          </span>
          <Button
            type="button"
            size="sm"
            className="ml-auto"
            onClick={() => router.push(`/mcp/${encodeURIComponent(newest.id)}`)}
          >
            查看详情
          </Button>
        </div>
      </div>

      {/* 最近更新 feed：不足 2 条则隐藏（避免空壳占位） */}
      {feed.length >= 2 && (
        <div className="rounded-xl border bg-card px-4 py-3.5">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            最近更新
          </p>
          <div className="space-y-2">
            {feed.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => router.push(`/mcp/${encodeURIComponent(m.id)}`)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-muted/50"
              >
                <span className="size-1.5 shrink-0 rounded-full bg-success" />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {m.name} {m.version ? `v${m.version}` : ""}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground/70">
                  {fmtDate(m.created_at)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
