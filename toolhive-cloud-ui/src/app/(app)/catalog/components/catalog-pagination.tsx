"use client";

import { ChevronFirst, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CatalogPaginationProps {
  /** 当前页（0 起） */
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function CatalogPagination({
  page,
  totalPages,
  onPageChange,
}: CatalogPaginationProps) {
  return (
    <div className="mx-auto mt-4 flex w-fit items-center rounded-full border bg-card px-4 py-2 shadow-sm">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          onClick={() => onPageChange(0)}
          disabled={page === 0}
          size="sm"
          aria-label="第一页"
          className="cursor-pointer"
        >
          <ChevronFirst className="size-4" />
        </Button>
        <Button
          variant="ghost"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
          size="sm"
          aria-label="上一页"
          className="cursor-pointer"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="px-3 text-sm font-medium">
          第 {page + 1} 页{totalPages > 1 ? ` / ${totalPages}` : ""}
        </span>
        <Button
          variant="ghost"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages - 1}
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
