"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavItemActive, navItemsFor } from "@/lib/nav-items";
import { cn } from "@/lib/utils";

/**
 * 顶栏主导航（桌面端）：黑色胶囊 = 结构色选中态（包豪斯纪律：
 * 实心黑只给导航选中与结构描边，橙红只给 CTA）。
 * 与侧栏/移动抽屉共用 nav-items 唯一数据源。
 */
export function NavPills({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="主导航" className="hidden items-center gap-1 md:flex">
      {navItemsFor(isAdmin).map((item) => {
        const active = isNavItemActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
