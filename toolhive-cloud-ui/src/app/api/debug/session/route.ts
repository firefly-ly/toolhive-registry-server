import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getAuthContext } from "@/lib/auth/context";

// 调试用：返回当前登录会话在平台侧能拿到的全部身份字段。
// 用于确认 Casdoor 是否下发了 groups / roles 声明（组权限匹配依赖它）。
// 仅在非生产环境暴露，且只返回调用者自己的会话信息。
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not available" }, { status: 404 });
  }
  let sessionUser: unknown = null;
  try {
    const session = await auth.api.getSession({
      headers: await (await import("next/headers")).headers(),
    });
    sessionUser = session?.user ?? null;
  } catch (e) {
    sessionUser = { error: String(e) };
  }
  const ctx = await getAuthContext();
  return NextResponse.json({
    session_user: sessionUser,
    parsed: {
      email: ctx.user?.email ?? null,
      roles: ctx.roles,
      groups: ctx.groups,
      isAdmin: ctx.isAdmin,
    },
    hint:
      (ctx.groups?.length ?? 0) > 0
        ? "groups 已获取，组名可见范围可用。"
        : "groups 为空：需在 Casdoor 配置用户组并确保 OIDC 下发 groups 声明，且 OIDC_SCOPES 含 groups。当前可先用邮箱（成员）方式验证权限。",
  });
}
