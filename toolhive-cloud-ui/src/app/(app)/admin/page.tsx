import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/header-page";
import { buttonVariants } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { getAuthContext } from "@/lib/auth/context";
import type { Submission } from "@/lib/platform-backend";
import { listActiveVersions, listSubmissions } from "@/lib/platform-backend";
import { ReviewBlock } from "./_components/review-block";
import { PublishedBlock } from "./_components/published-block";
import { RetiredBlock } from "./_components/retired-block";
import { AuditBlock } from "./_components/audit-block";

function parseMeta(meta?: string): Record<string, string> {
  try {
    return meta ? (JSON.parse(meta) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function groupKey(s: Submission): string {
  return parseMeta(s.meta).group_key || s.id;
}

function buildGroups(published: Submission[]) {
  const groups = new Map<string, Submission[]>();
  published.forEach((s) => {
    const gk = groupKey(s);
    const arr = groups.get(gk) || [];
    arr.push(s);
    groups.set(gk, arr);
  });
  for (const arr of groups.values()) {
    arr.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  }
  return groups;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    error?: string;
    actor?: string;
    action?: string;
    target_id?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const { isAdmin } = await getAuthContext();
  if (!isAdmin) redirect("/catalog");

  const { tab = "reviews", error, actor, action, target_id, from, to } = await searchParams;

  const [submissions, activeVersions] = await Promise.all([
    listSubmissions(),
    listActiveVersions(),
  ]);

  const activeMap: Record<string, string> = Object.fromEntries(
    activeVersions.map((a) => [a.group_key, a.active_submission_id]),
  );

  const pending = submissions.filter((s) => s.status === "pending");

  // 已发布区域：approved + deprecated（已下架可回滚）统一在此管理；undeployed 因 status 仍是 approved 自然包含
  const published = submissions.filter(
    (s) => s.status === "approved" || s.status === "deprecated",
  );
  const mcpPublished = published.filter((s) => s.type === "mcp");
  const skillPublished = published.filter((s) => s.type === "skill");

  const mcpGroups = Array.from(buildGroups(mcpPublished).entries());
  const skillGroups = Array.from(buildGroups(skillPublished).entries());

  // 回收站：仅不可逆的删除和审核拒绝
  const retired = submissions.filter(
    (s) => s.status === "removed" || s.status === "rejected",
  );

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="管理后台" />

      {/* 顶部 Tab 切换：直接用 Link 渲染为按钮，整块可点（Button 未实现 asChild，套 Link 会导致只有文字能点） */}
      <div className="px-[3cm] pt-2">
        <div className="inline-flex gap-2 rounded-lg border bg-muted p-1">
          <Link
            href="/admin?tab=reviews"
            className={cn(
              buttonVariants({
                variant: tab === "reviews" ? "default" : "ghost",
                size: "sm",
              }),
              "min-w-[130px]",
            )}
          >
            审核队列
          </Link>
          <Link
            href="/admin?tab=published"
            className={cn(
              buttonVariants({
                variant: tab === "published" ? "default" : "ghost",
                size: "sm",
              }),
              "min-w-[130px]",
            )}
          >
            已发布管理
          </Link>
          <Link
            href="/admin?tab=retired"
            className={cn(
              buttonVariants({
                variant: tab === "retired" ? "default" : "ghost",
                size: "sm",
              }),
              "min-w-[130px]",
            )}
          >
            已删除 / 已拒绝
          </Link>
          <Link
            href="/admin?tab=audit"
            className={cn(
              buttonVariants({
                variant: tab === "audit" ? "default" : "ghost",
                size: "sm",
              }),
              "min-w-[130px]",
            )}
          >
            审计轨迹
          </Link>
        </div>
      </div>

      {error && (
        <div className="px-[3cm] pt-2">
          <Alert variant="destructive">
            <AlertTitle>操作失败</AlertTitle>
            <AlertDescription>{decodeURIComponent(error)}</AlertDescription>
          </Alert>
        </div>
      )}

      <div className="flex-1 overflow-auto px-[3cm] pb-[3cm] pt-2">
        {tab === "reviews" ? (
          <ReviewBlock pending={pending} />
        ) : tab === "retired" ? (
          <RetiredBlock retired={retired} />
        ) : tab === "audit" ? (
          <AuditBlock filters={{ actor, action, target_id, from, to }} />
        ) : (
          <PublishedBlock
            mcpGroups={mcpGroups}
            skillGroups={skillGroups}
            activeMap={activeMap}
            count={published.length}
          />
        )}
      </div>
    </div>
  );
}
