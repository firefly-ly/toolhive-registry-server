import { headers } from "next/headers";
import { getServers } from "@/app/(app)/catalog/actions";
import { PageHeader } from "@/components/header-page";
import { auth } from "@/lib/auth/auth";
import {
  getMcpServers,
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
  const [favorites, skills, serversResult, submittedMcps, trend] =
    await Promise.all([
      safe(listFavorites(actor), [], "favorites.list"),
      safe(getSkills(), [], "favorites.getSkills"),
      safe(getServers(), { servers: [] }, "favorites.getServers"),
      safe(getMcpServers(), [], "favorites.getMcpServers"),
      safe(getTrend(14), { days: [], series: [] }, "favorites.trend"),
    ]);

  const skillById = new Map(skills.map((s) => [s.id, s]));
  const serverByName = new Map(
    (serversResult.servers ?? []).map((s) => [s.name, s]),
  );
  const submittedMcpById = new Map(submittedMcps.map((m) => [m.id, m]));

  const titleOf = (type: string, ref: string): string => {
    if (type === "skill") return skillById.get(ref)?.name ?? ref;
    return (
      serverByName.get(ref)?.title ?? submittedMcpById.get(ref)?.name ?? ref
    );
  };

  const rows: FavRow[] = favorites.map((f) => {
    if (f.item_type === "skill") {
      const s = skillById.get(f.item_ref);
      return {
        item_type: "skill",
        item_ref: f.item_ref,
        title: s?.name ?? f.item_ref,
        metric: s ? `${s.download_count} 次` : "",
        description: s?.description ?? "",
        href: `/skills/${encodeURIComponent(f.item_ref)}?from=favorites`,
      };
    }
    const registryServer = serverByName.get(f.item_ref);
    const submitted = submittedMcpById.get(f.item_ref);
    return {
      item_type: "mcp",
      item_ref: f.item_ref,
      title: registryServer?.title ?? submitted?.name ?? f.item_ref,
      metric: submitted !== undefined ? `${submitted.call_count} 次` : "",
      description: registryServer?.description ?? submitted?.description ?? "",
      href: `/mcp/${encodeURIComponent(f.item_ref)}?from=favorites`,
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
