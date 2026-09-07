"use client";

import { useMemo, useState, ReactNode } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface ItemDim {
  adopt: number; active: number; stable: number;
  health: number; mature: number; content: number;
}
export interface ItemStat {
  key: string; id: string; type: "mcp" | "skill";
  name: string; owner?: string; desc: string;
  usage: number; favs: number; u30: number; u7: number; fav7: number; g7: number;
  adopt30: number;   // 近 30 天采纳数（调用/下载量）
  dim: ItemDim; score: number;
  href: string; deploy?: string; healthy?: boolean;
}
export interface TrendItem { key: string; type: "mcp" | "skill"; name: string; data: number[] }

type Filt = "all" | "mcp" | "skill";
const MCP = "#3b82f6";
const SKILL = "#0f9d76";

function TypePill({ t }: { t: "mcp" | "skill" }) {
  return t === "mcp"
    ? <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">MCP</span>
    : <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Skill</span>;
}

// 类型过滤分段控件（右上角，各自独立）
function Seg({ on, onChange }: { on: Filt; onChange: (f: Filt) => void }) {
  const opts: { k: Filt; l: string }[] = [
    { k: "all", l: "全部" }, { k: "mcp", l: "MCP" }, { k: "skill", l: "Skill" },
  ];
  return (
    <div className="inline-flex shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
      {opts.map((o) => (
        <button key={o.k} type="button" onClick={() => onChange(o.k)}
          className={cn(
            "rounded-md px-3 py-0.5 text-xs transition-colors cursor-pointer",
            on === o.k ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200",
          )}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

function CardHead({ title, sub, filt, onFilt }: {
  title: string; sub?: string; filt?: Filt; onFilt?: (f: Filt) => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
      {filt && onFilt && <Seg on={filt} onChange={onFilt} />}
    </div>
  );
}

function Sc({ c }: { c: string }) {
  return <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: c }} />;
}

function gradeOf(score: number) {
  if (score >= 80) return { label: "优质", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" };
  if (score >= 60) return { label: "良好", cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" };
  if (score >= 45) return { label: "待观察", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" };
  return { label: "低质", cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" };
}
const gradeColor = (s: number) => (s >= 80 ? "#0f9d76" : s >= 60 ? "#3b6d11" : s >= 45 ? "#b45309" : "#b0302a");

export function StatsDashboard({ items, kpis, trendDays, trendItems }: {
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
    let l = [...items].sort((a, b) => (retMode === "users" ? b.u30 - a.u30 : (b.u7 ? b.g7 / b.u7 - (a.u7 ? a.g7 / a.u7 : 0) : -1)));
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
  const maxG = Math.max(1, ...retList.map((i) => i.g7));

  const d30 = kpis.total ? kpis.total : items.length;
  const avgU = items.length ? items.reduce((a, b) => a + b.u30, 0) / items.length : 0;

  return (
    <div className="space-y-5">
      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi l="能力项" v={kpis.total} s={`MCP ${items.filter(i=>i.type==="mcp").length} · Skill ${items.filter(i=>i.type==="skill").length}`} />
        <Kpi l="平均综合分" v={kpis.avg} s="0–100" c="#0f9d76" />
        <Kpi l="优质 (≥80)" v={kpis.good} s="高价值 · 可主推" c="#0d6b52" />
        <Kpi l="需关注 (<50)" v={kpis.watch} s="缺维护 / 低采纳" c="#b0302a" />
      </div>

      {/* 排行榜 | 留存 */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2 p-4">
          <CardHead title="优质度排行榜" sub="Top 8 · 综合分 + 关键分维度" filt={fRank} onFilt={setFRank} />
          <div className="max-h-[470px] space-y-1 overflow-y-auto pr-1">
            {rankList.map((it, i) => (
              <RankRow key={it.key} it={it} rank={i + 1} />
            ))}
            {rankList.length === 0 && <EmptyRow />}
          </div>
        </Card>

        <Card className="p-4">
          <CardHead title="留存与深度使用" sub="近一月用户 · 近一周人均" filt={fRet} onFilt={setFRet} />
          {/* 可切换双指标 */}
          <div className="mb-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setRetMode("users")}
              className={cn("rounded-xl border p-2.5 text-left transition-colors cursor-pointer",
                retMode === "users" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-card hover:border-blue-300 dark:border-slate-700")}>
              <p className="text-xs opacity-85">平均唯一用户 · 近一月</p>
              <p className="text-3xl font-extrabold">{Math.round(avgU)}</p>
              <p className="text-[10px] opacity-75">人 / 项 · 去重真实用户</p>
            </button>
            <button type="button" onClick={() => setRetMode("ppc")}
              className={cn("rounded-xl border p-2.5 text-left transition-colors cursor-pointer",
                retMode === "ppc" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-card hover:border-blue-300 dark:border-slate-700")}>
              <p className="text-xs opacity-85">人均使用 · 近一周</p>
              <p className="text-3xl font-extrabold">{perCapita(items)}</p>
              <p className="text-[10px] opacity-75">次 / 人 · 近 7 天</p>
            </button>
          </div>
          <div className="max-h-[240px] space-y-2 overflow-y-auto pr-1">
            {retList.map((it) => {
              const val = retMode === "users" ? it.u30 : perItem(it);
              const wmax = retMode === "users" ? maxU : Math.max(1, ...retList.map((x) => perItem(x)));
              const w = Math.max(2, Math.round((val / wmax) * 100));
              return (
                <div key={it.key} className="grid grid-cols-[auto_1fr_64px] items-center gap-3 text-sm">
                  <span className="w-28 truncate text-slate-600 dark:text-slate-300">{it.name}</span>
                  <span className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <span className="block h-full rounded-full" style={{ width: w + "%", background: it.type === "mcp" ? MCP : SKILL }} />
                  </span>
                  <span className="text-right text-base font-semibold">{retMode === "users" ? it.u30 + "人" : perItem(it).toFixed(1)}</span>
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
          <CardHead title="近 30 天使用趋势" sub="每条目独立折线 · 顶部为高用量项" filt={fTrend} onFilt={setFTrend} />
          <TrendChart days={trendDays} lines={trendLines} />
        </Card>
        <Card className="p-4">
          <CardHead title="采纳 × 质量 四象限" sub="横轴综合评分 · 纵轴近一月采纳数 · 气泡=综合分" filt={fQuad} onFilt={setFQuad} />
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
                <th className="p-3">名称</th><th className="p-3">类型</th><th className="p-3 text-right">使用</th>
                <th className="p-3 text-right">收藏</th><th className="p-3 text-right">去重用户</th>
                <th className="p-3 text-right">采纳</th><th className="p-3 text-right">活跃</th>
                <th className="p-3 text-right">综合分</th><th className="p-3">评级</th><th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const g = gradeOf(it.score);
                return (
                  <tr key={it.key} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="p-3 font-medium">{it.name}</td>
                    <td className="p-3"><TypePill t={it.type} /></td>
                    <td className="p-3 text-right">{it.usage}</td>
                    <td className="p-3 text-right">{it.favs}</td>
                    <td className="p-3 text-right">{it.u30}</td>
                    <td className="p-3 text-right">{Math.round(it.dim.adopt)}</td>
                    <td className="p-3 text-right">{Math.round(it.dim.active)}</td>
                    <td className="p-3 text-right font-bold" style={{ color: gradeColor(it.score) }}>{it.score}</td>
                    <td className="p-3"><span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", g.cls)}>{g.label}</span></td>
                    <td className="p-3 text-right"><Link className="text-blue-600 hover:underline" href={it.href}>查看</Link></td>
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

function Kpi({ l, v, s, c }: { l: string; v: number; s?: string; c?: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-muted-foreground">{l}</p>
      <p className="mt-1 text-4xl font-extrabold" style={{ color: c }}>{v}</p>
      {s && <p className="text-xs text-muted-foreground">{s}</p>}
    </Card>
  );
}

function RankRow({ it, rank }: { it: ItemStat; rank: number }) {
  const rkCls = rank === 1 ? "bg-amber-300 text-amber-900" : rank === 2 ? "bg-slate-300 text-slate-700" : rank === 3 ? "bg-orange-200 text-orange-800" : "bg-slate-100 text-slate-500";
  const dims = it.type === "mcp"
    ? ([["采纳", it.dim.adopt], ["活跃", it.dim.active], ["稳定", it.dim.stable], ["反馈", it.dim.health], ["成熟", it.dim.mature], ["内容", it.dim.content]] as const)
    : ([["采纳", it.dim.adopt], ["活跃", it.dim.active], ["反馈", it.dim.health], ["成熟", it.dim.mature], ["内容", it.dim.content]] as const);
  const cols = it.type === "mcp" ? 6 : 5;
  const gridCls = it.type === "mcp" ? "grid-cols-[repeat(6,minmax(80px,1fr))]" : "grid-cols-[repeat(5,minmax(80px,1fr))]";
  const barC = it.type === "mcp" ? MCP : SKILL;
  return (
    <div className="flex items-center gap-4 rounded-lg border-b border-slate-100 px-1 py-2 dark:border-slate-800/60">
      <span className={cn("flex h-6 w-6 flex-none items-center justify-center rounded-md text-xs font-bold", rkCls)}>{rank}</span>
      <div className="w-36 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold">{it.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TypePill t={it.type} />
          <span className="text-[10px] text-muted-foreground">{it.type === "mcp" ? "调用" : "下载"} {it.usage}</span>
        </div>
      </div>
      {/* 中：各维度得分，等宽对齐填满中间，不侵入右侧总分 */}
      <div className={cn("min-w-0 flex-1 grid gap-x", gridCls, cols === 5 ? "gap-x-3" : "gap-x-2")}>
        {dims.map(([label, v]) => {
          const val = Math.round(v);
          return (
            <div key={label} className="min-w-[80px]">
              <div className="flex items-baseline justify-between text-[10px] text-muted-foreground">
                <span>{label}</span>
                <b className="tabular-nums text-xs text-slate-700 dark:text-slate-100">{val}</b>
              </div>
              <span className="mt-0.5 block h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <span className="block h-full rounded-full" style={{ width: Math.max(2, val) + "%", background: barC }} />
              </span>
            </div>
          );
        })}
      </div>
      {/* 右：加权总分，固定不挤 */}
      <div className="w-14 shrink-0 text-right">
        <div className="text-xl font-extrabold" style={{ color: gradeColor(it.score) }}>{it.score}</div>
        <div className="text-[10px] text-muted-foreground">{gradeOf(it.score).label}</div>
      </div>
    </div>
  );
}

function perCapita(items: ItemStat[]) {
  const used = items.filter((i) => i.u7 > 0);
  if (!used.length) return "—";
  return (used.reduce((a, b) => a + b.g7 / b.u7, 0) / used.length).toFixed(1);
}
function perItem(it: ItemStat) {
  return it.u7 > 0 ? it.g7 / it.u7 : 0;
}

function EmptyRow() {
  return <p className="py-8 text-center text-sm text-muted-foreground">没有匹配的条目</p>;
}

/* ---------------- 趋势 SVG ---------------- */
function TrendChart({ days, lines }: { days: string[]; lines: TrendItem[] }) {
  const [mousePx, setMousePx] = useState<{ x: number; y: number } | null>(null);
  const Wd = 460, Ht = 200, padL = 14, padR = 8, padT = 16, padB = 20;
  const n = days.length || 30;
  const x = (i: number) => padL + (i / Math.max(1, n - 1)) * (Wd - padL - padR);
  const maxV = Math.max(1, ...lines.flatMap((l) => l.data));
  const y = (v: number) => padT + (1 - v / maxV) * (Ht - padT - padB);
  const color = (type: string, idx: number) =>
    type === "mcp"
      ? ["#3b82f6", "#1d4ed8", "#7c5ce0", "#38bdf8", "#1e40af", "#6d28d9"][idx % 6]
      : ["#0f9d76", "#0d6b52", "#1aa783", "#5dcaa5", "#065f46", "#34d399"][idx % 6];
  const seg = (d?: string) => (d ? d.slice(5) : "");
  const ticks = Array.from(new Set([0, Math.floor(n / 5), Math.floor(n / 2), Math.floor((3 * n) / 4), n - 1].filter((t) => t >= 0 && t < n)));

  // 把每条折线预计算为 [x,y][]，鼠标移动时找最近线
  const segs = lines.map((l) => l.data.map((v, j) => [x(j), y(v)] as [number, number]));
  // 找到鼠标位置最近的那条线
  let hitName: string | null = null;
  let hitColor: string | null = null;
  let bestD = 18; // 像素距离阈值：超过此认为没点中
  if (mousePx && segs.length) {
    for (let li = 0; li < segs.length; li++) {
      const pts = segs[li];
      for (let i = 0; i < pts.length - 1; i++) {
        const d = distToSegment(mousePx.x, mousePx.y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
        if (d < bestD) {
          bestD = d;
          hitName = lines[li].name;
          hitColor = color(lines[li].type, li);
        }
      }
    }
  }
  return (
    <div
      className="relative"
      onMouseLeave={() => { setMousePx(null); }}
      onMouseMove={(e) => {
        const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const sx = ((e.clientX - r.left) / r.width) * Wd;
        const sy = ((e.clientY - r.top) / r.height) * Ht;
        setMousePx({ x: sx, y: sy });
      }}
    >
      <svg viewBox={`0 0 ${Wd} ${Ht}`} className="w-full" role="img" aria-label="近30天各条目使用趋势">
        {[0.25, 0.5, 0.75, 1].map((t) => {
          const yy = padT + t * (Ht - padT - padB);
          return <line key={t} x1={padL} y1={yy} x2={Wd - padR} y2={yy} stroke="#eef1f5" strokeWidth="1" />;
        })}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} y1={padT} x2={x(t)} y2={Ht - padB} stroke="#eef1f5" strokeWidth="1" />
            <text x={x(t)} y={Ht - 4} textAnchor="middle" fontSize="10" fill="#9aa1ac">{seg(days[t])}</text>
          </g>
        ))}
        {/* 高亮命中线：背景稍亮，命中线略粗；其它线淡化 */}
        {lines.map((l, i) => {
          const pts = l.data.map((v, j) => `${x(j)},${y(v)}`).join(" ");
          const c = color(l.type, i);
          const isHit = hitName === l.name;
          const dim = hitName && !isHit ? 0.25 : isHit ? 1 : 0.85;
          return (
            <polyline
              key={l.key}
              points={pts}
              fill="none"
              stroke={c}
              strokeWidth={isHit ? 2 : 1.2}
              opacity={dim}
            />
          );
        })}
        {/* 命中点高亮圆点 */}
        {hitName && mousePx && lines.map((l, i) => {
          if (l.name !== hitName) return null;
          const nearest = nearestPoint(mousePx.x, mousePx.y, segs[i]);
          if (!nearest) return null;
          return <circle key={"hit"+l.key} cx={nearest.x} cy={nearest.y} r={4} fill={hitColor || "#111"} stroke="#fff" strokeWidth="1.5" />;
        })}
      </svg>
      {/* 鼠标位置处显示对应名称（跟随鼠标小卡片） */}
      {hitName && mousePx && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 shadow-md dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          style={{ left: `${(mousePx.x / Wd) * 100}%`, top: `${(mousePx.y / Ht) * 100}%`, marginTop: "-6px" }}
        >
          <span className="mr-1.5 inline-block h-2 w-2 rounded-sm align-middle" style={{ background: hitColor || "#111" }} />
          {hitName}
        </div>
      )}
      {lines.length === 0 && <p className="mt-2 text-sm text-muted-foreground">近 30 天暂无使用数据</p>}
    </div>
  );
}

// 鼠标到线段 (px,py) 距离
function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = 0;
  if (len2 > 0) t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  const cx = x1 + t * dx, cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}
// 找到鼠标在线段上最近点的坐标
function nearestPoint(px: number, py: number, pts: [number, number][]) {
  let best: { x: number; y: number; d: number } | null = null;
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1][0] - pts[i][0], dy = pts[i + 1][1] - pts[i][1];
    const len2 = dx * dx + dy * dy;
    let t = 0;
    if (len2 > 0) t = Math.max(0, Math.min(1, ((px - pts[i][0]) * dx + (py - pts[i][1]) * dy) / len2));
    const cx = pts[i][0] + t * dx, cy = pts[i][1] + t * dy;
    const d = Math.hypot(px - cx, py - cy);
    if (!best || d < best.d) best = { x: cx, y: cy, d };
  }
  return best;
}

/* ---------------- 四象限 ---------------- */
function Quadrant({ items }: { items: ItemStat[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const Wq = 470, Hq = 320;
  const L = 60, R = 10, T = 36, B = 40; // 加宽左边留白放 Y 轴标题和刻度
  const plotW = Wq - L - R;
  const plotH = Hq - T - B;
  const x0 = L, x1 = Wq - R;
  const y0 = T, y1 = Hq - B; // y1 = 底部轴
  const X = (v: number) => x0 + (v / 100) * plotW;
  const maxAdopt = Math.max(1, ...items.map((i) => i.adopt30 || 0));
  // 将采纳数映射到 0..100 内部坐标，再走 Y(v)
  const Y = (count: number) => {
    const v = Math.max(0, Math.min(100, (count / maxAdopt) * 100));
    return y0 + (1 - v / 100) * plotH;
  };
  const YTickVals = [0, 25, 50, 75, 100]; // 这 5 个 tick 仍按内部 0-100 画，但标注真实采纳数
  const ticks = YTickVals;
  const cx0 = (x0 + x1) / 2, cy0 = (y0 + y1) / 2;
  const col = (s: number) => (s >= 80 ? "rgba(15,157,118,.62)" : s >= 60 ? "rgba(15,157,118,.46)" : s >= 45 ? "rgba(230,161,0,.58)" : "rgba(226,75,74,.58)");
  const shown = items.filter((i) => (i.adopt30 || 0) > 0 && i.score > 0);
  const cap = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  return (
    <svg viewBox={`0 0 ${Wq} ${Hq}`} className="w-full" role="img" aria-label="采纳与质量四象限">
      <rect x={x0} y={y0} width={plotW} height={plotH} fill="#fbfcfe" stroke="#e6eaf0" />
      {ticks.map((t) => <line key={"gx"+t} x1={X(t)} y1={y0} x2={X(t)} y2={y1} stroke="#eef1f5" />)}
      {ticks.map((t) => <line key={"gy"+t} x1={x0} y1={Y(maxAdopt * t / 100)} x2={x1} y2={Y(maxAdopt * t / 100)} stroke="#eef1f5" />)}
      {/* 中位线 */}
      <line x1={cx0} y1={y0} x2={cx0} y2={y1} stroke="#cbd3de" strokeWidth="1.3" />
      <line x1={x0} y1={cy0} x2={x1} y2={cy0} stroke="#cbd3de" strokeWidth="1.3" />
      {/* Y 轴：轴线 + 刻度 + 数字（数字为对应区段的最大采纳数） */}
      <line x1={x0} y1={y0} x2={x0} y2={y1} stroke="#6b7280" strokeWidth="1" />
      {ticks.map((t) => {
        const y = Y(maxAdopt * t / 100);
        const num = Math.round(maxAdopt * t / 100);
        return (
          <g key={"y"+t}>
            <line x1={x0 - 5} y1={y} x2={x0} y2={y} stroke="#6b7280" />
            <text x={x0 - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#6b7280">{num}</text>
          </g>
        );
      })}
      {/* X 轴：轴线 + 刻度 + 数字（综合评分 0/25/50/75/100） */}
      <line x1={x0} y1={y1} x2={x1} y2={y1} stroke="#6b7280" strokeWidth="1" />
      {ticks.map((t) => {
        const x = X(t);
        return (
          <g key={"x"+t}>
            <line x1={x} y1={y1} x2={x} y2={y1 + 5} stroke="#6b7280" />
            <text x={x} y={y1 + 18} textAnchor="middle" fontSize="10" fill="#6b7280">{t}</text>
          </g>
        );
      })}
      {/* 轴标题（位置避开刻度数字区域） */}
      {/* Y 轴标题：横排放在绘图区上方外侧（图卡头下方红圈那一带） */}
      <text x={x0 + 2} y={y0 - 8} textAnchor="start" fontSize="12" fill="#1f2937" fontWeight="700">近一月采纳数</text>
      {/* X 轴标题：右下，X 综合评分（去箭头） */}
      <text x={x1} y={y1 + 32} fontSize="12" fill="#1f2937" fontWeight="700" textAnchor="end">综合评分</text>
      <text x={x1 - 8} y={y0 + 14} fontSize="11" fill="#0d6b52" textAnchor="end">高采纳 · 高质量</text>
      <text x={x0 + 8} y={y1 - 6} fontSize="11" fill="#b0302a">低采纳 · 低质量</text>
      {/* 气泡：平时只显示圆点，悬停某气泡时在上方显示名字 */}
      {shown.map((it) => {
        const xVal = cap(it.score, 0, 100);
        const yVal = cap((it.adopt30 / maxAdopt) * 100, 0, 100);
        let px = X(xVal);
        let py = Y(it.adopt30);
        const rr = Math.min(20, 6 + (it.score / 100) * 16);
        px = cap(px, x0 + rr, x1 - rr);
        py = cap(py, y0 + rr, y1 - rr);
        const labelTxt = it.name.length > 14 ? it.name.slice(0, 13) + "…" : it.name;
        const chipY = py - rr - 10;
        const isHover = hover === it.key;
        return (
          <g key={it.key} onMouseEnter={() => setHover(it.key)} onMouseLeave={() => setHover(null)} className="cursor-pointer">
            <circle cx={px} cy={py} r={Math.max(rr, 8)} fill="transparent" />
            <circle cx={px} cy={py} r={rr} fill={col(it.score)} stroke="#fff" strokeWidth="1" />
            {isHover && (
              <g style={{ pointerEvents: "none" }}>
                <rect x={cap(px - labelTxt.length * 5.4 / 2, x0, x1 - labelTxt.length * 5.4)} y={chipY - 13} width={labelTxt.length * 5.4} height={17} rx={4} fill="#ffffff" stroke="#c9d1dc" strokeWidth="0.5" />
                <text x={px} y={chipY} textAnchor="middle" fontSize="11" fill="#111827" fontWeight="600" dominantBaseline="middle">{labelTxt}</text>
              </g>
            )}
            <title>{`${it.name} · 近一月采纳数 ${it.adopt30} · 综合分 ${it.score}`}</title>
          </g>
        );
      })}
    </svg>
  );
}
