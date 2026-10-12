"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * 顶栏搜索（效果图 01）：回车跳 /catalog?q=，由目录页客户端筛选接管。
 * 独立 client 组件，Navbar（服务端）直接引用。
 */
export function TopbarSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const v = q.trim();
        router.push(v ? `/catalog?q=${encodeURIComponent(v)}` : "/catalog");
      }}
    >
      <label className="relative block">
        <span className="sr-only">搜索工具与技能</span>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索…"
          className="h-8 w-44 rounded-full border bg-background pr-3 pl-8 text-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]"
        />
      </label>
    </form>
  );
}
