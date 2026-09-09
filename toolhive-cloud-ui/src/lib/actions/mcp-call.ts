"use server";

import { request } from "@/lib/platform-backend";

// MCP 调用：由 Next 服务端打到平台后端 /mcp/call，
// 后端以 MCP 客户端连到 ToolHive 运行的 MCP server。返回后端原始 JSON。
export async function callMcpAction(
  ref: string,
  endpoint: string | undefined,
  tool?: string,
  args?: Record<string, unknown>,
) {
  const res = await request("/mcp/call", {
    method: "POST",
    body: JSON.stringify({ ref, endpoint, tool, args }),
  });
  return res as {
    ok?: boolean;
    endpoint?: string;
    stage?: string;
    events?: unknown[];
    error?: string;
    detail?: string;
  };
}
