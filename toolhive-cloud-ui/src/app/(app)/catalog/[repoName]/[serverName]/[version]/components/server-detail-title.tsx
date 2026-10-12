import { DetailHeader } from "@/components/detail-header";
import { Badge } from "@/components/ui/badge";
import type { V0ServerJson } from "@/generated";
import { isVirtualMCPServer } from "@/lib/utils";

interface ServerDetailTitleProps {
  server: V0ServerJson;
  version: string;
  /** 来源页标识：favorites = 工作台磁贴进入，返回文案与目标随之切换 */
  from?: string;
}

export function ServerDetailTitle({
  server,
  version,
  from,
}: ServerDetailTitleProps) {
  const { name, repository } = server;
  const serverName = server.title ?? name ?? "Unknown server name";
  const publisher = repository?.source;
  const type = server.remotes?.[0]?.type;

  const badges = [
    isVirtualMCPServer(server) && (
      <Badge
        key="virtual"
        variant="secondary"
        className="text-xs font-semibold"
      >
        Virtual MCP Server
      </Badge>
    ),
    type && (
      <Badge key="type" variant="secondary" className="text-xs">
        {type}
      </Badge>
    ),
    version && (
      <Badge key="version" variant="secondary" className="text-xs">
        v{version}
      </Badge>
    ),
  ];

  return (
    <DetailHeader
      backHref={from === "favorites" ? "/favorites" : "/catalog"}
      backLabel={from === "favorites" ? "返回工作台" : "返回 MCP 目录"}
      title={serverName}
      subtitle={publisher ? `由 ${publisher} 提交` : undefined}
      badges={badges}
    />
  );
}
