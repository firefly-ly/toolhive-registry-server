"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Submission } from "@/lib/platform-backend";
import { cn } from "@/lib/utils";
import { ApproveDialog } from "./approve-dialog";

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "approved":
      return <Badge className="text-sm">已通过</Badge>;
    case "pending":
      return (
        <Badge variant="secondary" className="text-sm">
          待审批
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="destructive" className="text-sm">
          已拒绝
        </Badge>
      );
    case "deprecated":
      return (
        <Badge variant="outline" className="text-sm">
          已下架
        </Badge>
      );
    case "removed":
      return (
        <Badge variant="outline" className="text-sm">
          已移除
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="text-sm">
          {status}
        </Badge>
      );
  }
}

function parseMeta(meta?: string) {
  try {
    return meta ? (JSON.parse(meta) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

interface SubmissionListProps {
  submissions: Submission[];
  type?: "mcp" | "skill";
  showSearch?: boolean;
  searchPlaceholder?: string;
  showActions?: boolean;
  /** timeline = 提交履历（状态脊线时间线，用于历史提交页）；默认 table */
  variant?: "table" | "timeline";
}

function submissionSearchText(s: Submission): string {
  const meta = parseMeta(s.meta);
  return [
    meta.name || "",
    s.payload_ref,
    meta.description || "",
    s.user_id,
    s.status,
    s.type,
  ]
    .join(" ")
    .toLowerCase();
}

/** 履历脊线颜色：按状态映射（已上架绿 / 审核中琥珀 / 已拒绝红 / 其余灰） */
function spineColor(status: string): string {
  switch (status) {
    case "approved":
      return "bg-success";
    case "pending":
      return "bg-warning";
    case "rejected":
      return "bg-destructive";
    default:
      return "bg-muted-foreground/40";
  }
}

export function SubmissionList({
  submissions,
  type,
  showSearch = true,
  searchPlaceholder = "搜索名称、描述、提交者…",
  showActions = true,
  variant = "table",
}: SubmissionListProps) {
  const [query, setQuery] = useState("");

  const items = useMemo(() => {
    const base = type
      ? submissions.filter((s) => s.type === type)
      : submissions;
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((s) => submissionSearchText(s).includes(q));
  }, [submissions, type, query]);

  // 提交履历（timeline）：状态脊线时间线，已上架行直达现行详情；不设「快照」动作
  if (variant === "timeline") {
    return (
      <div className="flex flex-col">
        {showSearch && (
          <div className="mb-4">
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-10 text-base"
            />
          </div>
        )}
        {items.length === 0 && (
          <p className="py-10 text-center text-muted-foreground">
            暂无{type === "mcp" ? "MCP" : type === "skill" ? "Skill" : ""}提交
          </p>
        )}
        <div className="flex flex-col gap-3">
          {items.map((s) => {
            const meta = parseMeta(s.meta);
            const title = meta.name || s.payload_ref;
            const reason =
              s.status === "rejected"
                ? meta.reject_reason || meta.reason || ""
                : "";
            const detailHref =
              s.status === "approved"
                ? s.type === "mcp"
                  ? `/mcp/${encodeURIComponent(s.id)}`
                  : `/skills/${encodeURIComponent(s.id)}`
                : "";
            return (
              <div key={s.id} className="flex items-stretch gap-3">
                <div className="flex w-3 shrink-0 flex-col items-center pt-4">
                  <span
                    className={cn(
                      "size-2.5 shrink-0 rounded-full",
                      spineColor(s.status),
                    )}
                  />
                  <span className="w-px flex-1 bg-border" />
                </div>
                <div className="min-w-0 flex-1 rounded-lg border bg-card px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="min-w-0 flex-1 truncate text-sm font-medium"
                      title={title}
                    >
                      {title}
                    </span>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {s.type === "mcp" ? "MCP" : "Skill"}
                    </Badge>
                    <StatusBadge status={s.status} />
                  </div>
                  <div className="mt-1 truncate text-xs text-muted-foreground">
                    {s.payload_ref}
                    {meta.version ? ` · v${meta.version}` : ""} ·{" "}
                    {new Date(s.created_at).toLocaleDateString("zh-CN")}
                    {reason ? ` · ${reason}` : ""}
                  </div>
                </div>
                {detailHref && (
                  <div className="flex shrink-0 items-center pr-1">
                    <Link
                      href={detailHref}
                      className="text-sm text-primary hover:underline"
                    >
                      查看详情
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 固定高度滚动盒：min-h 强撑会冲破外层白卡边界（曾致审核队列行溢出白框），禁用
  return (
    <div className="flex h-full flex-col">
      {showSearch && (
        <div className="mb-3">
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 text-base"
          />
        </div>
      )}
      <div className="h-[520px] overflow-auto rounded-md border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead className="text-base">名称</TableHead>
              <TableHead className="text-base">描述</TableHead>
              <TableHead className="text-base">提交者</TableHead>
              <TableHead className="text-base">时间</TableHead>
              <TableHead className="text-base">状态</TableHead>
              {showActions && (
                <TableHead className="text-right text-base">操作</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={showActions ? 6 : 5}
                  className="py-10 text-center text-base text-muted-foreground"
                >
                  暂无{type === "mcp" ? "MCP" : type === "skill" ? "Skill" : ""}
                  提交
                </TableCell>
              </TableRow>
            )}
            {items.map((s) => {
              const meta = parseMeta(s.meta);
              const title = meta.name || s.payload_ref;
              const subtitle = meta.name ? s.payload_ref : undefined;

              return (
                <TableRow key={s.id}>
                  <TableCell className="text-base font-medium">
                    <div className="flex flex-col gap-0.5">
                      <span className="truncate" title={title}>
                        {title}
                      </span>
                      {subtitle && (
                        <span className="truncate text-sm text-muted-foreground">
                          {subtitle}
                        </span>
                      )}
                      <Badge
                        variant="outline"
                        className="mt-1 w-fit text-xs uppercase"
                      >
                        {s.type}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-md truncate text-base text-muted-foreground">
                    {meta.description || "—"}
                  </TableCell>
                  <TableCell className="text-base">{s.user_id}</TableCell>
                  <TableCell className="text-base text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString("zh-CN")}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={s.status} />
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      {s.status === "pending" ? (
                        <ApproveDialog submission={s} />
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          已处理
                        </span>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
