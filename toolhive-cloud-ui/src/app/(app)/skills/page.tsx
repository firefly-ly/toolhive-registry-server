import {
  getSkills,
  getSkillById,
  listFavorites,
  listGroupVersions,
} from "@/lib/platform-backend";
import type { Skill } from "@/lib/platform-backend";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { SkillsWrapper } from "./skills-wrapper";

export default async function SkillsPage() {
  const skills = await getSkills().catch(() => []);

  let favoritedRefs: string[] = [];
  let siblingGroups: Record<string, Skill[]> = {};
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const actor = session?.user?.email ?? session?.user?.name ?? "";
    if (actor) {
      const favorites = await listFavorites();
      favoritedRefs = favorites
        .filter((f) => f.user_id === actor && f.item_type === "skill")
        .map((f) => f.item_ref);
    }
    // 预聚合每个 skill 的同 group 完整卡片数据（激活版 + 其它已上架版本），供卡片就地切换
    const groupKeys = Array.from(
      new Set(
        skills.map(
          (s) =>
            s.group_key ||
            String(s.item_ref || s.name || "")
              .split(":")[0] ||
            "",
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
        } catch {
          /* 忽略 */
        }
        const activeCards = skills.filter(
          (s) =>
            (s.group_key ||
              String(s.item_ref || s.name || "").split(":")[0] ||
              "") === g,
        );
        const have = new Set(activeCards.map((s) => s.id));
        const siblingIds = onShelfIds.filter((id) => !have.has(id));
        const fetched = await Promise.all(
          siblingIds.map((id) => getSkillById(id).catch(() => null)),
        );
        return {
          g,
          cards: [...activeCards, ...fetched.filter((x): x is Skill => !!x)],
        };
      }),
    );
    for (const { g, cards } of groupResults) {
      if (cards.length > 1) siblingGroups[g] = cards;
    }
  } catch (_) {
    // 后端不可用时静默降级
  }

  return (
    <SkillsWrapper
      skills={skills}
      favoritedRefs={favoritedRefs}
      siblingGroups={siblingGroups}
    />
  );
}
