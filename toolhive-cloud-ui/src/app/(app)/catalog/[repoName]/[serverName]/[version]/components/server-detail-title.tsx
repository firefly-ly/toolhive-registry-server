import { Badge } from "@/components/ui/badge";
import { DetailHeader } from "@/components/detail-header";
import type { V0ServerJson } from "@/generated";
import { isVirtualMCPServer } from "@/lib/utils";

interface ServerDetailTitleProps {
  server: V0ServerJson;
  version: string;
}

export function ServerDetailTitle({ server, version }: ServerDetailTitleProps) {
  const { name, repository } = server;
  const serverName = server.title ?? name ?? "Unknown server name";
  const publisher = repository?.source;
  const type = server.remotes?.[0]?.type;

  const badges = [
    isVirtualMCPServer(server) && (
      <Badge key="virtual" variant="secondary" className="text-xs font-semibold">
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
      backHref="/catalog"
      backLabel="返回目录"
      title={serverName}
      subtitle={publisher ? `由 ${publisher} 提交` : undefined}
      badges={badges}
    />
  );
}
