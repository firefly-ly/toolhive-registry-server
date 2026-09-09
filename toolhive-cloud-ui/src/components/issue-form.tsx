"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createIssueAction } from "@/lib/platform-actions";

interface IssueFormProps {
  targetType: "mcp" | "skill";
  targetRef: string;
}

/** 反馈提交表单（所有人可见）：标题 + 内容，成功后刷新详情页数据。 */
export function IssueForm({ targetType, targetRef }: IssueFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error("请填写标题与内容", { duration: 6000 });
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
        toast.error(r?.error || "提交失败，请稍后重试", { duration: 6000 });
      }
    });
  }

  return (
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
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending} className="gap-2">
          <Send className="h-4 w-4" />
          {pending ? "提交中…" : "提交"}
        </Button>
      </div>
    </form>
  );
}
