"use client";

import {
  ChevronRight,
  File as FileIcon,
  FolderClosed,
  FolderOpen,
} from "lucide-react";
import { useMemo, useState } from "react";
import { getPackageFileAction } from "@/lib/platform-actions";

interface TreeNode {
  name: string;
  path: string;
  dirs: Map<string, TreeNode>;
  files: string[];
}

function emptyNode(name: string, path: string): TreeNode {
  return { name, path, dirs: new Map(), files: [] };
}

// 由相对路径列表构建目录树（dirs/files 分开，文件夹在前排序）
function buildTree(paths: string[]): TreeNode {
  const root = emptyNode("/", "");
  for (const p of paths) {
    const parts = p.split("/");
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const seg = parts[i];
      let next = cur.dirs.get(seg);
      if (!next) {
        next = emptyNode(seg, parts.slice(0, i + 1).join("/"));
        cur.dirs.set(seg, next);
      }
      cur = next;
    }
    cur.files.push(p);
  }
  return root;
}

function DirNode({
  node,
  depth,
  selected,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  selected: string | null;
  onSelect: (path: string) => void;
}) {
  const [open, setOpen] = useState(depth < 2); // 前两层默认展开，避免一屏全是收起的文件夹
  return (
    <div>
      {depth > 0 && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="group flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 text-left text-[16px] text-foreground/90 transition-colors hover:bg-accent/60"
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
        >
          <ChevronRight
            className={`size-4 shrink-0 text-muted-foreground/70 transition-transform group-hover:text-foreground ${
              open ? "rotate-90" : ""
            }`}
          />
          {open ? (
            <FolderOpen className="size-4 shrink-0 text-sky-500 dark:text-sky-400" />
          ) : (
            <FolderClosed className="size-4 shrink-0 text-sky-500/80 dark:text-sky-400/80" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
      )}
      {open && (
        <>
          {[...node.dirs.values()]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((d) => (
              <DirNode
                key={d.path}
                node={d}
                depth={depth + 1}
                selected={selected}
                onSelect={onSelect}
              />
            ))}
          {node.files
            .map((p) => ({ path: p, name: p.split("/").pop() ?? "" }))
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(({ path, name }) => {
              const active = selected === path;
              return (
                <button
                  key={path}
                  type="button"
                  onClick={() => onSelect(path)}
                  className={`flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 text-left text-[16px] transition-colors ${
                    active
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-foreground/80 hover:bg-accent/60"
                  }`}
                  style={{ paddingLeft: `${(depth + 1) * 14 + 8 + 18}px` }}
                >
                  <FileIcon
                    className={`size-4 shrink-0 ${
                      active ? "text-primary" : "text-muted-foreground/70"
                    }`}
                  />
                  <span className="truncate">{name}</span>
                </button>
              );
            })}
        </>
      )}
    </div>
  );
}

// 带行号的代码预览（行号列与内容同步滚动，行号不可选中）
function CodePreview({ path, content }: { path: string; content: string }) {
  const lines = content.replace(/\n$/, "").split("\n");
  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
        <FileIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate font-mono text-sm text-muted-foreground">
          {path}
        </span>
        <span className="ml-auto shrink-0 text-sm text-muted-foreground/70">
          {lines.length} 行
        </span>
      </div>
      <div className="max-h-[52vh] overflow-auto">
        <div className="flex min-w-0 font-mono text-[16px] leading-6">
          <div
            aria-hidden
            className="select-none border-r bg-muted/30 px-3 py-3 text-right text-muted-foreground/50"
          >
            {lines.map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: 行号列表静态有序且与索引恒等，索引即身份
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <pre className="min-w-0 flex-1 px-4 py-3">
            <code>{content}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}

/**
 * 源码包文件树 + 单文件内容预览（GitHub 风格双栏卡片，MCP/Skill 通用）。
 * 点击文件经 server action 从后端拉取文本内容；敏感文件/二进制/超大文件由后端拒绝并提示。
 */
export function PackageFileTree({
  kind,
  itemId,
  tree,
  fileCount,
}: {
  kind: "mcp" | "skill";
  itemId: string;
  tree: string[];
  fileCount?: number | null;
}) {
  const root = useMemo(() => buildTree(tree), [tree]);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function selectFile(path: string) {
    setSelected(path);
    setContent(null);
    setError(null);
    setLoading(true);
    try {
      const r = await getPackageFileAction(kind, itemId, path);
      if ("error" in r) {
        setError(r.error ?? "文件读取失败");
      } else {
        setContent(r.content);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "文件读取失败");
    } finally {
      setLoading(false);
    }
  }

  const truncated =
    fileCount != null && fileCount > tree.length
      ? `共 ${fileCount} 个文件，展示前 ${tree.length} 个`
      : `共 ${tree.length} 个文件`;

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <h3 className="text-sm font-semibold">源码包文件</h3>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
          {truncated} · 点击文件查看内容
        </span>
      </div>
      <div className="grid lg:grid-cols-[minmax(300px,380px)_1fr]">
        <div className="max-h-[55vh] overflow-auto border-r p-2">
          <DirNode
            node={root}
            depth={0}
            selected={selected}
            onSelect={selectFile}
          />
        </div>
        <div className="min-w-0">
          {loading ? (
            <div className="flex h-full min-h-40 items-center justify-center p-6 text-sm text-muted-foreground">
              读取中…
            </div>
          ) : error ? (
            <div className="flex h-full min-h-40 items-center justify-center p-6">
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            </div>
          ) : content != null && selected ? (
            <CodePreview path={selected} content={content} />
          ) : (
            <div className="flex h-full min-h-40 flex-col items-center justify-center gap-1 p-6 text-center">
              <FileIcon className="size-6 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                左侧选择一个文件查看内容
              </p>
              <p className="text-xs text-muted-foreground/70">
                .env / 密钥类文件不支持预览
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
