"use client";

import { HelpCircle } from "lucide-react";
import type { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * 帮助提示：HelpCircle + 可见标签，悬浮出 Radix 气泡。
 * 替代原生 title（系统黑框、延迟 1s、字宽不可控），长文案在站内气泡中可控宽换行；
 * 键盘可聚焦（tab 后回车/聚焦即出泡），与全站 Tooltip 观感一致。
 */
export function Hint({
  text,
  children,
  className,
  contentClassName,
}: {
  text: string;
  /** 触发器上除图标外的可见文字（如「说明」「组名匹配规则」） */
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex cursor-help items-center gap-1 text-xs text-muted-foreground",
            className,
          )}
        >
          <HelpCircle className="size-3.5" />
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent
        className={cn("max-w-sm leading-relaxed", contentClassName)}
      >
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
