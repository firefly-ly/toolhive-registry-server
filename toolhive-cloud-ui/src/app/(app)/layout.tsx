import { AppShell } from "@/components/app-shell";
import { AssistantLayout } from "@/components/assistant-layout";
import { Navbar } from "@/components/navbar";
import { getAuthContext } from "@/lib/auth/context";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 单次鉴权读取，结果同步分发给顶栏与侧栏（用户区/管理员徽章 + admin 导航项）
  const { user, isAdmin } = await getAuthContext();

  return (
    <AssistantLayout>
      <AppShell
        isAdmin={isAdmin}
        navbar={<Navbar user={user} isAdmin={isAdmin} />}
      >
        {children}
      </AppShell>
    </AssistantLayout>
  );
}
