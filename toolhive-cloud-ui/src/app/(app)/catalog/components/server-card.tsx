"use client";

import { Star } from "lucide-react";
import { CopyMcpConfigDialog } from "@/components/copy-mcp-config-dialog";
import { CardCornerDeco, CardTypeTab, McpGlyph } from "@/components/type-glyph";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { V0ServerJson } from "@/generated/types.gen";
import { toggleFavoriteAction } from "@/lib/platform-actions";
import { isVirtualMCPServer } from "@/lib/utils";

interface ServerCardProps {
  server: V0ServerJson;
  serverUrl?: string;
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
 */
export function ServerCard({
  server,
  serverUrl,
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
      <div
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
          {serverUrl && (
            <CopyMcpConfigDialog
              serverName={server.title ?? name ?? ""}
              config={{ url: serverUrl }}
              triggerLabel="接入"
              className="rounded-full"
            />
          )}
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
    <div
      className="card-hover group relative flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-xl border bg-card transition-colors"
      onClick={onClick ? () => onClick() : undefined}
    >
      {/* 包豪斯：类型垂片 + 右下几何角饰（替代整条色带横幅） */}
      <CardTypeTab type="mcp" />
      <CardCornerDeco type="mcp" />

      <div className="relative z-10 flex flex-1 flex-col p-4 pt-8">
        <div className="flex items-center gap-2">
          <span
            className="min-w-0 flex-1 truncate text-base font-semibold"
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
        <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-muted-foreground">
          {description || "暂无描述"}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
          <div className="min-w-0 truncate font-mono text-xs text-muted-foreground">
            {server.version ? `v${server.version}` : ""} · {callCount} 次调用
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {starButton}
            <Button
              type="button"
              size="sm"
              className="bg-foreground px-4 text-background hover:bg-foreground/85"
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
    </div>
  );
}
