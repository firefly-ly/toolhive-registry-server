"use client";

import { useEffect } from "react";
import { toast } from "sonner";

/**
 * 服务端组件也能用的报错弹报：挂载时把错误消息以 toast 弹出。
 * sonner 默认行为即满足需求：右上角弹出、数秒后自动消失、点击可立即关闭。
 */
export function ErrorToast({
  message,
  duration = 6000,
}: {
  message: string;
  /** 自动关闭毫秒数，默认 6s；设为 Infinity 则不自动消失 */
  duration?: number;
}) {
  useEffect(() => {
    if (message) toast.error(message, { duration });
  }, [message, duration]);
  return null;
}
