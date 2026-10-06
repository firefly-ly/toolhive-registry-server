import { headers } from "next/headers";
import { auth } from "./auth";
import { ADMIN_EMAILS } from "./constants";
import { claimAsStringArray, getUserClaimsFromDatabase } from "./utils";
import { getUserProfileRaw } from "./user-profile";

export interface AuthUser {
  id?: string;
  email?: string;
  name?: string;
  roles?: string[];
  groups?: string[];
}

export interface AuthContext {
  user?: AuthUser;
  isAdmin: boolean;
  roles: string[];
  groups: string[];
}

/**
 * Extract role/group claims from a user object.
 *
 * Important: Casdoor emits `roles`/`groups` as an *array of objects*
 * (e.g. [{ "owner": "built-in", "name": "admin", ... }]) rather than plain
 * name strings. Keycloak/Entra emit plain name strings.
 * `claimAsStringArray` (in utils.ts) handles both shapes by extracting the
 * `name` field from object entries; using `Array.map(String)` here would
 * produce `"[object Object]"` and break group visibility matching.
 */
function extractRoles(user: Record<string, unknown> | undefined): string[] {
  if (!user) return [];
  const raw = user.roles ?? user.role;
  return claimAsStringArray(raw) ?? [];
}

function extractGroups(user: Record<string, unknown> | undefined): string[] {
  if (!user) return [];
  return claimAsStringArray(user.groups) ?? [];
}

/**
 * Resolves the current request's auth context.
 *
 * Admin判定 (in priority order):
 *   1. OIDC IdP (Casdoor) `roles` claim contains "admin".
 *   2. The authenticated email is listed in ADMIN_EMAILS (dev fallback,
 *      used until the IdP surfaces roles in userinfo).
 */
export async function getAuthContext(): Promise<AuthContext> {
  const session = await auth.api.getSession({ headers: await headers() });
  const u = session?.user as Record<string, unknown> | undefined;
  if (!u) {
    if (process.env.DEMO_MODE === "1")
      return { isAdmin: true, roles: ["admin"], groups: ["admin"] };
    return { isAdmin: false, roles: [], groups: [] };
  }

  const roles = extractRoles(u);
  const groups = extractGroups(u);

  const email =
    typeof u.email === "string" ? u.email.toLowerCase().trim() : "";

  // Better Auth does not persist arbitrary OIDC claims (roles/groups) onto the
  // user record by default, so re-derive them from the stored OIDC token when
  // they are absent on the session user object.
  // 优先读 user_profile 表（SSO 登录时落库的 orgs/jobs/userTypes 快照）：
  // SSO 的 access_token 是不透明串，token 回读解不出 claims，SSO 用户此前
  // groups 恒为空、部门/岗位级可见性失效。表无记录（如 Casdoor 用户）时
  // 返回 null，自动回退原 token 回读——两路读取内部均有 catch，失败模式
  // 恒为"claims 为空"（改动前现状），不影响会话与登录。
  let finalRoles = roles;
  let finalGroups = groups;
  const userId = typeof u.id === "string" ? u.id : undefined;
  if ((roles.length === 0 || groups.length === 0) && userId) {
    const profile = email ? await getUserProfileRaw(email) : null;
    let derived: { roles: string[]; groups: string[] };
    if (profile) {
      // SSO 员工快照：orgs（部门）与 jobs（岗位）合并进 groups 通道——
      // 管理端「可见范围」的 groups 名单里填部门名或岗位名均可匹配；
      // userTypes → roles。归一化复用 claimAsStringArray（兼容
      // 字符串数组/对象数组/逗号串等 SSO 字段的未知形态）。
      derived = {
        roles: claimAsStringArray(profile.userTypes) ?? [],
        groups: [
          ...(claimAsStringArray(profile.orgs) ?? []),
          ...(claimAsStringArray(profile.jobs) ?? []),
        ],
      };
    } else {
      derived = await getUserClaimsFromDatabase(userId);
    }
    finalRoles = roles.length > 0 ? roles : derived.roles;
    finalGroups = groups.length > 0 ? groups : derived.groups;
  }

  const isAdmin =
    finalRoles.includes("admin") ||
    (email ? ADMIN_EMAILS.includes(email) : false);

  return {
    user: {
      id: typeof u.id === "string" ? u.id : undefined,
      email: typeof u.email === "string" ? u.email : undefined,
      name: typeof u.name === "string" ? u.name : undefined,
      roles: finalRoles,
      groups: finalGroups,
    },
    isAdmin: process.env.DEMO_MODE === "1" ? true : isAdmin,
    roles: finalRoles,
    groups: finalGroups,
  };
}
