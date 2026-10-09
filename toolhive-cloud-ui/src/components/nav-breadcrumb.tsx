"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SEGMENT_LABELS } from "@/lib/nav-items";

// 动态段（ref / serverName / id 等）回落到解码后的原值；过长截断避免面包屑爆行
function segmentLabel(segment: string): string {
  const known = SEGMENT_LABELS[segment];
  if (known) return known;
  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    // 非法编码序列：保留原值
  }
  return decoded.length > 24 ? `${decoded.slice(0, 24)}…` : decoded;
}

/**
 * 内容区顶部面包屑：由 pathname 分段推导，静态段走 SEGMENT_LABELS 中文名。
 * 面包屑从深色 navbar 移到纸面内容区——navbar 是深色底，breadcrumb 令牌是纸面色，
 * 两处底色不兼容，故独立成组件放在 main 内。
 */
export function NavBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // 根路径无面包屑
  if (segments.length === 0) return null;

  let href = "";
  const crumbs = segments.map((segment, index) => {
    href += `/${segment}`;
    return {
      href,
      label: segmentLabel(segment),
      isLast: index === segments.length - 1,
    };
  });

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb) => (
          <Fragment key={crumb.href}>
            <BreadcrumbItem>
              {crumb.isLast ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={crumb.href}>{crumb.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {!crumb.isLast && <BreadcrumbSeparator />}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
