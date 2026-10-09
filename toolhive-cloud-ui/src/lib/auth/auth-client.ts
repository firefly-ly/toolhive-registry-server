"use client";

import { genericOAuthClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { toast } from "sonner";
import { getOidcSignOutUrl } from "./actions";

export const authClient = createAuthClient({
  // Don't specify baseURL - it will use the same origin as the page
  // This avoids CORS issues when Next.js uses a different port
  plugins: [genericOAuthClient()],
});

export const { signIn, useSession } = authClient;

/**
 * Signs out the user from both the local session and OIDC provider.
 * Performs RP-Initiated Logout to terminate the SSO session at the provider.
 */
export const signOut = async () => {
  try {
    // 1. Get logout URL FIRST (while session still exists)
    const redirectUrl = await getOidcSignOutUrl();

    // 2. Sign out from Better Auth (invalidates session + clears account_data)
    await authClient.signOut();

    // 3. Redirect to OIDC provider logout
    window.location.replace(redirectUrl);
  } catch (error) {
    console.error("[Auth] Sign out error:", error);
    toast.error("退出登录失败", {
      description: "正在返回登录页；若持续失败请联系管理员",
    });

    // Fallback redirect on error
    window.location.replace("/signin");
  }
};
