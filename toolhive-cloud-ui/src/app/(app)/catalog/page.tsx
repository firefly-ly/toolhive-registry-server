import { headers } from "next/headers";
import type { V0ServerJson } from "@/generated/types.gen";
import { auth } from "@/lib/auth/auth";
import {
  getItemCountsCached,
  getMcpById,
  getMcpServers,
  listFavorites,
  listGroupVersions,
  type McpServer,
} from "@/lib/platform-backend";
import { safe } from "@/lib/safe-async";
import { getRegistries, getServersByRegistryName } from "./actions";
import { ServersWrapper } from "./components/servers-wrapper";
import { CATALOG_PAGE_SIZE } from "./constants";

interface CatalogPageProps {
  searchParams: Promise<{
    registryName?: string;
    cursor?: string;
    limit?: string;
    search?: string;
  }>;
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const { registryName, cursor, search } = await searchParams;

  const registries = await getRegistries();
  const selectedRegistry = registryName ?? registries[0]?.name;

  // registry 列表现在由 mock 返回全量（不分页），供下面统一分页
  const { servers: allRegistryServers } = selectedRegistry
    ? await getServersByRegistryName(selectedRegistry, {
        search: search || undefined,
      })
    : { servers: [] };

  // 搜索词提前算好：搜索时跳过最重的版本聚合（见下），只做匹配与分页
  const q = (search ?? "").trim().toLowerCase();

  // 从平台后端取当前用户的 MCP 收藏集合 + 各 MCP 的调用次数
  let favoritedRefs: string[] = [];
  let callsByRef: Record<string, number> = {};
  let submittedMcps: McpServer[] = [];
  const siblingGroups: Record<string, McpServer[]> = {};
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const actor = session?.user?.email ?? session?.user?.name ?? "";
    // 收藏 / 调用计数 / 已提交 MCP 三者相互独立，并行获取（原先串行三次往返）
    const [favorites, counts, mcps] = await Promise.all([
      actor
        ? safe(listFavorites(), [], "catalog.listFavorites")
        : Promise.resolve([]),
      safe(getItemCountsCached("mcp", "call"), {}, "catalog.getItemCounts"),
      safe(getMcpServers(), [], "catalog.getMcpServers"),
    ]);
    favoritedRefs = favorites
      .filter((f) => f.user_id === actor && f.item_type === "mcp")
      .map((f) => f.item_ref);
    callsByRef = counts;
    submittedMcps = mcps;
    // 已审批的用户提交 MCP（未审批不会出现在这里）
    if (!q) {
      // 预聚合每个已提交 MCP 的同 group 完整卡片数据（含默认版 + 其它已上架版本）。
      // 列表每 group 只下发默认版（最新已上架）一张卡，其余版本在此预取，供卡片标题版本下拉「就地切换」。
      // ⚠️ 这是 N+1（每 group 一次 listGroupVersions + 每版本一次 getMcpById），
      // 是目录页最重的一段；搜索场景用户只找匹配项，跳过聚合（搜索结果卡不带版本切换）。
      const groupKeys = Array.from(
        new Set(
          submittedMcps.map(
            (m) =>
              m.group_key || String(m.payload_ref || "").split(":")[0] || "",
          ),
        ),
      ).filter(Boolean);
      const groupResults = await Promise.all(
        groupKeys.map(async (g) => {
          let onShelfIds: string[] = [];
          try {
            const r = await listGroupVersions(g);
            onShelfIds = (r.versions || [])
              .filter((v) => v.on_shelf !== false && v.id)
              .map((v) => v.id);
          } catch (error) {
            // 单个 group 的版本列表失败只影响该组卡片聚合，留痕
            console.error(`[catalog.groupVersions:${g}]`, error);
          }
          const activeCards = submittedMcps.filter(
            (m) =>
              (m.group_key ||
                String(m.payload_ref || "").split(":")[0] ||
                "") === g,
          );
          const have = new Set(activeCards.map((m) => m.id));
          const siblingIds = onShelfIds.filter((id) => !have.has(id));
          const fetched = await Promise.all(
            siblingIds.map((id) =>
              safe(getMcpById(id), null, `catalog.getMcpById:${id}`),
            ),
          );
          return {
            g,
            cards: [
              ...activeCards,
              ...fetched.filter((x): x is McpServer => !!x),
            ],
          };
        }),
      );
      for (const { g, cards } of groupResults) {
        // 仅当一个 group 有多张（不同版本）卡片时才下发，单版本不打扰
        if (cards.length > 1) siblingGroups[g] = cards;
      }
    }
  } catch (error) {
    // 后端不可用时静默降级，卡片照常渲染（无星标/计数），但留痕
    console.error("[catalog.page] 收藏/计数/版本聚合失败:", error);
  }

  // 搜索词同时过滤用户提交 MCP，保证合并后的分页总数正确
  const filteredSubmitted = q
    ? submittedMcps.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q),
      )
    : submittedMcps;

  // 把 registry servers 与用户提交 MCP 合并后统一分页，
  // 避免「下一页内容不变」以及「用户提交 MCP 每页都出现」
  const offset = Number(cursor) || 0;
  const limit = CATALOG_PAGE_SIZE;
  type MixedItem =
    | { type: "registry"; data: V0ServerJson }
    | { type: "submitted"; data: McpServer };
  const allItems: MixedItem[] = [
    ...allRegistryServers.map((s) => ({ type: "registry" as const, data: s })),
    ...filteredSubmitted.map((m) => ({ type: "submitted" as const, data: m })),
  ];
  const pageItems = allItems.slice(offset, offset + limit);
  const servers = pageItems
    .filter((i): i is Extract<MixedItem, { type: "registry" }> =>
      Boolean(i.type === "registry"),
    )
    .map((i) => i.data);
  const pageSubmitted = pageItems
    .filter((i): i is Extract<MixedItem, { type: "submitted" }> =>
      Boolean(i.type === "submitted"),
    )
    .map((i) => i.data);
  const nextCursor =
    offset + limit < allItems.length ? String(offset + limit) : undefined;

  return (
    <ServersWrapper
      servers={servers}
      registries={registries}
      nextCursor={nextCursor}
      favoritedRefs={favoritedRefs}
      callsByRef={callsByRef}
      submittedMcps={pageSubmitted}
      siblingGroups={siblingGroups}
    />
  );
}
