"use client";

// 提交表单主组件（自检整改重构④：状态收敛 use-submission-form.ts，步骤拆分至 steps/ 子目录）。
// 本文件只做：hook 装配 + 步骤轨 + 四步渲染编排。
// 三段 DOM 始终挂载（hidden 不卸载），FormData 完整性不受分步影响；
// 表单 noValidate，必填校验由 handleSubmit 手动接管（隐藏字段的浏览器校验会误拦）。

import { StepBasic } from "./submission-form/steps/StepBasic";
import { StepReview } from "./submission-form/steps/StepReview";
import { StepSource } from "./submission-form/steps/StepSource";
import { StepType } from "./submission-form/steps/StepType";
import { StepsRail } from "./submission-form/steps-rail";
import { useSubmissionForm } from "./submission-form/use-submission-form";

interface SubmissionFormProps {
  action: (formData: FormData) => Promise<{
    ok: boolean;
    error?: string;
    existing_id?: string;
    existing_status?: string;
  }>;
}

export function SubmissionForm({ action }: SubmissionFormProps) {
  const f = useSubmissionForm(action);

  return (
    <form
      ref={f.formRef}
      onSubmit={f.handleSubmit}
      noValidate
      className="flex flex-col md:flex-row"
    >
      <StepsRail step={f.step} setStep={f.setStep} type={f.type} />

      <div className="min-w-0 flex-1 space-y-5 md:px-9 md:py-7">
        <input type="hidden" name="type" value={f.type} />

        {/* ── 第 0 步：选择类型（MCP / Skill 分道，效果图 03）── */}
        {f.step === 0 && <StepType f={f} />}

        <div className={f.step !== 1 ? "hidden" : ""}>
          <StepBasic f={f} onNext={() => f.goNext(1)} />
        </div>

        <div className={f.step !== 2 ? "hidden" : ""}>
          <StepSource
            f={f}
            onPrev={() => f.setStep(1)}
            onNext={() => f.goNext(2)}
          />
        </div>

        <div className={f.step !== 3 ? "hidden" : ""}>
          <StepReview f={f} onPrev={() => f.setStep(2)} />
        </div>
      </div>
    </form>
  );
}
