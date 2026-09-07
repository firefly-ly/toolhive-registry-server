"use client";

import { useCallback, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmOptions {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  /** 破坏性操作：确认按钮变红，用于强调「不可回滚」等不可逆风险 */
  destructive?: boolean;
}

export function useConfirm() {
  const [open, setOpen] = useState(false);
  const [resolvePromise, setResolvePromise] = useState<
    ((value: boolean) => void) | null
  >(null);
  const [options, setOptions] = useState<ConfirmOptions>({});

  const confirm = useCallback((opts: ConfirmOptions = {}): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions(opts);
      setOpen(true);
      setResolvePromise(() => resolve);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setOpen(false);
    if (resolvePromise) {
      resolvePromise(true);
      setResolvePromise(null);
    }
  }, [resolvePromise]);

  const handleCancel = useCallback(() => {
    setOpen(false);
    if (resolvePromise) {
      resolvePromise(false);
      setResolvePromise(null);
    }
  }, [resolvePromise]);

  const ConfirmDialog = (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {options.title || "确认操作？"}
          </AlertDialogTitle>
          {options.description && (
            <AlertDialogDescription>
              {options.description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            {options.cancelText || "取消"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={
              options.destructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : undefined
            }
          >
            {options.confirmText || "确认"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, ConfirmDialog };
}
