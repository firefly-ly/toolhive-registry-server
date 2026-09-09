/**
 * Utility functions for authentication and token management.
 */

import { symmetricDecodeJWT } from "better-auth/crypto";
import { cookies } from "next/headers";
import { BETTER_AUTH_SECRET } from "./constants";
import { getIdTokenFromDatabase, getTokenFromDatabase } from "./db";
import type { OidcUserInfo } from "./types";

// ============================================================================
// Token Expiry Check (for Server Component context)
// ============================================================================

/**
 * Checks whether the stored OIDC access token is near expiry.
 *
 * Decodes the Better Auth `account_data` JWE cookie to read `accessTokenExpiresAt`
 * and returns `true` if the token expires within the given margin.
 *
 * Used by `getAuthenticatedClient()` in Server Component context to decide
 * whether to preemptively redirect to `/api/auth/token-refresh` before Better
 * Auth's 5-second refresh threshold is reached. This ensures the rotated
 * refresh token (R2) is saved properly — Server Components cannot write cookies,
 * so the refresh + cookie save must happen in a Route Handler.
 *
 * @param marginMs - How far in advance to consider the token "near expiry" (default 10s).
 *   Must be greater than Better Auth's internal 5s refresh threshold, and less than the
 *   OIDC provider's access token TTL (e.g. 15s in dev, 3600s in production).
 * @returns `true` if the token is near expiry, expired, or the cookie cannot be decoded
 */
export async function isTokenNearExpiry(marginMs = 10_000): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    // Better Auth may chunk large cookies as account_data.0, account_data.1, etc.
    // In production (HTTPS), cookies are prefixed with "__Secure-".
    const ACCOUNT_DATA_BASE = "better-auth.account_data";
    const normalize = (name: string) => name.replace(/^__Secure-/, "");
    const accountCookies = allCookies.filter((c) => {
      const n = normalize(c.name);
      return n === ACCOUNT_DATA_BASE || n.startsWith(`${ACCOUNT_DATA_BASE}.`);
    });

    const baseCookie = accountCookies.find(
      (c) => normalize(c.name) === ACCOUNT_DATA_BASE,
    );
    const chunkedCookies = accountCookies.filter((c) =>
      normalize(c.name).startsWith(`${ACCOUNT_DATA_BASE}.`),
    );

    let jwe: string;
    if (chunkedCookies.length > 0) {
      // Sort by numeric suffix to avoid lexicographic mis-ordering (.10 before .2)
      jwe = [...chunkedCookies]
        .sort((a, b) => {
          const aIdx = Number.parseInt(
            a.name.match(/\.(\d+)$/)?.[1] ?? "0",
            10,
          );
          const bIdx = Number.parseInt(
            b.name.match(/\.(\d+)$/)?.[1] ?? "0",
            10,
          );
          return aIdx - bIdx;
        })
        .map((c) => c.value)
        .join("");
    } else {
      jwe = baseCookie?.value ?? "";
    }

    if (!jwe) return true; // No cookie → treat as expired

    const decoded = await symmetricDecodeJWT(
      jwe,
      BETTER_AUTH_SECRET,
      "better-auth-account",
    );

    if (!decoded || typeof decoded !== "object") return true;

    const account = decoded as Record<string, unknown>;
    if (!account.accessTokenExpiresAt) return true;

    const expiresAt = new Date(
      account.accessTokenExpiresAt as string,
    ).getTime();
    return expiresAt - Date.now() < marginMs;
  } catch {
    // JWE decode failed (corrupted cookie, secret mismatch, etc.)
    // Treat as near-expiry so the Route Handler re-establishes a valid state.
    return true;
  }
}

// ============================================================================
// User Info Extraction (for Azure AD compatibility)
// ============================================================================

/**
 * Decodes the payload of a JWT (id_token or access_token) without verifying
 * the signature. Used only to read non-sensitive claim names locally.
 */
function decodeJwtClaims(token?: string): Record<string, unknown> | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(
      Buffer.from(parts[1], "base64").toString("utf-8"),
    ) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Normalises a claim value into a string[].
 * Accepts arrays (["a","b"]) and comma-separated strings ("a,b").
 *
 * Casdoor emits `groups`/`roles` in two shapes depending on version:
 *   1. Array of objects  [{ "owner":"built-in", "name":"admin", ... }]
 *      -> take each entry's `name` field.
 *   2. Array of strings  ["organization_d2jg2d/group_ej4ola"]
 *      -> Casdoor groups/roles carry an `organization_<org>/<name>` prefix;
 *         strip everything up to and including the last `/` to get the bare name.
 *
 * Keycloak/Entra emit plain name strings without any prefix; pass through.
 */
function stripOrgPrefix(s: string): string {
  const i = s.lastIndexOf("/");
  return i >= 0 ? s.slice(i + 1) : s;
}
export function claimAsStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    if (value.length > 0 && typeof value[0] === "object" && value[0] !== null) {
      const names = (value as Record<string, unknown>[])
        .map((v) => {
          if (typeof v?.name === "string") return stripOrgPrefix(v.name);
          // Fallback: also handle "value" / "type" if shape differs.
          if (typeof v?.value === "string") return stripOrgPrefix(v.value);
          return undefined;
        })
        .filter((n): n is string => Boolean(n));
      if (names.length > 0) return names;
    }
    return value.map((v) =>
      typeof v === "string" ? stripOrgPrefix(v) : String(v),
    );
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((s) => stripOrgPrefix(s.trim()))
      .filter(Boolean);
  }
  return undefined;
}

/**
 * Extracts user info from an OIDC ID token.
 * Decodes the JWT payload to get standard claims.
 * Also surfaces `roles` and `groups` claims (top-level, as emitted by
 * Keycloak's client-roles / group-membership mappers) so the UI can perform
 * role- and group-based authorization (admin gate, per-skill isolation).
 * Handles Azure AD specific claims (preferred_username, upn) as fallbacks.
 */
export function getUserInfoFromIdToken(
  idToken: string | undefined,
): OidcUserInfo | null {
  const decoded = decodeJwtClaims(idToken);
  if (!decoded) {
    return null;
  }

  // Standard OIDC claim, with Azure AD fallbacks
  const email =
    (decoded.email as string | undefined) ||
    (decoded.preferred_username as string | undefined) ||
    (decoded.upn as string | undefined) ||
    (decoded.unique_name as string | undefined) ||
    null;

  return {
    id:
      (decoded.sub as string | undefined) ||
      (decoded.oid as string | undefined) ||
      "",
    email,
    name:
      (decoded.name as string | undefined) ||
      (decoded.given_name as string | undefined),
    image: decoded.picture as string | undefined,
    emailVerified: Boolean(decoded.email_verified),
    roles: claimAsStringArray(decoded.roles),
    groups: claimAsStringArray(decoded.groups),
  };
}

/**
 * Fetches user info from the OIDC userinfo endpoint.
 * Discovers the userinfo URL from the OIDC discovery document.
 * Standard OIDC flow for providers that don't include claims in the ID token.
 */
async function fetchUserInfoFromEndpoint(
  accessToken: string | undefined,
  discoveryUrl: string,
): Promise<OidcUserInfo | null> {
  if (!accessToken) {
    return null;
  }

  try {
    const discoveryResponse = await fetch(discoveryUrl);
    if (!discoveryResponse.ok) {
      console.error("[Auth] Discovery fetch failed:", discoveryResponse.status);
      return null;
    }

    const discovery = await discoveryResponse.json();
    const userinfoUrl = discovery.userinfo_endpoint;

    if (!userinfoUrl) {
      console.error("[Auth] No userinfo_endpoint in discovery document");
      return null;
    }

    const response = await fetch(userinfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error("[Auth] Userinfo endpoint failed:", response.status);
      return null;
    }

    const data = await response.json();

    return {
      id: data.sub,
      email: data.email || null,
      name: data.name,
      image: data.picture,
      emailVerified: data.email_verified ?? false,
      roles: claimAsStringArray(data.roles),
      groups: claimAsStringArray(data.groups),
    };
  } catch (error) {
    console.error("[Auth] Failed to fetch userinfo:", error);
    return null;
  }
}

/**
 * Gets user info from OIDC tokens with fallback strategy.
 * 1. Try ID token first (works for Azure AD and Keycloak, where roles/groups
 *    are emitted as top-level claims).
 * 2. Enrich roles/groups from the access token if the ID token omitted them.
 * 3. Fallback to userinfo endpoint (standard OIDC).
 */
export async function getUserInfoFromTokens(
  tokens: { idToken?: string; accessToken?: string },
  discoveryUrl: string,
): Promise<OidcUserInfo | null> {
  const fromIdToken = getUserInfoFromIdToken(tokens.idToken);
  if (fromIdToken?.email) {
    // Enrich from the access token, which Keycloak also populates with
    // roles/groups (handles providers that only put them there).
    const accessClaims = decodeJwtClaims(tokens.accessToken);
    if (accessClaims) {
      if (!fromIdToken.roles) {
        fromIdToken.roles = claimAsStringArray(accessClaims.roles);
      }
      if (!fromIdToken.groups) {
        fromIdToken.groups = claimAsStringArray(accessClaims.groups);
      }
    }
    return fromIdToken;
  }

  const fromEndpoint = await fetchUserInfoFromEndpoint(
    tokens.accessToken,
    discoveryUrl,
  );
  if (fromEndpoint) {
    return fromEndpoint;
  }

  return null;
}

// ============================================================================
// Claims derived from the stored OIDC token (group/role propagation)
// ============================================================================

/**
 * Re-derives `roles` / `groups` claims for a user from the OIDC token that
 * Better Auth persisted in the `account` table (id_token preferred, then
 * access_token as fallback).
 *
 * Why this is needed: `genericOAuth.getUserInfo` parses `roles`/`groups` from
 * the token at login time, but Better Auth does not persist arbitrary claims
 * onto the `user` table by default (see db/init.sql — no `roles`/`groups`
 * columns). As a result `session.user.groups` is never populated, so the
 * platform's group-based visibility can never match. Rather than extend the
 * Better Auth schema (and risk breaking login), we re-read the already-stored
 * token at session-resolve time and extract the claims here.
 *
 * Handles both Casdoor's object-array form ([{name:"g"}]) and plain name
 * strings via `claimAsStringArray`.
 */
export async function getUserClaimsFromDatabase(
  userId: string | undefined,
): Promise<{ roles: string[]; groups: string[] }> {
  if (!userId) return { roles: [], groups: [] };
  try {
    let claims: Record<string, unknown> | null = null;

    const idToken = await getIdTokenFromDatabase(userId);
    if (idToken) {
      claims = decodeJwtClaims(idToken);
    }

    // If the id_token didn't carry the claims, fall back to the access_token.
    if (!claims || (!claims.roles && !claims.groups)) {
      const accessToken = await getTokenFromDatabase(userId);
      const atClaims = accessToken ? decodeJwtClaims(accessToken) : null;
      if (atClaims) {
        claims = claims ? { ...claims, ...atClaims } : atClaims;
      }
    }

    if (!claims) return { roles: [], groups: [] };
    return {
      roles: claimAsStringArray(claims.roles) ?? [],
      groups: claimAsStringArray(claims.groups) ?? [],
    };
  } catch {
    return { roles: [], groups: [] };
  }
}
