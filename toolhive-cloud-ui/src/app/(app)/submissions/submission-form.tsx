"use client";

import { HelpCircle } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RegistryClassify } from "@/lib/platform-backend";
import { classifyRegistryAction } from "./actions";
import {
  inputClass,
  McpSourceSection,
  selectTriggerClass,
} from "./mcp-source-section";
import { SkillSourceSection } from "./skill-source-section";

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
  const [mcpSource, setMcpSource] = useState<"ghcr" | "tar" | "source">("ghcr");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [envFile, setEnvFile] = useState<File | null>(null);
  const [tarFile, setTarFile] = useState<File | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [skillSource, setSkillSource] = useState<"file" | "url">("file");
  const [error, setError] = useState("");
  // 报错统一以 toast 弹出（自动消失、点击可关），不再在表单内嵌红字
  useEffect(() => {
    if (error) toast.error(error, { duration: 6000 });
  }, [error]);
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

  function validateSkillExtension(filename: string) {
    const lower = filename.toLowerCase();
    const allowed = [".zip", ".tar.gz", ".tgz", ".tar"];
    return allowed.some((ext) => lower.endsWith(ext));
  }

  function resetFormState() {
    setFile(null);
    setSkillSource("file");
    setImageRef("");
    setMcpSource("ghcr");
    setTarFile(null);
    setSourceFile(null);
    setEnvFile(null);
    setAutoMirror(false);
    setCls(null);
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
              setError(
                "镜像包仅支持 .tar / .tar.gz / .tgz（请使用 docker save 导出）",
              );
              return;
            }
            // file 已在 form 中，Server Action 会读取并上传到 /upload/tar
          } else if (mcpSource === "source") {
            if (!sourceFile) {
              setError(
                "请选择源码包文件（zip / tar.gz，含 package.json 或 requirements.txt）",
              );
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
            if (
              envFile &&
              !/\.env/i.test(envFile.name) &&
              !envFile.name.includes("env")
            ) {
              setError("私密配置文件请使用 .env 格式");
              return;
            }
            // source_file / env_file 已在 form 中，Server Action 会走源码构建提交链
          } else {
            if (!imageRef.trim()) {
              setError(
                "请填写外部镜像源地址（如 ghcr.io/你的组织/my-mcp:1.0.0）",
              );
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
        resetFormState();
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
            className="block text-sm font-medium"
          >
            类型
          </label>
          <Select
            value={type}
            onValueChange={(value) => setType(value as "mcp" | "skill")}
          >
            <SelectTrigger id="submission-type" className={selectTriggerClass}>
              <SelectValue placeholder="选择类型">
                {type === "mcp" ? "MCP Server" : "Skills"}
              </SelectValue>
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
          <label htmlFor="payload_ref" className="block text-sm font-medium">
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
          <label htmlFor="name" className="block text-sm font-medium">
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
          <label htmlFor="group_key" className="block text-sm font-medium">
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
          <label htmlFor="version" className="block text-sm font-medium">
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
        <label htmlFor="repository_url" className="block text-sm font-medium">
          仓库地址（repository_url，可选）
        </label>
        <input
          id="repository_url"
          name="repository_url"
          placeholder="https://github.com/你的组织/你的仓库"
          className={inputClass}
        />
        <p className="text-xs text-muted-foreground">
          可选：开源上游仓库地址。填写后详情页展示仓库入口（最新代码 /
          最新 README）；不填则以上传的源码包为准。
        </p>
      </div>

      {isMcp ? (
        <McpSourceSection
          mcpSource={mcpSource}
          onSourceChange={setMcpSource}
          imageRef={imageRef}
          onImageRefChange={setImageRef}
          cls={cls}
          autoMirror={autoMirror}
          onAutoMirrorChange={setAutoMirror}
          transport={transport}
          onTransportChange={setTransport}
          tarFile={tarFile}
          onTarFile={setTarFile}
          sourceFile={sourceFile}
          onSourceFile={setSourceFile}
          envFile={envFile}
          onEnvFile={setEnvFile}
        />
      ) : (
        <SkillSourceSection
          skillSource={skillSource}
          onSourceChange={setSkillSource}
          file={file}
          onFile={setFile}
        />
      )}

      <div className="w-full space-y-2">
        <label htmlFor="description" className="block text-sm font-medium">
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

      <div className="flex justify-end">
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="text-base"
        >
          {pending ? "提交中…" : "提交"}
        </Button>
      </div>
    </form>
  );
}
