#!/usr/bin/env node
/**
 * IDM 组织/账号/岗位同步 → user_profile 表
 *
 * 背景：公司 SSO 的 profile 接口不下发 user_detail_info（部门/岗位/用户类型），
 * 部门级可见性拿不到数据。改走 IAM 通用接口（接口中台）主动拉取 IDM 的
 * account/list + org/list + job/list，按工号关联后 upsert 进 auth 库的
 * user_profile 表——读路径（context.ts → getUserProfileRaw）复用，零改动。
 *
 * 调用链路（接口中台封装）：
 *   POST {IAM_GATEWAY_URL}          （默认 https://dmp.dongpeng.net/v1/api/iam/general）
 *   headers:
 *     X-HW-ID:      {X_HW_ID}
 *     X-HW-AppKey:  {X_HW_APPKEY}
 *     url:          {真实目标地址，如 https://iam.dongpeng.net/esc-idm/api/v1/public/appSync...}
 *     AuthToken:    自签 JWT（{iss:AppID, iat:now, jti:uuid}，HMAC256(AppSecret)）
 *   params: page / size / time（增量时间戳，秒）
 *
 * 用法：
 *   node scripts/idm-sync.js probe account|org|job [page] [size]
 *       拉一页原始 JSON 打到 stdout——首次接入必跑，用于确认字段结构；
 *   node scripts/idm-sync.js sync
 *       全量拉取并 upsert 进 user_profile（字段映射确认后启用）。
 *
 * 凭据全部走环境变量 / .env.local，绝不写入代码或日志。
 * 故障纪律：本脚本独立于登录链路，失败只影响同步，绝不影响平台其他功能。
 */

"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ---------- 配置加载（.env.local + 进程环境变量，后者优先） ----------

function loadEnvLocal() {
  const candidates = [
    path.join(__dirname, "..", ".env.local"),
    path.join(__dirname, "..", ".env"),
  ];
  for (const file of candidates) {
    try {
      const text = fs.readFileSync(file, "utf8");
      for (const line of text.split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!m) continue;
        let value = m[2];
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (!(m[1] in process.env)) process.env[m[1]] = value;
      }
    } catch {
      /* 文件不存在则跳过 */
    }
  }
}

loadEnvLocal();

const CONFIG = {
  databaseUrl: process.env.DATABASE_URL || "",
  gatewayUrl: process.env.IAM_GATEWAY_URL || "https://dmp.dongpeng.net/v1/api/iam/general",
  hwId: process.env.X_HW_ID || "",
  hwAppKey: process.env.X_HW_APPKEY || "",
  // 华为 APIG 简易认证：X-HW-AppKey = HMAC-SHA256(AppSecret, X-HW-ID) hex。
  // 若拿到的是裸 AppSecret，填 X_HW_APP_SECRET，脚本代算签名。
  hwAppSecret: process.env.X_HW_APP_SECRET || "",
  // AuthToken = 自签 JWT：{iss: AppID, iat: now, jti: uuid}，HMAC256(AppSecret)。
  // 二选一：直接给现成 token（IDM_AUTH_TOKEN），或给签发材料（IDM_APP_ID/IDM_APP_SECRET）。
  authToken: process.env.IDM_AUTH_TOKEN || "",
  appId: process.env.IDM_APP_ID || "",
  appSecret: process.env.IDM_APP_SECRET || "",
  // JWT 前缀形态：bearer（默认，"Bearer x.y.z"）或 raw（裸 token）——文档对
  // header 名（AuthToken vs Authorization）与前缀的描述存在歧义，两头都发。
  tokenScheme: process.env.IDM_TOKEN_SCHEME || "bearer",
  // 真实目标地址（经接口中台转发的 url header）。生产实锤：单端点裸 appSync，
  // 三类数据共用；IDM 按 body/params 区分类型。
  accountUrl: process.env.IDM_ACCOUNT_URL || "",
  orgUrl: process.env.IDM_ORG_URL || "",
  jobUrl: process.env.IDM_JOB_URL || "",
};

const APPSYNC_BASE = process.env.IDM_APPSYNC_BASE_URL || "https://iam.dongpeng.net/esc-idm/api/v1/public/appSync";

function requireConfig() {
  const missing = [];
  if (!CONFIG.databaseUrl) missing.push("DATABASE_URL");
  if (!CONFIG.hwId) missing.push("X_HW_ID");
  // 网关凭证：现成 X-HW-AppKey 或 裸 AppSecret（代算签名）二选一
  if (!CONFIG.hwAppKey && !CONFIG.hwAppSecret) {
    missing.push("X_HW_APPKEY 或 X_HW_APP_SECRET");
  }
  // AuthToken：现成 token 或 签发材料（AppID+AppSecret）二选一
  if (!CONFIG.authToken && !(CONFIG.appId && CONFIG.appSecret)) {
    missing.push("IDM_AUTH_TOKEN 或 IDM_APP_ID+IDM_APP_SECRET");
  }
  if (missing.length) {
    console.error(`[idm-sync] 缺少配置: ${missing.join(", ")}（.env.local 或环境变量）`);
    process.exit(1);
  }
}

// ---------- AuthToken 生成（对齐官方 Java 示例的 JWT 结构） ----------
// Java: JWT.create().withIssuer(AppID).withIssuedAt(now).withJWTId(uuid)
//        .sign(Algorithm.HMAC256(AppSecret)) → "Bearer " + token

function b64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function makeAuthToken() {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({
      iss: CONFIG.appId,
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomUUID(),
    }),
  );
  const signature = b64url(
    crypto.createHmac("sha256", CONFIG.appSecret).update(`${header}.${payload}`).digest(),
  );
  const token = `${header}.${payload}.${signature}`;
  // IDM_AUTH_TOKEN 显式提供时按原文使用；否则自签后按 tokenScheme 加前缀
  const raw = CONFIG.authToken || token;
  if (CONFIG.tokenScheme === "raw") return raw.replace(/^Bearer\s+/i, "");
  return /^Bearer\s/i.test(raw) ? raw : `Bearer ${raw}`;
}

// ---------- 接口中台调用 ----------

/** 网关凭证头：优先现成 X_HW_APPKEY；否则按 APIG 简易认证代算 HMAC-SHA256(secret, id) */
function gatewayAppKeyHeader() {
  if (CONFIG.hwAppKey) return CONFIG.hwAppKey;
  return crypto.createHmac("sha256", CONFIG.hwAppSecret).update(CONFIG.hwId).digest("hex");
}

async function fetchViaGateway(targetUrl, params = {}) {
  const url = new URL(CONFIG.gatewayUrl);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }
  // JWT 同时放 AuthToken 和 Authorization（文档两处描述不一致，两头都发）
  const jwt = makeAuthToken();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-HW-ID": CONFIG.hwId,
      "X-HW-AppKey": gatewayAppKeyHeader(),
      url: targetUrl,
      AuthToken: jwt,
      Authorization: jwt,
    },
    body: JSON.stringify({}),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text.slice(0, 500)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`非 JSON 响应: ${text.slice(0, 500)}`);
  }
}

// ---------- probe 模式：拉一页原始数据，确认字段结构 ----------

async function probe(kind, page = 1, size = 5) {
  requireConfig();
  const targets = {
    account: CONFIG.accountUrl || APPSYNC_BASE,
    org: CONFIG.orgUrl || APPSYNC_BASE,
    job: CONFIG.jobUrl || APPSYNC_BASE,
  };
  const targetUrl = targets[kind];
  if (!targetUrl) {
    console.error(`[idm-sync] 未知类别: ${kind}（可选 account|org|job）`);
    process.exit(1);
  }
  console.error(`[idm-sync] probe ${kind}: page=${page} size=${size} → ${targetUrl}`);
  const data = await fetchViaGateway(targetUrl, { page, size });
  // 原样输出（stdout），便于贴回给开发分析字段结构
  console.log(JSON.stringify(data, null, 2));
}

// ---------- sync 模式：全量拉取 + upsert（字段映射确认后启用） ----------

/**
 * 字段映射收口点（待 probe 输出后最终确认）：
 *   mapAccount(row) → { id(工号), orgIds[], jobIds[], userTypes[] }
 *   mapOrg(row)     → { orgId, orgName }
 *   mapJob(row)     → { jobId, jobName }
 * 下面的实现是占位猜测，probe 确认前 sync 不应运行。
 */
function mapAccount(row) {
  return {
    id: String(row.accountNo ?? row.id ?? ""),
    orgIds: Array.isArray(row.orgIds) ? row.orgIds.map(String) : row.orgId ? [String(row.orgId)] : [],
    jobIds: Array.isArray(row.jobIds) ? row.jobIds.map(String) : row.jobId ? [String(row.jobId)] : [],
    userTypes: Array.isArray(row.userTypes) ? row.userTypes.map(String) : [],
  };
}
function mapOrg(row) {
  return { orgId: String(row.orgId ?? row.id ?? ""), orgName: String(row.orgName ?? row.name ?? "") };
}
function mapJob(row) {
  return { jobId: String(row.jobId ?? row.id ?? ""), jobName: String(row.jobName ?? row.name ?? "") };
}

async function fetchAllPages(targetUrl, mapRow) {
  const rows = [];
  let page = 1;
  const size = 200;
  for (;;) {
    const data = await fetchViaGateway(targetUrl, { page, size });
    // 分页结构同样待 probe 确认：兼容 {data:{list:[...]}} / {list:[...]} / 数组
    const list =
      (data && data.data && Array.isArray(data.data.list) && data.data.list) ||
      (Array.isArray(data && data.list) && data.list) ||
      (Array.isArray(data) ? data : null);
    if (!list) throw new Error(`无法识别的分页结构: ${JSON.stringify(data).slice(0, 300)}`);
    rows.push(...list.map(mapRow));
    if (list.length < size) break;
    page += 1;
  }
  return rows;
}

async function sync() {
  requireConfig();
  const { Client } = require("pg");
  const client = new Client({ connectionString: CONFIG.databaseUrl });
  await client.connect();
  try {
    console.error("[idm-sync] 拉取 org...");
    const orgs = await fetchAllPages(CONFIG.orgUrl || APPSYNC_BASE, mapOrg);
    const orgNameById = new Map(orgs.map((o) => [o.orgId, o.orgName]));
    console.error(`[idm-sync] org 共 ${orgs.length} 条`);

    console.error("[idm-sync] 拉取 job...");
    const jobs = await fetchAllPages(CONFIG.jobUrl || APPSYNC_BASE, mapJob);
    const jobNameById = new Map(jobs.map((j) => [j.jobId, j.jobName]));
    console.error(`[idm-sync] job 共 ${jobs.length} 条`);

    console.error("[idm-sync] 拉取 account...");
    const accounts = await fetchAllPages(CONFIG.accountUrl || APPSYNC_BASE, mapAccount);
    console.error(`[idm-sync] account 共 ${accounts.length} 条`);

    let upserted = 0;
    for (const acc of accounts) {
      if (!acc.id) continue;
      const email = `${acc.id}@${process.env.SSO_EMAIL_DOMAIN || "dongpeng.net"}`;
      const orgNames = acc.orgIds.map((id) => orgNameById.get(id)).filter(Boolean);
      const jobNames = acc.jobIds.map((id) => jobNameById.get(id)).filter(Boolean);
      await client.query(
        `INSERT INTO user_profile (email, orgs, jobs, user_types, raw, updated_at)
         VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb, NOW())
         ON CONFLICT (email) DO UPDATE SET
           orgs = CASE WHEN EXCLUDED.orgs = '[]'::jsonb
                       THEN user_profile.orgs ELSE EXCLUDED.orgs END,
           jobs = CASE WHEN EXCLUDED.jobs = '[]'::jsonb
                       THEN user_profile.jobs ELSE EXCLUDED.jobs END,
           user_types = CASE WHEN EXCLUDED.user_types = '[]'::jsonb
                       THEN user_profile.user_types ELSE EXCLUDED.user_types END,
           updated_at = NOW()`,
        [email, JSON.stringify(orgNames), JSON.stringify(jobNames), JSON.stringify(acc.userTypes), JSON.stringify({ source: "idm-sync" })],
      );
      upserted += 1;
    }
    console.error(`[idm-sync] 完成: upsert ${upserted} 条 user_profile`);
  } finally {
    await client.end();
  }
}

// ---------- 入口 ----------

(async () => {
  const [cmd, kind, a1, a2] = process.argv.slice(2);
  try {
    if (cmd === "probe") {
      if (!kind || !["account", "org", "job"].includes(kind)) {
        console.error("用法: node scripts/idm-sync.js probe account|org|job [page] [size]");
        process.exit(1);
      }
      await probe(kind, Number(a1) || 1, Number(a2) || 5);
    } else if (cmd === "sync") {
      await sync();
    } else {
      console.error("用法: node scripts/idm-sync.js probe account|org|job [page] [size] | sync");
      process.exit(1);
    }
  } catch (error) {
    console.error(`[idm-sync] 失败: ${error.message}`);
    process.exit(1);
  }
})();
