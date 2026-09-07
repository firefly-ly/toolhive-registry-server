"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { Submission } from "@/lib/platform-backend";
import { ApproveDialog } from "./approve-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "approved":
      return <Badge className="text-sm">已通过</Badge>;
    case "pending":
      return <Badge variant="secondary" className="text-sm">待审批</Badge>;
    case "rejected":
      return <Badge variant="destructive" className="text-sm">已拒绝</Badge>;
    case "deprecated":
      return <Badge variant="outline" className="text-sm">已下架</Badge>;
    case "removed":
      return <Badge variant="outline" className="text-sm">已移除</Badge>;
    default:
      return <Badge variant="secondary" className="text-sm">{status}</Badge>;
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
  fullHeight?: boolean;
  showSearch?: boolean;
  searchPlaceholder?: string;
  showActions?: boolean;
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

export function SubmissionList({
  submissions,
  type,
  fullHeight,
  showSearch = true,
  searchPlaceholder = "搜索名称、描述、提交者…",
  showActions = true,
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

  const boxHeight = fullHeight ? "h-full min-h-[65vh]" : "h-[520px]";

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
      <div className={`${boxHeight} overflow-auto rounded-md border`}>
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
                  暂无{type === "mcp" ? "MCP" : type === "skill" ? "Skill" : ""}提交
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
                      <Badge variant="outline" className="mt-1 w-fit text-xs uppercase">
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
                        <span className="text-sm text-muted-foreground">已处理</span>
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
