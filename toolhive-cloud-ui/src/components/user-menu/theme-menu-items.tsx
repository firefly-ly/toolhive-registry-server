"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import type { ReactNode } from "react";
import {
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

export type Theme = "light" | "dark" | "system";

interface ThemeMenuItemProps {
  children: ReactNode;
  theme: Theme;
}

function ThemeMenuItem({ children, theme }: ThemeMenuItemProps) {
  const { theme: activeTheme, setTheme } = useTheme();
  const isActive = activeTheme === theme;

  return (
    <DropdownMenuItem onSelect={() => setTheme(theme)}>
      {children}
      {isActive && <Check className="ml-auto" />}
    </DropdownMenuItem>
  );
}

export function ThemeMenuItems() {
  return (
    <>
      <DropdownMenuLabel>主题</DropdownMenuLabel>
      <ThemeMenuItem theme="light">
        <Sun />
        浅色模式
      </ThemeMenuItem>
      <ThemeMenuItem theme="dark">
        <Moon />
        深色模式
      </ThemeMenuItem>
      <ThemeMenuItem theme="system">
        <Monitor />
        跟随系统
      </ThemeMenuItem>
    </>
  );
}
