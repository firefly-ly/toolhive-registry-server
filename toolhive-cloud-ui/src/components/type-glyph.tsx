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

/** 卡片类型垂片（包豪斯）：左上角色块，白字 MCP / SKILL——类型即角标，不再占用整条横幅 */
export function CardTypeTab({ type }: { type: "mcp" | "skill" }) {
  return (
    <span
      className={`absolute top-0 left-4 z-10 rounded-b-md px-2.5 py-1 text-[11px] font-semibold tracking-[0.18em] text-white ${
        type === "mcp" ? "bg-info" : "bg-success"
      }`}
    >
      {type === "mcp" ? "MCP" : "SKILL"}
    </span>
  );
}

/**
 * 卡片几何角饰（包豪斯）：MCP=右下四分之一圆（info），Skill=右下半圆（success）。
 * 纯装饰：pointer-events-none；配合父级 group 悬停放大 1.5 倍。
 */
export function CardCornerDeco({ type }: { type: "mcp" | "skill" }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute right-0 bottom-0 origin-bottom-right transition-transform duration-200 ease-out group-hover:scale-150 ${
        type === "mcp"
          ? "size-12 rounded-tl-full bg-info/10"
          : "h-6 w-12 rounded-t-full bg-success/10"
      }`}
    />
  );
}
