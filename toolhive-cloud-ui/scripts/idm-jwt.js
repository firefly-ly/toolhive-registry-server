// scripts/idm-jwt.js —— IDM 自签 JWT 纯函数（2026-10-08 自 idm-sync.js 抽出，语义零改动）。
// 抽出目的：参数化 + now 可注入，可被 node --test 直接单测；idm-sync.js require 后行为不变。
"use strict";
const crypto = require("node:crypto");

function b64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/** 生成 IDM AuthToken。
 *  @param {Object} o
 *  @param {string} o.appId IDM AppID（iss）
 *  @param {string} o.appSecret HMAC256 签名密钥
 *  @param {string} [o.authToken] 显式提供的现成 token（优先于自签）
 *  @param {string} [o.tokenScheme] "bearer"（默认，加 Bearer 前缀）| "raw"（裸 token）
 *  @param {number} [o.now] 可注入时钟（毫秒），默认 Date.now()
 *  @returns {string}
 */
function makeAuthToken({ appId, appSecret, authToken = "", tokenScheme = "bearer", now = Date.now() }) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({
      iss: appId,
      iat: Math.floor(now / 1000),
      jti: crypto.randomUUID(),
    }),
  );
  const signature = b64url(
    crypto.createHmac("sha256", appSecret).update(`${header}.${payload}`).digest(),
  );
  const token = `${header}.${payload}.${signature}`;
  // authToken 显式提供时按原文使用；否则自签后按 tokenScheme 加前缀
  const raw = authToken || token;
  if (tokenScheme === "raw") return raw.replace(/^Bearer\s+/i, "");
  return /^Bearer\s/i.test(raw) ? raw : `Bearer ${raw}`;
}

module.exports = { makeAuthToken, b64url };
