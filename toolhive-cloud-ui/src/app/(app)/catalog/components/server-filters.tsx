"use client";

import { LayoutGrid, List, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { GithubComStacklokToolhiveRegistryServerInternalServiceRegistryInfo } from "@/generated/types.gen";

interface ServerFiltersProps {
  registries: GithubComStacklokToolhiveRegistryServerInternalServiceRegistryInfo[];
  selectedRegistry: string;
  onRegistryChange: (registryName: string) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  /** 清空搜索（由 useCatalogFilters 提供，与输入重置同源） */
  onClearSearch: () => void;
}

/**
 * 目录工具栏：两端对齐的单行控件区。
 * 左 = 搜索（最高频，占主位）+ 数据源切换；右 = 列表/网格视图切换。
 * 独立于页头成行，替代原先「塞在标题右侧」的松散排布。
 */
export function ServerFilters({
  registries,
  selectedRegistry,
  onRegistryChange,
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  onClearSearch,
}: ServerFiltersProps) {
  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-3">
      {/* 左：搜索 + 数据源 */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="relative w-72 max-w-full">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="搜索 MCP 名称或描述…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 px-9 bg-card"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClearSearch}
              className="absolute top-1/2 right-1 size-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="清除搜索"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
        {/* 注册表多于一个时才显示切换器：单数据源时选择器没有可切换的项，徒占视觉空间 */}
        {registries.length > 1 && (
          <Select value={selectedRegistry} onValueChange={onRegistryChange}>
            <SelectTrigger className="h-9 w-44 bg-card" aria-label="选择注册表">
              <SelectValue placeholder="选择注册表">
                {selectedRegistry || undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {registries
                .filter(
                  (registry): registry is typeof registry & { name: string } =>
                    !!registry.name,
                )
                .map((registry) => (
                  <SelectItem key={registry.name} value={registry.name}>
                    {registry.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* 右：视图切换 */}
      <ToggleGroup
        type="single"
        value={viewMode}
        onValueChange={(value) => {
          if (value) onViewModeChange(value as "grid" | "list");
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
  );
}
