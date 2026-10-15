// 手册截图第五轮：真实登录（mock OIDC）+ 自助签发按钮补拍（临时脚本，用后即删）
// 流程：/signin → 点「登录」→ mock OIDC 自动以 test@example.com 通过 → 回调建立会话
// → 此刻该账号已被移出 ADMIN_EMAILS（非管理员）→ 打开已部署条目接入弹窗 → 自助签发按钮出现
import { chromium } from "playwright-core";

const OUT = "C:/Users/19076/WorkBuddy/2026-09-23-16-47-22/screenshots";
const BASE = "https://localhost:3000";

const browser = await chromium.launch({
  executablePath:
    "C:/Users/19076/AppData/Local/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-win64/chrome-headless-shell.exe",
  args: ["--ignore-certificate-errors"],
});
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  ignoreHTTPSErrors: true,
});
const page = await ctx.newPage();

// ① 登录页截图
await page.goto(`${BASE}/signin`);
await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/01-登录页.png` });
console.log("shot: 01-登录页");

// ② 点登录按钮（触发 OIDC 跳转到 mock provider）
const loginBtn = page.getByRole("button", { name: "登录", exact: true }).first();
await loginBtn.click({ timeout: 8000 });
console.log("已点击登录，等待 OIDC 回调…");

// ③ 等待回调完成：URL 回到 3000 且离开 /signin（mock provider 可能中转多页）
let authed = false;
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(1000);
  const url = page.url();
  if (url.startsWith(BASE) && !url.includes("signin") && !url.includes("8000")) {
    authed = true;
    break;
  }
  // mock provider 交互页：有按钮就点（自动登录场景一般直通）
  const confirmBtn = page
    .getByRole("button", { name: /授权|确认|继续|登录|Sign|Allow|Consent/ })
    .first();
  if (await confirmBtn.isVisible().catch(() => false)) {
    await confirmBtn.click({ timeout: 2000 }).catch(() => {});
  }
}
if (!authed) {
  console.log("登录未完成，退出");
  await browser.close();
  process.exit(1);
}
console.log("登录完成:", page.url());
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/03-接入弹窗前的目录页.png` });

// ④ 已部署条目详情页 → 接入弹窗（此刻 test@example.com 为非管理员且未签发 → 自助签发按钮出现）
await page.goto(`${BASE}/mcp/sub_1788404413214`);
await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/15-自助签发按钮-详情页.png` });
console.log("shot: 15-自助签发按钮-详情页");

const clicked = await page
  .getByRole("button", { name: /复制配置|接入/ })
  .first()
  .click({ timeout: 6000 })
  .then(() => true)
  .catch(() => false);
if (clicked) {
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/15-自助签发按钮.png` });
  console.log("shot: 15-自助签发按钮（弹窗内）");

  const issueBtn = page
    .getByRole("button", { name: /自助签发我的 Token/ })
    .first();
  if (await issueBtn.isVisible().catch(() => false)) {
    await issueBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/16-自助签发完成.png` });
    console.log("shot: 16-自助签发完成");
  } else {
    console.log("自助签发按钮未出现在弹窗内");
  }
} else {
  console.log("接入/复制配置按钮未找到（检查 GettingStarted 是否渲染）");
}

// ⑤ 目录卡片版接入弹窗
await page.goto(`${BASE}/catalog`);
await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1200);
try {
  await page.getByRole("button", { name: /接入|复制配置/ }).first().click({ timeout: 5000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/03-接入弹窗.png` });
  console.log("shot: 03-接入弹窗（目录卡片版）");
  await page.keyboard.press("Escape");
} catch (e) {
  console.log("目录卡片接入弹窗跳过:", e.message.slice(0, 80));
}

await browser.close();
console.log("ROUND 5 DONE");
