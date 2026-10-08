// IDM 自签 JWT 单测（scripts/idm-jwt.js）—— HMAC256({iss,iat,jti}) + Bearer/raw 前缀语义
// 运行：node --test scripts/test/
"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { makeAuthToken, b64url } = require("../idm-jwt");

const APP_ID = "app-123";
const APP_SECRET = "secret-abc";
const NOW = 1728340800000; // 2024-10-08T00:00:00Z，固定时钟

function decodeSeg(seg) {
  return JSON.parse(Buffer.from(seg, "base64").toString("utf8"));
}

/** 取纯 JWT 三段（bearer 形态下剥掉 Bearer 前缀） */
function jwtSegs(token) {
  return token.replace(/^Bearer\s+/, "").split(".");
}

test("结构：三段式 JWT，header 固定 HS256，payload iss/iat 正确", () => {
  const [h, p, s] = jwtSegs(makeAuthToken({ appId: APP_ID, appSecret: APP_SECRET, now: NOW }));
  assert.equal(h.length > 0 && p.length > 0 && s.length > 0, true);
  assert.deepEqual(decodeSeg(h), { alg: "HS256", typ: "JWT" });
  const payload = decodeSeg(p);
  assert.equal(payload.iss, APP_ID);
  assert.equal(payload.iat, 1728340800);
  assert.match(payload.jti, /^[0-9a-f-]{36}$/); // uuid
});

test("签名：HMAC-SHA256(appSecret, header.payload) 且 base64url 无填充", () => {
  const [h, p, s] = jwtSegs(makeAuthToken({ appId: APP_ID, appSecret: APP_SECRET, now: NOW }));
  const expect = crypto
    .createHmac("sha256", APP_SECRET)
    .update(`${h}.${p}`)
    .digest("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  assert.equal(s, expect);
  const raw = jwtSegs(makeAuthToken({ appId: APP_ID, appSecret: APP_SECRET, now: NOW })).join(".");
  assert.match(raw, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/); // 无 = / + /
});

test("签名对密钥敏感：同一 header.payload 换密钥签名不同", () => {
  const [h1, p1, s1] = jwtSegs(makeAuthToken({ appId: APP_ID, appSecret: APP_SECRET, now: NOW }));
  const sWrong = crypto
    .createHmac("sha256", "wrong-secret")
    .update(`${h1}.${p1}`)
    .digest("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  assert.notEqual(s1, sWrong);
});

test("前缀：默认 bearer 形态加 Bearer 前缀；已带 Bearer 的现成 token 不重复加", () => {
  const selfSigned = makeAuthToken({ appId: APP_ID, appSecret: APP_SECRET, now: NOW });
  assert.match(selfSigned, /^Bearer /);
  assert.equal(makeAuthToken({ appId: APP_ID, appSecret: APP_SECRET, authToken: "Bearer xyz", now: NOW }), "Bearer xyz");
  assert.equal(makeAuthToken({ appId: APP_ID, appSecret: APP_SECRET, authToken: "xyz", now: NOW }), "Bearer xyz");
});

test("前缀：raw 形态输出裸 token（剥离可能存在的 Bearer 前缀）", () => {
  assert.equal(
    makeAuthToken({ appId: APP_ID, appSecret: APP_SECRET, authToken: "Bearer xyz", tokenScheme: "raw", now: NOW }),
    "xyz",
  );
  assert.equal(
    makeAuthToken({ appId: APP_ID, appSecret: APP_SECRET, authToken: "xyz", tokenScheme: "raw", now: NOW }),
    "xyz",
  );
});

test("b64url：标准 base64 差异（无填充 + url 安全字符）", () => {
  assert.equal(b64url("a>>??"), Buffer.from("a>>??").toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_"));
  assert.doesNotMatch(b64url("~~~"), /[+/=]/);
});
