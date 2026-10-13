"use client";

import { ChevronDown, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CopyMcpConfigDialog } from "@/components/copy-mcp-config-dialog";
import { CardCornerDeco, CardTypeTab, McpGlyph } from "@/components/type-glyph";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toggleFavoriteAction } from "@/lib/platform-actions";
import type { McpServer } from "@/lib/platform-backend";

interface SubmittedMcpCardProps {
  mcp: McpServer;
  favorited?: boolean;
  callCount?: number;
  /** 同 group 的完整卡片数据（含默认版 mcp 与其已上架版本）。长度>1 时横幅右侧显示版本下拉，可就地切换。 */
  siblingCards?: McpServer[];
  /** grid=紧凑竖排（色带横幅）；list=横向单列（左脊 + 信息三栏） */
  layout?: "grid" | "list";
}

/**
 * 用户提交且已审批的 MCP 卡片（变体 B「色带横幅」）。
 * 多版本时横幅右侧版本下拉可「就地切换」：选中其它版本后，本卡直接展示该版本
 * 的名称/描述/调用计数/运行态/对外端点，无需跳详情页。
 * 列表视图换横向形态：6px 类型色左脊，标题行/描述/元信息顶格，操作列贴右。
 */
export function SubmittedMcpCard({
  mcp,
  favorited = false,
  callCount = 0,
  siblingCards,
  layout = "grid",
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

  const starButton = (
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
              ? "h-4 w-4 fill-star text-star animate-[star-pop_320ms_ease-out]"
              : "h-4 w-4 text-muted-foreground"
          }
        />
      </Button>
    </form>
  );

  const versionSwitcher = canSwitch && (
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
        className="h-7 cursor-pointer appearance-none rounded-md border border-input bg-background py-0 pr-6 pl-2 text-xs font-medium outline-none hover:border-muted-foreground/50"
      >
        {versions.map((v) => (
          <option key={v.id} value={v.id}>
            {versionLabel(v)}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-1 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  );

  if (layout === "list") {
    return (
      <div className="card-hover flex w-full cursor-pointer items-stretch overflow-hidden rounded-xl border bg-card transition-colors">
        {/* 类型色左脊 */}
        <span aria-hidden className="w-1.5 shrink-0 bg-info" />
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-3.5 pl-5 pr-4">
          <div className="flex items-center gap-2">
            <McpGlyph size={14} />
            <span
              className="min-w-0 truncate text-sm font-medium"
              title={cur.name}
            >
              {cur.name}
            </span>
            {canSwitch
              ? versionSwitcher
              : cur.version && (
                  <span className="shrink-0 rounded-md bg-info/10 px-2 py-0.5 text-xs text-info">
                    v{cur.version}
                  </span>
                )}
            {/* 运行态是名称行的关键状态：未运行时随标题展示 */}
            {!(cur.public_endpoint && cur.healthy) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="shrink-0 gap-1 border-warning/40 text-xs font-medium text-warning"
                  >
                    未运行
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  该版本尚未部署，实例未在平台运行
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <p className="line-clamp-1 text-sm leading-snug text-muted-foreground">
            {cur.description || "暂无描述"}
          </p>
          <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
            <span className="truncate">
              提交者 {cur.owner || mcp.owner} ·{" "}
              {cur.id === mcp.id ? callCount : cur.call_count || 0} 次调用
            </span>
            <Badge variant="outline" className="shrink-0 text-xs">
              用户提交
            </Badge>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 px-5">
          {starButton}
          {/* 部署且实例在线才显示「接入」按钮（与 registry 卡一致） */}
          {cur.public_endpoint && cur.healthy && (
            <CopyMcpConfigDialog
              serverName={cur.name}
              config={{ url: cur.public_endpoint, headers: cur.mcp_headers }}
              triggerLabel="接入"
              className="rounded-full"
            />
          )}
          <Button
            type="button"
            size="sm"
            className="bg-info text-white hover:bg-info/90"
            onClick={goDetail}
          >
            查看
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative flex h-full w-full flex-col overflow-hidden bg-card px-6 pt-9 pb-5 transition-[background,transform] duration-150 [border-bottom-width:1.5px] [border-right-width:1.5px] border-border hover:-translate-y-[3px] hover:bg-muted/40">
      {/* 效果图 01：类型垂片 + 右下几何角饰（无缝拼贴单元格） */}
      <CardTypeTab type="mcp" />
      <CardCornerDeco type="mcp" />

      <div className="relative z-10 flex flex-1 flex-col">
        <div className="flex items-center gap-2">
          <span
            className="min-w-0 flex-1 truncate text-[16.5px] font-semibold transition-transform duration-200 group-hover:translate-x-[3px]"
            title={cur.name}
          >
            {cur.name}
          </span>
          {canSwitch && versionSwitcher}
          {/* 运行态是名称行的关键状态：未运行时随标题展示 */}
          {!(cur.public_endpoint && cur.healthy) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="shrink-0 gap-1 border-warning/40 text-xs font-medium text-warning"
                >
                  未运行
                </Badge>
              </TooltipTrigger>
              <TooltipContent>该版本尚未部署，实例未在平台运行</TooltipContent>
            </Tooltip>
          )}
        </div>
        <p className="mt-2 line-clamp-2 max-w-[92%] min-h-11 text-[13px] leading-[1.7] text-muted-foreground">
          {cur.description || "暂无描述"}
        </p>

        <div className="mt-auto flex items-center pt-4">
          <span className="shrink-0 font-mono text-[12.5px] text-muted-foreground">
            {cur.version ? `v${cur.version}` : ""}
          </span>
          <span className="ml-2.5 shrink-0 text-[12.5px] text-muted-foreground">
            {cur.id === mcp.id ? callCount : cur.call_count || 0} 次调用
          </span>
          <span className="ml-auto mr-3 shrink-0">{starButton}</span>
          <Button
            type="button"
            size="sm"
            className="h-8 rounded-lg border-[1.5px] border-foreground bg-card px-4 text-xs font-semibold text-foreground group-hover:bg-foreground group-hover:text-background"
            onClick={goDetail}
          >
            查看
          </Button>
        </div>
      </div>
    </div>
  );
}
