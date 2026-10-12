import { headers } from "next/headers";
import { getRegistries, getServers } from "@/app/(app)/catalog/actions";
import { PageHeader } from "@/components/header-page";
import { auth } from "@/lib/auth/auth";
import type { McpServer, Skill } from "@/lib/platform-backend";
import {
  getMcpById,
  getMcpServers,
  getSkillById,
  getSkills,
  getTrend,
  listFavorites,
} from "@/lib/platform-backend";
import { safe } from "@/lib/safe-async";
import { type FavRow, FavsBlock } from "./favs-block";

async function currentActor(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.email ?? session?.user?.name ?? "anonymous";
}

/** 使用动态条目：收藏条目近 14 天的调用/下载事件 */
export interface ActivityEntry {
  date: string;
  text: string;
  count: number;
}

export default async function FavoritesPage() {
  const actor = await currentActor();
  const [favorites, skills, serversResult, submittedMcps, trend, registries] =
    await Promise.all([
      safe(listFavorites(actor), [], "favorites.list"),
      safe(getSkills(), [], "favorites.getSkills"),
      safe(getServers(), { servers: [] }, "favorites.getServers"),
      safe(getMcpServers(), [], "favorites.getMcpServers"),
      safe(getTrend(14), { days: [], series: [] }, "favorites.trend"),
      safe(getRegistries(), [], "favorites.registries"),
    ]);

  const skillById = new Map(skills.map((s) => [s.id, s]));
  const serverByName = new Map(
    (serversResult.servers ?? []).map((s) => [s.name, s]),
  );
  const submittedMcpById = new Map(submittedMcps.map((m) => [m.id, m]));
  const registryName = registries[0]?.name ?? "default";

  // 收藏可能指向已不在展示列表的条目（同组旧版本 / 受限可见性），
  // 对未命中的 ref 逐个走单查接口补解析；仍失败（已删除 / 无权限）则降级展示。
  const unresolvedMcps = [
    ...new Set(
      favorites
        .filter(
          (f) =>
            f.item_type === "mcp" &&
            !serverByName.has(f.item_ref) &&
            !submittedMcpById.has(f.item_ref),
        )
        .map((f) => f.item_ref),
    ),
  ];
  const unresolvedSkills = [
    ...new Set(
      favorites
        .filter((f) => f.item_type === "skill" && !skillById.has(f.item_ref))
        .map((f) => f.item_ref),
    ),
  ];
  const [extraMcpEntries, extraSkillEntries] = await Promise.all([
    Promise.all(
      unresolvedMcps.map(
        async (id) =>
          [id, await safe(getMcpById(id), null, "favorites.mcpById")] as const,
      ),
    ),
    Promise.all(
      unresolvedSkills.map(
        async (id) =>
          [
            id,
            await safe(getSkillById(id), null, "favorites.skillById"),
          ] as const,
      ),
    ),
  ]);
  const extraMcpById = new Map(
    extraMcpEntries.filter(([, m]) => m !== null),
  ) as Map<string, McpServer>;
  const extraSkillById = new Map(
    extraSkillEntries.filter(([, s]) => s !== null),
  ) as Map<string, Skill>;

  const titleOf = (type: string, ref: string): string => {
    if (type === "skill")
      return skillById.get(ref)?.name ?? extraSkillById.get(ref)?.name ?? ref;
    return (
      serverByName.get(ref)?.title ??
      (submittedMcpById.get(ref) ?? extraMcpById.get(ref))?.name ??
      ref
    );
  };

  const rows: FavRow[] = favorites.map((f) => {
    if (f.item_type === "skill") {
      const s = skillById.get(f.item_ref) ?? extraSkillById.get(f.item_ref);
      return {
        item_type: "skill",
        item_ref: f.item_ref,
        title: s?.name ?? f.item_ref,
        metric: s ? `${s.download_count} 次` : "",
        description: s?.description ?? "",
        href: s
          ? `/skills/${encodeURIComponent(f.item_ref)}?from=favorites`
          : "",
      };
    }
    const registryServer = serverByName.get(f.item_ref);
    const submitted =
      submittedMcpById.get(f.item_ref) ?? extraMcpById.get(f.item_ref);
    // registry 上游条目走目录的标准详情路由（与目录卡片一致），
    // 平台提交条目走 /mcp/[ref]；两者都未命中 = 已下线/无权限，不给跳转。
    const href = registryServer
      ? `/catalog/${registryServer.name}/${registryServer.version || "latest"}?registryName=${encodeURIComponent(registryName)}&from=favorites`
      : submitted
        ? `/mcp/${encodeURIComponent(f.item_ref)}?from=favorites`
        : "";
    return {
      item_type: "mcp",
      item_ref: f.item_ref,
      title: registryServer?.title ?? submitted?.name ?? f.item_ref,
      metric: submitted !== undefined ? `${submitted.call_count} 次` : "",
      description: registryServer?.description ?? submitted?.description ?? "",
      href,
    };
  });

  // 使用动态：收藏条目近 14 天的调用/下载事件（trend 逐日序列 → 倒序展平）
  const favKeys = new Set(favorites.map((f) => `${f.item_type}-${f.item_ref}`));
  const activity: ActivityEntry[] = [];
  for (const s of trend.series) {
    if (!favKeys.has(`${s.item_type}-${s.item_ref}`)) continue;
    const label = s.event === "call" ? "调用了" : "下载了";
    const name = titleOf(s.item_type, s.item_ref);
    s.data.forEach((cnt, i) => {
      if (cnt > 0 && trend.days[i]) {
        activity.push({
          date: trend.days[i],
          text: `${label} ${name}`,
          count: cnt,
        });
      }
    });
  }
  activity.sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="-mr-8 flex h-full flex-col overflow-y-auto pr-8">
      <PageHeader title="我的工作台" />
      <div className="pb-10">
        <FavsBlock
          title="我的工作台"
          count={rows.length}
          rows={rows}
          activity={activity.slice(0, 8)}
        />
      </div>
    </div>
  );
}
