// Server-only client for the self-hosted platform backend (runbook 阶段10).
// 在 Cloud UI 的 Node 进程内调用，经 loopback 与后端通信。
// 后端地址可通过 PLATFORM_BACKEND_URL 覆盖（默认走 WSL2 本机 127.0.0.1:4000）。

import { getAuthContext } from "@/lib/auth/context";
import type { ServerTool } from "@/lib/schemas/server-meta";

const BASE = process.env.PLATFORM_BACKEND_URL || "http://127.0.0.1:4000";

// 读取当前登录用户身份，注入到平台后端请求头。
// 可见性控制依赖这些 header：后端据此过滤 restricted 条目与"只看自己的提交"。
async function actorHeaders(): Promise<Record<string, string>> {
  try {
    const ctx = await getAuthContext();
    const email = ctx.user?.email;
    if (!email) return {};
    return {
      "x-actor-email": email,
      "x-actor-groups": ctx.groups.join(","),
      "x-actor-admin": ctx.isAdmin ? "1" : "0",
    };
  } catch (_) {
    return {};
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const identity = await actorHeaders();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...identity,
      ...(init?.headers || {}),
    },
    // 业务数据实时性要求高，禁用 Next 的 fetch 缓存
    cache: "no-store",
  });
  if (!res.ok) {
    let message = `平台后端请求失败 ${path}: ${res.status}`;
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      try {
        const j = await res.json();
        if (j?.error) message = j.error;
      } catch (_) {
        /* 非 JSON，保留默认信息 */
      }
    } else {
      const text = await res.text().catch(() => "");
      if (text) message += ` ${text}`;
    }
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return (await res.json()) as T;
}

export interface Submission {
  id: string;
  user_id: string;
  type: string;
  payload_ref: string;
  status: string;
  scan_status: string;
  created_at: string;
  meta?: string;
  registry_synced?: string; // published | error | skipped:no-endpoint | deleted | delete-error | ""
  // restricted 条目的代理调用凭证（Authorization Header 形态，token 不再拼在 URL 上）
  mcp_headers?: Record<string, string>;
  registry_name?: string;
  visibility?: {
    mode: "all" | "restricted";
    users: string[];
    groups: string[];
  };
}

export async function listSubmissions(): Promise<Submission[]> {
  return request<Submission[]>("/submissions");
}

// 统一审计轨迹（仅管理员，后端 403 校验）。筛选参数全部可选。
export interface AuditEntry {
  id: string;
  ts: string;
  actor_email: string;
  actor_admin: number;
  action: string;
  target_type: string;
  target_id: string;
  detail: string;
  result: string;
}

export async function queryAudit(filters: {
  actor?: string;
  action?: string;
  target_id?: string;
  from?: string;
  to?: string;
  limit?: number;
}): Promise<{ count: number; items: AuditEntry[] }> {
  const qs = new URLSearchParams();
  if (filters.actor) qs.set("actor", filters.actor);
  if (filters.action) qs.set("action", filters.action);
  if (filters.target_id) qs.set("target_id", filters.target_id);
  if (filters.from) qs.set("from", filters.from);
  if (filters.to) qs.set("to", filters.to);
  if (filters.limit) qs.set("limit", String(filters.limit));
  const q = qs.toString();
  return request(`/audit${q ? `?${q}` : ""}`);
}

// 管理员设置条目可见范围（发布时决定哪些成员/组可查看/下载/调用）。
// 后端硬校验 x-actor-admin，非管理员返回 403。
export async function setSubmissionVisibility(
  id: string,
  visibility: { mode: "all" | "restricted"; users: string[]; groups: string[] },
): Promise<{ id: string; visibility: Submission["visibility"] }> {
  return request(`/submissions/${id}/visibility`, {
    method: "POST",
    body: JSON.stringify(visibility),
  });
}

export async function setSubmissionStatus(
  id: string,
  status: string,
  adminId = "admin",
): Promise<{ id: string; status: string }> {
  return request<{ id: string; status: string }>(`/submissions/${id}/status`, {
    method: "POST",
    body: JSON.stringify({ status, admin_id: adminId }),
  });
}

export interface RegistryClassify {
  tier: number; // 1 内网直通 / 2 受信白名单留痕 / 3 未知来源拦截
  registry: string;
  allowed: boolean;
  message: string;
  internal_registry: string;
  internal_only: boolean;
  trusted_registries: string[];
}

// 镜像来源分级查询。白名单以后端配置为准，前端不另存一份。
export async function classifyRegistry(ref: string): Promise<RegistryClassify> {
  return request<RegistryClassify>(
    `/registry/classify?ref=${encodeURIComponent(ref)}`,
    { method: "GET" },
  );
}

export async function createSubmission(input: {
  user_id: string;
  type: string;
  payload_ref: string;
  meta?: Record<string, unknown>;
}): Promise<{ id: string; status: string }> {
  return request<{ id: string; status: string }>("/submissions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function approveSubmission(
  id: string,
  admin_id = "admin",
  extra?: {
    endpoint?: string;
    download_url?: string;
    transport?: string;
    override_scan?: boolean;
    confirm_prompt_review?: boolean;
  },
): Promise<{ id: string; status: string }> {
  return request<{ id: string; status: string }>(`/submissions/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ admin_id, ...extra }),
  });
}

// 上传 Skill 制品（.tar.gz）到平台后端 ObjectStore，返回内部存储 key（artifact_key）。
// 平台存盘后生成 key，提交时写入 meta.artifact_key；下载由平台直接流式服务字节。
// P0-2：后端 /upload 已加身份门 —— 本函数跑在 Next 服务端，携带内部令牌通过。
export async function uploadArtifact(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const res = await fetch(
    `${BASE}/upload?name=${encodeURIComponent(file.name)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
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
  const data = (await res.json()) as { key: string; sha256?: string };
  return data.key;
}

// 上传 MCP 镜像 tar 包（来自 docker save）到平台后端，返回内部 key（artifact_key）。
// 后端流式落盘并做体积上限 / sha256 / 结构校验，审批后由平台 docker load 直接运行，
// 不强制推回内网 registry。体积过大时后端返回 413，需改用 ghcr 地址提交。
export async function uploadTarArtifact(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const res = await fetch(
    `${BASE}/upload/tar?name=${encodeURIComponent(file.name)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "x-internal-proxy":
          process.env.INTERNAL_PROXY_TOKEN || "thv-internal-proxy",
      },
      body: buf,
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`镜像包上传失败: ${res.status} ${text}`);
  }
  const data = (await res.json()) as {
    key: string;
    sha256?: string;
    size?: number;
  };
  return data.key;
}

export interface Favorite {
  id: string;
  user_id: string;
  item_type: string;
  item_ref: string;
  created_at: string;
}

export async function listFavorites(userId?: string): Promise<Favorite[]> {
  const q = userId ? `?user_id=${encodeURIComponent(userId)}` : "";
  return request<Favorite[]>(`/favorites${q}`);
}

export async function createFavorite(input: {
  user_id: string;
  item_type: string;
  item_ref: string;
}): Promise<{ id: string }> {
  return request<{ id: string }>("/favorites", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function removeFavorite(input: {
  user_id: string;
  item_type: string;
  item_ref: string;
}): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>("/favorites", {
    method: "DELETE",
    body: JSON.stringify(input),
  });
}

export interface TopMetric {
  item_type: string;
  item_ref: string;
  event: string;
  cnt: number;
}

export async function getTopStats(): Promise<TopMetric[]> {
  return request<TopMetric[]>("/stats/top");
}

// 统计明细（全量分组，按 mcp/skill 拆分用）
export async function getStatsDetail(): Promise<TopMetric[]> {
  return request<TopMetric[]>("/stats/detail");
}

// 收藏计数（按 item_type 聚合，返回 {item_ref: count}）
export async function getFavoriteCounts(
  item_type: string,
): Promise<Record<string, number>> {
  return request<Record<string, number>>(
    `/favorites/counts?item_type=${encodeURIComponent(item_type)}`,
  );
}

export async function reportMetric(input: {
  item_type: string;
  item_ref: string;
  event: string;
  actor_id?: string;
}): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>("/metrics", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export interface Skill {
  id: string;
  item_ref: string;
  name: string;
  description: string;
  download_url: string;
  owner: string;
  download_count: number;
  created_at: string;
  group_key?: string;
  version?: string;
  registry_synced?: string;
  registry_name?: string;
  // GitHub 式详情页字段
  repository_url?: string;
  skill_readme?: string | null;
  skill_readme_name?: string | null;
  skill_tree?: string[];
  skill_file_count?: number;
}

// 已审批技能列表（供 /skills 浏览页）
export async function getSkills(): Promise<Skill[]> {
  return request<Skill[]>("/skills");
}

// 单个已审批 Skill 详情（按 submission id，供技能详情页/卡片版本切换）
export async function getSkillById(id: string): Promise<Skill> {
  return request<Skill>(`/skills/${encodeURIComponent(id)}`);
}

export interface McpServer {
  id: string;
  item_ref: string;
  name: string;
  description: string;
  payload_ref: string;
  owner: string;
  call_count: number;
  favorite_count: number;
  created_at: string;
  // 运行实例的 MCP 端点，以及是否在线
  endpoint?: string;
  // 终端用户可达的对外端点（endpoint 是 127.0.0.1，跨机不可用）；
  // 供「复制配置」按钮生成客户端配置。只有探活可达时后端才会给出该字段，
  // 否则即便容器记录还在（deploy_status=deployed 但容器已删）也不给，避免复制出连不通的配置。
  public_endpoint?: string;
  // restricted 条目的代理调用凭证（Authorization Header 形态，token 不再拼在 URL 上）
  mcp_headers?: Record<string, string>;
  // 端点真实探活结果（true=可达 / false=有记录但连不通 / undefined=未部署或未探测）
  healthy?: boolean;
  transport?: string;
  live?: boolean;
  // P3：ToolHive 自动部署后的运行态
  deploy_status?: string; // unborn | deploying | deployed | failed | undeployed
  deploy_error?: string;
  workload_name?: string;
  image_ref?: string;
  // P7：多版本管理
  group_key?: string;
  version?: string;
  registry_synced?: string;
  registry_name?: string;
  // GitHub 式详情页字段
  repository_url?: string;
  mcp_labels?: Record<string, string> | null;
  mcp_inspect?: McpImageInspect | null;
  // 源码包内提取的 README（审批/详情懒回填时提取，仅 /mcp/:id 详情返回）
  mcp_readme?: string | null;
  mcp_readme_name?: string | null;
  // 源码包内文件树（相对路径列表，最多 2000 条，仅 /mcp/:id 详情返回）
  mcp_tree?: string[] | null;
  mcp_file_count?: number | null;
}

// MCP 镜像提取到的 Config 元数据（来自 docker inspect，已脱敏）
// 安全约定：后端不返回 env（镜像 ENV 常内置密钥）；entrypoint/cmd/labels 敏感值已掩码
export interface McpImageInspect {
  labels?: Record<string, string> | null;
  entrypoint?: string[] | null;
  cmd?: string[] | null;
  exposed_ports?: string[] | null;
  working_dir?: string | null;
}

// 已审批 MCP 列表（供 /catalog 浏览页，未审批不出现）
export async function getMcpServers(): Promise<McpServer[]> {
  return request<McpServer[]>("/mcp");
}

// 单个已审批 MCP 详情（供 /mcp/[ref] 详情页）
export async function getMcpById(id: string): Promise<McpServer> {
  return request<McpServer>(`/mcp/${encodeURIComponent(id)}`);
}

// 源码包单文件内容预览（敏感文件/二进制/超大文件后端会拒绝并返回 error）
export async function getMcpFile(
  id: string,
  path: string,
): Promise<{ path: string; content: string; size: number }> {
  return request(
    `/mcp/${encodeURIComponent(id)}/file?path=${encodeURIComponent(path)}`,
  );
}

// Skill 源码包单文件内容预览（与 MCP 同一套后端安全约束）
export async function getSkillFile(
  id: string,
  path: string,
): Promise<{ path: string; content: string; size: number }> {
  return request(
    `/skills/${encodeURIComponent(id)}/file?path=${encodeURIComponent(path)}`,
  );
}

// 真实 tools/list：后端连运行中实例取回真实能力清单（无实例/失败返回 {tools:[],live:false}）
export async function getMcpTools(
  id: string,
): Promise<{ tools: ServerTool[]; live: boolean; failed?: boolean }> {
  return request<{ tools: ServerTool[]; live: boolean }>(
    `/mcp/${encodeURIComponent(id)}/tools`,
  );
}

// P3：触发/取消 ToolHive 部署（仅 MCP）
export async function deployMcp(
  id: string,
): Promise<{ id: string; deploy_status: string }> {
  return request<{ id: string; deploy_status: string }>(
    `/submissions/${id}/deploy`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
}

export async function undeployMcp(
  id: string,
): Promise<{ id: string; deploy_status: string }> {
  return request<{ id: string; deploy_status: string }>(
    `/submissions/${id}/undeploy`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
}

// 重新同步到 Registry Server（同步失败后重试 / 补发布）
export async function syncRegistry(
  id: string,
): Promise<{ id: string; ok: boolean }> {
  return request<{ id: string; ok: boolean }>(`/submissions/${id}/sync`, {
    method: "POST",
  });
}

// 某产品组下的所有版本（2026-09-08：激活指针已废弃，响应不再含 active/active_submission_id）
export interface GroupVersion {
  id: string;
  payload_ref: string;
  version: string;
  name: string;
  endpoint?: string;
  download_url?: string;
  deploy_status?: string;
  registry_synced?: string;
  on_shelf?: boolean;
  created_at: string;
}

export async function listGroupVersions(group_key: string): Promise<{
  group_key: string;
  versions: GroupVersion[];
}> {
  return request<{
    group_key: string;
    versions: GroupVersion[];
  }>(`/groups/${encodeURIComponent(group_key)}/versions`);
}

// 下载指定版本的 Skill（旧版本仍可被引用）
export async function downloadSkillVersion(
  group_key: string,
  version: string,
): Promise<{
  id: string;
  group_key: string;
  version: string;
  download_url: string;
}> {
  return request<{
    id: string;
    group_key: string;
    version: string;
    download_url: string;
  }>(
    `/skills/${encodeURIComponent(group_key)}/${encodeURIComponent(version)}/download`,
  );
}

// 按 item_type+event 批量取计数，返回 {item_ref: count}
export async function getItemCounts(
  item_type: string,
  event: string,
): Promise<Record<string, number>> {
  return request<Record<string, number>>(
    `/stats/counts?item_type=${encodeURIComponent(item_type)}&event=${encodeURIComponent(event)}`,
  );
}

// 计数是全局统计（无用户维度）且业务上允许秒级陈旧：
// 目录页每次搜索/翻页都会重渲染，30s 内存缓存避免反复打后端。
let countsCache: {
  at: number;
  key: string;
  data: Record<string, number>;
} | null = null;
export async function getItemCountsCached(
  item_type: string,
  event: string,
): Promise<Record<string, number>> {
  const key = `${item_type}:${event}`;
  if (
    countsCache &&
    countsCache.key === key &&
    Date.now() - countsCache.at < 30_000
  ) {
    return countsCache.data;
  }
  const data = await getItemCounts(item_type, event);
  countsCache = { at: Date.now(), key, data };
  return data;
}

// 近 N 天逐日事件序列（call/download），供趋势图
export interface TrendSeries {
  item_type: string;
  item_ref: string;
  event: string;
  data: number[];
}
export async function getTrend(
  days = 30,
): Promise<{ days: string[]; series: TrendSeries[] }> {
  return request<{ days: string[]; series: TrendSeries[] }>(
    `/stats/trend?days=${days}`,
  );
}

// 每个 (item_type,item_ref,event) 的去重用户数（近 N 天），供留存/唯一用户
export async function getUniqueUsers(
  days = 30,
): Promise<
  { item_type: string; item_ref: string; event: string; u: number }[]
> {
  return request<
    { item_type: string; item_ref: string; event: string; u: number }[]
  >(`/stats/unique?days=${days}`);
}

// 平台自建反馈 / Issues（MCP 与 Skill 共用）
export interface Issue {
  id: string;
  target_type: string;
  target_ref: string;
  author: string;
  title: string;
  body: string;
  status: string; // open | answered | closed
  created_at: string;
  reply?: string;
  replied_at?: string;
  reply_by?: string;
}

// 查询某 MCP/Skill 的反馈列表（target_ref 用 OCI 引用或 submission id）
export async function getIssues(
  targetType?: string,
  targetRef?: string,
): Promise<Issue[]> {
  const q = new URLSearchParams();
  if (targetType) q.set("target_type", targetType);
  if (targetRef) q.set("target_ref", targetRef);
  const qs = q.toString();
  return request<Issue[]>(`/issues${qs ? `?${qs}` : ""}`);
}

export async function createIssue(input: {
  target_type: string;
  target_ref: string;
  author?: string;
  title: string;
  body: string;
}): Promise<{ id: string; status: string }> {
  return request<{ id: string; status: string }>("/issues", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function replyIssue(
  id: string,
  input: { reply?: string; status?: string; reply_by?: string },
): Promise<{ id: string; status: string }> {
  return request<{ id: string; status: string }>(`/issues/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

// 删除反馈（仅管理员，兜底操作；后端 403 非管理员）
export async function deleteIssue(
  id: string,
): Promise<{ ok: boolean; id: string }> {
  return request<{ ok: boolean; id: string }>(`/issues/${id}`, {
    method: "DELETE",
  });
}
