"use client";

import { CircleSlash, Loader2, Play, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyMcpConfigDialog } from "@/components/copy-mcp-config-dialog";
import { callMcpAction, toggleFavoriteAction } from "@/lib/platform-actions";

interface McpDetailActionsProps {
  itemRef: string;
  favorited: boolean;
  callCount: number;
  favoriteCount: number;
  // 运行实例的 MCP 端点
  endpoint?: string;
  // 终端用户可达的对外端点（复制配置给用户时用）。后端只在探活可达时才下发，
  // 因此「有 endpoint 但没有 publicEndpoint」= 有部署记录但实例不可达。
  publicEndpoint?: string;
  // 代理调用凭证（restricted 条目必带）：经 Authorization Header 传递，URL 不再携带 token
  mcpHeaders?: Record<string, string>;
  healthy?: boolean;
  // 展示名，用于生成客户端配置里的 key
  name?: string;
  // 从目录卡片「调用」按钮带参进入时，挂载即自动拉起工具面板
  autoCall?: boolean;
}

interface McpTool {
  name: string;
  description?: string;
  inputSchema?: { properties?: Record<string, unknown> };
}

type CallPhase =
  | "idle"
  | "loading-tools"
  | "tools"
  | "loading-call"
  | "result"
  | "error";

/**
 * Interactive actions (favorite toggle + MCP call) for the /mcp/[ref] detail page.
 * The "调用" button triggers an MCP invocation against the server's endpoint
 * (via the platform backend /mcp/call), then shows the tool list / call result.
 */
export function McpDetailActions({
  itemRef,
  favorited,
  callCount,
  favoriteCount,
  endpoint,
  publicEndpoint,
  mcpHeaders,
  healthy,
  name,
  autoCall,
}: McpDetailActionsProps) {
  const toggleFav = toggleFavoriteAction.bind(null, "mcp", itemRef, favorited);

  const [phase, setPhase] = useState<CallPhase>("idle");
  const [tools, setTools] = useState<McpTool[]>([]);
  const [selected, setSelected] = useState("");
  const [argsText, setArgsText] = useState("{}");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const runnable = Boolean(endpoint);

  // 从目录卡片「调用」按钮带 ?call=1 进入时，挂载即自动拉起工具面板
  useEffect(() => {
    if (autoCall && endpoint) {
      setError("");
      void loadTools();
    }
    // 仅挂载时触发一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadTools() {
    setPhase("loading-tools");
    setError("");
    try {
      const res = await callMcpAction(itemRef, endpoint);
      if (!res.ok) {
        const msg = [res.error, res.detail].filter(Boolean).join("：");
        throw new Error(msg || "调用失败");
      }
      const events = (res.events as unknown[]) || [];
      const last = events[events.length - 1] as {
        result?: { tools?: McpTool[] };
      };
      const list = last?.result?.tools ?? [];
      setTools(list);
      setSelected(list[0]?.name ?? "");
      setPhase("tools");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  }

  async function executeTool() {
    if (!selected) return;
    setPhase("loading-call");
    setError("");
    let parsedArgs: Record<string, unknown> = {};
    try {
      parsedArgs = argsText.trim() ? JSON.parse(argsText) : {};
    } catch {
      setError("参数不是合法 JSON");
      setPhase("error");
      return;
    }
    try {
      const res = await callMcpAction(itemRef, endpoint, selected, parsedArgs);
      if (!res.ok) {
        const msg = [res.error, res.detail].filter(Boolean).join("：");
        throw new Error(msg || "调用失败");
      }
      const events = (res.events as unknown[]) || [];
      setOutput(JSON.stringify(events[events.length - 1] ?? {}, null, 2));
      setPhase("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <form action={toggleFav}>
          <Button type="submit" variant="outline" size="lg" className="gap-2">
            <Star
              className={
                favorited
                  ? "h-4 w-4 fill-yellow-400 text-yellow-400"
                  : "h-4 w-4"
              }
            />
            {favorited ? "已收藏" : "收藏"}
          </Button>
        </form>

        {runnable ? (
          <Button
            type="button"
            size="lg"
            className="gap-2"
            onClick={loadTools}
            disabled={phase === "loading-tools" || phase === "loading-call"}
          >
            {phase === "loading-tools" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            调用 MCP
          </Button>
        ) : (
          <Badge variant="secondary" className="text-sm">
            未在平台运行 · 暂不可调用
          </Badge>
        )}

        {/* 后端只在探活可达时才下发 publicEndpoint，有它才给复制按钮 */}
        {publicEndpoint && (
          <CopyMcpConfigDialog
            serverName={name || itemRef}
            config={{ url: publicEndpoint, headers: mcpHeaders }}
            variant="outline"
            size="lg"
            className="gap-2"
          />
        )}
        {!publicEndpoint && endpoint && (
          <Badge
            variant="outline"
            className="gap-1 border-amber-500/40 text-sm text-amber-600"
            title="部署记录存在，但实例探测不可达（容器可能已被清理或未启动），复制配置会连不通"
          >
            <CircleSlash className="size-3.5" />
            实例离线
          </Badge>
        )}

        <span className="text-sm text-muted-foreground">
          {callCount} 次调用 · {favoriteCount} 次收藏
        </span>
        <Badge variant="outline">mcp</Badge>
      </div>

      {(phase === "tools" || phase === "loading-call") && (
        <div className="rounded-md border p-4 space-y-3">
          <div className="text-sm font-medium">
            选择工具执行（共 {tools.length} 个）
          </div>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            {tools.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
          {selected && (
            <p className="text-xs text-muted-foreground">
              {tools.find((t) => t.name === selected)?.description}
            </p>
          )}
          <div>
            <div className="mb-1 text-xs text-muted-foreground">
              参数（JSON，默认 {"{}"}）
            </div>
            <textarea
              value={argsText}
              onChange={(e) => setArgsText(e.target.value)}
              rows={3}
              className="w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
              placeholder='{"key":"value"}'
            />
          </div>
          <Button
            type="button"
            onClick={executeTool}
            className="gap-2"
            disabled={phase === "loading-call"}
          >
            {phase === "loading-call" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            执行
          </Button>
        </div>
      )}

      {phase === "result" && (
        <div className="rounded-md border p-4 space-y-2">
          <div className="text-sm font-medium">调用结果</div>
          <pre className="max-h-80 overflow-auto rounded bg-muted p-3 text-xs leading-5 whitespace-pre-wrap">
            {output}
          </pre>
          <Button type="button" variant="ghost" size="sm" onClick={loadTools}>
            重新选择工具
          </Button>
        </div>
      )}

      {phase === "error" && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
