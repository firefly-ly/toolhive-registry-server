import {
  debounce,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import { useTransition } from "react";
import { CATALOG_PAGE_SIZE, CATALOG_VIEW_MODES } from "../constants";

/**
 * Manages catalog filter state persisted in URL query parameters.
 * prevCursors is stored in sessionStorage (per-tab, survives refresh)
 * rather than the URL since it's local navigation history, not shareable state.
 */
export function useCatalogFilters() {
  const [isPending, startTransition] = useTransition();

  const [{ viewMode, search, registryName, cursor }, setFilters] =
    useQueryStates(
      {
        viewMode: parseAsStringLiteral(CATALOG_VIEW_MODES).withDefault("grid"),
        search: parseAsString.withDefault(""),
        registryName: parseAsString.withDefault(""),
        cursor: parseAsString.withDefault(""),
      },
      {
        shallow: false,
      },
    );

  // 页码完全由 cursor（offset）推导，不依赖导航历史栈，避免「数字越翻越大」
  const offset = Number(cursor) || 0;

  const handleViewModeChange = (newViewMode: "grid" | "list") => {
    setFilters((prev) => ({ ...prev, viewMode: newViewMode }));
  };

  const handleSearchChange = (newSearch: string) => {
    setFilters((prev) => ({ ...prev, search: newSearch, cursor: "" }), {
      limitUrlUpdates: debounce(500),
      startTransition,
    });
  };

  const handleClearSearch = () => {
    setFilters((prev) => ({ ...prev, search: "", cursor: "" }), {
      startTransition,
    });
  };

  const handleRegistryChange = (value: string) => {
    setFilters(
      (prev) => ({
        ...prev,
        registryName: value,
        cursor: "",
      }),
      { startTransition },
    );
  };

  const handleNextPage = (nextCursor: string) => {
    setFilters((prev) => ({ ...prev, cursor: nextCursor }), {
      startTransition,
    });
  };

  const handlePrevPage = () => {
    const prevOffset = Math.max(0, offset - CATALOG_PAGE_SIZE);
    setFilters(
      (prev) => ({
        ...prev,
        cursor: prevOffset === 0 ? "" : String(prevOffset),
      }),
      { startTransition },
    );
  };

  const handleFirstPage = () => {
    setFilters((prev) => ({ ...prev, cursor: "" }), { startTransition });
  };

  const isFirstPage = offset === 0;

  return {
    viewMode,
    search,
    selectedRegistry: registryName,
    cursor,
    isFirstPage,
    isPending,
    pageNumber: Math.floor(offset / CATALOG_PAGE_SIZE) + 1,
    handleViewModeChange,
    handleSearchChange,
    handleClearSearch,
    handleRegistryChange,
    handleNextPage,
    handlePrevPage,
    handleFirstPage,
  };
}
