"use server";

import { revalidatePath } from "next/cache";
import { createIssue, deleteIssue, replyIssue } from "@/lib/platform-backend";

function revalidateDetailPages() {
  revalidatePath("/skills");
  revalidatePath("/catalog");
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
    revalidateDetailPages();
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
  revalidateDetailPages();
}

// 关闭 / 重新打开 Issue（管理员，对齐 GitHub 的 Close / Reopen）
export async function updateIssueStatusAction(
  id: string,
  status: "open" | "closed",
) {
  if (!id) return { ok: false, error: "缺少反馈 id" };
  try {
    await replyIssue(id, { status });
    revalidateDetailPages();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// 删除 Issue（管理员兜底操作，UI 侧已做二次确认；后端 403 非管理员）
export async function deleteIssueAction(id: string) {
  if (!id) return { ok: false, error: "缺少反馈 id" };
  try {
    await deleteIssue(id);
    revalidateDetailPages();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
