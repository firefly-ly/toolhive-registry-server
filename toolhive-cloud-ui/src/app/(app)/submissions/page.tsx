import Link from "next/link";
import { PageHeader } from "@/components/header-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthContext } from "@/lib/auth/context";
import { listSubmissions } from "@/lib/platform-backend";
import { safe } from "@/lib/safe-async";
import { cn } from "@/lib/utils";
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

      {/* 顶部 Tab 切换：新建提交 / 历史提交（分段控件口径） */}
      <div className="pb-4">
        <div className="inline-flex rounded-lg border bg-card p-1">
          <Link
            href="/submissions?tab=new"
            className={cn(
              "rounded-md px-4 py-1.5 text-sm transition-colors",
              tab === "new"
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            新建提交
          </Link>
          <Link
            href="/submissions?tab=history"
            className={cn(
              "rounded-md px-4 py-1.5 text-sm transition-colors",
              tab === "history"
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            历史提交
          </Link>
        </div>
      </div>

      <div className="pb-10">
        {tab === "new" ? (
          <Card className="mx-auto max-w-7xl shadow-none">
            <CardHeader>
              <CardTitle className="text-xl">新建提交</CardTitle>
            </CardHeader>
            <CardContent>
              <SubmissionForm action={createSubmissionAction} />
            </CardContent>
          </Card>
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
