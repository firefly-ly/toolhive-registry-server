// 为《MCP平台操作手册》截取平台界面截图（临时脚本，用后即删）
// 前置：本地栈运行中（frontend https://localhost:3000 + backend 4000）；
// 登录态：10-12 注入 auth-db 的会话 cookie（7 天有效期）。
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const OUT = "C:/Users/19076/WorkBuddy/2026-09-23-16-47-22/screenshots";
mkdirSync(OUT, { recursive: true });
const BASE = "https://localhost:3000";
const COOKIE =
  "manual-shot-20261015-sess1.0sE4jY6QCRj+8WxHEFJskFUHG6kNAQ2solFpW5/18GI=";

const browser = await chromium.launch({
  executablePath:
    "C:/Users/19076/AppData/Local/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-win64/chrome-headless-shell.exe",
  args: ["--ignore-certificate-errors"],
});
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  ignoreHTTPSErrors: true,
});
await ctx.addCookies([
  {
    name: "__Secure-better-auth.session_token",
    value: COOKIE,
    domain: "localhost",
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
  },
  {
    name: "better-auth.session_token",
    value: COOKIE,
    domain: "localhost",
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
  },
]);
const page = await ctx.newPage();

const shot = async (name, full = false) => {
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
  console.log("shot:", name, "->", page.url());
};

// ① 登录页（无 cookie 的新上下文）
const anonCtx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  ignoreHTTPSErrors: true,
});
const anonPage = await anonCtx.newPage();
await anonPage.goto(`${BASE}/signin`);
await anonPage.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
await anonPage.waitForTimeout(900);
await anonPage.screenshot({ path: `${OUT}/01-登录页.png` });
console.log("shot: 01-登录页");
await anonCtx.close();

// ② 目录页
await page.goto(`${BASE}/catalog`);
await shot("02-目录页");

// ③ 目录-接入弹窗（点第一张卡片的「接入」按钮）
try {
  const btn = page.getByRole("button", { name: "接入" }).first();
  await btn.click({ timeout: 5000 });
  await page.waitForTimeout(800);
  await shot("03-接入弹窗");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
} catch (e) {
  console.log("接入弹窗跳过:", e.message.slice(0, 60));
}

// ④ MCP 详情页（从目录点第一张卡）
try {
  await page.goto(`${BASE}/catalog`);
  await page.waitForTimeout(800);
  const card = page.locator('[class*="cursor-pointer"]').first();
  await card.click({ timeout: 5000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await shot("04-MCP详情页");
} catch (e) {
  console.log("详情页跳过:", e.message.slice(0, 60));
}

// ⑤ 提交向导：类型分道
await page.goto(`${BASE}/submissions`);
await page.waitForTimeout(800);
const newBtn = page.getByRole("button", { name: /新建|提交/ }).first();
try {
  await newBtn.click({ timeout: 4000 });
} catch (_) { /* 可能已在表单页 */ }
await page.waitForTimeout(800);
await shot("05-提交向导-选择类型", true);

// ⑥ 提交向导：基本信息（点下一步）
try {
  await page.getByRole("button", { name: /下一步：基本信息/ }).click({ timeout: 4000 });
  await page.waitForTimeout(600);
  await shot("06-提交向导-基本信息", true);
} catch (e) {
  console.log("向导第 1 步跳过:", e.message.slice(0, 60));
}

// ⑦ 统计页
await page.goto(`${BASE}/stats`);
await shot("07-统计页", true);

// ⑧ 收藏页
await page.goto(`${BASE}/favorites`);
await shot("08-收藏页");

// ⑨ 管理后台-审核队列
await page.goto(`${BASE}/admin`);
await shot("09-管理-审核队列");

// ⑩ 管理后台-已发布管理
await page.goto(`${BASE}/admin?tab=published`);
await shot("10-管理-已发布管理");

// ⑪ Token 管理弹窗（点第一行的「Token 管理」）
try {
  const tk = page.getByRole("button", { name: /Token 管理/ }).first();
  await tk.click({ timeout: 5000 });
  await page.waitForTimeout(900);
  await shot("11-Token管理弹窗");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
} catch (e) {
  console.log("Token 弹窗跳过:", e.message.slice(0, 60));
}

// ⑫ 可见范围弹窗（点第一行的「可见范围」）
try {
  const vis = page.getByRole("button", { name: /可见范围/ }).first();
  await vis.click({ timeout: 5000 });
  await page.waitForTimeout(900);
  await shot("12-可见范围弹窗");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
} catch (e) {
  console.log("可见范围弹窗跳过:", e.message.slice(0, 60));
}

// ⑬ 审计轨迹
await page.goto(`${BASE}/admin?tab=audit`);
await shot("13-管理-审计轨迹");

await browser.close();
console.log("ALL DONE ->", OUT);
