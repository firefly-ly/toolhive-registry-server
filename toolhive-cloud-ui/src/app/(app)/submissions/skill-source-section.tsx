"use client";

import { FileArchive, Link2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FilePickerField } from "./file-picker-field";
import { HintIcon, inputClass } from "./mcp-source-section";

interface SkillSourceSectionProps {
  skillSource: "file" | "url";
  onSourceChange: (v: "file" | "url") => void;
  file: File | null;
  onFile: (f: File | null) => void;
}

/** Skill 提交的来源选择区：本地上传 / 文件位置（URL 或本地/UNC 路径）。 */
export function SkillSourceSection({
  skillSource,
  onSourceChange,
  file,
  onFile,
}: SkillSourceSectionProps) {
  return (
    <div className="space-y-3">
      <span className="block text-sm font-medium">
        上传技能包（.zip / .tar.gz / .tgz / .tar）
      </span>
      <Tabs
        value={skillSource}
        onValueChange={(v) => onSourceChange(v as "file" | "url")}
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
          <FilePickerField
            id="skill-file"
            name="file"
            accept=".tar.gz,.tgz,.zip,.tar"
            buttonLabel="选择文件"
            file={file}
            onFile={onFile}
          />
        </TabsContent>

        <TabsContent value="url" className="mt-3 space-y-3">
          <label htmlFor="download_url" className="sr-only">
            文件位置
          </label>
          <input
            id="download_url"
            name="download_url"
            type="text"
            placeholder="https://内网地址/xxx.zip  或  C:\path\to\xxx.zip  或  \\server\share\xxx.zip"
            className={inputClass}
          />
          <HintIcon text="支持 http/https 下载链接，或本平台可访问的本地绝对路径（含 UNC 共享路径）。" />
        </TabsContent>
      </Tabs>
      <HintIcon text="把本地写好的 skill 目录打包为 .zip / .tar.gz / .tgz / .tar 上传。包内必须包含 SKILL.md，且 SKILL.md 顶部需有 YAML front matter（name / description），否则会被拒绝。这些格式与 WorkBuddy 添加技能的导入方式兼容，下载后可直接上传使用。" />
    </div>
  );
}
