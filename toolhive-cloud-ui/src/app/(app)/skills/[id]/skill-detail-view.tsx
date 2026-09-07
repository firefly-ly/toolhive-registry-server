"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Copy,
  Download,
  Link2,
  Server,
  Star,
  Tag,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Skill, Issue } from "@/lib/platform-backend";
import { recordDownloadAction, toggleFavoriteAction } from "@/lib/platform-actions";
import { IssuesPanel } from "@/components/issues-panel";
import { DetailHeader } from "@/components/detail-header";
import { toast } from "sonner";

interface SkillDetailViewProps {
  skill: Skill;
  favorited: boolean;
  backHref: string;
  backLabel: string;
  issues?: Issue[];
  isAdmin?: boolean;
  actions?: React.ReactNode;
}

function GettingStarted({ skill }: { skill: Skill }) {
  const refText = skill.item_ref || skill.name || "";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(refText);
      toast.success("已复制引用标识");
    } catch {
      toast.error("复制失败");
    }
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h2 className="text-base font-bold">使用方式</h2>
      <p className="text-base leading-7 text-muted-foreground">
        在 WorkBuddy 中引用该技能时，使用以下标识：
      </p>
      <div className="flex items-center gap-2">
        <Input
          readOnly
          value={refText}
          className="min-w-80 max-w-xl font-mono text-sm text-muted-foreground bg-background"
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleCopy}
          className="gap-2"
        >
          <Copy className="h-4 w-4" />
          复制
        </Button>
      </div>
    </div>
  );
}

export function SkillDetailView({
  skill,
  favorited,
  backHref,
  backLabel,
  issues = [],
  isAdmin,
  actions,
}: SkillDetailViewProps) {
  const toggleFav = toggleFavoriteAction.bind(null, "skill", skill.id, favorited);
  const [activeTab, setActiveTab] = useState("about");

  function handleDownload() {
    void recordDownloadAction("skill", skill.id);

    if (skill.download_url) {
      window.open(skill.download_url, "_blank", "noopener,noreferrer");
      return;
    }

    const payload = {
      name: skill.name,
      description: skill.description,
      owner: skill.owner,
      ref: skill.item_ref,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${skill.name}.skill.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // 元信息网格与 registry 详情页保持一致的四格布局
  const meta = [
    { icon: User, label: "来源", value: skill.owner || "未知" },
    { icon: Tag, label: "类型", value: "Skill" },
    {
      icon: Server,
      label: "版本",
      value: skill.version ? `v${skill.version}` : "未知",
    },
    {
      icon: Download,
      label: "下载",
      value: `${skill.download_count} 次`,
    },
  ];

  return (
    <div className="space-y-6">
      <DetailHeader
        backHref={backHref}
        backLabel={backLabel}
        title={skill.name}
        subtitle={
          <>
            <span>由 {skill.owner || "未知"} 提交</span>
            <span>·</span>
            <span>引用：{skill.item_ref}</span>
          </>
        }
        actions={actions}
        badges={
          <>
            <Badge variant="secondary" className="text-xs">
              Skill
            </Badge>
            {skill.version && (
              <Badge variant="secondary" className="text-xs">
                v{skill.version}
              </Badge>
            )}
          </>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-4">
        <TabsList className="h-11 rounded-xl p-1">
          {(
            [
              { value: "about", label: "About" },
              { value: "readme", label: "README" },
              { value: "files", label: "Code" },
              { value: "issues", label: "Issues" },
            ] as const
          ).map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-lg border-0 px-6 text-muted-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none dark:data-[state=active]:bg-card"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="about" className="space-y-6">
          <div className="whitespace-pre-line text-base leading-7 text-muted-foreground">
            {skill.description || "暂无描述"}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <form action={toggleFav}>
              <Button
                type="submit"
                variant={favorited ? "default" : "outline"}
                size="lg"
                className="gap-2"
              >
                <Star
                  className={
                    favorited
                      ? "h-4 w-4 fill-yellow-400 text-yellow-400"
                      : "h-4 w-4"
                  }
                />
                {favorited ? "已收藏" : "收藏"}
              </Button>
            </form>

            <Button
              type="button"
              size="lg"
              onClick={handleDownload}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              下载技能
            </Button>

            <Button variant="outline" size="lg" asChild>
              <Link href="/skills">在技能市场打开</Link>
            </Button>
          </div>

          {skill.repository_url && (
            <a
              href={skill.repository_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Link2 className="h-4 w-4" />
              查看源码仓库
            </a>
          )}

          <GettingStarted skill={skill} />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {meta.map((m) => (
              <div
                key={m.label}
                className="rounded-lg border bg-muted/40 p-3"
              >
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <m.icon className="h-3.5 w-3.5" />
                  {m.label}
                </div>
                <div
                  className="mt-1 break-words text-sm font-medium"
                  title={String(m.value)}
                >
                  {m.value}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="readme">
          {skill.skill_readme ? (
            <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 text-sm leading-6">
              {skill.skill_readme}
            </pre>
          ) : (
            <div className="space-y-2 rounded-lg border p-4 text-sm text-muted-foreground">
              <p>该技能包未包含 README 文件。</p>
              {skill.repository_url ? (
                <a
                  href={skill.repository_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <Link2 className="h-4 w-4" />
                  前往仓库查看 README
                </a>
              ) : null}
            </div>
          )}
        </TabsContent>

        <TabsContent value="files">
          {skill.skill_tree && skill.skill_tree.length > 0 ? (
            <div className="rounded-lg border p-4">
              <p className="mb-2 text-xs text-muted-foreground">
                共 {skill.skill_file_count ?? skill.skill_tree.length} 个文件
              </p>
              <ul className="max-h-[60vh] overflow-auto font-mono text-xs leading-6">
                {skill.skill_tree.map((f, i) => (
                  <li key={i} className="truncate" title={f}>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="rounded-lg border p-4 text-sm text-muted-foreground">
              该技能包未提供可解析的文件清单。
            </p>
          )}
        </TabsContent>

        <TabsContent value="issues">
          <IssuesPanel
            targetType="skill"
            targetRef={skill.id}
            initialIssues={issues}
            isAdmin={isAdmin}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
