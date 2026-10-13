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
  /** 调用/下载次数：精选带「热度最高」模式的排序依据 */
  calls?: number;
  /** 条目类型：hero 池混排，类型色随条目走（缺省回落 accent） */
  type?: "mcp" | "skill";
}

/** KPI 嵌拼矩阵（效果图 01 右侧） */
export interface HeroKpis {
  /** 主块数值：今日调用（有趋势数据）或回落为累计调用 */
  calls: number;
  /** 主块标签：今日调用 / 累计调用 */
  callsLabel: string;
  /** 较昨日 ±%（无数据省略） */
  deltaPct?: number | null;
  /** 在线服务条目数 */
  services?: number;
  /** 其中运行中（在线服务 subline「运行中 / 共 M」） */
  running?: number;
  /** 可用技能数 */
  skills: number;
  /** 活跃用户（近 7 天，去重 upper bound）；无数据时第四格回落「我的收藏」 */
  activeUsers7?: number;
  favorites: number;
}

interface FeaturedMode {
  key: string;
  tag: string;
  label: string;
  item: HeroItem;
}

const ROTATE_MS = 5000;

/**
 * 目录门面（效果图 01 逐像素版）：
 * 上层 = 左主张区（几何三件套 + 琥珀高亮大标题 + 双 CTA）/ 右 KPI 嵌拼矩阵
 *（蓝色实色主块 + 白格，1px 分界线、无圆角、与 hero 同高）；
 * 下层 = 精选带（左大几何字形 + 模式标签 + pills，右模式切换 + 黑色查看钮，
 * 底部全宽红色进度条）。全部通栏白底，只有 1px 结构线，无卡片圆角堆叠。
 */
export function CatalogHero({
  newest,
  hottest,
  routePrefix = "/mcp",
  accent = "info",
  showSubmitCta = false,
  kpis,
}: {
  newest: HeroItem | null;
  hottest?: HeroItem | null;
  /** 效果图 01 精确版式中无「最近更新」面板，保留参数兼容旧调用但不渲染 */
  feed?: HeroItem[];
  routePrefix?: string;
  accent?: "info" | "success";
  showSubmitCta?: boolean;
  kpis: HeroKpis;
}) {
  const router = useRouter();
  const modes: FeaturedMode[] = [];
  if (newest) {
    modes.push({
      key: "latest",
      tag: "LATEST",
      label: "最新上架",
      item: newest,
    });
  }
  if (hottest && newest && hottest.id !== newest.id) {
    modes.push({ key: "hot", tag: "HOT", label: "热度最高", item: hottest });
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

  const safeIdx = modes.length ? idx % modes.length : 0;
  const cur = modes[safeIdx];

  const isTeal =
    (cur?.item.type ?? (accent === "success" ? "skill" : "mcp")) === "skill";
  const typeHex = isTeal ? "hsl(var(--success))" : "hsl(var(--info))";
  const modeTone = cur?.key === "hot" ? "text-primary" : "text-info";

  const go = (id: string) =>
    router.push(`${routePrefix}/${encodeURIComponent(id)}`);

  // KPI 格定义：蓝主块恒在首位，其余白格按数据有无组装
  const cells: {
    label: string;
    value: string;
    sub?: string;
    accent?: boolean;
  }[] = [
    {
      label: kpis.callsLabel,
      value: kpis.calls.toLocaleString(),
      sub:
        typeof kpis.deltaPct === "number"
          ? `较昨日 ${kpis.deltaPct >= 0 ? "+" : ""}${kpis.deltaPct}%`
          : undefined,
      accent: true,
    },
  ];
  if (kpis.services !== undefined) {
    cells.push({
      label: "在线服务",
      value: String(kpis.services),
      sub:
        typeof kpis.running === "number"
          ? `运行中 / 共 ${kpis.services}`
          : undefined,
    });
  }
  cells.push({ label: "可用技能", value: String(kpis.skills) });
  cells.push({
    label: typeof kpis.activeUsers7 === "number" ? "活跃用户" : "我的收藏",
    value: String(
      typeof kpis.activeUsers7 === "number"
        ? kpis.activeUsers7
        : kpis.favorites,
    ),
    sub: typeof kpis.activeUsers7 === "number" ? "近 7 天" : undefined,
  });

  return (
    <div>
      {/* ── 上层：主张区 + KPI 嵌拼矩阵（通栏，1px 分界） ── */}
      <div className="grid grid-cols-1 border-b lg:grid-cols-[1.55fr_1fr]">
        {/* 左主张区 */}
        <div className="relative overflow-hidden px-1 py-10 lg:pr-10">
          {/* 左下角淡奶油几何衬底 + 漂移衬形（效果图 bgdeco 的动态版） */}
          <span
            aria-hidden
            className="anim-drift-rev pointer-events-none absolute bottom-0 left-0 h-24 w-40 rounded-tr-full bg-highlight/20"
          />
          <span
            aria-hidden
            className="anim-drift pointer-events-none absolute -top-10 right-16 hidden size-32 rounded-full border-2 border-border/60 lg:block"
          />
          <div aria-hidden className="mb-5 flex items-end gap-2">
            <span
              className="h-9 w-7 rounded-t-full bg-info"
              style={{ animation: "floatY 3.2s ease-in-out infinite" }}
            />
            <span
              className="size-9 rounded-full bg-primary"
              style={{
                animation: "floatY 3.2s ease-in-out .4s infinite",
              }}
            />
            <span
              className="mb-0.5 h-4 w-9 bg-highlight [clip-path:polygon(0_100%,50%_0,100%_100%)]"
              style={{
                animation: "floatY 3.2s ease-in-out .8s infinite",
              }}
            />
          </div>
          <h1 className="text-[40px] leading-[1.15] font-semibold tracking-tight">
            找到你要的
            <br />
            每一件
            <span className="relative inline-block">
              工具
              <span
                aria-hidden
                className="anim-draw-u absolute inset-x-0 bottom-1 -z-10 h-3 bg-highlight/70"
              />
            </span>
          </h1>
          <p className="anim-pop-d3 mt-4 max-w-md text-sm leading-6 text-muted-foreground">
            MCP 服务与 Skill
            技能，全部经安全扫描与审批上架。按你的权限，即插即用。
          </p>
          <div className="anim-pop-d4 mt-6 flex items-center gap-3">
            <Button type="button" size="sm" asChild className="h-10 px-6">
              <Link href="#catalog-grid">开始浏览 →</Link>
            </Button>
            {showSubmitCta && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                asChild
                className="h-10 border-foreground px-6 hover:bg-foreground hover:text-background"
              >
                <Link href="/submissions">提交新工具</Link>
              </Button>
            )}
          </div>
        </div>

        {/* 右 KPI 嵌拼矩阵：无圆角、1px 分界线、与左区同高 */}
        <div className="grid grid-cols-2 grid-rows-2 border-t lg:border-t-0 lg:border-l">
          {cells.map((c, i) => (
            <div
              key={c.label}
              className={
                c.accent
                  ? "anim-pop flex flex-col justify-center bg-info px-7 py-6 text-white [&_dd]:font-mono [&_dd]:text-[34px] [&_dd]:leading-none [&_dd]:font-bold [&_dt]:text-xs [&_dt]:opacity-80 [&_span]:mt-1.5 [&_span]:text-xs [&_span]:opacity-75"
                  : `anim-pop flex flex-col justify-center px-7 py-6 [&_dd]:font-mono [&_dd]:text-[30px] [&_dd]:leading-none [&_dd]:font-bold [&_dt]:text-xs [&_dt]:text-muted-foreground [&_span]:mt-1 [&_span]:text-xs [&_span]:text-muted-foreground ${i >= 2 ? "border-t" : ""} ${i % 2 === 1 ? "border-l" : ""}`
              }
              /* KPI 格错落入场（效果图 kblock 0.15s 起步、每格 +0.1s） */
              style={{ animationDelay: `${0.15 + i * 0.1}s` }}
            >
              <dt>{c.label}</dt>
              <dd>{c.value}</dd>
              {c.sub && <span>{c.sub}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* ── 下层：精选带（左字形 + 内容，右切换 + 黑 CTA，底全宽进度条） ── */}
      {cur && (
        <div
          className="anim-pop-d2 relative border-b"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="flex items-center gap-6 py-6 pr-2">
            {/* 大几何字形：MCP=拱（同心） / Skill=圆（同心），中心琥珀点呼吸+涟漪 */}
            <div aria-hidden className="anim-float relative shrink-0">
              {isTeal ? (
                <span
                  className="flex size-16 items-center justify-center rounded-full"
                  style={{ background: typeHex }}
                >
                  <span className="relative flex size-9 items-center justify-center rounded-full bg-white/25">
                    <span className="anim-pulse size-3 rounded-full bg-highlight" />
                    <span
                      aria-hidden
                      className="anim-ripple absolute size-3 rounded-full border-2 border-highlight"
                    />
                  </span>
                </span>
              ) : (
                <span
                  className="flex h-16 w-13 items-center justify-center rounded-t-full"
                  style={{ background: typeHex }}
                >
                  <span className="mt-5 flex h-9 w-7 items-center justify-center rounded-t-full bg-white/25">
                    <span className="relative flex items-center justify-center">
                      <span className="anim-pulse size-3 rounded-full bg-highlight" />
                      <span
                        aria-hidden
                        className="anim-ripple absolute size-3 rounded-full border-2 border-highlight"
                      />
                    </span>
                  </span>
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className={`text-xs font-semibold tracking-wide ${modeTone}`}>
                {cur.tag} · {cur.label}
              </p>
              <p className="mt-1 truncate text-2xl font-semibold">
                {cur.item.name}
              </p>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {cur.item.description || "暂无描述"}
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {cur.item.version && (
                  <span className="rounded-full border px-2.5 py-0.5 font-mono text-xs text-muted-foreground">
                    v{cur.item.version}
                  </span>
                )}
                {typeof cur.item.calls === "number" && (
                  <span className="rounded-full bg-success/10 px-2.5 py-0.5 font-mono text-xs text-success">
                    {cur.item.calls.toLocaleString()} 次
                    {isTeal ? "下载" : "调用"}
                  </span>
                )}
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                  {cur.item.owner || "内部提交"}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-3">
              {modes.length > 1 && (
                <div className="flex items-center gap-1">
                  {modes.map((m, i) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setIdx(i)}
                      aria-pressed={i === safeIdx}
                      className={`cursor-pointer rounded-full px-3 py-1 text-xs transition-colors ${
                        i === safeIdx
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              )}
              <Button
                type="button"
                className="h-9 bg-foreground px-5 text-background hover:bg-foreground/85"
                onClick={() => go(cur.item.id)}
              >
                查看详情
              </Button>
            </div>
          </div>

          {/* 全宽进度条（橙红），悬停暂停 */}
          {modes.length > 1 && (
            <span
              aria-hidden
              className="absolute bottom-0 left-0 h-0.5 w-full overflow-hidden"
            >
              <span
                key={`${safeIdx}`}
                className="block h-full bg-primary"
                style={{
                  animation: `featured-progress ${ROTATE_MS}ms linear both`,
                  animationPlayState: paused ? "paused" : "running",
                }}
              />
            </span>
          )}
        </div>
      )}
    </div>
  );
}
