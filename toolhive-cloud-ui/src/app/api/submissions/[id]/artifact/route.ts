import type { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { request, type Submission } from "@/lib/platform-backend";

const BACKEND_BASE =
  process.env.PLATFORM_BACKEND_URL || "http://127.0.0.1:4000";

function parseMeta(meta?: string): Record<string, unknown> {
  try {
    return meta ? (JSON.parse(meta) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/**
 * 审批阶段 Skill 制品下载（管理员专用）。
 *
 * 设计要点：
 * - 浏览器不能直连平台后端 127.0.0.1:4000（本地代理/环回会被重置），故由 Next.js
 *   服务端转发；同时服务端转发也充当鉴权层——只有管理员会话才能触发，避免任何人
 *   （普通用户）通过枚举可猜测的 artifact_key 下载他人制品。
 * - artifact_key 从服务端数据（按 id 过滤的提交列表）取得，前端无法伪造，
 *   杜绝越权下载任意 key。
 * - 用 ReadableStream 透传后端字节，支持大文件、不被整体缓冲。
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getAuthContext();
  if (!ctx.isAdmin) {
    return new Response("Forbidden: admin only", { status: 403 });
  }

  const { id } = await params;

  // 后端只暴露列表接口，没有单条查询；列表拉取后按 id 过滤。
  let all: Submission[];
  try {
    all = await request<Submission[]>("/submissions");
  } catch {
    return new Response("Failed to load submissions", { status: 502 });
  }
  const sub = all.find((s) => s.id === id);
  if (!sub) return new Response("Submission not found", { status: 404 });
  if (sub.type !== "skill") {
    return new Response("Only skill submissions have artifacts", {
      status: 400,
    });
  }

  const meta = parseMeta(sub.meta);
  const key = meta.artifact_key;
  if (typeof key !== "string" || !key) {
    return new Response("No artifact for this submission", { status: 404 });
  }

  // 待审(staging)制品后端静态路由已收紧：仅携带内部令牌的可信代理可回源，
  // 此处 Next 服务端已通过管理员鉴权，带上令牌以放行 staging 制品（published 同样兼容）。
  const headers = {
    "x-internal-proxy":
      process.env.INTERNAL_PROXY_TOKEN || "thv-internal-proxy",
  };
  const upstream = await fetch(
    `${BACKEND_BASE}/artifacts/${encodeURIComponent(key)}`,
    { cache: "no-store", headers },
  );
  if (!upstream.ok || !upstream.body) {
    return new Response("Upstream artifact unavailable", { status: 502 });
  }

  const filename = key.split("/").pop() || "skill-artifact";
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
