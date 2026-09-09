"use client";

import { CornerDownRight, RotateCcw, Trash2, XCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Issue } from "@/lib/platform-backend";

export function formatDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-CN", { hour12: false });
}

export const statusLabel: Record<string, string> = {
  open: "待处理",
  answered: "已回复",
  closed: "已关闭",
};

export const statusBadgeClass: Record<string, string> = {
  open: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  answered:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400",
  closed: "bg-muted text-muted-foreground",
};

interface IssueItemProps {
  issue: Issue;
  isAdmin?: boolean;
  pending: boolean;
  replyText: string;
  onReplyTextChange: (id: string, text: string) => void;
  onSetStatus: (id: string, status: "open" | "closed") => void;
  onRemove: (id: string) => void;
  onReply: (id: string) => void;
}

/** 单条反馈的渲染 + 管理员操作（关闭/重开/删除/回复）。动作回调由 IssuesPanel 统一编排。 */
export function IssueItem({
  issue: it,
  isAdmin,
  pending,
  replyText,
  onReplyTextChange,
  onSetStatus,
  onRemove,
  onReply,
}: IssueItemProps) {
  return (
    <li
      className={`rounded-lg border p-4 ${it.status === "closed" ? "opacity-70" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium">
            <span className="truncate">{it.title}</span>
            <Badge
              variant="secondary"
              className={`shrink-0 text-xs ${statusBadgeClass[it.status] || ""}`}
            >
              {statusLabel[it.status] || it.status}
            </Badge>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{it.body}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {it.author} · {formatDate(it.created_at)}
          </p>
        </div>
        {isAdmin && (
          <div className="flex shrink-0 items-center gap-1">
            {it.status !== "closed" ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => onSetStatus(it.id, "closed")}
                className="gap-1.5 text-muted-foreground"
                title="关闭后不再出现在默认列表，可随时重新打开"
              >
                <XCircle className="h-4 w-4" />
                关闭
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => onSetStatus(it.id, "open")}
                className="gap-1.5 text-muted-foreground"
                title="重新打开这条反馈"
              >
                <RotateCcw className="h-4 w-4" />
                重新打开
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  className="gap-1.5 text-muted-foreground hover:text-destructive"
                  title="删除这条反馈（不可恢复）"
                >
                  <Trash2 className="h-4 w-4" />
                  删除
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认删除这条反馈？</AlertDialogTitle>
                  <AlertDialogDescription>
                    「{it.title}
                    」将被永久删除，不可恢复。日常清理建议用「关闭」代替删除。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onRemove(it.id)}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    删除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
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
      {isAdmin && !it.reply && it.status !== "closed" && (
        <div className="mt-3 flex items-start gap-2">
          <textarea
            placeholder="以管理员身份回复…"
            value={replyText}
            onChange={(e) => onReplyTextChange(it.id, e.target.value)}
            rows={2}
            className="border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          />
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => onReply(it.id)}
          >
            回复
          </Button>
        </div>
      )}
    </li>
  );
}
