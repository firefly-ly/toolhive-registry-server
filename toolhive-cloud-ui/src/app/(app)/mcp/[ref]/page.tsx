import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import {
  getMcpById,
  listFavorites,
  getItemCounts,
  getFavoriteCounts,
  getMcpTools,
  getIssues,
  listGroupVersions,
} from "@/lib/platform-backend";
import { getServers } from "@/app/(app)/catalog/actions";
import { getAuthContext } from "@/lib/auth/context";
import type { V0ServerJson } from "@/generated/types.gen";
import { PageHeader } from "@/components/header-page";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { McpDetailActions } from "./mcp-detail-actions";
import { McpServerDetail } from "./components/mcp-server-detail";
import { NavigateBackButton } from "@/components/navigate-back-button";
import { VersionSwitcher } from "@/components/version-switcher";

interface McpDetailPageProps {
  params: Promise<{ ref: string }>;
  searchParams: Promise<{ from?: string; call?: string }>;
}

export default async function McpDetailPage({
  params,
  searchParams,
}: McpDetailPageProps) {
  const { ref } = await params;
  const { from, call } = await searchParams;
  const backHref =
    from === "stats" ? "/stats" : from === "favorites" ? "/favorites" : "/catalog";
  const backLabel =
    from === "stats"
      ? "返回统计"
      : from === "favorites"
        ? "返回收藏"
        : "返回目录";

  // 1) 先尝试用户提交的已审批 MCP（按 id）
  const submitted = await getMcpById(ref).catch(() => null);

  // 当前用户收藏状态（用于高亮星标）
  let favorited = false;
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const actor = session?.user?.email ?? session?.user?.name ?? "";
    if (actor) {
      const favorites = await listFavorites();
      favorited = favorites.some(
        (f) => f.user_id === actor && f.item_type === "mcp" && f.item_ref === ref,
      );
    }
  } catch (_) {
    // 后端不可用时按未收藏处理
  }

  // 2) 否则当作 registry 服务器名处理
  if (!submitted) {
    const serversResult = await getServers().catch(() => ({ servers: [] }));
    const server = (serversResult.servers ?? []).find((s) => s.name === ref);
    if (!server) {
      return (
        <div className="flex h-full flex-col">
          <PageHeader title={ref} />
          <div className="flex-1 overflow-auto">
            <div className="mx-auto flex max-w-3xl items-center justify-center py-4">
              <Card className="w-full">
                <CardHeader className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <AlertCircle className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-xl">MCP 当前不可用</CardTitle>
                  <CardDescription className="text-base">
                    该 MCP 当前不在目录中（可能已下线或未运行），无法查看详情。
                  </CardDescription>
                </CardHeader>
                <CardFooter className="flex justify-center gap-3">
                  <NavigateBackButton href={backHref} label={backLabel} />
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/catalog">返回目录</Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      );
    }

    const [calls, favs] = await Promise.all([
      getItemCounts("mcp", "call").catch(() => ({}) as Record<string, number>),
      getFavoriteCounts("mcp").catch(() => ({}) as Record<string, number>),
    ]);
    const callCount = calls[ref] ?? 0;
    const favoriteCount = favs[ref] ?? 0;

    return (
      <div className="flex h-full flex-col">
        <PageHeader title={server.title ?? server.name ?? ref} />
        <div className="flex-1 overflow-auto">
          <div className="mx-auto max-w-3xl space-y-6 py-4">
            <NavigateBackButton href={backHref} label={backLabel} />
            <p className="whitespace-pre-line text-base leading-7 text-muted-foreground">
              {server.description || "暂无描述"}
            </p>
            <McpDetailActions
              itemRef={server.name ?? ref}
              name={server.title ?? server.name ?? ref}
              favorited={favorited}
              callCount={callCount}
              favoriteCount={favoriteCount}
              endpoint={(server as V0ServerJson & { endpoint?: string }).endpoint}
              publicEndpoint={
                (server as V0ServerJson & { public_endpoint?: string })
                  .public_endpoint
              }
              mcpHeaders={
                (server as V0ServerJson & {
                  mcp_headers?: Record<string, string>;
                }).mcp_headers
              }
              healthy={(server as V0ServerJson & { healthy?: boolean }).healthy}
              autoCall={call === "1"}
            />
            <Button variant="outline" size="sm" asChild>
              <Link href={`/catalog?search=${encodeURIComponent(ref)}`}>
                在目录中打开
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 同 group 的多版本：仅已上架(on_shelf)版本出现于版本下拉
  const mGroup = submitted.group_key || String(submitted.payload_ref || "").split(":")[0];
  let mVersionOptions: { id: string; label: string }[] = [];
  if (mGroup) {
    try {
      const gv = await listGroupVersions(mGroup);
      mVersionOptions = (gv.versions || [])
        .filter((v) => v.on_shelf !== false && v.id)
        .map((v) => ({ id: v.id, label: `v${v.version || "1.0.0"}` }));
    } catch (_) {
      /* ignore */
    }
  }

  const [{ isAdmin }, toolsResult, issues] = await Promise.all([
    getAuthContext(),
    getMcpTools(submitted.id).catch(() => ({ tools: [], live: false })),
    getIssues("mcp", submitted.payload_ref).catch(() => []),
  ]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl py-4">
          <McpServerDetail
            mcp={submitted}
            favorited={favorited}
            callCount={submitted.call_count}
            favoriteCount={submitted.favorite_count}
            tools={toolsResult.tools}
            toolsLive={toolsResult.live}
            issues={issues}
            isAdmin={isAdmin}
            backHref={backHref}
            backLabel={backLabel}
            autoCall={call === "1"}
            actions={
              <VersionSwitcher
                basePath="mcp"
                groupLabel={submitted.name || mGroup}
                currentId={submitted.id}
                options={mVersionOptions}
                from={from}
              />
            }
          />
        </div>
      </div>
    </div>
  );
}
