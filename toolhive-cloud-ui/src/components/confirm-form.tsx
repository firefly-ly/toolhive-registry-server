"use client";

import { type ReactNode, useTransition } from "react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useConfirm } from "@/hooks/use-confirm";

interface ConfirmFormProps {
  /** 服务端 Action（来自 "use server" 文件），点击确认后以隐藏字段提交 */
  action: (formData: FormData) => Promise<unknown>;
  /** 随表单提交的隐藏字段 */
  fields: Record<string, string>;
  children: ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  /** 二次确认弹窗标题 */
  title: string;
  /** 二次确认弹窗说明，可在此标注「可回滚 / 不可回滚」等风险 */
  description?: string;
  confirmText?: string;
  cancelText?: string;
  /** 破坏性操作：确认按钮变红，并默认用于不可回滚的删除等场景 */
  destructive?: boolean;
  /** 成功后的 toast 标题（约定 action 成功返回 { ok: true }；失败由 action 内部 redirect 兜底） */
  successToast?: string;
  /** 成功 toast 的补充说明（结果 + 下一步） */
  successDescription?: string;
}

/**
 * 把任意服务端 Action 包成「点击 → 二次确认弹窗 → 提交」的按钮。
 * 既满足「危险操作必须二次确认」的诉求，又复用现成的 useConfirm + AlertDialog。
 */
export function ConfirmForm({
  action,
  fields,
  children,
  variant = "outline",
  size = "sm",
  className,
  title,
  description,
  confirmText = "确认",
  cancelText = "取消",
  destructive = false,
  successToast,
  successDescription,
}: ConfirmFormProps) {
  const { confirm, ConfirmDialog } = useConfirm();
  const [pending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await confirm({
      title,
      description,
      confirmText,
      cancelText,
      destructive,
    });
    if (!ok) return;
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    startTransition(async () => {
      const res = (await action(fd)) as { ok?: boolean } | undefined;
      if (successToast && res?.ok) {
        toast.success(
          successToast,
          successDescription ? { description: successDescription } : undefined,
        );
      }
    });
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        <Button
          type="submit"
          variant={variant}
          size={size}
          className={className}
          disabled={pending}
        >
          {pending ? "处理中…" : children}
        </Button>
      </form>
      {ConfirmDialog}
    </>
  );
}
