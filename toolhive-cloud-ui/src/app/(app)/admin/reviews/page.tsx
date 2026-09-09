import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/header-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthContext } from "@/lib/auth/context";
import { listSubmissions } from "@/lib/platform-backend";
import { SubmissionList } from "../../submissions/submission-list";

export default async function AdminReviewsPage() {
  const { isAdmin } = await getAuthContext();
  if (!isAdmin) redirect("/catalog");

  const submissions = await listSubmissions();
  const pending = submissions.filter((s) => s.status === "pending");

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="审核队列" />

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl pb-8">
          <Card className="shadow-none">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl">
                待审核提交（{pending.length}）
              </CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin" className="gap-1">
                  <ArrowLeft className="h-4 w-4" />
                  返回管理
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <SubmissionList submissions={pending} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
