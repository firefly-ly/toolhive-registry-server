"use client";

import { useCallback, useEffect, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { CommandPalette } from "@/components/command-palette";
import { NavBreadcrumb } from "@/components/nav-breadcrumb";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "app-sidebar-collapsed";

interface AppShellProps {
  isAdmin: boolean;
  navbar: React.ReactNode;
  children: React.ReactNode;
}

/**
 * 应用外壳：固定左栏（AppSidebar）+ 右列（顶栏 + 内容区）。
 * 折叠态持久化到 localStorage；挂载后再读取以避免 SSR 水合不一致
 * （代价是折叠用户首帧可能看到一次展开态回缩，内部工具可接受）。
 * 结构色全部走令牌（bg-sidebar / text-primary 等），阶段 3 换血只改变量值。
 */
export function AppShell({ isAdmin, navbar, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "1") {
        setCollapsed(true);
      }
    } catch {
      // localStorage 不可用（隐私模式等）：保持默认展开
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // 持久化失败降级为会话内状态
      }
      return next;
    });
  }, []);

  return (
    <div className="h-screen w-full">
      <AppSidebar
        isAdmin={isAdmin}
        collapsed={collapsed}
        onToggle={toggleCollapsed}
      />

      {/* ⌘K 全局命令面板：导航跳转与侧栏操作 */}
      <CommandPalette
        isAdmin={isAdmin}
        collapsed={collapsed}
        onToggleSidebar={toggleCollapsed}
      />

      {/* 右列：侧栏宽度的 padding 承接（<md 无侧栏，全宽） */}
      <div
        className={cn(
          "flex h-full flex-col transition-[padding-left] duration-200 ease-in-out",
          collapsed ? "md:pl-14" : "md:pl-60",
        )}
      >
        {navbar}

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-sidebar px-8 pt-6 pb-5 dark:bg-background">
          {/* 内容收宽居中：超宽屏下行长可控，深色顶栏/浅色侧栏仍全宽铺满 */}
          <div className="mx-auto flex h-full min-h-0 w-full max-w-[1400px] flex-col">
            {/* 面包屑自带 mb-3，一级页返回 null 时零占位 */}
            <NavBreadcrumb />
            {/* 子页面根节点有两种口径（h-full / flex-1），双层 flex 保证两者都占满剩余高度 */}
            <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
