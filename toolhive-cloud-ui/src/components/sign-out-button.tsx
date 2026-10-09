"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/auth-client";

export function SignOut() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error("[sign-out]", error);
      toast.error("退出登录失败", {
        description: "请稍后重试；若持续失败请联系管理员",
      });
      setIsSigningOut(false);
    }
  };

  return (
    <Button
      onClick={handleSignOut}
      disabled={isSigningOut}
      variant="destructive"
      size="lg"
      className="rounded-full"
    >
      {isSigningOut ? "退出中…" : "退出登录"}
    </Button>
  );
}
