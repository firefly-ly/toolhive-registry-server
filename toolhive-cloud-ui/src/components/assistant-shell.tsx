"use client";

import { ErrorBoundary } from "@/components/ui/error-boundary";
import {
  AssistantSidebar,
  ChatProvider,
  McpSettingsProvider,
  ModelsProvider,
} from "@/features/assistant";
import type { V0ServerJson } from "@/generated/types.gen";

interface AssistantShellProps {
  models: string[];
  initialServers: V0ServerJson[];
}

/**
 * AI 助手完整客户端栈（providers + 侧栏 + 聊天 UI）。
 * 整棵树被 assistant-shell-lazy 按需动态加载，与主 bundle 隔离：
 * @ai-sdk/react、dexie、MCP SDK、streamdown 等重依赖只在首次打开助手时下载。
 */
export default function AssistantShell({
  models,
  initialServers,
}: AssistantShellProps) {
  return (
    <ModelsProvider models={models}>
      <McpSettingsProvider initialServers={initialServers}>
        <ChatProvider>
          <ErrorBoundary>
            <AssistantSidebar models={models} />
          </ErrorBoundary>
        </ChatProvider>
      </McpSettingsProvider>
    </ModelsProvider>
  );
}
