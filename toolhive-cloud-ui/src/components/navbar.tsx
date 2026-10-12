import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { MobileNav } from "@/components/mobile-nav";
import { NavPills } from "@/components/nav-pills";
import { TopbarSearch } from "@/components/topbar-search";
import { UserMenu } from "@/components/user-menu";
// 直连组件文件而非 barrel：避免把整个 assistant 特性图（聊天栈）拖进主 bundle
import { AssistantTrigger } from "@/features/assistant/components/trigger";
import type { AuthUser } from "@/lib/auth/context";

interface NavbarProps {
  user?: AuthUser;
  isAdmin: boolean;
}

/**
 * 包豪斯顶栏（全站唯一导航位，桌面 + 移动共用）：
 * 三件套品牌标 + 胶囊导航 + 用户区；底边 2px 结构黑描边压住整张白纸。
 * 移动端（<md）胶囊隐藏，走 MobileNav 抽屉。
 */
export function Navbar({ user, isAdmin }: NavbarProps) {
  return (
    <header className="bg-card flex h-14 w-full shrink-0 items-center gap-6 border-b-2 border-foreground pr-4 pl-6">
      <div className="flex items-center gap-3">
        <MobileNav isAdmin={isAdmin} />
        <Link
          href="/catalog"
          aria-label="能力中枢首页"
          className="flex items-center"
        >
          <BrandMark className="h-5 shrink-0" />
          <span className="ml-2.5 text-[15px] font-semibold tracking-wide">
            能力中枢
          </span>
        </Link>
      </div>
      <NavPills isAdmin={isAdmin} />
      <div className="ml-auto flex h-full shrink-0 items-center gap-4">
        <div className="hidden lg:block">
          <TopbarSearch />
        </div>
        {user?.name && <UserMenu userName={user.name} email={user.email} />}
        {isAdmin && (
          <span className="ml-1.5 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            管理员
          </span>
        )}
        <div className="bg-border mx-4 h-8 w-px" />
        <AssistantTrigger />
      </div>
    </header>
  );
}
