import { headers } from "next/headers";
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

interface CatalogPageProps {
  searchParams: Promise<{
    registryName?: string;
  }>;
}

/**
 * MCP 目录（方案 C：客户端搜索）。
 * 服务端一次性下发全量条目（registry + 用户提交 MCP）与装饰数据
 * （收藏/调用计数/版本聚合），搜索与分页全部在客户端完成，零网络往返。
 * 仅注册表切换通过 ?registryName= 重新走服务端。
 */
export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const { registryName } = await searchParams;

  const registries = await getRegistries();
  const selectedRegistry = registryName ?? registries[0]?.name;

  // registry 列表全量返回（不分页），供客户端统一过滤分页
  const { servers: allRegistryServers } = selectedRegistry
    ? await getServersByRegistryName(selectedRegistry)
    : { servers: [] };

  // 从平台后端取当前用户的 MCP 收藏集合 + 各 MCP 的调用次数
  let favoritedRefs: string[] = [];
  let callsByRef: Record<string, number> = {};
  let submittedMcps: McpServer[] = [];
  const siblingGroups: Record<string, McpServer[]> = {};
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const actor = session?.user?.email ?? session?.user?.name ?? "";
    // 收藏 / 调用计数 / 已提交 MCP 三者相互独立，并行获取
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
    // 预聚合每个已提交 MCP 的同 group 完整卡片数据（含默认版 + 其它已上架版本）。
    // 列表每 group 只下发默认版（最新已上架）一张卡，其余版本在此预取，供卡片标题版本下拉「就地切换」。
    // ⚠️ N+1（每 group 一次 listGroupVersions + 每版本一次 getMcpById），
    // 现在只在页面加载时跑一次（搜索已改为客户端过滤，不再重复触发）。
    const groupKeys = Array.from(
      new Set(
        submittedMcps.map(
          (m) => m.group_key || String(m.payload_ref || "").split(":")[0] || "",
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
            (m.group_key || String(m.payload_ref || "").split(":")[0] || "") ===
            g,
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
  } catch (error) {
    // 后端不可用时静默降级，卡片照常渲染（无星标/计数），但留痕
    console.error("[catalog.page] 收藏/计数/版本聚合失败:", error);
  }

  return (
    <ServersWrapper
      servers={allRegistryServers}
      registries={registries}
      favoritedRefs={favoritedRefs}
      callsByRef={callsByRef}
      submittedMcps={submittedMcps}
      siblingGroups={siblingGroups}
    />
  );
}
