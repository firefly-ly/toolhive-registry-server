"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { V0ServerJson } from "@/generated/types.gen";
import type { McpServer } from "@/lib/platform-backend";
import { EmptyState } from "./empty-state";
import { ServerCard } from "./server-card";
import { ServersTable } from "./servers-table";
import { SubmittedMcpCard } from "./submitted-mcp-card";

interface ServersProps {
  servers: V0ServerJson[];
  registryName: string;
  viewMode: "grid" | "list";
  searchQuery: string;
  onClearSearch: () => void;
  favoritedRefs?: string[];
  callsByRef?: Record<string, number>;
  submittedMcps?: McpServer[];
  siblingGroups?: Record<string, McpServer[]>;
}

/**
 * Client component that displays servers based on view mode.
 * Filtering is done server-side — this component renders whatever servers are passed in.
 * Approved user-submitted MCPs are mixed into the main grid (grid view) so that
 * they are not visually segregated under a separate heading.
 */
export function Servers({
  servers,
  registryName,
  viewMode,
  searchQuery,
  onClearSearch,
  favoritedRefs = [],
  callsByRef = {},
  submittedMcps = [],
  siblingGroups = {},
}: ServersProps) {
  const router = useRouter();

  const handleServerClick = (server: V0ServerJson) => {
    if (!server.name) return;

    const detailUrl = `/catalog/${server.name}/${server.version || "latest"}?registryName=${encodeURIComponent(registryName)}`;
    router.push(detailUrl);
  };

  // 用户提交（已审批）的 MCP 也参与客户端检索
  const q = searchQuery.trim().toLowerCase();
  const visibleSubmitted = q
    ? submittedMcps.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q),
      )
    : submittedMcps;

  const hasAnyGridItems = servers.length > 0 || visibleSubmitted.length > 0;

  if (!hasAnyGridItems) {
    if (searchQuery) {
      return (
        <EmptyState
          variant="no-matching-items"
          title="未找到匹配结果"
          description={`没有找到与"${searchQuery}"匹配的服务，试试调整搜索条件。`}
          actions={
            <Button variant="outline" onClick={onClearSearch}>
              清除搜索
            </Button>
          }
        />
      );
    }
    return (
      <EmptyState
        variant="no-items"
        title="暂无可用服务"
        description="目录中还没有 MCP 服务，稍后再来看看。"
      />
    );
  }

  return (
    <div className="space-y-8 pb-6">
      {viewMode === "list" ? (
        <div className="pb-3">
          <ServersTable servers={servers} onServerClick={handleServerClick} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 pb-3 md:grid-cols-2 lg:grid-cols-3">
          {servers.map((server) => (
            <ServerCard
              key={server.name}
              server={server}
              serverUrl={server.remotes?.[0]?.url}
              favorited={favoritedRefs.includes(server.name ?? "")}
              callCount={callsByRef[server.name ?? ""] ?? 0}
              onClick={() => handleServerClick(server)}
            />
          ))}
          {visibleSubmitted.map((m) => {
            const gk =
              m.group_key || String(m.payload_ref || "").split(":")[0] || "";
            const sib = siblingGroups[gk];
            return (
              <SubmittedMcpCard
                key={m.id}
                mcp={m}
                favorited={favoritedRefs.includes(m.id)}
                callCount={callsByRef[m.id] ?? m.call_count}
                siblingCards={sib}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
