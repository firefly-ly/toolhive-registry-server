"use client";

import { LayoutGrid, List } from "lucide-react";
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
  /** IA 合并：类型筛选（全部 / MCP 服务 / Skill 技能），黑胶囊选中态 */
  typeFilter: "all" | "mcp" | "skill";
  onTypeFilterChange: (filter: "all" | "mcp" | "skill") => void;
  /** 各类型的条目计数（跟随搜索联动），用于分段控件角标 */
  typeCounts: { all: number; mcp: number; skill: number };
  /** 效果图 01 工具栏：状态（全部 / 运行中） */
  statusFilter: "all" | "running";
  onStatusFilterChange: (f: "all" | "running") => void;
  /** 排序（默认 / 热度） */
  sortFilter: "default" | "hot";
  onSortFilterChange: (f: "default" | "hot") => void;
}

const TYPE_OPTIONS: { value: "all" | "mcp" | "skill"; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "mcp", label: "MCP 服务" },
  { value: "skill", label: "Skill 技能" },
];

/**
 * 目录工具栏（效果图 01）：左 = 类型分段 + 状态/排序筛选 + 数据源；
 * 右 = 列表/网格视图切换。搜索入口在顶栏（?q= 同步），不在工具栏。
 */
export function ServerFilters({
  registries,
  selectedRegistry,
  onRegistryChange,
  viewMode,
  onViewModeChange,
  typeFilter,
  onTypeFilterChange,
  typeCounts,
  statusFilter,
  onStatusFilterChange,
  sortFilter,
  onSortFilterChange,
}: ServerFiltersProps) {
  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-3">
      {/* 左：类型分段 + 状态/排序 + 数据源 */}
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
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

        <Select
          value={statusFilter}
          onValueChange={(v) => onStatusFilterChange(v as "all" | "running")}
        >
          <SelectTrigger
            aria-label="按运行状态筛选"
            className="h-9 w-auto gap-1.5 rounded-lg border-border bg-card px-3 text-xs font-medium"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">状态：全部</SelectItem>
            <SelectItem value="running">状态：运行中</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={sortFilter}
          onValueChange={(v) => onSortFilterChange(v as "default" | "hot")}
        >
          <SelectTrigger
            aria-label="排序方式"
            className="h-9 w-auto gap-1.5 rounded-lg border-border bg-card px-3 text-xs font-medium"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">排序：默认</SelectItem>
            <SelectItem value="hot">排序：热度</SelectItem>
          </SelectContent>
        </Select>

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

      {/* 右：视图切换（效果图 01：34px 方钮、发丝边、选中琥珀底黑字） */}
      <ToggleGroup
        type="single"
        value={viewMode}
        onValueChange={(value) => {
          if (value) onViewModeChange(value as "grid" | "list");
        }}
        spacing={1.5}
        className="gap-0"
      >
        <ToggleGroupItem
          value="list"
          aria-label="列表视图"
          className="size-[34px] rounded-lg border-[1.5px] border-border bg-card text-muted-foreground data-[state=on]:border-foreground data-[state=on]:bg-highlight data-[state=on]:text-foreground data-[state=on]:shadow-none"
        >
          <List className="size-4" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="grid"
          aria-label="网格视图"
          className="size-[34px] rounded-lg border-[1.5px] border-border bg-card text-muted-foreground data-[state=on]:border-foreground data-[state=on]:bg-highlight data-[state=on]:text-foreground data-[state=on]:shadow-none"
        >
          <LayoutGrid className="size-4" />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
