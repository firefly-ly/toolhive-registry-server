import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import type { Skill } from "@/lib/platform-backend";
import {
  getSkillById,
  getSkills,
  listFavorites,
  listGroupVersions,
} from "@/lib/platform-backend";
import { safe } from "@/lib/safe-async";
import { SkillsWrapper } from "./skills-wrapper";

export default async function SkillsPage() {
  const skills = await safe(getSkills(), [], "skills.getSkills");

  let favoritedRefs: string[] = [];
  const siblingGroups: Record<string, Skill[]> = {};
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const actor = session?.user?.email ?? session?.user?.name ?? "";
    if (actor) {
      const favorites = await listFavorites();
      favoritedRefs = favorites
        .filter((f) => f.user_id === actor && f.item_type === "skill")
        .map((f) => f.item_ref);
    }
    // 预聚合每个 skill 的同 group 完整卡片数据（默认版 + 其它已上架版本），供卡片就地切换
    const groupKeys = Array.from(
      new Set(
        skills.map(
          (s) =>
            s.group_key ||
            String(s.item_ref || s.name || "").split(":")[0] ||
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
        } catch (error) {
          // 单个 group 的版本列表失败只影响该组卡片聚合，留痕
          console.error(`[skills.groupVersions:${g}]`, error);
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
          siblingIds.map((id) =>
            safe(getSkillById(id), null, `skills.getSkillById:${id}`),
          ),
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
  } catch (error) {
    // 后端不可用时整页降级为基础卡片列表，但留痕
    console.error("[skills.page] 收藏/版本聚合失败:", error);
  }

  return (
    <SkillsWrapper
      skills={skills}
      favoritedRefs={favoritedRefs}
      siblingGroups={siblingGroups}
    />
  );
}
