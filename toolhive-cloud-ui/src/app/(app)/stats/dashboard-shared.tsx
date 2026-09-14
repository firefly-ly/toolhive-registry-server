"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface ItemDim {
  adopt: number;
  active: number;
  stable: number;
  health: number;
  mature: number;
  content: number;
}
export interface ItemStat {
  key: string;
  id: string;
  type: "mcp" | "skill";
  name: string;
  owner?: string;
  desc: string;
  usage: number;
  favs: number;
  u30: number;
  u7: number;
  fav7: number;
  g7: number;
  adopt30: number; // 近 30 天采纳数（调用/下载量）
  dim: ItemDim;
  score: number;
  href: string;
  deploy?: string;
  healthy?: boolean;
}
export interface TrendItem {
  key: string;
  type: "mcp" | "skill";
  name: string;
  data: number[];
}

export type Filt = "all" | "mcp" | "skill";
export const MCP = "#3b82f6";
export const SKILL = "#0f9d76";

export function TypePill({ t }: { t: "mcp" | "skill" }) {
  return t === "mcp" ? (
    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary dark:bg-primary/20">
      MCP
    </span>
  ) : (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
      Skill
    </span>
  );
}

// 类型过滤分段控件（右上角，各自独立）
export function Seg({
  on,
  onChange,
}: {
  on: Filt;
  onChange: (f: Filt) => void;
}) {
  const opts: { k: Filt; l: string }[] = [
    { k: "all", l: "全部" },
    { k: "mcp", l: "MCP" },
    { k: "skill", l: "Skill" },
  ];
  return (
    <div className="inline-flex shrink-0 rounded-lg border border-border bg-muted/50 p-1">
      {opts.map((o) => (
        <button
          key={o.k}
          type="button"
          onClick={() => onChange(o.k)}
          className={cn(
            "rounded-md px-4 py-1 text-base transition-colors cursor-pointer",
            on === o.k
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

export function CardHead({
  title,
  sub,
  filt,
  onFilt,
}: {
  title: string;
  sub?: string;
  filt?: Filt;
  onFilt?: (f: Filt) => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
      {filt && onFilt && <Seg on={filt} onChange={onFilt} />}
    </div>
  );
}

function _Sc({ c }: { c: string }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-[3px]"
      style={{ background: c }}
    />
  );
}

export function gradeOf(score: number) {
  if (score >= 80)
    return {
      label: "优质",
      cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    };
  if (score >= 60)
    return {
      label: "良好",
      cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    };
  if (score >= 45)
    return {
      label: "待观察",
      cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    };
  return {
    label: "低质",
    cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  };
}
export const gradeColor = (s: number) =>
  s >= 80 ? "#0f9d76" : s >= 60 ? "#3b6d11" : s >= 45 ? "#b45309" : "#b0302a";
export function Kpi({
  l,
  v,
  s,
  c,
}: {
  l: string;
  v: number;
  s?: string;
  c?: string;
}) {
  return (
    <Card className="p-5">
      <p className="text-sm text-muted-foreground">{l}</p>
      <p className="mt-1 text-4xl font-extrabold" style={{ color: c }}>
        {v}
      </p>
      {s && <p className="text-xs text-muted-foreground">{s}</p>}
    </Card>
  );
}

export function RankRow({ it, rank }: { it: ItemStat; rank: number }) {
  const rkCls =
    rank === 1
      ? "bg-amber-300 text-amber-900"
      : rank === 2
        ? "bg-muted text-foreground"
        : rank === 3
          ? "bg-orange-200 text-orange-800"
          : "bg-muted text-muted-foreground";
  const dims =
    it.type === "mcp"
      ? ([
          ["采纳", it.dim.adopt],
          ["活跃", it.dim.active],
          ["稳定", it.dim.stable],
          ["反馈", it.dim.health],
          ["成熟", it.dim.mature],
          ["内容", it.dim.content],
        ] as const)
      : ([
          ["采纳", it.dim.adopt],
          ["活跃", it.dim.active],
          ["反馈", it.dim.health],
          ["成熟", it.dim.mature],
          ["内容", it.dim.content],
        ] as const);
  const cols = it.type === "mcp" ? 6 : 5;
  const gridCls =
    it.type === "mcp"
      ? "grid-cols-[repeat(6,minmax(80px,1fr))]"
      : "grid-cols-[repeat(5,minmax(80px,1fr))]";
  const barC = it.type === "mcp" ? MCP : SKILL;
  return (
    <div className="flex items-center gap-4 rounded-lg border-b border-border/60 px-1 py-2">
      <span
        className={cn(
          "flex h-6 w-6 flex-none items-center justify-center rounded-md text-xs font-bold",
          rkCls,
        )}
      >
        {rank}
      </span>
      <div className="w-36 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold">{it.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TypePill t={it.type} />
          <span className="text-xs text-muted-foreground">
            {it.type === "mcp" ? "调用" : "下载"} {it.usage}
          </span>
        </div>
      </div>
      {/* 中：各维度得分，等宽对齐填满中间，不侵入右侧总分 */}
      <div
        className={cn(
          "min-w-0 flex-1 grid gap-x",
          gridCls,
          cols === 5 ? "gap-x-3" : "gap-x-2",
        )}
      >
        {dims.map(([label, v]) => {
          const val = Math.round(v);
          return (
            <div key={label} className="min-w-[80px]">
              <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                <span className="font-medium">{label}</span>
                <b className="tabular-nums text-sm text-foreground">{val}</b>
              </div>
              <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${Math.max(2, val)}%`, background: barC }}
                />
              </span>
            </div>
          );
        })}
      </div>
      {/* 右：加权总分，固定不挤 */}
      <div className="w-20 shrink-0 text-right">
        <div
          className="text-3xl font-extrabold leading-7"
          style={{ color: gradeColor(it.score) }}
        >
          {it.score}
        </div>
        <div className="mt-0.5 text-sm text-muted-foreground">
          {gradeOf(it.score).label}
        </div>
      </div>
    </div>
  );
}

export function perCapita(items: ItemStat[]) {
  const used = items.filter((i) => i.u7 > 0);
  if (!used.length) return "—";
  return (used.reduce((a, b) => a + b.g7 / b.u7, 0) / used.length).toFixed(1);
}
export function perItem(it: ItemStat) {
  return it.u7 > 0 ? it.g7 / it.u7 : 0;
}

export function EmptyRow() {
  return (
    <p className="py-8 text-center text-sm text-muted-foreground">
      没有匹配的条目
    </p>
  );
}
