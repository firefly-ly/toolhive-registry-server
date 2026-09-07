"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  href: string;
  label: string;
}

export function NavLink({ href, label }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-white/15 text-white"
          : "text-white/80 hover:bg-white/10 hover:text-white",
      )}
    >
      {label}
    </Link>
  );
}
