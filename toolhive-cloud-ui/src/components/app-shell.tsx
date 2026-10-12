"use client";

import { CommandPalette } from "@/components/command-palette";
import { NavBreadcrumb } from "@/components/nav-breadcrumb";

interface AppShellProps {
  isAdmin: boolean;
  navbar: React.ReactNode;
  children: React.ReactNode;
}

/**
 * 应用外壳（包豪斯版）：上下结构——顶栏（导航唯一位）+ 白纸内容区，
 * body 为浅灰幕布（--background），内容区与顶栏同为白纸（--card）。
 * 原固定侧栏已移除（2026-10 全站重设计，IA 收敛为顶栏四项）。
 */
export function AppShell({ isAdmin, navbar, children }: AppShellProps) {
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      {/* ⌘K 全局命令面板：导航跳转与常用操作 */}
      <CommandPalette isAdmin={isAdmin} />

      {navbar}

      <main className="bg-card flex min-h-0 flex-1 flex-col overflow-hidden px-8 pt-6 pb-5">
        {/* 内容收宽居中：超宽屏下行长可控 */}
        <div className="mx-auto flex h-full min-h-0 w-full max-w-[1800px] flex-col">
          {/* 面包屑自带 mb-3，一级页返回 null 时零占位 */}
          <NavBreadcrumb />
          {/* 子页面根节点有两种口径（h-full / flex-1），双层 flex 保证两者都占满剩余高度 */}
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </div>
      </main>
    </div>
  );
}
