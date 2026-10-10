"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/** hero 条目的最小结构（McpServer / Skill 均天然满足） */
export interface HeroItem {
  id: string;
  name: string;
  description?: string;
  version?: string;
  owner?: string;
  created_at: string;
}

/**
 * 「最新上架」主打卡 + 最近更新 feed（陈列馆门面，MCP/Skill 两页共用）。
 * 数据源 = 已上架条目按 created_at 倒序；无条目时整体不渲染，不占位。
 * accent：info 蓝=MCP，success 青绿=Skill（全站类型色觉系统）。
 */
export function CatalogHero({
  newest,
  feed,
  routePrefix = "/mcp",
  typeLabel = "MCP",
  accent = "info",
}: {
  newest: HeroItem | null;
  feed: HeroItem[];
  routePrefix?: string;
  typeLabel?: string;
  accent?: "info" | "success";
}) {
  const router = useRouter();
  if (!newest) return null;

  const isTeal = accent === "success";
  const accentHex = isTeal ? "hsl(var(--success))" : "hsl(var(--primary))";
  const chipCls = isTeal
    ? "bg-success/10 text-success"
    : "bg-primary/10 text-primary";
  const typeCls = isTeal
    ? "bg-success/10 text-success"
    : "bg-info/10 text-info";

  const go = (id: string) =>
    router.push(`${routePrefix}/${encodeURIComponent(id)}`);
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
    });

  return (
    <div className="grid grid-cols-1 gap-3 @[900px]:grid-cols-[minmax(480px,2fr)_minmax(280px,1fr)]">
      {/* 主打卡：色觉书脊 + 最新上架 */}
      <div
        className="flex flex-col justify-between rounded-xl border bg-card px-5 py-4"
        style={{ borderLeft: `4px solid ${accentHex}` }}
      >
        <div>
          <span
            className={`mb-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${chipCls}`}
          >
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
          <span className={`rounded-md px-2 py-0.5 text-xs ${typeCls}`}>
            {typeLabel}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {newest.owner || "内部提交"}
          </span>
          <Button
            type="button"
            size="sm"
            className="ml-auto"
            onClick={() => go(newest.id)}
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
                onClick={() => go(m.id)}
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
