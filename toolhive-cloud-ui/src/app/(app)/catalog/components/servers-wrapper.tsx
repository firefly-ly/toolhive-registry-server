"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/header-page";
import type {
  GithubComStacklokToolhiveRegistryServerInternalServiceRegistryInfo,
  V0ServerJson,
} from "@/generated/types.gen";
import type { McpServer, Skill } from "@/lib/platform-backend";
import { SkillCard } from "../../skills/skill-card";
import { CATALOG_PAGE_SIZE } from "../constants";
import { useAutofillPageSize } from "../hooks/use-autofill-page-size";
import { useCatalogFilters } from "../hooks/use-catalog-filters";
import { CatalogHero } from "./catalog-hero";
import { CatalogPagination } from "./catalog-pagination";
import { ServerFilters } from "./server-filters";
import { Servers } from "./servers";

interface ServersWrapperProps {
  /** 全量 registry 条目（服务端一次下发，客户端过滤） */
  servers: V0ServerJson[];
  registries: GithubComStacklokToolhiveRegistryServerInternalServiceRegistryInfo[];
  favoritedRefs?: string[];
  callsByRef?: Record<string, number>;
  /** 全量已提交 MCP */
  submittedMcps?: McpServer[];
  /** group_key → 该 group 的完整卡片数据（默认版 + 已上架版本），供卡片就地切换 */
  siblingGroups?: Record<string, McpServer[]>;
  /** IA 合并：全量已上架 Skill（与 MCP 同页混排，类型筛选区分） */
  skills?: Skill[];
  skillFavoritedRefs?: string[];
  skillSiblingGroups?: Record<string, Skill[]>;
}

type MixedItem =
  | { type: "registry"; data: V0ServerJson }
  | { type: "submitted"; data: McpServer }
  | { type: "skill"; data: Skill };

type TypeFilter = "all" | "mcp" | "skill";

/**
 * Wrapper that connects catalog filters and pagination to the server list view.
 * 方案 C：搜索/视图/页码全在客户端完成（零网络往返，体感即时）；
 * 仅注册表切换需要服务端换数据源，走 URL 导航。
 */
export function ServersWrapper({
  servers,
  registries,
  favoritedRefs = [],
  callsByRef = {},
  submittedMcps = [],
  siblingGroups = {},
  skills = [],
  skillFavoritedRefs = [],
  skillSiblingGroups = {},
}: ServersWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedRegistry =
    searchParams.get("registryName") || registries[0]?.name || "";

  const {
    viewMode,
    search,
    page,
    handleViewModeChange,
    handleSearchChange,
    handleClearSearch,
    setPage,
  } = useCatalogFilters();

  // 类型筛选：IA 合并后目录一页承载 MCP + Skill
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  // 页容量 = 实际列数 × 3 行：宽窄屏列数不同，固定页容量会出现「有空缺就换页」
  const { ref: gridMeasureRef, pageSize: measuredPageSize } =
    useAutofillPageSize();
  const pageSize = measuredPageSize || CATALOG_PAGE_SIZE;

  // 客户端过滤：registry 条目与用户提交 MCP 分别匹配名称/描述
  const filteredServers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return servers;
    return servers.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q),
    );
  }, [servers, search]);

  const filteredSubmitted = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return submittedMcps;
    return submittedMcps.filter(
      (m) =>
        m.name?.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q),
    );
  }, [submittedMcps, search]);

  const filteredSkills = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return skills;
    return skills.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q),
    );
  }, [skills, search]);

  // 合并后统一分页：registry + 用户提交 MCP + Skill 混排，类型筛选在此收敛
  const allItems: MixedItem[] = useMemo(() => {
    const items: MixedItem[] = [];
    if (typeFilter !== "skill") {
      items.push(
        ...filteredServers.map((s) => ({ type: "registry" as const, data: s })),
        ...filteredSubmitted.map((m) => ({
          type: "submitted" as const,
          data: m,
        })),
      );
    }
    if (typeFilter !== "mcp") {
      items.push(
        ...filteredSkills.map((s) => ({ type: "skill" as const, data: s })),
      );
    }
    return items;
  }, [typeFilter, filteredServers, filteredSubmitted, filteredSkills]);

  // 类型分段控件的计数（跟随搜索联动）
  const typeCounts = useMemo(
    () => ({
      all:
        filteredServers.length +
        filteredSubmitted.length +
        filteredSkills.length,
      mcp: filteredServers.length + filteredSubmitted.length,
      skill: filteredSkills.length,
    }),
    [filteredServers, filteredSubmitted, filteredSkills],
  );
  const totalPages = Math.max(1, Math.ceil(allItems.length / pageSize));
  // 搜索/过滤后页码可能越界，收敛到最后一页
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = allItems.slice(
    safePage * pageSize,
    (safePage + 1) * pageSize,
  );
  const pageServers = pageItems
    .filter((i): i is Extract<MixedItem, { type: "registry" }> =>
      Boolean(i.type === "registry"),
    )
    .map((i) => i.data);
  const pageSubmitted = pageItems
    .filter((i): i is Extract<MixedItem, { type: "submitted" }> =>
      Boolean(i.type === "submitted"),
    )
    .map((i) => i.data);
  const pageSkills = pageItems
    .filter((i): i is Extract<MixedItem, { type: "skill" }> =>
      Boolean(i.type === "skill"),
    )
    .map((i) => i.data);

  // 注册表切换需要服务端换数据源，仍走 URL 导航
  const handleRegistryChange = (value: string) => {
    router.push(`/catalog?registryName=${encodeURIComponent(value)}`);
  };

  // 陈列馆门面（IA 合并版）：MCP + Skill 合并候选池（有描述才上门面）
  const heroPool = useMemo(
    () =>
      [
        ...submittedMcps.map((m) => ({
          id: m.id,
          name: m.name,
          description: m.description,
          version: m.version,
          owner: m.owner,
          created_at: m.created_at,
          calls: m.call_count || callsByRef[m.id] || 0,
          type: "mcp" as const,
        })),
        ...skills.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          version: s.version,
          owner: s.owner,
          created_at: s.created_at,
          calls: s.download_count || 0,
          type: "skill" as const,
        })),
      ].filter((m) => (m.description ?? "").trim() !== ""),
    [submittedMcps, skills, callsByRef],
  );
  const heroItem = useMemo(() => {
    const sorted = [...heroPool].sort(
      (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
    );
    return sorted[0] ?? null;
  }, [heroPool]);
  // 精选轮播「热度最高」：调用/下载次数最高的候选条目
  const heroHottest = useMemo(() => {
    const sorted = [...heroPool].sort(
      (a, b) => (b.calls || 0) - (a.calls || 0),
    );
    return sorted[0] ?? null;
  }, [heroPool]);
  const heroFeed = useMemo(
    () =>
      heroPool
        .filter((m) => m.id !== heroItem?.id && m.id !== heroHottest?.id)
        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
        .slice(0, 3),
    [heroPool, heroItem, heroHottest],
  );

  return (
    <div className="-mr-8 flex h-full flex-col overflow-y-auto pr-8">
      <PageHeader title="目录" />

      {/* 陈列馆展台：hero + 工具栏同坐一个浅色分区，卡片浮于其上；搜索时隐藏 hero */}
      <div className="mb-4 rounded-2xl bg-secondary/40 p-4">
        {!search && (
          <div className="@container mb-4">
            <CatalogHero
              newest={heroItem}
              hottest={heroHottest}
              feed={heroFeed}
              showSubmitCta
            />
          </div>
        )}

        {/* 工具栏独立成行：左类型筛选/搜索/数据源，右视图切换 */}
        <div className="w-full">
          <ServerFilters
            registries={registries}
            selectedRegistry={selectedRegistry}
            onRegistryChange={handleRegistryChange}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            searchQuery={search}
            onSearchChange={handleSearchChange}
            onClearSearch={handleClearSearch}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            typeCounts={typeCounts}
          />
        </div>
      </div>

      <div className="flex-1" ref={gridMeasureRef}>
        <Servers
          servers={pageServers}
          registryName={selectedRegistry}
          viewMode={viewMode}
          searchQuery={search}
          onClearSearch={handleClearSearch}
          favoritedRefs={favoritedRefs}
          callsByRef={callsByRef}
          submittedMcps={pageSubmitted}
          siblingGroups={siblingGroups}
          skills={pageSkills}
          skillFavoritedRefs={skillFavoritedRefs}
          skillSiblingGroups={skillSiblingGroups}
        />
      </div>

      <CatalogPagination
        page={safePage}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
