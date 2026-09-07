"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { V0ServerJson } from "@/generated/types.gen";
import type { McpServer } from "@/lib/platform-backend";
import { EmptyState } from "./empty-state";
import { ServerCard } from "./server-card";
import { SubmittedMcpCard } from "./submitted-mcp-card";
import { ServersTable } from "./servers-table";

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

  if (!hasAnyGridItems && viewMode === "grid") {
    if (searchQuery) {
      return (
        <EmptyState
          variant="no-matching-items"
          title="No results found"
          description={`We couldn't find any servers matching "${searchQuery}". Try adjusting your search.`}
          actions={
            <Button variant="outline" onClick={onClearSearch}>
              Clear search
            </Button>
          }
        />
      );
    }
    return (
      <EmptyState
        variant="no-items"
        title="No servers available"
        description="There are no MCP servers in the catalog yet. Check back later."
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
            const gk = m.group_key || String(m.payload_ref || "").split(":")[0] || "";
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
