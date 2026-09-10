"use client";

import { Star } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toggleFavoriteAction } from "@/lib/platform-actions";
import { cn } from "@/lib/utils";

export interface FavRow {
  item_type: "mcp" | "skill";
  item_ref: string;
  title: string;
  /** 热度指标：MCP 显示调用次数，Skill 显示下载次数；无数据为空串 */
  metric: string;
  description: string;
  href: string;
}

const FILTERS: { key: "all" | "mcp" | "skill"; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "mcp", label: "MCP" },
  { key: "skill", label: "Skill" },
];

function searchFn(item: FavRow, q: string) {
  return (
    item.title.toLowerCase().includes(q) ||
    item.description.toLowerCase().includes(q) ||
    item.item_ref.toLowerCase().includes(q)
  );
}

export function FavsBlock({
  title,
  count,
  rows,
}: {
  title: string;
  count: number;
  rows: FavRow[];
}) {
  const [filter, setFilter] = useState<"all" | "mcp" | "skill">("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    let list = rows;
    if (filter !== "all") {
      list = list.filter((r) => r.item_type === filter);
    }
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((item) => searchFn(item, q));
  }, [rows, filter, query]);

  return (
    <Card className="flex h-full flex-col shadow-none">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-xl">
              {title}（{count}）
            </CardTitle>
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
          <Input
            type="text"
            placeholder="搜索名称、描述…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 text-base"
          />
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1">
        <div className="h-full min-h-[55vh] overflow-auto rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead className="text-base">名称</TableHead>
                <TableHead className="text-base">类型</TableHead>
                <TableHead className="text-base">调用/下载</TableHead>
                <TableHead className="text-base">描述</TableHead>
                <TableHead className="text-right text-base">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-base text-muted-foreground"
                  >
                    没有匹配的收藏
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((r) => {
                const unfav = toggleFavoriteAction.bind(
                  null,
                  r.item_type,
                  r.item_ref,
                  true,
                );
                return (
                  <TableRow key={`${r.item_type}-${r.item_ref}`}>
                    <TableCell className="text-base font-medium">
                      {r.title}
                    </TableCell>
                    <TableCell className="text-base">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-sm font-medium",
                          r.item_type === "mcp"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
                        )}
                      >
                        {r.item_type === "mcp" ? "MCP" : "Skill"}
                      </span>
                    </TableCell>
                    <TableCell className="text-base tabular-nums text-muted-foreground">
                      {r.metric || "—"}
                    </TableCell>
                    <TableCell className="max-w-md text-base text-muted-foreground">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="block truncate">
                            {r.description || "—"}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{r.description}</TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <form action={unfav}>
                          <Button
                            type="submit"
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-base"
                          >
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            取消收藏
                          </Button>
                        </form>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={r.href}>查看</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
