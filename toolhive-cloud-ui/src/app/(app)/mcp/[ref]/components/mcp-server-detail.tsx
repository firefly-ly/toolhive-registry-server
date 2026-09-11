import { ServerDetail } from "@/app/(app)/catalog/[repoName]/[serverName]/[version]/components/server-detail";
import { ServerDetailTabs } from "@/app/(app)/catalog/[repoName]/[serverName]/[version]/components/server-detail-tabs";
import { DetailHeader } from "@/components/detail-header";
import { Badge } from "@/components/ui/badge";
import type { Issue, McpServer } from "@/lib/platform-backend";
import type { ServerTool } from "@/lib/schemas/server-meta";
import { McpDetailActions } from "../mcp-detail-actions";

interface McpServerDetailProps {
  mcp: McpServer;
  favorited: boolean;
  callCount: number;
  favoriteCount: number;
  tools: ServerTool[];
  toolsLive: boolean;
  toolsFailed?: boolean;
  issues: Issue[];
  isAdmin?: boolean;
  backHref: string;
  backLabel: string;
  autoCall?: boolean;
  actions?: React.ReactNode;
}

export function McpServerDetail({
  mcp,
  favorited,
  callCount,
  favoriteCount,
  tools,
  toolsLive,
  toolsFailed,
  issues,
  isAdmin,
  backHref,
  backLabel,
  autoCall,
  actions,
}: McpServerDetailProps) {
  const typeLabel = mcp.transport || "MCP";

  return (
    <div className="flex flex-col gap-5">
      <DetailHeader
        backHref={backHref}
        backLabel={backLabel}
        title={mcp.name}
        subtitle={`由 ${mcp.owner} 提交`}
        actions={actions}
        badges={
          <>
            <Badge variant="secondary" className="text-xs">
              {typeLabel}
            </Badge>
            {mcp.version && (
              <Badge variant="secondary" className="text-xs">
                v{mcp.version}
              </Badge>
            )}
            {mcp.healthy ? (
              <Badge variant="default" className="text-xs">
                运行中
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                未运行
              </Badge>
            )}
          </>
        }
      />

      <ServerDetailTabs
        tools={tools}
        toolsLive={toolsLive}
        toolsFailed={toolsFailed}
        repositoryUrl={mcp.repository_url}
        mcpReadme={mcp.mcp_readme ?? null}
        mcpReadmeName={mcp.mcp_readme_name ?? null}
        mcpId={mcp.id}
        mcpTree={mcp.mcp_tree ?? null}
        mcpFileCount={mcp.mcp_file_count ?? null}
        issues={issues}
        ociRef={mcp.payload_ref}
        isAdmin={isAdmin}
      >
        <div className="space-y-6">
          <ServerDetail
            description={mcp.description}
            serverName={mcp.name}
            serverUrl={mcp.public_endpoint}
            serverHeaders={mcp.mcp_headers}
            repositoryUrl={mcp.repository_url}
            publisher={mcp.owner}
            type={typeLabel}
            version={mcp.version}
          />
          <McpDetailActions
            itemRef={mcp.id}
            name={mcp.name}
            favorited={favorited}
            callCount={callCount}
            favoriteCount={favoriteCount}
            endpoint={mcp.endpoint}
            publicEndpoint={mcp.public_endpoint}
            healthy={mcp.healthy}
            autoCall={autoCall}
          />
        </div>
      </ServerDetailTabs>
    </div>
  );
}
