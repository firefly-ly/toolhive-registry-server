"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ApproveDialog,
  type PromptScanResult,
  type TrivyResult,
} from "@/app/(app)/submissions/approve-dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { Submission } from "@/lib/platform-backend";
import { cn } from "@/lib/utils";
import { groupKey, parseMeta, versionOf } from "./group-utils";

const FILTERS: { key: "all" | "mcp" | "skill"; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "mcp", label: "MCP" },
  { key: "skill", label: "Skill" },
];

// 提交类型展示名（后端枚举为小写 mcp/skill，直出会露英文原值）
const TYPE_LABEL: Record<string, string> = { mcp: "MCP", skill: "Skill" };

function parseLoose(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

/** 扫描结果 → 圆形标记（效果图 04 SVG：对勾绿 / 叹号琥珀 / 叉红 / 上箭头灰） */
function ScanMark({ status }: { status?: string }) {
  const s = status ?? "skipped";
  if (s === "clean") {
    return (
      <svg viewBox="0 0 26 26" className="size-6.5 shrink-0" aria-hidden>
        <title>{s}</title>
        <title>{s}</title>
        <circle
          cx="13"
          cy="13"
          r="11"
          fill="#EAF3DE"
          stroke="#639922"
          strokeWidth="2"
        />
        <path
          d="M8 13l3.5 3.5L18 10"
          fill="none"
          stroke="#3B6D11"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (s === "warn") {
    return (
      <svg viewBox="0 0 26 26" className="size-6.5 shrink-0" aria-hidden>
        <title>{s}</title>
        <title>{s}</title>
        <circle
          cx="13"
          cy="13"
          r="11"
          fill="#FAEEDA"
          stroke="#EF9F27"
          strokeWidth="2"
        />
        <path
          d="M13 7v7M13 17.5v.5"
          stroke="#854F0B"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (s === "alert" || s === "critical" || s === "error") {
    return (
      <svg viewBox="0 0 26 26" className="size-6.5 shrink-0" aria-hidden>
        <title>{s}</title>
        <title>{s}</title>
        <circle
          cx="13"
          cy="13"
          r="11"
          fill="#FCEBEB"
          stroke="#F09595"
          strokeWidth="2"
        />
        <path
          d="M9 9l8 8M17 9l-8 8"
          stroke="#A32D2D"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 26 26" className="size-6.5 shrink-0" aria-hidden>
      <title>{s}</title>
      <circle
        cx="13"
        cy="13"
        r="11"
        fill="#F1EFE8"
        stroke="#B4B2A9"
        strokeWidth="2"
      />
      <path
        d="M13 18V8M13 8l-4 4M13 8l4 4"
        fill="none"
        stroke="#5F5E5A"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

const SCAN_TONE: Record<string, { label: string; cls: string }> = {
  clean: { label: "通过", cls: "border-success/40 bg-success/10 text-success" },
  warn: {
    label: "有提示",
    cls: "border-warning/40 bg-warning/10 text-warning",
  },
  alert: {
    label: "需人工确认",
    cls: "border-destructive/40 bg-destructive/10 text-destructive",
  },
  critical: {
    label: "需人工确认",
    cls: "border-destructive/40 bg-destructive/10 text-destructive",
  },
  error: {
    label: "扫描失败",
    cls: "border-destructive/40 bg-destructive/10 text-destructive",
  },
  skipped: {
    label: "无需处理",
    cls: "border-border bg-muted text-muted-foreground",
  },
};

/** 扫描卡（效果图 04 .scan 规格：标记 + 标题/副文 + 右侧结果徽章） */
function ScanCard({
  title,
  sub,
  status,
}: {
  title: string;
  sub: string;
  status?: string;
}) {
  const s = status ?? "skipped";
  const tone = SCAN_TONE[s] ?? SCAN_TONE.skipped;
  return (
    <div className="flex items-center gap-3 rounded-lg border-[1.5px] border-border p-3.5">
      <ScanMark status={s} />
      <div className="min-w-0">
        <p className="text-[15px] font-semibold">{title}</p>
        <p className="mt-0.5 truncate text-[14px] text-muted-foreground">
          {sub}
        </p>
      </div>
      <span
        className={cn(
          "ml-auto inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[14px]",
          tone.cls,
        )}
      >
        {tone.label}
      </span>
    </div>
  );
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
        <div className="min-h-0 flex-1 overflow-y-auto">
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
            const fm = parseLoose(parseMeta(first.meta));
            const fTrivy = fm.trivy as { status?: string } | undefined;
            const fScan = fm.prompt_scan as { status?: string } | undefined;
            const scanStatus =
              first.type === "mcp" ? fTrivy?.status : fScan?.status;
            return (
              <button
                key={gk}
                type="button"
                onClick={() => setSelectedId(first.id)}
                className={cn(
                  "w-full cursor-pointer border-b border-border px-4.5 py-3.5 text-left transition-colors",
                  isActive
                    ? "border-l-[3px] border-l-primary bg-card"
                    : "border-l-[3px] border-l-transparent bg-secondary/40 hover:bg-muted/50",
                )}
              >
                <b className="text-[15px] font-semibold">
                  {name}{" "}
                  <span className="font-mono text-xs font-normal text-muted-foreground">
                    {versionOf(first)}
                  </span>
                </b>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[14px]",
                      first.type === "mcp"
                        ? "border-info/40 bg-info/10 text-info"
                        : "border-success/40 bg-success/10 text-success",
                    )}
                  >
                    <span className="size-1.5 rounded-full bg-current" />
                    {TYPE_LABEL[first.type] ?? first.type}
                  </span>
                  {scanStatus && (
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md border px-2 py-0.5 text-[14px]",
                        scanStatus === "clean"
                          ? "border-success/40 bg-success/10 text-success"
                          : "border-warning/40 bg-warning/10 text-warning",
                      )}
                    >
                      {scanStatus === "clean" ? "扫描通过" : "扫描有提示"}
                    </span>
                  )}
                  <span className="inline-flex items-center rounded-md border border-border bg-muted px-2 py-0.5 text-[14px] text-muted-foreground">
                    {first.user_id} ·{" "}
                    {new Date(first.created_at).toLocaleDateString("zh-CN")}
                  </span>
                  {arr.length > 1 && (
                    <span className="ml-auto text-[14px] text-muted-foreground">
                      {arr.length} 个版本
                    </span>
                  )}
                </div>
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
                <Badge variant="outline" className="shrink-0 text-xs">
                  {TYPE_LABEL[selected.type] ?? selected.type}
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

              {/* 安全扫描（效果图 04：2×2 卡，SVG 圆形标记 + 右侧结果徽章） */}
              <div>
                <p className="mb-2.5 text-[14px] font-semibold tracking-[0.15em] text-muted-foreground">
                  安全扫描
                </p>
                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                  <ScanCard
                    title={
                      selected.type === "mcp"
                        ? "Trivy 漏洞扫描"
                        : "提示注入扫描"
                    }
                    sub={
                      selected.type === "mcp"
                        ? trivy
                          ? `CRITICAL ${trivy.critical} · HIGH ${trivy.high} · 密钥 ${trivy.secrets}`
                          : "未执行"
                        : promptScan
                          ? `${promptScan.total} 条规则命中`
                          : "未执行"
                    }
                    status={
                      selected.type === "mcp"
                        ? trivy?.status
                        : promptScan?.status
                    }
                  />
                  <ScanCard
                    title="数据源声明"
                    sub={(() => {
                      const ds = parseLoose(selMeta.data_source);
                      if (!ds.type || ds.type === "none")
                        return "未声明外部数据源";
                      return ds.type === "database"
                        ? "数据库直连（需审批隔离决策）"
                        : "HTTP API 出网";
                    })()}
                    status={(() => {
                      const ds = parseLoose(selMeta.data_source);
                      if (!ds.type || ds.type === "none") return "skipped";
                      return "warn";
                    })()}
                  />
                </div>
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
