"use client";

import { FileArchive, HelpCircle, Link2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { RegistryClassify } from "@/lib/platform-backend";
import { FilePickerField } from "./file-picker-field";

export const inputClass =
  "border-input h-11 w-full min-w-0 rounded-md border bg-transparent px-4 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]";

export const selectTriggerClass =
  "border-input h-11 w-full min-w-0 rounded-md border bg-transparent px-4 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]";

export function HintIcon({ text }: { text: string }) {
  return (
    <div
      className="inline-flex items-center gap-1 text-xs text-muted-foreground"
      title={text}
    >
      <HelpCircle className="size-3.5 cursor-help" />
      <span>说明</span>
    </div>
  );
}

interface McpSourceSectionProps {
  mcpSource: "ghcr" | "tar" | "source";
  onSourceChange: (v: "ghcr" | "tar" | "source") => void;
  imageRef: string;
  onImageRefChange: (v: string) => void;
  cls: RegistryClassify | null;
  autoMirror: boolean;
  onAutoMirrorChange: (v: boolean) => void;
  transport: string;
  onTransportChange: (v: string) => void;
  tarFile: File | null;
  onTarFile: (f: File | null) => void;
  sourceFile: File | null;
  onSourceFile: (f: File | null) => void;
  envFile: File | null;
  onEnvFile: (f: File | null) => void;
}

/** MCP 提交的来源选择区：ghcr 地址 / 镜像 tar 包 / 源码包（自动构建）+ 传输协议。 */
export function McpSourceSection({
  mcpSource,
  onSourceChange,
  imageRef,
  onImageRefChange,
  cls,
  autoMirror,
  onAutoMirrorChange,
  transport,
  onTransportChange,
  tarFile,
  onTarFile,
  sourceFile,
  onSourceFile,
  envFile,
  onEnvFile,
}: McpSourceSectionProps) {
  return (
    <div className="space-y-4">
      <Tabs
        value={mcpSource}
        onValueChange={(v) => onSourceChange(v as "ghcr" | "tar" | "source")}
      >
        <TabsList className="grid w-full max-w-xl grid-cols-3">
          <TabsTrigger value="ghcr" className="gap-1.5">
            <Link2 className="size-4" />填 ghcr 地址
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
          <label htmlFor="image_ref" className="block text-sm font-medium">
            镜像引用（image_ref）
          </label>
          <input
            id="image_ref"
            type="text"
            autoComplete="off"
            value={imageRef}
            onChange={(e) => onImageRefChange(e.target.value)}
            placeholder="ghcr.io/你的组织/my-mcp:1.0.0"
            className={inputClass}
          />
          <HintIcon text="填写外部镜像源地址（如 ghcr.io/你的组织/my-mcp:1.0.0）。审批通过后，平台会自动同步到内网仓库并部署；无需事先 push 到平台内网仓库。" />
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
                onChange={(e) => onAutoMirrorChange(e.target.checked)}
                className="mt-0.5 size-4"
              />
              <span>审批通过后自动同步到内网仓库并部署（推荐保持勾选）</span>
            </label>
          )}
        </TabsContent>

        <TabsContent value="tar" className="mt-3 space-y-3">
          <span className="block text-sm font-medium">
            镜像 tar 包（来自 docker save）
          </span>
          <FilePickerField
            id="mcp-tar-file"
            name="file"
            accept=".tar,.tar.gz,.tgz"
            buttonLabel="选择文件"
            file={tarFile}
            onFile={onTarFile}
          />
          <HintIcon text="在本地执行 docker save 镜像名:版本 -o my-mcp.tar 导出，审批后由平台直接 docker load 运行，不强制推回内网仓库。体积上限默认 2048MB，超出请改用 ghcr 地址提交。" />
        </TabsContent>

        <TabsContent value="source" className="mt-3 space-y-4">
          <div className="space-y-3">
            <span className="block text-sm font-medium">
              源码包（zip / tar.gz，平台自动构建镜像）
            </span>
            <FilePickerField
              id="mcp-source-file"
              name="source_file"
              accept=".zip,.tar.gz,.tgz"
              buttonLabel="选择源码包"
              file={sourceFile}
              onFile={onSourceFile}
            />
            <HintIcon text="源码包内需包含 package.json（Node）或 requirements.txt / pyproject.toml（Python）；平台自动生成 Dockerfile 构建，容器内服务监听 3000 端口。上限 20MB。" />
          </div>

          <div className="space-y-3">
            <span className="block text-sm font-medium">
              私密配置 .env（可选）
            </span>
            <FilePickerField
              id="mcp-env-file"
              name="env_file"
              buttonLabel="选择 .env 文件"
              file={envFile}
              onFile={onEnvFile}
            />
            <HintIcon text="API Key、密码等私密配置放这里，不要打进源码包。值经 ToolHive 加密凭据库存储，部署时注入环境变量；平台与审计日志中全程不出现明文。" />
          </div>
        </TabsContent>
      </Tabs>

      <div className="space-y-2">
        <label htmlFor="transport" className="block text-sm font-medium">
          传输协议（transport）
        </label>
        <Select
          name="transport"
          value={transport}
          onValueChange={onTransportChange}
        >
          <SelectTrigger id="transport" className={selectTriggerClass}>
            <SelectValue placeholder="自动检测">
              {transport === "auto" ? "自动检测" : transport}
            </SelectValue>
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
  );
}
