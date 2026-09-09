import { getServers } from "@/app/(app)/catalog/actions";
import { AssistantShellLazy } from "@/components/assistant-shell-lazy";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { SidebarProvider } from "@/components/ui/sidebar";
import { getOpenRouterModels } from "@/features/assistant/actions/model-actions";

interface AssistantLayoutProps {
  children: React.ReactNode;
}

export async function AssistantLayout({ children }: AssistantLayoutProps) {
  const [models, { servers }] = await Promise.all([
    getOpenRouterModels(),
    getServers(),
  ]);

  return (
    <SidebarProvider defaultOpen={false}>
      {children}
      {/* 聊天栈整体懒加载：providers 只包侧栏自身，children 不再被拖入聊天依赖图。
          ErrorBoundary 放在 lazy 门外面，动态 chunk 加载/渲染失败也能兜住。 */}
      <ErrorBoundary>
        <AssistantShellLazy models={models} initialServers={servers} />
      </ErrorBoundary>
    </SidebarProvider>
  );
}
