"use server";

import { getMcpFile, getSkillFile } from "@/lib/platform-backend";

// 源码包单文件内容预览（client 组件经此 server action 调用，MCP/Skill 通用；
// 平台后端的 403/404/413/415 业务错误以 { error } 形式返回而非抛异常）
export async function getPackageFileAction(
  kind: "mcp" | "skill",
  id: string,
  path: string,
) {
  try {
    return kind === "skill"
      ? await getSkillFile(id, path)
      : await getMcpFile(id, path);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "文件读取失败" };
  }
}
