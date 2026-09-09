import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/header-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthContext } from "@/lib/auth/context";
import { listSubmissions } from "@/lib/platform-backend";
import { buildGroups, GroupRow } from "../_components/submission-groups";

export default async function AdminPublishedPage() {
  const { isAdmin } = await getAuthContext();
  if (!isAdmin) redirect("/catalog");

  const submissions = await listSubmissions();

  // 已发布区域：正常上线 + 已下架（可回滚）+ 已下线（部署状态）都统一在此管理
  const published = submissions.filter(
    (s) => s.status === "approved" || s.status === "deprecated",
  );
  const groups = buildGroups(published);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="已发布管理" />

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl space-y-8 pb-8">
          <Card className="shadow-none">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl">
                已发布条目（{published.length}）
              </CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin" className="gap-1">
                  <ArrowLeft className="h-4 w-4" />
                  返回管理
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {published.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无已发布条目</p>
              ) : (
                <div className="space-y-3">
                  {Array.from(groups.entries()).map(([gk, items]) => (
                    <GroupRow key={gk} group_key={gk} items={items} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
