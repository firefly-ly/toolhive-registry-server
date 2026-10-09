/**
 * 品牌标：菱形（呼应 ToolHive 原始 logo 的菱形轮廓）。
 * 颜色走 --primary 令牌——阶段 3 视觉换血把 --primary 换成品牌红后，
 * 此处与侧栏 active 态一并自动变红，不做硬编码。
 * 原 /toolhive-logo.svg 是白色字标，浅色纸面上不可见，故不直接复用。
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <rect
        x="5.2"
        y="5.2"
        width="13.6"
        height="13.6"
        rx="2.4"
        transform="rotate(45 12 12)"
        fill="hsl(var(--primary))"
      />
    </svg>
  );
}
