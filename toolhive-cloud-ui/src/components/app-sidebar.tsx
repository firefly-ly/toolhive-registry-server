"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { isNavItemActive, type NavItem, navItemsFor } from "@/lib/nav-items";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  isAdmin: boolean;
  collapsed: boolean;
  onToggle: () => void;
}

function SidebarNavLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-9 items-center rounded-md text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        collapsed ? "w-full justify-center" : "px-2.5",
        active
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span className="ml-2.5 truncate">{item.label}</span>}
    </Link>
  );

  // 收缩态：icon-only，悬停出右侧 Tooltip（ui/tooltip 的 Tooltip 自带 Provider，无需外包）
  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * 桌面固定左栏（md 以上显示；移动端走 MobileNav 抽屉）。
 * 自绘轻量实现，刻意不用 ui/sidebar.tsx 的 shadcn kit——
 * AssistantLayout 的共享 SidebarProvider 同时服务助手右侧栏，
 * 插入第二个 kit 侧栏会让两侧折叠状态联动，故此处与其完全解耦。
 * 宽度/颜色全部走设计令牌：阶段 3 换血只改 CSS 变量，不动结构。
 */
export function AppSidebar({ isAdmin, collapsed, onToggle }: AppSidebarProps) {
  const pathname = usePathname();
  const items = navItemsFor(isAdmin);

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex",
        "transition-[width] duration-200 ease-in-out",
        collapsed ? "w-14" : "w-60",
      )}
    >
      {/* 品牌区：与右侧深色顶栏同高（h-16），底边框连成一条线 */}
      <Link
        href="/catalog"
        aria-label="ToolHive 首页"
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-sidebar-border",
          collapsed ? "justify-center" : "px-4",
        )}
      >
        <BrandMark className="size-6 shrink-0" />
        {!collapsed && (
          <span className="ml-2.5 text-[15px] font-semibold tracking-tight">
            ToolHive
          </span>
        )}
      </Link>

      {/* 导航区 */}
      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2">
        {items.map((item) => (
          <SidebarNavLink
            key={item.href}
            item={item}
            active={isNavItemActive(pathname, item.href)}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* 折叠开关 */}
      <div className="shrink-0 border-t border-sidebar-border p-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onToggle}
              aria-label={collapsed ? "展开侧栏" : "收起侧栏"}
              className={cn(
                "flex h-9 w-full items-center rounded-md text-sidebar-foreground/70 outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                collapsed ? "justify-center" : "px-2.5",
              )}
            >
              {collapsed ? (
                <PanelLeftOpen className="size-4 shrink-0" />
              ) : (
                <PanelLeftClose className="size-4 shrink-0" />
              )}
              {!collapsed && <span className="ml-2.5 text-sm">收起侧栏</span>}
            </button>
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right">展开侧栏</TooltipContent>}
        </Tooltip>
      </div>
    </aside>
  );
}
