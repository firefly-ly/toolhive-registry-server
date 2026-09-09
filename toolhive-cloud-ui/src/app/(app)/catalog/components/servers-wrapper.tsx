"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { PageHeader } from "@/components/header-page";
import type {
  GithubComStacklokToolhiveRegistryServerInternalServiceRegistryInfo,
  V0ServerJson,
} from "@/generated/types.gen";
import type { McpServer } from "@/lib/platform-backend";
import { CATALOG_PAGE_SIZE } from "../constants";
import { useCatalogFilters } from "../hooks/use-catalog-filters";
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
}

type MixedItem =
  | { type: "registry"; data: V0ServerJson }
  | { type: "submitted"; data: McpServer };

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

  // 合并后统一分页，保持 registry 与用户提交条目混排、页内条数稳定
  const allItems: MixedItem[] = [
    ...filteredServers.map((s) => ({ type: "registry" as const, data: s })),
    ...filteredSubmitted.map((m) => ({ type: "submitted" as const, data: m })),
  ];
  const totalPages = Math.max(
    1,
    Math.ceil(allItems.length / CATALOG_PAGE_SIZE),
  );
  // 搜索/过滤后页码可能越界，收敛到最后一页
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = allItems.slice(
    safePage * CATALOG_PAGE_SIZE,
    (safePage + 1) * CATALOG_PAGE_SIZE,
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

  // 注册表切换需要服务端换数据源，仍走 URL 导航
  const handleRegistryChange = (value: string) => {
    router.push(`/catalog?registryName=${encodeURIComponent(value)}`);
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="MCP 目录">
        <ServerFilters
          registries={registries}
          selectedRegistry={selectedRegistry}
          onRegistryChange={handleRegistryChange}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          searchQuery={search}
          onSearchChange={handleSearchChange}
        />
      </PageHeader>

      <div className="flex-1 overflow-auto">
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
