import { redirect } from "next/navigation";
import { ErrorToast } from "@/components/error-toast";
import { PageHeader } from "@/components/header-page";
import { NavTabs } from "@/components/nav-tabs";
import { getAuthContext } from "@/lib/auth/context";
import { listSubmissions } from "@/lib/platform-backend";
import { AuditBlock } from "./_components/audit-block";
import { buildGroups, isOnShelf, parseMeta } from "./_components/group-utils";
import { PublishedBlock } from "./_components/published-block";
import { RetiredBlock } from "./_components/retired-block";
import { ReviewBlock } from "./_components/review-block";

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

  // 页头 psub 按 tab 切换（效果图 04/05/06 各自的摘要口径）
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayNew = submissions.filter(
    (s) => +new Date(s.created_at) >= +todayStart,
  ).length;
  const notOnShelfN = published.filter((s) => !isOnShelf(s)).length;
  const syncErrN = published.filter(
    (s) => parseMeta(s.meta).registry_synced === "error",
  ).length;
  const psub =
    tab === "published"
      ? `已发布 ${published.length} 件 · 未上线 ${notOnShelfN} 件 · 同步失败 ${syncErrN} 件`
      : tab === "audit"
        ? "全部管理操作留痕，支持按类型 / 操作者 / 时间检索"
        : tab === "retired"
          ? `已删除 / 已拒绝 ${retired.length} 件，仅管理员可见`
          : `待审 ${pending.length} 件 · 今日新增 ${todayNew} 件`;

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
      {/* 效果图 04/05/06：页头 + psub 摘要（按 tab 切换口径） */}
      <PageHeader title="管理后台" description={psub} />

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
