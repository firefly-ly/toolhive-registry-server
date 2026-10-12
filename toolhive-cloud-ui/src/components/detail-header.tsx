import type { ReactNode } from "react";
import { NavigateBackButton } from "@/components/navigate-back-button";

interface DetailHeaderProps {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle?: ReactNode;
  badges?: ReactNode;
  /** 标题行右侧的额外操作（如版本下拉、收藏、复制等）。 */
  actions?: ReactNode;
}

export function DetailHeader({
  backHref,
  backLabel,
  title,
  subtitle,
  badges,
  actions,
}: DetailHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* 返回入口：紧凑胶囊贴左，与面包屑同一视觉层级，不再撑满整行 */}
      <div className="flex items-center justify-between gap-3">
        <NavigateBackButton href={backHref} label={backLabel} size="sm" />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-page-title m-0 p-0">{title}</h1>
          {actions && (
            <div className="flex shrink-0 items-center gap-2 pt-1">
              {actions}
            </div>
          )}
        </div>
        {subtitle && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            {subtitle}
          </div>
        )}
        {badges && (
          <div className="flex flex-wrap items-center gap-2">{badges}</div>
        )}
      </div>
    </div>
  );
}
