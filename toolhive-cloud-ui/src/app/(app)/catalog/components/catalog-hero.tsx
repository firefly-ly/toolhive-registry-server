"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/** hero 条目的最小结构（McpServer / Skill 均天然满足） */
export interface HeroItem {
  id: string;
  name: string;
  description?: string;
  version?: string;
  owner?: string;
  created_at: string;
  /** 调用/下载次数：精选轮播「热度最高」模式的排序依据 */
  calls?: number;
  /** 条目类型：IA 合并后 hero 池混排，类型色随条目走（缺省回落 accent） */
  type?: "mcp" | "skill";
}

interface FeaturedMode {
  key: string;
  label: string;
  item: HeroItem;
}

const ROTATE_MS = 5000;

/**
 * 陈列馆门面（包豪斯版）：精选轮播 + 最近更新 feed。
 * 轮播两模式——「最新上架」（created_at 倒序首位）与「热度最高」（调用/下载次数
 * 最高），5s 自动轮换、悬停暂停、底部类型色进度条；单模式时退化为静态门面。
 * accent：info 蓝=MCP，success 绿=Skill；品牌红不进 hero。
 * CTA「提交新工具」常驻轮播卡右下（全站唯一提交入口位）。
 */
export function CatalogHero({
  newest,
  hottest,
  feed,
  routePrefix = "/mcp",
  accent = "info",
  showSubmitCta = false,
}: {
  newest: HeroItem | null;
  hottest?: HeroItem | null;
  feed: HeroItem[];
  routePrefix?: string;
  accent?: "info" | "success";
  showSubmitCta?: boolean;
}) {
  const router = useRouter();
  const modes: FeaturedMode[] = [];
  if (newest) modes.push({ key: "latest", label: "最新上架", item: newest });
  if (hottest && newest && hottest.id !== newest.id) {
    modes.push({ key: "hot", label: "热度最高", item: hottest });
  }

  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (modes.length < 2 || paused) return;
    const timer = setInterval(
      () => setIdx((i) => (i + 1) % modes.length),
      ROTATE_MS,
    );
    return () => clearInterval(timer);
  }, [modes.length, paused]);

  // idx 越界保护（轮播模式数变化时收敛）
  const safeIdx = modes.length ? idx % modes.length : 0;
  const cur = modes[safeIdx];
  if (!cur) return null;

  // 类型色随当前条目走（IA 合并后 hero 池混排 MCP/Skill；缺省回落 accent）
  const isTeal =
    (cur.item.type ?? (accent === "success" ? "skill" : "mcp")) === "skill";
  const accentHex = isTeal ? "hsl(var(--success))" : "hsl(var(--info))";
  const typeCls = isTeal
    ? "bg-success/10 text-success"
    : "bg-info/10 text-info";
  const typeText = isTeal ? "Skill" : "MCP";

  const go = (id: string) =>
    router.push(`${routePrefix}/${encodeURIComponent(id)}`);
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
    });

  return (
    <div className="grid grid-cols-1 gap-3 @[900px]:grid-cols-[minmax(480px,2fr)_minmax(280px,1fr)]">
      {/* 精选轮播卡：拱形品牌位 + 模式标签 + 进度条 */}
      <div
        className="relative flex flex-col justify-between overflow-hidden rounded-xl border bg-card px-5 py-4"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* 拱形几何品牌位（右上，随模式切换呼吸存在） */}
        <span
          aria-hidden
          className="absolute top-5 right-5 h-12 w-9 rounded-t-full opacity-90 transition-colors duration-300"
          style={{ background: accentHex }}
        />
        <span
          aria-hidden
          className="absolute top-9 right-8 size-4 rounded-full opacity-90"
          style={{ background: "hsl(var(--highlight))" }}
        />

        <div className="relative">
          {modes.length > 1 && (
            <div className="mb-2 flex items-center gap-1.5">
              {modes.map((m, i) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setIdx(i)}
                  aria-pressed={i === safeIdx}
                  className={`cursor-pointer rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                    i === safeIdx
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}
          <p className="truncate text-xl font-medium">{cur.item.name}</p>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {cur.item.description || "暂无描述"}
          </p>
        </div>

        <div className="relative mt-3 flex items-center gap-2">
          {cur.item.version && (
            <span className="rounded-md border px-2 py-0.5 font-mono text-xs text-muted-foreground">
              v{cur.item.version}
            </span>
          )}
          <span className={`rounded-md px-2 py-0.5 text-xs ${typeCls}`}>
            {typeText}
          </span>
          {typeof cur.item.calls === "number" && (
            <span className="font-mono text-xs text-muted-foreground">
              {cur.item.calls.toLocaleString()} 次{isTeal ? "下载" : "调用"}
            </span>
          )}
          <span className="truncate text-xs text-muted-foreground">
            {cur.item.owner || "内部提交"}
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-2">
            {showSubmitCta && (
              <Button type="button" variant="outline" size="sm" asChild>
                <Link href="/submissions">提交新工具</Link>
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              style={{ background: accentHex, color: "#fff" }}
              className="hover:opacity-90"
              onClick={() => go(cur.item.id)}
            >
              查看详情
            </Button>
          </span>
        </div>

        {/* 轮播进度条：类型色，悬停暂停 */}
        {modes.length > 1 && (
          <span
            aria-hidden
            className="absolute bottom-0 left-0 h-0.5 w-full overflow-hidden"
          >
            <span
              key={`${safeIdx}`}
              className="block h-full"
              style={{
                background: accentHex,
                animation: `featured-progress ${ROTATE_MS}ms linear both`,
                animationPlayState: paused ? "paused" : "running",
              }}
            />
          </span>
        )}
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
                <span
                  className={`size-1.5 shrink-0 rounded-full ${isTeal ? "bg-success" : "bg-info"}`}
                />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {m.name} {m.version ? `v${m.version}` : ""}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
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
