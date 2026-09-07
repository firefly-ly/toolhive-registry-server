import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content Security Policy header.
 * All API calls (OIDC, backend API) happen server-side,
 * so browser CSP only needs 'self'.
 *
 * NOTE: React dev mode requires `eval()` for callstack reconstruction, so
 * we relax script-src with 'unsafe-eval' in development only. Production
 * React never uses eval, so the strict policy is kept there.
 */
const scriptSrc = isDev
  ? "'self' 'unsafe-inline' 'unsafe-eval'"
  : "'self' 'unsafe-inline'";

const cspHeader = `
  default-src 'self';
  script-src ${scriptSrc};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self';
  connect-src 'self';
  form-action 'self';
  frame-ancestors 'none';
  base-uri 'self';
  object-src 'none';
  ${isDev ? "" : "upgrade-insecure-requests;"}
`
  .replace(/\s{2,}/g, " ")
  .trim();

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",
  // MCP 镜像 tar 包经 Server Action 上传到平台后端，体积远超默认 1MB，需放宽上限
  // （与后端 /upload/tar 的 2048MB 上限对齐）。改完需重启 next dev 生效。
  //
  // proxyClientMaxBodySize：Next 16 里 proxy.ts（旧称 middleware）存在时，Next 会
  // 克隆并缓冲整个请求体，默认上限仅 10MB。超过后请求体被截断 → Server Action 解析
  // multipart 时报 "Unexpected end of form"（且是 uncaughtException，会打挂进程）。
  // 注意：只能用 proxyClientMaxBodySize；旧的 middlewareClientMaxBodySize 已废弃，
  // 且与新键同时配置会直接抛错。
  experimental: {
    serverActions: {
      bodySizeLimit: "2gb",
    },
    proxyClientMaxBodySize: "2gb",
  },
  // 允许从 LAN IP/localhost 访问 dev server 资源（HMR、webpack-hmr 等），避免跨源被拦。
  // 当前 IP 是 DHCP 动态分配的，若 IP 变更需同步更新并重启前端。
  allowedDevOrigins: [
    "172.20.155.243",
    "localhost",
    "127.0.0.1",
  ],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader,
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  async rewrites() {
    if (!isDev) return [];

    const apiBaseUrl = process.env.API_BASE_URL || "";

    return [
      // Proxy registry API in development (to mock server or real backend)
      {
        source: "/registry/:path*",
        destination: `${apiBaseUrl}/registry/:path*`,
      },
    ];
  },
};

export default nextConfig;
