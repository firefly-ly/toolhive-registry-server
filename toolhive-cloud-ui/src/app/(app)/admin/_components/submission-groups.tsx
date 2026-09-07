"use client";

import { useMemo, useState } from "react";
import { Eye } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmForm } from "@/components/confirm-form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Submission } from "@/lib/platform-backend";
import {
  activateVersionAction,
  deploySubmissionAction,
  setLifecycleAction,
  syncRegistryAction,
  undeploySubmissionAction,
} from "../../submissions/actions";
import { VisibilityDialog } from "./visibility-dialog";

export const DEPLOY_LABEL: Record<string, string> = {
  unborn: "未部署",
  deploying: "部署中…",
  deployed: "运行中",
  failed: "部署失败",
  undeployed: "已下线",
};

export const REGISTRY_LABEL: Record<string, string> = {
  published: "已同步",
  error: "同步失败",
  "skipped:no-endpoint": "待部署",
  deleted: "已移除",
  "delete-error": "移除失败",
  "": "未同步",
};

export const REGISTRY_TONE: Record<
  string,
  "default" | "destructive" | "secondary"
> = {
  published: "default",
  error: "destructive",
  "skipped:no-endpoint": "secondary",
  deleted: "secondary",
  "delete-error": "destructive",
  "": "secondary",
};

export function parseMeta(meta?: string): Record<string, string> {
  try {
    return meta ? (JSON.parse(meta) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

// 条目是否配置了"仅指定成员/组可见"（管理员在发布时设置）
export function isRestricted(s: Submission): boolean {
  try {
    const meta = s.meta ? (JSON.parse(s.meta) as Record<string, unknown>) : {};
    const v = meta.visibility as { mode?: string } | undefined;
    return v?.mode === "restricted";
  } catch {
    return false;
  }
}

// 条目是否已「上线」：管理员显式保存过可见范围(visibility_configured=true)才上线。
// 存量条目无该字段 → 视为已上线（后端向后兼容）；新提交默认 false → 未上线（待配可见范围）。
export function isOnShelf(s: Submission): boolean {
  try {
    const meta = s.meta ? (JSON.parse(s.meta) as Record<string, unknown>) : {};
    return meta.visibility_configured !== false;
  } catch {
    return true;
  }
}

export function groupKey(s: Submission): string {
  return parseMeta(s.meta).group_key || s.id;
}

export function versionOf(s: Submission): string {
  return parseMeta(s.meta).version || "1.0.0";
}

export function buildGroups(published: Submission[]) {
  const groups = new Map<string, Submission[]>();
  published.forEach((s) => {
    const gk = groupKey(s);
    const arr = groups.get(gk) || [];
    arr.push(s);
    groups.set(gk, arr);
  });
  for (const arr of groups.values()) {
    arr.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  }
  return groups;
}

export function GroupRow({
  group_key,
  items,
  activeId,
}: {
  group_key: string;
  items: Submission[];
  activeId?: string;
}) {
  const activeItem = items.find((s) => s.id === activeId) || items[0];
  const isMcp = activeItem.type === "mcp";
  const meta = parseMeta(activeItem.meta);
  const title = meta.name || activeItem.payload_ref;

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium">{title}</span>
              <Badge variant="outline" className="text-xs">
                {isMcp ? "MCP" : "Skill"}
              </Badge>
              <Badge variant="default" className="text-xs">
                激活：{versionOf(activeItem)}
              </Badge>
              {activeItem.status === "deprecated" && (
                <Badge variant="secondary" className="text-xs">
                  已下架
                </Badge>
              )}
              {isRestricted(activeItem) && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Eye className="size-3" />
                  受限可见
                </Badge>
              )}
              {!isOnShelf(activeItem) && (
                <Badge
                  variant="outline"
                  className="gap-1 border-amber-500/50 text-amber-600 text-xs"
                >
                  未上线
                </Badge>
              )}
            </div>
            <div className="truncate text-sm text-muted-foreground">
              {group_key} · 共 {items.length} 个版本 · 提交者{" "}
              {activeItem.user_id}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <VersionActions s={activeItem} />
          </div>
        </div>

        <details className="mt-4 group">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
            查看所有版本
          </summary>
          <div className="mt-3 space-y-2 border-t pt-3">
            {items.map((s) => (
              <VersionRow
                key={s.id}
                s={s}
                active={s.id === activeId}
                group_key={group_key}
              />
            ))}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

export function VersionRow({
  s,
  active,
  group_key,
}: {
  s: Submission;
  active: boolean;
  group_key: string;
}) {
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
          {active && (
            <Badge variant="default" className="text-xs">
              当前激活
            </Badge>
          )}
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
              className="border-amber-500/50 text-amber-600 text-xs"
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
        {/*
          仅 Skill 提供「设为默认版本」：Skill 下载是按 group 的激活版本派发的，
          指针切换即生效。MCP 是运行中的服务，其对外版本由实际部署（部署/下线）决定，
          仅靠改 DB 指针不会真正切换运行实例，反而可能把正在运行的版本从目录藏起来、
          展示一个未部署的版本。因此 MCP 不暴露此按钮，版本切换请用「部署/下线」。
        */}
        {!active && s.status === "approved" && !isMcp && (
          <form action={activateVersionAction}>
            <input type="hidden" name="group_key" value={group_key} />
            <input type="hidden" name="id" value={s.id} />
            <Button type="submit" variant="outline" size="sm">
              设为默认版本
            </Button>
          </form>
        )}
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
      {isMcp && (deploy === "unborn" || deploy === "failed") && canToggleRun && (
        <form action={deploySubmissionAction}>
          <input type="hidden" name="id" value={s.id} />
          <Button type="submit" variant="outline" size="sm">
            部署
          </Button>
        </form>
      )}
      {isMcp && (deploy === "unborn" || deploy === "failed") && !onShelf && (
        <span className="inline-flex items-center gap-1 text-xs text-amber-600">
          待配置可见范围后
        </span>
      )}
      {/* 按钮顺序：可见范围 → 下架/恢复上架 → 下线/恢复上线 → 重新同步 → 删除(固定在最后) */}
      <VisibilityDialog s={s} />
      {!deprecated && (
        <ConfirmForm
          action={setLifecycleAction}
          fields={{ id: s.id, status: "deprecated" }}
          title="确认下架？"
          description="仅从 Registry 目录移除，对用户隐藏；运行实例继续保留，恢复上架后无需重新部署。提交记录保留，可通过「恢复 / 上架」重新显示。"
          confirmText="确认下架"
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
            >
              下线
            </ConfirmForm>
          )}
          {/* 下线后的回滚：已 undeployed 显示「恢复上线」 */}
          {deploy === "undeployed" && canToggleRun && (
            <form action={deploySubmissionAction}>
              <input type="hidden" name="id" value={s.id} />
              <Button type="submit" variant="outline" size="sm">
                恢复上线
              </Button>
            </form>
          )}
        </>
      )}
      {canResync && (
        <form action={syncRegistryAction}>
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
  const statusLabel =
    s.status === "removed" ? "已删除" : s.status === "rejected" ? "已拒绝" : s.status;
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 py-4">
        <div className="min-w-0">
          <div className="truncate font-medium">
            {meta.name || s.payload_ref}{" "}
            <span className="text-xs text-muted-foreground">
              ({versionOf(s)})
            </span>
          </div>
          <div className="truncate text-sm text-muted-foreground">
            {s.payload_ref} · {s.type} · 提交者 {s.user_id}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="shrink-0 text-sm text-muted-foreground">
            {isMcp ? `${DEPLOY_LABEL[deploy] ?? deploy} · ` : ""}
            {statusLabel}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function groupSearchText(
  group_key: string,
  items: Submission[],
  activeId?: string,
): string {
  const activeItem = items.find((s) => s.id === activeId) || items[0];
  const meta = parseMeta(activeItem.meta);
  const title = meta.name || activeItem.payload_ref;
  const parts = [
    group_key,
    title,
    activeItem.payload_ref,
    activeItem.user_id,
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
  activeMap,
  placeholder = "搜索分组、版本、提交者…",
}: {
  groups: [string, Submission[]][];
  activeMap: Record<string, string>;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(([gk, items]) =>
      groupSearchText(gk, items, activeMap[gk]).includes(q),
    );
  }, [groups, query, activeMap]);

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
          <GroupRow
            key={gk}
            group_key={gk}
            items={items}
            activeId={activeMap[gk]}
          />
        ))}
      </div>
    </div>
  );
}
