// approve-dialog/DataSourcePanel.tsx —— 数据源声明面板（自检整改重构③ 自主文件拆出）。
// 两段式豁免第 1 段：提交者声明意图展示，公网目标标红供审批重点审查。仅 MCP 显示。
"use client";

import { cn } from "@/lib/utils";
import type { DataSourceDecl } from "./shared";
import { isPublicTarget } from "./shared";

export function DataSourcePanel({
  dataSource,
}: {
  dataSource?: DataSourceDecl;
}) {
  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
      <p className="text-sm font-medium">数据源声明</p>
      {!dataSource || dataSource.type === "none" ? (
        <p className="text-xs text-muted-foreground">
          未声明外部数据源；若实际需要连库，请让提交者重新提交并补充声明。
        </p>
      ) : (
        <div className="space-y-1.5 text-sm">
          <p>
            类型：
            {dataSource.type === "database"
              ? "数据库直连（隔离网内不可达，需解除隔离或改用中转）"
              : "HTTP API"}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span>目标：</span>
            {(dataSource.targets ?? []).length ? (
              (dataSource.targets ?? []).map((t) => (
                <span
                  key={t}
                  className={cn(
                    "rounded px-1.5 py-0.5 font-mono text-xs",
                    isPublicTarget(t)
                      ? "bg-destructive/15 text-destructive"
                      : "bg-muted",
                  )}
                >
                  {t}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">未填写</span>
            )}
          </div>
          {dataSource.note && (
            <p className="text-xs text-muted-foreground">
              用途：{dataSource.note}
            </p>
          )}
          {(dataSource.targets ?? []).some(isPublicTarget) && (
            <p className="text-xs font-medium text-destructive">
              存在公网目标地址：解除隔离后容器可直连公网，与数据不出内网红线冲突，请谨慎确认。
            </p>
          )}
        </div>
      )}
    </div>
  );
}
