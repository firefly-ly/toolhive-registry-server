"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { isNavItemActive, navItemsFor } from "@/lib/nav-items";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  isAdmin: boolean;
}

/**
 * 移动端（<md）导航抽屉；桌面端由固定侧栏（AppSidebar）接管，
 * 触发按钮 md:hidden。选中项后关闭抽屉完成跳转。
 */
export function MobileNav({ isAdmin }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const items = navItemsFor(isAdmin);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="打开导航菜单"
          className="size-9 cursor-pointer text-white hover:bg-white/10 hover:text-white focus:text-white md:hidden"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-64 bg-sidebar p-0 text-sidebar-foreground"
      >
        <SheetHeader className="border-b border-sidebar-border">
          <SheetTitle className="text-sidebar-foreground">导航菜单</SheetTitle>
          <SheetDescription className="sr-only">站点主导航</SheetDescription>
        </SheetHeader>
        <nav className="flex flex-col gap-1 p-2">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isNavItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center rounded-md px-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="ml-2.5">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
