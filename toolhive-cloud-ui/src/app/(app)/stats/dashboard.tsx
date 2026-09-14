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
  perCapita,
  perItem,
  RankRow,
  SKILL,
  type TrendItem,
  TypePill,
} from "./dashboard-shared";
import { Quadrant } from "./quadrant";
import { TrendChart } from "./trend-chart";

export function StatsDashboard({
  items,
  kpis,
  trendDays,
  trendItems,
}: {
  items: ItemStat[];
  kpis: { total: number; avg: number; good: number; watch: number };
  trendDays: string[];
  trendItems: TrendItem[];
}) {
  const [fRank, setFRank] = useState<Filt>("all");
  const [fRet, setFRet] = useState<Filt>("all");
  const [fTrend, setFTrend] = useState<Filt>("all");
  const [fQuad, setFQuad] = useState<Filt>("all");
  const [retMode, setRetMode] = useState<"users" | "ppc">("users");

  const rankList = useMemo(() => {
    let l = [...items].sort((a, b) => b.score - a.score).slice(0, 8);
    if (fRank !== "all") l = l.filter((i) => i.type === fRank);
    return l;
  }, [items, fRank]);
  const retList = useMemo(() => {
    let l = [...items].sort((a, b) =>
      retMode === "users"
        ? b.u30 - a.u30
        : b.u7
          ? b.g7 / b.u7 - (a.u7 ? a.g7 / a.u7 : 0)
          : -1,
    );
    l = l.slice(0, 6);
    if (fRet !== "all") l = l.filter((i) => i.type === fRet);
    return l;
  }, [items, fRet, retMode]);

  const trendLines = useMemo(() => {
    let l = trendItems;
    if (fTrend !== "all") l = l.filter((i) => i.type === fTrend);
    return l;
  }, [trendItems, fTrend]);
  const quadList = useMemo(() => {
    let l = items;
    if (fQuad !== "all") l = l.filter((i) => i.type === fQuad);
    return l;
  }, [items, fQuad]);

  const maxU = Math.max(1, ...items.map((i) => i.u30));
  const _maxG = Math.max(1, ...retList.map((i) => i.g7));

  const _d30 = kpis.total ? kpis.total : items.length;
  const avgU = items.length
    ? items.reduce((a, b) => a + b.u30, 0) / items.length
    : 0;

  return (
    <div className="space-y-5">
      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi
          l="能力项"
          v={kpis.total}
          s={`MCP ${items.filter((i) => i.type === "mcp").length} · Skill ${items.filter((i) => i.type === "skill").length}`}
        />
        <Kpi l="平均综合分" v={kpis.avg} s="0–100" c="#0f9d76" />
        <Kpi l="优质 (≥80)" v={kpis.good} s="高价值 · 可主推" c="#0d6b52" />
        <Kpi l="需关注 (<50)" v={kpis.watch} s="缺维护 / 低采纳" c="#b0302a" />
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
          <CardHead
            title="留存与深度使用"
            sub="近一月用户 · 近一周人均"
            filt={fRet}
            onFilt={setFRet}
          />
          {/* 可切换双指标 */}
          <div className="mb-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRetMode("users")}
              className={cn(
                "rounded-xl border p-2.5 text-left transition-colors cursor-pointer",
                retMode === "users"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:border-primary/40",
              )}
            >
              <p className="text-xs opacity-85">平均唯一用户 · 近一月</p>
              <p className="text-3xl font-extrabold">{Math.round(avgU)}</p>
              <p className="text-xs opacity-75">人 / 项 · 去重真实用户</p>
            </button>
            <button
              type="button"
              onClick={() => setRetMode("ppc")}
              className={cn(
                "rounded-xl border p-2.5 text-left transition-colors cursor-pointer",
                retMode === "ppc"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:border-primary/40",
              )}
            >
              <p className="text-xs opacity-85">人均使用 · 近一周</p>
              <p className="text-3xl font-extrabold">{perCapita(items)}</p>
              <p className="text-xs opacity-75">次 / 人 · 近 7 天</p>
            </button>
          </div>
          <div className="max-h-[240px] space-y-2 overflow-y-auto pr-1">
            {retList.map((it) => {
              const val = retMode === "users" ? it.u30 : perItem(it);
              const wmax =
                retMode === "users"
                  ? maxU
                  : Math.max(1, ...retList.map((x) => perItem(x)));
              const w = Math.max(2, Math.round((val / wmax) * 100));
              return (
                <div
                  key={it.key}
                  className="grid grid-cols-[auto_1fr_64px] items-center gap-3 text-sm"
                >
                  <span className="w-28 truncate text-muted-foreground">
                    {it.name}
                  </span>
                  <span className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${w}%`,
                        background: it.type === "mcp" ? MCP : SKILL,
                      }}
                    />
                  </span>
                  <span className="text-right text-base font-semibold">
                    {retMode === "users"
                      ? `${it.u30}人`
                      : perItem(it).toFixed(1)}
                  </span>
                </div>
              );
            })}
            {retList.length === 0 && <EmptyRow />}
          </div>
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
          <CardHead
            title="采纳 × 质量 四象限"
            sub="横轴综合评分 · 纵轴近一月采纳数 · 气泡=综合分"
            filt={fQuad}
            onFilt={setFQuad}
          />
          <Quadrant items={quadList} />
        </Card>
      </div>

      {/* 明细 */}
      <Card className="p-4">
        <CardHead title="逐项明细" sub="调用/下载、收藏、去重用户与综合分" />
        <div className="max-h-[360px] overflow-auto">
          <table className="w-full border-collapse text-base">
            <thead className="sticky top-0 bg-card">
              <tr className="text-left text-sm uppercase tracking-wide text-muted-foreground">
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
                    <td className="p-3 text-right">{it.usage}</td>
                    <td className="p-3 text-right">{it.favs}</td>
                    <td className="p-3 text-right">{it.u30}</td>
                    <td className="p-3 text-right">
                      {Math.round(it.dim.adopt)}
                    </td>
                    <td className="p-3 text-right">
                      {Math.round(it.dim.active)}
                    </td>
                    <td
                      className="p-3 text-right font-bold"
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
                        className="text-primary hover:underline"
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
