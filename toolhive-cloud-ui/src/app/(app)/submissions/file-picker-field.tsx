"use client";

import { FileArchive, X } from "lucide-react";

export function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(i > 0 ? 1 : 0)} ${sizes[i]}`;
}

interface FilePickerFieldProps {
  /** 隐藏 input 的 id（同时用于清除时重置 input.value） */
  id: string;
  /** 提交给 Server Action 的字段名；省略则不提交该文件 */
  name?: string;
  accept?: string;
  buttonLabel: string;
  file: File | null;
  onFile: (file: File | null) => void;
}

/**
 * 表单通用文件选择器：按钮 + 已选文件芯片（名称/大小/清除）。
 * 抽取前该块在提交表单里复制粘贴了 4 份（tar/源码/.env/skill 包）。
 */
export function FilePickerField({
  id,
  name,
  accept,
  buttonLabel,
  file,
  onFile,
}: FilePickerFieldProps) {
  return (
    <div className="flex items-start gap-3">
      <label
        htmlFor={id}
        className="inline-flex h-11 shrink-0 cursor-pointer items-center rounded-md border-0 bg-primary px-4 py-2 text-base font-medium text-primary-foreground hover:bg-primary/90"
      >
        {buttonLabel}
      </label>
      <input
        id={id}
        name={name}
        type="file"
        accept={accept}
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        className="sr-only"
      />
      {file ? (
        <div className="flex min-w-0 items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-foreground">
          <FileArchive className="size-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatSize(file.size)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onFile(null);
              const input = document.getElementById(
                id,
              ) as HTMLInputElement | null;
              if (input) input.value = "";
            }}
            className="ml-1 rounded p-1 hover:bg-primary/20"
            aria-label="清除已选文件"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">未选择文件</span>
      )}
    </div>
  );
}
