// approve-dialog/ScanResultsPanel.tsx —— 安全扫描结果面板（自检整改重构③ 自主文件拆出）。
// 职责：Trivy/注入规则徽章、命中明细表、两段确认勾选（Trivy CRITICAL 豁免 / 注入规则人工审阅）。
"use client";

import { cn } from "@/lib/utils";
import { ScanBadge } from "./ScanBadge";
import type { PromptScanResult, ScanStatus, TrivyResult } from "./shared";

export function ScanResultsPanel({
  isMcp,
  trivy,
  promptScan,
  needScanOverride,
  needPromptConfirm,
  confirmScan,
  confirmPrompt,
  setConfirmScan,
  setConfirmPrompt,
}: {
  isMcp: boolean;
  trivy?: TrivyResult;
  promptScan?: PromptScanResult;
  needScanOverride: boolean;
  needPromptConfirm: boolean;
  confirmScan: boolean;
  confirmPrompt: boolean;
  setConfirmScan: (v: boolean) => void;
  setConfirmPrompt: (v: boolean) => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">安全扫描</p>
        <ScanBadge
          label="Trivy 漏洞"
          status={trivy?.status}
          extra={
            trivy
              ? `CRITICAL ${trivy.critical} · HIGH ${trivy.high} · 密钥 ${trivy.secrets}`
              : undefined
          }
        />
        {!isMcp && (
          <ScanBadge
            label="注入规则"
            status={promptScan?.status}
            extra={promptScan ? `命中 ${promptScan.total}` : undefined}
          />
        )}
        {(trivy?.status === "scanning" ||
          (!isMcp && promptScan?.status === "scanning")) && (
          <span className="text-xs text-muted-foreground">
            扫描进行中，结果将自动刷新
          </span>
        )}
      </div>

      {needPromptConfirm && (promptScan?.hits?.length ?? 0) > 0 && (
        <div className="max-h-48 overflow-y-auto rounded-lg border border-destructive/40 bg-destructive/5">
          <table className="w-full text-left text-xs">
            <thead className="text-muted-foreground">
              <tr>
                <th className="px-2 py-1.5 font-medium">级别</th>
                <th className="px-2 py-1.5 font-medium">规则</th>
                <th className="px-2 py-1.5 font-medium">类别</th>
                <th className="px-2 py-1.5 font-medium">位置</th>
                <th className="px-2 py-1.5 font-medium">命中内容</th>
              </tr>
            </thead>
            <tbody>
              {(promptScan?.hits ?? []).map((h) => (
                <tr key={JSON.stringify(h)} className="border-t">
                  <td className="px-2 py-1.5">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 font-semibold",
                        h.severity === "alert"
                          ? "bg-destructive/15 text-destructive"
                          : "bg-warning/15 text-warning",
                      )}
                    >
                      {h.severity === "alert"
                        ? "警报"
                        : h.severity === "warn"
                          ? "提示"
                          : h.severity}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 font-mono">{h.rule_id}</td>
                  <td className="px-2 py-1.5">{h.category}</td>
                  <td className="px-2 py-1.5 font-mono">
                    {h.file}:{h.line}
                  </td>
                  <td
                    className="max-w-[280px] truncate px-2 py-1.5"
                    title={h.excerpt}
                  >
                    {h.excerpt}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(needScanOverride || needPromptConfirm) && (
        <div className="space-y-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3">
          {needScanOverride && (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={confirmScan}
                onChange={(e) => setConfirmScan(e.target.checked)}
              />
              <span>
                Trivy 发现 <b>{trivy?.critical}</b> 个 CRITICAL 漏洞 /{" "}
                <b>{trivy?.secrets}</b> 处明文密钥。
                我已知晓风险，坚持放行该制品（此操作将记入审计轨迹）。
              </span>
            </label>
          )}
          {needPromptConfirm && (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={confirmPrompt}
                onChange={(e) => setConfirmPrompt(e.target.checked)}
              />
              <span>
                注入规则命中 <b>{promptScan?.total}</b>{" "}
                处。我已逐条人工审阅上述命中内容，确认无提示词注入风险（此操作将记入审计轨迹）。
              </span>
            </label>
          )}
        </div>
      )}
    </div>
  );
}

// ScanStatus 重导出：面板消费方（主弹窗）无需感知类型来源变化
export type { ScanStatus };
