"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useSidebar } from "@/components/ui/sidebar";
import type { V0ServerJson } from "@/generated/types.gen";

const AssistantShell = dynamic(() => import("@/components/assistant-shell"));

/**
 * 助手侧栏的懒加载门：
 * - 首屏（侧栏收起）完全不加载聊天栈 chunk（@ai-sdk/react、dexie、MCP SDK、
 *   streamdown 等），点开助手/快捷键展开时才动态拉取；
 * - 首次展开后保持挂载（once 语义），关闭再开不丢聊天上下文，与原行为一致。
 */
export function AssistantShellLazy({
  models,
  initialServers,
}: {
  models: string[];
  initialServers: V0ServerJson[];
}) {
  const { state, isMobile, openMobile } = useSidebar();
  const expanded = isMobile ? openMobile : state === "expanded";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (expanded) setMounted(true);
  }, [expanded]);

  if (!mounted) return null;
  return <AssistantShell models={models} initialServers={initialServers} />;
}
