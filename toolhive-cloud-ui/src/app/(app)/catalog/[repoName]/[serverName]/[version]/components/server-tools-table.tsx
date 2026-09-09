"use client";

import { RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { IllustrationEmptyInbox } from "@/components/illustrations/illustration-empty-inbox";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ServerTool } from "@/lib/schemas/server-meta";

function EmptyToolsTable({ failed }: { failed?: boolean }) {
  const router = useRouter();
  if (failed) {
    // 取数失败（如后端重启、网络抖动窗口渲染）：与"实例真的没工具"区分开，引导刷新
    return (
      <TableRow>
        <TableCell colSpan={2} className="py-12">
          <div className="flex flex-col items-center gap-3">
            <IllustrationEmptyInbox className="size-24" />
            <p className="text-sm text-muted-foreground">
              工具获取失败，可能是服务暂时不可达
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => router.refresh()}
            >
              <RefreshCcw className="h-4 w-4" />
              重新获取
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }
  return (
    <TableRow>
      <TableCell colSpan={2} className="py-12">
        <div className="flex flex-col items-center gap-3">
          <IllustrationEmptyInbox className="size-24" />
          <p className="text-sm text-muted-foreground">暂无工具</p>
        </div>
      </TableCell>
    </TableRow>
  );
}

interface ServerToolsTableProps {
  tools: ServerTool[];
  failed?: boolean;
}

export function ServerToolsTable({ tools, failed }: ServerToolsTableProps) {
  return (
    <div className="rounded-lg border max-h-[70vh] overflow-y-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10">
          <TableRow className="h-12">
            <TableHead className="w-56 p-3">工具</TableHead>
            <TableHead className="p-3">描述</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tools.length === 0 ? (
            <EmptyToolsTable failed={failed} />
          ) : (
            tools.map((tool) => (
              <TableRow key={tool.name} className="h-12 bg-background">
                <TableCell className="p-3 font-medium">{tool.name}</TableCell>
                <TableCell className="p-3 text-muted-foreground whitespace-normal">
                  {tool.description ?? "No description"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
