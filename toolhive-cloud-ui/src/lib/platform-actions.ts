// Server Actions 统一出口（barrel）。
// 实现按业务域拆在同目录 actions/ 下，调用方仍从这里 import，保持引用稳定：
// - favorites: 收藏切换、下载/调用计数
// - issues:    反馈（创建/回复/关闭/删除）
// - mcp-call:  在线调用 MCP 工具
// - package-files: 源码包文件预览
export {
  recordCallAction,
  recordDownloadAction,
  toggleFavoriteAction,
} from "@/lib/actions/favorites";
export {
  createIssueAction,
  deleteIssueAction,
  replyIssueAction,
  updateIssueStatusAction,
} from "@/lib/actions/issues";
export { callMcpAction } from "@/lib/actions/mcp-call";
export { getPackageFileAction } from "@/lib/actions/package-files";
