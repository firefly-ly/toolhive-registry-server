import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { queryAudit, type AuditEntry } from "@/lib/platform-backend";
import { cn } from "@/lib/utils";

// 动作中文名（后端 action 枚举 → 展示文案）
const ACTION_LABELS: Record<string, string> = {
  submit: "提交",
  approve: "审批通过",
  approve_denied: "审批被拦截",
  status_change: "状态变更",
  deploy: "部署",
  undeploy: "下线",
  registry_sync: "Registry 同步",
  visibility_change: "可见范围变更",
  rescan: "重跑扫描",
  proxy_denied: "代理调用被拒",
  upload_denied: "匿名上传被拒",
};

function actionLabel(action: string): string {
  return ACTION_LABELS[action] || action;
}

function resultBadge(result: string, actorAdmin: number) {
  if (result === "denied" || result === "error") {
    return (
      <span className="inline-flex items-center rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
        {result === "denied" ? "已拦截" : "失败"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
      {actorAdmin ? "管理员" : result}
    </span>
  );
}

function formatTs(ts: string): string {
  try {
    return new Date(ts).toLocaleString("zh-CN", { hour12: false });
  } catch {
    return ts;
  }
}

function safeParseDetail(detail: string): Record<string, unknown> {
  try {
    return JSON.parse(detail) as Record<string, unknown>;
  } catch {
    return { raw: detail };
  }
}

export async function AuditBlock({
  filters,
}: {
  filters: {
    actor?: string;
    action?: string;
    target_id?: string;
    from?: string;
    to?: string;
    limit?: number;
  };
}) {
  let items: AuditEntry[] = [];
  let error = "";
  try {
    const res = await queryAudit({ ...filters, limit: filters.limit || 200 });
    items = res.items;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const selectCls =
    "h-9 rounded-md border bg-transparent px-2 text-sm shadow-xs dark:bg-input/30";

  return (
    <div className="space-y-4">
      {/* 筛选表单：GET 提交回 /admin?tab=audit，纯服务端过滤，无需 client state */}
      <form method="get" action="/admin" className="flex flex-wrap items-end gap-3 rounded-xl border bg-muted/30 p-4">
        <input type="hidden" name="tab" value="audit" />
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">操作人</label>
          <Input name="actor" defaultValue={filters.actor} placeholder="邮箱关键字" className="h-9 w-48" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">动作</label>
          <select name="action" defaultValue={filters.action} className={selectCls}>
            <option value="">全部</option>
            {Object.entries(ACTION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">对象 ID</label>
          <Input name="target_id" defaultValue={filters.target_id} placeholder="sub_..." className="h-9 w-56 font-mono" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">开始日期</label>
          <Input type="date" name="from" defaultValue={filters.from} className="h-9 w-40" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">结束日期</label>
          <Input type="date" name="to" defaultValue={filters.to} className="h-9 w-40" />
        </div>
        <Button type="submit" size="sm" className="h-9">查询</Button>
        <Button type="submit" size="sm" variant="ghost" className="h-9" asChild={false}>
          <a href="/admin?tab=audit">重置</a>
        </Button>
      </form>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>审计查询失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!error && (
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-left text-base">
            <thead className="bg-muted/50 text-sm text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">时间</th>
                <th className="px-3 py-2 font-medium">操作人</th>
                <th className="px-3 py-2 font-medium">动作</th>
                <th className="px-3 py-2 font-medium">对象</th>
                <th className="px-3 py-2 font-medium">结果</th>
                <th className="px-3 py-2 font-medium">详情</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                    没有符合条件的审计记录
                  </td>
                </tr>
              )}
              {items.map((e) => {
                const detail = safeParseDetail(e.detail);
                return (
                  <tr key={e.id} className={cn("border-t align-top", e.result !== "success" && "bg-destructive/5")}>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-sm">{formatTs(e.ts)}</td>
                    <td className="px-3 py-2 text-sm">{e.actor_email}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {actionLabel(e.action)}
                    </td>
                    <td className="px-3 py-2 font-mono text-sm">
                      <span className="text-muted-foreground">{e.target_type}</span> {e.target_id || "—"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{resultBadge(e.result, e.actor_admin)}</td>
                    <td className="px-3 py-2">
                      <details>
                        <summary className="cursor-pointer text-sm text-primary">展开</summary>
                        <pre className="mt-1 max-w-lg overflow-x-auto whitespace-pre-wrap rounded bg-muted/40 p-2 text-sm">
                          {JSON.stringify(detail, null, 2)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!error && items.length > 0 && (
        <p className="text-xs text-muted-foreground">共 {items.length} 条（最多返回 1000 条，可用筛选缩小范围）</p>
      )}
    </div>
  );
}
