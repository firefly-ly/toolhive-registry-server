import { headers } from "next/headers";
import { auth } from "./auth";
import { ADMIN_EMAILS } from "./constants";
import { claimAsStringArray, getUserClaimsFromDatabase } from "./utils";

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

  // Better Auth does not persist arbitrary OIDC claims (roles/groups) onto the
  // user record by default, so re-derive them from the stored OIDC token when
  // they are absent on the session user object.
  let finalRoles = roles;
  let finalGroups = groups;
  const userId = typeof u.id === "string" ? u.id : undefined;
  if ((roles.length === 0 || groups.length === 0) && userId) {
    const derived = await getUserClaimsFromDatabase(userId);
    finalRoles = roles.length > 0 ? roles : derived.roles;
    finalGroups = groups.length > 0 ? groups : derived.groups;
  }

  const email = typeof u.email === "string" ? u.email.toLowerCase().trim() : "";
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
