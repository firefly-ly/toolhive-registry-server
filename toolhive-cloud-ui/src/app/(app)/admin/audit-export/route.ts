import type { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { queryAudit } from "@/lib/platform-backend";

/**
 * 审计轨迹 CSV 导出（效果图 06「导出 CSV」）。
 * 复用当前筛选参数（actor/action/target_id/from/to），上限 1000 条。
 * 仅管理员：getAuthContext 硬校验，非管理员 403。
 */
export async function GET(req: NextRequest) {
  const { isAdmin } = await getAuthContext();
  if (!isAdmin) {
    return new Response("forbidden", { status: 403 });
  }
  const sp = req.nextUrl.searchParams;
  const filters = {
    actor: sp.get("actor") || undefined,
    action: sp.get("action") || undefined,
    target_id: sp.get("target_id") || undefined,
    from: sp.get("from") || undefined,
    to: sp.get("to") || undefined,
  };

  let csv = "";
  try {
    const res = await queryAudit({ ...filters, limit: 1000, offset: 0 });
    const head = ["时间", "操作者", "动作", "对象类型", "对象", "结果", "详情"];
    const rows = res.items.map((e) => [
      e.ts,
      e.actor_email,
      e.action,
      e.target_type,
      e.target_id,
      e.result,
      e.detail,
    ]);
    csv = [head, ...rows]
      .map((r) =>
        r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
  } catch (e) {
    return new Response(
      `export failed: ${e instanceof Error ? e.message : String(e)}`,
      { status: 502 },
    );
  }

  const day = new Date().toISOString().slice(0, 10);
  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-${day}.csv"`,
    },
  });
}
