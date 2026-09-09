"use client";

import { PageHeader } from "@/components/header-page";
import type {
  GithubComStacklokToolhiveRegistryServerInternalServiceRegistryInfo,
  V0ServerJson,
} from "@/generated/types.gen";
import type { McpServer } from "@/lib/platform-backend";
import { useCatalogFilters } from "../hooks/use-catalog-filters";
import { CatalogPagination } from "./catalog-pagination";
import { ServerFilters } from "./server-filters";
import { ServerListSkeleton } from "./server-list-skeleton";
import { Servers } from "./servers";

interface ServersWrapperProps {
  servers: V0ServerJson[];
  registries: GithubComStacklokToolhiveRegistryServerInternalServiceRegistryInfo[];
  nextCursor?: string;
  favoritedRefs?: string[];
  callsByRef?: Record<string, number>;
  submittedMcps?: McpServer[];
  /** group_key → 该 group 的完整卡片数据（默认版 + 已上架版本），供卡片就地切换 */
  siblingGroups?: Record<string, McpServer[]>;
}

/**
 * Wrapper that connects catalog filters and pagination to the server list view.
 */
export function ServersWrapper({
  servers,
  registries,
  nextCursor,
  favoritedRefs = [],
  callsByRef = {},
  submittedMcps = [],
  siblingGroups = {},
}: ServersWrapperProps) {
  const {
    viewMode,
    search,
    selectedRegistry,
    isFirstPage,
    isPending,
    pageNumber,
    handleViewModeChange,
    handleSearchChange,
    handleClearSearch,
    handleRegistryChange,
    handleNextPage,
    handlePrevPage,
    handleFirstPage,
  } = useCatalogFilters();

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="MCP 目录">
        <ServerFilters
          registries={registries}
          selectedRegistry={selectedRegistry || registries[0]?.name || ""}
          onRegistryChange={handleRegistryChange}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          searchQuery={search}
          onSearchChange={handleSearchChange}
        />
      </PageHeader>

      <div className="flex-1 overflow-auto">
        {isPending ? (
          <ServerListSkeleton />
        ) : (
          <Servers
            servers={servers}
            registryName={selectedRegistry || registries[0]?.name || ""}
            viewMode={viewMode}
            searchQuery={search}
            onClearSearch={handleClearSearch}
            favoritedRefs={favoritedRefs}
            callsByRef={callsByRef}
            submittedMcps={submittedMcps}
            siblingGroups={siblingGroups}
          />
        )}
      </div>

      <CatalogPagination
        isFirstPage={isFirstPage}
        nextCursor={nextCursor}
        pageNumber={pageNumber}
        onFirstPage={handleFirstPage}
        onPrev={handlePrevPage}
        onNext={handleNextPage}
      />
    </div>
  );
}
