import Link from "next/link";
import type React from "react";
import { Button } from "@/components/ui/button";

/**
 * 一级页统一页头：标题 + 数据摘要副标题 + 右侧主操作区。
 * description 传统计口径（如「共 24 个 MCP · 其中 3 个待审批」），给页面「信息架构可验证」的锚点。
 */
export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="w-full">
      <div className="mx-auto flex flex-wrap items-end justify-between gap-4 pb-5">
        <div className="space-y-1">
          <h1 className="text-page-title">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
    </header>
  );
}

/**
 * 统一空态：淡底图标 + 标题 + 说明 + 引导动作。
 * 用于收藏空、搜索无结果、列表空等场景——替代一行灰字的「简陋感」重灾区。
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-14 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actionHref && actionLabel && (
        <Button asChild size="sm" variant="outline" className="mt-1">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  );
}
