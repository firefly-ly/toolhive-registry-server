/** 类型符号（几何隐喻）：MCP = 双圆环扣（连接），Skill = 旋转圆角方块（技能块） */

export function McpGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="7" cy="10" r="4.5" fill="hsl(var(--info))" />
      <circle
        cx="13"
        cy="10"
        r="4.5"
        fill="hsl(var(--info))"
        fillOpacity="0.5"
      />
    </svg>
  );
}

export function SkillGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect
        x="4.5"
        y="4.5"
        width="11"
        height="11"
        rx="2.5"
        transform="rotate(45 10 10)"
        fill="hsl(var(--success))"
      />
    </svg>
  );
}
