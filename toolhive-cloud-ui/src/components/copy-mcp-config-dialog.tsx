"use client";

import { Check, Clipboard, Copy } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildClaudeCodeCommand,
  buildWorkbuddyConfig,
  normalizeServerName,
  type McpTransportConfig,
} from "@/lib/mcp/client-configs";
import { cn } from "@/lib/utils";

type ButtonVariant = ComponentProps<typeof Button>["variant"];
type ButtonSize = ComponentProps<typeof Button>["size"];

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("已复制到剪贴板");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("复制失败，请手动选中复制");
    }
  }

  return (
    <div className="relative">
      <pre className="max-h-72 overflow-auto rounded-md border bg-muted/50 p-3 pr-12 font-mono text-xs leading-5">
        {code}
      </pre>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="absolute right-2 top-2 h-7 w-7"
        onClick={copy}
        aria-label="复制配置"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-600" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
}

interface CopyMcpConfigDialogProps {
  serverName: string;
  config: McpTransportConfig;
  triggerLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  labelClassName?: string;
}

/**
 * 「复制配置」弹窗：给出该 MCP 在各类客户端里的接入配置，用户复制粘贴即可。
 *
 * 与「调用 MCP」是两件事——后者是在平台上试跑工具（测试功能），
 * 本组件产出的是终端用户接到自己客户端所需的配置片段。
 */
export function CopyMcpConfigDialog({
  serverName,
  config,
  triggerLabel = "复制配置",
  variant = "outline",
  size = "sm",
  className,
  labelClassName,
}: CopyMcpConfigDialogProps) {
  const [open, setOpen] = useState(false);
  const name = normalizeServerName(serverName);

  const workbuddy = buildWorkbuddyConfig(name, config);
  const claudeCode = buildClaudeCodeCommand(name, config);
  const rawConfig = JSON.stringify(config, null, 2);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn("cursor-pointer", className)}
          // 列表卡片整体可点击（跳转详情），此处要阻断冒泡避免误触发
          onClick={(e) => e.stopPropagation()}
        >
          <Clipboard className="size-4" />
          <span className={cn(labelClassName)}>{triggerLabel}</span>
        </Button>
      </DialogTrigger>

      <DialogContent
        className="sm:max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>在客户端中接入「{serverName}」</DialogTitle>
          <DialogDescription>
            复制下方配置粘贴到你的客户端配置文件中，即可使用该 MCP。
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="workbuddy">
          <TabsList>
            <TabsTrigger value="workbuddy">WorkBuddy</TabsTrigger>
            <TabsTrigger value="claude">Claude Code</TabsTrigger>
            <TabsTrigger value="raw">原始配置</TabsTrigger>
          </TabsList>

          <TabsContent value="workbuddy" className="space-y-2">
            <p className="text-xs text-muted-foreground">
              粘贴到 <code className="font-mono">~/.workbuddy/mcp.json</code>
              （Windows：<code className="font-mono">
                C:\Users\&lt;你&gt;\.workbuddy\mcp.json
              </code>
              ）。保存后重启 WorkBuddy，在左侧「插件 → MCP 服务器」中信任并启用。
            </p>
            <CodeBlock code={workbuddy} />
          </TabsContent>

          <TabsContent value="claude" className="space-y-2">
            <p className="text-xs text-muted-foreground">
              在终端执行以下命令即可完成添加。
            </p>
            <CodeBlock code={claudeCode} />
          </TabsContent>

          <TabsContent value="raw" className="space-y-2">
            <p className="text-xs text-muted-foreground">
              该 MCP 的原始连接配置，Cursor / VS Code 等客户端可参照填写。
            </p>
            <CodeBlock code={rawConfig} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
