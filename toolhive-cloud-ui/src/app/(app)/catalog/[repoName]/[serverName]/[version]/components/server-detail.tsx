import {
  CalendarDays,
  ExternalLink,
  Github,
  Server,
  Tag,
  User,
} from "lucide-react";
import Link from "next/link";
import { AddMcpToClientDropdown } from "@/components/add-mcp-to-client-dropdown";
import { CopyMcpConfigDialog } from "@/components/copy-mcp-config-dialog";
import { CopyUrlButton } from "@/components/copy-url-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function ServerDescription({ description }: { description?: string }) {
  return (
    <div className="whitespace-pre-line text-base leading-7 text-muted-foreground">
      {description || "暂无描述"}
    </div>
  );
}

function GettingStarted({
  serverName,
  serverUrl,
  serverHeaders,
}: {
  serverName?: string;
  serverUrl?: string;
  serverHeaders?: Record<string, string>;
}) {
  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <h2 className="text-sm font-semibold tracking-wide">使用方式</h2>
      <p className="text-base leading-7 text-muted-foreground">
        复制下方接入端点 URL，在你的应用或自动化流程中使用：
      </p>
      {serverUrl && (
        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={serverUrl}
            className="min-w-80 max-w-xl font-mono text-sm text-muted-foreground bg-background"
          />
          <CopyUrlButton
            url={serverUrl}
            variant="secondary"
            size="sm"
            labelClassName="hidden sm:inline"
          />
          <CopyMcpConfigDialog
            serverName={serverName ?? ""}
            config={{ url: serverUrl, headers: serverHeaders }}
            variant="outline"
            size="lg"
            className="gap-2"
          />
          {serverName && (
            <AddMcpToClientDropdown
              serverName={serverName}
              serverUrl={serverUrl}
              serverHeaders={serverHeaders}
            />
          )}
        </div>
      )}
    </div>
  );
}

interface ServerDetailProps {
  description?: string;
  serverName?: string;
  serverUrl?: string;
  // 平台提交型 MCP 的代理调用凭证（Authorization: Bearer <mcp_token>），
  // 由后端在探活可达时随详情下发；registry 服务器无此字段（undefined，行为不变）。
  serverHeaders?: Record<string, string>;
  repositoryUrl?: string;
  publisher?: string;
  type?: string;
  version?: string;
}

export function ServerDetail({
  description,
  serverName,
  serverUrl,
  serverHeaders,
  repositoryUrl,
  publisher,
  type,
  version,
}: ServerDetailProps) {
  const meta = [
    { icon: User, label: "来源", value: publisher || "未知" },
    { icon: Tag, label: "类型", value: type || "MCP" },
    { icon: Server, label: "版本", value: version ? `v${version}` : "未知" },
    {
      icon: CalendarDays,
      label: "接入端点",
      value: serverUrl ? "已配置" : "未配置",
    },
  ];

  return (
    <div className="space-y-6">
      <ServerDescription description={description} />

      <div className="flex flex-wrap items-center gap-3">
        {repositoryUrl && (
          <Button size="lg" className="gap-2" asChild>
            <Link
              href={repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="h-4 w-4" />
              查看仓库
            </Link>
          </Button>
        )}
      </div>

      {repositoryUrl && (
        <a
          href={repositoryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ExternalLink className="h-4 w-4" />
          在仓库查看 README / 源码
        </a>
      )}

      <GettingStarted
        serverName={serverName}
        serverUrl={serverUrl}
        serverHeaders={serverHeaders}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {meta.map((m) => (
          <div key={m.label} className="rounded-lg border bg-muted/40 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <m.icon className="h-3.5 w-3.5 text-primary/70" />
              {m.label}
            </div>
            <div
              className="mt-1 break-words text-sm font-medium"
              title={String(m.value)}
            >
              {m.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
