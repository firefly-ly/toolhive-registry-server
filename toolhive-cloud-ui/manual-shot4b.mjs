// 手册截图第四轮：已部署条目 + 未签发非管理员的自助签发按钮（临时脚本，用后即删）
import { chromium } from "playwright-core";
import crypto from "node:crypto";

const OUT = "C:/Users/19076/WorkBuddy/2026-09-23-16-47-22/screenshots";
const BASE = "https://localhost:3000";
const SECRET = "AYtuL3N4V0eiEdCh530pbslTX1h/Alg2cnhR8zVpUCQ=";
const EXEC =
  "C:/Users/19076/AppData/Local/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-win64/chrome-headless-shell.exe";

function cookieFor(token) {
  const sig = crypto.createHmac("sha256", SECRET).update(token).digest("base64");
  return `${token}.${sig}`;
}

const browser = await chromium.launch({ executablePath: EXEC, args: ["--ignore-certificate-errors"] });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  ignoreHTTPSErrors: true,
});
const v = cookieFor("manual-shot-20261015-user3"); // 1abvfd@example.com（非管理员）
await ctx.addCookies([
  { name: "__Secure-better-auth.session_token", value: v, domain: "localhost", path: "/", httpOnly: true, secure: true, sameSite: "Lax" },
  { name: "better-auth.session_token", value: v, domain: "localhost", path: "/", httpOnly: true, secure: true, sameSite: "Lax" },
]);
const page = await ctx.newPage();

// ① 目录页（1abvfd 视角，确认登录态有效）
await page.goto(`${BASE}/catalog`);
await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1200);
console.log("catalog url:", page.url());

// ② 已部署条目的接入弹窗（应出现「自助签发我的 Token」按钮）
await page.goto(`${BASE}/mcp/sub_1788404413214`);
await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/15-自助签发按钮-详情页.png` });
console.log("shot: 15-自助签发按钮-详情页 url:", page.url());

const clicked = await page
  .getByRole("button", { name: /复制配置|接入/ })
  .first()
  .click({ timeout: 6000 })
  .then(() => true)
  .catch(() => false);
if (clicked) {
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/16-自助签发按钮.png` });
  console.log("shot: 16-自助签发按钮");

  // ③ 点按钮完成自助签发（闭环：1abvfd 拿回 token）
  const issueBtn = page.getByRole("button", { name: /自助签发我的 Token/ }).first();
  if (await issueBtn.isVisible().catch(() => false)) {
    await issueBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/17-自助签发完成.png` });
    console.log("shot: 17-自助签发完成");
  } else {
    console.log("自助签发按钮未出现在弹窗内");
  }
} else {
  console.log("接入/复制配置按钮未找到");
}

await browser.close();
console.log("ROUND 4 DONE");
