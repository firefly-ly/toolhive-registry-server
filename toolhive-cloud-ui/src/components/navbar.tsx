import { MobileNav } from "@/components/mobile-nav";
import { NavbarLogo } from "@/components/navbar-logo";
import { UserMenu } from "@/components/user-menu";
// 直连组件文件而非 barrel：避免把整个 assistant 特性图（聊天栈）拖进主 bundle
import { AssistantTrigger } from "@/features/assistant/components/trigger";
import type { AuthUser } from "@/lib/auth/context";

interface NavbarProps {
  user?: AuthUser;
  isAdmin: boolean;
}

/**
 * 深色顶栏：只承载用户区（菜单/邮箱/管理员徽章）与 AI 助手入口。
 * 主导航已迁往桌面侧栏（AppSidebar）/ 移动抽屉（MobileNav）；
 * 桌面端品牌在侧栏，此处 logo 仅移动端显示（白字标配深色底）。
 * 面包屑在内容区顶部（NavBreadcrumb）——深色底与纸面色令牌不兼容。
 */
export function Navbar({ user, isAdmin }: NavbarProps) {
  return (
    <header className="flex h-16 w-full shrink-0 items-center justify-between border-b border-nav-border bg-nav-background pl-4 pr-4 text-white md:pl-6">
      <div className="flex items-center gap-3">
        <MobileNav isAdmin={isAdmin} />
        <div className="md:hidden">
          <NavbarLogo />
        </div>
      </div>
      <div className="flex h-full shrink-0 items-center">
        {user?.name && <UserMenu userName={user.name} />}
        {user?.email && (
          <span className="ml-2 text-xs text-white/60">{user.email}</span>
        )}
        {isAdmin && (
          <span className="ml-1.5 rounded-full border border-white/25 bg-white/15 px-2 py-0.5 text-[11px] font-medium text-white">
            管理员
          </span>
        )}
        <div className="mx-4 h-full w-px bg-nav-border" />
        <AssistantTrigger />
      </div>
    </header>
  );
}
