"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { navItemsFor } from "@/lib/nav-items";

interface CommandPaletteProps {
  isAdmin: boolean;
  collapsed: boolean;
  onToggleSidebar: () => void;
}

/**
 * ⌘K / Ctrl+K 全局命令面板：页面跳转 + 常用操作。
 * 导航项与桌面侧栏共用 nav-items 唯一数据源（新增入口只改 NAV_ITEMS）。
 * AppShell 挂载，全站任意页面可用。
 */
export function CommandPalette({
  isAdmin,
  collapsed,
  onToggleSidebar,
}: CommandPaletteProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // 全局热键：⌘K / Ctrl+K 切换面板
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="搜索页面，回车跳转…" />
      <CommandList>
        <CommandEmpty>没有匹配的页面</CommandEmpty>
        <CommandGroup heading="导航">
          {navItemsFor(isAdmin).map((item) => (
            <CommandItem
              key={item.href}
              value={`${item.label} ${item.href}`}
              onSelect={() => run(() => router.push(item.href))}
            >
              <item.icon />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="操作">
          <CommandItem
            value="收起侧栏 展开侧栏 折叠"
            onSelect={() => run(onToggleSidebar)}
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            <span>{collapsed ? "展开侧栏" : "收起侧栏"}</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
