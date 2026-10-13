"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmForm } from "@/components/confirm-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Submission } from "@/lib/platform-backend";
import { cn } from "@/lib/utils";
import {
  deploySubmissionAction,
  setLifecycleAction,
  syncRegistryAction,
  undeploySubmissionAction,
} from "../../submissions/actions";
import {
  DEPLOY_LABEL,
  isOnShelf,
  parseMeta,
  REGISTRY_LABEL,
  versionOf,
} from "./group-utils";
import { MemberTokenDialog } from "./member-token-dialog";
import { VisibilityDialog } from "./visibility-dialog";

// 给裸 form 的写操作 Server Action 包一层成功 toast。
// 约定：action 成功返回 { ok: true }；失败在 action 内部 redirect 携带 error 参数
// （由 admin 页统一弹错误 toast），此处不处理失败分支。
function withActionToast(
  action: (formData: FormData) => Promise<unknown>,
  message: string,
  description?: string,
) {
  return async (formData: FormData) => {
    const res = (await action(formData)) as { ok?: boolean } | undefined;
    if (res?.ok) {
      toast.success(message, description ? { description } : undefined);
    }
  };
}

/* ---------------- 效果图 05 徽章（.bdg 规格） ---------------- */

const BDG_TONE: Record<string, string> = {
  ok: "border-[#97C459] bg-[#EAF3DE] text-[#3B6D11]",
  warn: "border-[#EF9F27] bg-[#FAEEDA] text-[#854F0B]",
  err: "border-[#F09595] bg-[#FCEBEB] text-[#A32D2D]",
  mut: "border-[#D3D1C7] bg-[#F1EFE8] text-[#5F5E5A]",
  blue: "border-[#85B7EB] bg-[#E6F1FB] text-[#0C447C]",
};

function Bdg({
  tone,
  dot,
  children,
}: {
  tone: keyof typeof BDG_TONE;
  dot?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 whitespace-nowrap rounded-[7px] border px-3 py-1 text-[14px]",
        BDG_TONE[tone],
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

const DEPLOY_TONE: Record<string, "ok" | "warn" | "err" | "mut"> = {
  deployed: "ok",
  deploying: "warn",
  failed: "err",
  undeployed: "mut",
  unborn: "mut",
};
const DEPLOY_DOT: Record<string, boolean> = {
  deployed: true,
  deploying: true,
  failed: true,
  undeployed: false,
  unborn: false,
};
const REG_TONE: Record<string, "ok" | "err" | "mut"> = {
  published: "ok",
  error: "err",
  "delete-error": "err",
  deleted: "mut",
  "skipped:no-endpoint": "mut",
  "": "mut",
};

/** 相对时间（效果图「张三 · 今天」行） */
function relTime(iso: string): string {
  const diff = Date.now() - +new Date(iso);
  if (Number.isNaN(diff)) return "";
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d === 1) return "昨天";
  if (d < 7) return `${d} 天前`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w} 周前`;
  return new Date(iso).toLocaleDateString("zh-CN");
}

/** 组卡（效果图 05：1.5px 黑框 11px 圆角，奶白组头 + 版本行表） */
export function GroupRow({
  group_key,
  items,
}: {
  group_key: string;
  items: Submission[];
}) {
  // 组内最新一条作为卡片基础版本（列表已按创建时间倒序）
  const activeItem = items[0];
  const isMcp = activeItem.type === "mcp";
  const meta = parseMeta(activeItem.meta);
  const title = meta.name || activeItem.payload_ref;
  const latestOnShelf = isOnShelf(activeItem);
  const hasSyncError = items.some(
    (s) => parseMeta(s.meta).registry_synced === "error",
  );
  const latestDeploy = meta.deploy_status || "unborn";
  const canDeployLatest =
    isMcp &&
    latestOnShelf &&
    (latestDeploy === "unborn" || latestDeploy === "failed");

  return (
    <div className="overflow-hidden rounded-[11px] border-[1.5px] border-foreground">
      {/* 组头：名称 + 类型/状态徽章 + 右侧组级操作 */}
      <div className="flex flex-wrap items-center gap-3 border-b-[1.5px] border-border bg-[#FBFBF7] px-6 py-[18px]">
        <b className="text-[18px] font-bold" title={title}>
          {title}
        </b>
        <Bdg tone={isMcp ? "blue" : "ok"}>{isMcp ? "MCP" : "SKILL"}</Bdg>
        {!latestOnShelf ? (
          <Bdg tone="warn" dot>
            未上线 · 待配可见范围
          </Bdg>
        ) : hasSyncError ? (
          <Bdg tone="err" dot>
            同步失败
          </Bdg>
        ) : (
          <Bdg tone="mut">{items.length} 个版本</Bdg>
        )}
        <span className="hidden truncate font-mono text-[14px] text-[#9A9A94] lg:inline">
          {group_key}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {canDeployLatest && (
            <form
              action={withActionToast(
                deploySubmissionAction,
                "已开始部署",
                "部署约需 1~3 分钟，状态将自动刷新",
              )}
            >
              <input type="hidden" name="id" value={activeItem.id} />
              <Button
                type="submit"
                size="sm"
                className="border-[#639922] bg-[#639922] text-white hover:bg-[#54821C]"
              >
                部署最新版
              </Button>
            </form>
          )}
          {hasSyncError && (
            <form
              action={withActionToast(
                syncRegistryAction,
                "已触发同步",
                "同步结果以条目上的 Registry 徽章为准",
              )}
            >
              <input type="hidden" name="id" value={activeItem.id} />
              <Button type="submit" size="sm" variant="outline">
                重试同步
              </Button>
            </form>
          )}
          <VisibilityDialog s={activeItem} />
        </div>
      </div>

      {/* 版本行表 */}
      <div className="py-1">
        {items.map((s) => (
          <VersionRow key={s.id} s={s} />
        ))}
      </div>
    </div>
  );
}

/** 版本行（效果图 05 表格行：版本 | 部署 | 同步 | 提交者·时间 | 操作） */
export function VersionRow({ s }: { s: Submission }) {
  const meta = parseMeta(s.meta);
  const isMcp = s.type === "mcp";
  const deploy = meta.deploy_status || "unborn";
  const regSync = meta.registry_synced || "";
  const onShelf = isOnShelf(s);
  const deprecated = s.status === "deprecated";

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-3 py-[11px] text-[15px] last:border-b-0">
      <span className="w-[124px] shrink-0 font-mono">{versionOf(s)}</span>
      {isMcp && (
        <span className="w-[148px] shrink-0">
          <Bdg tone={DEPLOY_TONE[deploy] ?? "mut"} dot={DEPLOY_DOT[deploy]}>
            {DEPLOY_LABEL[deploy] ?? deploy}
          </Bdg>
        </span>
      )}
      <span className="w-[148px] shrink-0">
        <Bdg tone={REG_TONE[regSync] ?? "mut"} dot={regSync === "error"}>
          {REGISTRY_LABEL[regSync] ?? (regSync || "未同步")}
        </Bdg>
      </span>
      {!onShelf && <Bdg tone="blue">仅管理员可见</Bdg>}
      {deprecated && <Bdg tone="mut">已下架</Bdg>}
      {!isMcp && !onShelf && (
        <span className="hidden min-w-0 text-[14px] text-[#9A9A94] xl:inline">
          通过后需先配置可见范围，才对所选范围开放目录可见与下载
        </span>
      )}
      <span className="shrink-0 text-muted-foreground">
        {s.user_id} · {relTime(s.created_at)}
      </span>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        <Link
          href={`/admin?tab=audit&target_id=${encodeURIComponent(s.id)}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          审计
        </Link>
        <VersionActions s={s} />
      </div>
    </div>
  );
}

export function VersionActions({ s }: { s: Submission }) {
  const meta = parseMeta(s.meta);
  const isMcp = s.type === "mcp";
  const deploy = meta.deploy_status || "unborn";
  const regSync = meta.registry_synced || "";
  const canResync =
    s.status === "approved" &&
    regSync !== "published" &&
    regSync !== "deleted" &&
    regSync !== "delete-error";
  // 已下架（deprecated）时，用「恢复 / 上架」回滚，不再显示「下架」按钮
  const deprecated = s.status === "deprecated";
  // 上线门禁：未配置可见范围(visibility_configured=false)时，禁止 部署/恢复上线/下线
  const onShelf = isOnShelf(s);
  const canToggleRun = isMcp && onShelf;

  return (
    <>
      {/* 「部署」(首次/失败重试)单独放在最前，独立于「下线/恢复上线」运行态切换 */}
      {isMcp &&
        (deploy === "unborn" || deploy === "failed") &&
        canToggleRun && (
          <form
            action={withActionToast(
              deploySubmissionAction,
              "已开始部署",
              "部署约需 1~3 分钟，状态将自动刷新",
            )}
          >
            <input type="hidden" name="id" value={s.id} />
            <Button type="submit" variant="outline" size="sm">
              部署
            </Button>
          </form>
        )}
      {isMcp && (deploy === "unborn" || deploy === "failed") && !onShelf && (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-warning">
          待配置可见范围后
        </span>
      )}
      {/* 按钮顺序：可见范围 → Token 管理(仅MCP，包级轮换+成员签发/轮换/吊销) → 下架/恢复上架 → 下线/恢复上线 → 重新同步 → 删除(固定在最后) */}
      <VisibilityDialog s={s} />
      {isMcp && <MemberTokenDialog s={s} />}
      {!deprecated && (
        <ConfirmForm
          action={setLifecycleAction}
          fields={{ id: s.id, status: "deprecated" }}
          title="确认下架？"
          description="仅从 Registry 目录移除，对用户隐藏；运行实例继续保留，恢复上架后无需重新部署。提交记录保留，可通过「恢复 / 上架」重新显示。"
          confirmText="确认下架"
          successToast="已下架"
          successDescription="条目已从目录隐藏，运行实例保留；可随时恢复上架"
        >
          下架
        </ConfirmForm>
      )}
      {deprecated && (
        <ConfirmForm
          action={setLifecycleAction}
          fields={{ id: s.id, status: "approved" }}
          title="确认恢复 / 上架？"
          description="将把该条目重新对用户开放，回滚此前的下架操作。"
          confirmText="确认恢复"
          successToast="已恢复上架"
          successDescription="条目已重新在目录对用户开放"
        >
          恢复 / 上架
        </ConfirmForm>
      )}
      {isMcp && (deploy === "deployed" || deploy === "undeployed") && (
        <>
          {deploy === "deployed" && canToggleRun && (
            <ConfirmForm
              action={undeploySubmissionAction}
              fields={{ id: s.id }}
              title="确认下线该 MCP？"
              description="将停止当前运行实例、释放容器，但保留 Registry 目录条目（MCP 界面仍可见）。提交记录保留，可随时通过「恢复上线」重新部署。"
              confirmText="确认下线"
              successToast="已下线"
              successDescription="运行实例已停止；可随时恢复上线"
            >
              下线
            </ConfirmForm>
          )}
          {/* 下线后的回滚：已 undeployed 显示「恢复上线」 */}
          {deploy === "undeployed" && canToggleRun && (
            <form
              action={withActionToast(
                deploySubmissionAction,
                "已恢复上线",
                "正在启动部署，状态将自动刷新",
              )}
            >
              <input type="hidden" name="id" value={s.id} />
              <Button type="submit" variant="outline" size="sm">
                恢复上线
              </Button>
            </form>
          )}
        </>
      )}
      {canResync && (
        <form
          action={withActionToast(
            syncRegistryAction,
            "已触发同步",
            "同步结果以条目上的 Registry 徽章为准",
          )}
        >
          <input type="hidden" name="id" value={s.id} />
          <Button type="submit" variant="outline" size="sm">
            重新同步
          </Button>
        </form>
      )}
      {/* 删除固定在最后面 */}
      <ConfirmForm
        action={setLifecycleAction}
        fields={{ id: s.id, status: "removed" }}
        variant="destructive"
        title="确认删除？"
        description="删除将：从 Registry 移除目录条目、停止并销毁运行实例、清理制品文件。此操作不可回滚，删除后无法恢复，请谨慎确认。"
        confirmText="确认删除"
        destructive
        successToast="已删除"
        successDescription="目录条目、运行实例与制品文件均已清理"
      >
        删除
      </ConfirmForm>
    </>
  );
}

function retiredSearchText(s: Submission): string {
  const meta = parseMeta(s.meta);
  return [
    meta.name || "",
    s.payload_ref,
    s.user_id,
    s.type,
    s.status,
    meta.description || "",
  ]
    .join(" ")
    .toLowerCase();
}

export function SearchableRetiredList({
  retired,
  placeholder = "搜索名称、提交者、状态…",
}: {
  retired: Submission[];
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return retired;
    return retired.filter((s) => retiredSearchText(s).includes(q));
  }, [retired, query]);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3">
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-10 text-base"
        />
      </div>
      <div className="flex-1 space-y-3 overflow-auto">
        {filtered.length === 0 && (
          <p className="text-base text-muted-foreground">没有匹配的记录</p>
        )}
        {filtered.map((s) => (
          <RetiredRow key={s.id} s={s} />
        ))}
      </div>
    </div>
  );
}

export function RetiredRow({ s }: { s: Submission }) {
  const meta = parseMeta(s.meta);
  const isMcp = s.type === "mcp";
  const deploy = meta.deploy_status || "unborn";
  // 此区域当前仅展示 removed / rejected；deprecated 已迁移到「已发布」区域管理
  const rejected = s.status === "rejected";
  const statusLabel = rejected ? "已拒绝" : "已删除";
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-md border bg-card px-4 py-3",
        rejected ? "border-l-[3px] border-l-destructive" : "border-l-[3px]",
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="truncate font-medium"
            title={meta.name || s.payload_ref}
          >
            {meta.name || s.payload_ref}
          </span>
          <span
            className={cn(
              "shrink-0 rounded px-1.5 py-0.5 text-xs font-medium",
              rejected
                ? "bg-destructive/10 text-destructive"
                : "bg-muted text-muted-foreground",
            )}
          >
            {statusLabel}
          </span>
        </div>
        <div className="truncate text-sm text-muted-foreground">
          {s.payload_ref} ·{" "}
          {isMcp ? `${DEPLOY_LABEL[deploy] ?? deploy} · ` : ""}
          提交者 {s.user_id} ·{" "}
          {new Date(s.created_at).toLocaleDateString("zh-CN")}
        </div>
      </div>
      <span className="shrink-0 font-mono text-xs text-muted-foreground">
        {versionOf(s)}
      </span>
    </div>
  );
}

function groupSearchText(group_key: string, items: Submission[]): string {
  const base = items[0];
  const meta = parseMeta(base.meta);
  const title = meta.name || base.payload_ref;
  const parts = [
    group_key,
    title,
    base.payload_ref,
    base.user_id,
    ...items.map((s) => {
      const m = parseMeta(s.meta);
      return [m.name || "", m.version || "", s.payload_ref, s.user_id].join(
        " ",
      );
    }),
  ];
  return parts.join(" ").toLowerCase();
}

export function SearchableGroupList({
  groups,
  placeholder = "搜索分组、版本、提交者…",
}: {
  groups: [string, Submission[]][];
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(([gk, items]) =>
      groupSearchText(gk, items).includes(q),
    );
  }, [groups, query]);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3">
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-10 text-base"
        />
      </div>
      <div className="flex-1 space-y-3 overflow-auto">
        {filtered.length === 0 && (
          <p className="text-base text-muted-foreground">没有匹配的分组</p>
        )}
        {filtered.map(([gk, items]) => (
          <GroupRow key={gk} group_key={gk} items={items} />
        ))}
      </div>
    </div>
  );
}
