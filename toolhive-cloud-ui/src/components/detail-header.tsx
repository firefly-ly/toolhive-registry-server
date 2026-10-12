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
  /** 包豪斯几何品牌位：mcp=蓝色拱形（琥珀圆点）、skill=绿色圆（琥珀山形） */
  mark?: "mcp" | "skill";
}

function DetailMark({ mark }: { mark: "mcp" | "skill" }) {
  if (mark === "mcp") {
    return (
      <span
        aria-hidden
        className="relative inline-block h-12 w-12 shrink-0 rounded-t-full bg-info"
      >
        <i className="bg-highlight absolute top-6 left-4 size-4 rounded-full" />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className="bg-success relative inline-block size-12 shrink-0 rounded-full"
    >
      <i
        className="bg-highlight absolute bottom-2 left-1/2 h-3 w-6 -translate-x-1/2"
        style={{ clipPath: "polygon(0 100%, 50% 0, 100% 100%)" }}
      />
    </span>
  );
}

export function DetailHeader({
  backHref,
  backLabel,
  title,
  subtitle,
  badges,
  actions,
  mark,
}: DetailHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* 返回入口：紧凑胶囊贴左，与面包屑同一视觉层级，不再撑满整行 */}
      <div className="flex items-center justify-between gap-3">
        <NavigateBackButton href={backHref} label={backLabel} size="sm" />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            {mark && <DetailMark mark={mark} />}
            <h1 className="text-page-title m-0 truncate p-0">{title}</h1>
          </div>
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
