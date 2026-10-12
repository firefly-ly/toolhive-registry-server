"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 测量 auto-fill 网格容器能排出的列数，返回「列数 × rows」的页容量。
 * 固定页容量在宽窄屏下列数不同（5 列×15=3 行恰好铺满，4 列×15=3 行余 3 空缺），
 * 页容量随列数走才能保证每页都铺满整行。
 * cols=0（未挂载/未测量）时 pageSize 返回 0，调用方回退默认值。
 */
export function useAutofillPageSize(
  minColWidth = 340,
  gap = 12,
  rows = 3,
): {
  ref: React.RefObject<HTMLDivElement | null>;
  cols: number;
  pageSize: number;
} {
  const ref = useRef<HTMLDivElement | null>(null);
  const [cols, setCols] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const c = Math.max(
        1,
        Math.floor((el.clientWidth + gap) / (minColWidth + gap)),
      );
      setCols((prev) => (prev === c ? prev : c));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [minColWidth, gap]);

  return { ref, cols, pageSize: cols > 0 ? cols * rows : 0 };
}
