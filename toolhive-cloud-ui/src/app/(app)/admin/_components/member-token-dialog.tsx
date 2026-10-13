"use client";

import { KeyRound, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CopyMcpConfigDialog } from "@/components/copy-mcp-config-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { McpTransportConfig } from "@/lib/mcp/client-configs";
import type { Submission } from "@/lib/platform-backend";
import { cn } from "@/lib/utils";
import {
  fetchMemberTokenConfigAction,
  fetchMemberTokensAction,
  issueMemberTokenAction,
  revokeMemberTokenAction,
  rotateMcpTokenAction,
} from "../../submissions/actions";

/**
 * Token 管理（双轨制 2026-10-13，仅管理员、仅 MCP）：
 *  - 包级 Token：全条目一把，轮换 = 全员接入配置立即失效（存量语义保留）；
 *  - 成员 Token：按可见范围 users 逐成员签发/轮换/吊销，只影响该成员。
 * 列表与动作走返回值型 Server Action（弹窗内就地反馈），不走 redirect 带参模式。
 */

function formatTs(ts: string | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

interface MemberRow {
  member: string;
  token: string | null;
  created_at: string | null;
  rotated_at: string | null;
}

/** 两步确认钮：首击进入待确认态，再击执行；失焦或执行后复位。 */
function TwoStepButton({
  label,
  confirmLabel,
  onConfirm,
  disabled,
  destructive,
  className,
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
  destructive?: boolean;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      className={cn(
        "h-7 px-2.5 text-xs",
        armed &&
          (destructive
            ? "border-destructive text-destructive"
            : "border-foreground text-foreground"),
        className,
      )}
      onClick={() => {
        if (!armed) {
          setArmed(true);
          return;
        }
        setArmed(false);
        onConfirm();
      }}
      onBlur={() => setArmed(false)}
    >
      {armed ? confirmLabel : label}
    </Button>
  );
}

export function MemberTokenDialog({ s }: { s: Submission }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"all" | "restricted">("restricted");
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [pending, startTransition] = useTransition();
  // 成员专属配置复制：取到配置后以受控模式打开复制弹窗
  const [memberConfig, setMemberConfig] = useState<{
    member: string;
    config: McpTransportConfig;
  } | null>(null);

  async function load(id: string) {
    setLoading(true);
    const res = await fetchMemberTokensAction(id);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setMode(res.data.mode);
    setMembers(res.data.members);
  }

  function handleOpen(next: boolean) {
    setOpen(next);
    if (next) void load(s.id);
  }

  function run(
    fn: () => Promise<{ ok: boolean; error?: string }>,
    okMsg: string,
  ) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        toast.success(okMsg);
        await load(s.id);
      } else {
        toast.error(res.error ?? "操作失败");
      }
    });
  }

  // 包级轮换：复用既有 rotateMcpTokenAction（redirect 模式在成功路径返回 {ok:true}）
  function rotatePackage() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", s.id);
      const res = (await rotateMcpTokenAction(fd)) as
        | { ok?: boolean }
        | undefined;
      if (res?.ok) {
        toast.success("包级 Token 已轮换", {
          description: "旧令牌已作废，所有成员需重新复制接入配置",
        });
      }
    });
  }

  async function copyMemberConfig(member: string) {
    const res = await fetchMemberTokenConfigAction(s.id, member);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    if (!res.data.url) {
      toast.error("该 MCP 当前未部署，部署后才能生成接入配置");
      return;
    }
    setMemberConfig({
      member,
      config: { url: res.data.url, headers: res.data.headers ?? undefined },
    });
  }

  const hasPackageHint =
    "将生成新的代理访问令牌，所有已复制到客户端的接入配置会立刻失效（401），需要重新复制配置。仅影响该 MCP，其他条目不受影响。";

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="cursor-pointer">
            <KeyRound className="size-4" />
            Token 管理
          </Button>
        </DialogTrigger>
        <DialogContent
          className="sm:max-w-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>Token 管理 · {s.id}</DialogTitle>
            <DialogDescription>
              包级 Token 全条目一把；成员 Token
              按「可见范围」中的邮箱逐人签发，轮换或吊销只影响对应成员。
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              加载中…
            </div>
          ) : (
            <div className="space-y-5">
              {/* 包级 Token */}
              <section className="rounded-md border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">包级 Token</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {hasPackageHint}
                    </p>
                  </div>
                  <TwoStepButton
                    label="轮换包级"
                    confirmLabel="确认轮换？"
                    onConfirm={rotatePackage}
                    disabled={pending}
                  />
                </div>
              </section>

              {/* 成员 Token */}
              <section className="rounded-md border p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">成员 Token</p>
                  <span className="text-xs text-muted-foreground">
                    名单来自「可见范围」按邮箱授权的成员
                  </span>
                </div>
                {mode === "all" ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    该 MCP
                    当前为全员可见，未启用成员级访问控制。如需按成员管理凭证，请先在「可见范围」中切换为受限访问并添加成员。
                  </p>
                ) : members.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    可见范围中还没有按邮箱授权的成员。请先在「可见范围」中添加成员邮箱。
                  </p>
                ) : (
                  <ul className="mt-3 divide-y">
                    {members.map((m) => (
                      <li
                        key={m.member}
                        className="flex flex-wrap items-center gap-2 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-mono text-sm">
                            {m.member}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {m.token
                              ? `已签发${m.rotated_at ? ` · 轮换于 ${formatTs(m.rotated_at)}` : ` · ${formatTs(m.created_at)}`}`
                              : "未签发"}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {m.token && (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 px-2.5 text-xs"
                                disabled={pending}
                                onClick={() => void copyMemberConfig(m.member)}
                              >
                                复制配置
                              </Button>
                              <TwoStepButton
                                label="轮换"
                                confirmLabel="确认轮换？"
                                disabled={pending}
                                onConfirm={() =>
                                  run(
                                    () =>
                                      issueMemberTokenAction(s.id, m.member),
                                    `已轮换 ${m.member} 的 Token（旧凭证立即作废）`,
                                  )
                                }
                              />
                              <TwoStepButton
                                label="吊销"
                                confirmLabel="确认吊销？"
                                destructive
                                disabled={pending}
                                onConfirm={() =>
                                  run(
                                    () =>
                                      revokeMemberTokenAction(s.id, m.member),
                                    `已吊销 ${m.member} 的 Token`,
                                  )
                                }
                              />
                            </>
                          )}
                          {!m.token && (
                            <TwoStepButton
                              label="签发"
                              confirmLabel="确认签发？"
                              disabled={pending}
                              onConfirm={() =>
                                run(
                                  () => issueMemberTokenAction(s.id, m.member),
                                  `已为 ${m.member} 签发 Token，可复制专属配置分发`,
                                )
                              }
                            />
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 成员专属配置复制（受控复用 CopyMcpConfigDialog 的三端格式） */}
      {memberConfig && (
        <CopyMcpConfigDialog
          serverName={`${memberConfig.member} · ${s.id}`}
          config={memberConfig.config}
          open={Boolean(memberConfig)}
          onOpenChange={(o) => {
            if (!o) setMemberConfig(null);
          }}
        />
      )}
    </>
  );
}
