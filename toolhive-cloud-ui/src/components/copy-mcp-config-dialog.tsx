"use client";

import { Check, Clipboard, Copy, HelpCircle, KeyRound } from "lucide-react";
import { type ComponentProps, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  type McpTransportConfig,
  normalizeServerName,
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
    <div className="relative min-w-0">
      {/* pre-wrap + break-words：长命令（含长 token）自动折行，避免把弹窗撑破 */}
      <pre className="max-h-80 min-w-0 overflow-auto rounded-md border bg-muted/50 p-4 pr-14 font-mono text-base leading-6 whitespace-pre-wrap break-words">
        {code}
      </pre>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="absolute right-2.5 top-2.5 h-8 w-8"
        onClick={copy}
        aria-label="复制配置"
      >
        {copied ? (
          <Check className="size-4 text-success" />
        ) : (
          <Copy className="size-4" />
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
  /** D1 成员视角（2026-10-13）：条目未为当前用户签发成员 token 时为 true——
   *  后端此时不下发 mcp_headers，弹窗给出「自助签发」入口（2026-10-14 起不再要求联系管理员），
   *  而不是给出必然 403 的配置。 */
  tokenRequired?: boolean;
  /** 平台提交型 MCP 的 submission id：提供后 memberGate 分支展示「自助签发」按钮 */
  submissionId?: string;
  /** 受控 open（可选）：Token 管理弹窗内复用本组件复制成员专属配置时由外部控制开关 */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
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
  tokenRequired = false,
  submissionId,
  open: controlledOpen,
  onOpenChange,
}: CopyMcpConfigDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [issuing, startIssuing] = useTransition();
  const router = useRouter();
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const name = normalizeServerName(serverName);

  // 自助签发：调 Server Action 为当前登录用户签发成员 token，成功后刷新——
  // 服务端组件重取 mcp_headers（此时已携带个人 token），memberGate 自动解除。
  function handleSelfIssue() {
    if (!submissionId) return;
    startIssuing(async () => {
      try {
        const { issueMyMemberTokenAction } = await import(
          "@/app/(app)/submissions/actions"
        );
        const res = await issueMyMemberTokenAction(submissionId);
        if (res.ok) {
          toast.success(
            res.adopted
              ? "已签发你的专属访问 Token，配置已更新"
              : "已轮换你的访问 Token，旧 Token 即刻失效，请重新复制配置",
          );
          router.refresh();
        } else {
          toast.error(res.error || "自助签发失败");
        }
      } catch {
        toast.error("自助签发失败，请稍后重试");
      }
    });
  }

  const workbuddy = buildWorkbuddyConfig(name, config);
  const claudeCode = buildClaudeCodeCommand(name, config);
  const rawConfig = JSON.stringify(config, null, 2);

  // D1：restricted + 未签发成员 token → 不展示配置（无凭证的配置贴进客户端必然 403）
  const memberGate = tokenRequired && !("headers" in config && config.headers);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* 受控模式（Token 管理弹窗内复制成员配置）由外部控制开关，不渲染触发钮 */}
      {controlledOpen === undefined && (
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
      )}

      <DialogContent
        className="sm:max-w-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>在客户端中接入「{serverName}」</DialogTitle>
          <DialogDescription>
            {memberGate
              ? "尚未签发你的访问凭证，签发后即可复制配置。"
              : "复制下方配置粘贴到你的客户端配置文件中，即可使用该 MCP。"}
          </DialogDescription>
        </DialogHeader>

        {memberGate ? (
          <div className="rounded-md border border-warning/40 bg-warning/10 p-4 text-sm leading-6">
            <p className="font-medium">还没有你的专属访问 Token</p>
            <p className="mt-1 text-muted-foreground">
              该 MCP 启用了成员级访问控制：每位成员使用独立
              Token，轮换或吊销只影响本人，不影响其他成员。
              {submissionId
                ? "点击下方按钮即可自助签发（资格即时校验），签发后本页直接展示可复制配置。"
                : "请联系管理员在「已发布管理 → Token 管理」中为你签发，签发后回到本页重新复制配置。"}
            </p>
            {submissionId && (
              <Button
                type="button"
                size="sm"
                className="mt-3 gap-1.5"
                disabled={issuing}
                onClick={handleSelfIssue}
              >
                <KeyRound className="size-4" />
                {issuing ? "签发中…" : "自助签发我的 Token"}
              </Button>
            )}
          </div>
        ) : (
          <Tabs defaultValue="workbuddy">
            <TabsList>
              <TabsTrigger value="workbuddy">WorkBuddy</TabsTrigger>
              <TabsTrigger value="claude">Claude Code</TabsTrigger>
              <TabsTrigger value="raw">原始配置</TabsTrigger>
            </TabsList>

            <TabsContent value="workbuddy" className="space-y-2">
              <div
                className="inline-flex items-center gap-1 text-sm text-muted-foreground"
                title="粘贴到 ~/.workbuddy/mcp.json（Windows：C:\\Users\\<你>\\.workbuddy\\mcp.json）。保存后重启 WorkBuddy，在左侧「插件 → MCP 服务器」中信任并启用。"
              >
                <HelpCircle className="size-4 cursor-help" />
                <span>配置位置</span>
              </div>
              <CodeBlock code={workbuddy} />
            </TabsContent>

            <TabsContent value="claude" className="space-y-2">
              <p className="text-sm text-muted-foreground">
                在终端执行以下命令即可完成添加。
              </p>
              <CodeBlock code={claudeCode} />
            </TabsContent>

            <TabsContent value="raw" className="space-y-2">
              <p className="text-sm text-muted-foreground">
                该 MCP 的原始连接配置，Cursor / VS Code 等客户端可参照填写。
              </p>
              <CodeBlock code={rawConfig} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
