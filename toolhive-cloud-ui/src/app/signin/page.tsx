import { BrandMark } from "@/components/brand-mark";
import {
  OIDC_PROVIDER_ID,
  SSO_ENABLED,
  SSO_PROVIDER_ID,
} from "@/lib/auth/constants";
import { SignInButton } from "./signin-button";

// 强制动态渲染：SSO_ENABLED 来自运行时环境变量（systemd EnvironmentFile），
// 若静态预渲染会在 build 时固化——构建环境没有 SSO_* 变量会导致
// 服务器上永远不出现"公司 SSO 登录"按钮。
export const dynamic = "force-dynamic";

/**
 * 登录页（包豪斯版）：左 = 结构黑品牌面（三件套几何标 + 大字品牌 +
 * 漂移几何装饰），右 = 白纸登录卡。--nav-background 已换黑，白字/彩标直接可用。
 */
export default function SignInPage() {
  return (
    <div className="flex h-screen w-full flex-col md:flex-row">
      {/* 左品牌面：desktop only */}
      <div className="bg-nav-background relative hidden overflow-hidden md:flex md:w-1/2 md:flex-col md:items-start md:justify-center md:p-14">
        {/* 漂移几何装饰：外环 + 四分之一圆角块 */}
        <span
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full border-2 border-white/10"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute right-16 bottom-14 size-14 rounded-tl-full bg-info/80"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-32 right-40 size-9 rounded-full bg-primary/70"
        />
        <BrandMark className="relative z-10 h-7" />
        <h1 className="relative z-10 mt-10 text-5xl font-semibold leading-tight tracking-wide text-white">
          能力
          <br />
          中枢
        </h1>
        <p className="relative z-10 mt-5 max-w-sm text-sm leading-8 text-white/60">
          工具与技能，一站中枢。
          <br />
          MCP 服务与 Skill 技能，经安全扫描与审批上架，按权限使用。
        </p>
      </div>

      {/* 右登录卡：mobile 全屏 + desktop 白纸 */}
      <div className="bg-card relative z-10 flex w-full flex-1 flex-col items-center justify-center p-8">
        {/* 移动端品牌位（左品牌面 md 以下不渲染） */}
        <div className="absolute top-10 left-10 flex items-center md:hidden">
          <BrandMark className="h-5" />
          <span className="ml-2.5 text-[19px] font-semibold tracking-wide">
            能力中枢
          </span>
        </div>

        <div className="flex w-full max-w-[350px] flex-col items-center space-y-6">
          <div className="flex flex-col items-center space-y-2 text-center">
            <h2 className="text-page-title m-0 p-0">登录</h2>
            <p className="text-sm text-muted-foreground">使用企业账号登录</p>
          </div>

          {/* 公司 SSO 主入口（灰度）——环境变量配置齐备才渲染 */}
          {SSO_ENABLED && (
            <div className="w-full space-y-2">
              <SignInButton
                providerId={SSO_PROVIDER_ID}
                label="公司 SSO 登录"
              />
              <div className="text-muted-foreground flex items-center gap-3 text-xs">
                <span className="bg-border h-px flex-1" />
                或
                <span className="bg-border h-px flex-1" />
              </div>
            </div>
          )}
          {/* Casdoor 过渡入口，SSO 灰度稳定后下线 */}
          <SignInButton providerId={OIDC_PROVIDER_ID} label="登录" />
          <p className="text-muted-foreground/70 text-xs">
            内部平台 · 仅限授权访问
          </p>
        </div>
      </div>
    </div>
  );
}
