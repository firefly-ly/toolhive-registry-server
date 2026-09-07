import Link from "next/link";
import { listSubmissions } from "@/lib/platform-backend";
import { getAuthContext } from "@/lib/auth/context";
import { createSubmissionAction } from "./actions";
import { PageHeader } from "@/components/header-page";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmissionForm } from "./submission-form";
import { SubmissionsBlock } from "./submissions-block";

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "new" } = await searchParams;
  const [submissions, ctx] = await Promise.all([
    listSubmissions().catch(() => []),
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
    <div className="flex h-full flex-col">
      <PageHeader title="Submission Management" />

      {/* 顶部 Tab 切换：新建提交 / 历史提交（与 admin 一致，整块可点） */}
      <div className="px-[3cm] pt-2">
        <div className="inline-flex gap-2 rounded-lg border bg-muted p-1">
          <Link
            href="/submissions?tab=new"
            className={cn(
              buttonVariants({
                variant: tab === "new" ? "default" : "ghost",
                size: "sm",
              }),
              "min-w-[130px]",
            )}
          >
            新建提交
          </Link>
          <Link
            href="/submissions?tab=history"
            className={cn(
              buttonVariants({
                variant: tab === "history" ? "default" : "ghost",
                size: "sm",
              }),
              "min-w-[130px]",
            )}
          >
            历史提交
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-[3cm] pb-[3cm] pt-8">
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
