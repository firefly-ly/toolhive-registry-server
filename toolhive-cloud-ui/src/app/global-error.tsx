"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import "./globals.css";

interface GlobalErrorProps {
  reset: () => void;
}

export default function GlobalError({ reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body className="antialiased bg-background text-foreground">
        <div className="flex flex-col items-center justify-center min-h-screen gap-6">
          <Image
            src="/toolhive-logo.svg"
            alt="ToolHive"
            width={145}
            height={31}
            className="shrink-0 brightness-0 dark:brightness-100"
          />

          <h1 className="text-xl text-muted-foreground">页面出错了</h1>

          <Button onClick={reset} variant="default">
            重试
          </Button>
        </div>
      </body>
    </html>
  );
}
