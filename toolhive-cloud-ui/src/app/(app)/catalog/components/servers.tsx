"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { V0ServerJson } from "@/generated/types.gen";
import type { McpServer, Skill } from "@/lib/platform-backend";
import { SkillCard } from "../../skills/skill-card";
import { EmptyState } from "./empty-state";
import { ServerCard } from "./server-card";
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
  /** IA 合并：已上架 Skill 与 MCP 混排 */
  skills?: Skill[];
  skillFavoritedRefs?: string[];
  skillSiblingGroups?: Record<string, Skill[]>;
}

/**
 * Client component that displays servers based on view mode.
 * Filtering is done server-side — this component renders whatever servers are passed in.
 * Approved user-submitted MCPs and published Skills are mixed into the same
 * grid/list so that all catalog entries appear in one unified flow (IA 合并).
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
  skills = [],
  skillFavoritedRefs = [],
  skillSiblingGroups = {},
}: ServersProps) {
  const router = useRouter();

  const handleServerClick = (server: V0ServerJson) => {
    if (!server.name) return;

    const detailUrl = `/catalog/${server.name}/${server.version || "latest"}?registryName=${encodeURIComponent(registryName)}`;
    router.push(detailUrl);
  };

  const handleSkillClick = (id: string) => {
    router.push(`/skills/${id}`);
  };

  // 搜索过滤已在 ServersWrapper 完成，这里直接渲染传入条目
  const visibleSubmitted = submittedMcps;

  const renderSkillCard = (s: Skill, layout: "grid" | "list") => {
    const gk =
      s.group_key || String(s.item_ref || s.name || "").split(":")[0] || "";
    return (
      <SkillCard
        key={s.id}
        skill={s}
        favorited={skillFavoritedRefs.includes(s.id)}
        onClick={handleSkillClick}
        siblingCards={skillSiblingGroups[gk]}
        layout={layout}
      />
    );
  };

  const hasAnyGridItems =
    servers.length > 0 || visibleSubmitted.length > 0 || skills.length > 0;

  if (!hasAnyGridItems) {
    if (searchQuery) {
      return (
        <EmptyState
          variant="no-matching-items"
          title="未找到匹配结果"
          description={`没有找到与"${searchQuery}"匹配的服务或技能，试试调整搜索条件。`}
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
        title="目录还是空的"
        description="目录中还没有 MCP 服务或 Skill 技能，稍后再来看看。"
      />
    );
  }

  return (
    <div className="space-y-8 pb-6">
      {viewMode === "list" ? (
        <div className="space-y-3 pb-3">
          {servers.map((server) => (
            <ServerCard
              key={server.name}
              server={server}
              serverUrl={server.remotes?.[0]?.url}
              favorited={favoritedRefs.includes(server.name ?? "")}
              callCount={callsByRef[server.name ?? ""] ?? 0}
              onClick={() => handleServerClick(server)}
              layout="list"
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
                layout="list"
              />
            );
          })}
          {skills.map((s) => renderSkillCard(s, "list"))}
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(380px,1fr))] gap-4 pb-3">
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
          {skills.map((s) => renderSkillCard(s, "grid"))}
        </div>
      )}
    </div>
  );
}
