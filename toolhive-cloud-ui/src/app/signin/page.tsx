import { LifeBuoy, PackageCheck, Search, ShieldCheck, Zap } from "lucide-react";
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

// 左栏三条能力指引：一屏说清平台是什么，不堆术语
const FEATURES = [
  { icon: Search, title: "统一目录", desc: "MCP 与技能集中检索" },
  { icon: Zap, title: "一键调用", desc: "复制配置即接即用" },
  { icon: PackageCheck, title: "提交上架", desc: "审核通过自动发布" },
];

export default function SignInPage() {
  return (
    <div className="flex h-screen w-full bg-background">
      {/* 左栏（桌面）：深红品牌面板——白 logo + 一句话定位 + 三条能力指引 */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-nav-background p-10 md:flex">
        <Image
          src="/bg-pattern.png"
          alt=""
          fill
          sizes="50vw"
          className="pointer-events-none select-none object-cover"
          aria-hidden
        />
        <Image
          src="/toolhive-logo.svg"
          alt="ToolHive"
          width={200}
          height={42}
          className="relative z-10"
          loading="eager"
          fetchPriority="high"
        />

        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white">
            MCP 与技能
            <br />
            一站式管理
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/75">
            团队共用的 AI 能力平台：找到、接上、用起来。
          </p>
          <ul className="mt-10 space-y-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex items-center gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/12 ring-1 ring-white/15">
                  <Icon className="size-4.5 text-white/90" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-medium text-white/95">
                    {title}
                  </span>
                  <span className="block text-xs text-white/60">{desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 flex items-center gap-1.5 text-xs text-white/55">
          <ShieldCheck className="size-3.5" aria-hidden />
          内部平台 · 数据不出内网
        </p>
      </div>

      {/* 右栏：纸面表单。移动端仅保留表单（深红面板不参与小屏布局） */}
      <div className="relative z-10 flex w-full flex-col items-center justify-center bg-background p-8 md:w-1/2">
        <div className="flex w-full max-w-[360px] flex-col">
          {/* 移动端文字标（白色 SVG 在纸面上不可见，故小屏用文字标） */}
          <span className="text-xl font-semibold tracking-tight text-foreground md:hidden">
            ToolHive
          </span>

          <div className="mt-10 md:mt-0">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              登录
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              使用企业账号登录
            </p>
          </div>

          <div className="mt-8 space-y-3">
            {/* 公司 SSO 主入口（灰度）——环境变量配置齐备才渲染 */}
            {SSO_ENABLED ? (
              <>
                <SignInButton
                  providerId={SSO_PROVIDER_ID}
                  label="公司 SSO 登录"
                  variant="default"
                />
                <div className="flex items-center gap-3 py-1 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  或
                  <span className="h-px flex-1 bg-border" />
                </div>
                <SignInButton
                  providerId={OIDC_PROVIDER_ID}
                  label="其他方式登录"
                  variant="outline"
                />
                <p className="text-xs leading-5 text-muted-foreground">
                  建议优先使用公司 SSO；「其他方式登录」为过渡通道，后续将下线。
                </p>
              </>
            ) : (
              /* 过渡期唯一入口：Casdoor OIDC，SSO 灰度稳定后切换 */
              <SignInButton
                providerId={OIDC_PROVIDER_ID}
                label="登录"
                variant="default"
              />
            )}
          </div>

          <p className="mt-12 flex items-center gap-1.5 text-xs text-muted-foreground">
            <LifeBuoy className="size-3.5" aria-hidden />
            遇到登录问题？请联系平台管理员
          </p>
        </div>
      </div>
    </div>
  );
}
