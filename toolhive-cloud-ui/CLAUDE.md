# CLAUDE.md — toolhive-cloud-ui（企业 MCP+Skill 平台前端）

> 本仓库 fork 自 stacklok/toolhive-cloud-ui 并**深度企业化二开**。上游原始说明见 git 历史与本文件被替换前的版本；本文件描述 fork 当前的真实形态，AI 助手以此为准，**不要**按上游开源项目的假设写代码（如 hey-api 对接 stacklok registry 的部分已被自研后端对接取代）。

## 项目定位

企业 MCP+Skill 平台的管理前端（Next.js App Router），对接自研后端 `platform-backend`（Express, :4000），功能含：MCP/Skill 目录与详情、提交流（源码包/`.env` 私密配置）、审批治理、统计看板、反馈治理、收藏、AI 对话助手。

## 技术栈

- Next.js（App Router，**不是** Pages Router）+ React 19 + TypeScript strict
- Tailwind CSS 4 + shadcn/ui + Radix
- 认证：Better Auth（OIDC 对接 Casdoor；本地开发用 `dev-auth/oidc-provider.mjs` 模拟 IdP）
- 数据请求：`src/lib/platform-backend.ts` 统一封装（`request` helper + `internalProxyHeaders()`）
- 测试：Vitest + Testing Library（单测）、Playwright（e2e）
- Lint/Format：**Biome**（不用 ESLint/Prettier）；包管理 pnpm

## 常用命令

```bash
pnpm dev           # 启动（同时拉起本地 OIDC mock）
pnpm build         # next build
pnpm lint          # biome check（当前全量 0 错误，保持住）
pnpm type-check    # tsc --noEmit（必须 0 错误）
pnpm test          # vitest run
pnpm test:e2e      # 先 build 再 playwright
```

## Next.js 红线（继承自上游，仍然有效）

- 这是 **App Router**：不要混入 Pages Router 模式（getServerSideProps/getStaticProps 已不存在）
- Server Components 默认优先：无 hooks、无事件处理器；交互逻辑才加 `"use client"`
- 尊重文件系统路由与 Next 内建缓存/数据获取，不要自己造轮子
- 拿不准时查 App Router 官方文档再动手

## 架构要点（本 fork 特有，AI 容易踩错的点）

1. **后端调用只走 lib 层**：所有对 platform-backend 的 HTTP 调用必须经 `src/lib/platform-backend.ts`（含 `internalProxyHeaders()` 注入 `x-internal-proxy` 内部令牌）。**server actions / 服务端代码禁止手写裸 fetch 直连后端**——唯一例外是外部 URL 拉取（fetchFileFromLocation）。
2. **提交流**：`src/app/(app)/submissions/actions.ts` 只做业务校验与错误文案；制品上传/源码提交/env 提交分别调 lib 的 `uploadBufferToBackend` / `createSourceSubmission` / `submitSubmissionEnv`。错误前缀（制品上传失败/源码包提交失败/.env 上传失败）是契约，别改。
3. **统计页拆分**：`src/app/(app)/stats/` 下四件套——`dashboard.tsx`（主组件）/ `dashboard-shared.tsx`（类型+公共组件）/ `trend-chart.tsx` / `quadrant.tsx`。改一处注意导出/导入联动；`page.tsx` 的类型从 `dashboard-shared` 导入。
4. **行尾**：仓库统一 LF；Windows 下新文件若被写成 CRLF，`pnpm lint` 会报格式错，`biome check --write` 可修。
5. **AI 助手功能**：`src/features/assistant/` + `src/components/chat/`（ai-sdk + MCP），`src/app/api/chat/` 为其 API 路由。

## 工作约定

- **提交信息**: Conventional Commits，husky commit-msg 钩子强制校验（@commitlint/cli）
- **顺序纪律**: 先验证（`pnpm type-check` + `pnpm lint` + `pnpm test`）再 commit；曾因先 commit 后验证产生带病提交（靠 amend 补救），不要重蹈
- **Biome --write 会做语义等价改写**（如 `Math.pow(10,x)` → `10 ** x`），review diff 时不要当成逻辑变更误判
- **noArrayIndexKey**：仅当索引即身份（如行号列表）才允许 biome-ignore 豁免，必须带理由注释
- **推送**: 直连 GitHub 优先，会话代理环境变量可能失效，失败清代理重试
- **验证基准**: 任何改动后 tsc 0 错误 + biome 0 错误 + vitest 全过
