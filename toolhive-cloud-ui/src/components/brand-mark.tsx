/**
 * 品牌标：包豪斯三件套（拱 = MCP 蓝 / 圆 = CTA 橙红 / 山 = 高亮琥珀）。
 * 与效果图包（design-mockups/全站效果图）的几何语言同源：
 * 拱形呼应详情页品牌位，圆与山呼应提交向导的类型卡。
 * 颜色全部走令牌，dark 模式自动适配。
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 58 24" aria-hidden="true" className={className}>
      {/* 拱：MCP 蓝（三件套交错悬浮，同效果图 topbar 三角） */}
      <path
        className="svg-float"
        style={{ animation: "floatY 3.2s ease-in-out infinite" }}
        d="M2 22 V13 A9 9 0 0 1 20 13 V22 Z"
        fill="hsl(var(--info))"
      />
      {/* 圆：强调橙红 */}
      <circle
        className="svg-float"
        style={{
          animation: "floatY 3.2s ease-in-out .4s infinite",
        }}
        cx="31"
        cy="13"
        r="9"
        fill="hsl(var(--primary))"
      />
      {/* 山：高亮琥珀 */}
      <path
        className="svg-float"
        style={{
          animation: "floatY 3.2s ease-in-out .8s infinite",
        }}
        d="M42 22 L51 5 L58 22 Z"
        fill="hsl(var(--highlight))"
      />
    </svg>
  );
}
