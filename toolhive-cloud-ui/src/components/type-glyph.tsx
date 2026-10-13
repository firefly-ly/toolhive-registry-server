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

/** 卡片类型垂片（效果图 01）：左上角悬挂色块（left-6、圆底角、10px 加宽字距） */
export function CardTypeTab({ type }: { type: "mcp" | "skill" }) {
  return (
    <span
      className={`absolute top-0 left-6 z-10 rounded-b-lg px-3 py-1 text-[12.5px] font-semibold tracking-[0.12em] text-white ${
        type === "mcp" ? "bg-info" : "bg-success"
      }`}
    >
      {type === "mcp" ? "MCP" : "SKILL"}
    </span>
  );
}

/**
 * 卡片几何角饰（效果图 01 精确规格）：
 * MCP=右下 52px 四分之一圆（浅蓝底 + 上/左 1.5px 同色系描边），
 * Skill=右下 52×26 半圆（浅绿底 + 顶部描边）；悬停放大 1.55 倍并加深。
 */
export function CardCornerDeco({ type }: { type: "mcp" | "skill" }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute right-0 bottom-0 origin-bottom-right transition-transform duration-300 [transition-timing-function:cubic-bezier(.2,.8,.2,1)] group-hover:scale-[1.55] ${
        type === "mcp"
          ? "size-13 rounded-tl-full border-t-[1.5px] border-l-[1.5px] border-info/40 bg-info/10 group-hover:bg-info/30"
          : "h-6.5 w-13 rounded-t-full border-t-[1.5px] border-success/40 bg-success/10 group-hover:bg-success/30"
      }`}
    />
  );
}
