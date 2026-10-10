import {
  BarChart3,
  Boxes,
  FileUp,
  type LucideIcon,
  ShieldCheck,
  Star,
  Wrench,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

// 全站唯一导航源：桌面侧栏 / 移动抽屉 / 后续 ⌘K 面板共用。
// 从原 navbar.tsx 的两份硬编码数组收敛而来，新增导航入口只改这里。
export const NAV_ITEMS: NavItem[] = [
  { href: "/catalog", label: "MCP", icon: Boxes },
  { href: "/skills", label: "技能", icon: Wrench },
  { href: "/submissions", label: "提交", icon: FileUp },
  { href: "/favorites", label: "工作台", icon: Star },
  { href: "/stats", label: "统计", icon: BarChart3 },
  { href: "/admin", label: "管理", icon: ShieldCheck, adminOnly: true },
];

export function navItemsFor(isAdmin: boolean): NavItem[] {
  return isAdmin ? NAV_ITEMS : NAV_ITEMS.filter((item) => !item.adminOnly);
}

// active 判定：精确匹配或子路径（沿用原 NavLink 的口径）
export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// 面包屑：静态路由段 → 中文名；动态段（[ref]/[serverName] 等）回落到解码后的原值
export const SEGMENT_LABELS: Record<string, string> = {
  catalog: "MCP",
  skills: "技能",
  submissions: "提交管理",
  favorites: "工作台",
  stats: "使用统计",
  admin: "管理",
  reviews: "审核队列",
  published: "已发布管理",
  mcp: "MCP 详情",
};
