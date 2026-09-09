"use client";

import { ChevronDown, CircleSlash, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { toggleFavoriteAction } from "@/lib/platform-actions";
import type { McpServer } from "@/lib/platform-backend";

interface SubmittedMcpCardProps {
  mcp: McpServer;
  favorited?: boolean;
  callCount?: number;
  /** 同 group 的完整卡片数据（含默认版 mcp 与其已上架版本）。长度>1 时标题右显示版本下拉，可就地切换。 */
  siblingCards?: McpServer[];
}

/**
 * Card for a user-submitted MCP that has passed admin approval.
 * Mirrors the registry ServerCard (star + call count) but links to the
 * dedicated /mcp/[id] detail page instead of a registry detail route.
 * The detail page hosts the real MCP call panel.
 *
 * 多版本时，标题右侧版本下拉可「就地切换」：选中其它版本后，本卡直接展示该版本
 * 的名称/描述/调用计数/运行态/对外端点，无需跳详情页。
 */
export function SubmittedMcpCard({
  mcp,
  favorited = false,
  callCount = 0,
  siblingCards,
}: SubmittedMcpCardProps) {
  const router = useRouter();
  // 就地切换的当前版本：有同 group 其它版本数据时使用；否则恒为 mcp
  const versions =
    siblingCards && siblingCards.length > 1 ? siblingCards : [mcp];
  const [curId, setCurId] = useState<string>(mcp.id);
  const cur = versions.find((v) => v.id === curId) || mcp;

  const toggleFav = toggleFavoriteAction.bind(null, "mcp", mcp.id, favorited);
  const goDetail = () => router.push(`/mcp/${encodeURIComponent(cur.id)}`);
  const canSwitch = versions.length > 1;

  const versionLabel = (m: McpServer) => (m.version ? `v${m.version}` : m.name);

  return (
    <Card className="card-hover flex h-full w-full flex-col gap-4 py-4">
      <CardHeader className="gap-1">
        <div className="flex items-center justify-between gap-2">
          <CardTitle
            className="truncate text-xl font-semibold leading-7 tracking-tight"
            title={cur.name}
          >
            {cur.name}
          </CardTitle>
          {/* 多版本：版本下拉放在标题右侧，就地切换（不跳详情） */}
          {canSwitch && (
            /* biome-ignore lint/a11y/useKeyWithClickEvents: 仅阻止点击冒泡到卡片，非交互元素 */
            /* biome-ignore lint/a11y/noStaticElementInteractions: 仅阻止点击冒泡到卡片，非交互元素 */
            <div
              className="relative shrink-0"
              onClick={(e) => e.stopPropagation()}
              title="就地切换版本"
            >
              <select
                aria-label="切换版本"
                value={cur.id}
                onChange={(e) => setCurId(e.target.value)}
                className="cursor-pointer appearance-none rounded-md border border-slate-200 bg-background py-1 pl-2.5 pr-7 text-base font-medium outline-none hover:border-slate-400 dark:border-slate-700"
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {versionLabel(v)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          )}
        </div>
        <CardDescription className="flex items-center gap-1.5 text-xs leading-5">
          <span>提交者：{cur.owner || mcp.owner}</span>
          <Badge variant="outline" className="text-xs">
            用户提交
          </Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <p className="line-clamp-3 text-sm leading-[18px] text-muted-foreground">
          {cur.description || "暂无描述"}
        </p>

        <div className="mt-auto flex items-center justify-between border-t pt-3">
          <div className="flex items-center gap-3">
            <form action={toggleFav}>
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
              {cur.id === mcp.id ? callCount : cur.call_count || 0} 次调用
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* 部署且实例在线才显示「调用」按钮；点击弹出客户端接入配置（与 registry ServerCard 一致） */}
            {cur.public_endpoint && cur.healthy ? (
              <CopyMcpConfigDialog
                serverName={cur.name}
                config={{ url: cur.public_endpoint, headers: cur.mcp_headers }}
                triggerLabel="调用"
                className="rounded-full"
              />
            ) : (
              <Badge
                variant="outline"
                className="gap-1 border-amber-500/40 text-xs text-amber-600"
                title="该版本尚未部署，实例未在平台运行"
              >
                <CircleSlash className="h-3 w-3" />
                未运行
              </Badge>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={goDetail}
            >
              查看
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
