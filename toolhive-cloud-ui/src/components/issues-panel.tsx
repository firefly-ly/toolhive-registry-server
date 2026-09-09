"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { IssueForm } from "@/components/issue-form";
import { IssueItem } from "@/components/issue-item";
import {
  deleteIssueAction,
  replyIssueAction,
  updateIssueStatusAction,
} from "@/lib/platform-actions";
import type { Issue } from "@/lib/platform-backend";

interface IssuesPanelProps {
  targetType: "mcp" | "skill";
  targetRef: string;
  initialIssues: Issue[];
  isAdmin?: boolean;
}

// 状态过滤（GitHub 风格：默认只看未关闭项，已关闭归档可查）
type StatusFilter = "open" | "answered" | "closed" | "all";
const filters: {
  key: StatusFilter;
  label: string;
  match: (s: string) => boolean;
}[] = [
  { key: "open", label: "待处理", match: (s) => s === "open" },
  { key: "answered", label: "已回复", match: (s) => s === "answered" },
  { key: "closed", label: "已关闭", match: (s) => s === "closed" },
  { key: "all", label: "全部", match: () => true },
];

/**
 * 反馈面板编排层：持有过滤状态与管理员动作，渲染交给 IssueForm / IssueItem。
 * 管理员动作共享同一个 transition（pending），避免并发操作互相踩。
 */
export function IssuesPanel({
  targetType,
  targetRef,
  initialIssues,
  isAdmin,
}: IssuesPanelProps) {
  const router = useRouter();
  const [issues, setIssues] = useState<Issue[]>(initialIssues);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("open");
  // 报错统一以 toast 弹出（自动消失、点击可关）
  useEffect(() => {
    if (error) toast.error(error, { duration: 6000 });
  }, [error]);

  useEffect(() => setIssues(initialIssues), [initialIssues]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { open: 0, answered: 0, closed: 0 };
    for (const it of issues) c[it.status] = (c[it.status] || 0) + 1;
    return c;
  }, [issues]);

  const visible = useMemo(
    () =>
      issues.filter((it) =>
        filters.find((f) => f.key === filter)?.match(it.status),
      ),
    [issues, filter],
  );

  function setStatus(id: string, status: "open" | "closed") {
    startTransition(async () => {
      const r = await updateIssueStatusAction(id, status);
      if (!r?.ok) setError(r?.error || "操作失败，请稍后重试");
      else router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const r = await deleteIssueAction(id);
      if (!r?.ok) setError(r?.error || "删除失败，请稍后重试");
      else {
        toast.success("反馈已删除");
        router.refresh();
      }
    });
  }

  function reply(id: string) {
    const text = (replyText[id] ?? "").trim();
    if (!text) return;
    const fd = new FormData();
    fd.set("id", id);
    fd.set("reply", text);
    fd.set("status", "answered");
    startTransition(async () => {
      await replyIssueAction(fd);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <IssueForm targetType={targetType} targetRef={targetRef} />

      {issues.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                filter === f.key
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {f.label}
              {f.key !== "all" && (
                <span className="ml-1.5 text-xs opacity-70">
                  {counts[f.key] || 0}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {issues.length === 0
            ? "暂无反馈，欢迎首个提出。"
            : `暂无${filters.find((f) => f.key === filter)?.label || ""}的反馈。`}
        </p>
      ) : (
        <ul className="space-y-4">
          {visible.map((it) => (
            <IssueItem
              key={it.id}
              issue={it}
              isAdmin={isAdmin}
              pending={pending}
              replyText={replyText[it.id] ?? ""}
              onReplyTextChange={(id, text) =>
                setReplyText((prev) => ({ ...prev, [id]: text }))
              }
              onSetStatus={setStatus}
              onRemove={remove}
              onReply={reply}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// 兼容出口：formatDate / statusLabel 由 issue-item 提供
export { formatDate, statusLabel } from "@/components/issue-item";
