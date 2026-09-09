"use client";

import { ChevronDown, Star } from "lucide-react";
import { useState } from "react";
import { SkillDownloadDialog } from "@/components/skill-download-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toggleFavoriteAction } from "@/lib/platform-actions";
import type { Skill } from "@/lib/platform-backend";

interface SkillCardProps {
  skill: Skill;
  favorited: boolean;
  /** 点「查看」跳当前版本的详情（入参为当前展示的版本 id） */
  onClick?: (id: string) => void;
  /** 同 group 的完整卡片数据（含默认版 skill 与其已上架版本）。长度>1 时标题右显示版本下拉可就地切换。 */
  siblingCards?: Skill[];
}

/**
 * Skill card that visually mirrors the MCP server card.
 * - Star + download count live at the bottom-left (GitHub style).
 * - Download button lives at the bottom-right.
 * - Clicking 查看 opens the detail page.
 * - 多版本时标题右侧版本下拉可就地切换展示对应版本信息（不跳详情）。
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
    <Card className="card-hover flex h-full w-full flex-col gap-4 py-4">
      <CardHeader className="gap-1">
        <div className="flex items-center justify-between gap-2">
          <CardTitle
            className="truncate text-xl font-semibold leading-7 tracking-tight"
            title={cur.name}
          >
            {cur.name}
          </CardTitle>
          {/* 多版本：版本下拉放在标题右侧，就地切换（不跳详情） */}
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
                className="cursor-pointer appearance-none rounded-md border border-slate-200 bg-background py-1 pl-2.5 pr-7 text-base font-medium outline-none hover:border-slate-400 dark:border-slate-700"
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {versionLabel(v)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          )}
        </div>
        <CardDescription className="flex items-center gap-1.5 text-xs leading-5">
          <span>{cur.owner || skill.owner}</span>
          <Badge variant="outline" className="text-xs">
            skill
          </Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <p className="line-clamp-3 text-sm leading-[18px] text-muted-foreground">
          {cur.description || "暂无描述"}
        </p>

        {/* 收藏星标 + 下载次数 + 下载按钮（与 MCP 卡片同布局） */}
        <div className="mt-auto flex items-center justify-between border-t pt-3">
          <div className="flex items-center gap-3">
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
                      ? "h-4 w-4 fill-yellow-400 text-yellow-400"
                      : "h-4 w-4 text-muted-foreground"
                  }
                />
              </Button>
            </form>
            <span className="text-xs text-muted-foreground">
              {cur.download_count || 0} 次下载
            </span>
          </div>
          <div className="flex items-center gap-2">
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
      </CardContent>
    </Card>
  );
}
