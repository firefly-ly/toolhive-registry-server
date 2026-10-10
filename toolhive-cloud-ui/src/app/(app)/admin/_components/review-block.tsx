"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ApproveDialog,
  type PromptScanResult,
  ScanBadge,
  type TrivyResult,
} from "@/app/(app)/submissions/approve-dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { Submission } from "@/lib/platform-backend";
import { cn } from "@/lib/utils";
import { groupKey, parseMeta, versionOf } from "./submission-groups";

const FILTERS: { key: "all" | "mcp" | "skill"; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "mcp", label: "MCP" },
  { key: "skill", label: "Skill" },
];

function parseLoose(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

/**
 * 审核队列「指挥台」：双栏 master-detail。
 * 左栏 = 按产品分组的待审队列（点击选中组）；右栏 = 所选版本的制品档案摘要，
 * 完整审批流（扫描详情/两段式豁免/通过与拒绝）复用 ApproveDialog 弹窗，零逻辑分叉。
 */
export function ReviewBlock({ pending }: { pending: Submission[] }) {
  const [filter, setFilter] = useState<"all" | "mcp" | "skill">("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const groups = useMemo(() => {
    const base =
      filter === "all" ? pending : pending.filter((s) => s.type === filter);
    const q = query.trim().toLowerCase();
    const filtered = q
      ? base.filter((s) =>
          [parseMeta(s.meta).name || "", s.payload_ref, s.user_id]
            .join(" ")
            .toLowerCase()
            .includes(q),
        )
      : base;
    const map = new Map<string, Submission[]>();
    for (const s of filtered) {
      const gk = groupKey(s);
      const arr = map.get(gk) || [];
      arr.push(s);
      map.set(gk, arr);
    }
    // 组内按提交时间倒序；组间按组内最新提交倒序
    for (const arr of map.values()) {
      arr.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    }
    return [...map.entries()].sort(
      (a, b) => +new Date(b[1][0].created_at) - +new Date(a[1][0].created_at),
    );
  }, [pending, filter, query]);

  const items = useMemo(() => groups.flatMap(([, arr]) => arr), [groups]);

  // 选中项维护：默认选第一组最新版本；审批/拒绝刷新后所选项出队则回落
  useEffect(() => {
    if (items.length === 0) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    if (!selectedId || !items.some((s) => s.id === selectedId)) {
      setSelectedId(items[0].id);
    }
  }, [items, selectedId]);

  const selected = items.find((s) => s.id === selectedId) ?? null;
  const selectedGroup = selected
    ? (groups.find(([, arr]) => arr.some((s) => s.id === selected.id)) ?? null)
    : null;

  const selMeta = useMemo(
    () => (selected ? parseLoose(parseMeta(selected.meta)) : {}),
    [selected],
  );
  const trivy = selMeta.trivy as TrivyResult | undefined;
  const promptScan =
    selected?.type === "skill"
      ? (selMeta.prompt_scan as PromptScanResult | undefined)
      : undefined;

  if (pending.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium">队列为空</p>
          <p className="mt-1 text-sm text-muted-foreground">
            所有提交都已处理完毕，新提交会实时出现在这里
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(300px,2fr)_minmax(460px,3fr)]">
      {/* 左栏：分组队列 */}
      <div className="flex min-h-0 flex-col rounded-xl border bg-card">
        <div className="space-y-2.5 border-b p-3">
          <Input
            type="text"
            placeholder="搜索产品、引用、提交者…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 bg-card"
          />
          <div className="inline-flex rounded-lg bg-muted p-1">
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  "cursor-pointer rounded-md px-3 py-1 text-sm transition-colors",
                  filter === key
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {groups.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              没有匹配的提交
            </p>
          )}
          {groups.map(([gk, arr]) => {
            const first = arr[0];
            const name = parseMeta(first.meta).name || gk;
            const isActive =
              selected != null && arr.some((s) => s.id === selected.id);
            return (
              <button
                key={gk}
                type="button"
                onClick={() => setSelectedId(first.id)}
                className={cn(
                  "w-full cursor-pointer rounded-lg border p-3 text-left transition-colors",
                  isActive
                    ? "border-primary/40 bg-primary/5"
                    : "border-transparent hover:border-border hover:bg-muted/40",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="min-w-0 truncate text-sm font-medium">
                    {name}
                  </span>
                  <Badge
                    variant="outline"
                    className="shrink-0 text-[11px] uppercase"
                  >
                    {first.type}
                  </Badge>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {arr.length} 个版本
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {versionOf(first)} · {first.user_id} ·{" "}
                  {new Date(first.created_at).toLocaleDateString("zh-CN")}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 右栏：制品档案 */}
      <div className="flex min-h-0 flex-col rounded-xl border bg-card">
        {!selected ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              从左侧选择一个提交查看档案
            </p>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-medium">
                    {String(selMeta.name || selected.payload_ref)}
                  </h3>
                  <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                    {selected.payload_ref}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 text-xs uppercase">
                  {selected.type}
                </Badge>
              </div>

              {/* 同产品多版本时提供版本切换 */}
              {selectedGroup && selectedGroup[1].length > 1 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">版本</span>
                  {selectedGroup[1].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedId(s.id)}
                      className={cn(
                        "cursor-pointer rounded-md border px-2 py-0.5 font-mono text-xs transition-colors",
                        s.id === selected.id
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "text-muted-foreground hover:border-border hover:text-foreground",
                      )}
                    >
                      {versionOf(s)}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">提交者</p>
                  <p className="mt-0.5 truncate">{selected.user_id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">提交时间</p>
                  <p className="mt-0.5">
                    {new Date(selected.created_at).toLocaleString("zh-CN", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">产品标识</p>
                  <p className="mt-0.5 truncate font-mono text-xs">
                    {String(selMeta.group_key || "—")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">版本号</p>
                  <p className="mt-0.5 font-mono text-xs">
                    {String(selMeta.version || "—")}
                  </p>
                </div>
                {selected.type === "mcp" ? (
                  <>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">镜像引用</p>
                      <p className="mt-0.5 break-all font-mono text-xs">
                        {String(selMeta.image_ref || "—")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">传输协议</p>
                      <p className="mt-0.5">
                        {String(selMeta.transport || "自动检测")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">数据源</p>
                      <p className="mt-0.5">
                        {(() => {
                          const ds = parseLoose(selMeta.data_source);
                          if (!ds.type || ds.type === "none") return "未声明";
                          return ds.type === "database"
                            ? "数据库直连"
                            : "HTTP API";
                        })()}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">制品来源</p>
                    <p className="mt-0.5 break-all font-mono text-xs">
                      {typeof selMeta.source_url === "string" &&
                      selMeta.source_url
                        ? selMeta.source_url
                        : typeof selMeta.artifact_key === "string" &&
                            selMeta.artifact_key
                          ? "已上传至平台存储"
                          : "—"}
                    </p>
                  </div>
                )}
              </div>

              {typeof selMeta.description === "string" &&
                selMeta.description && (
                  <p className="rounded-lg bg-muted/40 p-3 text-sm leading-relaxed">
                    {selMeta.description}
                  </p>
                )}

              <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  安全扫描
                </p>
                <ScanBadge
                  label="镜像漏洞"
                  status={trivy?.status}
                  extra={
                    trivy
                      ? `CRITICAL ${trivy.critical} · HIGH ${trivy.high} · 密钥 ${trivy.secrets}`
                      : undefined
                  }
                />
                {selected.type === "skill" && (
                  <ScanBadge
                    label="注入规则"
                    status={promptScan?.status}
                    extra={promptScan ? `命中 ${promptScan.total}` : undefined}
                  />
                )}
              </div>
            </div>

            {/* 吸附动作条：完整审批流在弹窗内（扫描详情/豁免勾选/拒绝入口） */}
            <div className="flex items-center gap-3 border-t p-3">
              <p className="text-xs text-muted-foreground">
                通过 / 拒绝 / 豁免确认均在审批弹窗内操作
              </p>
              <div className="ml-auto">
                <ApproveDialog
                  submission={selected}
                  triggerLabel="审查并审批"
                  triggerClassName="h-9 px-5"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
