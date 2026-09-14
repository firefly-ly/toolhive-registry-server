import { PageHeader } from "@/components/header-page";
import {
  getFavoriteCounts,
  getMcpServers,
  getSkills,
  getTrend,
  getUniqueUsers,
} from "@/lib/platform-backend";
import { safe } from "@/lib/safe-async";
import { StatsDashboard } from "./dashboard";
import type { ItemStat, TrendItem } from "./dashboard-shared";

export const revalidate = 60;

function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}
function verScore(ver?: string) {
  if (!ver) return 40;
  const v = parseFloat(ver);
  if (Number.isNaN(v)) return 40;
  if (v >= 2) return 90;
  if (v >= 1) return 75;
  return 45;
}
function contentScore(o: {
  descLen: number;
  hasReadme?: boolean;
  hasLabels?: boolean;
  published: boolean;
}) {
  let s = 25;
  if (o.published) s += 25;
  if (o.hasReadme || o.hasLabels) s += 20;
  if (o.descLen > 12) s += 18;
  else if (o.descLen > 0) s += 10;
  return clamp(s);
}
const W = {
  mcp: {
    adopt: 0.3,
    active: 0.2,
    stable: 0.2,
    health: 0.1,
    mature: 0.1,
    content: 0.1,
  },
  skill: {
    adopt: 0.35,
    active: 0.2,
    stable: 0,
    health: 0.15,
    mature: 0.15,
    content: 0.15,
  },
};

export default async function StatsPage() {
  const emptyFav: Record<string, number> = {};
  const emptyTrend: {
    days: string[];
    series: {
      item_type: string;
      item_ref: string;
      event: string;
      data: number[];
    }[];
  } = { days: [], series: [] };
  const emptyUnique: {
    item_type: string;
    item_ref: string;
    event: string;
    u: number;
  }[] = [];
  const [mcps, skills, mcpFav, skillFav, trend, unique] = await Promise.all([
    safe(getMcpServers(), [], "stats.getMcpServers"),
    safe(getSkills(), [], "stats.getSkills"),
    safe(getFavoriteCounts("mcp"), emptyFav, "stats.favMcp"),
    safe(getFavoriteCounts("skill"), emptyFav, "stats.favSkill"),
    safe(getTrend(30), emptyTrend, "stats.getTrend"),
    safe(getUniqueUsers(30), emptyUnique, "stats.getUniqueUsers"),
  ]);

  const dayCount = trend.days.length || 0;
  // per item series 30d 与 7d 用量
  const series30: Record<string, number[]> = {};
  const usage7: Record<string, number> = {};
  for (const s of trend.series) {
    const k = `${s.item_type}::${s.item_ref}`;
    const arr = series30[k] || Array(dayCount).fill(0);
    s.data.forEach((v, i) => {
      arr[i] = (arr[i] || 0) + v;
    });
    series30[k] = arr;
    const d7 =
      dayCount > 7
        ? s.data.slice(-7).reduce((a, b) => a + b, 0)
        : s.data.reduce((a, b) => a + b, 0);
    usage7[k] = (usage7[k] || 0) + d7;
  }
  const sum30 = (k: string) => (series30[k] || []).reduce((a, b) => a + b, 0);

  const uni: Record<string, Record<string, number>> = {};
  for (const u of unique) {
    const gk = `${u.item_type}::${u.item_ref}`;
    if (!uni[gk]) uni[gk] = {};
    uni[gk][u.event] = u.u;
  }

  const maxUsageM = Math.max(1, ...mcps.map((x) => x.call_count || 0));
  const maxUsageS = Math.max(1, ...skills.map((x) => x.download_count || 0));

  // 展示名：名称 + 版本（同名多版本可区分），id 只作兜底不出现在常规展示
  const displayName = (
    name: string | undefined,
    version: string | undefined,
    ref: string | undefined,
    id: string,
  ) => {
    const base = name || ref || id;
    return version ? `${base} v${version}` : base;
  };

  const items: ItemStat[] = [];

  for (const m of mcps) {
    const k = `mcp::${m.id}`;
    const usage = m.call_count || sum30(k);
    const adopt30 = sum30(k);
    const u30 = uni[k]?.call || 0;
    const g7 = usage7[k] || 0;
    const stable =
      m.deploy_status === "deployed"
        ? m.healthy === false
          ? 50
          : 95
        : m.deploy_status === "failed"
          ? 22
          : m.live
            ? 72
            : 40;
    items.push({
      key: k,
      id: m.id,
      type: "mcp",
      name: displayName(m.name, m.version, m.item_ref, m.id),
      owner: m.owner,
      desc: m.description || "",
      usage,
      favs: mcpFav[m.id] || 0,
      u30,
      u7: u30,
      fav7: 0,
      g7,
      adopt30,
      score: 0,
      dim: {
        adopt: clamp((usage / maxUsageM) * 100),
        active: clamp(u30 > 0 ? 40 + Math.min(40, g7) : 10),
        stable,
        health: 60,
        mature: clamp(
          verScore(m.version) + (m.registry_synced === "published" ? 10 : 0),
        ),
        content: contentScore({
          descLen: (m.description || "").length,
          hasLabels: !!m.mcp_labels,
          published: m.registry_synced === "published",
        }),
      },
      href: `/mcp/${encodeURIComponent(m.id)}?from=stats`,
      deploy: m.deploy_status,
      healthy: m.healthy,
    });
  }
  for (const s of skills) {
    const k = `skill::${s.id}`;
    const usage = s.download_count || sum30(k);
    const adopt30 = sum30(k);
    const u30 = uni[k]?.download || 0;
    const g7 = usage7[k] || 0;
    items.push({
      key: k,
      id: s.id,
      type: "skill",
      name: displayName(s.name, s.version, s.item_ref, s.id),
      owner: s.owner,
      desc: s.description || "",
      usage,
      favs: skillFav[s.id] || 0,
      u30,
      u7: u30,
      fav7: 0,
      g7,
      adopt30,
      score: 0,
      dim: {
        adopt: clamp((usage / maxUsageS) * 100),
        active: clamp(u30 > 0 ? 40 + Math.min(40, g7) : 10),
        stable: 0,
        health: 60,
        mature: clamp(
          verScore(s.version) + (s.registry_synced === "published" ? 10 : 0),
        ),
        content: contentScore({
          descLen: (s.description || "").length,
          hasReadme: !!s.skill_readme,
          published: s.registry_synced === "published",
        }),
      },
      href: `/skills/${encodeURIComponent(s.id)}?from=stats`,
    });
  }

  for (const it of items) {
    const w = W[it.type];
    const d = it.dim;
    let score =
      d.adopt * w.adopt +
      d.active * w.active +
      d.stable * w.stable +
      d.health * w.health +
      d.mature * w.mature +
      d.content * w.content;
    if (it.usage === 0 && it.u30 === 0) score += 10; // 结构性预测下限，避免一律 0
    it.score = Math.round(clamp(score));
  }

  const total = items.length;
  const avg = total
    ? Math.round(items.reduce((a, b) => a + b.score, 0) / total)
    : 0;
  const good = items.filter((i) => i.score >= 80).length;
  const watch = items.filter((i) => i.score < 50).length;

  const topItems = [...items].sort((a, b) => b.usage - a.usage).slice(0, 10);
  const trendItems: TrendItem[] = topItems.map((it) => ({
    key: it.key,
    type: it.type,
    name: it.name,
    data: series30[it.key] || Array(dayCount).fill(0),
  }));

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="使用统计" />
      <div className="flex-1 overflow-auto px-8 pb-10 pt-4">
        <StatsDashboard
          items={items}
          kpis={{ total, avg, good, watch }}
          trendDays={trend.days}
          trendItems={trendItems}
        />
      </div>
    </div>
  );
}
