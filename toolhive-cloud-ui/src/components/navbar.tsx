import { headers } from "next/headers";
import { NavLink } from "@/components/nav-link";
import { NavbarLogo } from "@/components/navbar-logo";
import { UserMenu } from "@/components/user-menu";
import { AssistantTrigger } from "@/features/assistant";
import { getAuthContext } from "@/lib/auth/context";

const USER_NAV_ITEMS = [
  { href: "/catalog", label: "MCP" },
  { href: "/skills", label: "技能" },
  { href: "/submissions", label: "提交" },
  { href: "/favorites", label: "收藏" },
  { href: "/stats", label: "统计" },
];

// 管理者专属入口：审核队列 + 已发布条目的生命周期管理
const ADMIN_NAV_ITEMS = [{ href: "/admin", label: "管理" }];

export async function Navbar() {
  const { user, isAdmin } = await getAuthContext();

  const navItems = isAdmin
    ? [...USER_NAV_ITEMS, ...ADMIN_NAV_ITEMS]
    : USER_NAV_ITEMS;

  return (
    <header className="w-full border-b border-nav-border bg-nav-background text-white flex items-center justify-between pl-6 pr-4 h-16">
      <div className="flex items-center gap-8">
        <NavbarLogo />
        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} />
          ))}
        </nav>
      </div>
      <div className="flex shrink-0 items-center h-full">
        {user?.name && <UserMenu userName={user.name} />}
        <span className="ml-2 text-xs text-white/60">
          {user?.email ?? "no-email"} / admin:{isAdmin ? "Y" : "N"}
        </span>
        <div className="mx-4 h-full w-px bg-nav-border" />
        <AssistantTrigger />
      </div>
    </header>
  );
}
