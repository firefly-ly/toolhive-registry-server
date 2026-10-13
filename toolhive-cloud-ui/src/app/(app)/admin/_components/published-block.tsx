"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import type { Submission } from "@/lib/platform-backend";
import { cn } from "@/lib/utils";
import { parseMeta } from "./group-utils";
import { GroupRow } from "./submission-groups";

const FILTERS: { key: "all" | "mcp" | "skill"; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "mcp", label: "MCP" },
  { key: "skill", label: "Skill" },
];

// 组的类型按组内首条判断（组内同属一个产品，类型一致）
function groupType(items: Submission[]): "mcp" | "skill" {
  return (items[0]?.type === "mcp" ? "mcp" : "skill") as "mcp" | "skill";
}

function groupSearchText(group_key: string, items: Submission[]): string {
  const parts = [
    group_key,
    items[0] ? parseMeta(items[0].meta).name || "" : "",
    ...items.map((s) => {
      const m = parseMeta(s.meta);
      return [m.name || "", m.version || "", s.payload_ref, s.user_id].join(
        " ",
      );
    }),
  ];
  return parts.join(" ").toLowerCase();
}

// 检查任一组内是否存在正处于「部署中」的 MCP（用于触发自动刷新）
function hasDeploying(groups: [string, Submission[]][]): boolean {
  return groups.some(([, items]) =>
    items.some((s) => parseMeta(s.meta).deploy_status === "deploying"),
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
  const [query, setQuery] = useState("");
  const router = useRouter();

  const allGroups = useMemo(
    () => [...mcpGroups, ...skillGroups],
    [mcpGroups, skillGroups],
  );

  // 类型分段计数（效果图 05：全部 N / MCP N / Skill N，按条目数）
  const counts = useMemo(
    () => ({
      all: count,
      mcp: mcpGroups.reduce((a, [, items]) => a + items.length, 0),
      skill: skillGroups.reduce((a, [, items]) => a + items.length, 0),
    }),
    [count, mcpGroups, skillGroups],
  );

  const filtered = useMemo(() => {
    let l = allGroups;
    if (filter !== "all")
      l = l.filter(([, items]) => groupType(items) === filter);
    const q = query.trim().toLowerCase();
    if (q)
      l = l.filter(([gk, items]) => groupSearchText(gk, items).includes(q));
    return l;
  }, [allGroups, filter, query]);

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
    <div className="flex min-h-0 flex-1 flex-col">
      {/* 工具栏（效果图 05：黑框类型分段 + 搜索条目） */}
      <div className="flex flex-wrap items-center gap-2.5 border-b-[1.5px] border-border py-4">
        <div className="inline-flex overflow-hidden rounded-lg border-[1.5px] border-foreground">
          {FILTERS.map(({ key, label }, i) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "cursor-pointer px-[18px] py-[7px] text-xs font-semibold transition-colors",
                i > 0 && "border-l-[1.5px] border-foreground",
                filter === key
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label} {counts[key]}
            </button>
          ))}
        </div>
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索条目…"
          className="h-[34px] w-52 text-sm"
        />
        {hasBusy && (
          <span className="text-xs font-medium text-warning">部署中…</span>
        )}
      </div>

      {/* 分组版本卡列表 */}
      <div className="min-h-0 flex-1 overflow-auto py-5">
        {filtered.length === 0 ? (
          <p className="py-10 text-center text-base text-muted-foreground">
            {allGroups.length === 0 ? "暂无已发布条目" : "没有匹配的分组"}
          </p>
        ) : (
          <div className="space-y-4">
            {filtered.map(([gk, items]) => (
              <GroupRow key={gk} group_key={gk} items={items} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
