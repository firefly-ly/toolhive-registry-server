// submission-form/steps/StepType.tsx —— 第 0 步：选择类型（MCP / Skill 分道，效果图 03）。
// 自检整改重构④ 自主文件拆出。类型状态由 use-submission-form 持有。
"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SubmissionFormState } from "../use-submission-form";

export function StepType({ f }: { f: SubmissionFormState }) {
  return (
    <section>
      <p className="mb-3.5 text-[14px] font-semibold tracking-[0.15em] text-muted-foreground">
        条目类型（决定后续流程，提交后不可更改）
      </p>
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        {/* MCP 大卡：52px 蓝拱内嵌琥珀圆点，选中 2px 黑边 + 琥珀垂片 */}
        <button
          type="button"
          onClick={() => f.setType("mcp")}
          aria-pressed={f.isMcp}
          className={cn(
            "relative cursor-pointer overflow-hidden rounded-xl p-5 text-left transition-colors",
            f.isMcp
              ? "border-2 border-foreground bg-card"
              : "border-[1.5px] border-border bg-card hover:border-muted-foreground/60",
          )}
        >
          {f.isMcp && (
            <span className="absolute top-0 right-4.5 rounded-b-lg bg-highlight px-3 py-1 text-[12.5px] font-semibold text-foreground">
              已选
            </span>
          )}
          <span
            aria-hidden
            className="relative block size-13 rounded-t-full bg-info"
          >
            <span className="absolute top-6.5 left-4 size-5 rounded-full bg-highlight" />
          </span>
          <b className="mt-3.5 block text-[19px]">MCP 服务</b>
          <p className="mt-1.5 text-xs leading-[1.7] text-muted-foreground">
            给助手接入外部能力的工具服务：部署运行、被调用、可回滚。
          </p>
          <div className="mt-3 flex flex-col gap-1 text-[14.5px] text-success">
            <span>✓ 镜像地址 / tar 包 / 源码包三种来源</span>
            <span>✓ 审批通过后自动部署，支持版本回滚</span>
            <span>✓ 统计调用量 / 延迟 / 失败率</span>
          </div>
        </button>
        {/* Skill 大卡：52px 绿圆内嵌琥珀山形 */}
        <button
          type="button"
          onClick={() => f.setType("skill")}
          aria-pressed={!f.isMcp}
          className={cn(
            "relative cursor-pointer overflow-hidden rounded-xl p-5 text-left transition-colors",
            !f.isMcp
              ? "border-2 border-foreground bg-card"
              : "border-[1.5px] border-border bg-card hover:border-muted-foreground/60",
          )}
        >
          {!f.isMcp && (
            <span className="absolute top-0 right-4.5 rounded-b-lg bg-highlight px-3 py-1 text-[12.5px] font-semibold text-foreground">
              已选
            </span>
          )}
          <span
            aria-hidden
            className="relative block size-13 rounded-full bg-success"
          >
            <span className="absolute bottom-1.5 left-3.5 h-4 w-7.5 bg-highlight [clip-path:polygon(0_100%,50%_0,100%_100%)]" />
          </span>
          <b
            className={cn(
              "mt-3.5 block text-[19px]",
              !f.isMcp ? "" : "text-muted-foreground",
            )}
          >
            Skill 技能
          </b>
          <p className="mt-1.5 text-xs leading-[1.7] text-muted-foreground">
            打包上传的提示词技能：上传时自动校验，审批通过后上架下载。
          </p>
          <div className="mt-3 flex flex-col gap-1 text-[14.5px] text-success">
            <span>✓ zip / tar.gz 上传，SKILL.md 自动校验</span>
            <span>✓ 审批通过后上架，按权限下载</span>
            <span>✓ 统计下载量与版本分布</span>
          </div>
        </button>
      </div>
      <div className="mt-6 flex justify-end">
        <Button type="button" size="lg" onClick={() => f.setStep(1)}>
          下一步：基本信息 →
        </Button>
      </div>
    </section>
  );
}
