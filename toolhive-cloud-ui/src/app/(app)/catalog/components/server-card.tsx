"use client";

import { Star } from "lucide-react";
import { CopyMcpConfigDialog } from "@/components/copy-mcp-config-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { V0ServerJson } from "@/generated/types.gen";
import { isVirtualMCPServer } from "@/lib/utils";
import { toggleFavoriteAction } from "@/lib/platform-actions";

interface ServerCardProps {
  server: V0ServerJson;
  serverUrl?: string;
  favorited?: boolean;
  callCount?: number;
  onClick?: () => void;
}

/**
 * Server card component that displays MCP server information
 * from the catalog. Adds a GitHub-style star (favorite toggle) and
 * a call-count stat at the bottom-right.
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
    <Card
      className="flex h-full w-full flex-col shadow-none rounded-md gap-4 py-4"
      onClick={onClick ? () => onClick() : undefined}
    >
      <CardHeader className="cursor-pointer gap-1">
        <CardTitle className="text-xl font-semibold leading-7 tracking-tight">
          {server.title ?? name}
        </CardTitle>
        <CardDescription className="flex items-center gap-1.5 text-xs leading-5">
          {author && <span>{author}</span>}
          {isVirtualMCP && (
            <Badge
              variant="secondary"
              className="text-xs font-semibold leading-4"
            >
              Virtual MCP
            </Badge>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <p className="line-clamp-3 text-sm leading-[18px] text-muted-foreground cursor-pointer">
          {description || "No description available"}
        </p>
        {/* 收藏星标 + 调用次数统计（GitHub 式） */}
        <div className="mt-auto flex items-center justify-between border-t pt-3">
          <div className="flex items-center gap-3">
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
                      ? "h-4 w-4 fill-yellow-400 text-yellow-400"
                      : "h-4 w-4 text-muted-foreground"
                  }
                />
              </Button>
            </form>
            <span className="text-xs text-muted-foreground">
              {callCount} 次调用
            </span>
          </div>
          <div className="flex items-center gap-2">
            {serverUrl && (
              <CopyMcpConfigDialog
                serverName={server.title ?? name ?? ""}
                config={{ url: serverUrl }}
                triggerLabel="调用"
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
      </CardContent>
    </Card>
  );
}
