/**
 * MCP client configuration utilities
 * Generates installation configs/commands for different MCP clients
 */

/** Supported MCP client types */
export const MCP_CLIENTS = {
  cursor: "cursor",
  vscode: "vscode",
  claudeCode: "claude-code",
} as const;

export type McpClientType = (typeof MCP_CLIENTS)[keyof typeof MCP_CLIENTS];

/** Transport configuration for remote MCP servers */
export interface McpRemoteConfig {
  url: string;
  headers?: Record<string, string>;
}

/** Transport configuration for stdio MCP servers */
export interface McpStdioConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export type McpTransportConfig = McpRemoteConfig | McpStdioConfig;

/** Check if config is remote (has url) */
export function isRemoteConfig(
  config: McpTransportConfig,
): config is McpRemoteConfig {
  return "url" in config;
}

/** Check if config is stdio (has command) */
export function isStdioConfig(
  config: McpTransportConfig,
): config is McpStdioConfig {
  return "command" in config;
}

/**
 * Normalizes an MCP server name for use in client configurations.
 *
 * Valid characters are alphanumeric, CJK, dots, hyphens, and underscores.
 * This handles:
 * - Kubernetes reverse DNS names (e.g. "com.toolhive.k8s/github-proxy")
 * - Human-readable titles (e.g. "MCP GitHub" → "MCP-GitHub")
 * - CJK display names are preserved（客户端配置的 key 只是本地标签，
 *   主流客户端均接受中文；历史上"新零售"这类纯中文名会被裁成空串，
 *   导致生成的调用 JSON 键名为 ""）
 * - Any other characters replaced with "-", consecutive hyphens collapsed,
 *   and leading/trailing hyphens stripped.
 */
export function normalizeServerName(name: string): string {
  const normalized = name
    .replace(
      /[^a-zA-Z0-9\u3400-\u4dbf\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af_-]/g,
      "-",
    )
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
  // 全部字符都被剔除时（纯符号/emoji），兜底为通用名，避免生成空键名
  return normalized || "mcp-server";
}

/**
 * Client-specific configuration generators
 */

/** Generate Cursor deeplink for MCP installation */
export function buildCursorDeeplink(
  serverName: string,
  config: McpTransportConfig,
): string {
  const configJson = JSON.stringify(config);
  const base64Config = btoa(configJson);
  const encodedName = encodeURIComponent(serverName);
  const encodedConfig = encodeURIComponent(base64Config);

  return `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodedName}&config=${encodedConfig}`;
}

/** Generate VS Code deeplink for MCP installation */
export function buildVSCodeDeeplink(
  serverName: string,
  config: McpTransportConfig,
): string {
  const mcpConfig = {
    name: serverName,
    ...config,
  };
  const configJson = JSON.stringify(mcpConfig);
  return `vscode:mcp/install?${encodeURIComponent(configJson)}`;
}

/** Generate Claude Code CLI command for MCP installation */
export function buildClaudeCodeCommand(
  serverName: string,
  config: McpTransportConfig,
): string {
  if (isRemoteConfig(config)) {
    let command = `claude mcp add --transport http "${serverName}" ${config.url}`;
    if (config.headers) {
      for (const [key, value] of Object.entries(config.headers)) {
        command += ` --header "${key}: ${value}"`;
      }
    }
    return command;
  }

  // stdio config
  const args = config.args?.join(" ") ?? "";
  return `claude mcp add "${serverName}" -- ${config.command} ${args}`.trim();
}

/**
 * Generate WorkBuddy config snippet (`~/.workbuddy/mcp.json`).
 *
 * 关于 type：ToolHive 暴露的是 `/mcp`（streamable-http）端点，而 WorkBuddy 桌面版
 * 的配置项里没有 streamable-http，实测对这类端点填 `type: "sse"` 能被正确探测并
 * 连通（状态灯变绿、工具正常加载）；命令行版 (`codebuddy mcp add --transport http`)
 * 支持 `http`。这里默认输出 `sse` —— 它是当前被实测验证可用的取值。
 */
export function buildWorkbuddyConfig(
  serverName: string,
  config: McpTransportConfig,
): string {
  const entry = isRemoteConfig(config)
    ? {
        type: "sse",
        url: config.url,
        ...(config.headers && Object.keys(config.headers).length > 0
          ? { headers: config.headers }
          : {}),
      }
    : {
        type: "stdio",
        command: config.command,
        ...(config.args && config.args.length > 0 ? { args: config.args } : {}),
        ...(config.env && Object.keys(config.env).length > 0
          ? { env: config.env }
          : {}),
      };
  return JSON.stringify({ mcpServers: { [serverName]: entry } }, null, 2);
}

/** Client metadata for UI display */
export const CLIENT_METADATA: Record<
  McpClientType,
  {
    name: string;
    hasDeeplink: boolean;
    menuLabel: string;
  }
> = {
  [MCP_CLIENTS.cursor]: {
    name: "Cursor",
    hasDeeplink: true,
    menuLabel: "Cursor",
  },
  [MCP_CLIENTS.vscode]: {
    name: "VS Code",
    hasDeeplink: true,
    menuLabel: "VS Code",
  },
  [MCP_CLIENTS.claudeCode]: {
    name: "Claude Code",
    hasDeeplink: false,
    menuLabel: "Claude Code (copy CLI command)",
  },
};

/** List of MCP clients for dropdown menus */
export const MCP_CLIENT_LIST = Object.entries(CLIENT_METADATA).map(
  ([client, metadata]) => ({
    client: client as McpClientType,
    label: metadata.menuLabel,
    action: metadata.hasDeeplink ? ("open" as const) : ("copy" as const),
  }),
);
