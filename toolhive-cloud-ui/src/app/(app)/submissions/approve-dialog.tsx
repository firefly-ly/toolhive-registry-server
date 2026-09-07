"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Submission } from "@/lib/platform-backend";
import { approveSubmissionAction, rejectSubmissionAction } from "./actions";

function parseMeta(meta?: string): Record<string, unknown> {
  try {
    return meta ? (JSON.parse(meta) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

type ScanStatus = "clean" | "warn" | "critical" | "alert" | "error" | "skipped" | "scanning";

interface TrivyResult {
  status: ScanStatus;
  critical?: number;
  high?: number;
  secrets?: number;
  summary?: { id: string; severity: string; pkg: string }[];
  scanned_at?: string;
  error?: string;
}

interface PromptScanResult {
  status: ScanStatus;
  total?: number;
  hits?: { rule_id: string; category: string; severity: string; file: string; line: number; excerpt: string }[];
  scanned_at?: string;
  error?: string;
}

// 扫描三态徽章：绿=clean/低危，黄=warn/等待，红=critical/alert/出错，灰=skipped
function ScanBadge({ label, status, extra }: { label: string; status?: ScanStatus; extra?: string }) {
  const s = status ?? "skipped";
  const { variant, text } =
    s === "clean" ? { variant: "default" as const, text: "通过" }
    : s === "warn" ? { variant: "outline" as const, text: "有提示" }
    : s === "critical" || s === "alert" ? { variant: "destructive" as const, text: "需人工确认" }
    : s === "error" ? { variant: "destructive" as const, text: "扫描失败" }
    : s === "scanning" ? { variant: "outline" as const, text: "扫描中" }
    : { variant: "secondary" as const, text: "未扫描" };
  return (
    <span className="flex items-center gap-1.5">
      <Badge variant={variant}>{`${label}: ${text}`}</Badge>
      {extra && <span className="text-xs text-muted-foreground">{extra}</span>}
    </span>
  );
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 break-words",
          mono ? "font-mono text-sm" : "text-base",
        )}
      >
        {value ?? "—"}
      </p>
    </div>
  );
}

export function ApproveDialog({ submission }: { submission: Submission }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"idle" | "approving" | "rejecting">(
    "idle",
  );
  const [error, setError] = useState("");
  const { id, type, payload_ref, user_id, created_at, meta: metaRaw } = submission;
  const meta = useMemo(() => parseMeta(metaRaw), [metaRaw]);
  const isMcp = type === "mcp";
  const busy = phase !== "idle";

  // 安全扫描结果（后端异步扫描回写 meta.trivy / meta.prompt_scan）
  const trivy = useMemo(() => {
    const t = meta.trivy;
    return t && typeof t === "object" ? (t as TrivyResult) : undefined;
  }, [meta]);
  const promptScan = useMemo(() => {
    const p = meta.prompt_scan;
    return p && typeof p === "object" ? (p as PromptScanResult) : undefined;
  }, [meta]);
  const needScanOverride = trivy?.status === "critical";
  const needPromptConfirm = promptScan?.status === "alert";
  const [confirmScan, setConfirmScan] = useState(false);
  const [confirmPrompt, setConfirmPrompt] = useState(false);
  // 重开弹窗时重置勾选
  const resetChecks = () => {
    setConfirmScan(false);
    setConfirmPrompt(false);
  };

  const title =
    typeof meta.name === "string" && meta.name ? meta.name : payload_ref;
  const subtitle =
    typeof meta.name === "string" && meta.name ? payload_ref : undefined;

  const artifactKey =
    typeof meta.artifact_key === "string" && meta.artifact_key
      ? meta.artifact_key
      : undefined;
  const sourceUrl =
    typeof meta.source_url === "string" ? meta.source_url : undefined;
  const sourceIsHttp = /^https?:\/\//i.test(sourceUrl ?? "");
  const sourceLabel = sourceIsHttp ? (
    <a
      href={sourceUrl}
      target="_blank"
      rel="noreferrer"
      className="break-all text-primary underline"
    >
      {sourceUrl}
    </a>
  ) : sourceUrl ? (
    sourceUrl
  ) : artifactKey ? (
    "已上传至平台存储"
  ) : undefined;

  async function handleApprove() {
    setError("");
    setPhase("approving");
    const fd = new FormData();
    fd.set("id", id);
    if (confirmScan) fd.set("override_scan", "true");
    if (confirmPrompt) fd.set("confirm_prompt_review", "true");
    try {
      await approveSubmissionAction(fd);
      setOpen(false);
      resetChecks();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败，请重试");
    } finally {
      setPhase("idle");
    }
  }

  async function handleReject() {
    setError("");
    setPhase("rejecting");
    const fd = new FormData();
    fd.set("id", id);
    try {
      await rejectSubmissionAction(fd);
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败，请重试");
    } finally {
      setPhase("idle");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) { setError(""); resetChecks(); }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="text-sm">
          审批
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle className="text-xl">审批提交</DialogTitle>
          <DialogDescription>
            请审查以下提交内容，再决定是否通过。
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
          <div className="flex items-start justify-between gap-4 rounded-xl border bg-muted/30 p-4">
            <div className="min-w-0">
              <h3 className="truncate text-xl font-semibold">{title}</h3>
              {subtitle && (
                <p className="mt-0.5 truncate font-mono text-sm text-muted-foreground">
                  {subtitle}
                </p>
              )}
            </div>
            <Badge
              variant="outline"
              className="shrink-0 text-sm uppercase tracking-wide"
            >
              {isMcp ? "MCP Server" : "Skill"}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <Field label="提交者" value={user_id} />
            <Field label="提交时间" value={formatDate(created_at)} />
            <Field
              label="产品标识"
              value={
                typeof meta.group_key === "string" ? meta.group_key : undefined
              }
            />
            <Field
              label="版本号"
              value={
                typeof meta.version === "string" ? meta.version : undefined
              }
            />
            {isMcp ? (
              <>
                <Field
                  label="镜像引用"
                  value={
                    typeof meta.image_ref === "string"
                      ? meta.image_ref
                      : undefined
                  }
                  mono
                />
                <Field
                  label="传输协议"
                  value={
                    typeof meta.transport === "string"
                      ? meta.transport
                      : "自动检测"
                  }
                />
                <Field
                  label="自动同步内网"
                  value={meta.auto_mirror === true ? "是" : "否"}
                />
              </>
            ) : (
              <>
                <Field label="制品来源" value={sourceLabel} />
                <Field
                  label="所有者"
                  value={
                    typeof meta.owner === "string" ? meta.owner : undefined
                  }
                />
              </>
            )}
          </div>

          {!isMcp && artifactKey && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
              <div>
                <p className="text-sm font-medium">制品文件可下载检查</p>
                <p className="text-xs text-muted-foreground">
                  下载 .tar.gz / .zip 后人工核实内容是否合规
                </p>
              </div>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5 no-underline"
              >
                <a href={`/api/submissions/${id}/artifact`} download>
                  <Download className="size-4" /> 下载检查
                </a>
              </Button>
            </div>
          )}

          {/* 安全扫描结果（Trivy 漏洞/密钥 + SKILL.md 提示词注入规则） */}
          <div className="space-y-3 rounded-xl border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">安全扫描</p>
              <ScanBadge label="Trivy 漏洞" status={trivy?.status} extra={trivy ? `CRITICAL ${trivy.critical} · HIGH ${trivy.high} · 密钥 ${trivy.secrets}` : undefined} />
              {!isMcp && (
                <ScanBadge label="注入规则" status={promptScan?.status} extra={promptScan ? `命中 ${promptScan.total}` : undefined} />
              )}
              {(trivy?.status === "scanning" || (!isMcp && promptScan?.status === "scanning")) && (
                <span className="text-xs text-muted-foreground">扫描进行中，稍后重开此弹窗刷新结果</span>
              )}
            </div>

            {needPromptConfirm && (promptScan?.hits?.length ?? 0) > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-lg border border-destructive/40 bg-destructive/5">
                <table className="w-full text-left text-xs">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5 font-medium">级别</th>
                      <th className="px-2 py-1.5 font-medium">规则</th>
                      <th className="px-2 py-1.5 font-medium">类别</th>
                      <th className="px-2 py-1.5 font-medium">位置</th>
                      <th className="px-2 py-1.5 font-medium">命中内容</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(promptScan?.hits ?? []).map((h, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-2 py-1.5">
                          <span className={cn("rounded px-1.5 py-0.5 font-semibold", h.severity === "alert" ? "bg-destructive/15 text-destructive" : "bg-amber-500/15 text-amber-600")}>
                            {h.severity}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 font-mono">{h.rule_id}</td>
                        <td className="px-2 py-1.5">{h.category}</td>
                        <td className="px-2 py-1.5 font-mono">{h.file}:{h.line}</td>
                        <td className="max-w-[280px] truncate px-2 py-1.5" title={h.excerpt}>{h.excerpt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {(needScanOverride || needPromptConfirm) && (
              <div className="space-y-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3">
                {needScanOverride && (
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={confirmScan}
                      onChange={(e) => setConfirmScan(e.target.checked)}
                    />
                    <span>
                      Trivy 发现 <b>{trivy?.critical}</b> 个 CRITICAL 漏洞 / <b>{trivy?.secrets}</b> 处明文密钥。
                      我已知晓风险，坚持放行该制品（此操作将记入审计轨迹）。
                    </span>
                  </label>
                )}
                {needPromptConfirm && (
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={confirmPrompt}
                      onChange={(e) => setConfirmPrompt(e.target.checked)}
                    />
                    <span>
                      注入规则命中 <b>{promptScan?.total}</b> 处。我已逐条人工审阅上述命中内容，确认无提示词注入风险（此操作将记入审计轨迹）。
                    </span>
                  </label>
                )}
              </div>
            )}
          </div>

          {/* 私密配置 .env：只展示键名清单，值在加密凭据库中，任何角色不可见 */}
          {isMcp && Array.isArray(meta.env_keys) && meta.env_keys.length > 0 && (
            <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
              <p className="text-sm font-medium">私密配置（.env）</p>
              <p className="text-xs text-muted-foreground">
                已配置 <b>{meta.env_keys.length}</b> 个环境变量，值经 ToolHive 加密凭据库存储，
                平台全程不落明文；部署时经 <code className="font-mono">--secret</code> 注入容器。
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(meta.env_keys as string[]).map((k) => (
                  <span
                    key={k}
                    className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-1.5 text-sm font-medium text-muted-foreground">
              描述
            </p>
            <p className="whitespace-pre-wrap rounded-lg border bg-muted/20 p-3 text-base">
              {typeof meta.description === "string" && meta.description
                ? meta.description
                : "未填写"}
            </p>
          </div>

          <div className="border-t pt-3">
            <p className="text-sm text-muted-foreground">
              {isMcp
                ? "通过后进入「已发布管理」，处于未上线状态（默认仅管理员可见）。管理员需先在该条目点「上线 / 可见范围」选择范围并保存后，才解锁「部署」；部署成功后再按可见范围对普通用户开放调用。"
                : "通过后进入「已发布管理」，处于未上架状态（默认仅管理员可见）。管理员需在该条目点「上线 / 可见范围」选择范围并保存后，才对所选范围开放目录可见与下载。"}
            </p>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleReject}
            disabled={busy}
            className="text-base"
          >
            {phase === "rejecting" ? "处理中…" : "不通过"}
          </Button>
          <Button
            type="button"
            onClick={handleApprove}
            disabled={busy}
            className="text-base"
          >
            {phase === "approving" ? "处理中…" : "通过并发布"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
