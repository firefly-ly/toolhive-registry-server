"use client";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAddMcpToClient } from "@/hooks/use-add-mcp-to-client";
import { MCP_CLIENT_LIST, normalizeServerName } from "@/lib/mcp/client-configs";

interface AddMcpClientDropdownProps {
  serverName: string;
  serverUrl: string;
  // 平台提交型 MCP 的代理调用凭证（restricted/对外口调用必需），registry 服务器无此字段
  serverHeaders?: Record<string, string>;
}

export function AddMcpToClientDropdown({
  serverName: rawServerName,
  serverUrl,
  serverHeaders,
}: AddMcpClientDropdownProps) {
  const { openInClient, copyCommand } = useAddMcpToClient({
    serverName: normalizeServerName(rawServerName),
    config: { url: serverUrl, headers: serverHeaders },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex h-10 items-center justify-between gap-2 rounded-full"
          onClick={(e) => e.stopPropagation()}
        >
          <span>添加到客户端</span>
          <ChevronDown className="size-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" side="bottom" className="w-64">
        {MCP_CLIENT_LIST.map(({ client, label, action }) => (
          <DropdownMenuItem
            key={client}
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (action === "open") {
                openInClient(client);
              } else {
                copyCommand(client);
              }
            }}
          >
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
