import Link from "next/link";
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
  submit: "提交审核",
  approve: "审批通过并部署",
  approve_denied: "审批被拦截",
  status_change: "状态变更",
  deploy: "部署",
  undeploy: "下线",
  registry_sync: "Registry 同步",
  visibility_change: "可见范围变更",
  rescan: "重跑扫描",
  proxy_denied: "代理调用被拒",
  upload_denied: "匿名上传被拒",
  workload_recovered: "实例恢复",
};

function actionLabel(action: string): string {
  return ACTION_LABELS[action] || action;
}

function resultBadge(result: string) {
  if (result === "denied" || result === "error") {
    return (
      <span className="inline-flex items-center rounded-[6px] border border-[#F09595] bg-[#FCEBEB] px-2.5 py-[3px] text-[12.5px] whitespace-nowrap text-[#A32D2D]">
        {result === "denied" ? "已拦截" : "失败"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-[6px] border border-[#97C459] bg-[#EAF3DE] px-2.5 py-[3px] text-[12.5px] whitespace-nowrap text-[#3B6D11]">
      成功
    </span>
  );
}

function safeParseDetail(detail: string): Record<string, unknown> {
  try {
    return JSON.parse(detail) as Record<string, unknown>;
  } catch {
    return { raw: detail };
  }
}

function monoTime(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(+d)) return ts;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** 效果图 .btn.sm：1.5px 描边 8px 圆角小按钮（含原生控件皮肤） */
const btnSm =
  "inline-flex h-8 items-center gap-1 rounded-lg border-[1.5px] border-border bg-card px-3 text-[13px] font-semibold text-muted-foreground outline-none transition-colors hover:border-foreground hover:text-foreground focus:border-foreground";
const btnSmDark =
  "inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border-[1.5px] border-foreground bg-foreground px-3 text-[13px] font-semibold text-background outline-none";

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

  // 链接构造：保留当前筛选条件
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
  const exportQs = (() => {
    const qs = new URLSearchParams();
    if (filters.actor) qs.set("actor", filters.actor);
    if (filters.action) qs.set("action", filters.action);
    if (filters.target_id) qs.set("target_id", filters.target_id);
    if (filters.from) qs.set("from", filters.from);
    if (filters.to) qs.set("to", filters.to);
    return qs.toString();
  })();
  const totalPages = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));

  // 页码列表：≤7 页全铺；更长时折叠（与目录页分页同一规则）
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

  // 时间快捷选项：值直接是 ISO 日期（GET 表单无需 JS 计算相对时间）
  const isoDaysAgo = (n: number) =>
    new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* 筛选行（效果图 06：按钮化下拉 + 右侧导出 CSV） */}
      <form
        method="get"
        action="/admin"
        className="flex flex-wrap items-center gap-2.5 border-b-[1.5px] border-border py-4"
      >
        <input type="hidden" name="tab" value="audit" />
        <select
          name="action"
          defaultValue={filters.action ?? ""}
          className={btnSm}
        >
          <option value="">操作类型：全部</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              操作类型：{v}
            </option>
          ))}
        </select>
        <input
          type="text"
          name="actor"
          defaultValue={filters.actor}
          placeholder="操作者：全部"
          className={cn(btnSm, "w-44 placeholder:font-semibold")}
        />
        <select name="from" defaultValue={filters.from ?? ""} className={btnSm}>
          <option value="">时间：全部</option>
          <option value={isoDaysAgo(7)}>时间：近 7 天</option>
          <option value={isoDaysAgo(30)}>时间：近 30 天</option>
        </select>
        {filters.target_id && (
          <>
            <input type="hidden" name="target_id" value={filters.target_id} />
            <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border-[1.5px] border-foreground bg-foreground px-3 text-[13px] font-semibold text-background">
              对象：{nameMap.get(filters.target_id) || filters.target_id}
              <Link
                href="/admin?tab=audit"
                className="opacity-70 hover:opacity-100"
              >
                ×
              </Link>
            </span>
          </>
        )}
        <button type="submit" className={btnSmDark}>
          查询
        </button>
        <a
          href={`/admin/audit-export?${exportQs}`}
          className={cn(btnSmDark, "ml-auto no-underline")}
        >
          导出 CSV
        </a>
      </form>

      {error && (
        <div className="rounded-lg border-[1.5px] border-[#F09595] bg-[#FCEBEB] px-4 py-3 text-sm text-[#A32D2D]">
          审计查询失败：{error}
        </div>
      )}

      {!error && items.length === 0 && (
        <div className="flex-1 py-12 text-center text-muted-foreground">
          没有符合条件的审计记录
        </div>
      )}

      {/* 流水表（效果图 06：时间 mono / 操作者头像+名 / 动作 / 对象 mono / 结果 / 详情） */}
      {!error && items.length > 0 && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left text-[12.5px] font-semibold tracking-[1px] text-[#9A9A94]">
                <th className="w-[172px] border-b-[1.5px] border-foreground px-3 py-3">
                  时间
                </th>
                <th className="border-b-[1.5px] border-foreground px-3 py-2.5">
                  操作者
                </th>
                <th className="border-b-[1.5px] border-foreground px-3 py-2.5">
                  动作
                </th>
                <th className="border-b-[1.5px] border-foreground px-3 py-2.5">
                  对象
                </th>
                <th className="border-b-[1.5px] border-foreground px-3 py-2.5">
                  结果
                </th>
                <th className="border-b-[1.5px] border-foreground px-3 py-2.5 text-right">
                  详情
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => {
                const detail = safeParseDetail(e.detail);
                const niceName = e.target_id
                  ? nameMap.get(e.target_id)
                  : undefined;
                const actor = e.actor_email || "?";
                return (
                  <tr key={e.id} className="align-middle hover:bg-[#FBFBF7]">
                    <td className="border-b border-border px-3 py-[13px] font-mono text-[13.5px] whitespace-nowrap">
                      {monoTime(e.ts)}
                    </td>
                    <td className="border-b border-border px-3 py-[13px]">
                      <span className="inline-flex items-center gap-2">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#F1EFE8] text-[11.5px] text-[#5F5E5A]">
                          {actor.charAt(0).toUpperCase()}
                        </span>
                        <span className="truncate">
                          {e.actor_admin ? "管理员" : actor}
                        </span>
                      </span>
                    </td>
                    <td className="border-b border-border px-3 py-[13px] text-[13.5px]">
                      {actionLabel(e.action)}
                    </td>
                    <td className="border-b border-border px-3 py-[13px] font-mono text-[13.5px]">
                      {niceName || e.target_id || "—"}
                    </td>
                    <td className="border-b border-border px-3 py-[13px]">
                      {resultBadge(e.result)}
                    </td>
                    <td className="border-b border-border px-3 py-[13px] text-right">
                      <details className="group">
                        <summary className="inline-block cursor-pointer list-none text-[12.5px] font-semibold text-[#185FA5]">
                          详情
                        </summary>
                        <pre className="mt-1 max-w-md overflow-x-auto rounded-md bg-[#F1EFE8] p-2 text-left text-[12.5px] whitespace-pre-wrap">
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

      {/* 分页（效果图 .footer：共 N 条 · 时间倒序 + 30px 方形页码黑选中） */}
      {!error && items.length > 0 && (
        <div className="flex items-center py-4">
          <span className="font-mono text-xs text-[#9A9A94]">
            共 {total.toLocaleString()} 条 · 时间倒序
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            {pageNumbers.map((item) =>
              item.v === "…" ? (
                <span
                  key={item.key}
                  aria-hidden
                  className="flex size-8 items-center justify-center text-[13px] text-[#9A9A94] select-none"
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
                    "flex size-8 items-center justify-center rounded-lg border-[1.5px] text-[13px] transition-colors",
                    item.v === page
                      ? "border-foreground bg-foreground font-semibold text-background"
                      : "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
                  )}
                >
                  {item.v}
                </Link>
              ),
            )}
            {page < totalPages && (
              <Link
                href={pageUrl(page + 1)}
                aria-label="下一页"
                className="flex size-8 items-center justify-center rounded-lg text-[13px] text-muted-foreground transition-colors hover:text-foreground"
              >
                →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
