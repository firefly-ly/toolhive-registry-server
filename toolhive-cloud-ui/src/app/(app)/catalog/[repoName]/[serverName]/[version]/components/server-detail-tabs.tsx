"use client";

import type { ReactNode } from "react";
import { Github, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ServerTool } from "@/lib/schemas/server-meta";
import type { Issue, McpImageInspect } from "@/lib/platform-backend";
import { ServerToolsTable } from "./server-tools-table";
import { IssuesPanel } from "@/components/issues-panel";

interface ServerDetailTabsProps {
  children: ReactNode;
  tools: ServerTool[];
  toolsLive?: boolean;
  repositoryUrl?: string;
  mcpInspect?: McpImageInspect | null;
  issues: Issue[];
  ociRef: string;
  isAdmin?: boolean;
}

// tabs 在组件内部按 toolsLive 动态生成
export function ServerDetailTabs({
  children,
  tools,
  toolsLive,
  repositoryUrl,
  mcpInspect,
  issues,
  ociRef,
  isAdmin,
}: ServerDetailTabsProps) {
  const tabs = [
    { value: "about", label: "About" },
    { value: "tools", label: toolsLive ? "Tools · 实时" : "Tools" },
    { value: "readme", label: "README" },
    { value: "code", label: "Code" },
    { value: "issues", label: "Issues" },
  ] as const;

  return (
    <Tabs defaultValue="about" className="gap-4">
      <TabsList className="h-11 rounded-xl p-1">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="rounded-lg border-0 px-6 text-muted-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none dark:data-[state=active]:bg-card"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="about">{children}</TabsContent>

      <TabsContent value="tools">
        <ServerToolsTable tools={tools} />
      </TabsContent>

      <TabsContent value="readme">
        {repositoryUrl ? (
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
            未提供仓库地址，无法展示 README。提交时填写 repository_url 即可。
          </p>
        )}
      </TabsContent>

      <TabsContent value="code">
        <div className="space-y-4">
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
          <div className="rounded-lg border p-4">
            <h3 className="mb-2 text-sm font-bold">
              镜像元数据（来自 docker inspect）
            </h3>
            {mcpInspect ? (
              <dl className="space-y-3 text-sm">
                {mcpInspect.labels &&
                  Object.keys(mcpInspect.labels).length > 0 && (
                    <div>
                      <dt className="text-muted-foreground">Labels</dt>
                      <dd className="mt-1 space-y-1">
                        {Object.entries(mcpInspect.labels).map(([k, v]) => (
                          <code
                            key={k}
                            className="block rounded bg-muted px-2 py-1 text-xs"
                          >
                            {k} = {v}
                          </code>
                        ))}
                      </dd>
                    </div>
                  )}
                {mcpInspect.exposed_ports && (
                  <div>
                    <dt className="text-muted-foreground">Exposed Ports</dt>
                    <dd className="mt-1">{mcpInspect.exposed_ports.join(", ")}</dd>
                  </div>
                )}
                {mcpInspect.entrypoint && (
                  <div>
                    <dt className="text-muted-foreground">Entrypoint</dt>
                    <dd className="mt-1 font-mono text-xs">
                      {mcpInspect.entrypoint.join(" ")}
                    </dd>
                  </div>
                )}
                {mcpInspect.env && (
                  <div>
                    <dt className="text-muted-foreground">Environment</dt>
                    <dd className="mt-1 space-y-1">
                      {mcpInspect.env.slice(0, 20).map((e) => (
                        <code
                          key={e}
                          className="block rounded bg-muted px-2 py-1 text-xs"
                        >
                          {e}
                        </code>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">
                暂无镜像元数据。镜像需经平台审批部署后才会提取；若未关联平台提交记录也可能无法匹配。
              </p>
            )}
          </div>
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
