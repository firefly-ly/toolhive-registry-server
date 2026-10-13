import { History, NotebookPen } from "lucide-react";
import { PageHeader } from "@/components/header-page";
import { NavTabs } from "@/components/nav-tabs";
import { getAuthContext } from "@/lib/auth/context";
import { listSubmissions } from "@/lib/platform-backend";
import { safe } from "@/lib/safe-async";
import { createSubmissionAction } from "./actions";
import { SubmissionForm } from "./submission-form";
import { SubmissionsBlock } from "./submissions-block";

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "new" } = await searchParams;
  const [submissions, ctx] = await Promise.all([
    safe(listSubmissions(), [], "submissions.list"),
    getAuthContext(),
  ]);

  // 非管理员只能看到自己的提交记录；管理员（含 DEMO_MODE 下强制的 admin）看全部。
  // 标识以创建提交时 currentActor() 的口径为准：email 优先，回退 name。
  const ownSubmissions = ctx.isAdmin
    ? submissions
    : submissions.filter((s) => {
        const myId = (ctx.user?.email ?? ctx.user?.name ?? "")
          .toLowerCase()
          .trim();
        return myId ? s.user_id.toLowerCase() === myId : false;
      });

  return (
    <div className="-mr-8 flex h-full flex-col overflow-y-auto pr-8">
      <PageHeader title="提交管理" />

      {/* 顶部 Tab 切换：下划线式（图标 + 历史计数），URL 驱动 */}
      <div className="pb-4">
        <NavTabs
          activeKey={tab}
          tabs={[
            {
              key: "new",
              label: "新建提交",
              href: "/submissions?tab=new",
              icon: NotebookPen,
            },
            {
              key: "history",
              label: "历史提交",
              href: "/submissions?tab=history",
              count: ownSubmissions.length,
              icon: History,
            },
          ]}
        />
      </div>

      <div className="pb-10">
        {tab === "new" ? (
          /* 效果图 03：向导直接平铺（左步骤轨灰底 + 右内容），不再套卡片壳 */
          <SubmissionForm action={createSubmissionAction} />
        ) : (
          <SubmissionsBlock
            submissions={ownSubmissions}
            count={ownSubmissions.length}
          />
        )}
      </div>
    </div>
  );
}
