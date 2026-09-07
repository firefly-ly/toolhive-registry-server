import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { getSkills, listFavorites, getIssues, listGroupVersions } from "@/lib/platform-backend";
import { getAuthContext } from "@/lib/auth/context";
import { SkillDetailView } from "./skill-detail-view";
import { VersionSwitcher } from "@/components/version-switcher";

interface SkillDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}

export default async function SkillDetailPage({
  params,
  searchParams,
}: SkillDetailPageProps) {
  const { id } = await params;
  const { from } = await searchParams;
  const backHref =
    from === "stats" ? "/stats" : from === "favorites" ? "/favorites" : "/skills";
  const backLabel =
    from === "stats"
      ? "返回统计"
      : from === "favorites"
        ? "返回收藏"
        : "返回技能市场";
  const skills = await getSkills().catch(() => []);
  const skill = skills.find((s) => s.id === id);
  if (!skill) notFound();
  const issues = await getIssues("skill", id).catch(() => []);
  const { isAdmin } = await getAuthContext();

  let favorited = false;
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const actor = session?.user?.email ?? session?.user?.name ?? "";
    if (actor) {
      const favorites = await listFavorites();
      favorited = favorites.some(
        (f) => f.user_id === actor && f.item_type === "skill" && f.item_ref === id,
      );
    }
  } catch (_) {
    // 后端不可用时按未收藏处理
  }

  // 同 group 的多版本：取已上架(on_shelf)版本，仅多版本时在页头给版本下拉
  const groupKey =
    skill.group_key || String(skill.name || skill.item_ref || "").split(":")[0];
  let versionOptions: { id: string; label: string }[] = [];
  if (groupKey) {
    try {
      const gv = await listGroupVersions(groupKey);
      versionOptions = (gv.versions || [])
        .filter((v) => v.on_shelf !== false && v.id)
        .map((v) => ({ id: v.id, label: `v${v.version || "1.0.0"}` }));
    } catch (_) {
      /* 忽略 */
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl space-y-4 py-4">
          <SkillDetailView
            skill={skill}
            favorited={favorited}
            backHref={backHref}
            backLabel={backLabel}
            issues={issues}
            isAdmin={isAdmin}
            actions={
              <VersionSwitcher
                basePath="skills"
                groupLabel={skill.name || groupKey}
                currentId={id}
                options={versionOptions}
                from={from}
              />
            }
          />
        </div>
      </div>
    </div>
  );
}
