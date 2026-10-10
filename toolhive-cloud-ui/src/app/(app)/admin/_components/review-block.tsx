"use client";

import { useMemo, useState } from "react";
import { ApproveDialog } from "@/app/(app)/submissions/approve-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Submission } from "@/lib/platform-backend";
import { cn } from "@/lib/utils";
import { groupKey, parseMeta, versionOf } from "./submission-groups";

const FILTERS: { key: "all" | "mcp" | "skill"; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "mcp", label: "MCP" },
  { key: "skill", label: "Skill" },
];

/**
 * 审核队列：按产品（group_key）分组的待审列表。
 * 同名产品的多个版本提交折叠为一张组卡——组头显示产品名与待审版本数，
 * 组内逐版本一行（引用/提交者/时间 + 审批入口），替代原先同名多行平铺的困惑。
 */
export function ReviewBlock({ pending }: { pending: Submission[] }) {
  const [filter, setFilter] = useState<"all" | "mcp" | "skill">("all");
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const base =
      filter === "all" ? pending : pending.filter((s) => s.type === filter);
    const q = query.trim().toLowerCase();
    const filtered = q
      ? base.filter((s) =>
          [parseMeta(s.meta).name || "", s.payload_ref, s.user_id]
            .join(" ")
            .toLowerCase()
            .includes(q),
        )
      : base;
    const map = new Map<string, Submission[]>();
    for (const s of filtered) {
      const gk = groupKey(s);
      const arr = map.get(gk) || [];
      arr.push(s);
      map.set(gk, arr);
    }
    // 组内按提交时间倒序；组间按组内最新提交倒序
    for (const arr of map.values()) {
      arr.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    }
    return [...map.entries()].sort(
      (a, b) => +new Date(b[1][0].created_at) - +new Date(a[1][0].created_at),
    );
  }, [pending, filter, query]);

  return (
    <Card className="flex h-full flex-col shadow-none">
      <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-xl">
          待审核提交（{pending.length}）
        </CardTitle>
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="搜索产品、引用、提交者…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 w-56 bg-card"
          />
          <div className="inline-flex rounded-lg border bg-muted p-1">
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  "cursor-pointer rounded-md px-3 py-1 text-sm transition-colors",
                  filter === key
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-auto">
        {groups.length === 0 ? (
          <p className="py-10 text-center text-base text-muted-foreground">
            没有待审核的提交
          </p>
        ) : (
          <div className="space-y-3 pb-3">
            {groups.map(([gk, items]) => {
              const first = items[0];
              const name = parseMeta(first.meta).name || gk;
              return (
                <div key={gk} className="overflow-hidden rounded-xl border">
                  <div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-4 py-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-medium" title={name}>
                        {name}
                      </span>
                      <Badge
                        variant="outline"
                        className="shrink-0 text-xs uppercase"
                      >
                        {first.type}
                      </Badge>
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        {items.length} 个待审版本
                      </Badge>
                    </div>
                    <span
                      className="hidden shrink-0 font-mono text-xs text-muted-foreground sm:inline"
                      title={gk}
                    >
                      {gk}
                    </span>
                  </div>
                  <div className="divide-y">
                    {items.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-3 px-4 py-2.5"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium">
                            {versionOf(s)}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {s.payload_ref} · {s.user_id} ·{" "}
                            {new Date(s.created_at).toLocaleDateString("zh-CN")}
                          </div>
                        </div>
                        <div className="shrink-0">
                          <ApproveDialog submission={s} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
