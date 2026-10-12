"use client";

import { useEffect } from "react";
import { toast } from "sonner";

/**
 * 服务端组件也能用的报错弹报：挂载时把错误消息以 toast 弹出。
 * sonner 默认行为即满足需求：右上角弹出、数秒后自动消失、点击可立即关闭。
 * message 用面向用户的通用文案；原始错误详情放 description（小字次行），避免内部报错直出主行。
 */
export function ErrorToast({
  message,
  description,
  duration = 6000,
}: {
  message: string;
  description?: string;
  /** 自动关闭毫秒数，默认 6s；设为 Infinity 则不自动消失 */
  duration?: number;
}) {
  useEffect(() => {
    if (message) toast.error(message, { description, duration });
  }, [message, description, duration]);
  return null;
}
