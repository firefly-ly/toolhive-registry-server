/**
 * user_profile 表：SSO 登录时落库的员工部门/岗位快照。
 *
 * 为什么需要：Better Auth 不把登录时的 roles/groups 持久化到 user 表，
 * 平台在会话解析时从 DB 的 token 回读 claims（utils.getUserClaimsFromDatabase）——
 * 但公司 SSO 的 access_token 是不透明串（非 JWT），回读解析不出，
 * 导致 SSO 用户 groups 恒为空，部门/岗位级可见性永远匹配不上。
 *
 * 方案：登录时把 SSO profile 的 user_detail_info 落到本表；会话解析时
 * 优先查这里（见 context.ts），无记录再回退原 token 回读逻辑。
 * 主键用合成邮箱（<工号>@<SSO_EMAIL_DOMAIN>）：登录回调阶段 Better Auth
 * userId 尚未生成，而 email 在两个时机都稳定可得。
 * 不碰 Better Auth 自身的表结构（动它有破坏登录的风险）。
 *
 * 故障纪律（务必保持）：本表属"锦上添花"旁路——建表/写/读失败一律
 * catch 后退回原逻辑并只记日志。最坏退化 = groups 为空（改动前的现状），
 * 绝不阻断登录，绝不影响会话解析。任何重构不得移除这些 try/catch。
 */

import { pool } from "./db";

let tableReady = false;

/** 幂等建表；失败只记日志返回 false（调用方据此跳过读写，不抛错） */
async function ensureTable(): Promise<boolean> {
  if (tableReady) return true;
  if (!pool) return false;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_profile (
        email TEXT PRIMARY KEY,
        orgs JSONB NOT NULL DEFAULT '[]'::jsonb,
        jobs JSONB NOT NULL DEFAULT '[]'::jsonb,
        user_types JSONB NOT NULL DEFAULT '[]'::jsonb,
        raw JSONB,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    tableReady = true;
    return true;
  } catch (error) {
    console.error("[user-profile] 建表失败（不阻断登录）:", error);
    return false;
  }
}

/**
 * 登录时落库/更新员工 SSO profile 快照（upsert）。
 * detail 为 SSO profile 的 user_detail_info 原始对象（形态未定死，原样存 raw）。
 * 失败只记日志——绝不让落库异常沿调用栈上抛打断登录流程。
 */
export async function saveUserProfileByEmail(
  email: string,
  detail: Record<string, unknown>,
): Promise<void> {
  if (!(await ensureTable())) return;
  try {
      await pool!.query(
        `INSERT INTO user_profile (email, orgs, jobs, user_types, raw, updated_at)
         VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb, NOW())
         ON CONFLICT (email) DO UPDATE SET
           -- 防覆盖：SSO profile 当前不下发组织数据（detail 为空对象），
           -- 登录 upsert 若无条件覆盖，会把 IDM 同步写入的部门/岗位抹掉。
           -- 因此新值为空时保留旧值，非空才更新——两个数据源互不踩踏。
           orgs = CASE WHEN EXCLUDED.orgs = '[]'::jsonb
                       THEN user_profile.orgs ELSE EXCLUDED.orgs END,
           jobs = CASE WHEN EXCLUDED.jobs = '[]'::jsonb
                       THEN user_profile.jobs ELSE EXCLUDED.jobs END,
           user_types = CASE WHEN EXCLUDED.user_types = '[]'::jsonb
                       THEN user_profile.user_types ELSE EXCLUDED.user_types END,
           raw = CASE WHEN EXCLUDED.raw = '{}'::jsonb
                       THEN user_profile.raw ELSE EXCLUDED.raw END,
           updated_at = NOW()`,
      [
        email,
        JSON.stringify(detail.orgs ?? []),
        JSON.stringify(detail.jobs ?? []),
        JSON.stringify(detail.userTypes ?? []),
        JSON.stringify(detail),
      ],
    );
  } catch (error) {
    console.error(
      "[user-profile] 落库失败（登录不受影响，下次登录自动重试）:",
      error,
    );
  }
}

/**
 * 会话解析时读取员工 profile 原始值。表无该用户记录时返回 null（调用方
 * 回退原 token 回读逻辑）；查询异常同样返回 null——失败模式恒为"回到现状"。
 * 注意：orgs/jobs/userTypes 原样返回（SSO 字段形态未定死，可能是字符串
 * 数组/对象数组/逗号串），归一化由调用方用 claimAsStringArray 统一处理，
 * 避免在本模块对未知形态做错误假设。
 */
export async function getUserProfileRaw(
  email: string,
): Promise<{
  orgs: unknown;
  jobs: unknown;
  userTypes: unknown;
} | null> {
  if (!email || !(await ensureTable())) return null;
  try {
    const result = await pool!.query<{
      orgs: unknown;
      jobs: unknown;
      user_types: unknown;
    }>(`SELECT orgs, jobs, user_types FROM user_profile WHERE email = $1`, [
      email,
    ]);
    if (result.rows.length === 0) return null;
    return {
      orgs: result.rows[0].orgs,
      jobs: result.rows[0].jobs,
      userTypes: result.rows[0].user_types,
    };
  } catch (error) {
    console.error("[user-profile] 读取失败（回退 token 回读）:", error);
    return null;
  }
}
