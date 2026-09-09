import type { Metadata } from "next";
import { ClientProviders } from "@/components/client-providers";
import { ServerProviders } from "@/components/server-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "ToolHive Cloud UI",
  description: "ToolHive Cloud UI for managing MCP servers",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased font-sans">
        <ServerProviders>
          <ClientProviders>{children}</ClientProviders>
        </ServerProviders>
      </body>
    </html>
  );
}
