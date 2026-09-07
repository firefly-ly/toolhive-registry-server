import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer as createNetServer } from "node:net";
import { gzipSync } from "node:zlib";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { HttpResponse, http } from "msw";
import type { RequestHandler } from "msw";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, "../../data/mock-platform-db.json");

type PlatformDB = {
  skills: unknown[];
  mcps: unknown[];
  submissions: unknown[];
  favorites: unknown[];
  activeVersions: unknown[];
  issues: unknown[];
  metrics: unknown[];
};

let dbCache: PlatformDB | null = null;

function loadDb(): PlatformDB {
  if (dbCache) return dbCache;
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    dbCache = JSON.parse(raw) as PlatformDB;
  } catch {
    dbCache = {
      skills: [],
      mcps: [],
      submissions: [],
      favorites: [],
      activeVersions: [],
      issues: [],
      metrics: [],
    };
  }
  return dbCache;
}

function saveDb() {
  if (!dbCache) return;
  try {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(dbCache, null, 2));
  } catch (e) {
    console.error("[platform-mock] failed to save db", e);
  }
}

function resetCache() {
  dbCache = null;
}

// ---- 真实 MCP 运行时：在「部署」时 spawn 本地 MCP server 进程 ----
// 仅开发/mock 用：拉起 demo-server.mjs 暴露真实 tool，让端到端调用可用。
// 上生产后由 ToolHive 运行用户实际提交的镜像，此处保留为「本地运行适配层」。
type RuntimeEntry = { child: ChildProcess | null; port: number; pid?: number };

const runtime = new Map<string, RuntimeEntry>();
const DEMO_SERVER_PATH = path.join(__dirname, "mcp-runtime", "demo-server.mjs");

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createNetServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      srv.close(() => (port ? resolve(port) : reject(new Error("no free port"))));
    });
  });
}

function waitForReady(child: ChildProcess, timeoutMs = 8000): Promise<number> {
  return new Promise((resolve, reject) => {
    let buf = "";
    const timer = setTimeout(
      () => reject(new Error("demo mcp start timeout")),
      timeoutMs,
    );
    child.stdout?.on("data", (d) => {
      buf += d.toString();
      const m = buf.match(/READY:(\d+)/);
      if (m) {
        clearTimeout(timer);
        resolve(Number(m[1]));
      }
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`demo mcp exited early (code ${code})`));
    });
  });
}

async function spawnDemo(
  id: string,
): Promise<{ port: number; endpoint: string }> {
  const port = await findFreePort();
  const child = spawn(process.execPath, [DEMO_SERVER_PATH, String(port)], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
  });
  child.stderr?.on("data", (d) =>
    process.stderr.write(`[demo-mcp ${id}] ${d}`),
  );
  try {
    const got = await waitForReady(child);
    runtime.set(id, { child, port: got, pid: child.pid ?? undefined });
    return { port: got, endpoint: `http://127.0.0.1:${got}/sse` };
  } catch (e) {
    try {
      child.kill("SIGKILL");
    } catch {
      /* ignore */
    }
    runtime.delete(id);
    throw e;
  }
}

function killRuntime(id: string) {
  const r = runtime.get(id);
  if (!r) return;
  if (r.child) {
    try {
      r.child.kill("SIGTERM");
    } catch {
      /* ignore */
    }
  } else if (r.pid) {
    try {
      process.kill(r.pid, "SIGTERM");
    } catch {
      /* ignore */
    }
  }
  runtime.delete(id);
}

async function connectClient(endpoint: string): Promise<Client> {
  const client = new Client({ name: "platform-mcp-proxy", version: "1.0.0" });
  await client.connect(new SSEClientTransport(new URL(endpoint)));
  return client;
}

function parseMetaStr(meta?: string): Record<string, unknown> {
  if (!meta) return {};
  try {
    return JSON.parse(meta) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * 通过 submission 找到对应的 MCP 记录。
 * 历史种子数据里 submission.id 与 mcps.id 不一定相同（例如 sub-demo-1 vs mcp-demo-1），
 * 但二者共享 payload_ref 以及 meta.group_key + meta.version，因此按后者关联。
 */
function findMcpForSubmission(
  db: PlatformDB,
  submission: {
    id?: string;
    payload_ref?: string;
    meta?: string;
  },
): (Record<string, unknown> & { id?: string }) | undefined {
  const meta = parseMetaStr(submission.meta);
  const payloadRef = submission.payload_ref;
  const groupKey = meta.group_key as string | undefined;
  const version = meta.version as string | undefined;

  // 优先按 id 精确匹配（新提交的数据通常 mcp.id === submission.id）
  const byId = (db.mcps as Array<Record<string, unknown> & { id?: string }>).find(
    (m) => !!submission.id && m.id === submission.id,
  );
  if (byId) return byId;
  // 兜底：历史种子数据 id 不一致，按 payload_ref / group_key+version 反查
  return (db.mcps as Array<Record<string, unknown> & { id?: string }>).find(
    (m) => {
      if (payloadRef && m.payload_ref === payloadRef) return true;
      if (groupKey && version && m.group_key === groupKey && m.version === version) return true;
      return false;
    },
  );
}

function findSubmissionForMcp(
  db: PlatformDB,
  mcp: Record<string, unknown> & { id?: string },
): (Record<string, unknown> & { id?: string }) | undefined {
  const mmeta = {
    group_key: mcp.group_key as string | undefined,
    version: mcp.version as string | undefined,
  };
  // 优先按 id 精确匹配（新提交的数据通常 submission.id === mcp.id）
  const byId = (db.submissions as Array<Record<string, unknown> & { id?: string }>).find(
    (s) => s.id === mcp.id,
  );
  if (byId) return byId;
  // 兜底：历史种子数据 id 不一致，按 payload_ref / group_key+version 反查
  return (db.submissions as Array<Record<string, unknown> & { id?: string }>).find(
    (s) => {
      if (s.payload_ref && mcp.payload_ref && s.payload_ref === mcp.payload_ref) return true;
      const smeta = parseMetaStr(s.meta as string);
      if (
        mmeta.group_key &&
        mmeta.version &&
        smeta.group_key === mmeta.group_key &&
        smeta.version === mmeta.version
      )
        return true;
      return false;
    },
  );
}

// 后端启动时把 DB 中仍是 deployed 的 MCP 重新拉起（或接管尚在运行的旧进程），
// 避免 mock 后端重启后已部署实例掉线。
async function rehydrateRuntime() {
  const db = loadDb();
  for (const mcp of db.mcps as Array<Record<string, unknown>>) {
    const mcpRec = mcp as Record<string, unknown> & { id?: string };
    // 已删除 / 已拒绝的提交，其实例不应再运行：停止并标记为已下线
    const sub = findSubmissionForMcp(db, mcpRec);
    if (sub && (sub.status === "removed" || sub.status === "rejected")) {
      killRuntime(String((sub as { id?: string }).id ?? mcpRec.id));
      mcp.deploy_status = "undeployed";
      mcp.healthy = false;
      mcp.endpoint = undefined;
      mcp.public_endpoint = undefined;
      continue;
    }
    if (mcp.deploy_status !== "deployed") continue;
    const runtimeKey = String(sub?.id ?? mcp.id);
    const endpoint = mcp.endpoint as string | undefined;
    if (endpoint) {
      try {
        const res = await fetch(endpoint, { method: "GET" });
        if (res.ok) {
          const url = new URL(endpoint);
          runtime.set(runtimeKey, {
            child: null,
            port: Number(url.port),
            pid: (mcp.runtime_pid as number) ?? undefined,
          });
          mcp.healthy = true;
          continue;
        }
      } catch {
        /* 不可达则下面重新拉起 */
      }
    }
    try {
      const { port, endpoint: ep } = await spawnDemo(runtimeKey);
      mcp.endpoint = ep;
      mcp.public_endpoint = ep;
      mcp.healthy = true;
      mcp.runtime_port = port;
      mcp.runtime_pid = runtime.get(runtimeKey)?.pid;
      // 同步更新对应 submission 的 meta，使管理页与 catalog 状态一致
      if (sub) {
        const smeta = parseMetaStr(sub.meta as string);
        smeta.deploy_status = "deployed";
        smeta.endpoint = ep;
        smeta.runtime_port = port;
        smeta.runtime_pid = mcp.runtime_pid;
        sub.meta = JSON.stringify(smeta);
      }
    } catch {
      mcp.deploy_status = "undeployed";
      mcp.healthy = false;
      mcp.endpoint = undefined;
      mcp.public_endpoint = undefined;
    }
  }
  saveDb();
}

async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

function uuid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

// ---- Skill 导出包：自描述 .zip（含 SKILL.md + manifest.json）----
// 手写 STORE 方式 zip（无压缩），避免引入第三方依赖；可用系统 unzip 校验。
const CRC_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeZip(files: { name: string; content: Buffer }[]): Buffer {
  const chunks: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const f of files) {
    const nameBuf = Buffer.from(f.name, "utf-8");
    const data = f.content;
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // local file header sig
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(0, 8); // method 0 = store
    local.writeUInt16LE(0, 10); // mod time
    local.writeUInt16LE(0, 12); // mod date
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18); // compressed size
    local.writeUInt32LE(data.length, 22); // uncompressed size
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28); // extra len
    chunks.push(local, nameBuf, data);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0); // central dir sig
    cd.writeUInt16LE(20, 4); // version made by
    cd.writeUInt16LE(20, 6); // version needed
    cd.writeUInt16LE(0, 8); // flags
    cd.writeUInt16LE(0, 10); // method
    cd.writeUInt16LE(0, 12); // mod time
    cd.writeUInt16LE(0, 14); // mod date
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(data.length, 20);
    cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30); // extra
    cd.writeUInt16LE(0, 32); // comment
    cd.writeUInt16LE(0, 34); // disk start
    cd.writeUInt16LE(0, 36); // internal attrs
    cd.writeUInt32LE(0, 38); // external attrs
    cd.writeUInt32LE(offset, 42); // local header offset
    central.push(cd, nameBuf);

    offset += local.length + nameBuf.length + data.length;
  }
  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); // end of central dir sig
  end.writeUInt16LE(0, 4); // disk
  end.writeUInt16LE(0, 6); // disk with cd
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20); // comment len
  return Buffer.concat([...chunks, centralBuf, end]);
}

// 构建一个符合「SKILL.md 约定」的技能包：SKILL.md（YAML frontmatter: name + description）+ manifest.json
function buildSkillPackage(skill: Record<string, unknown>): Buffer {
  const name = String(skill.name ?? "skill");
  const description = String(skill.description ?? "");
  const group = String(skill.group_key ?? "skill");
  const version = String(skill.version ?? "1.0.0");

  const skillMd =
    `---\n` +
    `name: ${name}\n` +
    `description: ${description}\n` +
    `---\n\n` +
    `# ${name}\n\n` +
    `${description}\n\n` +
    `Exported from ToolHive Cloud UI as a self-describing skill package.\n`;

  const manifest = {
    format: "toolhive-skill-package",
    schema_version: "1.0",
    type: "skill",
    name,
    group_key: skill.group_key,
    version,
    description,
    owner: skill.owner ?? "anonymous",
    payload_ref: skill.item_ref ?? skill.payload_ref ?? "",
    download_url: skill.download_url ?? "",
    created_at: skill.created_at ?? "",
    exported_at: new Date().toISOString(),
  };

  const files = [
    { name: "SKILL.md", content: Buffer.from(skillMd, "utf-8") },
    {
      name: "manifest.json",
      content: Buffer.from(JSON.stringify(manifest, null, 2), "utf-8"),
    },
  ];
  return makeZip(files);
}

export const platformHandlers: RequestHandler[] = [
  // Skills
  http.get("/skills", () => {
    const db = loadDb();
    // 下架(deprecated)/删除(removed)/拒绝(rejected) 的 skill 不在目录对用户可见，
    // 与 /mcp 的可见性规则保持一致
    const hidden = new Set(["deprecated", "removed", "rejected"]);
    const visible = (db.skills as Array<Record<string, unknown> & { id?: string }>).filter(
      (sk) => {
        // 优先按 id 精确匹配 submission，兜底按 group_key+version 反查（种子数据 id 不一致）
        const sub = (db.submissions as Array<Record<string, unknown> & { id?: string }>).find(
          (s) => {
            if (s.id === sk.id) return true;
            const smeta = parseMetaStr(s.meta as string);
            if (
              sk.group_key &&
              sk.version &&
              smeta.group_key === sk.group_key &&
              smeta.version === sk.version
            )
              return true;
            return false;
          },
        );
        if (sub && hidden.has(String(sub.status))) return false;
        return true;
      },
    );
    return HttpResponse.json(visible);
  }),

  http.get("/skills/:group/:version/download", ({ params }) => {
    const { group, version } = params;
    const download_url = `http://localhost:8080/api/proxy/down?group=${encodeURIComponent(
      String(group),
    )}&version=${encodeURIComponent(String(version))}`;
    return HttpResponse.json({
      id: uuid(),
      group_key: group,
      version,
      download_url,
    });
  }),

  // MCPs
  http.get("/mcp", () => {
    const db = loadDb();
    // 下架(deprecated)/删除(removed)/拒绝(rejected) 的条目不在目录对用户可见
    const hidden = new Set(["deprecated", "removed", "rejected"]);
    const visible = (db.mcps as Array<Record<string, unknown>>).filter((m) => {
      // 优先按 id 精确匹配 submission，避免 payload_ref 相同的多条记录互相串号
      const sub = findSubmissionForMcp(db, m as Record<string, unknown> & { id?: string });
      if (sub && hidden.has(String(sub.status))) return false;
      return true;
    });
    return HttpResponse.json(visible);
  }),

  http.get("/mcp/:id", ({ params }) => {
    const db = loadDb();
    const id = String(params.id);
    const found = db.mcps.find((m: unknown) => (m as { id?: string }).id === id);
    if (!found) return new HttpResponse("Not found", { status: 404 });
    return HttpResponse.json(found);
  }),

  http.get("/mcp/:id/tools", async ({ params }) => {
    const id = String(params.id);
    const db = loadDb();
    const mcp = (db.mcps as Array<Record<string, unknown>>).find(
      (m) => m.id === id,
    );
    if (!mcp || !mcp.endpoint) {
      return HttpResponse.json({ tools: [], live: false });
    }
    try {
      const client = await connectClient(String(mcp.endpoint));
      const { tools } = await client.listTools();
      await client.close();
      return HttpResponse.json({
        tools: tools.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
        live: true,
      });
    } catch {
      return HttpResponse.json({ tools: [], live: false });
    }
  }),

  http.post("/mcp/call", async ({ request }) => {
    const body = (await readJson(request)) as {
      ref?: string;
      endpoint?: string;
      tool?: string;
      args?: Record<string, unknown>;
    };
    const endpoint = body.endpoint;
    if (!endpoint) {
      return HttpResponse.json(
        { ok: false, error: "该 MCP 当前未在平台运行，没有可调用端点" },
        { status: 400 },
      );
    }
    let client: Client | undefined;
    try {
      client = await connectClient(endpoint);
      if (!body.tool) {
        const { tools } = await client.listTools();
        return HttpResponse.json({
          ok: true,
          stage: "live",
          events: [
            {
              type: "tools",
              result: {
                tools: tools.map((t) => ({
                  name: t.name,
                  description: t.description,
                  inputSchema: t.inputSchema,
                })),
              },
            },
          ],
        });
      }
      const result = await client.callTool({
        name: body.tool,
        arguments: body.args ?? {},
      });
      return HttpResponse.json({
        ok: true,
        stage: "live",
        events: [{ type: "call", tool: body.tool, result }],
      });
    } catch (e) {
      return HttpResponse.json(
        { ok: false, error: e instanceof Error ? e.message : String(e) },
        { status: 502 },
      );
    } finally {
      try {
        await client?.close();
      } catch {
        /* ignore */
      }
    }
  }),

  // Submissions
  http.get("/submissions", () => {
    const db = loadDb();
    return HttpResponse.json(db.submissions);
  }),

  http.post("/submissions", async ({ request }) => {
    const body = (await readJson(request)) as {
      user_id?: string;
      type?: string;
      payload_ref?: string;
      meta?: Record<string, unknown>;
    };
    const db = loadDb();
    const id = uuid();
    const submission = {
      id,
      user_id: body.user_id ?? "anonymous",
      type: body.type ?? "mcp",
      payload_ref: body.payload_ref ?? "",
      status: "pending",
      scan_status: "ok",
      created_at: new Date().toISOString(),
      meta: body.meta ? JSON.stringify(body.meta) : undefined,
    };
    db.submissions.push(submission);
    saveDb();
    return HttpResponse.json({ id, status: "pending" }, { status: 201 });
  }),

  http.post("/submissions/:id/status", async ({ params, request }) => {
    const id = String(params.id);
    const body = (await readJson(request)) as { status?: string };
    const db = loadDb();
    const s = db.submissions.find(
      (x: unknown) => (x as { id?: string }).id === id,
    ) as
      | {
          id?: string;
          payload_ref?: string;
          meta?: string;
          status?: string;
        }
      | undefined;
    if (!s) return new HttpResponse("Not found", { status: 404 });
    s.status = body.status ?? s.status;
    if (body.status === "removed") {
      killRuntime(id);
      const mcp = findMcpForSubmission(db, s) as
        | {
            endpoint?: string;
            public_endpoint?: string;
            healthy?: boolean;
            deploy_status?: string;
          }
        | undefined;
      if (mcp) {
        mcp.endpoint = undefined;
        mcp.public_endpoint = undefined;
        mcp.healthy = false;
        mcp.deploy_status = "undeployed";
      }
    }
    saveDb();
    return HttpResponse.json({ id, status: s.status });
  }),

  http.post("/submissions/:id/approve", async ({ params, request }) => {
    const id = String(params.id);
    const body = (await readJson(request)) as {
      endpoint?: string;
      download_url?: string;
      transport?: string;
    };
    const db = loadDb();
    const s = db.submissions.find(
      (x: unknown) => (x as { id?: string }).id === id,
    ) as
      | {
          id?: string;
          status?: string;
          type?: string;
          payload_ref?: string;
          meta?: string;
          user_id?: string;
          created_at?: string;
        }
      | undefined;
    if (!s) return new HttpResponse("Not found", { status: 404 });
    s.status = "approved";
    const meta = s.meta ? JSON.parse(s.meta) : {};
    if (s.type === "mcp") {
      const mcp = {
        id: s.id,
        item_ref: meta.group_key ?? s.id,
        name: meta.name ?? s.payload_ref,
        description: "User-submitted MCP",
        payload_ref: s.payload_ref,
        owner: s.user_id,
        call_count: 0,
        favorite_count: 0,
        created_at: s.created_at,
        endpoint: body.endpoint,
        public_endpoint: body.endpoint,
        transport: body.transport ?? "http",
        deploy_status: body.endpoint ? "deployed" : "unborn",
        group_key: meta.group_key ?? s.id,
        version: meta.version ?? "1.0.0",
        registry_synced: "published",
      };
      db.mcps.push(mcp);
    } else {
      const skGroup = meta.group_key ?? s.id;
      const skVersion = meta.version ?? "1.0.0";
      const skill = {
        id: s.id,
        item_ref: skGroup,
        name: meta.name ?? s.payload_ref,
        description: meta.description ?? meta.name ?? s.payload_ref,
        // 自动生成下载链接，指向 /api/proxy/down 打包端点，
        // 让上传的 skill 与种子 skill 走同一套「含 SKILL.md 的 .zip」导出逻辑
        download_url: `http://localhost:8080/api/proxy/down?group=${encodeURIComponent(
          String(skGroup),
        )}&version=${encodeURIComponent(String(skVersion))}`,
        owner: s.user_id,
        download_count: 0,
        created_at: s.created_at,
        group_key: skGroup,
        version: skVersion,
        skill_file_count: 2,
        skill_tree: ["SKILL.md", "manifest.json"],
        registry_synced: "published",
      };
      db.skills.push(skill);
    }
    const active = db.activeVersions.find(
      (x: unknown) => (x as { group_key?: string }).group_key === meta.group_key,
    ) as { active_submission_id?: string; updated_at?: string } | undefined;
    if (active) {
      active.active_submission_id = s.id;
      active.updated_at = new Date().toISOString();
    } else {
      db.activeVersions.push({
        group_key: meta.group_key ?? s.id,
        item_type: s.type ?? "mcp",
        active_submission_id: s.id,
        updated_at: new Date().toISOString(),
      });
    }
    // 同步写入 submission.meta，供管理页读取 Registry 状态徽标
    const smeta = s.meta ? JSON.parse(s.meta) : {};
    smeta.registry_synced = "published";
    s.meta = JSON.stringify(smeta);
    saveDb();
    return HttpResponse.json({ id: s.id, status: "approved" });
  }),

  http.post("/submissions/:id/deploy", async ({ params }) => {
    const id = String(params.id);
    const db = loadDb();
    const s = db.submissions.find(
      (x: unknown) => (x as { id?: string }).id === id,
    ) as { id?: string; type?: string; meta?: string } | undefined;
    if (!s) return new HttpResponse("Not found", { status: 404 });
    // 先清掉可能残留的旧实例
    killRuntime(id);
    let port: number;
    let endpoint: string;
    try {
      ({ port, endpoint } = await spawnDemo(id));
    } catch (e) {
      const meta = parseMetaStr(s.meta);
      meta.deploy_status = "failed";
      s.meta = JSON.stringify(meta);
      const mcp = findMcpForSubmission(db, s) as { deploy_status?: string } | undefined;
      if (mcp) mcp.deploy_status = "failed";
      saveDb();
      return HttpResponse.json(
        {
          id,
          deploy_status: "failed",
          error: e instanceof Error ? e.message : String(e),
        },
        { status: 500 },
      );
    }
    const meta = parseMetaStr(s.meta);
    meta.deploy_status = "deployed";
    meta.endpoint = endpoint;
    meta.runtime_port = port;
    meta.runtime_pid = runtime.get(id)?.pid;
    s.meta = JSON.stringify(meta);
    const mcp = findMcpForSubmission(db, s) as
      | {
          deploy_status?: string;
          endpoint?: string;
          public_endpoint?: string;
          healthy?: boolean;
          transport?: string;
          runtime_port?: number;
          runtime_pid?: number;
        }
      | undefined;
    if (mcp) {
      mcp.deploy_status = "deployed";
      mcp.endpoint = endpoint;
      mcp.public_endpoint = endpoint;
      mcp.healthy = true;
      mcp.transport = "sse";
      mcp.runtime_port = port;
      mcp.runtime_pid = runtime.get(id)?.pid;
    }
    saveDb();
    return HttpResponse.json({ id, deploy_status: "deployed", endpoint });
  }),

  http.post("/submissions/:id/undeploy", ({ params }) => {
    const id = String(params.id);
    killRuntime(id);
    const db = loadDb();
    const s = db.submissions.find(
      (x: unknown) => (x as { id?: string }).id === id,
    ) as { id?: string; meta?: string } | undefined;
    if (s) {
      const meta = parseMetaStr(s.meta);
      meta.deploy_status = "undeployed";
      s.meta = JSON.stringify(meta);
      const mcp = findMcpForSubmission(db, s) as
        | {
            deploy_status?: string;
            endpoint?: string;
            public_endpoint?: string;
            healthy?: boolean;
          }
        | undefined;
      if (mcp) {
        mcp.deploy_status = "undeployed";
        mcp.endpoint = undefined;
        mcp.public_endpoint = undefined;
        mcp.healthy = false;
      }
      saveDb();
    }
    return HttpResponse.json({ id, deploy_status: "undeployed" });
  }),

  http.post("/submissions/:id/sync", ({ params }) => {
    const id = String(params.id);
    const db = loadDb();
    const s = db.submissions.find(
      (x: unknown) => (x as { id?: string }).id === id,
    ) as { id?: string; meta?: string } | undefined;
    if (s) {
      const meta = s.meta ? JSON.parse(s.meta) : {};
      meta.registry_synced = "published";
      s.meta = JSON.stringify(meta);
      const mcp = findMcpForSubmission(db, s) as { registry_synced?: string } | undefined;
      if (mcp) mcp.registry_synced = "published";
      saveDb();
    }
    return HttpResponse.json({ id, ok: true });
  }),

  // Active versions
  http.get("/active-versions", () => {
    const db = loadDb();
    return HttpResponse.json(db.activeVersions);
  }),

  // Groups
  http.get("/groups/:group_key/versions", ({ params }) => {
    const group_key = String(params.group_key);
    const db = loadDb();
    const active = db.activeVersions.find(
      (x: unknown) => (x as { group_key?: string }).group_key === group_key,
    ) as { active_submission_id?: string } | undefined;
    const versions = db.submissions
      .filter(
        (x: unknown) =>
          (x as { meta?: string }).meta &&
          (JSON.parse((x as { meta: string }).meta).group_key ?? (x as { id: string }).id) ===
            group_key,
      )
      .map((x: unknown) => {
        const sx = x as {
          id: string;
          payload_ref: string;
          meta?: string;
          created_at: string;
          status?: string;
        };
        const meta = sx.meta ? JSON.parse(sx.meta) : {};
        return {
          id: sx.id,
          payload_ref: sx.payload_ref,
          version: meta.version ?? "1.0.0",
          name: meta.name ?? sx.payload_ref,
          active: sx.id === active?.active_submission_id,
          created_at: sx.created_at,
        };
      });
    return HttpResponse.json({
      group_key,
      active_submission_id: active?.active_submission_id ?? "",
      versions,
    });
  }),

  http.post("/groups/:group_key/activate/:id", ({ params }) => {
    const { group_key, id } = params;
    const db = loadDb();
    const active = db.activeVersions.find(
      (x: unknown) => (x as { group_key?: string }).group_key === group_key,
    ) as { active_submission_id?: string; updated_at?: string } | undefined;
    if (active) {
      active.active_submission_id = String(id);
      active.updated_at = new Date().toISOString();
    }
    saveDb();
    return HttpResponse.json({ group_key, active_submission_id: String(id) });
  }),

  // Favorites
  http.get("/favorites", ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get("user_id");
    const db = loadDb();
    let list = db.favorites;
    if (userId) {
      list = list.filter(
        (f: unknown) => (f as { user_id?: string }).user_id === userId,
      );
    }
    return HttpResponse.json(list);
  }),

  http.get("/favorites/counts", ({ request }) => {
    const url = new URL(request.url);
    const itemType = url.searchParams.get("item_type");
    const db = loadDb();
    const counts: Record<string, number> = {};
    for (const f of db.favorites) {
      const ft = f as { item_type?: string; item_ref?: string };
      if (itemType && ft.item_type !== itemType) continue;
      counts[ft.item_ref ?? ""] = (counts[ft.item_ref ?? ""] ?? 0) + 1;
    }
    return HttpResponse.json(counts);
  }),

  http.post("/favorites", async ({ request }) => {
    const body = (await readJson(request)) as {
      user_id?: string;
      item_type?: string;
      item_ref?: string;
    };
    const db = loadDb();
    const id = uuid();
    const fav = {
      id,
      user_id: body.user_id ?? "anonymous",
      item_type: body.item_type ?? "mcp",
      item_ref: body.item_ref ?? "",
      created_at: new Date().toISOString(),
    };
    db.favorites.push(fav);
    saveDb();
    return HttpResponse.json({ id }, { status: 201 });
  }),

  http.delete("/favorites", async ({ request }) => {
    const body = (await readJson(request)) as {
      user_id?: string;
      item_type?: string;
      item_ref?: string;
    };
    const db = loadDb();
    db.favorites = db.favorites.filter(
      (f: unknown) =>
        !(
          (f as { user_id?: string }).user_id === body.user_id &&
          (f as { item_type?: string }).item_type === body.item_type &&
          (f as { item_ref?: string }).item_ref === body.item_ref
        ),
    );
    saveDb();
    return HttpResponse.json({ ok: true });
  }),

  // Stats
  http.get("/stats/top", () => HttpResponse.json([])),
  http.get("/stats/detail", () => HttpResponse.json([])),
  http.get("/stats/counts", () => HttpResponse.json({})),

  // Metrics
  http.post("/metrics", async ({ request }) => {
    const body = await readJson(request);
    const db = loadDb();
    db.metrics.push(body);
    saveDb();
    return HttpResponse.json({ ok: true });
  }),

  // Issues
  http.get("/issues", ({ request }) => {
    const url = new URL(request.url);
    const targetType = url.searchParams.get("target_type");
    const targetRef = url.searchParams.get("target_ref");
    const db = loadDb();
    let list = db.issues;
    if (targetType) {
      list = list.filter(
        (i: unknown) => (i as { target_type?: string }).target_type === targetType,
      );
    }
    if (targetRef) {
      list = list.filter(
        (i: unknown) => (i as { target_ref?: string }).target_ref === targetRef,
      );
    }
    return HttpResponse.json(list);
  }),

  http.post("/issues", async ({ request }) => {
    const body = (await readJson(request)) as {
      target_type?: string;
      target_ref?: string;
      title?: string;
      body?: string;
      author?: string;
    };
    const db = loadDb();
    const id = uuid();
    const issue = {
      id,
      target_type: body.target_type ?? "",
      target_ref: body.target_ref ?? "",
      title: body.title ?? "",
      body: body.body ?? "",
      author: body.author ?? "anonymous",
      status: "open",
      created_at: new Date().toISOString(),
    };
    db.issues.push(issue);
    saveDb();
    return HttpResponse.json({ id, status: "open" }, { status: 201 });
  }),

  http.put("/issues/:id", async ({ params, request }) => {
    const id = String(params.id);
    const body = (await readJson(request)) as {
      reply?: string;
      status?: string;
      reply_by?: string;
    };
    const db = loadDb();
    const issue = db.issues.find(
      (i: unknown) => (i as { id?: string }).id === id,
    ) as
      | {
          id?: string;
          reply?: string;
          status?: string;
          reply_by?: string;
          replied_at?: string;
        }
      | undefined;
    if (!issue) return new HttpResponse("Not found", { status: 404 });
    if (body.reply !== undefined) issue.reply = body.reply;
    if (body.status !== undefined) issue.status = body.status;
    if (body.reply_by !== undefined) issue.reply_by = body.reply_by;
    issue.replied_at = new Date().toISOString();
    saveDb();
    return HttpResponse.json({ id, status: issue.status });
  }),

  // Registry classify
  http.post("/registry/classify", async ({ request }) => {
    const url = new URL(request.url);
    const ref = url.searchParams.get("ref") ?? "";
    return HttpResponse.json({
      tier: ref.includes("ghcr.io") ? 2 : 3,
      registry: ref.split("/")[0] ?? "unknown",
      allowed: true,
      message: "mock classify",
      internal_registry: "",
      internal_only: false,
      trusted_registries: ["ghcr.io"],
    });
  }),

  // Proxy download: skill 卡片/详情页的 download_url 落点
  // 若带 group+version 参数：生成「含 SKILL.md 的自描述 .zip 包」；否则回退占位 gzip（兼容旧链接）
  http.get("/api/proxy/down", ({ request }) => {
    const url = new URL(request.url);
    const group = url.searchParams.get("group");
    const version = url.searchParams.get("version");
    if (group && version) {
      const db = loadDb();
      const skill = (db.skills as Array<Record<string, unknown>>).find(
        (s) => s.group_key === group && s.version === version,
      );
      if (skill) {
        const pkg = buildSkillPackage(skill);
        const base = String(group).split("/").pop() || "skill";
        const safe = `${base}-${version}.zip`.replace(/[^a-zA-Z0-9._-]/g, "_");
        return new HttpResponse(new Uint8Array(pkg), {
          status: 200,
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="${safe}"`,
            "Content-Length": String(pkg.byteLength),
          },
        });
      }
    }
    const key = url.searchParams.get("key") || "skill-package.tar.gz";
    const safeName = key.replace(/[^a-zA-Z0-9._-]/g, "_");
    // 生成一个最小可下载的 gzip 包（占位内容，兼容旧链接）
    const payload = `// Mock skill package for ${key}\n// Generated by ToolHive Cloud UI mock backend\n`;
    const gzipped = gzipSync(Buffer.from(payload, "utf-8"));
    return new HttpResponse(gzipped, {
      status: 200,
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Content-Length": String(gzipped.byteLength),
      },
    });
  }),

  // Upload
  http.post("/upload", async () =>
    HttpResponse.json({ key: `artifact-${uuid()}` }, { status: 201 }),
  ),
  http.post("/upload/tar", async () =>
    HttpResponse.json({ key: `tar-${uuid()}`, sha256: "mock", size: 0 }, { status: 201 }),
  ),
];

// 后端启动时把已部署实例重新拉起（或接管尚在运行的旧进程）
rehydrateRuntime().catch((e) =>
  console.error("[platform-mock] rehydrate failed:", e),
);
