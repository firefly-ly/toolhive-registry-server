// submission-form/steps/StepReview.tsx —— 第 3 步：描述 + 发布前检查单 + 提交（自检整改重构④）。
// 提交按钮 type=submit（位于 form 内），全绿才亮钮；描述 Skill 必填。
"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { inputClass } from "../../mcp-source-section";
import type { SubmissionFormState } from "../use-submission-form";

/** 校验清单单条：ok=通过（绿），否则红；pending=提交时校验（琥珀） */
function CheckItem({
  ok,
  pending,
  label,
}: {
  ok: boolean;
  pending?: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={cn(
          "flex size-4.5 shrink-0 items-center justify-center rounded-full text-xs font-medium",
          ok
            ? "bg-success/15 text-success"
            : pending
              ? "bg-warning/15 text-warning"
              : "bg-destructive/15 text-destructive",
        )}
      >
        {ok ? "✓" : pending ? "⟳" : "✕"}
      </span>
      <span className={ok ? "" : pending ? "text-muted-foreground" : ""}>
        {label}
      </span>
    </div>
  );
}

export function StepReview({
  f,
  onPrev,
}: {
  f: SubmissionFormState;
  onPrev: () => void;
}) {
  return (
    <section className="rounded-xl border p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          3
        </span>
        <h3 className="font-medium">描述与提交</h3>
        <span className="text-xs text-muted-foreground">
          描述会展示在目录卡片上
        </span>
      </div>
      <div className="space-y-4">
        <div className="w-full space-y-2">
          <label htmlFor="description" className="block text-sm font-medium">
            描述{f.isMcp ? "（可选）" : "（必填）"}
          </label>
          <input
            id="description"
            name="description"
            placeholder={
              f.isMcp
                ? "一句话描述这个 MCP Server 能做什么"
                : "一句话描述这个技能能做什么"
            }
            className={inputClass}
            value={f.desc}
            onChange={(e) => f.setDesc(e.target.value)}
          />
        </div>

        {/* 发布前检查单：全绿才亮提交钮 */}
        <div className="space-y-2 rounded-xl border bg-muted/30 p-4">
          <p className="text-sm font-medium">发布前检查</p>
          <CheckItem ok={f.basicOk} label="引用与名称已填写" />
          <CheckItem
            ok={f.sourceReady}
            pending={f.urlMode}
            label={
              f.urlMode ? "文件位置将在提交时校验可达性" : "制品来源已就绪"
            }
          />
          <CheckItem
            ok={f.descOk}
            label={f.isMcp ? "描述已填写（可选）" : "描述已填写"}
          />
          {f.isMcp && f.mcpSource === "ghcr" && (
            <CheckItem
              ok={!!f.cls?.allowed}
              pending={!f.cls}
              label={
                f.cls
                  ? f.cls.allowed
                    ? `镜像来源校验通过（${f.cls.tier === 2 ? "受信源" : f.cls.tier === 1 ? "外部公网源" : "受限来源"}）`
                    : `镜像来源未通过校验：${f.cls.message}`
                  : "镜像来源校验中…"
              }
            />
          )}
        </div>

        <div className="flex items-center justify-between">
          <Button type="button" variant="ghost" onClick={onPrev}>
            上一步
          </Button>
          <Button type="submit" size="lg" disabled={f.pending || !f.allOk}>
            {f.pending ? "提交中…" : "提交"}
          </Button>
        </div>
      </div>
    </section>
  );
}
