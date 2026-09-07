"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CornerDownRight, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Issue } from "@/lib/platform-backend";
import { createIssueAction, replyIssueAction } from "@/lib/platform-actions";

interface IssuesPanelProps {
  targetType: "mcp" | "skill";
  targetRef: string;
  initialIssues: Issue[];
  isAdmin?: boolean;
}

function formatDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-CN", { hour12: false });
}

const statusLabel: Record<string, string> = {
  open: "待处理",
  answered: "已回复",
  closed: "已关闭",
};

export function IssuesPanel({
  targetType,
  targetRef,
  initialIssues,
  isAdmin,
}: IssuesPanelProps) {
  const router = useRouter();
  const [issues, setIssues] = useState<Issue[]>(initialIssues);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  useEffect(() => setIssues(initialIssues), [initialIssues]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!title.trim() || !body.trim()) {
      setError("请填写标题与内容");
      return;
    }
    const fd = new FormData();
    fd.set("target_type", targetType);
    fd.set("target_ref", targetRef);
    fd.set("title", title);
    fd.set("body", body);
    startTransition(async () => {
      const r = await createIssueAction(fd);
      if (r?.ok) {
        setTitle("");
        setBody("");
        router.refresh();
      } else {
        setError(r?.error || "提交失败，请稍后重试");
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
      <form onSubmit={submit} className="space-y-3 rounded-lg border p-4">
        <h2 className="text-base font-bold">提交反馈 / Issue</h2>
        <Input
          placeholder="标题"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          placeholder="描述你遇到的问题或建议…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          className="border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={pending} className="gap-2">
            <Send className="h-4 w-4" />
            {pending ? "提交中…" : "提交"}
          </Button>
        </div>
      </form>

      {issues.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无反馈，欢迎首个提出。</p>
      ) : (
        <ul className="space-y-4">
          {issues.map((it) => (
            <li key={it.id} className="rounded-lg border p-4">
              <p className="font-medium">{it.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{it.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {it.author} · {formatDate(it.created_at)} ·{" "}
                {statusLabel[it.status] || it.status}
              </p>
              {it.reply && (
                <div className="mt-3 flex gap-2 rounded-md bg-muted/50 p-3 text-sm">
                  <CornerDownRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">{it.reply}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {it.reply_by} · {formatDate(it.replied_at)}
                    </p>
                  </div>
                </div>
              )}
              {isAdmin && !it.reply && (
                <div className="mt-3 flex items-start gap-2">
                  <textarea
                    placeholder="以管理员身份回复…"
                    value={replyText[it.id] ?? ""}
                    onChange={(e) =>
                      setReplyText((prev) => ({ ...prev, [it.id]: e.target.value }))
                    }
                    rows={2}
                    className="border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending}
                    onClick={() => reply(it.id)}
                  >
                    回复
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
