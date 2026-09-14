"use client";

import { useState } from "react";
import type { TrendItem } from "./dashboard-shared";

/* ---------------- 趋势 SVG ---------------- */
export function TrendChart({
  days,
  lines,
}: {
  days: string[];
  lines: TrendItem[];
}) {
  const [mousePx, setMousePx] = useState<{ x: number; y: number } | null>(null);
  const [legendHover, setLegendHover] = useState<string | null>(null);
  const [showAllLegend, setShowAllLegend] = useState(false);
  const Wd = 460,
    Ht = 300,
    padL = 38,
    padR = 8,
    padT = 18,
    padB = 20;
  const n = days.length || 30;
  const x = (i: number) => padL + (i / Math.max(1, n - 1)) * (Wd - padL - padR);
  const maxV = Math.max(1, ...lines.flatMap((l) => l.data));
  // 纵轴规整刻度：步长取 1/2/5×10^k，轴顶向上取整到步长整数倍（如峰值 18 → 轴顶 20，刻度 0/5/10/15/20）
  const rawStep = maxV / 4;
  const mag = 10 ** Math.floor(Math.log10(rawStep));
  const norm = rawStep / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const yMax = Math.ceil(maxV / step) * step;
  const yTicks = [0, 1, 2, 3, 4, 5]
    .map((i) => i * step)
    .filter((v) => v <= yMax);
  const y = (v: number) => padT + (1 - v / yMax) * (Ht - padT - padB);
  const color = (type: string, idx: number) =>
    type === "mcp"
      ? ["#3b82f6", "#1d4ed8", "#7c5ce0", "#38bdf8", "#1e40af", "#6d28d9"][
          idx % 6
        ]
      : ["#0f9d76", "#0d6b52", "#1aa783", "#5dcaa5", "#065f46", "#34d399"][
          idx % 6
        ];
  const seg = (d?: string) => (d ? d.slice(5) : "");
  const ticks = Array.from(
    new Set(
      [
        0,
        Math.floor(n / 5),
        Math.floor(n / 2),
        Math.floor((3 * n) / 4),
        n - 1,
      ].filter((t) => t >= 0 && t < n),
    ),
  );

  // 把每条折线预计算为 [x,y][]，鼠标移动时找最近线
  const segs = lines.map((l) =>
    l.data.map((v, j) => [x(j), y(v)] as [number, number]),
  );
  // 找到鼠标位置最近的那条线
  let hitName: string | null = null;
  let hitColor: string | null = null;
  let bestD = 18; // 像素距离阈值：超过此认为没点中
  if (mousePx && segs.length) {
    for (let li = 0; li < segs.length; li++) {
      const pts = segs[li];
      for (let i = 0; i < pts.length - 1; i++) {
        const d = distToSegment(
          mousePx.x,
          mousePx.y,
          pts[i][0],
          pts[i][1],
          pts[i + 1][0],
          pts[i + 1][1],
        );
        if (d < bestD) {
          bestD = d;
          hitName = lines[li].name;
          hitColor = color(lines[li].type, li);
        }
      }
    }
  }
  return (
    /* biome-ignore lint/a11y/noStaticElementInteractions: 图表容器的鼠标跟随交互（tooltip），无对应键盘语义 */
    <div
      className="relative"
      onMouseLeave={() => {
        setMousePx(null);
      }}
      onMouseMove={(e) => {
        const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const sx = ((e.clientX - r.left) / r.width) * Wd;
        const sy = ((e.clientY - r.top) / r.height) * Ht;
        setMousePx({ x: sx, y: sy });
      }}
    >
      <svg
        viewBox={`0 0 ${Wd} ${Ht}`}
        className="w-full"
        role="img"
        aria-label="近30天各条目使用趋势"
      >
        {yTicks.map((v) => {
          const t = 1 - v / yMax; // 距顶部比例
          const yy = padT + t * (Ht - padT - padB);
          return (
            <line
              key={`g${v}`}
              x1={padL}
              y1={yy}
              x2={Wd - padR}
              y2={yy}
              stroke="#eef1f5"
              strokeWidth="1"
            />
          );
        })}
        {/* 纵坐标刻度值 + 单位（顶线为轴顶、底线 0） */}
        {yTicks.map((v) => {
          const t = 1 - v / yMax;
          const yy = padT + t * (Ht - padT - padB);
          return (
            <text
              key={`y${v}`}
              x={padL - 5}
              y={yy + 3}
              textAnchor="end"
              fontSize="9.5"
              fill="#9aa1ac"
            >
              {v}
            </text>
          );
        })}
        <text x={padL - 34} y={padT - 6} fontSize="9.5" fill="#9aa1ac">
          次数
        </text>
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={x(t)}
              y1={padT}
              x2={x(t)}
              y2={Ht - padB}
              stroke="#eef1f5"
              strokeWidth="1"
            />
            <text
              x={x(t)}
              y={Ht - 4}
              textAnchor="middle"
              fontSize="10"
              fill="#9aa1ac"
            >
              {seg(days[t])}
            </text>
          </g>
        ))}
        {/* 高亮命中线：背景稍亮，命中线略粗；其它线淡化（悬停折线或图例均触发） */}
        {lines.map((l, i) => {
          const pts = l.data.map((v, j) => `${x(j)},${y(v)}`).join(" ");
          const c = color(l.type, i);
          const activeName = legendHover ?? hitName;
          const isHit = activeName === l.name;
          const dim = activeName && !isHit ? 0.25 : isHit ? 1 : 0.85;
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
        {hitName &&
          mousePx &&
          lines.map((l, i) => {
            if (l.name !== hitName) return null;
            const nearest = nearestPoint(mousePx.x, mousePx.y, segs[i]);
            if (!nearest) return null;
            return (
              <circle
                key={`hit${l.key}`}
                cx={nearest.x}
                cy={nearest.y}
                r={4}
                fill={hitColor || "#111"}
                stroke="#fff"
                strokeWidth="1.5"
              />
            );
          })}
      </svg>
      {/* 鼠标位置处显示对应名称（跟随鼠标小卡片；近右缘时翻到鼠标左侧、近左缘时翻到右侧，避免探出图外被裁） */}
      {hitName &&
        mousePx &&
        (() => {
          const nearRight = mousePx.x > Wd * 0.72;
          const nearLeft = mousePx.x < Wd * 0.18;
          const tx = nearRight
            ? "calc(-100% - 10px)"
            : nearLeft
              ? "10px"
              : "-50%";
          return (
            <div
              className="pointer-events-none absolute z-20 whitespace-nowrap rounded-md border-border bg-popover px-2.5 py-1.5 text-base font-semibold text-popover-foreground shadow-md"
              style={{
                left: `${(mousePx.x / Wd) * 100}%`,
                top: `${(mousePx.y / Ht) * 100}%`,
                transform: `translate(${tx}, calc(-100% - 8px))`,
              }}
            >
              <span
                className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-middle"
                style={{ background: hitColor || "#111" }}
              />
              {hitName}
            </div>
          );
        })()}
      {lines.length === 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          近 30 天暂无使用数据
        </p>
      )}
      {/* 图例：按 30 天总量降序，默认只显示前 6 项，其余折叠；悬停高亮对应折线 */}
      {lines.length > 0 &&
        (() => {
          const sorted = [...lines]
            .map((l, i) => ({
              l,
              i,
              total: l.data.reduce((a, b) => a + b, 0),
            }))
            .sort((a, b) => b.total - a.total);
          const visible = showAllLegend ? sorted : sorted.slice(0, 6);
          const hidden = sorted.length - visible.length;
          return (
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 border-t pt-2">
              {visible.map(({ l, i, total }) => {
                const active = (legendHover ?? hitName) === l.name;
                return (
                  <button
                    key={l.key}
                    type="button"
                    onMouseEnter={() => setLegendHover(l.name)}
                    onMouseLeave={() => setLegendHover(null)}
                    className={`flex items-center gap-1.5 rounded px-1 py-0.5 text-left text-xs transition-colors ${
                      active
                        ? "bg-muted font-semibold"
                        : "text-muted-foreground"
                    }`}
                  >
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-sm"
                      style={{ background: color(l.type, i) }}
                    />
                    <span className="truncate">{l.name}</span>
                    <span className="ml-auto shrink-0 tabular-nums opacity-70">
                      {total}
                    </span>
                  </button>
                );
              })}
              {sorted.length > 6 && (
                <button
                  type="button"
                  onClick={() => setShowAllLegend(!showAllLegend)}
                  className="col-span-2 rounded px-1 py-0.5 text-left text-xs text-muted-foreground hover:text-foreground"
                >
                  {showAllLegend
                    ? "收起"
                    : `展开其余 ${hidden} 项（按用量排序）`}
                </button>
              )}
            </div>
          );
        })()}
    </div>
  );
}

// 鼠标到线段 (px,py) 距离
function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  const dx = x2 - x1,
    dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = 0;
  if (len2 > 0)
    t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  const cx = x1 + t * dx,
    cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}
// 找到鼠标在线段上最近点的坐标
function nearestPoint(px: number, py: number, pts: [number, number][]) {
  let best: { x: number; y: number; d: number } | null = null;
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1][0] - pts[i][0],
      dy = pts[i + 1][1] - pts[i][1];
    const len2 = dx * dx + dy * dy;
    let t = 0;
    if (len2 > 0)
      t = Math.max(
        0,
        Math.min(1, ((px - pts[i][0]) * dx + (py - pts[i][1]) * dy) / len2),
      );
    const cx = pts[i][0] + t * dx,
      cy = pts[i][1] + t * dy;
    const d = Math.hypot(px - cx, py - cy);
    if (!best || d < best.d) best = { x: cx, y: cy, d };
  }
  return best;
}
