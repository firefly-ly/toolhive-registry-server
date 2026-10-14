"use client";

import { Star } from "lucide-react";
import { CardCornerDeco, CardTypeTab, McpGlyph } from "@/components/type-glyph";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { V0ServerJson } from "@/generated/types.gen";
import { toggleFavoriteAction } from "@/lib/platform-actions";
import { isVirtualMCPServer } from "@/lib/utils";

interface ServerCardProps {
  server: V0ServerJson;
  favorited?: boolean;
  callCount?: number;
  onClick?: () => void;
  /** grid=紧凑竖排（色带横幅）；list=横向单列（左脊 + 信息三栏） */
  layout?: "grid" | "list";
}

/**
 * Registry 上游 MCP 卡片（变体 B「色带横幅」）：
 * 卡顶一条 info 色横幅装符号 + 名称，下方白底描述与元信息行。
 * 列表视图换横向形态：6px 类型色左脊，标题行/描述/元信息顶格，操作列贴右。
 * 接入入口统一收口到详情页（2026-10-14 拍板移除列表卡接入钮）：
 * registry 数据链无凭证字段，受限条目从这里复制出的配置必然 403。
 */
export function ServerCard({
  server,
  favorited = false,
  callCount = 0,
  onClick,
  layout = "grid",
}: ServerCardProps) {
  const { name, description, repository } = server;
  const author = repository?.id;
  const isVirtualMCP = isVirtualMCPServer(server);
  const itemRef = name ?? "";

  const toggleFav = toggleFavoriteAction.bind(null, "mcp", itemRef, favorited);

  const starButton = (
    /* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation 阻止冒泡是刻意行为，星标按钮自身键盘可达 */
    <form action={toggleFav} onClick={(e) => e.stopPropagation()}>
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label={favorited ? "取消收藏" : "收藏"}
        title={favorited ? "取消收藏" : "收藏"}
      >
        <Star
          className={
            favorited
              ? "h-4 w-4 fill-star text-star animate-[star-pop_320ms_ease-out]"
              : "h-4 w-4 text-muted-foreground"
          }
        />
      </Button>
    </form>
  );

  if (layout === "list") {
    return (
      /* biome-ignore lint/a11y/useSemanticElements: 卡片整体为点击区且内部含真实按钮，嵌套 button 非法 */
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (onClick && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onClick();
          }
        }}
        className="card-hover flex w-full cursor-pointer items-stretch overflow-hidden rounded-xl border bg-card transition-colors"
        onClick={onClick ? () => onClick() : undefined}
      >
        {/* 类型色左脊 */}
        <span aria-hidden className="w-1.5 shrink-0 bg-info" />
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-3.5 pl-5 pr-4">
          <div className="flex items-center gap-2">
            <McpGlyph size={14} />
            <span
              className="min-w-0 truncate text-sm font-medium"
              title={server.title ?? name}
            >
              {server.title ?? name}
            </span>
            {server.version && (
              <span className="shrink-0 rounded-md bg-info/10 px-2 py-0.5 text-xs text-info">
                v{server.version}
              </span>
            )}
            {isVirtualMCP && (
              <Badge variant="secondary" className="shrink-0 text-xs">
                Virtual MCP
              </Badge>
            )}
          </div>
          <p className="line-clamp-1 text-sm leading-snug text-muted-foreground">
            {description || "暂无描述"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {callCount} 次调用
            {author ? ` · ${author}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 px-5">
          {starButton}
          <Button
            type="button"
            size="sm"
            className="bg-info text-white hover:bg-info/90"
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
          >
            查看
          </Button>
        </div>
      </div>
    );
  }

  return (
    /* biome-ignore lint/a11y/useSemanticElements: 卡片整体为点击区且内部含真实按钮，嵌套 button 非法 */
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className="group relative flex h-full w-full cursor-pointer flex-col overflow-hidden bg-card px-6 pt-9 pb-5 transition-[background,transform] duration-150 [border-bottom-width:1.5px] [border-right-width:1.5px] border-border hover:-translate-y-[3px] hover:bg-muted/40"
      onClick={onClick ? () => onClick() : undefined}
    >
      {/* 效果图 01：类型垂片 + 右下几何角饰（无缝拼贴单元格，边框由单元格自带） */}
      <CardTypeTab type="mcp" />
      <CardCornerDeco type="mcp" />

      <div className="relative z-10 flex flex-1 flex-col">
        <div className="flex items-center gap-2">
          <span
            className="min-w-0 flex-1 truncate text-[18px] font-semibold transition-transform duration-200 group-hover:translate-x-[3px]"
            title={server.title ?? name}
          >
            {server.title ?? name}
          </span>
          {isVirtualMCP && (
            <Badge
              variant="secondary"
              className="shrink-0 text-xs font-semibold leading-4"
            >
              Virtual MCP
            </Badge>
          )}
        </div>
        <p className="mt-2 line-clamp-2 max-w-[92%] min-h-11 text-[14.5px] leading-[1.7] text-muted-foreground">
          {description || "暂无描述"}
        </p>

        <div className="mt-auto flex items-center pt-4">
          <span className="shrink-0 font-mono text-[14px] text-muted-foreground">
            {server.version ? `v${server.version}` : ""}
          </span>
          <span className="ml-2.5 shrink-0 text-[14px] text-muted-foreground">
            {callCount} 次调用
          </span>
          <span className="ml-auto mr-3 shrink-0">{starButton}</span>
          <Button
            type="button"
            size="sm"
            className="h-8 rounded-lg border-[1.5px] border-foreground bg-card px-4 text-xs font-semibold text-foreground group-hover:bg-foreground group-hover:text-background"
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
          >
            查看
          </Button>
        </div>
      </div>
    </div>
  );
}
