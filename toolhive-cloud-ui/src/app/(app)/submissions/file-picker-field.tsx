"use client";

import { FileArchive, UploadCloud, X } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

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
  /** 拖放区形态：虚线大框 + 拖拽高亮（发布通道）；默认保持紧凑按钮形态 */
  dropzone?: boolean;
  /** 拖放区主文案 */
  hint?: string;
}

/**
 * 表单通用文件选择器：按钮 + 已选文件芯片（名称/大小/清除）。
 * dropzone 模式渲染为虚线拖放大框——点击与拖入等价，拖拽悬停高亮。
 */
export function FilePickerField({
  id,
  name,
  accept,
  buttonLabel,
  file,
  onFile,
  dropzone = false,
  hint,
}: FilePickerFieldProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = () => inputRef.current?.click();
  const clear = () => {
    onFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const fileChip = file ? (
    <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-foreground">
      <FileArchive className="size-4 shrink-0 text-primary" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{file.name}</p>
        <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          clear();
        }}
        className="ml-1 rounded p-1 hover:bg-primary/20"
        aria-label="清除已选文件"
      >
        <X className="size-4" />
      </button>
    </div>
  ) : null;

  if (dropzone) {
    return (
      <div>
        <button
          type="button"
          onClick={openPicker}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) onFile(f);
          }}
          className={cn(
            "flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/40",
          )}
        >
          <UploadCloud className="mb-2 size-7 text-muted-foreground" />
          <p className="text-sm font-medium">
            {file ? "已选择文件，可拖入替换" : `拖入文件，或${buttonLabel}`}
          </p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </button>
        {fileChip}
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="file"
          accept={accept}
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          className="sr-only"
        />
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <label
        htmlFor={id}
        className="inline-flex h-11 shrink-0 cursor-pointer items-center rounded-md border-0 bg-primary px-4 py-2 text-base font-medium text-primary-foreground hover:bg-primary/90"
      >
        {buttonLabel}
      </label>
      <input
        ref={inputRef}
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
            onClick={clear}
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
