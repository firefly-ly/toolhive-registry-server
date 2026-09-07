// 真实本地 MCP 运行时（demo）.
// 由 mock 平台后端在「部署」时通过 child_process.spawn 拉起，
// 使用 @modelcontextprotocol/sdk 的 SSE 传输暴露一组真实可调用 tool，
// 让前端「调用 MCP」按钮真正端到端可用（不再 mock 返回空 tools）。
//
// 监听 0.0.0.0:<port>，就绪后向 stdout 打印 READY:<port> 供父进程解析。
// 这是开发/演示用的真实 MCP server 进程；上生产后由 ToolHive 运行用户实际提交的镜像替换。

import { createServer } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

const PORT = Number(process.argv[2] ?? process.env.PORT ?? 8731);

const server = new McpServer({ name: "demo-mcp-runtime", version: "1.0.0" });

server.registerTool(
  "echo",
  {
    title: "Echo",
    description: "原样回显输入的文本",
    inputSchema: { message: z.string() },
  },
  async ({ message }) => ({
    content: [{ type: "text", text: String(message) }],
  }),
);

server.registerTool(
  "add",
  {
    title: "Add",
    description: "返回两个整数之和",
    inputSchema: { a: z.number(), b: z.number() },
  },
  async ({ a, b }) => ({
    content: [{ type: "text", text: String(Number(a) + Number(b)) }],
  }),
);

server.registerTool(
  "current_time",
  {
    title: "Current Time",
    description: "返回运行时服务器当前时间（ISO8601）",
    inputSchema: {},
  },
  async () => ({
    content: [{ type: "text", text: new Date().toISOString() }],
  }),
);

server.registerTool(
  "shout",
  {
    title: "Shout",
    description: "把输入文本转成大写",
    inputSchema: { text: z.string() },
  },
  async ({ text }) => ({
    content: [{ type: "text", text: String(text).toUpperCase() }],
  }),
);

const transports = new Map();

const httpServer = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  try {
    if (req.method === "GET" && url.pathname === "/sse") {
      const transport = new SSEServerTransport("/messages", res);
      transports.set(transport.sessionId, transport);
      res.on("close", () => transports.delete(transport.sessionId));
      await server.connect(transport);
      // 保持响应打开（SSE 长连接），不要 end()
      return;
    }
    if (req.method === "POST" && url.pathname === "/messages") {
      const sessionId = url.searchParams.get("sessionId");
      const transport = transports.get(sessionId);
      if (!transport) {
        res.writeHead(400).end("Unknown sessionId");
        return;
      }
      let body = "";
      for await (const chunk of req) body += chunk;
      await transport.handlePostMessage(
        req,
        res,
        body ? JSON.parse(body) : undefined,
      );
      return;
    }
    res.writeHead(404).end("Not found");
  } catch (e) {
    if (!res.headersSent) res.writeHead(500).end(String(e));
    else res.end();
  }
});

httpServer.on("error", (e) => {
  console.error("[demo-mcp-server] fatal:", e);
  process.exit(1);
});

httpServer.listen(PORT, "0.0.0.0", () => {
  const addr = httpServer.address();
  const p = typeof addr === "object" && addr ? addr.port : PORT;
  process.stdout.write(`READY:${p}\n`);
});
