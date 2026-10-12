"use client";

import { useMemo, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Submission } from "@/lib/platform-backend";
import { cn } from "@/lib/utils";
import { SearchableRetiredList } from "./submission-groups";

const FILTERS: { key: "all" | "mcp" | "skill"; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "mcp", label: "MCP" },
  { key: "skill", label: "Skill" },
];

export function RetiredBlock({ retired }: { retired: Submission[] }) {
  const [filter, setFilter] = useState<"all" | "mcp" | "skill">("all");

  const filtered = useMemo(() => {
    if (filter === "all") return retired;
    return retired.filter((s) => s.type === filter);
  }, [retired, filter]);

  return (
    <Card className="flex h-full flex-col shadow-none">
      <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-xl">
          已删除 / 已拒绝（{retired.length}）
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            删除会清理运行实例与制品文件；如需重新上架请重新提交
          </span>
        </CardTitle>
        <div className="inline-flex rounded-lg border bg-muted p-1">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                filter === key && "bg-primary/10 text-primary",
                "cursor-pointer border-none shadow-none",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1">
        {filtered.length === 0 ? (
          <p className="text-base text-muted-foreground">
            暂无已删除或已拒绝条目
          </p>
        ) : (
          <SearchableRetiredList retired={filtered} />
        )}
      </CardContent>
    </Card>
  );
}
