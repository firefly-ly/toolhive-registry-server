"use client";

import { ChevronFirst, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CatalogPaginationProps {
  isFirstPage: boolean;
  nextCursor: string | undefined;
  pageNumber: number;
  onFirstPage: () => void;
  onPrev: () => void;
  onNext: (nextCursor: string) => void;
}

export function CatalogPagination({
  isFirstPage,
  nextCursor,
  pageNumber,
  onFirstPage,
  onPrev,
  onNext,
}: CatalogPaginationProps) {
  return (
    <div className="mx-auto mt-4 flex w-fit items-center rounded-full border bg-card px-4 py-2 shadow-sm">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          onClick={onFirstPage}
          disabled={isFirstPage}
          size="sm"
          aria-label="第一页"
          className="cursor-pointer"
        >
          <ChevronFirst className="size-4" />
        </Button>
        <Button
          variant="ghost"
          onClick={onPrev}
          disabled={isFirstPage}
          size="sm"
          aria-label="上一页"
          className="cursor-pointer"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="px-3 text-sm font-medium">第 {pageNumber} 页</span>
        <Button
          variant="ghost"
          onClick={() => nextCursor && onNext(nextCursor)}
          disabled={!nextCursor}
          size="sm"
          aria-label="下一页"
          className="cursor-pointer"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
