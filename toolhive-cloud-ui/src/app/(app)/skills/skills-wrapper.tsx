"use client";

import { LayoutGrid, List, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { EmptyState, PageHeader } from "@/components/header-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Skill } from "@/lib/platform-backend";
import { CatalogHero } from "../catalog/components/catalog-hero";
import { CatalogPagination } from "../catalog/components/catalog-pagination";
import { useAutofillPageSize } from "../catalog/hooks/use-autofill-page-size";
import { SkillCard } from "./skill-card";

const SKILLS_PAGE_SIZE = 15;

/** 热门组合（人工策划的写死数据）：items 为名称子串，命中 <2 个技能的组合不展示 */
const COMBOS: { label: string; items: string[] }[] = [
  { label: "汇报三件套", items: ["hello-report", "会议纪要"] },
  { label: "数据速查", items: ["DWS", "数据探查"] },
  { label: "质量流水线", items: ["代码审查", "代码审计"] },
];

interface SkillsWrapperProps {
  skills: Skill[];
  favoritedRefs: string[];
  /** group_key → 完整卡片数据（默认版 + 已上架版本），供卡片就地切换 */
  siblingGroups?: Record<string, Skill[]>;
}

/**
 * Skill 目录客户端壳层「技能书架」：与 MCP 陈列馆同构 + 青绿类型色。
 * 页头 / 热门组合轨 / hero（最新上架+最近更新）/ 工具栏 / 卡片网格 / 分页。
 * 整页滚动（内容页不用卡内滚），卡片网格 auto-fill 自适应列数。
 */
export function SkillsWrapper({
  skills,
  favoritedRefs,
  siblingGroups = {},
}: SkillsWrapperProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [comboActive, setComboActive] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(0);

  // 页容量 = 实际列数 × 3 行（与 MCP 目录同款），避免宽窄屏下页尾空缺换页
  const { ref: gridMeasureRef, pageSize: measuredPageSize } =
    useAutofillPageSize();
  const pageSize = measuredPageSize || SKILLS_PAGE_SIZE;

  // 热门组合：仅展示当前技能库能命中 ≥2 项的组合（写死数据与实际库解耦）
  const visibleCombos = useMemo(
    () =>
      COMBOS.map((c) => ({
        ...c,
        matched: skills.filter((s) =>
          c.items.some((k) => s.name.toLowerCase().includes(k.toLowerCase())),
        ),
      })).filter((c) => c.matched.length >= 2),
    [skills],
  );
  const activeCombo = visibleCombos.find((c) => c.label === comboActive);

  const filtered = useMemo(() => {
    let base = skills;
    if (activeCombo) {
      const ids = new Set(activeCombo.matched.map((s) => s.id));
      base = base.filter((s) => ids.has(s.id));
    }
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q),
    );
  }, [skills, activeCombo, search]);

  // 搜索词变化时回第一页并退出组合过滤，避免停留在已不存在的页码
  const handleSearch = (v: string) => {
    setSearch(v);
    if (v) setComboActive(null);
    setPage(0);
  };

  // 陈列馆门面：已上架技能按 created_at 倒序
  const sortedSkills = useMemo(
    () =>
      [...skills].sort(
        (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
      ),
    [skills],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(
    safePage * pageSize,
    safePage * pageSize + pageSize,
  );
  const showHero = !search && !comboActive;
  // hero 门面兜底：无描述的条目不上门面
  const heroCandidates = useMemo(
    () => sortedSkills.filter((m) => (m.description ?? "").trim() !== ""),
    [sortedSkills],
  );
  const heroItem = heroCandidates[0] ?? null;
  const heroFeed = heroCandidates.slice(1, 4);
  // 精选轮播「热度最高」：下载次数最高的有描述条目
  const heroHottest = useMemo(() => {
    if (heroCandidates.length === 0) return null;
    const sorted = [...heroCandidates].sort(
      (a, b) => (b.download_count || 0) - (a.download_count || 0),
    );
    const top = sorted[0];
    return { ...top, calls: top.download_count || 0 };
  }, [heroCandidates]);

  const renderCard = (s: Skill) => {
    const gk =
      s.group_key || String(s.item_ref || s.name || "").split(":")[0] || "";
    return (
      <SkillCard
        key={s.id}
        skill={s}
        favorited={favoritedRefs.includes(s.id)}
        onClick={(id: string) => router.push(`/skills/${id}`)}
        siblingCards={siblingGroups[gk]}
        layout={viewMode}
      />
    );
  };

  return (
    <div className="-mr-8 flex h-full flex-col overflow-y-auto pr-8">
      <PageHeader title="技能" />

      {/* 陈列馆展台：hero + 组合轨 + 工具栏同坐一个浅色分区，卡片浮于其上 */}
      <div className="mb-4 rounded-2xl bg-secondary/40 p-4">
        {showHero && (
          <div className="@container mb-4">
            <CatalogHero
              newest={heroItem}
              hottest={heroHottest}
              feed={heroFeed}
              routePrefix="/skills"
              accent="success"
              showSubmitCta
            />
          </div>
        )}

        {/* 热门组合轨：命中不足的组合自动隐藏；点击进入组合过滤，再点退出 */}
        {visibleCombos.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">热门组合</span>
            {visibleCombos.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => {
                  setComboActive(comboActive === c.label ? null : c.label);
                  setPage(0);
                }}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  comboActive === c.label
                    ? "border-success/50 bg-success/10 font-medium text-success"
                    : "hover:border-success/40"
                }`}
              >
                {c.label}{" "}
                <span className="text-success">{c.matched.length} 项</span>
              </button>
            ))}
          </div>
        )}

        {/* 工具栏独立成行：左搜索，右视图切换（与 MCP 目录同款） */}
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
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
      </div>

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
          description={
            comboActive
              ? `组合「${comboActive}」下没有匹配的技能，试试清除过滤。`
              : `没有找到与「${search}」匹配的技能，试试调整搜索条件。`
          }
        />
      ) : (
        <div className="min-w-0" ref={gridMeasureRef}>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-3 pb-3">
              {pageItems.map(renderCard)}
            </div>
          ) : (
            <div className="space-y-3 pb-3">{pageItems.map(renderCard)}</div>
          )}
        </div>
      )}

      {filtered.length > pageSize && (
        <div className="mt-auto pt-2">
          <CatalogPagination
            page={safePage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
