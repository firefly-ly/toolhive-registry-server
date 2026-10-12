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
  /** IA 合并：类型筛选（全部 / MCP 服务 / Skill 技能），黑胶囊选中态 */
  typeFilter: "all" | "mcp" | "skill";
  onTypeFilterChange: (filter: "all" | "mcp" | "skill") => void;
  /** 各类型的条目计数（跟随搜索联动），用于分段控件角标 */
  typeCounts: { all: number; mcp: number; skill: number };
}

const TYPE_OPTIONS: { value: "all" | "mcp" | "skill"; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "mcp", label: "MCP 服务" },
  { value: "skill", label: "Skill 技能" },
];

/**
 * 目录工具栏：两端对齐的单行控件区。
 * 左 = 类型分段（IA 合并）+ 搜索 + 数据源切换；右 = 列表/网格视图切换。
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
  typeFilter,
  onTypeFilterChange,
  typeCounts,
}: ServerFiltersProps) {
  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-3">
      {/* 左：类型分段 + 搜索 + 数据源 */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div
          role="group"
          aria-label="类型筛选"
          className="flex shrink-0 items-center rounded-lg border border-foreground bg-card p-0.5"
        >
          {TYPE_OPTIONS.map((opt) => {
            const active = typeFilter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onTypeFilterChange(opt.value)}
                aria-pressed={active}
                className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
                <span className="ml-1 font-mono opacity-70">
                  {typeCounts[opt.value]}
                </span>
              </button>
            );
          })}
        </div>
        <div className="relative min-w-0 flex-1 max-w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="搜索工具、技能…"
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
