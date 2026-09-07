"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid, List, Search } from "lucide-react";
import { PageHeader } from "@/components/header-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Skill } from "@/lib/platform-backend";
import { SkillCard } from "./skill-card";
import { CatalogPagination } from "../catalog/components/catalog-pagination";

const SKILLS_PAGE_SIZE = 15;

interface SkillsWrapperProps {
  skills: Skill[];
  favoritedRefs: string[];
  /** group_key → 完整卡片数据（激活版 + 已上架版本），供卡片就地切换 */
  siblingGroups?: Record<string, Skill[]>;
}

/**
 * Client wrapper for the skills marketplace.
 * Mirrors the catalog layout: full-height flex, header with search + view toggle,
 * scrollable grid/list. Clicking a card navigates to the /skills/[id] detail page
 * (same behavior as the MCP catalog), not a side sheet.
 */
export function SkillsWrapper({
  skills,
  favoritedRefs,
  siblingGroups = {},
}: SkillsWrapperProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return skills;
    return skills.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q),
    );
  }, [skills, search]);

  // 搜索词变化时回到第一页，避免停留在已不存在的页码
  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(0);
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / SKILLS_PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(
    safePage * SKILLS_PAGE_SIZE,
    safePage * SKILLS_PAGE_SIZE + SKILLS_PAGE_SIZE,
  );
  const hasMore = safePage + 1 < totalPages;

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Skill Marketplace">
        {/* 与 Catalog 的 ServerFilters 保持一致的从左到右顺序：视图切换 -> 搜索 */}
        <div className="flex items-center gap-4">
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("list")}
            aria-label="列表视图"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("grid")}
            aria-label="网格视图"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索技能..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-56 pl-9"
            />
          </div>
        </div>
      </PageHeader>

      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <p className="text-muted-foreground">未找到匹配的技能。</p>
        ) : pageItems.length === 0 ? (
          <p className="text-muted-foreground">未找到匹配的技能。</p>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 gap-3 pb-3 md:grid-cols-2 lg:grid-cols-3">
{pageItems.map((s) => {
          const gk = s.group_key || String(s.item_ref || s.name || "").split(":")[0] || "";
          const sib = siblingGroups[gk];
          return (
            <SkillCard
              key={s.id}
              skill={s}
              favorited={favoritedRefs.includes(s.id)}
              onClick={(id: string) => router.push(`/skills/${id}`)}
              siblingCards={sib}
            />
          );
        })}
          </div>
        ) : (
          <div className="space-y-3 pb-3">
{pageItems.map((s) => {
          const gk = s.group_key || String(s.item_ref || s.name || "").split(":")[0] || "";
          const sib = siblingGroups[gk];
          return (
            <SkillCard
              key={s.id}
              skill={s}
              favorited={favoritedRefs.includes(s.id)}
              onClick={(id: string) => router.push(`/skills/${id}`)}
              siblingCards={sib}
            />
          );
        })}
          </div>
        )}
      </div>

      {filtered.length > SKILLS_PAGE_SIZE && (
        <CatalogPagination
          isFirstPage={safePage === 0}
          nextCursor={hasMore ? String(safePage + 1) : undefined}
          pageNumber={safePage + 1}
          onFirstPage={() => setPage(0)}
          onPrev={() => setPage((p) => Math.max(0, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
        />
      )}
    </div>
  );
}
