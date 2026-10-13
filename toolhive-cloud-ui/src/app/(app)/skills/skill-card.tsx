"use client";

import { ChevronDown, Star } from "lucide-react";
import { useState } from "react";
import { SkillDownloadDialog } from "@/components/skill-download-dialog";
import {
  CardCornerDeco,
  CardTypeTab,
  SkillGlyph,
} from "@/components/type-glyph";
import { Button } from "@/components/ui/button";
import { toggleFavoriteAction } from "@/lib/platform-actions";
import type { Skill } from "@/lib/platform-backend";

interface SkillCardProps {
  skill: Skill;
  favorited: boolean;
  /** 点「查看」跳当前版本的详情（入参为当前展示的版本 id） */
  onClick?: (id: string) => void;
  /** 同 group 的完整卡片数据（含默认版 skill 与其已上架版本）。长度>1 时横幅右侧显示版本下拉可就地切换。 */
  siblingCards?: Skill[];
  /** grid=紧凑竖排（色带横幅）；list=横向单列（左脊 + 信息三栏） */
  layout?: "grid" | "list";
}

/**
 * Skill 卡片（变体 B「色带横幅」，与 MCP 卡同构、success 色系）。
 * 多版本时横幅右侧版本下拉可就地切换展示对应版本信息（不跳详情）。
 * 列表视图换横向形态：6px 类型色左脊，标题行/描述/元信息顶格，操作列贴右。
 */
export function SkillCard({
  skill,
  favorited,
  onClick,
  siblingCards,
  layout = "grid",
}: SkillCardProps) {
  const versions =
    siblingCards && siblingCards.length > 1 ? siblingCards : [skill];
  const [curId, setCurId] = useState<string>(skill.id);
  const cur = versions.find((v) => v.id === curId) || skill;

  const toggleFav = toggleFavoriteAction.bind(
    null,
    "skill",
    skill.id,
    favorited,
  );
  const canSwitch = versions.length > 1;
  const versionLabel = (s: Skill) => (s.version ? `v${s.version}` : s.name);

  const starButton = (
    <form action={toggleFav}>
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label={favorited ? "取消收藏" : "收藏"}
        title={favorited ? "取消收藏" : "收藏"}
      >
        <Star
          className={
            favorited
              ? "h-4 w-4 fill-star text-star animate-[star-pop_320ms_ease-out]"
              : "h-4 w-4 text-muted-foreground"
          }
        />
      </Button>
    </form>
  );

  const versionSwitcher = canSwitch && (
    /* biome-ignore lint/a11y/useKeyWithClickEvents: 仅阻止点击冒泡到卡片，非交互元素 */
    /* biome-ignore lint/a11y/noStaticElementInteractions: 仅阻止点击冒泡到卡片，非交互元素 */
    <div
      className="relative shrink-0"
      onClick={(e) => e.stopPropagation()}
      title="就地切换版本"
    >
      <select
        aria-label="切换版本"
        value={cur.id}
        onChange={(e) => setCurId(e.target.value)}
        className="h-7 cursor-pointer appearance-none rounded-md border border-input bg-background py-0 pr-6 pl-2 text-xs font-medium outline-none hover:border-muted-foreground/50"
      >
        {versions.map((v) => (
          <option key={v.id} value={v.id}>
            {versionLabel(v)}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-1 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  );

  if (layout === "list") {
    return (
      <div className="card-hover flex w-full cursor-pointer items-stretch overflow-hidden rounded-xl border bg-card transition-colors">
        {/* 类型色左脊 */}
        <span aria-hidden className="w-1.5 shrink-0 bg-success" />
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-3.5 pl-5 pr-4">
          <div className="flex items-center gap-2">
            <SkillGlyph size={14} />
            <span
              className="min-w-0 truncate text-sm font-medium"
              title={cur.name}
            >
              {cur.name}
            </span>
            {canSwitch
              ? versionSwitcher
              : cur.version && (
                  <span className="shrink-0 rounded-md bg-success/10 px-2 py-0.5 text-xs text-success">
                    v{cur.version}
                  </span>
                )}
          </div>
          <p className="line-clamp-1 text-sm leading-snug text-muted-foreground">
            {cur.description || "暂无描述"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            提交者 {cur.owner || skill.owner} · {cur.download_count || 0} 次下载
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 px-5">
          {starButton}
          <SkillDownloadDialog skill={cur} />
          <Button
            type="button"
            size="sm"
            className="bg-success text-white hover:bg-success/90"
            onClick={() => onClick?.(cur.id)}
          >
            查看
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative flex h-full w-full flex-col overflow-hidden bg-card px-6 pt-9 pb-5 transition-[background,transform] duration-150 [border-bottom-width:1.5px] [border-right-width:1.5px] border-border hover:-translate-y-[3px] hover:bg-muted/40">
      {/* 效果图 01：类型垂片 + 右下几何角饰（无缝拼贴单元格） */}
      <CardTypeTab type="skill" />
      <CardCornerDeco type="skill" />

      <div className="relative z-10 flex flex-1 flex-col">
        <div className="flex items-center gap-2">
          <span
            className="min-w-0 flex-1 truncate text-[18px] font-semibold transition-transform duration-200 group-hover:translate-x-[3px]"
            title={cur.name}
          >
            {cur.name}
          </span>
          {canSwitch && versionSwitcher}
        </div>
        <p className="mt-2 line-clamp-2 max-w-[92%] min-h-11 text-[14.5px] leading-[1.7] text-muted-foreground">
          {cur.description || "暂无描述"}
        </p>

        <div className="mt-auto flex items-center pt-4">
          <span className="shrink-0 font-mono text-[14px] text-muted-foreground">
            {cur.version ? `v${cur.version}` : ""}
          </span>
          <span className="ml-2.5 shrink-0 text-[14px] text-muted-foreground">
            {cur.download_count || 0} 次下载
          </span>
          <span className="ml-auto mr-3 shrink-0">{starButton}</span>
          <SkillDownloadDialog skill={cur} />
          <Button
            type="button"
            size="sm"
            className="h-8 rounded-lg border-[1.5px] border-foreground bg-card px-4 text-xs font-semibold text-foreground group-hover:bg-foreground group-hover:text-background"
            onClick={() => onClick?.(cur.id)}
          >
            查看
          </Button>
        </div>
      </div>
    </div>
  );
}
