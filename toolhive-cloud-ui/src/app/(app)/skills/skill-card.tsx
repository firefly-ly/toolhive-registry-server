"use client";

import { ChevronDown, Star } from "lucide-react";
import { useState } from "react";
import { SkillDownloadDialog } from "@/components/skill-download-dialog";
import { SkillGlyph } from "@/components/type-glyph";
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
}

/**
 * Skill 卡片（变体 B「色带横幅」，与 MCP 卡同构、success 色系）。
 * 多版本时横幅右侧版本下拉可就地切换展示对应版本信息（不跳详情）。
 */
export function SkillCard({
  skill,
  favorited,
  onClick,
  siblingCards,
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

  return (
    <div className="card-hover flex h-full w-full flex-col overflow-hidden rounded-xl border bg-card transition-colors hover:border-success/40">
      {/* 色带横幅：符号 + 名称 + 版本切换（标题截断，下拉 shrink-0） */}
      <div className="flex items-center gap-2 bg-success/10 px-4 py-2.5">
        <SkillGlyph />
        <span
          className="min-w-0 flex-1 truncate text-sm font-medium"
          title={cur.name}
        >
          {cur.name}
        </span>
        {canSwitch && (
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
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
          {cur.description || "暂无描述"}
        </p>
        <p className="mt-1.5 truncate text-xs text-muted-foreground">
          提交者：{cur.owner || skill.owner}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
            <span className="shrink-0">{cur.download_count || 0} 次下载</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <SkillDownloadDialog skill={cur} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onClick?.(cur.id)}
            >
              查看
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
