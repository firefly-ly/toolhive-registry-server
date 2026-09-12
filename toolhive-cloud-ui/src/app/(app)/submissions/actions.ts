"use server";

import { readFileSync } from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getAuthContext } from "@/lib/auth/context";
import {
  approveSubmission,
  classifyRegistry,
  createSubmission,
  deployMcp,
  type RegistryClassify,
  rotateMcpToken,
  setSubmissionStatus,
  setSubmissionVisibility,
  syncRegistry,
  undeployMcp,
} from "@/lib/platform-backend";

const BACKEND_BASE =
  process.env.PLATFORM_BACKEND_URL || "http://127.0.0.1:4000";

// 从当前 Casdoor 会话解析提交人标识（email 优先，回退 name）
async function currentActor(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.email ?? session?.user?.name ?? "anonymous";
}

// 把二进制制品上传到平台后端 ObjectStore，返回内部 artifact_key。
// Server Action 内完成上传，避免浏览器直连 127.0.0.1:4000 被本地代理/环回重置。
async function uploadBufferToBackend(
  buf: ArrayBuffer,
  filename: string,
  endpoint = "/upload",
): Promise<string> {
  const res = await fetch(
    `${BACKEND_BASE}${endpoint}?name=${encodeURIComponent(filename)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        // 后端 /upload* 已加身份门（P0-2）：本函数跑在 Next 服务端，携带内部令牌通过
        "x-internal-proxy":
          process.env.INTERNAL_PROXY_TOKEN || "thv-internal-proxy",
      },
      body: buf,
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`制品上传失败: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { key: string };
  return data.key;
}

// 从用户填写的"文件位置"拉取制品：支持 http/https URL 或本地绝对路径（含 UNC）。
async function fetchFileFromLocation(
  location: string,
): Promise<{ buffer: ArrayBuffer; filename: string }> {
  const trimmed = location.trim();
  const lower = trimmed.toLowerCase();

  if (lower.startsWith("http://") || lower.startsWith("https://")) {
    const res = await fetch(trimmed, { cache: "no-store" });
    if (!res.ok) throw new Error(`无法下载远程文件: HTTP ${res.status}`);
    let filename = "skill-package";
    const disp = res.headers.get("content-disposition");
    if (disp) {
      const m = disp.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (m) filename = m[1].replace(/['"]/g, "");
    }
    if (filename === "skill-package") {
      try {
        const u = new URL(trimmed);
        const base = path.basename(u.pathname);
        if (base) filename = base;
      } catch (_) {
        /* ignore */
      }
    }
    const buf = await res.arrayBuffer();
    return { buffer: buf, filename };
  }

  // 本地绝对路径（Windows 盘符或 UNC 共享）
  let localPath = trimmed;
  if (lower.startsWith("file://")) localPath = trimmed.slice(7);
  if (/^[a-z]:[\\/]/i.test(localPath) || localPath.startsWith("\\\\")) {
    const buf = readFileSync(localPath);
    return {
      buffer: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      filename: path.basename(localPath),
    };
  }

  throw new Error("不支持的文件位置格式，请输入 http/https URL 或本地绝对路径");
}

export async function createSubmissionAction(formData: FormData): Promise<{
  ok: boolean;
  error?: string;
  existing_id?: string;
  existing_status?: string;
}> {
  const actor = await currentActor();
  const type = String(formData.get("type") ?? "").trim();
  const payload_ref = String(formData.get("payload_ref") ?? "").trim();
  if (!type || !payload_ref) return { ok: false, error: "类型与引用为必填项" };
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const group_key = String(formData.get("group_key") ?? "").trim();
  const version = String(formData.get("version") ?? "").trim();
  const repository_url = String(formData.get("repository_url") ?? "").trim();
  const image_ref = String(formData.get("image_ref") ?? "").trim();
  const transport = String(formData.get("transport") ?? "").trim();
  const meta: Record<string, unknown> = {};
  if (name) meta.name = name;
  if (description) meta.description = description;
  if (group_key) meta.group_key = group_key;
  if (version) meta.version = version;
  if (repository_url) meta.repository_url = repository_url;
  if (type === "skill") {
    // Skill 制品来源二选一：本地上传文件 或 填写远程/本地文件位置。
    // Server Action 内统一上传到平台 ObjectStore，避免浏览器直连后端被本地网络策略拦截。
    const file = formData.get("file") as File | null;
    const download_url = String(formData.get("download_url") ?? "").trim();

    if (file && file.size > 0) {
      const key = await uploadBufferToBackend(
        await file.arrayBuffer(),
        file.name,
      );
      meta.artifact_key = key;
    } else if (download_url) {
      try {
        const { buffer, filename } = await fetchFileFromLocation(download_url);
        const key = await uploadBufferToBackend(buffer, filename);
        meta.artifact_key = key;
        meta.source_url = download_url;
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    } else {
      return { ok: false, error: "请上传技能包文件或填写文件所在位置" };
    }
    meta.owner = actor;
  }
  if (type === "mcp") {
    // MCP 三种来源二选一：填 ghcr 镜像地址 / 上传镜像 tar 包（docker save 导出）/ 源码包（平台自动构建）
    const mcpSource = String(formData.get("mcp_source") ?? "ghcr").trim();
    if (mcpSource === "source") {
      // 源码包：POST /submissions/source 一次性完成上传+建档（后端自动构建在部署阶段）
      const file = formData.get("source_file") as File | null;
      if (!file || file.size === 0) {
        return { ok: false, error: "请选择要上传的源码包" };
      }
      if (!/\.(zip|tar\.gz|tgz)$/i.test(file.name)) {
        return { ok: false, error: "源码包仅支持 .zip / .tar.gz / .tgz" };
      }
      if (file.size > 20 * 1024 * 1024) {
        return { ok: false, error: "源码包上限 20MB" };
      }
      const qs = new URLSearchParams({
        name: file.name,
        display_name: name || file.name.replace(/\.(zip|tar\.gz|tgz)$/i, ""),
        // version 不做 1.0.0 兜底：缺省时交由后端从 payload_ref（产品名:版本号）自动提取
        ...(version ? { version } : {}),
        ...(payload_ref ? { payload_ref } : {}),
      });
      const created = await fetch(`${BACKEND_BASE}/submissions/source?${qs}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "x-internal-proxy":
            process.env.INTERNAL_PROXY_TOKEN || "thv-internal-proxy",
          "x-actor-email": actor,
        },
        body: await file.arrayBuffer(),
        cache: "no-store",
      });
      if (!created.ok) {
        const text = await created.text().catch(() => "");
        return {
          ok: false,
          error: `源码包提交失败: ${created.status} ${text.slice(0, 200)}`,
        };
      }
      const createdJson = (await created.json()) as { id: string };
      // 私密 .env（可选）：单独上传，值入 ToolHive 加密凭据库，平台不落明文
      const envFile = formData.get("env_file") as File | null;
      if (envFile && envFile.size > 0) {
        if (envFile.size > 256 * 1024) {
          return { ok: false, error: ".env 文件过大（上限 256KB）" };
        }
        const envText = new TextDecoder().decode(await envFile.arrayBuffer());
        const envRes = await fetch(
          `${BACKEND_BASE}/submissions/${createdJson.id}/env`,
          {
            method: "POST",
            headers: {
              "Content-Type": "text/plain",
              "x-actor-email": actor,
            },
            body: envText,
            cache: "no-store",
          },
        );
        if (!envRes.ok) {
          const text = await envRes.text().catch(() => "");
          return {
            ok: false,
            error: `.env 上传失败: ${envRes.status} ${text.slice(0, 200)}`,
          };
        }
      }
      revalidatePath("/submissions");
      return { ok: true };
    }
    if (mcpSource === "tar") {
      const file = formData.get("file") as File | null;
      if (!file || file.size === 0) {
        return { ok: false, error: "请选择要上传的镜像 tar 包" };
      }
      if (!/\.(tar|tar\.gz|tgz)$/i.test(file.name)) {
        return {
          ok: false,
          error:
            "镜像包仅支持 .tar / .tar.gz / .tgz（请使用 docker save 导出）",
        };
      }
      try {
        // 经 Server Action 内上传到 /upload/tar（流式落盘 + 体积/结构校验），返回内部 key
        const key = await uploadBufferToBackend(
          await file.arrayBuffer(),
          file.name,
          "/upload/tar",
        );
        meta.source_type = "tar";
        meta.artifact_key = key;
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    } else {
      // 镜像引用由提交者提供（其已 push 的镜像），运行地址部署后自动分配
      if (image_ref) meta.image_ref = image_ref;
      if (transport && transport !== "auto") meta.transport = transport;
      // 勾选「自动同步到内网」：审批通过后由平台把镜像同步进内网 registry
      const autoMirror = String(formData.get("auto_mirror") ?? "").trim();
      if (autoMirror === "1" || autoMirror === "true" || autoMirror === "on") {
        meta.auto_mirror = true;
      }
    }
  }
  try {
    await createSubmission({
      user_id: actor,
      type,
      payload_ref,
      meta: Object.keys(meta).length ? meta : undefined,
    });
  } catch (e) {
    // 409 去重 / 429 限流：后端返回结构化错误，直接回显给用户，不触发错误页
    const err = e as Error & { status?: number };
    const body = err as unknown as {
      existing_id?: string;
      existing_status?: string;
    };
    return {
      ok: false,
      error: err?.message || "提交失败，请稍后重试",
      existing_id: body.existing_id,
      existing_status: body.existing_status,
    };
  }
  revalidatePath("/submissions");
  return { ok: true };
}

// 镜像来源分级查询（Server Action 内代理调用，避免浏览器直连后端被本地代理重置）
export async function classifyRegistryAction(
  ref: string,
): Promise<RegistryClassify | null> {
  const trimmed = String(ref || "").trim();
  if (!trimmed) return null;
  try {
    return await classifyRegistry(trimmed);
  } catch (error) {
    // 查询失败不阻断填写，降级为"无提示"，但留痕
    console.error(`[classifyRegistry:${trimmed}]`, error);
    return null;
  }
}

export async function approveSubmissionAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const endpoint = String(formData.get("endpoint") ?? "").trim();
  const download_url = String(formData.get("download_url") ?? "").trim();
  const transport = String(formData.get("transport") ?? "").trim();
  // 安全扫描人工确认（后端 422 闸门要求显式传参，勾选动作进审计轨迹）
  const override_scan = String(formData.get("override_scan") ?? "") === "true";
  const confirm_prompt_review =
    String(formData.get("confirm_prompt_review") ?? "") === "true";
  if (!id) return;
  await approveSubmission(id, "admin", {
    endpoint: endpoint || undefined,
    download_url: download_url || undefined,
    transport: transport || undefined,
    override_scan: override_scan || undefined,
    confirm_prompt_review: confirm_prompt_review || undefined,
  });
  revalidatePath("/submissions");
  revalidatePath("/admin");
  revalidatePath("/catalog");
  revalidatePath("/skills");
}

// 管理者拒绝待审核提交
export async function rejectSubmissionAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await setSubmissionStatus(id, "rejected", "admin");
  revalidatePath("/admin");
  revalidatePath("/submissions");
  revalidatePath("/catalog");
  revalidatePath("/skills");
}

// 生命周期状态变更（管理者操作：下架 deprecated / 删除 removed 等）
export async function setLifecycleAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!id || !status) return;
  // 生命周期操作（下架 / 恢复 / 删除）失败时不能让异常冒泡：
  // 否则 Next.js error boundary 会渲染白屏"未知错误"，用户完全看不到原因。
  try {
    await setSubmissionStatus(id, status, "admin");
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const label =
      status === "removed"
        ? "删除失败"
        : status === "deprecated"
          ? "下架失败"
          : "状态变更失败";
    redirect(
      `/admin?tab=published&error=${encodeURIComponent(`${label}：${message}`)}`,
    );
  }
  revalidatePath("/admin");
  revalidatePath("/submissions");
  revalidatePath("/catalog");
  revalidatePath("/skills");
  revalidatePath("/mcp/[ref]", "page");
  // 成功后停留原地；失败才跳转携带 error 参数弹 toast
}

// P3：管理者手动触发 / 取消 ToolHive 部署（MCP）
// 部署要 thv run + 轮询端口可达，最长可能 30~180s，远超 Next.js server action
// 默认 fetch 超时（~30s）。如果同步 await，浏览器会因"An unexpected response
// was received from the server"触发整页 error boundary 崩页（同时让"2 failures"
// 误以为是「下架/下线」操作失败）。
// 这里改为 fire-and-forget：立即返回 redirect，部署在后台异步完成；页面
// 重新拉取时已能看见 deploy_status="deploying"，最终转 deployed / failed。
export async function deploySubmissionAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  // 立即设置"部署中"状态，避免页面切换过程中还看到 unborn。
  // deployMcp 内部会再次 patchMeta('deploying')，此处只是更早落盘。
  setImmediate(() => {
    deployMcp(id).catch((e) => {
      console.error(
        "[deploySubmissionAction] 部署失败（后台）:",
        id,
        e?.message,
      );
    });
  });
  revalidatePath("/admin");
  revalidatePath("/submissions");
  revalidatePath("/catalog");
  revalidatePath("/mcp/[ref]");
  // 停留在原地：只刷新数据不导航，部署状态由卡片徽章（部署中…/运行中/部署失败）就地反映
}

export async function undeploySubmissionAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  try {
    await undeployMcp(id);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    redirect(
      `/admin?tab=published&error=${encodeURIComponent(`下线失败：${message}`)}`,
    );
  }
  revalidatePath("/admin");
  revalidatePath("/submissions");
  revalidatePath("/catalog");
  revalidatePath("/mcp/[ref]");
  // 成功后停留原地；失败才跳转携带 error 参数弹 toast
}

// P5：轮换代理访问令牌（仅管理员，仅 MCP）。旧 Token 立即作废，已复制配置需重新复制。
export async function rotateMcpTokenAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  try {
    await rotateMcpToken(id);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    redirect(
      `/admin?tab=published&error=${encodeURIComponent(`Token 轮换失败：${message}`)}`,
    );
  }
  revalidatePath("/admin");
  revalidatePath("/mcp/[ref]");
  // 成功后停留原地；用户需在各客户端重新复制接入配置
}

// P4：重新同步到 Registry Server（同步失败后重试 / 补发布）
export async function syncRegistryAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  try {
    await syncRegistry(id);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    redirect(
      `/admin?tab=published&error=${encodeURIComponent(`同步失败：${message}`)}`,
    );
  }
  revalidatePath("/admin");
  revalidatePath("/submissions");
  revalidatePath("/catalog");
  revalidatePath("/skills");
  // 成功后停留原地；失败才跳转携带 error 参数弹 toast
}

// 管理员设置条目可见范围（方案C：发布时决定哪些成员/组可查看/下载/调用）。
// 表单字段：id、mode（all|restricted）、users（逗号分隔邮箱）、groups（逗号分隔组名）。
export async function setVisibilityAction(formData: FormData) {
  const { isAdmin } = await getAuthContext();
  if (!isAdmin) {
    redirect(
      `/admin?tab=published&error=${encodeURIComponent("仅管理员可设置可见范围")}`,
    );
  }
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const mode =
    String(formData.get("mode") ?? "all") === "restricted"
      ? "restricted"
      : "all";
  const users = String(formData.get("users") ?? "")
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const groups = String(formData.get("groups") ?? "")
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  try {
    await setSubmissionVisibility(id, { mode, users, groups });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    redirect(
      `/admin?tab=published&error=${encodeURIComponent(`可见范围设置失败：${message}`)}`,
    );
  }
  revalidatePath("/admin");
  revalidatePath("/catalog");
  revalidatePath("/mcp/[ref]", "page");
  revalidatePath("/skills");
  // 成功后停留原地；失败才跳转携带 error 参数弹 toast
}
// （原 activateVersionAction 已随激活指针废弃移除——用户侧版本下拉自选已上架版本，
//  目录默认展示"最新已上架版本"，不再维护激活指针。）
