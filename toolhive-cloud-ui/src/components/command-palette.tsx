"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { navItemsFor } from "@/lib/nav-items";

interface CommandPaletteProps {
  isAdmin: boolean;
}

/**
 * ⌘K / Ctrl+K 全局命令面板：页面跳转 + 常用操作。
 * 导航项与顶栏共用 nav-items 唯一数据源（新增入口只改 NAV_ITEMS）。
 * AppShell 挂载，全站任意页面可用。
 */
export function CommandPalette({ isAdmin }: CommandPaletteProps) {
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
      </CommandList>
    </CommandDialog>
  );
}
