import Link from "next/link";
import { DateField } from "@/components/admin/date-field";
import { ErrorToast } from "@/components/error-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type AuditEntry,
  listSubmissions,
  queryAudit,
} from "@/lib/platform-backend";
import { cn } from "@/lib/utils";

// 审计分页：每页条数（后端同口径，≤200）
const AUDIT_PAGE_SIZE = 50;

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

function resultBadge(result: string) {
  if (result === "denied" || result === "error") {
    return (
      <span className="inline-flex items-center rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
        {result === "denied" ? "已拦截" : "失败"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
      成功
    </span>
  );
}

/** 操作人列：邮箱 + （管理员时）角色小标 */
function actorCell(email: string, admin: number) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-sm">{email}</span>
      {!!admin && (
        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
          管理员
        </span>
      )}
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
  page = 1,
}: {
  filters: {
    actor?: string;
    action?: string;
    target_id?: string;
    from?: string;
    to?: string;
  };
  page?: number;
}) {
  let items: AuditEntry[] = [];
  let error = "";
  let total = 0;
  try {
    const res = await queryAudit({
      ...filters,
      limit: AUDIT_PAGE_SIZE,
      offset: (page - 1) * AUDIT_PAGE_SIZE,
    });
    items = res.items;
    total = res.total ?? res.count;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  // 分页链接：保留当前筛选条件，仅翻页
  const pageUrl = (p: number) => {
    const qs = new URLSearchParams();
    qs.set("tab", "audit");
    qs.set("page", String(p));
    if (filters.actor) qs.set("actor", filters.actor);
    if (filters.action) qs.set("action", filters.action);
    if (filters.target_id) qs.set("target_id", filters.target_id);
    if (filters.from) qs.set("from", filters.from);
    if (filters.to) qs.set("to", filters.to);
    return `/admin?${qs.toString()}`;
  };
  const totalPages = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));

  // 页码列表：≤7 页全铺；更长时折叠为 1 … p-1 p p+1 … N（key 用 gap 位置，稳定）
  const pageNumbers = (() => {
    const pushPage = (
      out: { key: string; v: number | "…" }[],
      prev: number,
      p: number,
    ) => {
      if (p - prev > 1) out.push({ key: `gap-${prev}-${p}`, v: "…" });
      out.push({ key: `p${p}`, v: p });
    };
    if (totalPages <= 7) {
      const out: { key: string; v: number | "…" }[] = [];
      for (let i = 1; i <= totalPages; i++) pushPage(out, i - 1, i);
      return out;
    }
    const set = new Set(
      [1, totalPages, page - 1, page, page + 1].filter(
        (p) => p >= 1 && p <= totalPages,
      ),
    );
    const sorted = [...set].sort((a, b) => a - b);
    const out: { key: string; v: number | "…" }[] = [];
    let prev = 0;
    for (const p of sorted) {
      pushPage(out, prev, p);
      prev = p;
    }
    return out;
  })();

  // 对象 ID → 可读名称映射（来自提交记录 meta.name），提升表格可读性
  const nameMap = new Map<string, string>();
  try {
    const subs = await listSubmissions();
    for (const s of subs) {
      let name = "";
      try {
        name =
          (JSON.parse(s.meta ?? "{}") as Record<string, string>).name ?? "";
      } catch {
        /* meta 非法时回退 payload_ref */
      }
      nameMap.set(s.id, name || s.payload_ref || s.id);
    }
  } catch {
    /* 提交列表不可用时按原样显示 ID */
  }

  const selectCls =
    "h-9 rounded-md border bg-transparent px-2 text-sm shadow-xs dark:bg-input/30";

  return (
    <div className="space-y-4">
      {/* 筛选表单：GET 提交回 /admin?tab=audit，纯服务端过滤，无需 client state */}
      <form
        method="get"
        action="/admin"
        className="flex flex-wrap items-end gap-x-4 gap-y-3 rounded-xl border bg-muted/30 p-4"
      >
        <input type="hidden" name="tab" value="audit" />
        <div className="space-y-1.5">
          <label
            htmlFor="audit-f-actor"
            className="block text-xs font-medium text-muted-foreground"
          >
            操作人
          </label>
          <Input
            id="audit-f-actor"
            name="actor"
            defaultValue={filters.actor}
            placeholder="邮箱关键字"
            className="h-9 w-48"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="audit-f-action"
            className="block text-xs font-medium text-muted-foreground"
          >
            动作
          </label>
          <select
            id="audit-f-action"
            name="action"
            defaultValue={filters.action}
            className={selectCls}
          >
            <option value="">全部</option>
            {Object.entries(ACTION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="audit-f-target"
            className="block text-xs font-medium text-muted-foreground"
          >
            对象 ID
          </label>
          <Input
            id="audit-f-target"
            name="target_id"
            defaultValue={filters.target_id}
            placeholder="例如：sub_1234 / mcp:demo"
            className="h-9 w-56 font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="audit-f-from"
            className="block text-xs font-medium text-muted-foreground"
          >
            开始日期
          </label>
          <DateField
            id="audit-f-from"
            name="from"
            placeholder="开始日期"
            defaultValue={filters.from}
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="audit-f-to"
            className="block text-xs font-medium text-muted-foreground"
          >
            结束日期
          </label>
          <DateField
            id="audit-f-to"
            name="to"
            placeholder="结束日期"
            defaultValue={filters.to}
          />
        </div>
        <div className="flex items-center gap-2 pb-0.5">
          <Button type="submit" size="sm" className="h-9 px-5">
            查询
          </Button>
          <Button
            type="submit"
            size="sm"
            variant="ghost"
            className="h-9"
            asChild={false}
          >
            <a href="/admin?tab=audit">重置</a>
          </Button>
        </div>
      </form>

      {error && <ErrorToast message={`审计查询失败：${error}`} />}

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
                  <td
                    colSpan={6}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    没有符合条件的审计记录
                  </td>
                </tr>
              )}
              {items.map((e) => {
                const detail = safeParseDetail(e.detail);
                const niceName = e.target_id
                  ? nameMap.get(e.target_id)
                  : undefined;
                return (
                  <tr
                    key={e.id}
                    className={cn(
                      "border-t align-top",
                      e.result !== "success" && "bg-destructive/5",
                    )}
                  >
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-sm">
                      {formatTs(e.ts)}
                    </td>
                    <td className="px-3 py-2">
                      {actorCell(e.actor_email, e.actor_admin)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {actionLabel(e.action)}
                    </td>
                    <td className="max-w-[16rem] px-3 py-2">
                      {niceName ? (
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {niceName}
                          </div>
                          <div
                            className="truncate font-mono text-xs text-muted-foreground"
                            title={`${e.target_type} ${e.target_id}`}
                          >
                            {e.target_type} {e.target_id}
                          </div>
                        </div>
                      ) : (
                        <span className="font-mono text-sm text-muted-foreground">
                          {e.target_type} {e.target_id || "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {resultBadge(e.result)}
                    </td>
                    <td className="px-3 py-2">
                      <details>
                        <summary className="cursor-pointer text-sm text-primary">
                          展开
                        </summary>
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
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            共 {total} 条 · 第 {page} / {totalPages} 页
          </p>
          <div className="flex items-center gap-1">
            {page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link href={pageUrl(page - 1)}>上一页</Link>
              </Button>
            )}
            {pageNumbers.map((item) =>
              item.v === "…" ? (
                <span
                  key={item.key}
                  className="px-1 text-xs text-muted-foreground"
                >
                  …
                </span>
              ) : (
                <Link
                  key={item.key}
                  href={pageUrl(item.v)}
                  aria-current={item.v === page ? "page" : undefined}
                  aria-label={`第 ${item.v} 页`}
                  className={cn(
                    "flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm",
                    item.v === page
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {item.v}
                </Link>
              ),
            )}
            {page < totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link href={pageUrl(page + 1)}>下一页</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
