// 手册截图第四轮：有头浏览器 + 真实登录（临时脚本，用后即删）
// 用法：node manual-shot4.mjs → 弹出浏览器窗口 → 你完成登录 → 脚本检测到登录后自动连拍全部界面
import { chromium } from "playwright-core";

const OUT = "C:/Users/19076/WorkBuddy/2026-09-23-16-47-22/screenshots";
const BASE = "https://localhost:3000";
const EXEC =
  "C:/Users/19076/AppData/Local/ms-playwright/chromium-1247/chrome-win64/chrome.exe";

const browser = await chromium.launch({
  executablePath: EXEC,
  headless: false, // 有头：你手动完成 Casdoor 登录
  args: ["--ignore-certificate-errors", "--start-maximized"],
});
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  ignoreHTTPSErrors: true,
});
const page = await ctx.newPage();

console.log(">> 请在弹出的浏览器窗口中完成登录（Casdoor）…");
await page.goto(`${BASE}/signin`);

// 轮询等待登录完成：URL 回到 3000 应用域名且不在登录页（Casdoor 中转页不算）
let loggedIn = false;
for (let i = 0; i < 100; i++) {
  await page.waitForTimeout(3000);
  const url = page.url();
  if (url.startsWith(BASE) && !url.includes("signin")) {
    loggedIn = true;
    break;
  }
}
if (!loggedIn) {
  console.log(">> 5 分钟内未检测到登录，退出。");
  await browser.close();
  process.exit(1);
}
console.log(">> 登录成功，开始连拍…");

const shot = async (name, full = false) => {
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
  console.log("shot:", name, "->", page.url());
};

// ① 目录页
await page.goto(`${BASE}/catalog`);
await shot("02-目录页");

// ② 接入弹窗（目录卡片上的「接入」钮，仅部署且健康的条目有）
try {
  await page.getByRole("button", { name: /接入|复制配置/ }).first().click({ timeout: 5000 });
  await page.waitForTimeout(900);
  await shot("03-接入弹窗");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
} catch (e) {
  console.log("接入弹窗跳过:", e.message.slice(0, 60));
}

// ③ MCP 详情页 + 接入弹窗（详情页版式）
await page.goto(`${BASE}/mcp/sub_1789179275312`);
await shot("04-MCP详情页");
try {
  await page.getByRole("button", { name: /复制配置|接入/ }).first().click({ timeout: 5000 });
  await page.waitForTimeout(900);
  await shot("03b-详情-接入弹窗");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
} catch (e) {
  console.log("详情接入弹窗跳过:", e.message.slice(0, 60));
}

// ④ 提交向导（类型分道 → 基本信息 → 制品来源）
await page.goto(`${BASE}/submissions`);
await shot("05-提交向导-选择类型", true);
try {
  await page.getByRole("button", { name: /下一步：基本信息/ }).first().click({ timeout: 5000 });
  await page.waitForTimeout(700);
  await shot("06-提交向导-基本信息", true);
  await page.getByRole("button", { name: /下一步/ }).first().click({ timeout: 5000 });
  await page.waitForTimeout(700);
  await shot("06b-提交向导-制品来源", true);
} catch (e) {
  console.log("向导步跳过:", e.message.slice(0, 60));
}

// ⑤ 统计 / 收藏
await page.goto(`${BASE}/stats`);
await shot("07-统计页", true);
await page.goto(`${BASE}/favorites`);
await shot("08-收藏页");

// ⑥ 管理后台：审核队列 / 已发布管理
await page.goto(`${BASE}/admin`);
await shot("09-管理-审核队列");
await page.goto(`${BASE}/admin?tab=published`);
await shot("10-管理-已发布管理");

// ⑦ Token 管理弹窗
try {
  await page.getByRole("button", { name: /Token 管理/ }).first().click({ timeout: 5000 });
  await page.waitForTimeout(900);
  await shot("11-Token管理弹窗");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
} catch (e) {
  console.log("Token 弹窗跳过:", e.message.slice(0, 60));
}

// ⑧ 可见范围弹窗
try {
  await page.getByRole("button", { name: /可见范围/ }).first().click({ timeout: 5000 });
  await page.waitForTimeout(900);
  await shot("12-可见范围弹窗");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
} catch (e) {
  console.log("可见范围弹窗跳过:", e.message.slice(0, 60));
}

// ⑨ 审计轨迹
await page.goto(`${BASE}/admin?tab=audit`);
await shot("13-管理-审计轨迹");

// ⑩ 提交历史
await page.goto(`${BASE}/submissions`);
await shot("14-提交历史");

await browser.close();
console.log("ALL DONE ->", OUT);
