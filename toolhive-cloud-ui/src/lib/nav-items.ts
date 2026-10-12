import {
  BarChart3,
  Boxes,
  type LucideIcon,
  ShieldCheck,
  Star,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

// 全站唯一导航源：顶栏 / 移动抽屉 / ⌘K 面板共用。
// IA 决策（2026-10 全站重设计）：「技能」并入统一目录（/skills 路由保留作深链接，
// 面包屑仍可定位）；「提交」不走导航，入口在目录页 hero 的「提交新工具」CTA。
export const NAV_ITEMS: NavItem[] = [
  { href: "/catalog", label: "目录", icon: Boxes },
  { href: "/favorites", label: "工作台", icon: Star },
  { href: "/stats", label: "统计", icon: BarChart3 },
  { href: "/admin", label: "管理后台", icon: ShieldCheck, adminOnly: true },
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
  catalog: "目录",
  skills: "技能",
  submissions: "提交",
  favorites: "工作台",
  stats: "统计",
  admin: "管理后台",
  reviews: "审核队列",
  published: "已发布管理",
  mcp: "MCP 详情",
};
