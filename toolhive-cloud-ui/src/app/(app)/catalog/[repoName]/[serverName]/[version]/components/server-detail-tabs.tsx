"use client";

import { ExternalLink, Github } from "lucide-react";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { IssuesPanel } from "@/components/issues-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Issue } from "@/lib/platform-backend";
import type { ServerTool } from "@/lib/schemas/server-meta";
import { PackageFileTree } from "./package-file-tree";
import { ServerToolsTable } from "./server-tools-table";

// react-markdown + remark-gfm 只在 README tab 首次激活时下载（Radix 非激活 tab 不渲染）
const MarkdownView = dynamic(
  () => import("@/components/markdown-view").then((m) => m.MarkdownView),
  {
    loading: () => (
      <p className="text-muted-foreground py-8 text-center text-sm">
        README 加载中…
      </p>
    ),
  },
);

interface ServerDetailTabsProps {
  children: ReactNode;
  tools: ServerTool[];
  toolsLive?: boolean;
  toolsFailed?: boolean;
  repositoryUrl?: string;
  // 源码包内提取的 README（无则回退仓库链接/占位提示）
  mcpReadme?: string | null;
  mcpReadmeName?: string | null;
  // 源码包文件树（「代码」标签页展示 zip 包内文件）
  mcpId?: string;
  mcpTree?: string[] | null;
  mcpFileCount?: number | null;
  issues: Issue[];
  ociRef: string;
  isAdmin?: boolean;
}

// tabs 在组件内部按 toolsLive 动态生成
export function ServerDetailTabs({
  children,
  tools,
  toolsLive,
  toolsFailed,
  repositoryUrl,
  mcpReadme,
  mcpReadmeName,
  mcpId,
  mcpTree,
  mcpFileCount,
  issues,
  ociRef,
  isAdmin,
}: ServerDetailTabsProps) {
  const tabs = [
    { value: "about", label: "关于" },
    { value: "tools", label: toolsLive ? "工具 · 实时" : "工具" },
    { value: "readme", label: "README" },
    { value: "code", label: "代码" },
    { value: "issues", label: "反馈" },
  ] as const;

  return (
    <Tabs defaultValue="about" className="gap-4">
      <TabsList className="h-11 rounded-xl p-1">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="rounded-lg border-0 px-6 text-muted-foreground data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="about">{children}</TabsContent>

      <TabsContent value="tools">
        <ServerToolsTable tools={tools} failed={toolsFailed} />
      </TabsContent>

      <TabsContent value="readme">
        {mcpReadme ? (
          <div className="space-y-3">
            {mcpReadmeName && (
              <p className="text-xs text-muted-foreground">
                提取自提交源码包内的 {mcpReadmeName}
              </p>
            )}
            <MarkdownView content={mcpReadme} />
            {repositoryUrl && (
              <a
                href={repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Github className="size-4" />
                在仓库查看最新 README
              </a>
            )}
          </div>
        ) : repositoryUrl ? (
          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">
              该 MCP 的源码与 README 托管在外部仓库：
            </p>
            <a
              href={repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Github className="size-4" />
              在仓库查看 README
            </a>
          </div>
        ) : (
          <p className="rounded-lg border p-4 text-sm text-muted-foreground">
            暂无可展示的 README。提交源码包时在包内放一个 README 文件，或填写
            repository_url 即可。
          </p>
        )}
      </TabsContent>

      <TabsContent value="code">
        <div className="space-y-4">
          {mcpId && mcpTree && mcpTree.length > 0 && (
            <PackageFileTree
              kind="mcp"
              itemId={mcpId}
              tree={mcpTree}
              fileCount={mcpFileCount}
            />
          )}
          {repositoryUrl && (
            <a
              href={repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <ExternalLink className="size-4" />
              在仓库查看源码
            </a>
          )}
          {(!mcpTree || mcpTree.length === 0) && (
            <p className="rounded-lg border p-4 text-sm text-muted-foreground">
              暂无可展示的源码包文件。提交源码包（zip/tar.gz）后在详情页即可浏览包内文件。
            </p>
          )}
        </div>
      </TabsContent>

      <TabsContent value="issues">
        <IssuesPanel
          targetType="mcp"
          targetRef={ociRef}
          initialIssues={issues}
          isAdmin={isAdmin}
        />
      </TabsContent>
    </Tabs>
  );
}
