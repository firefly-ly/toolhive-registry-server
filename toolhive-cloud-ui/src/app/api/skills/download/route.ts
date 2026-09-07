import { NextRequest } from "next/server";

const BACKEND_BASE =
  process.env.PLATFORM_BACKEND_URL || "http://127.0.0.1:4000";

/**
 * Skill 制品下载代理。
 *
 * 前端页面跑在 HTTPS（localhost:3000），平台后端跑在 HTTP（:4000），
 * 浏览器会阻止从 HTTPS 页面直接下载 HTTP 资源并提示"无法安全下载"。
 * 此路由由 Next.js 服务端转发到平台后端，再流式透传字节，确保下载
 * 走同源 HTTPS，规避浏览器拦截。
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const group_key = searchParams.get("group_key");
  const version = searchParams.get("version");

  if (!group_key || !version) {
    return new Response("Missing group_key or version", { status: 400 });
  }

  const upstream = await fetch(
    `${BACKEND_BASE}/skills/${encodeURIComponent(group_key)}/${encodeURIComponent(version)}/download`,
    { cache: "no-store" },
  );

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "Upstream unavailable");
    return new Response(text, { status: upstream.status || 502 });
  }

  const headers = new Headers();
  const contentType = upstream.headers.get("Content-Type");
  if (contentType) headers.set("Content-Type", contentType);
  const contentDisposition = upstream.headers.get("Content-Disposition");
  if (contentDisposition) headers.set("Content-Disposition", contentDisposition);
  const sha256 = upstream.headers.get("X-Content-Sha256");
  if (sha256) headers.set("X-Content-Sha256", sha256);

  return new Response(upstream.body, {
    status: 200,
    headers,
  });
}
