"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface SearchableBlockProps<T> {
  title: string;
  count: number;
  searchPlaceholder?: string;
  data: T[];
  searchFn: (item: T, query: string) => boolean;
  children: (filtered: T[]) => React.ReactNode;
}

export function SearchableBlock<T>({
  title,
  count,
  searchPlaceholder = "搜索…",
  data,
  searchFn,
  children,
}: SearchableBlockProps<T>) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((item) => searchFn(item, q));
  }, [data, query, searchFn]);

  return (
    <Card className="flex h-full flex-col shadow-none">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3">
          <CardTitle className="text-xl">
            {title}（{count}）
          </CardTitle>
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 text-base"
          />
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1">
        <div className="h-full overflow-auto rounded-md border">
          {children(filtered)}
        </div>
      </CardContent>
    </Card>
  );
}
