"use client";

import { LayoutGrid, List, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { EmptyState, PageHeader } from "@/components/header-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Skill } from "@/lib/platform-backend";
import { CatalogPagination } from "../catalog/components/catalog-pagination";
import { SkillCard } from "./skill-card";

const SKILLS_PAGE_SIZE = 15;

interface SkillsWrapperProps {
  skills: Skill[];
  favoritedRefs: string[];
  /** group_key → 完整卡片数据（默认版 + 已上架版本），供卡片就地切换 */
  siblingGroups?: Record<string, Skill[]>;
}

/**
 * Skill 市场客户端壳层：与 MCP 目录同一套页面范式——
 * 页头（标题+数量摘要）/ 工具栏独立成行（左搜索、右视图切换）/ 卡片网格 / 底部分页。
 * 点卡片进 /skills/[id] 详情页。
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

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Skill 目录"
        description={`共 ${skills.length} 个技能，均经安全扫描后上架`}
      />

      {/* 工具栏独立成行：左搜索，右视图切换（与 MCP 目录同款） */}
      <div className="mb-4 flex w-full flex-wrap items-center justify-between gap-3">
        <div className="relative w-72 max-w-full">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="搜索技能名称或描述…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="h-9 px-9 bg-card"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleSearch("")}
              className="absolute top-1/2 right-1 size-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="清除搜索"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => {
            if (value) setViewMode(value as "grid" | "list");
          }}
          spacing={1}
          className="gap-2"
        >
          <ToggleGroupItem
            value="list"
            aria-label="列表视图"
            className="size-9 rounded-md data-[state=on]:bg-accent data-[state=on]:shadow-none"
          >
            <List className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="grid"
            aria-label="网格视图"
            className="size-9 rounded-md data-[state=on]:bg-accent data-[state=on]:shadow-none"
          >
            <LayoutGrid className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="flex-1 overflow-auto">
        {skills.length === 0 ? (
          <EmptyState
            icon={Search}
            title="还没有上架的技能"
            description="技能经提交、安全扫描、审批通过后会出现在这里。"
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="未找到匹配结果"
            description={`没有找到与「${search}」匹配的技能，试试调整搜索条件。`}
          />
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 gap-3 pb-3 md:grid-cols-2 lg:grid-cols-3">
            {pageItems.map((s) => {
              const gk =
                s.group_key ||
                String(s.item_ref || s.name || "").split(":")[0] ||
                "";
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
              const gk =
                s.group_key ||
                String(s.item_ref || s.name || "").split(":")[0] ||
                "";
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
          page={safePage}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
