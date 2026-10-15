// 手册截图补齐第二轮（临时脚本，用后即删）
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const OUT = "C:/Users/19076/WorkBuddy/2026-09-23-16-47-22/screenshots";
const BASE = "https://localhost:3000";
const SECRET = "AYtuL3N4V0eiEdCh530pbslTX1h/Alg2cnhR8zVpUCQ=";
const EXEC =
  "C:/Users/19076/AppData/Local/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-win64/chrome-headless-shell.exe";

import crypto from "node:crypto";
function cookieFor(token) {
  const sig = crypto.createHmac("sha256", SECRET).update(token).digest("base64");
  return `${token}.${sig}`;
}

const browser = await chromium.launch({ executablePath: EXEC, args: ["--ignore-certificate-errors"] });

async function makeCtx(token) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  });
  const v = cookieFor(token);
  await ctx.addCookies([
    { name: "__Secure-better-auth.session_token", value: v, domain: "localhost", path: "/", httpOnly: true, secure: true, sameSite: "Lax" },
    { name: "better-auth.session_token", value: v, domain: "localhost", path: "/", httpOnly: true, secure: true, sameSite: "Lax" },
  ]);
  return ctx;
}

const shot = async (page, name, full = false) => {
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
  console.log("shot:", name, "->", page.url());
};

// ① 管理员：MCP 详情页 + 接入弹窗
const admin = await makeCtx("manual-shot-20261015-sess1");
const p1 = await admin.newPage();
await p1.goto(`${BASE}/mcp/sub_1789179275312`);
await shot(p1, "04-MCP详情页");
try {
  await p1.getByRole("button", { name: /复制配置|接入/ }).first().click({ timeout: 5000 });
  await p1.waitForTimeout(900);
  await shot(p1, "03-接入弹窗");
  await p1.keyboard.press("Escape");
} catch (e) {
  console.log("接入弹窗跳过:", e.message.slice(0, 80));
}

// ② 管理员：提交向导第 1 步（/submissions 页表单直接可见）
try {
  await p1.goto(`${BASE}/submissions`);
  await shot(p1, "05b-提交向导-基本信息", true);
  await p1.getByRole("button", { name: /下一步/ }).first().click({ timeout: 4000 });
  await p1.waitForTimeout(600);
  await shot(p1, "06-提交向导-制品来源", true);
} catch (e) {
  console.log("向导步跳过:", e.message.slice(0, 80));
}
await admin.close();

// ③ 1abvfd（未签发 token）：接入弹窗展示「自助签发我的 Token」按钮
const u2 = await makeCtx("manual-shot-20261015-user2");
const p2 = await u2.newPage();
await p2.goto(`${BASE}/mcp/sub_1789179275312`);
await shot(p2, "14-详情页-未签发用户");
try {
  await p2.getByRole("button", { name: /复制配置|接入/ }).first().click({ timeout: 5000 });
  await p2.waitForTimeout(900);
  await shot(p2, "15-自助签发按钮");
} catch (e) {
  console.log("自助签发弹窗跳过:", e.message.slice(0, 80));
}
await u2.close();

await browser.close();
console.log("ROUND 2 DONE");
