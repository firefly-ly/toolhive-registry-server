import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface NavTabItem {
  key: string;
  label: string;
  href: string;
  /** 可选计数：展示为标签内小徽章（如待审数、历史条数） */
  count?: number;
  icon?: LucideIcon;
}

/**
 * 页级导航 Tab（下划线式）：图标 + 文案 + 计数徽章。
 * 包豪斯纪律：选中脊/图标/计数全部走结构黑（实心黑=结构与选中，
 * 品牌强调色不进导航层级）。
 */
export function NavTabs({
  tabs,
  activeKey,
  className,
}: {
  tabs: NavTabItem[];
  activeKey: string;
  className?: string;
}) {
  return (
    <nav
      aria-label="页面导航"
      className={cn("flex items-center gap-7 border-b", className)}
    >
      {tabs.map((t) => {
        const active = t.key === activeKey;
        const Icon = t.icon;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-1.5 pt-1 pb-2.5 text-sm transition-colors",
              active
                ? "font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {Icon && (
              <Icon
                className={cn(
                  "size-4 transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground/70 group-hover:text-muted-foreground",
                )}
              />
            )}
            {t.label}
            {typeof t.count === "number" && (
              <span
                className={cn(
                  "ml-0.5 rounded-full px-1.5 py-0.5 text-xs leading-none",
                  active
                    ? "bg-foreground/10 font-medium text-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {t.count}
              </span>
            )}
            <span
              className={cn(
                "absolute inset-x-0 -bottom-px h-0.5 rounded-full transition-colors",
                active ? "bg-foreground" : "bg-transparent",
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
