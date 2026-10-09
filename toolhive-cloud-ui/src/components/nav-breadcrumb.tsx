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
 * 仅二三级页面渲染（一级页与页面大标题重复）；动态段回落到解码原值并截断。
 */
export function NavBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // 一级页面不渲染：单段面包屑只会和页面自身大标题重复
  // （如 /catalog 的「MCP」小字悬在「MCP 目录」上）；二级及以下才定位价值
  if (segments.length < 2) return null;

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
    <Breadcrumb className="mb-3">
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
