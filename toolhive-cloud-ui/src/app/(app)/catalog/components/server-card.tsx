"use client";

import { Star } from "lucide-react";
import { CopyMcpConfigDialog } from "@/components/copy-mcp-config-dialog";
import { McpGlyph } from "@/components/type-glyph";
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
}

/**
 * Registry 上游 MCP 卡片（变体 B「色带横幅」）：
 * 卡顶一条 info 色横幅装符号 + 名称，下方白底描述与元信息行。
 */
export function ServerCard({
  server,
  serverUrl,
  favorited = false,
  callCount = 0,
  onClick,
}: ServerCardProps) {
  const { name, description, repository } = server;
  const author = repository?.id;
  const isVirtualMCP = isVirtualMCPServer(server);
  const itemRef = name ?? "";

  const toggleFav = toggleFavoriteAction.bind(null, "mcp", itemRef, favorited);

  return (
    <div
      className="card-hover flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-xl border bg-card transition-colors hover:border-primary/40"
      onClick={onClick ? () => onClick() : undefined}
    >
      {/* 色带横幅：符号 + 名称 */}
      <div className="flex items-center gap-2 bg-info/10 px-4 py-2.5">
        <McpGlyph />
        <span
          className="min-w-0 flex-1 truncate text-sm font-medium"
          title={server.title ?? name}
        >
          {server.title ?? name}
        </span>
        {isVirtualMCP && (
          <Badge
            variant="secondary"
            className="shrink-0 bg-background/70 text-xs font-semibold leading-4"
          >
            Virtual MCP
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="line-clamp-2 text-sm leading-[18px] text-muted-foreground">
          {description || "暂无描述"}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            {server.version && (
              <span className="shrink-0 rounded border border-border px-1.5 py-0.5">
                v{server.version}
              </span>
            )}
            <span className="shrink-0">{callCount} 次调用</span>
            {author && (
              <span className="truncate" title={author}>
                {author}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: 仅阻止点击冒泡到卡片，非交互元素 */}
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
              variant="outline"
              size="sm"
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
