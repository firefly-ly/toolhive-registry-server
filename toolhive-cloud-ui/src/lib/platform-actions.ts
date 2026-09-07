"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import {
  createFavorite,
  removeFavorite,
  reportMetric,
  request,
  createIssue,
  replyIssue,
} from "@/lib/platform-backend";

// 从当前 Casdoor 会话解析操作人标识（email 优先，回退 name）
async function currentActor(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.email ?? session?.user?.name ?? "anonymous";
}

// 切换收藏（MCP / skill 通用）：当前已收藏则取消，否则新增
export async function toggleFavoriteAction(
  item_type: string,
  item_ref: string,
  favorited: boolean,
) {
  const actor = await currentActor();
  if (favorited) {
    await removeFavorite({ user_id: actor, item_type, item_ref });
  } else {
    await createFavorite({ user_id: actor, item_type, item_ref });
  }
  revalidatePath("/catalog");
  revalidatePath("/skills");
  revalidatePath("/favorites");
}

// 记录下载事件（skill）：每点一次下载 +1
export async function recordDownloadAction(
  item_type: string,
  item_ref: string,
) {
  const actor = await currentActor();
  await reportMetric({
    item_type,
    item_ref,
    event: "download",
    actor_id: actor,
  });
  revalidatePath("/skills");
}

// 记录调用事件（mcp）：每点一次"调用" +1
export async function recordCallAction(item_type: string, item_ref: string) {
  const actor = await currentActor();
  await reportMetric({ item_type, item_ref, event: "call", actor_id: actor });
  revalidatePath("/catalog");
}

// MCP 调用：由 Next 服务端打到平台后端 /mcp/call，
// 后端以 MCP 客户端连到 ToolHive 运行的 MCP server。返回后端原始 JSON。
export async function callMcpAction(
  ref: string,
  endpoint: string | undefined,
  tool?: string,
  args?: Record<string, unknown>,
) {
  const res = await request("/mcp/call", {
    method: "POST",
    body: JSON.stringify({ ref, endpoint, tool, args }),
  });
  return res as {
    ok?: boolean;
    endpoint?: string;
    stage?: string;
    events?: unknown[];
    error?: string;
    detail?: string;
  };
}

// 提交反馈 / Issue（MCP 与 Skill 详情页共用）
export async function createIssueAction(formData: FormData) {
  const target_type = String(formData.get("target_type") ?? "").trim();
  const target_ref = String(formData.get("target_ref") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const author = String(formData.get("author") ?? "").trim();
  if (!target_type || !target_ref || !title || !body)
    return { ok: false, error: "请填写标题与内容" };
  try {
    await createIssue({ target_type, target_ref, title, body, author });
    revalidatePath("/skills");
    revalidatePath("/catalog");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// 管理者回复 / 关闭 Issue
export async function replyIssueAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const reply = String(formData.get("reply") ?? "").trim();
  const status = String(formData.get("status") ?? "answered").trim();
  const reply_by = String(formData.get("reply_by") ?? "admin").trim();
  if (!id) return;
  await replyIssue(id, { reply, status, reply_by });
  revalidatePath("/skills");
  revalidatePath("/catalog");
}
