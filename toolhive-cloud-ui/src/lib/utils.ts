import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { V0ServerJson } from "@/generated/types.gen";
import { parseStacklokMeta, type ServerTool } from "./schemas/server-meta";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Checks if a server is a Virtual MCP server by examining metadata.
 * Virtual MCP servers have kubernetes.kind set to "VirtualMCPServer" in their metadata.
 */
export function isVirtualMCPServer(server: V0ServerJson): boolean {
  const result = parseStacklokMeta(server);
  if (!result?.success) return false;

  return Object.values(result.data).some(
    (t) => t.metadata?.kubernetes?.kind === "VirtualMCPServer",
  );
}

/**
 * Extracts MCP tools from a server's publisher-provided metadata.
 * Tools are stored alongside `metadata` in the transport entries.
 *
 * Two shapes are tolerated:
 *  - `tool_definitions: [{ name, description? }, ...]` (canonical object form)
 *  - `tools: ["tool_a", "tool_b", ...]` (string-array form, kept for
 *    legacy/compat entries imported from older registry data)
 * The string form is mapped to `{ name, description: undefined }` so the
 * detail page renders tool names even when no descriptions are provided.
 */
export function getTools(server: V0ServerJson): ServerTool[] {
  const result = parseStacklokMeta(server);
  if (!result?.success) return [];

  return Object.values(result.data).flatMap((t) => {
    if (t.tool_definitions && t.tool_definitions.length > 0) {
      return t.tool_definitions;
    }
    if (t.tools && t.tools.length > 0) {
      return t.tools.map((name) => ({ name }));
    }
    return [];
  });
}
