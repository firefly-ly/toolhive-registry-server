"use client";

import { useState } from "react";
import type { ItemStat } from "./dashboard-shared";

/* ---------------- 四象限 ---------------- */
export function Quadrant({ items }: { items: ItemStat[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const Wq = 470,
    Hq = 320;
  const L = 60,
    R = 10,
    T = 36,
    B = 40; // 加宽左边留白放 Y 轴标题和刻度
  const plotW = Wq - L - R;
  const plotH = Hq - T - B;
  const x0 = L,
    x1 = Wq - R;
  const y0 = T,
    y1 = Hq - B; // y1 = 底部轴
  const X = (v: number) => x0 + (v / 100) * plotW;
  const maxAdopt = Math.max(1, ...items.map((i) => i.adopt30 || 0));
  // 将采纳数映射到 0..100 内部坐标，再走 Y(v)
  const Y = (count: number) => {
    const v = Math.max(0, Math.min(100, (count / maxAdopt) * 100));
    return y0 + (1 - v / 100) * plotH;
  };
  const YTickVals = [0, 25, 50, 75, 100]; // 这 5 个 tick 仍按内部 0-100 画，但标注真实采纳数
  const ticks = YTickVals;
  const cx0 = (x0 + x1) / 2,
    cy0 = (y0 + y1) / 2;
  const col = (s: number) =>
    s >= 80
      ? "rgba(15,157,118,.62)"
      : s >= 60
        ? "rgba(15,157,118,.46)"
        : s >= 45
          ? "rgba(230,161,0,.58)"
          : "rgba(226,75,74,.58)";
  const shown = items.filter((i) => (i.adopt30 || 0) > 0 && i.score > 0);
  const cap = (v: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, v));
  return (
    <svg
      viewBox={`0 0 ${Wq} ${Hq}`}
      className="w-full"
      role="img"
      aria-label="采纳与质量四象限"
    >
      <rect
        x={x0}
        y={y0}
        width={plotW}
        height={plotH}
        fill="#fbfcfe"
        stroke="#e6eaf0"
      />
      {ticks.map((t) => (
        <line
          key={`gx${t}`}
          x1={X(t)}
          y1={y0}
          x2={X(t)}
          y2={y1}
          stroke="#eef1f5"
        />
      ))}
      {ticks.map((t) => (
        <line
          key={`gy${t}`}
          x1={x0}
          y1={Y((maxAdopt * t) / 100)}
          x2={x1}
          y2={Y((maxAdopt * t) / 100)}
          stroke="#eef1f5"
        />
      ))}
      {/* 中位线 */}
      <line
        x1={cx0}
        y1={y0}
        x2={cx0}
        y2={y1}
        stroke="#cbd3de"
        strokeWidth="1.3"
      />
      <line
        x1={x0}
        y1={cy0}
        x2={x1}
        y2={cy0}
        stroke="#cbd3de"
        strokeWidth="1.3"
      />
      {/* Y 轴：轴线 + 刻度 + 数字（数字为对应区段的最大采纳数） */}
      <line x1={x0} y1={y0} x2={x0} y2={y1} stroke="#6b7280" strokeWidth="1" />
      {ticks.map((t) => {
        const y = Y((maxAdopt * t) / 100);
        const num = Math.round((maxAdopt * t) / 100);
        return (
          <g key={`y${t}`}>
            <line x1={x0 - 5} y1={y} x2={x0} y2={y} stroke="#6b7280" />
            <text
              x={x0 - 8}
              y={y + 4}
              textAnchor="end"
              fontSize="10"
              fill="#6b7280"
            >
              {num}
            </text>
          </g>
        );
      })}
      {/* X 轴：轴线 + 刻度 + 数字（综合评分 0/25/50/75/100） */}
      <line x1={x0} y1={y1} x2={x1} y2={y1} stroke="#6b7280" strokeWidth="1" />
      {ticks.map((t) => {
        const x = X(t);
        return (
          <g key={`x${t}`}>
            <line x1={x} y1={y1} x2={x} y2={y1 + 5} stroke="#6b7280" />
            <text
              x={x}
              y={y1 + 18}
              textAnchor="middle"
              fontSize="10"
              fill="#6b7280"
            >
              {t}
            </text>
          </g>
        );
      })}
      {/* 轴标题（位置避开刻度数字区域） */}
      {/* Y 轴标题：横排放在绘图区上方外侧（图卡头下方红圈那一带） */}
      <text
        x={x0 + 2}
        y={y0 - 8}
        textAnchor="start"
        fontSize="12"
        fill="#1f2937"
        fontWeight="700"
      >
        近一月采纳数
      </text>
      {/* X 轴标题：右下，X 综合评分（去箭头） */}
      <text
        x={x1}
        y={y1 + 32}
        fontSize="12"
        fill="#1f2937"
        fontWeight="700"
        textAnchor="end"
      >
        综合评分
      </text>
      <text
        x={x1 - 8}
        y={y0 + 14}
        fontSize="11"
        fill="#0d6b52"
        textAnchor="end"
      >
        高采纳 · 高质量
      </text>
      <text x={x0 + 8} y={y1 - 6} fontSize="11" fill="#b0302a">
        低采纳 · 低质量
      </text>
      {/* 名牌投影滤镜 */}
      <defs>
        <filter id="quadTipShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow
            dx="0"
            dy="2"
            stdDeviation="3"
            floodColor="#0f172a"
            floodOpacity="0.14"
          />
        </filter>
      </defs>
      {/* 气泡：平时只显示圆点，悬停时上方弹出双行信息名牌 */}
      {shown.map((it) => {
        const xVal = cap(it.score, 0, 100);
        const _yVal = cap((it.adopt30 / maxAdopt) * 100, 0, 100);
        let px = X(xVal);
        let py = Y(it.adopt30);
        const rr = Math.min(20, 6 + (it.score / 100) * 16);
        px = cap(px, x0 + rr, x1 - rr);
        py = cap(py, y0 + rr, y1 - rr);
        const isHover = hover === it.key;
        return (
          // biome-ignore lint/a11y/noStaticElementInteractions: SVG 悬停高亮交互（tooltip），无对应键盘语义
          <g
            key={it.key}
            onMouseEnter={() => setHover(it.key)}
            onMouseLeave={() => setHover(null)}
            className="cursor-pointer"
          >
            <circle cx={px} cy={py} r={Math.max(rr, 8)} fill="transparent" />
            <circle
              cx={px}
              cy={py}
              r={rr}
              fill={col(it.score)}
              stroke="#fff"
              strokeWidth="1"
            />
            {isHover &&
              (() => {
                // 圆点颜色与气泡评级一致（不透明版）
                const dotFill =
                  it.score >= 80
                    ? "#0f9d76"
                    : it.score >= 60
                      ? "#3b6d11"
                      : it.score >= 45
                        ? "#e6a100"
                        : "#e24b4a";
                const nameTxt =
                  it.name.length > 16 ? `${it.name.slice(0, 15)}…` : it.name;
                const metaTxt = `${it.type === "mcp" ? "调用" : "下载"} ${Math.round(it.adopt30)} · 评分 ${it.score}`;
                // 字宽估算：给定字号下全角 ≈ fs、ASCII ≈ 0.55fs
                const tw = (s: string, fs: number) =>
                  [...s].reduce(
                    (a, ch) => a + (ch.charCodeAt(0) > 255 ? fs : fs * 0.55),
                    0,
                  );
                const dotW = 5 + 4; // 圆点直径 + 与文字间距
                const w =
                  Math.max(tw(nameTxt, 8), tw(metaTxt, 7.5)) + dotW + 18;
                const h = 28;
                const gap = 8; // 名牌与气泡的间距（容纳三角指针）
                const tipX = cap(px, x0 + w / 2 + 2, x1 - w / 2 - 2);
                // 名牌默认在气泡上方，太靠顶时翻到下方
                let top = py - rr - gap - h;
                let below = false;
                if (top < y0 + 2) {
                  top = py + rr + gap;
                  below = true;
                }
                // 三角指针 x 跟随气泡中心（收进名牌内避免出框）
                const tip = cap(px, tipX - w / 2 + 10, tipX + w / 2 - 10);
                const seamY = below ? top : top + h;
                const dir = below ? 1 : -1;
                const textX = tipX - w / 2 + 9 + dotW;
                return (
                  <g style={{ pointerEvents: "none" }}>
                    <rect
                      x={tipX - w / 2}
                      y={top}
                      width={w}
                      height={h}
                      rx={8}
                      fill="#ffffff"
                      stroke="#dfe5ec"
                      strokeWidth="0.8"
                      filter="url(#quadTipShadow)"
                    />
                    {/* 指向气泡的小三角 */}
                    <path
                      d={`M ${tip - 5} ${seamY + dir * 0.5} L ${tip + 5} ${seamY + dir * 0.5} L ${tip} ${seamY + dir * 6} Z`}
                      fill="#ffffff"
                      stroke="#dfe5ec"
                      strokeWidth="0.8"
                    />
                    {/* 盖住三角与矩形接缝处的描边线 */}
                    <rect
                      x={tip - 4.5}
                      y={below ? top + h - 0.9 : top - 0.9}
                      width={9}
                      height={1.8}
                      fill="#ffffff"
                    />
                    {/* 第一行：评级色圆点 + 名称 */}
                    <circle
                      cx={tipX - w / 2 + 9 + 2.5}
                      cy={top + 9.5}
                      r={2.5}
                      fill={dotFill}
                    />
                    <text
                      x={textX}
                      y={top + 9.5}
                      fontSize="8"
                      fontWeight="700"
                      fill="#111827"
                      dominantBaseline="middle"
                    >
                      {nameTxt}
                    </text>
                    {/* 第二行：类型化指标 + 评分 */}
                    <text
                      x={textX}
                      y={top + 20}
                      fontSize="7.5"
                      fill="#6b7280"
                      dominantBaseline="middle"
                    >
                      {metaTxt}
                    </text>
                  </g>
                );
              })()}
            <title>{`${it.name} · 近一月采纳数 ${it.adopt30} · 综合分 ${it.score}`}</title>
          </g>
        );
      })}
    </svg>
  );
}
