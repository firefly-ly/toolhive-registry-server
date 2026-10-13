"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  CardHead,
  EmptyRow,
  type Filt,
  gradeColor,
  gradeOf,
  type ItemStat,
  Kpi,
  MCP,
  RankRow,
  SKILL,
  type TrendItem,
  TypePill,
} from "./dashboard-shared";
import { TrendChart } from "./trend-chart";

export function StatsDashboard({
  items,
  kpis,
  trendDays,
  trendItems,
  funnel,
}: {
  items: ItemStat[];
  kpis: { total: number; avg: number; good: number; watch: number };
  trendDays: string[];
  trendItems: TrendItem[];
  /** 提交漏斗（效果图 10）：提交 → 审核通过 → 配置上线 */
  funnel?: { submitted: number; approved: number; onShelf: number };
}) {
  const [fRank, setFRank] = useState<Filt>("all");
  const [fTrend, setFTrend] = useState<Filt>("all");

  const rankList = useMemo(() => {
    let l = [...items].sort((a, b) => b.score - a.score).slice(0, 8);
    if (fRank !== "all") l = l.filter((i) => i.type === fRank);
    return l;
  }, [items, fRank]);

  const trendLines = useMemo(() => {
    let l = trendItems;
    if (fTrend !== "all") l = l.filter((i) => i.type === fTrend);
    return l;
  }, [trendItems, fTrend]);

  return (
    <div className="space-y-5">
      {/* KPI：首格 info 蓝色块主卡（包豪斯），其余白格 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Kpi
          l="总使用（调用+下载）"
          v={items.reduce((a, b) => a + b.usage, 0)}
          s="全部条目累计"
          accent
        />
        <Kpi
          l="能力项"
          v={kpis.total}
          s={`MCP ${items.filter((i) => i.type === "mcp").length} · Skill ${items.filter((i) => i.type === "skill").length}`}
        />
        <Kpi l="平均综合分" v={kpis.avg} s="0–100" c="hsl(var(--success))" />
        <Kpi
          l="优质 (≥80)"
          v={kpis.good}
          s="高价值 · 可主推"
          c="hsl(var(--success) / 0.8)"
        />
        <Kpi
          l="需关注 (<50)"
          v={kpis.watch}
          s="缺维护 / 低采纳"
          c="hsl(var(--destructive))"
        />
      </div>

      {/* 排行榜 | 留存 */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2 p-4">
          <CardHead
            title="优质度排行榜"
            sub="Top 8 · 综合分 + 关键分维度"
            filt={fRank}
            onFilt={setFRank}
          />
          <div className="max-h-[470px] space-y-1 overflow-y-auto pr-1">
            {rankList.map((it, i) => (
              <RankRow key={it.key} it={it} rank={i + 1} />
            ))}
            {rankList.length === 0 && <EmptyRow />}
          </div>
        </Card>

        <Card className="p-4">
          <CardHead title="提交漏斗（累计）" sub="提交 → 审核通过 → 配置上线" />
          <div className="space-y-3">
            {(
              [
                {
                  label: "提交",
                  v: funnel?.submitted ?? 0,
                  bg: "bg-foreground",
                },
                {
                  label: "审核通过",
                  v: funnel?.approved ?? 0,
                  bg: "bg-muted-foreground",
                },
                {
                  label: "配置上线",
                  v: funnel?.onShelf ?? 0,
                  bg: "bg-success",
                },
              ] as const
            ).map((st, i, arr) => {
              const top = Math.max(1, arr[0].v);
              const w = Math.max(12, Math.round((st.v / top) * 100));
              return (
                <div key={st.label} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-xs text-muted-foreground">
                    {st.label}
                  </span>
                  <div
                    className={`flex h-[26px] flex-1 items-center rounded-md px-2.5 ${st.bg}`}
                    style={{ width: `${w}%` }}
                  >
                    <span className="font-mono text-[11px] font-semibold text-white">
                      {st.v} 件
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {(() => {
            const f = funnel;
            if (!f) return null;
            const d1 = f.submitted - f.approved;
            const d2 = f.approved - f.onShelf;
            if (d1 <= 0 && d2 <= 0) return null;
            const note =
              d1 >= d2
                ? `最大流失在「提交 → 审核」：${d1} 件仍在待审或已被拒绝，建议及时处理队列。`
                : `最大流失在「审核 → 上线」：${d2} 件通过后未配置可见范围，建议通知管理员补配置。`;
            return (
              <div className="mt-4 rounded-lg border-[1.5px] border-dashed border-border p-3 text-xs leading-relaxed text-muted-foreground">
                {note}
              </div>
            );
          })()}
        </Card>
      </div>

      {/* 趋势 | 四象限 */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card className="p-4">
          <CardHead
            title="近 30 天使用趋势"
            sub="每条目独立折线 · 顶部为高用量项"
            filt={fTrend}
            onFilt={setFTrend}
          />
          <TrendChart days={trendDays} lines={trendLines} />
        </Card>
        <Card className="p-4">
          <CardHead title="需要关注" sub="零使用 / 低分条目的运营建议" />
          <div className="space-y-2">
            {(() => {
              const watch = [
                ...items
                  .filter((i) => i.u30 === 0)
                  .map((i) => ({
                    key: i.key,
                    name: i.name,
                    type: i.type,
                    href: i.href,
                    reason: "近 30 天无调用，建议评估下架或推一把",
                    tone: "warn" as const,
                  })),
                ...items
                  .filter((i) => i.u30 > 0 && i.score < 50)
                  .map((i) => ({
                    key: i.key,
                    name: i.name,
                    type: i.type,
                    href: i.href,
                    reason: `综合分 ${i.score}（低于 50），建议补描述 / 提示词质量`,
                    tone: "err" as const,
                  })),
              ];
              if (watch.length === 0) {
                return (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    暂无需要关注的条目
                  </p>
                );
              }
              return watch.map((w) => (
                <div
                  key={`${w.key}-${w.reason.slice(0, 6)}`}
                  className="flex items-center gap-3 rounded-lg border-[1.5px] border-border p-3"
                >
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[11px]",
                      w.tone === "warn"
                        ? "border-warning/40 bg-warning/10 text-warning"
                        : "border-destructive/40 bg-destructive/10 text-destructive",
                    )}
                  >
                    {w.tone === "warn" ? "零使用" : "低分"}
                  </span>
                  <span className="min-w-0 truncate text-sm font-medium">
                    {w.name}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                    {w.reason}
                  </span>
                  <Link
                    href={w.href}
                    className="shrink-0 text-xs font-semibold text-info hover:underline"
                  >
                    查看
                  </Link>
                </div>
              ));
            })()}
          </div>
        </Card>
      </div>

      {/* 明细 */}
      <Card className="p-4">
        <CardHead title="逐项明细" sub="调用/下载、收藏、去重用户与综合分" />
        <div className="max-h-[360px] overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="text-left text-xs tracking-wide text-muted-foreground">
                <th className="p-3">名称</th>
                <th className="p-3">类型</th>
                <th className="p-3 text-right">使用</th>
                <th className="p-3 text-right">收藏</th>
                <th className="p-3 text-right">去重用户</th>
                <th className="p-3 text-right">采纳</th>
                <th className="p-3 text-right">活跃</th>
                <th className="p-3 text-right">综合分</th>
                <th className="p-3">评级</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const g = gradeOf(it.score);
                return (
                  <tr key={it.key} className="border-t border-border/60">
                    <td className="p-3 font-medium">{it.name}</td>
                    <td className="p-3">
                      <TypePill t={it.type} />
                    </td>
                    <td className="p-3 text-right font-mono">{it.usage}</td>
                    <td className="p-3 text-right font-mono">{it.favs}</td>
                    <td className="p-3 text-right font-mono">{it.u30}</td>
                    <td className="p-3 text-right font-mono">
                      {Math.round(it.dim.adopt)}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {Math.round(it.dim.active)}
                    </td>
                    <td
                      className="p-3 text-right font-mono font-semibold"
                      style={{ color: gradeColor(it.score) }}
                    >
                      {it.score}
                    </td>
                    <td className="p-3">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          g.cls,
                        )}
                      >
                        {g.label}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        className="font-medium text-info hover:underline"
                        href={it.href}
                      >
                        查看
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
