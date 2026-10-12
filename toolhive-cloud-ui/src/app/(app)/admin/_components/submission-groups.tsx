"use client";

import { Eye } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmForm } from "@/components/confirm-form";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Submission } from "@/lib/platform-backend";
import { cn } from "@/lib/utils";
import {
  deploySubmissionAction,
  rotateMcpTokenAction,
  setLifecycleAction,
  syncRegistryAction,
  undeploySubmissionAction,
} from "../../submissions/actions";
import {
  DEPLOY_LABEL,
  groupKey,
  isOnShelf,
  isRestricted,
  parseMeta,
  REGISTRY_LABEL,
  REGISTRY_TONE,
  versionOf,
} from "./group-utils";
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

/** 类型色图标块：MCP 蓝（双环扣）/ Skill 青绿（旋转方块） */
function GroupGlyph({ isMcp }: { isMcp: boolean }) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg",
        isMcp ? "bg-info/10" : "bg-success/10",
      )}
    >
      {isMcp ? (
        <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="7" cy="10" r="4.5" fill="hsl(var(--info))" />
          <circle
            cx="13"
            cy="10"
            r="4.5"
            fill="hsl(var(--info))"
            fillOpacity="0.5"
          />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
          <rect
            x="4.5"
            y="4.5"
            width="11"
            height="11"
            rx="2.5"
            transform="rotate(45 10 10)"
            fill="hsl(var(--success))"
          />
        </svg>
      )}
    </span>
  );
}

/** 版本胶囊：上架中实心 / 已下架虚线 / 未上线警示（产品货架的「货格」） */
function VersionPill({ s }: { s: Submission }) {
  const onShelf = isOnShelf(s);
  const deprecated = s.status === "deprecated";
  if (deprecated) {
    return (
      <span className="rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground">
        {versionOf(s)} · 已下架
      </span>
    );
  }
  if (!onShelf) {
    return (
      <span className="rounded-full border border-warning/50 bg-warning/10 px-3 py-1 text-xs text-warning">
        {versionOf(s)} · 未上线
      </span>
    );
  }
  return (
    <span className="rounded-full border border-success/40 bg-success/10 px-3 py-1 text-xs font-medium text-success">
      {versionOf(s)} · 上架中
    </span>
  );
}

export function GroupRow({
  group_key,
  items,
}: {
  group_key: string;
  items: Submission[];
}) {
  // 组内最新一条作为卡片基础版本（列表已按创建时间倒序）；用户侧版本由下拉自选
  const activeItem = items[0];
  const isMcp = activeItem.type === "mcp";
  const meta = parseMeta(activeItem.meta);
  const title = meta.name || activeItem.payload_ref;

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <GroupGlyph isMcp={isMcp} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium" title={title}>
                  {title}
                </span>
                <Badge variant="outline" className="shrink-0 text-xs">
                  {isMcp ? "MCP" : "Skill"}
                </Badge>
                {activeItem.status === "deprecated" && (
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    已下架
                  </Badge>
                )}
                {isRestricted(activeItem) && (
                  <Badge variant="secondary" className="shrink-0 gap-1 text-xs">
                    <Eye className="size-3" />
                    受限可见
                  </Badge>
                )}
              </div>
              <div className="truncate text-sm text-muted-foreground">
                {group_key} · 提交者 {activeItem.user_id}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <VersionActions s={activeItem} />
          </div>
        </div>

        {/* 版本胶囊行：每格一个版本的状态一览 */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {items.map((s) => (
            <VersionPill key={s.id} s={s} />
          ))}
        </div>

        <details className="mt-3 group">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
            版本操作（部署 / 下架 / 删除…）
          </summary>
          <div className="mt-3 space-y-2 border-t pt-3">
            {items.map((s) => (
              <VersionRow key={s.id} s={s} />
            ))}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

export function VersionRow({ s }: { s: Submission }) {
  const meta = parseMeta(s.meta);
  const isMcp = s.type === "mcp";
  const deploy = meta.deploy_status || "unborn";
  const deployTone =
    deploy === "deployed"
      ? "default"
      : deploy === "failed"
        ? "destructive"
        : "secondary";
  const regSync = meta.registry_synced || "";
  const regTone = REGISTRY_TONE[regSync] ?? "secondary";
  const regLabel = REGISTRY_LABEL[regSync] ?? regSync;

  return (
    <div className="flex flex-col gap-2 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{versionOf(s)}</span>
          {isMcp && (
            <Badge
              variant={deployTone as "default" | "destructive" | "secondary"}
              className="text-xs"
            >
              {DEPLOY_LABEL[deploy] ?? deploy}
            </Badge>
          )}
          <Badge
            variant={regTone as "default" | "destructive" | "secondary"}
            className="text-xs"
          >
            Registry：{regLabel}
          </Badge>
          {s.status === "deprecated" && (
            <Badge variant="secondary" className="text-xs">
              已下架
            </Badge>
          )}
          {!isOnShelf(s) && (
            <Badge
              variant="outline"
              className="border-warning/50 text-warning text-xs font-medium"
            >
              未上线
            </Badge>
          )}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {s.payload_ref} · {s.id}
        </div>
        {regSync === "error" && meta.registry_sync_error && (
          <div
            className="truncate text-xs text-destructive"
            title={meta.registry_sync_error}
          >
            {meta.registry_sync_error.slice(0, 60)}
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {/* 2026-09-08：激活指针已废弃（用户侧版本下拉自选已上架版本，目录默认展示最新已上架），
            原 Skill「设为默认版本」按钮一并移除。 */}
        {/* 该条目的审计轨迹：跳到审计 tab 并按对象 ID 预过滤 */}
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
      {/* 按钮顺序：可见范围 → 轮换 Token(仅MCP) → 下架/恢复上架 → 下线/恢复上线 → 重新同步 → 删除(固定在最后) */}
      <VisibilityDialog s={s} />
      {isMcp && (
        <ConfirmForm
          action={rotateMcpTokenAction}
          fields={{ id: s.id }}
          title="确认轮换 Token？"
          description="将生成新的代理访问令牌，旧 Token 立即作废——所有已复制到客户端的接入配置会立刻失效（401），需要重新复制配置。仅影响该 MCP，其他条目不受影响。"
          confirmText="确认轮换"
          successToast="Token 已轮换"
          successDescription="旧令牌已作废，请在各客户端重新复制接入配置"
        >
          轮换 Token
        </ConfirmForm>
      )}
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
