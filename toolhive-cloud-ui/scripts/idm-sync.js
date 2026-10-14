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
 *     url:          {真实目标地址，如 https://iam.dongpeng.net/esc-idm/api/v1/public/account/list}
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
  // 真实目标地址（经接口中台转发的 url header）。文档 5.2.1：account/org/job 各有
  // 独立 list 路径（+各自 callback）。旧版曾误用单端点 appSync，已按文档改正；
  // 可用 IDM_ACCOUNT_URL / IDM_ORG_URL / IDM_JOB_URL 覆盖。
  accountUrl: process.env.IDM_ACCOUNT_URL || "",
  orgUrl: process.env.IDM_ORG_URL || "",
  jobUrl: process.env.IDM_JOB_URL || "",
  // 增量时间戳（秒）：文档三接口均为"查询增量数据"。缺省不给 = 全量。
  since: process.env.IDM_SINCE || "",
};

const IDM_PUBLIC_BASE = process.env.IDM_BASE_URL || "https://iam.dongpeng.net/esc-idm/api/v1/public";
const DEFAULT_TARGETS = {
  account: `${IDM_PUBLIC_BASE}/account/list`,
  org: `${IDM_PUBLIC_BASE}/org/list`,
  job: `${IDM_PUBLIC_BASE}/job/list`,
};

function targetFor(kind) {
  const byKind =
    kind === "account" ? CONFIG.accountUrl : kind === "org" ? CONFIG.orgUrl : CONFIG.jobUrl;
  return byKind || DEFAULT_TARGETS[kind];
}

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

// JWT 签发逻辑已抽至 scripts/idm-jwt.js（纯参数化 + now 可注入，可单测），语义零改动。
// b64url 仍被 showToken（token 自检打印）使用，一并从该模块引入。
const { makeAuthToken: buildAuthToken, b64url } = require("./idm-jwt");

function makeAuthToken() {
  return buildAuthToken({
    appId: CONFIG.appId,
    appSecret: CONFIG.appSecret,
    authToken: CONFIG.authToken,
    tokenScheme: CONFIG.tokenScheme,
    // IDM_TOKEN_EXP=1 时附带 exp 声明（iat+300s）——部分校验端强制要求过期时间
    withExp: process.env.IDM_TOKEN_EXP === "1",
  });
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
  const targetUrl = targetFor(kind);
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
 * 字段映射——按《权限平台接口文档》5.2.x 的真实字段名实现（此前为占位猜测）：
 *   account: app_account__account_no(登录名) / idt_user__work_no(工号) /
 *            app_account__status(0停用 1正常) / idt_org__org_code / idt_job__code /
 *            idt_user_type__code(IN=内部员工 EX_TAB2=经销商 EX_TAB1=供应商)
 *   org:     idt_org__org_code / idt_org__name / idt_org__sup_org_code / idt_org__status
 *   job:     idt_job__code / idt_job__name / idt_job__status
 * 取值带无前缀短名兜底（防文档与实际部署的键名出入，probe 时最终确认）。
 * TODO(callback)：文档要求同步后调 account/org/job 的 callback 回报状态，暂未实现。
 * TODO(层级)：idt_org__sup_org_code 父链展开未做——restricted.groups 目前按直属部门名匹配。
 */
function pick(row, prefixed, fallbacks = []) {
  for (const k of [prefixed, ...fallbacks]) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== "") return row[k];
  }
  return undefined;
}

/** 账号 status 归一："1"=正常；"0"停用、"-1"删除、2=删除(操作标识) 视为非在职 */
function isAccountActive(row) {
  return String(pick(row, "app_account__status", ["status"]) ?? "1") === "1";
}

function mapAccount(row) {
  // 合成邮箱主键 = <工号>@dongpeng.net，与 SSO profile 的 id（工号形态）对齐：
  // 优先 work_no，回退 account_no（两者通常一致，probe 时最终确认）。
  const id = String(
    pick(row, "idt_user__work_no", ["work_no", "app_account__account_no", "accountNo", "id"]) ?? "",
  );
  const orgCode = pick(row, "idt_org__org_code", ["org_code", "orgId"]);
  const jobCode = pick(row, "idt_job__code", ["job_code", "jobId"]);
  const userType = pick(row, "idt_user_type__code", ["user_type", "userTypes"]);
  return {
    id,
    active: isAccountActive(row),
    orgIds: orgCode !== undefined ? [String(orgCode)] : [],
    jobIds: jobCode !== undefined ? [String(jobCode)] : [],
    userTypes: userType !== undefined ? [String(userType)] : [],
  };
}
function mapOrg(row) {
  return {
    orgId: String(pick(row, "idt_org__org_code", ["org_code", "orgId"]) ?? ""),
    orgName: String(pick(row, "idt_org__name", ["name", "orgName"]) ?? ""),
    active: String(pick(row, "idt_org__status", ["status"]) ?? "1") === "1",
  };
}
function mapJob(row) {
  return {
    jobId: String(pick(row, "idt_job__code", ["code", "jobId"]) ?? ""),
    jobName: String(pick(row, "idt_job__name", ["name", "jobName"]) ?? ""),
    active: String(pick(row, "idt_job__status", ["status"]) ?? "1") === "1",
  };
}

async function fetchAllPages(targetUrl, mapRow) {
  const rows = [];
  let page = 1;
  const size = 200;
  for (;;) {
    const params = { page, size };
    if (CONFIG.since) params.time = CONFIG.since; // 文档：增量查询时间戳（秒）
    const data = await fetchViaGateway(targetUrl, params);
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
    const orgs = (await fetchAllPages(CONFIG.orgUrl || targetFor("org"), mapOrg)).filter(
      (o) => o.orgId && o.active,
    );
    const orgNameById = new Map(orgs.map((o) => [o.orgId, o.orgName]));
    console.error(`[idm-sync] org 共 ${orgs.length} 条（已过滤停用/删除）`);

    console.error("[idm-sync] 拉取 job...");
    const jobs = (await fetchAllPages(CONFIG.jobUrl || targetFor("job"), mapJob)).filter(
      (j) => j.jobId && j.active,
    );
    const jobNameById = new Map(jobs.map((j) => [j.jobId, j.jobName]));
    console.error(`[idm-sync] job 共 ${jobs.length} 条（已过滤停用/删除）`);

    console.error("[idm-sync] 拉取 account...");
    const accounts = await fetchAllPages(CONFIG.accountUrl || targetFor("account"), mapAccount);
    console.error(`[idm-sync] account 共 ${accounts.length} 条`);

    let upserted = 0;
    let removed = 0;
    for (const acc of accounts) {
      if (!acc.id) continue;
      const email = `${acc.id}@${process.env.SSO_EMAIL_DOMAIN || "dongpeng.net"}`;
      // 安全省界：停用(status=0)/删除(status=-1 或操作标识 2) 的账号不得残留可见性数据
      if (!acc.active) {
        await client.query("DELETE FROM user_profile WHERE email = $1", [email]);
        removed += 1;
        continue;
      }
      const orgNames = acc.orgIds.map((id) => orgNameById.get(id)).filter(Boolean);
      const jobNames = acc.jobIds.map((id) => jobNameById.get(id)).filter(Boolean);
      if (!orgNames.length && !jobNames.length) {
        // 停用的组织/岗位被过滤后无有效映射：不清空（避免误伤），但也不写入新数据
        console.error(`[idm-sync] 跳过 ${email}：org/job 无有效映射`);
        continue;
      }
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
    console.error(`[idm-sync] 完成: upsert ${upserted} 条，清理停用/删除 ${removed} 条`);
  } finally {
    await client.end();
  }
}

// ---------- token 自检：打印签出 JWT 的 header/payload（不含签名，可安全贴出） ----------

function showToken() {
  requireConfig();
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({
      iss: CONFIG.appId,
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomUUID(),
    }),
  );
  const decode = (s) => Buffer.from(s, "base64").toString();
  console.log("header :", decode(header));
  console.log("payload:", decode(payload));
  console.log("secret 来源:", CONFIG.authToken ? "IDM_AUTH_TOKEN(现成)" : `IDM_APP_SECRET(自签, 长度=${CONFIG.appSecret.length})`);
  console.log("scheme :", CONFIG.tokenScheme);
}

// ---------- direct 模式：绕过接口中台直连 IDM——用于区分"网关剥头"与"凭证/签名错" ----------

async function probeDirect(kind = "account", page = 1, size = 3) {
  requireConfig();
  const jwt = makeAuthToken();
  const targetUrl = targetFor(kind);
  const url = new URL(targetUrl);
  url.searchParams.set("page", String(page));
  url.searchParams.set("size", String(size));
  console.error(`[idm-sync] direct ${kind} → ${url.toString()}（不经接口中台）`);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: jwt,
      AuthToken: jwt,
    },
    body: JSON.stringify({}),
  });
  const text = await response.text();
  console.log(`HTTP ${response.status}: ${text}`);
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
    } else if (cmd === "token") {
      showToken();
    } else if (cmd === "direct") {
      await probeDirect(kind || "account", Number(a1) || 1, Number(a2) || 3);
    } else {
      console.error("用法: node scripts/idm-sync.js probe account|org|job [page] [size] | sync | token | direct [kind] [page] [size]");
      process.exit(1);
    }
  } catch (error) {
    console.error(`[idm-sync] 失败: ${error.message}`);
    process.exit(1);
  }
})();
