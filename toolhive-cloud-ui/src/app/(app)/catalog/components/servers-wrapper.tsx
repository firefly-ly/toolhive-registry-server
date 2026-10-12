"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
  /** hero KPI（效果图 01）：今日调用与较昨日 ±%（服务端趋势计算，缺省回落累计） */
  todayCalls?: number;
  deltaPct?: number | null;
  /** 活跃用户（近 7 天，去重 upper bound） */
  activeUsers7?: number;
}

type MixedItem =
  | { type: "registry"; data: V0ServerJson }
  | { type: "submitted"; data: McpServer }
  | { type: "skill"; data: Skill };

type TypeFilter = "all" | "mcp" | "skill";
type StatusFilter = "all" | "running";
type SortFilter = "default" | "hot";

/**
 * Wrapper that connects catalog filters and pagination to the server list view.
 * 方案 C：搜索/视图/页码全在客户端完成（零网络往返，体感即时）；
 * 仅注册表切换需要服务端换数据源，走 URL 导航。
 * 效果图 01 版式：hero 通栏在顶（无页头标题），工具栏 = 类型/状态/排序 + 视图切换，
 * 搜索入口在顶栏（?q= 同步到本页搜索状态）。
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
  todayCalls,
  deltaPct,
  activeUsers7,
}: ServersWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedRegistry =
    searchParams.get("registryName") || registries[0]?.name || "";
  const qParam = searchParams.get("q") || "";

  const {
    viewMode,
    search,
    page,
    handleViewModeChange,
    handleSearchChange,
    handleClearSearch,
    setPage,
  } = useCatalogFilters();

  // 顶栏搜索（效果图 01：搜索在顶栏）→ /catalog?q= → 同步到本页搜索状态
  useEffect(() => {
    if (qParam && qParam !== search) handleSearchChange(qParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qParam]);

  // 类型筛选：IA 合并后目录一页承载 MCP + Skill
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  // 效果图 01 工具栏：状态（全部/运行中）与排序（默认/热度）
  const [statusF, setStatusF] = useState<StatusFilter>("all");
  const [sortF, setSortF] = useState<SortFilter>("default");

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

  // 合并后统一分页：registry + 用户提交 MCP + Skill 混排，类型/状态筛选在此收敛
  const allItems: MixedItem[] = useMemo(() => {
    const items: MixedItem[] = [];
    if (typeFilter !== "skill") {
      if (statusF === "all") {
        items.push(
          ...filteredServers.map((s) => ({
            type: "registry" as const,
            data: s,
          })),
        );
      }
      // 状态=运行中：registry 条目无健康探测数据，仅保留探测在线的已提交 MCP
      items.push(
        ...filteredSubmitted
          .filter((m) => statusF === "all" || (m.healthy && m.public_endpoint))
          .map((m) => ({ type: "submitted" as const, data: m })),
      );
    }
    if (typeFilter !== "mcp" && statusF === "all") {
      items.push(
        ...filteredSkills.map((s) => ({ type: "skill" as const, data: s })),
      );
    }
    return items;
  }, [typeFilter, statusF, filteredServers, filteredSubmitted, filteredSkills]);

  // 排序：热度 = 调用/下载次数降序（默认 = 服务端顺序）
  const sortedItems = useMemo(() => {
    if (sortF === "default") return allItems;
    const callsOf = (i: MixedItem) =>
      i.type === "registry"
        ? callsByRef[i.data.name ?? ""] || 0
        : i.type === "submitted"
          ? i.data.call_count || callsByRef[i.data.id] || 0
          : i.data.download_count || 0;
    return [...allItems].sort((a, b) => callsOf(b) - callsOf(a));
  }, [allItems, sortF, callsByRef]);

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
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  // 搜索/过滤后页码可能越界，收敛到最后一页
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = sortedItems.slice(
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
  // 精选带「热度最高」：调用/下载次数最高的候选条目
  const heroHottest = useMemo(() => {
    const sorted = [...heroPool].sort(
      (a, b) => (b.calls || 0) - (a.calls || 0),
    );
    return sorted[0] ?? null;
  }, [heroPool]);

  // KPI 嵌拼矩阵（效果图 01 右侧）：今日(或累计)调用蓝主块 / 在线服务 / 可用技能 / 活跃用户
  const totalCalls =
    Object.values(callsByRef).reduce((a, b) => a + b, 0) +
    submittedMcps.reduce((a, m) => a + (m.call_count || 0), 0) +
    skills.reduce((a, s) => a + (s.download_count || 0), 0);
  const runningCount = submittedMcps.filter(
    (m) => m.healthy && m.public_endpoint,
  ).length;
  const kpis = {
    calls: todayCalls ?? totalCalls,
    callsLabel: todayCalls === undefined ? "累计调用" : "今日调用",
    deltaPct,
    services: servers.length + submittedMcps.length,
    running: runningCount,
    skills: skills.length,
    favorites: favoritedRefs.length + skillFavoritedRefs.length,
    activeUsers7,
  };

  return (
    <div className="-mr-8 flex h-full flex-col overflow-y-auto pr-8">
      {/* 效果图 01：hero 通栏在顶，无页头标题；搜索时隐藏避免干扰检索 */}
      {!search && (
        <CatalogHero
          newest={heroItem}
          hottest={heroHottest}
          showSubmitCta
          kpis={kpis}
        />
      )}

      {/* 工具栏：左类型/状态/排序/数据源，右视图切换（搜索在顶栏）；底 1.5px 发丝线 */}
      <div className="border-b-[1.5px] border-border py-3.5" id="catalog-grid">
        <ServerFilters
          registries={registries}
          selectedRegistry={selectedRegistry}
          onRegistryChange={handleRegistryChange}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          typeCounts={typeCounts}
          statusFilter={statusF}
          onStatusFilterChange={setStatusF}
          sortFilter={sortF}
          onSortFilterChange={setSortF}
        />
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
        totalItems={sortedItems.length}
        pageSize={pageSize}
      />
    </div>
  );
}
