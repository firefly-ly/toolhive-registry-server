/**
 * Authentication constants and configuration.
 */

// Environment configuration
// Hardcoded Better Auth provider identifier. This value is part of the
// OAuth callback URL (/api/auth/oauth2/callback/oidc) and is stored in
// the account table when DATABASE_URL is set. Changing it will invalidate
// existing sessions and require updating the redirect URI in the IdP.
export const OIDC_PROVIDER_ID = "oidc";
export const OIDC_ISSUER_URL = process.env.OIDC_ISSUER_URL || "";
export const OIDC_CLIENT_ID = process.env.OIDC_CLIENT_ID || "";
export const OIDC_CLIENT_SECRET = process.env.OIDC_CLIENT_SECRET || "";
export const BASE_URL = process.env.BETTER_AUTH_URL || "http://localhost:3000";
export const IS_PRODUCTION = process.env.NODE_ENV === "production";
export const OIDC_DISCOVERY_URL = `${OIDC_ISSUER_URL}/.well-known/openid-configuration`;
export const BETTER_AUTH_SECRET =
  process.env.BETTER_AUTH_SECRET || "build-time-better-auth-secret";
export const OIDC_SCOPES = process.env.OIDC_SCOPES?.split(",") ?? [
  "openid",
  "email",
  "profile",
  "offline_access",
];

// OIDC endpoint paths (authorization / token / userinfo / JWKS).
// Casdoor's OIDC endpoint layout differs from Keycloak's. We default to the
// Casdoor paths so the platform works against Casdoor out of the box, but each
// is overridable via env in case the IdP (e.g. a future Okta/Entra broker) uses
// a different layout. The issuer + discovery URL are still derived from
// OIDC_ISSUER_URL above.
export const OIDC_AUTHORIZATION_URL =
  process.env.OIDC_AUTHORIZATION_URL ||
  `${OIDC_ISSUER_URL}/login/oauth/authorize`;
export const OIDC_TOKEN_URL =
  process.env.OIDC_TOKEN_URL ||
  `${OIDC_ISSUER_URL}/api/login/oauth/access_token`;
export const OIDC_USERINFO_URL =
  process.env.OIDC_USERINFO_URL || `${OIDC_ISSUER_URL}/api/userinfo`;
export const OIDC_JWKS_URL =
  process.env.OIDC_JWKS_URL || `${OIDC_ISSUER_URL}/.well-known/jwks`;

// ============================================================================
// 公司 SSO（OAuth2.0 Code 模式）——第二个登录入口，与 Casdoor 并存灰度。
//
// 端点布局来自《OAuth2.0认证Code模式接口》文档（iamtest 测试环境已核实），
// 生产环境只需替换 SSO_BASE_URL，三个端点路径不变（均可单独覆盖）。
// 注意：SSO_BASE_URL 不设默认值——避免把测试环境地址静默带进生产。
// 仅当 SSO_CLIENT_ID / SSO_CLIENT_SECRET / SSO_BASE_URL 三者齐备时启用该入口。
// ============================================================================

// Better Auth provider 标识，同时决定回调路径
// (/api/auth/oauth2/callback/sso) 并写入 account 表的 providerId。
// 与 SSO 侧登记的回调地址必须严格一致，一经使用不可更改。
export const SSO_PROVIDER_ID = "sso";
export const SSO_CLIENT_ID = process.env.SSO_CLIENT_ID || "";
export const SSO_CLIENT_SECRET = process.env.SSO_CLIENT_SECRET || "";
export const SSO_BASE_URL = process.env.SSO_BASE_URL || "";
// SSO 不下发 email，用 <账号ID>@<SSO_EMAIL_DOMAIN> 合成（Better Auth 要求邮箱非空）
export const SSO_EMAIL_DOMAIN = process.env.SSO_EMAIL_DOMAIN || "dongpeng.net";
export const SSO_AUTHORIZATION_URL =
  process.env.SSO_AUTHORIZATION_URL ||
  (SSO_BASE_URL ? `${SSO_BASE_URL}/esc-sso/oauth2.0/authorize` : "");
export const SSO_TOKEN_URL =
  process.env.SSO_TOKEN_URL ||
  (SSO_BASE_URL ? `${SSO_BASE_URL}/esc-sso/oauth2.0/accessToken` : "");
export const SSO_PROFILE_URL =
  process.env.SSO_PROFILE_URL ||
  (SSO_BASE_URL ? `${SSO_BASE_URL}/esc-sso/oauth2.0/profile` : "");
export const SSO_ENABLED = Boolean(
  SSO_CLIENT_ID && SSO_CLIENT_SECRET && SSO_BASE_URL,
);

// Token expiration constants (in milliseconds and seconds)
export const TOKEN_ONE_HOUR_MS = 60 * 60 * 1000; // 3,600,000 ms (1 hour)
export const TOKEN_SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60; // 604,800 seconds (7 days)

/**
 * Buffer time subtracted from token expiration to account for clock skew
 * between our server and the OIDC provider. Prevents edge cases where
 * tokens appear valid locally but are rejected by the provider.
 */
export const CLOCK_SKEW_BUFFER_MS = 60 * 1000; // 60 seconds

// Cookie configuration (used for stateless mode when DATABASE_URL is not set)
export const OIDC_TOKEN_COOKIE_NAME = "oidc_token" as const;

/**
 * Whether to use secure cookies (HTTPS only).
 * Set COOKIE_SECURE=false for local development over HTTP.
 * Defaults to true in production, false otherwise.
 */
export const COOKIE_SECURE =
  process.env.COOKIE_SECURE !== undefined
    ? process.env.COOKIE_SECURE === "true"
    : IS_PRODUCTION;

// Database configuration (optional - enables database mode for large OIDC tokens)
export const DATABASE_URL = process.env.DATABASE_URL;

// Rate limiting configuration
//
// Better Auth has a default rate limit of 3 requests per 10 seconds for sign-in
// endpoints. This causes E2E test failures when multiple tests authenticate in
// quick succession (e.g., 3 tests using authenticatedPage fixture followed by
// a login test = 4 sign-ins, triggering 429 Too Many Requests).
//
// Set BETTER_AUTH_RATE_LIMIT to a higher value (e.g., 100) for E2E tests.
// See: node_modules/better-auth/dist/api/rate-limiter/index.mjs
export const BETTER_AUTH_RATE_LIMIT = process.env.BETTER_AUTH_RATE_LIMIT
  ? Number.parseInt(process.env.BETTER_AUTH_RATE_LIMIT, 10)
  : undefined;

// Trusted origins for Better Auth
const trustedOriginsFromEnv = process.env.TRUSTED_ORIGINS
  ? process.env.TRUSTED_ORIGINS.split(",").map((s) => s.trim())
  : [BASE_URL, "http://localhost:3002", "http://localhost:3003"];

/**
 * Admin identity resolution (development fallback).
 *
 * The canonical admin判定 is the `admin` role from the OIDC IdP (Casdoor)
 * userinfo, extracted in `getAuthContext`. Until the IdP is configured to
 * surface roles in the userinfo claim, list administrator emails here
 * (comma-separated) so the manager UI can be exercised locally.
 *
 * Example: ADMIN_EMAILS=alice@corp.com,bob@corp.com
 */
console.log(
  "[debug] ADMIN_EMAILS raw env:",
  JSON.stringify(process.env.ADMIN_EMAILS),
);
export const ADMIN_EMAILS = process.env.ADMIN_EMAILS
  ? process.env.ADMIN_EMAILS.split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  : [];
console.log("[debug] ADMIN_EMAILS parsed:", ADMIN_EMAILS);

// Ensure BASE_URL is always included in trusted origins
export const TRUSTED_ORIGINS = trustedOriginsFromEnv.includes(BASE_URL)
  ? trustedOriginsFromEnv
  : [...trustedOriginsFromEnv, BASE_URL];
