// submission-form/steps-rail.tsx —— 左侧竖排步骤轨（效果图 03：灰底、28px 圆圈、当前步琥珀底 + 副标）。
// 自检整改重构④ 自主文件拆出。Skill 提交时第 2 步文案随类型切换。
"use client";

import { cn } from "@/lib/utils";
import type { FormType } from "./use-submission-form";

export const STEPS = [
  { n: 0, label: "选择类型", sub: "决定后续流程" },
  { n: 1, label: "基本信息", sub: "名称 · 引用 · 版本" },
  { n: 2, label: "制品来源", sub: "ghcr / tar / 源码包" },
  { n: 3, label: "确认提交", sub: "校验清单把关" },
] as const;

export function StepsRail({
  step,
  setStep,
  type,
}: {
  step: number;
  setStep: (n: number) => void;
  type: FormType;
}) {
  const isMcp = type === "mcp";
  return (
    <aside
      aria-label="提交步骤"
      className="hidden w-[230px] shrink-0 border-r-[1.5px] border-border bg-secondary/50 px-7 py-7 md:block"
    >
      {STEPS.map((r) => {
        const done = step > r.n;
        const active = step === r.n;
        const label = r.n === 2 && !isMcp ? "上传技能包" : r.label;
        const sub = r.n === 2 && !isMcp ? "zip 包 · SKILL.md 校验" : r.sub;
        return (
          <button
            key={r.n}
            type="button"
            onClick={() => setStep(r.n)}
            className="flex w-full cursor-pointer gap-3 py-2.5 text-left"
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full border-[1.5px] text-xs font-semibold",
                active
                  ? "border-foreground bg-highlight text-foreground"
                  : done
                    ? "border-success bg-success/10 text-success"
                    : "border-border bg-card text-muted-foreground",
              )}
            >
              {done ? "✓" : r.n === 0 ? "1" : r.n + 1}
            </span>
            <span className="min-w-0">
              <span
                className={cn(
                  "block text-[15px] font-semibold",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
              {sub && (
                <span
                  className={cn(
                    "mt-0.5 block text-[14px]",
                    active ? "text-warning" : "text-muted-foreground/80",
                  )}
                >
                  {sub}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </aside>
  );
}
