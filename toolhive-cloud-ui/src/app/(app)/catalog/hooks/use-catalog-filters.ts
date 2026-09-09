"use client";

import { useState } from "react";

/**
 * 目录页筛选状态（方案 C：数据全量下发后客户端过滤）。
 * 搜索 / 视图 / 页码都是本地 state——零网络往返，体感即时；
 * 仅注册表切换仍走 URL（需要服务端换数据源），由 ServersWrapper 处理。
 */
export function useCatalogFilters() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const handleViewModeChange = (newViewMode: "grid" | "list") => {
    setViewMode(newViewMode);
  };

  // 搜索词变化时回到第一页，避免停留在已不存在的页码
  const handleSearchChange = (newSearch: string) => {
    setSearch(newSearch);
    setPage(0);
  };

  const handleClearSearch = () => {
    setSearch("");
    setPage(0);
  };

  return {
    viewMode,
    search,
    page,
    pageNumber: page + 1,
    handleViewModeChange,
    handleSearchChange,
    handleClearSearch,
    setPage,
  };
}
