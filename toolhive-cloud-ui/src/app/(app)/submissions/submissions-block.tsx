"use client";

import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Submission } from "@/lib/platform-backend";
import { cn } from "@/lib/utils";
import { SubmissionList } from "./submission-list";

const FILTERS: { key: "all" | "mcp" | "skill"; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "mcp", label: "MCP" },
  { key: "skill", label: "Skill" },
];

export function SubmissionsBlock({
  submissions,
  count,
}: {
  submissions: Submission[];
  count: number;
}) {
  const [filter, setFilter] = useState<"all" | "mcp" | "skill">("all");
  const type = filter === "all" ? undefined : filter;

  return (
    <Card className="shadow-none">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-xl">历史提交（{count}）</CardTitle>
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
                  "cursor-pointer border-none shadow-none",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <SubmissionList
          submissions={submissions}
          type={type}
          showActions={false}
        />
      </CardContent>
    </Card>
  );
}
