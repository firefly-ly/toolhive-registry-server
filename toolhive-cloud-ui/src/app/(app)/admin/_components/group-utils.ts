import type { Submission } from "@/lib/platform-backend";

/**
 * 提交分组的纯函数与常量（服务端/客户端共用，不得标 "use client"）。
 * 从 submission-groups.tsx 抽出：服务端页面（/admin/published）需要在 RSC 里
 * 调 buildGroups，而原文件是 client 模块，跨边界调用会 500。
 */

export const DEPLOY_LABEL: Record<string, string> = {
  unborn: "未部署",
  deploying: "部署中…",
  deployed: "运行中",
  failed: "部署失败",
  undeployed: "已下线",
};

export const REGISTRY_LABEL: Record<string, string> = {
  published: "已同步",
  error: "同步失败",
  "skipped:no-endpoint": "待部署",
  deleted: "已移除",
  "delete-error": "移除失败",
  "": "未同步",
};

export const REGISTRY_TONE: Record<
  string,
  "default" | "destructive" | "secondary"
> = {
  published: "default",
  error: "destructive",
  "skipped:no-endpoint": "secondary",
  deleted: "secondary",
  "delete-error": "destructive",
  "": "secondary",
};

export function parseMeta(meta?: string): Record<string, string> {
  try {
    return meta ? (JSON.parse(meta) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

// 条目是否配置了"仅指定成员/组可见"（管理员在发布时设置）
export function isRestricted(s: Submission): boolean {
  try {
    const meta = s.meta ? (JSON.parse(s.meta) as Record<string, unknown>) : {};
    const v = meta.visibility as { mode?: string } | undefined;
    return v?.mode === "restricted";
  } catch {
    return false;
  }
}

// 条目是否已「上线」：管理员显式保存过可见范围(visibility_configured=true)才上线。
// 存量条目无该字段 → 视为已上线（后端向后兼容）；新提交默认 false → 未上线（待配可见范围）。
export function isOnShelf(s: Submission): boolean {
  try {
    const meta = s.meta ? (JSON.parse(s.meta) as Record<string, unknown>) : {};
    return meta.visibility_configured !== false;
  } catch {
    return true;
  }
}

export function groupKey(s: Submission): string {
  return parseMeta(s.meta).group_key || s.id;
}

export function versionOf(s: Submission): string {
  return parseMeta(s.meta).version || "1.0.0";
}

export function buildGroups(published: Submission[]) {
  const groups = new Map<string, Submission[]>();
  published.forEach((s) => {
    const gk = groupKey(s);
    const arr = groups.get(gk) || [];
    arr.push(s);
    groups.set(gk, arr);
  });
  for (const arr of groups.values()) {
    arr.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  }
  return groups;
}
