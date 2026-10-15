// approve-dialog/ScanBadge.tsx —— 扫描三态徽章（绿=clean/低危，黄=warn/等待，红=critical/alert/扫描失败，灰=skipped）。
// 导出供管理页「指挥台」档案摘要复用（同一套状态→文案口径）。
"use client";

import { Badge } from "@/components/ui/badge";
import type { ScanStatus } from "./shared";

export function ScanBadge({
  label,
  status,
  extra,
}: {
  label: string;
  status?: ScanStatus;
  extra?: string;
}) {
  const s = status ?? "skipped";
  // 色彩语义对齐全站纪律：绿=通过、琥珀=有提示、红=需人工/失败、灰=未扫描。
  // clean 不用 default（实心品牌红）——「红=通过」与「红=危险」语义冲突。
  const { variant, className, text } =
    s === "clean"
      ? {
          variant: "outline" as const,
          className: "border-success/40 bg-success/10 text-success",
          text: "通过",
        }
      : s === "warn"
        ? {
            variant: "outline" as const,
            className: "border-warning/40 bg-warning/10 text-warning",
            text: "有提示",
          }
        : s === "critical" || s === "alert"
          ? {
              variant: "destructive" as const,
              className: "",
              text: "需人工确认",
            }
          : s === "error"
            ? {
                variant: "destructive" as const,
                className: "",
                text: "扫描失败",
              }
            : s === "scanning"
              ? { variant: "outline" as const, className: "", text: "扫描中" }
              : {
                  variant: "secondary" as const,
                  className: "",
                  text: "未扫描",
                };
  return (
    <span className="flex items-center gap-1.5">
      <Badge
        variant={variant}
        className={className}
      >{`${label}: ${text}`}</Badge>
      {extra && <span className="text-xs text-muted-foreground">{extra}</span>}
    </span>
  );
}
