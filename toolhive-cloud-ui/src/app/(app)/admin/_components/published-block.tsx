"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Submission } from "@/lib/platform-backend";
import { cn } from "@/lib/utils";
import { SearchableGroupList } from "./submission-groups";

const FILTERS: { key: "all" | "mcp" | "skill"; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "mcp", label: "MCP" },
  { key: "skill", label: "Skill" },
];

// 组的类型按组内首条判断（组内同属一个产品，类型一致）
function groupType(items: Submission[]): "mcp" | "skill" {
  return (items[0]?.type === "mcp" ? "mcp" : "skill") as "mcp" | "skill";
}

// 检查任一组内是否存在正处于「部署中」的 MCP（用于触发自动刷新）
function hasDeploying(groups: [string, Submission[]][]): boolean {
  return groups.some(([, items]) =>
    items.some((s) => {
      if (s.type !== "mcp") return false;
      try {
        const m = s.meta
          ? (JSON.parse(s.meta) as { deploy_status?: string })
          : {};
        return m.deploy_status === "deploying";
      } catch {
        return false;
      }
    }),
  );
}

export function PublishedBlock({
  mcpGroups,
  skillGroups,
  count,
}: {
  mcpGroups: [string, Submission[]][];
  skillGroups: [string, Submission[]][];
  count: number;
}) {
  const [filter, setFilter] = useState<"all" | "mcp" | "skill">("all");
  const router = useRouter();

  const allGroups = useMemo(
    () => [...mcpGroups, ...skillGroups],
    [mcpGroups, skillGroups],
  );

  const filtered = useMemo(() => {
    if (filter === "all") return allGroups;
    return allGroups.filter(([, items]) => groupType(items) === filter);
  }, [allGroups, filter]);

  // 存在「部署中」的 MCP 时自动刷新页面数据，直到部署完成/失败，
  // 避免「点部署/恢复上线」后界面一直停留在『部署中』需要手动刷新。
  const hasBusy = hasDeploying(allGroups);
  useEffect(() => {
    if (!hasBusy) return;
    const t = setInterval(() => {
      router.refresh();
    }, 4000);
    return () => clearInterval(t);
  }, [hasBusy, router]);

  return (
    <Card className="flex h-full flex-col shadow-none">
      <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-xl">已发布（{count}）</CardTitle>
        <div className="inline-flex items-center gap-2">
          {hasBusy && <span className="text-xs text-amber-600">部署中…</span>}
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
      <CardContent className="min-h-0 flex-1">
        {filtered.length === 0 ? (
          <p className="text-base text-muted-foreground">暂无已发布条目</p>
        ) : (
          <SearchableGroupList
            groups={filtered}
            placeholder="搜索分组、版本、提交者…"
          />
        )}
      </CardContent>
    </Card>
  );
}
