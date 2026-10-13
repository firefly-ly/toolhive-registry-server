"use client";

import { type ReactNode, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Bdg,
  type Funnel,
  KpiCell,
  MCP,
  SKILL,
  type StatRow,
  type WatchRow,
} from "./dashboard-shared";

const RANGES = [
  { k: 7, label: "近 7 天" },
  { k: 14, label: "近 14 天" },
  { k: 30, label: "近 30 天" },
] as const;

/* 小型筛选按钮（效果图 .btn.sm：1.5px 描边 8px 圆角） */
function BtnSm({
  children,
  dark,
  onClick,
}: {
  children: ReactNode;
  dark?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border-[1.5px] px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
        dark
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-card text-muted-foreground hover:border-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/* 效果图 .kv 行：9px 上下留白 + 发丝下界 */
function Kv({ children, last }: { children: ReactNode; last?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-[9px] text-xs",
        !last && "border-b border-border",
      )}
    >
      {children}
    </div>
  );
}

export function StatsDashboard({
  rows,
  trend,
  funnel,
  watch,
  userRank,
  kpis,
}: {
  rows: StatRow[];
  trend: { days: string[]; mcp: number[]; skill: number[] };
  funnel: Funnel;
  watch: WatchRow[];
  userRank: { name: string; n: number }[];
  kpis: {
    calls: { v: string; sub: string };
    activeUsers: string;
    perUser: string;
    onShelf: number;
    mcpCount: number;
    skillCount: number;
    pending: number;
    oldestPending: string;
    approval: { v: string; sub: string };
    failRate: { v: string; sub: string };
  };
}) {
  const [range, setRange] = useState<number>(14);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"all" | "mcp" | "skill">("all");
  const [sort, setSort] = useState<"calls" | "delta">("calls");

  /* 趋势堆叠柱：按所选区间切片 */
  const sliced = useMemo(() => {
    const n = trend.days.length;
    const from = Math.max(0, n - range);
    return {
      days: trend.days.slice(from),
      mcp: trend.mcp.slice(from),
      skill: trend.skill.slice(from),
    };
  }, [trend, range]);

  const maxDay = Math.max(
    1,
    ...sliced.mcp.map((v, i) => v + (sliced.skill[i] || 0)),
  );
  const barCount = sliced.days.length;
  const labelIdx = Array.from(
    new Set(
      [0, 0.25, 0.5, 0.75, 1].map((f) =>
        Math.round(f * Math.max(0, barCount - 1)),
      ),
    ),
  );

  /* 明细筛选 + 排序 */
  const tableRows = useMemo(() => {
    let l = rows;
    if (type !== "all") l = l.filter((r) => r.type === type);
    const q = query.trim().toLowerCase();
    if (q)
      l = l.filter((r) =>
        [r.name, r.version, r.status.label].join(" ").toLowerCase().includes(q),
      );
    return [...l].sort((a, b) =>
      sort === "calls" ? b.calls14 - a.calls14 : b.delta - a.delta,
    );
  }, [rows, type, query, sort]);

  const totalCalls =
    sliced.mcp.reduce((a, b) => a + b, 0) +
    sliced.skill.reduce((a, b) => a + b, 0);

  /* 总调用 KPI：有埋点数据时随区间实时计算，无数据时回退服务端测试占位 */
  const hasTrend =
    trend.days.length > 0 &&
    (trend.mcp.some((v) => v > 0) || trend.skill.some((v) => v > 0));
  const half = Math.max(1, Math.floor(barCount / 2));
  const recentHalf = [
    ...sliced.mcp.slice(-half),
    ...sliced.skill.slice(-half),
  ].reduce((a, b) => a + b, 0);
  const prevHalf = [
    ...sliced.mcp.slice(-half * 2, -half),
    ...sliced.skill.slice(-half * 2, -half),
  ].reduce((a, b) => a + b, 0);
  const kpiValue = hasTrend ? totalCalls.toLocaleString() : kpis.calls.v;
  const kpiSub = hasTrend
    ? `环比 ${prevHalf > 0 ? `${recentHalf >= prevHalf ? "+" : ""}${Math.round(((recentHalf - prevHalf) / prevHalf) * 100)}%` : "—"}`
    : kpis.calls.sub;

  /* 导出 CSV（条目明细） */
  const exportCsv = () => {
    const head = [
      "条目",
      "类型",
      "版本",
      "状态",
      "调用",
      "环比",
      "失败率",
      "P95",
      "最近调用",
    ];
    const lines = rows.map((r) =>
      [
        r.name,
        r.type.toUpperCase(),
        r.version,
        r.status.label,
        r.calls14,
        `${r.delta >= 0 ? "+" : ""}${r.delta}%`,
        r.failRate,
        r.p95,
        r.lastCall,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([`\uFEFF${[head.join(","), ...lines].join("\n")}`], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "运营台条目明细.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div>
      {/* 页头（效果图 10：标题 + psub + 右侧区间切换/导出） */}
      <div className="flex flex-wrap items-center px-8 pb-[14px] pt-1">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[0.5px]">
            统计 · 运营台
          </h1>
          <p className="mt-1.5 text-[13.5px] text-muted-foreground">
            整体经营状况 + 每个条目的明细 · 数据每 15 分钟刷新
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {RANGES.map((r) => (
            <BtnSm key={r.k} dark={range === r.k} onClick={() => setRange(r.k)}>
              {r.label}
            </BtnSm>
          ))}
          <BtnSm onClick={exportCsv}>导出 CSV</BtnSm>
        </div>
      </div>

      {/* KPI 六格（效果图 10：首格蓝色实色主块，1.5px 发丝分界） */}
      <div className="grid grid-cols-2 border-t-[1.5px] border-border md:grid-cols-3 xl:grid-cols-6">
        <KpiCell
          accent
          label={`总调用（${range} 天）`}
          value={kpiValue}
          sub={kpiSub}
        />
        <KpiCell label="活跃用户" value={kpis.activeUsers} sub={kpis.perUser} />
        <KpiCell
          label="在架条目"
          value={kpis.onShelf}
          sub={`MCP ${kpis.mcpCount} · Skill ${kpis.skillCount}`}
        />
        <KpiCell
          label="待审提交"
          value={kpis.pending}
          sub={`最早积压 ${kpis.oldestPending}`}
          valueColor={kpis.pending > 0 ? "#854F0B" : undefined}
        />
        <KpiCell
          label="平均审批时长"
          value={kpis.approval.v}
          sub={kpis.approval.sub}
        />
        <KpiCell
          label="调用失败率"
          value={kpis.failRate.v}
          sub={kpis.failRate.sub}
          valueColor="#A32D2D"
        />
      </div>

      {/* 趋势 + 漏斗（效果图：左 1.7 右 1，发丝竖分界） */}
      <div className="grid border-t-[1.5px] border-border xl:grid-cols-[1.7fr_1fr]">
        <div className="border-b-[1.5px] border-border p-[22px] xl:border-b-0 xl:border-r-[1.5px]">
          <div className="mb-4 flex items-baseline">
            <h3 className="text-[17px] font-semibold">调用趋势（按类型）</h3>
            <span className="ml-auto flex gap-3.5 text-[12.5px] text-[#9A9A94]">
              <span className="flex items-center gap-[5px]">
                <i
                  className="inline-block size-[9px] rounded-[2px]"
                  style={{ background: MCP }}
                />
                MCP
              </span>
              <span className="flex items-center gap-[5px]">
                <i
                  className="inline-block size-[9px] rounded-[2px]"
                  style={{ background: SKILL }}
                />
                Skill
              </span>
            </span>
          </div>
          <div className="flex h-[150px] items-end gap-2">
            {sliced.days.map((d, i) => {
              const m = (sliced.mcp[i] / maxDay) * 100;
              const s = (sliced.skill[i] / maxDay) * 100;
              return (
                <div
                  key={d}
                  className="flex h-full flex-1 flex-col justify-end gap-0.5"
                  title={`${sliced.days[i]} · MCP ${sliced.mcp[i]} · Skill ${sliced.skill[i]}`}
                >
                  <i
                    className="block rounded-t-[3px]"
                    style={{
                      height: `${Math.max(m, sliced.mcp[i] > 0 ? 3 : 0)}%`,
                      background: MCP,
                    }}
                  />
                  <i
                    className="block rounded-t-[3px]"
                    style={{
                      height: `${Math.max(s, sliced.skill[i] > 0 ? 3 : 0)}%`,
                      background: SKILL,
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex gap-2">
            {labelIdx.map((i) => (
              <span
                key={i}
                className="flex-1 text-center font-mono text-[11.5px] text-[#9A9A94]"
              >
                {i === barCount - 1 ? "今天" : (sliced.days[i] || "").slice(5)}
              </span>
            ))}
          </div>
        </div>

        <div className="p-[22px]">
          <h3 className="mb-4 text-[17px] font-semibold">
            提交漏斗（近 30 天）
          </h3>
          <div className="space-y-3">
            {funnel.stages.map((st) => (
              <div key={st.label} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-[13px] text-muted-foreground">
                  {st.label}
                </span>
                <div className="min-w-0 flex-1">
                  <div
                    className="flex h-7 items-center rounded-md px-3 font-mono text-[12.5px] font-semibold text-white"
                    style={{
                      background: st.bg,
                      width: `${st.width}%`,
                      minWidth: 64,
                    }}
                  >
                    {st.v} 件
                  </div>
                </div>
              </div>
            ))}
          </div>
          {funnel.note && (
            <div className="mt-[18px] rounded-[9px] border-[1.5px] border-dashed border-border p-3 text-[13px] leading-relaxed text-muted-foreground">
              {funnel.note}
            </div>
          )}
        </div>
      </div>

      {/* 条目明细（效果图 10：表头行 + 9 列表格） */}
      <div className="border-t-[1.5px] border-border">
        <div className="flex items-center px-8 pb-2 pt-[22px]">
          <h3 className="text-[17px] font-semibold">
            条目明细（{rows.length} 个在架条目）
          </h3>
          <div className="ml-auto flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索条目…"
              className="h-8 w-44 rounded-lg border-[1.5px] border-border bg-card px-3 text-[13px] outline-none placeholder:text-muted-foreground focus:border-foreground"
            />
            <select
              value={type}
              onChange={(e) =>
                setType(e.target.value as "all" | "mcp" | "skill")
              }
              className="h-8 cursor-pointer rounded-lg border-[1.5px] border-border bg-card px-2.5 text-[13px] font-semibold text-muted-foreground outline-none focus:border-foreground"
            >
              <option value="all">类型：全部</option>
              <option value="mcp">类型：MCP</option>
              <option value="skill">类型：SKILL</option>
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as "calls" | "delta")}
              className="h-8 cursor-pointer rounded-lg border-[1.5px] border-foreground bg-foreground px-2.5 text-[13px] font-semibold text-background outline-none"
            >
              <option value="calls">排序：调用量</option>
              <option value="delta">排序：环比</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto px-8 pb-5">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left text-[12.5px] tracking-[1px] font-semibold text-[#9A9A94]">
                <th className="border-b-[1.5px] border-foreground px-3 py-2.5">
                  条目
                </th>
                <th className="border-b-[1.5px] border-foreground px-3 py-2.5">
                  版本
                </th>
                <th className="border-b-[1.5px] border-foreground px-3 py-2.5">
                  状态
                </th>
                <th className="border-b-[1.5px] border-foreground px-3 py-2.5 text-right">
                  调用（14 天）
                </th>
                <th className="border-b-[1.5px] border-foreground px-3 py-2.5">
                  环比
                </th>
                <th className="border-b-[1.5px] border-foreground px-3 py-2.5">
                  趋势
                </th>
                <th className="border-b-[1.5px] border-foreground px-3 py-2.5 text-right">
                  失败率
                </th>
                <th className="border-b-[1.5px] border-foreground px-3 py-2.5 text-right">
                  P95 延迟
                </th>
                <th className="border-b-[1.5px] border-foreground px-3 py-2.5">
                  最近调用
                </th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r) => (
                <tr key={r.key} className="hover:bg-[#FBFBF7]">
                  <td className="border-b border-border px-3 py-[13px] text-[13.5px]">
                    <a href={r.href} className="font-semibold hover:underline">
                      {r.name}
                    </a>{" "}
                    <Bdg
                      tone={r.type === "mcp" ? "blue" : "ok"}
                      className="ml-1"
                    >
                      {r.type === "mcp" ? "MCP" : "SKILL"}
                    </Bdg>
                  </td>
                  <td className="border-b border-border px-3 py-[13px] font-mono text-[13.5px]">
                    {r.version}
                  </td>
                  <td className="border-b border-border px-3 py-[13px]">
                    <Bdg
                      tone={r.status.tone}
                      dot={r.type === "mcp" && r.status.tone !== "mut"}
                    >
                      {r.status.label}
                    </Bdg>
                  </td>
                  <td className="border-b border-border px-3 py-[13px] text-right font-mono text-[13.5px] font-bold">
                    {r.calls14.toLocaleString()}
                  </td>
                  <td className="border-b border-border px-3 py-[13px]">
                    <Bdg tone={r.delta >= 0 ? "ok" : "err"}>
                      {r.delta >= 0 ? "+" : ""}
                      {r.delta}%
                    </Bdg>
                  </td>
                  <td className="border-b border-border px-3 py-[13px]">
                    <span className="inline-flex h-4 items-end gap-0.5">
                      {r.spark
                        .map((v, idx) => ({ v, idx }))
                        .map(({ v, idx }) => (
                          <i
                            key={`spark-${r.key}-${idx}`}
                            className="block w-1 rounded-[1px]"
                            style={{
                              height: `${v}%`,
                              minHeight: 2,
                              background:
                                r.status.tone === "err" &&
                                idx === r.spark.length - 1
                                  ? "#F09595"
                                  : r.status.tone === "mut"
                                    ? "#D3D1C7"
                                    : r.type === "mcp"
                                      ? MCP
                                      : SKILL,
                            }}
                          />
                        ))}
                    </span>
                  </td>
                  <td className="border-b border-border px-3 py-[13px] text-right font-mono text-[13.5px]">
                    {r.failRate}
                  </td>
                  <td className="border-b border-border px-3 py-[13px] text-right font-mono text-[13.5px]">
                    {r.p95}
                  </td>
                  <td className="border-b border-border px-3 py-[13px] font-mono text-[13.5px] text-[#9A9A94]">
                    {r.lastCall}
                  </td>
                </tr>
              ))}
              {tableRows.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-3 py-10 text-center text-sm text-muted-foreground"
                  >
                    没有匹配的条目
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 用户排行 + 需要关注（效果图 10 底部 1:1 双栏） */}
      <div className="grid border-t-[1.5px] border-border xl:grid-cols-2">
        <div className="border-b-[1.5px] border-border px-8 py-5 xl:border-b-0 xl:border-r-[1.5px]">
          <h3 className="mb-3 text-[17px] font-semibold">活跃用户排行</h3>
          {userRank.map((u, i) => (
            <Kv key={u.name} last={i === userRank.length - 1}>
              <span className="flex items-center gap-[9px]">
                <i
                  className="w-4 font-mono text-[12.5px] font-semibold not-italic"
                  style={{ color: i === 0 ? "#854F0B" : "#9A9A94" }}
                >
                  {i + 1}
                </i>
                {u.name}
              </span>
              <span className="font-mono font-semibold">{u.n} 次</span>
            </Kv>
          ))}
        </div>
        <div className="px-8 py-5">
          <h3 className="mb-3 text-[17px] font-semibold">需要关注</h3>
          {watch.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              暂无需要关注的条目
            </p>
          ) : (
            watch.map((w) => (
              <Kv
                key={`${w.label}|${w.badge}`}
                last={w === watch[watch.length - 1]}
              >
                <span className="min-w-0 truncate">
                  {w.href ? (
                    <a href={w.href} className="hover:underline">
                      {w.label}
                    </a>
                  ) : (
                    w.label
                  )}
                </span>
                <Bdg tone={w.tone} className="ml-3 shrink-0">
                  {w.badge}
                </Bdg>
              </Kv>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
