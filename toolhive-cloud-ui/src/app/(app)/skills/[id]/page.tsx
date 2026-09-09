import { AlertCircle } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VersionSwitcher } from "@/components/version-switcher";
import { auth } from "@/lib/auth/auth";
import { getAuthContext } from "@/lib/auth/context";
import {
  getIssues,
  getSkillById,
  listFavorites,
  listGroupVersions,
} from "@/lib/platform-backend";
import { safe } from "@/lib/safe-async";
import { SkillDetailView } from "./skill-detail-view";

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
    from === "stats"
      ? "/stats"
      : from === "favorites"
        ? "/favorites"
        : "/skills";
  const backLabel =
    from === "stats"
      ? "返回统计"
      : from === "favorites"
        ? "返回收藏"
        : "返回技能市场";
  // 按 id 直查详情：区分三种失败——不存在/已下架(404→统一 404 页)、
  // 无权限(403→提示无权访问)、后端不可用(网络/5xx→提示稍后刷新)，不再把失败都伪装成 404
  const result = await getSkillById(id)
    .then((s) => ({ s }))
    .catch((e: unknown) => ({ err: e as Error & { status?: number } }));

  if ("err" in result) {
    const { err } = result;
    if (err?.status === 404) notFound();
    const forbidden = err?.status === 403;
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-auto">
          <div className="mx-auto flex max-w-3xl items-center justify-center py-4">
            <Card className="w-full">
              <CardHeader className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <AlertCircle className="h-6 w-6 text-muted-foreground" />
                </div>
                <CardTitle className="text-xl">
                  {forbidden ? "无权访问该技能" : "服务暂时不可用"}
                </CardTitle>
                <CardDescription className="text-base">
                  {forbidden
                    ? "该技能仅对被授权的成员开放，如需访问请联系管理员授权。"
                    : "平台服务暂时不可用或响应超时，请稍后刷新重试。"}
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex justify-center gap-3">
                <Button variant="outline" size="sm" asChild>
                  <Link href={backHref}>{backLabel}</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    );
  }
  const skill = result.s;
  const issues = await safe(
    getIssues("skill", id),
    [],
    "skillDetail.getIssues",
  );
  const { isAdmin } = await getAuthContext();

  let favorited = false;
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const actor = session?.user?.email ?? session?.user?.name ?? "";
    if (actor) {
      const favorites = await listFavorites();
      favorited = favorites.some(
        (f) =>
          f.user_id === actor && f.item_type === "skill" && f.item_ref === id,
      );
    }
  } catch (error) {
    // 后端不可用时按未收藏处理，但留痕
    console.error("[skillDetail.favorites]", error);
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
    } catch (error) {
      // 版本下拉取数失败只影响下拉项，详情主体仍可渲染，但留痕
      console.error("[skillDetail.groupVersions]", error);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto">
        {/* 详情页统一口径：全宽靠左，不做居中限宽 */}
        <div className="space-y-4 py-4">
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
