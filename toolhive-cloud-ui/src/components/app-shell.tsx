"use client";

import { CommandPalette } from "@/components/command-palette";
import { NavBreadcrumb } from "@/components/nav-breadcrumb";

interface AppShellProps {
  isAdmin: boolean;
  navbar: React.ReactNode;
  children: React.ReactNode;
}

/**
 * 应用外壳（包豪斯版）：浅灰幕布（--background）上浮一张 2px 结构黑描边白纸
 *（效果图的 .wrap：border 2px #1A1A1A + 4px 圆角），顶栏与内容区都框在纸内；
 * 纸底压一条黑色 tokens 条（效果图的 .tokens），全站黑框质感由此锚定。
 * 原固定侧栏已移除（2026-10 全站重设计，IA 收敛为顶栏四项）。
 */
export function AppShell({ isAdmin, navbar, children }: AppShellProps) {
  return (
    <div className="bg-background flex h-screen w-full flex-col overflow-hidden p-3">
      {/* ⌘K 全局命令面板：导航跳转与常用操作 */}
      <CommandPalette isAdmin={isAdmin} />

      {/* 页级白纸：2px 结构黑描边 + 4px 圆角（效果图 .wrap 同款） */}
      <div className="bg-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-[4px] border-2 border-foreground">
        {navbar}

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-8 pt-6 pb-5">
          {/* 内容收宽居中：超宽屏下行长可控 */}
          <div className="mx-auto flex h-full min-h-0 w-full max-w-[1800px] flex-col">
            {/* 面包屑自带 mb-3，一级页返回 null 时零占位 */}
            <NavBreadcrumb />
            {/* 子页面根节点有两种口径（h-full / flex-1），双层 flex 保证两者都占满剩余高度 */}
            <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          </div>
        </main>

        {/* 底部黑色 tokens 条（效果图 .tokens：黑底白字结构收边） */}
        <footer className="flex shrink-0 items-center justify-between border-t-2 border-foreground bg-foreground px-8 py-2.5 text-xs text-background/85">
          <span className="tracking-wide">
            能力中枢 · MCP 与 Skill 统一目录
          </span>
          <span className="font-mono tracking-wide">
            安全扫描 · 按权限即插即用
          </span>
        </footer>
      </div>
    </div>
  );
}
