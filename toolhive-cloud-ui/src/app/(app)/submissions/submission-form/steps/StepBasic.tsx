// submission-form/steps/StepBasic.tsx —— 第 1 步：基本信息（自检整改重构④ 自主文件拆出）。
// 字段常挂载（hidden 时 DOM 保留），FormData 完整性不受分步影响。
"use client";

import { Hint } from "@/components/hint";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inputClass, selectTriggerClass } from "../../mcp-source-section";
import type { SubmissionFormState } from "../use-submission-form";

export function StepBasic({
  f,
  onNext,
}: {
  f: SubmissionFormState;
  onNext: () => void;
}) {
  return (
    <section className="rounded-xl border p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          1
        </span>
        <h3 className="font-medium">基本信息</h3>
        <span className="text-xs text-muted-foreground">
          类型、引用与展示名称
        </span>
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[180px_1fr_1fr]">
          <div className="space-y-2">
            <label
              htmlFor="submission-type"
              className="block text-sm font-medium"
            >
              类型
            </label>
            <Select
              value={f.type}
              onValueChange={(value) => f.setType(value as "mcp" | "skill")}
            >
              <SelectTrigger
                id="submission-type"
                className={selectTriggerClass}
              >
                <SelectValue placeholder="选择类型">
                  {f.type === "mcp" ? "MCP Server" : "Skills"}
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
              引用
            </label>
            <input
              id="payload_ref"
              name="payload_ref"
              placeholder="dws-explorer:1.0.0"
              className={inputClass}
              value={f.payloadRef}
              onChange={(e) => f.setPayloadRef(e.target.value)}
            />
            <Hint text="提交引用（payload_ref）：产品名:版本号，如 dws-explorer:1.0.0。系统据此自动分组并识别版本，同名产品多版本可并存。">
              <span>格式建议</span>
            </Hint>
          </div>

          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium">
              名称（必填）
            </label>
            <input
              id="name"
              name="name"
              placeholder="DWS 数据探查器"
              className={inputClass}
              value={f.name}
              onChange={(e) => f.setName(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="group_key" className="block text-sm font-medium">
              产品标识（可选）
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
              版本号（可选）
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
            仓库地址（可选）
          </label>
          <input
            id="repository_url"
            name="repository_url"
            placeholder="https://github.com/你的组织/你的仓库"
            className={inputClass}
          />
          <p className="text-xs text-muted-foreground">
            填写后详情页会展示仓库入口（最新代码 / 最新
            README）；不填则以上传的源码包为准。
          </p>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button type="button" onClick={onNext} disabled={!f.basicOk}>
          下一步
        </Button>
      </div>
    </section>
  );
}
