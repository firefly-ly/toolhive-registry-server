/**
 * 页面级多源取数的统一容错。
 *
 * 语义：单一数据源失败不应拖垮整页渲染，但失败必须留痕——
 * 不允许无痕的 `.catch(() => fallback)`（会把"接口挂了"伪装成"没有数据"）。
 *
 * 使用：Promise.all 里把 `getX().catch(() => fallback)` 替换为
 * `safe(getX(), fallback, "页面.数据源")`，失败会打印 `[safe:标签]` + 错误对象。
 */
export async function safe<T>(
  task: Promise<T>,
  fallback: T,
  label: string,
): Promise<T> {
  try {
    return await task;
  } catch (error) {
    console.error(`[safe:${label}]`, error);
    return fallback;
  }
}
