import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth/auth-client";

export function SignOutMenuItem() {
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out failed:", error);
      toast.error("退出登录失败，请重试");
    }
  };

  return (
    <DropdownMenuItem onSelect={handleSignOut}>
      <LogOut />
      退出登录
    </DropdownMenuItem>
  );
}
