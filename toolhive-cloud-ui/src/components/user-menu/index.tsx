"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SignOutMenuItem } from "./sign-out-menu-item";
import { ThemeMenuItems } from "./theme-menu-items";
import { UserMenuButton } from "./user-menu-button";

interface UserMenuProps {
  userName: string;
  /** 登录邮箱：不再占据顶栏，收进下拉首行 */
  email?: string;
}

export function UserMenu({ userName, email }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DropdownMenu onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <UserMenuButton userName={userName} isOpen={isOpen} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {email && (
          <>
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              {email}
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        <ThemeMenuItems />
        <DropdownMenuSeparator />
        <SignOutMenuItem />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
