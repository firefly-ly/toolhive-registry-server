// approve-dialog/shared.tsx —— 审批弹窗共享工具与类型（自检整改重构③ 自主文件拆出）。
"use client";

import { cn } from "@/lib/utils";

export function parseMeta(meta?: string): Record<string, unknown> {
  try {
    return meta ? (JSON.parse(meta) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

// 公网目标判定：私网/回环/本地域名返回 false，公网 IPv4 与域名返回 true（审批页标红）。
// 域名无法静态判定解析范围，保守按公网处理，交由审批人人工确认。
export function isPublicTarget(t: string): boolean {
  const host = t.replace(/:\d+$/, "").trim().toLowerCase();
  if (!host) return false;
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return false;
  }
  if (/^127\./.test(host)) return false;
  if (/^10\./.test(host)) return false;
  if (/^192\.168\./.test(host)) return false;
  const m = host.match(/^172\.(\d+)\./);
  if (m) {
    const n = Number(m[1]);
    return !(n >= 16 && n <= 31);
  }
  return true;
}

export type ScanStatus =
  | "clean"
  | "warn"
  | "critical"
  | "alert"
  | "error"
  | "skipped"
  | "scanning";

export interface TrivyResult {
  status: ScanStatus;
  critical?: number;
  high?: number;
  secrets?: number;
  summary?: { id: string; severity: string; pkg: string }[];
  scanned_at?: string;
  error?: string;
}

export interface PromptScanResult {
  status: ScanStatus;
  total?: number;
  hits?: {
    rule_id: string;
    category: string;
    severity: string;
    file: string;
    line: number;
    excerpt: string;
  }[];
  scanned_at?: string;
  error?: string;
}

export interface DataSourceDecl {
  type?: string;
  targets?: string[];
  note?: string;
}

export function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 审批弹窗信息字段（label 上、值下，等宽可选） */
export function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 break-words",
          mono ? "font-mono text-sm" : "text-base",
        )}
      >
        {value ?? "—"}
      </p>
    </div>
  );
}
