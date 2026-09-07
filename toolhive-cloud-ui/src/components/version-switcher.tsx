"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

export interface VersionOption {
  id: string;
  label: string; // e.g. v1.0.1
  active?: boolean;
}

interface VersionSwitcherProps {
  basePath: // 'mcp' | 'skills'
  | "mcp"
    | "skills";
  groupLabel: string;
  currentId: string;
  options: VersionOption[];
  from?: string;
  /** compact: 仅 select+箭头（用于卡片内嵌）；默认带「版本」标签和外层边框（用于详情页） */
  variant?: "default" | "compact";
  /** 卡片场景：阻止冒泡到卡片自身的 onClick */
  stopPropagation?: boolean;
}

/**
 * 版本切换下拉：仅当有多个版本时显示。切换后跳转到对应版本的自有路径，
 * 详情页按新版本 id 重新拉取该版本的描述/调用/下载等信息。
 */
export function VersionSwitcher({
  basePath,
  groupLabel,
  currentId,
  options,
  from,
  variant = "default",
  stopPropagation = false,
}: VersionSwitcherProps) {
  const router = useRouter();
  if (options.length <= 1) return null;
  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    const q = from ? `?from=${encodeURIComponent(from)}` : "";
    router.push(`/${basePath}/${encodeURIComponent(v)}${q}`);
  };
  const onClick = (e: React.MouseEvent<HTMLElement>) => {
    if (stopPropagation) e.stopPropagation();
  };
  if (variant === "compact") {
    return (
      <div
        className="relative"
        onClick={onClick}
        title={`切换 ${groupLabel} 的版本`}
      >
        <select
          aria-label={`切换 ${groupLabel} 的版本`}
          value={currentId}
          onChange={onChange}
          onClick={onClick}
          className="cursor-pointer appearance-none rounded-md border border-slate-200 bg-background py-1 pl-2.5 pr-7 text-base font-medium outline-none hover:border-slate-400 dark:border-slate-700"
        >
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-card px-2.5 py-1.5 dark:border-slate-700">
      <span className="text-xs text-muted-foreground">版本</span>
      <div className="relative">
        <select
          aria-label="选择版本"
          value={currentId}
          onChange={onChange}
          className="cursor-pointer appearance-none rounded-md border border-slate-200 bg-transparent py-1 pl-2 pr-6 text-sm font-medium outline-none dark:border-slate-700"
        >
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      </div>
      <span className="sr-only">{groupLabel}</span>
    </div>
  );
}
