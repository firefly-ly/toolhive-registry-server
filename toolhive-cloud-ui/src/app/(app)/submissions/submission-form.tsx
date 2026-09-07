"use client";

import { FileArchive, HelpCircle, Link2, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { RegistryClassify } from "@/lib/platform-backend";
import { classifyRegistryAction } from "./actions";

const inputClass =
  "border-input h-11 w-full min-w-0 rounded-md border bg-transparent px-4 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]";

const selectTriggerClass =
  "border-input h-11 w-full min-w-0 rounded-md border bg-transparent px-4 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]";

interface SubmissionFormProps {
  action: (formData: FormData) => Promise<{
    ok: boolean;
    error?: string;
    existing_id?: string;
    existing_status?: string;
  }>;
}

export function SubmissionForm({ action }: SubmissionFormProps) {
  const [type, setType] = useState<"mcp" | "skill">("skill");
  const [transport, setTransport] = useState("auto");
  const [imageRef, setImageRef] = useState("");
  const [mcpSource, setMcpSource] = useState<"ghcr" | "tar" | "source">(
    "ghcr",
  );
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [envFile, setEnvFile] = useState<File | null>(null);
  const [tarFile, setTarFile] = useState<File | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [skillSource, setSkillSource] = useState<"file" | "url">("file");
  const [error, setError] = useState("");
  const [cls, setCls] = useState<RegistryClassify | null>(null);
  const [autoMirror, setAutoMirror] = useState(false);
  const [pending, startTransition] = useTransition();

  const isMcp = type === "mcp";

  // 镜像来源实时校验：debounce 400ms 后查后端分级结果（仅 ghcr 来源需要）。
  // 白名单以后端配置为准，前端不另存一份，避免两边不一致。
  useEffect(() => {
    if (!isMcp || mcpSource !== "ghcr") {
      setCls(null);
      return;
    }
    const ref = imageRef.trim();
    if (!ref) {
      setCls(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      classifyRegistryAction(ref).then((r) => {
        if (!cancelled) setCls(r);
      });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [imageRef, isMcp, mcpSource]);

  // 外部受信源默认开启自动同步；平台后端在审批阶段也会强制 mirror，这里只是给用户明示。
  useEffect(() => {
    if (cls?.tier === 2) setAutoMirror(true);
  }, [cls]);

  function formatSize(bytes: number) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / k ** i).toFixed(i > 0 ? 1 : 0)} ${sizes[i]}`;
  }

  function validateSkillExtension(filename: string) {
    const lower = filename.toLowerCase();
    const allowed = [".zip", ".tar.gz", ".tgz", ".tar"];
    return allowed.some((ext) => lower.endsWith(ext));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    // 事件对象不能跨异步边界使用；进入 startTransition 前捕获 form 引用。
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      try {
        if (isMcp) {
          fd.set("mcp_source", mcpSource);
          if (mcpSource === "tar") {
            if (!tarFile) {
              setError("请选择要上传的镜像 tar 包（来自 docker save）");
              return;
            }
            if (!/\.(tar|tar\.gz|tgz)$/i.test(tarFile.name)) {
              setError("镜像包仅支持 .tar / .tar.gz / .tgz（请使用 docker save 导出）");
              return;
            }
            // file 已在 form 中，Server Action 会读取并上传到 /upload/tar
          } else if (mcpSource === "source") {
            if (!sourceFile) {
              setError("请选择源码包文件（zip / tar.gz，含 package.json 或 requirements.txt）");
              return;
            }
            if (!/\.(zip|tar\.gz|tgz)$/i.test(sourceFile.name)) {
              setError("源码包仅支持 .zip / .tar.gz / .tgz 格式");
              return;
            }
            if (sourceFile.size > 20 * 1024 * 1024) {
              setError("源码包上限 20MB");
              return;
            }
            if (envFile && !/\.env/i.test(envFile.name) && !envFile.name.includes("env")) {
              setError("私密配置文件请使用 .env 格式");
              return;
            }
            // source_file / env_file 已在 form 中，Server Action 会走源码构建提交链
          } else {
            if (!imageRef.trim()) {
              setError("请填写外部镜像源地址（如 ghcr.io/你的组织/my-mcp:1.0.0）");
              return;
            }
            // 未知来源先在本地拦一道，不必发到后端才报错
            if (cls && !cls.allowed) {
              setError(`镜像来源未通过校验：${cls.message}`);
              return;
            }
            fd.set("image_ref", imageRef.trim());
            if (transport !== "auto") fd.set("transport", transport);
            else fd.delete("transport");
            if (autoMirror) fd.set("auto_mirror", "1");
            else fd.delete("auto_mirror");
          }
        } else {
          if (skillSource === "file") {
            if (!file) {
              setError("请选择要上传的技能包文件");
              return;
            }
            if (!validateSkillExtension(file.name)) {
              setError("技能包只支持 .zip / .tar.gz / .tgz / .tar 格式");
              return;
            }
            // file 已在 form 中，Server Action 会读取并上传
          } else {
            const url = String(fd.get("download_url") ?? "").trim();
            if (!url) {
              setError("请填写技能包文件所在位置");
              return;
            }
            fd.delete("file");
          }
        }
        const result = await action(fd);
        // 后端拦截（去重 409 / 限流 429 等）：保留表单内容，直接回显错误
        if (result && !result.ok) {
          const hint = result.existing_id
            ? `（已存在提交 ${result.existing_id}，状态：${result.existing_status}）`
            : "";
          setError(result.error + hint);
          return;
        }
        // 成功才重置 DOM
        form.reset();
        setFile(null);
        setSkillSource("file");
        setImageRef("");
        setMcpSource("ghcr");
        setTarFile(null);
        setSourceFile(null);
        setEnvFile(null);
        setAutoMirror(false);
        setCls(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`提交发生异常：${msg}`);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="type" value={type} />

      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[180px_1fr_1fr]">
        <div className="space-y-2">
          <label
            htmlFor="submission-type"
            className="block text-base text-muted-foreground"
          >
            类型
          </label>
          <Select
            value={type}
            onValueChange={(value) => setType(value as "mcp" | "skill")}
          >
            <SelectTrigger id="submission-type" className={selectTriggerClass}>
              <SelectValue placeholder="选择类型" />
            </SelectTrigger>
            <SelectContent
              position="popper"
              className="w-[var(--radix-select-trigger-width)]"
            >
              <SelectItem value="mcp">MCP Server</SelectItem>
              <SelectItem value="skill">Skills</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="payload_ref"
            className="block text-base text-muted-foreground"
          >
            引用（payload_ref）
          </label>
          <input
            id="payload_ref"
            name="payload_ref"
            placeholder={isMcp ? "dws-explorer:1.0.0" : "dws-explorer:1.0.0"}
            className={inputClass}
            required
          />
          <div
            className="inline-flex items-center gap-1 text-xs text-muted-foreground"
            title="格式建议：产品名:版本号（如 dws-explorer:1.0.0）。系统据此自动分组并识别版本，同名产品多版本可并存。"
          >
            <HelpCircle className="size-3.5 cursor-help" />
            <span>格式建议</span>
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="name"
            className="block text-base text-muted-foreground"
          >
            名称{isMcp ? "（可选）" : "（必填）"}
          </label>
          <input
            id="name"
            name="name"
            placeholder="DWS 数据探查器"
            className={inputClass}
            required={!isMcp}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="group_key"
            className="block text-base text-muted-foreground"
          >
            产品标识 group_key（可选）
          </label>
          <input
            id="group_key"
            name="group_key"
            placeholder="默认从引用中提取，如 dws-explorer"
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="version"
            className="block text-base text-muted-foreground"
          >
            版本号 version（可选）
          </label>
          <input
            id="version"
            name="version"
            placeholder="默认从引用中提取，如 1.0.0"
            className={inputClass}
          />
      </div>
    </div>

      <div className="w-full space-y-2">
        <label
          htmlFor="repository_url"
          className="block text-base text-muted-foreground"
        >
          仓库地址（repository_url，可选）
        </label>
        <input
          id="repository_url"
          name="repository_url"
          placeholder="https://github.com/你的组织/你的仓库"
          className={inputClass}
        />
        <p className="text-xs text-muted-foreground">
          填写后详情页可外链到源码仓库查看 README / Code / Issues。
        </p>
      </div>

    {isMcp ? (
        <div className="space-y-4">
          <Tabs
            value={mcpSource}
            onValueChange={(v) => setMcpSource(v as "ghcr" | "tar" | "source")}
          >
            <TabsList className="grid w-full max-w-xl grid-cols-3">
              <TabsTrigger value="ghcr" className="gap-1.5">
                <Link2 className="size-4" />
                填 ghcr 地址
              </TabsTrigger>
              <TabsTrigger value="tar" className="gap-1.5">
                <FileArchive className="size-4" />
                上传镜像 tar 包
              </TabsTrigger>
              <TabsTrigger value="source" className="gap-1.5">
                <FileArchive className="size-4" />
                源码包（自动构建）
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ghcr" className="mt-3 space-y-2">
              <label
                htmlFor="image_ref"
                className="block text-base text-muted-foreground"
              >
                镜像引用（image_ref）
              </label>
              <input
                id="image_ref"
                type="text"
                autoComplete="off"
                value={imageRef}
                onChange={(e) => setImageRef(e.target.value)}
                placeholder="ghcr.io/你的组织/my-mcp:1.0.0"
                className={inputClass}
              />
              <div
                className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                title="填写外部镜像源地址（如 ghcr.io/你的组织/my-mcp:1.0.0）。审批通过后，平台会自动同步到内网仓库并部署；无需事先 push 到平台内网仓库。"
              >
                <HelpCircle className="size-3.5 cursor-help" />
                <span>镜像源说明</span>
              </div>
              {cls && (
                <p
                  className={`text-xs ${
                    cls.tier === 1
                      ? "text-red-600"
                      : cls.tier === 2
                        ? "text-amber-700"
                        : "text-red-600"
                  }`}
                >
                  {cls.tier === 1
                    ? cls.message
                    : cls.tier === 2
                      ? `受信外部源（${cls.registry}），审批通过后将自动同步到内网仓库`
                      : cls.message}
                </p>
              )}
              {cls && cls.tier === 2 && (
                <label className="flex items-start gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    name="auto_mirror"
                    value="1"
                    checked={autoMirror}
                    onChange={(e) => setAutoMirror(e.target.checked)}
                    className="mt-0.5 size-4"
                  />
                  <span>审批通过后自动同步到内网仓库并部署（推荐保持勾选）</span>
                </label>
              )}
            </TabsContent>

            <TabsContent value="tar" className="mt-3 space-y-3">
              <span className="block text-base text-muted-foreground">
                镜像 tar 包（来自 docker save）
              </span>
              <div className="flex items-start gap-3">
                <label
                  htmlFor="mcp-tar-file"
                  className="inline-flex h-11 shrink-0 cursor-pointer items-center rounded-md border-0 bg-primary px-4 py-2 text-base font-medium text-primary-foreground hover:bg-primary/90"
                >
                  选择文件
                </label>
                <input
                  id="mcp-tar-file"
                  name="file"
                  type="file"
                  accept=".tar,.tar.gz,.tgz"
                  onChange={(e) => setTarFile(e.target.files?.[0] ?? null)}
                  className="sr-only"
                />
                {tarFile ? (
                  <div className="flex min-w-0 items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-foreground">
                    <FileArchive className="size-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {tarFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatSize(tarFile.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTarFile(null);
                        const input = document.getElementById(
                          "mcp-tar-file",
                        ) as HTMLInputElement | null;
                        if (input) input.value = "";
                      }}
                      className="ml-1 rounded p-1 hover:bg-primary/20"
                      aria-label="清除已选文件"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    未选择文件
                  </span>
                )}
              </div>
              <div
                className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                title="在本地执行 docker save 镜像名:版本 -o my-mcp.tar 导出，审批后由平台直接 docker load 运行，不强制推回内网仓库。体积上限默认 2048MB，超出请改用 ghcr 地址提交。"
              >
                <HelpCircle className="size-3.5 cursor-help" />
                <span>上传说明</span>
              </div>
            </TabsContent>

            <TabsContent value="source" className="mt-3 space-y-4">
              <div className="space-y-3">
                <span className="block text-base text-muted-foreground">
                  源码包（zip / tar.gz，平台自动构建镜像）
                </span>
                <div className="flex items-start gap-3">
                  <label
                    htmlFor="mcp-source-file"
                    className="inline-flex h-11 shrink-0 cursor-pointer items-center rounded-md border-0 bg-primary px-4 py-2 text-base font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    选择源码包
                  </label>
                  <input
                    id="mcp-source-file"
                    name="source_file"
                    type="file"
                    accept=".zip,.tar.gz,.tgz"
                    onChange={(e) => setSourceFile(e.target.files?.[0] ?? null)}
                    className="sr-only"
                  />
                  {sourceFile ? (
                    <div className="flex min-w-0 items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-foreground">
                      <FileArchive className="size-4 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {sourceFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatSize(sourceFile.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSourceFile(null);
                          const input = document.getElementById(
                            "mcp-source-file",
                          ) as HTMLInputElement | null;
                          if (input) input.value = "";
                        }}
                        className="ml-1 rounded p-1 hover:bg-primary/20"
                        aria-label="清除已选文件"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      未选择文件
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  源码包内需包含{" "}
                  <code className="font-mono">package.json</code>（Node）或{" "}
                  <code className="font-mono">requirements.txt / pyproject.toml</code>
                  （Python）；平台自动生成 Dockerfile 构建，容器内服务监听{" "}
                  <b>3000</b> 端口。上限 20MB。
                </p>
              </div>

              <div className="space-y-3">
                <span className="block text-base text-muted-foreground">
                  私密配置 .env（可选，强烈推荐）
                </span>
                <div className="flex items-start gap-3">
                  <label
                    htmlFor="mcp-env-file"
                    className="inline-flex h-11 shrink-0 cursor-pointer items-center rounded-md border-0 bg-primary px-4 py-2 text-base font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    选择 .env 文件
                  </label>
                  <input
                    id="mcp-env-file"
                    name="env_file"
                    type="file"
                    accept=".env,.txt"
                    onChange={(e) => setEnvFile(e.target.files?.[0] ?? null)}
                    className="sr-only"
                  />
                  {envFile ? (
                    <div className="flex min-w-0 items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-foreground">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {envFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatSize(envFile.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEnvFile(null);
                          const input = document.getElementById(
                            "mcp-env-file",
                          ) as HTMLInputElement | null;
                          if (input) input.value = "";
                        }}
                        className="ml-1 rounded p-1 hover:bg-primary/20"
                        aria-label="清除已选文件"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      未选择文件
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  API Key、密码等私密配置放这里，<b>不要打进源码包</b>。
                  值经 ToolHive 加密凭据库存储，部署时注入环境变量；平台与审计日志中全程不出现明文。
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <label
              htmlFor="transport"
              className="block text-base text-muted-foreground"
            >
              传输协议（transport）
            </label>
            <Select
              name="transport"
              value={transport}
              onValueChange={setTransport}
            >
              <SelectTrigger id="transport" className={selectTriggerClass}>
                <SelectValue placeholder="自动检测" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                className="w-[var(--radix-select-trigger-width)]"
              >
                <SelectItem value="auto">自动检测</SelectItem>
                <SelectItem value="streamable-http">streamable-http</SelectItem>
                <SelectItem value="sse">sse</SelectItem>
                <SelectItem value="stdio">stdio</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <span className="block text-base text-muted-foreground">
            上传技能包（.zip / .tar.gz / .tgz / .tar）
          </span>
          <Tabs
            value={skillSource}
            onValueChange={(v) => setSkillSource(v as "file" | "url")}
          >
            <TabsList className="grid w-full max-w-xs grid-cols-2">
              <TabsTrigger value="file" className="gap-1.5">
                <FileArchive className="size-4" />
                本地上传
              </TabsTrigger>
              <TabsTrigger value="url" className="gap-1.5">
                <Link2 className="size-4" />
                文件位置
              </TabsTrigger>
            </TabsList>

            <TabsContent value="file" className="mt-3 space-y-3">
              <div className="flex items-start gap-3">
                <label
                  htmlFor="skill-file"
                  className="inline-flex h-11 shrink-0 cursor-pointer items-center rounded-md border-0 bg-primary px-4 py-2 text-base font-medium text-primary-foreground hover:bg-primary/90"
                >
                  选择文件
                </label>
                <input
                  id="skill-file"
                  name="file"
                  type="file"
                  accept=".tar.gz,.tgz,.zip,.tar"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="sr-only"
                />
                {file ? (
                  <div className="flex min-w-0 items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-foreground">
                    <FileArchive className="size-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatSize(file.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        const input = document.getElementById(
                          "skill-file",
                        ) as HTMLInputElement | null;
                        if (input) input.value = "";
                      }}
                      className="ml-1 rounded p-1 hover:bg-primary/20"
                      aria-label="清除已选文件"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    未选择文件
                  </span>
                )}
              </div>
            </TabsContent>

            <TabsContent value="url" className="mt-3 space-y-3">
              <label htmlFor="download_url" className="sr-only">
                文件位置
              </label>
              <input
                id="download_url"
                name="download_url"
                type="text"
                placeholder="https://内网地址/xxx.zip  或  C:\\path\\to\\xxx.zip  或  \\\\server\\share\\xxx.zip"
                className={inputClass}
              />
              <p className="text-xs text-muted-foreground">
                支持 http/https 下载链接，或本平台可访问的本地绝对路径（含 UNC
                共享路径）。
              </p>
            </TabsContent>
          </Tabs>
          <p className="text-xs text-muted-foreground">
            把本地写好的 skill 目录打包为 .zip / .tar.gz / .tgz / .tar
            上传。包内必须包含 SKILL.md，且 SKILL.md 顶部需有 YAML front matter
            （name / description），否则会被拒绝。这些格式与 WorkBuddy
            添加技能的导入方式兼容，下载后可直接上传使用。
          </p>
        </div>
      )}

      <div className="w-full space-y-2">
        <label
          htmlFor="description"
          className="block text-base text-muted-foreground"
        >
          描述{isMcp ? "（可选）" : "（必填）"}
        </label>
        <input
          id="description"
          name="description"
          placeholder={
            isMcp
              ? "一句话描述这个 MCP Server 能做什么"
              : "一句话描述这个技能能做什么"
          }
          className={inputClass}
          required={!isMcp}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={pending} className="text-base">
          {pending ? "提交中…" : "提交"}
        </Button>
      </div>
    </form>
  );
}
