import Image from "next/image";
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

export default function SignInPage() {
  return (
    <div className="relative flex h-screen w-full bg-nav-background md:bg-transparent">
      {/* Background pattern — visible on mobile full-screen, on desktop only left panel */}
      <Image
        src="/bg-pattern.png"
        alt=""
        fill
        sizes="100vw"
        className="pointer-events-none select-none object-fill md:hidden"
      />

      {/* Left panel — desktop only */}
      <div className="relative hidden md:flex w-1/2 bg-nav-background items-start p-10 overflow-hidden border-r border-border">
        <Image
          src="/bg-pattern.png"
          alt=""
          fill
          sizes="50vw"
          className="pointer-events-none select-none object-fill"
        />
        <Image
          src="/toolhive-logo.svg"
          alt="ToolHive"
          width={251}
          height={53}
          className="relative z-10"
          loading="eager"
          fetchPriority="high"
        />
      </div>

      {/* Sign-in form — mobile: over teal bg, desktop: white panel */}
      <div className="relative z-10 flex w-full md:w-1/2 flex-col items-center justify-center p-8 md:bg-background">
        {/* Mobile logo */}
        <Image
          src="/toolhive-logo.svg"
          alt="ToolHive"
          width={251}
          height={53}
          className="absolute top-10 left-10 md:hidden"
          loading="eager"
          fetchPriority="high"
        />

        <div className="flex flex-col items-center space-y-6 w-full max-w-[350px]">
          <div className="flex flex-col items-center space-y-2 text-center">
            <h2 className="font-serif text-5xl font-light tracking-tight text-white md:text-foreground">
              登录
            </h2>
            <p className="text-sm text-white/70 md:text-muted-foreground">
              使用企业账号登录
            </p>
          </div>

          {/* 公司 SSO 主入口（灰度）——环境变量配置齐备才渲染 */}
          {SSO_ENABLED && (
            <div className="w-full space-y-2">
              <SignInButton
                providerId={SSO_PROVIDER_ID}
                label="公司 SSO 登录"
              />
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                或
                <span className="h-px flex-1 bg-border" />
              </div>
            </div>
          )}
          {/* Casdoor 过渡入口，SSO 灰度稳定后下线 */}
          <SignInButton providerId={OIDC_PROVIDER_ID} label="登录" />
        </div>
      </div>
    </div>
  );
}
