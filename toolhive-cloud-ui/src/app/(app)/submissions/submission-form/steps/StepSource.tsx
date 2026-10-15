// submission-form/steps/StepSource.tsx —— 第 2 步：制品来源（自检整改重构④ 自主文件拆出）。
// MCP 委派 McpSourceSection（ghcr/tar/源码三分支 + 数据源声明）；Skill 委派 SkillSourceSection。
// 字段常挂载（hidden 时 DOM 保留），FormData 完整性不受分步影响。
"use client";

import { Button } from "@/components/ui/button";
import { McpSourceSection } from "../../mcp-source-section";
import { SkillSourceSection } from "../../skill-source-section";
import type { SubmissionFormState } from "../use-submission-form";

export function StepSource({
  f,
  onPrev,
  onNext,
}: {
  f: SubmissionFormState;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <section className="rounded-xl border p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          2
        </span>
        <h3 className="font-medium">制品来源</h3>
        <span className="text-xs text-muted-foreground">
          {f.isMcp ? "镜像 / tar 包 / 源码构建" : "技能包文件或下载地址"}
        </span>
      </div>
      {f.isMcp ? (
        <McpSourceSection
          mcpSource={f.mcpSource}
          onSourceChange={f.setMcpSource}
          imageRef={f.imageRef}
          onImageRefChange={f.setImageRef}
          cls={f.cls}
          autoMirror={f.autoMirror}
          onAutoMirrorChange={f.setAutoMirror}
          transport={f.transport}
          onTransportChange={f.setTransport}
          tarFile={f.tarFile}
          onTarFile={f.setTarFile}
          sourceFile={f.sourceFile}
          onSourceFile={f.setSourceFile}
          envFile={f.envFile}
          onEnvFile={f.setEnvFile}
          dataSourceType={f.dataSourceType}
          onDataSourceTypeChange={f.setDataSourceType}
          dataSourceTargets={f.dataSourceTargets}
          onDataSourceTargetsChange={f.setDataSourceTargets}
          dataSourceNote={f.dataSourceNote}
          onDataSourceNoteChange={f.setDataSourceNote}
        />
      ) : (
        <SkillSourceSection
          skillSource={f.skillSource}
          onSourceChange={f.setSkillSource}
          file={f.file}
          onFile={f.setFile}
        />
      )}
      <div className="mt-4 flex justify-between">
        <Button type="button" variant="ghost" onClick={onPrev}>
          上一步
        </Button>
        <Button type="button" onClick={onNext} disabled={!f.sourceReady}>
          下一步
        </Button>
      </div>
    </section>
  );
}
