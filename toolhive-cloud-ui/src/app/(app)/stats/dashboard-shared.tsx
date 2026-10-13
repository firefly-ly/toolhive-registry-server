"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const MCP = "#185FA5";
export const SKILL = "#639922";

export type Tone = "ok" | "warn" | "err" | "mut" | "blue";

/** 效果图 .bdg 徽章：11px、5px 圆角、1px 描边、可选圆点 */
const TONE_CLS: Record<Tone, string> = {
  ok: "border-[#97C459] bg-[#EAF3DE] text-[#3B6D11]",
  warn: "border-[#EF9F27] bg-[#FAEEDA] text-[#854F0B]",
  err: "border-[#F09595] bg-[#FCEBEB] text-[#A32D2D]",
  mut: "border-[#D3D1C7] bg-[#F1EFE8] text-[#5F5E5A]",
  blue: "border-[#85B7EB] bg-[#E6F1FB] text-[#0C447C]",
};

export function Bdg({
  tone,
  dot,
  children,
  className,
}: {
  tone: Tone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 whitespace-nowrap rounded-[7px] border px-3 py-1 text-[14px]",
        TONE_CLS[tone],
        className,
      )}
    >
      {dot && <span className="size-2 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/** 类型徽章：MCP 蓝 / SKILL 绿（效果图条目明细、已发布管理表头） */
export function TypeBdg({ t }: { t: "mcp" | "skill" }) {
  return (
    <Bdg tone={t === "mcp" ? "blue" : "ok"}>
      {t === "mcp" ? "MCP" : "SKILL"}
    </Bdg>
  );
}

/** 效果图 KPI 格（字号放大适配版）：20/24 内边距、12px 标签、26px mono 数值、11.5px mono 副行 */
export function KpiCell({
  label,
  value,
  sub,
  accent,
  valueColor,
  delay = 0,
}: {
  label: string;
  value: string | number;
  sub?: string;
  /** 首格包豪斯蓝实色块（白字、黑描边右界） */
  accent?: boolean;
  valueColor?: string;
  /** 入场延迟（秒）：KPI 行错落上浮 */
  delay?: number;
}) {
  return (
    <div
      className={cn(
        "anim-pop px-7 py-6",
        accent
          ? "border-r-[1.5px] border-foreground bg-[#185FA5] text-white"
          : "border-r-[1.5px] border-border last:border-r-0",
      )}
      style={{ animationDelay: `${delay}s` }}
    >
      <div
        className={cn(
          "text-[13.5px]",
          accent ? "opacity-75" : "text-[#9A9A94]",
        )}
      >
        {label}
      </div>
      <div
        className="mt-1.5 font-mono text-[28px] font-semibold leading-none"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </div>
      {sub && (
        <div
          className={cn(
            "mt-1 font-mono text-[12.5px]",
            accent ? "opacity-60" : "text-[#9A9A94]",
          )}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

/** 效果图条目明细行 */
export interface StatRow {
  key: string;
  type: "mcp" | "skill";
  name: string;
  version: string;
  status: { label: string; tone: Tone };
  /** 近 14 天调用/下载量 */
  calls14: number;
  /** 环比（近 7 天 vs 前 7 天，%） */
  delta: number;
  /** 近 5 天迷你趋势（已归一化 0–100） */
  spark: number[];
  failRate: string;
  p95: string;
  lastCall: string;
  href: string;
}

/** 提交漏斗（效果图 10 四段：提交→审核通过→配置上线→部署成功） */
export interface Funnel {
  stages: { label: string; v: number; bg: string; width: number }[];
  note?: string;
}

/** 需要关注行 */
export interface WatchRow {
  label: string;
  badge: string;
  tone: Tone;
  href?: string;
}
