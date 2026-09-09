"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ErrorPageLayout } from "./error-page";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorPageLayout
      title="页面出错了"
      actions={
        <Button onClick={reset} variant="default">
          重试
        </Button>
      }
    >
      An unexpected error occurred. Please try again.
    </ErrorPageLayout>
  );
}
