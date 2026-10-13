"use client";

import { Star } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/header-page";
import { Button } from "@/components/ui/button";
import { toggleFavoriteAction } from "@/lib/platform-actions";
import { cn } from "@/lib/utils";

export interface FavRow {
  item_type: "mcp" | "skill";
  item_ref: string;
  title: string;
  /** 热度指标：MCP 显示调用次数，Skill 显示下载次数；无数据为空串 */
  metric: string;
  description: string;
  href: string;
}

export interface ActivityEntry {
  date: string;
  text: string;
  count: number;
}

/**
 * 工作台（效果图 02 逐像素版）：
 * 左 1.7 栏「我的收藏」黑框磁贴（右上类型徽章带圆点、底行 mono 最近使用 + 黑色进入钮、
 * 右下类型色角饰），右栏「使用动态」时间线（事件色圆点）+ 虚线快捷入口框；
 * 两栏由 1.5px 发丝线分隔。
 */
export function FavsBlock({
  count,
  rows,
  activity = [],
}: {
  /** 兼容旧签名的标题参数（页头已展示，块内不再重复） */
  title?: string;
  count: number;
  rows: FavRow[];
  activity?: ActivityEntry[];
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Star}
        title="还没有收藏"
        description="在目录里点星标收藏，常用的条目会集中在这里。"
        actionHref="/catalog"
        actionLabel="去目录逛逛"
      />
    );
  }

  return (
    <div className="flex flex-col lg:flex-row lg:border-t-[1.5px] border-border">
      {/* 左 1.7 栏：我的收藏磁贴 */}
      <div className="min-w-0 py-6 lg:flex-[1.7] lg:border-r-[1.5px] lg:border-border lg:pr-8">
        <div className="mb-4 flex items-baseline">
          <h3 className="text-base font-semibold">我的收藏</h3>
          <span className="ml-2.5 text-[12.5px] text-muted-foreground">
            {count} 件
          </span>
          <Link
            href="/catalog"
            className="ml-auto text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            管理收藏 →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
          {rows.map((r) => {
            const unfav = toggleFavoriteAction.bind(
              null,
              r.item_type,
              r.item_ref,
              true,
            );
            const isMcp = r.item_type === "mcp";
            return (
              <div
                key={`${r.item_type}-${r.item_ref}`}
                className="group relative overflow-hidden rounded-[10px] border-[1.5px] border-foreground bg-card p-4 pt-5"
              >
                {/* 右上类型徽章（带圆点，效果图 .bdg 规格） */}
                <span
                  className={cn(
                    "absolute top-3 right-3.5 inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[12.5px]",
                    isMcp
                      ? "border-info/40 bg-info/10 text-info"
                      : "border-success/40 bg-success/10 text-success",
                  )}
                >
                  <span className="size-1.5 rounded-full bg-current" />
                  {isMcp ? "MCP" : "SKILL"}
                </span>
                {/* 右下类型色角饰 */}
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute right-0 bottom-0",
                    isMcp
                      ? "size-10 rounded-tl-full bg-info/10"
                      : "h-5 w-10 rounded-t-full bg-success/10",
                  )}
                />

                <b className="text-sm font-bold" title={r.title}>
                  <span className="line-clamp-1">{r.title}</span>
                </b>
                <p className="mt-1.5 line-clamp-1 text-[13px] leading-relaxed text-muted-foreground">
                  {r.description || "暂无描述"}
                </p>

                <div className="mt-3.5 flex items-center text-[12.5px] text-muted-foreground">
                  <span className="font-mono">
                    {r.metric || "暂无使用记录"}
                  </span>
                  <span className="ml-auto flex shrink-0 items-center gap-1">
                    {/* biome-ignore lint/a11y/useKeyWithClickEvents: 仅阻止点击冒泡，非交互容器 */}
                    <form action={unfav} onClick={(e) => e.stopPropagation()}>
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label="取消收藏"
                        title="取消收藏"
                      >
                        <Star className="size-3.5 fill-star text-star" />
                      </Button>
                    </form>
                    {r.href && (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-7 rounded-lg bg-foreground px-3.5 text-[13px] font-semibold text-background hover:bg-foreground/85 hover:text-background"
                      >
                        <Link href={r.href}>进入</Link>
                      </Button>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 右栏：使用动态时间线 + 快捷入口 */}
      <div className="min-w-0 py-6 lg:flex-1 lg:pl-8">
        <h3 className="text-base font-semibold">使用动态</h3>
        {activity.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-1.5 rounded-[10px] border-[1.5px] border-dashed border-border py-10 text-center">
            <p className="text-sm font-semibold">近两周没有使用记录</p>
            <p className="text-xs text-muted-foreground">
              从磁贴进入调用后，动态会出现在这里
            </p>
          </div>
        ) : (
          <div className="mt-2">
            {activity.map((a, i) => {
              const tone = a.text.includes("下载")
                ? "bg-highlight"
                : a.text.includes("调用")
                  ? "bg-success"
                  : "bg-muted-foreground/40";
              return (
                <div
                  key={`${a.date}-${a.text}-${i}`}
                  className="flex items-start gap-3 border-b border-border py-3 last:border-b-0"
                >
                  <span
                    className={cn("mt-1 size-2.5 shrink-0 rounded-full", tone)}
                  />
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold">{a.text}</p>
                    <p className="mt-0.5 font-mono text-[12.5px] text-muted-foreground">
                      {a.date}
                      {a.count > 1 ? ` · ${a.count} 次` : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 快捷入口（虚线框，效果图 02） */}
        <div className="mt-5 rounded-[10px] border-[1.5px] border-dashed border-border p-4 text-center">
          <p className="text-xs font-semibold">快捷入口</p>
          <div className="mt-2.5 flex justify-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-7 rounded-lg bg-foreground px-3.5 text-[13px] font-semibold text-background hover:bg-foreground/85 hover:text-background"
            >
              <Link href="/submissions">提交新工具</Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-7 rounded-lg border-[1.5px] border-border bg-card px-3.5 text-[13px] font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            >
              <Link href="/catalog">浏览目录</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
