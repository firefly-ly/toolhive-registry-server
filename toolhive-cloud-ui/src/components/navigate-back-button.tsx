"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ButtonProps } from "./ui/button";
import { Button } from "./ui/button";

interface HistoryBackProps {
  className?: string;
  href?: string;
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}

export function NavigateBackButton({
  className,
  href = "/",
  label = "Back",
  variant = "outline",
  size = "default",
}: HistoryBackProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(href);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={cn(
        "group cursor-pointer gap-1.5 rounded-full border-border/40 bg-card/90 px-4 py-2 text-sm font-medium text-card-foreground shadow-sm ring-offset-background transition-all hover:bg-accent hover:text-accent-foreground hover:shadow",
        className
      )}
    >
      <ChevronLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
      {label}
    </Button>
  );
}
