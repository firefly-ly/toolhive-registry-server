"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Submission } from "@/lib/platform-backend";
import { SubmissionList } from "@/app/(app)/submissions/submission-list";

const FILTERS: { key: "all" | "mcp" | "skill"; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "mcp", label: "MCP" },
  { key: "skill", label: "Skill" },
];

export function ReviewBlock({ pending }: { pending: Submission[] }) {
  const [filter, setFilter] = useState<"all" | "mcp" | "skill">("all");
  const type = filter === "all" ? undefined : filter;

  return (
    <Card className="flex h-full flex-col shadow-none">
      <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-xl">待审核提交（{pending.length}）</CardTitle>
        <div className="inline-flex rounded-lg border bg-muted p-1">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                buttonVariants({
                  variant: filter === key ? "default" : "ghost",
                  size: "sm",
                }),
                "cursor-pointer border-none shadow-none"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1">
        <SubmissionList
          submissions={pending}
          type={type}
          fullHeight
          showSearch
          searchPlaceholder="搜索名称、描述、提交者…"
        />
      </CardContent>
    </Card>
  );
}
