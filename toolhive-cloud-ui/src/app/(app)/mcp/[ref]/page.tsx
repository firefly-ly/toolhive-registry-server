import { AlertCircle } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { getServers } from "@/app/(app)/catalog/actions";
import { PageHeader } from "@/components/header-page";
import { NavigateBackButton } from "@/components/navigate-back-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VersionSwitcher } from "@/components/version-switcher";
import type { V0ServerJson } from "@/generated/types.gen";
import { auth } from "@/lib/auth/auth";
import { getAuthContext } from "@/lib/auth/context";
import {
  getFavoriteCounts,
  getIssues,
  getItemCounts,
  getMcpById,
  getMcpTools,
  listFavorites,
  listGroupVersions,
} from "@/lib/platform-backend";
import { safe } from "@/lib/safe-async";
import { McpServerDetail } from "./components/mcp-server-detail";
import { McpDetailActions } from "./mcp-detail-actions";

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
    from === "stats"
      ? "/stats"
      : from === "favorites"
        ? "/favorites"
        : "/catalog";
  const backLabel =
    from === "stats"
      ? "返回统计"
      : from === "favorites"
        ? "返回收藏"
        : "返回 MCP 市场";

  // 并行第一轮：主体、会话、收藏、registry 服务器四路同时发起（原先为 4 段串行）
  const [submitted, session, favorites, serversResult] = await Promise.all([
    safe(getMcpById(ref), null, "mcpDetail.getById"),
    auth.api.getSession({ headers: await headers() }).catch(() => null),
    safe(listFavorites(), [], "mcpDetail.favorites"),
    safe(getServers(), { servers: [] }, "mcpDetail.getServers"),
  ]);

  const actor = session?.user?.email ?? session?.user?.name ?? "";
  const favorited =
    !!actor &&
    favorites.some(
      (f) => f.user_id === actor && f.item_type === "mcp" && f.item_ref === ref,
    );

  // 2) 否则当作 registry 服务器名处理
  if (!submitted) {
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
                    该 MCP 当前不在 MCP
                    市场中（可能已下线或未运行），无法查看详情。
                  </CardDescription>
                </CardHeader>
                <CardFooter className="flex justify-center gap-3">
                  <NavigateBackButton href={backHref} label={backLabel} />
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/catalog">返回 MCP 市场</Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      );
    }

    const [calls, favs] = await Promise.all([
      safe(
        getItemCounts("mcp", "call"),
        {} as Record<string, number>,
        "mcpDetail.callCounts",
      ),
      safe(
        getFavoriteCounts("mcp"),
        {} as Record<string, number>,
        "mcpDetail.favCounts",
      ),
    ]);
    const callCount = calls[ref] ?? 0;
    const favoriteCount = favs[ref] ?? 0;

    return (
      <div className="flex h-full flex-col">
        <PageHeader title={server.title ?? server.name ?? ref} />
        <div className="flex-1 overflow-auto">
          {/* 详情页统一口径：全宽靠左，不做居中限宽 */}
          <div className="space-y-6 py-4">
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
              endpoint={
                (server as V0ServerJson & { endpoint?: string }).endpoint
              }
              publicEndpoint={
                (server as V0ServerJson & { public_endpoint?: string })
                  .public_endpoint
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
  const mGroup =
    submitted.group_key || String(submitted.payload_ref || "").split(":")[0];

  // 并行第二轮：依赖 submitted 的四路同时发起（原先版本聚合先串行、tools 再排在其后）
  const [gvRes, authCtxRes, toolsResult, issues] = await Promise.all([
    mGroup
      ? safe(listGroupVersions(mGroup), null, "mcpDetail.groupVersions")
      : Promise.resolve(null),
    getAuthContext(),
    // 取数失败带 failed 标记：工具 tab 明确提示可刷新重试（失败留痕）
    safe(
      getMcpTools(submitted.id),
      { tools: [], live: false, failed: true },
      "mcpDetail.getTools",
    ),
    safe(getIssues("mcp", submitted.payload_ref), [], "mcpDetail.getIssues"),
  ]);
  const mVersionOptions = (gvRes?.versions || [])
    .filter((v) => v.on_shelf !== false && v.id)
    .map((v) => ({ id: v.id, label: `v${v.version || "1.0.0"}` }));

  const isAdmin = authCtxRes.isAdmin;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto">
        {/* 详情页统一口径：全宽靠左，不做居中限宽 */}
        <div className="py-4">
          <McpServerDetail
            mcp={submitted}
            favorited={favorited}
            callCount={submitted.call_count}
            favoriteCount={submitted.favorite_count}
            tools={toolsResult.tools}
            toolsLive={toolsResult.live}
            toolsFailed={toolsResult.failed === true}
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
