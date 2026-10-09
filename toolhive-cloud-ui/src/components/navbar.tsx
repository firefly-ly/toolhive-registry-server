import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { MobileNav } from "@/components/mobile-nav";
import { UserMenu } from "@/components/user-menu";
// 直连组件文件而非 barrel：避免把整个 assistant 特性图（聊天栈）拖进主 bundle
import { AssistantTrigger } from "@/features/assistant/components/trigger";
import type { AuthUser } from "@/lib/auth/context";

interface NavbarProps {
  user?: AuthUser;
  isAdmin: boolean;
}

/**
 * 顶栏与侧栏同为纸面（bg-sidebar + hairline 边框），整块 chrome 连成一张纸，
 * 消除「深色条只盖内容区」造成的割裂感；所有颜色走令牌，dark 模式自动适配。
 * 桌面端品牌在左栏，顶栏 logo 仅移动端显示；主导航在侧栏 / 移动抽屉，
 * 面包屑在内容区顶部（NavBreadcrumb，仅二三级页面出现）。
 */
export function Navbar({ user, isAdmin }: NavbarProps) {
  return (
    <header className="flex h-16 w-full shrink-0 items-center justify-between border-b border-sidebar-border bg-sidebar pl-4 pr-4 text-sidebar-foreground md:pl-6">
      <div className="flex items-center gap-3">
        <MobileNav isAdmin={isAdmin} />
        <Link
          href="/catalog"
          aria-label="ToolHive 首页"
          className="flex items-center md:hidden"
        >
          <BrandMark className="size-6 shrink-0" />
          <span className="ml-2 text-[15px] font-semibold tracking-tight">
            ToolHive
          </span>
        </Link>
      </div>
      <div className="flex h-full shrink-0 items-center">
        {user?.name && <UserMenu userName={user.name} />}
        {user?.email && (
          <span className="ml-2 text-xs text-sidebar-foreground/60">
            {user.email}
          </span>
        )}
        {isAdmin && (
          <span className="ml-1.5 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            管理员
          </span>
        )}
        <div className="mx-4 h-full w-px bg-sidebar-border" />
        <AssistantTrigger />
      </div>
    </header>
  );
}
