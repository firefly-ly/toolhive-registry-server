"use client";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/auth-client";

export function SignInButton({ providerId }: { providerId: string }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleOIDCSignIn = async () => {
    setIsLoading(true);
    try {
      // Clear any stale cookies/session before starting a new OAuth flow.
      // When the app redirects to /signin due to an expired or invalid token,
      // Better Auth cookies may still be present with stale data. Signing out
      // first ensures a clean state and prevents the new OAuth flow from
      // inheriting the stale account_data cookie.
      // Better Auth client methods return { data, error } and don't throw,
      // so no error handling is needed here.
      await authClient.signOut();

      const { error } = await authClient.signIn.oauth2({
        providerId,
        callbackURL: "/catalog",
      });

      if (error) {
        setIsLoading(false);
        toast.error("登录失败", {
          description:
            error.message ||
            "登录过程中发生错误，请重试。",
        });
        return;
      }
    } catch (error) {
      setIsLoading(false);
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";

      toast.error("登录出错", {
        description: errorMessage,
      });
    }
  };

  return (
    <Button
      onClick={handleOIDCSignIn}
      variant="action"
      className="w-full h-9 gap-2 cursor-pointer"
      size="default"
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="text-muted-foreground size-4 animate-spin" />
      ) : (
        "登录"
      )}
    </Button>
  );
}
