import { redirect } from "next/navigation";
import { ErrorToast } from "@/components/error-toast";
import { PageHeader } from "@/components/header-page";
import { NavTabs } from "@/components/nav-tabs";
import { getAuthContext } from "@/lib/auth/context";
import type { Submission } from "@/lib/platform-backend";
import { listSubmissions } from "@/lib/platform-backend";
import { AuditBlock } from "./_components/audit-block";
import { PublishedBlock } from "./_components/published-block";
import { RetiredBlock } from "./_components/retired-block";
import { ReviewBlock } from "./_components/review-block";

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
    page?: string;
    actor?: string;
    action?: string;
    target_id?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const { isAdmin } = await getAuthContext();
  if (!isAdmin) redirect("/catalog");

  const {
    tab = "reviews",
    error,
    page: pageRaw,
    actor,
    action,
    target_id,
    from,
    to,
  } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);

  const submissions = await listSubmissions();

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

  // 页头徽章口径：待审总数 + 今日新增（按提交时间零点起算）
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayNew = submissions.filter(
    (s) => +new Date(s.created_at) >= +todayStart,
  ).length;

  const TABS = [
    {
      key: "reviews",
      label: "审核队列",
      href: "/admin?tab=reviews",
      count: pending.length,
    },
    {
      key: "published",
      label: "已发布管理",
      href: "/admin?tab=published",
      count: published.length,
    },
    {
      key: "retired",
      label: "已删除 / 已拒绝",
      href: "/admin?tab=retired",
      count: retired.length,
    },
    {
      key: "audit",
      label: "审计轨迹",
      href: "/admin?tab=audit",
    },
  ] as const;

  return (
    <div className="flex h-full flex-col">
      {/* 效果图 04：页头 + psub 摘要（待审/今日已审收进副标行，红胶囊退场） */}
      <PageHeader
        title="管理后台"
        description={`待审 ${pending.length} 件 · 今日新增 ${todayNew} 件`}
      />

      {/* 子导航（效果图 .subnav：纯文字 + 黑色下边线，无图标） */}
      <div className="border-b-2 border-foreground bg-secondary/50 px-8">
        <NavTabs tabs={[...TABS]} activeKey={tab} />
      </div>

      {error && (
        <ErrorToast
          message="操作失败，请稍后重试"
          description={decodeURIComponent(error)}
        />
      )}

      {/* 有界内容区：各 tab 自管滚动，页面级不再滚动 */}
      <div className="flex min-h-0 flex-1 flex-col px-8 pb-10 pt-4">
        {tab === "reviews" ? (
          <ReviewBlock pending={pending} />
        ) : tab === "retired" ? (
          <RetiredBlock retired={retired} />
        ) : tab === "audit" ? (
          <AuditBlock
            filters={{ actor, action, target_id, from, to }}
            page={page}
          />
        ) : (
          <PublishedBlock
            mcpGroups={mcpGroups}
            skillGroups={skillGroups}
            count={published.length}
          />
        )}
      </div>
    </div>
  );
}
