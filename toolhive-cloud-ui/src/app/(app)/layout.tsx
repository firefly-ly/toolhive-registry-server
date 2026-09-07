import { AssistantLayout } from "@/components/assistant-layout";
import { Navbar } from "@/components/navbar";
import { SidebarInset } from "@/components/ui/sidebar";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AssistantLayout>
      <SidebarInset className="flex h-screen min-w-0 flex-col">
        <Navbar />
        <main className="flex flex-1 flex-col overflow-hidden bg-sidebar px-8 pt-8 pb-5 dark:bg-background">
          {children}
        </main>
      </SidebarInset>
    </AssistantLayout>
  );
}
