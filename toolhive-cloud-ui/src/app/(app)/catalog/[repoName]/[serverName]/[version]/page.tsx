import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import {
  getIssues,
  getMcpById,
  getMcpServers,
  getMcpTools,
} from "@/lib/platform-backend";
import { safe } from "@/lib/safe-async";
import { getTools } from "@/lib/utils";
import { getServerDetails } from "./actions";
import { ServerDetail } from "./components/server-detail";
import { ServerDetailTabs } from "./components/server-detail-tabs";
import { ServerDetailTitle } from "./components/server-detail-title";

interface CatalogDetailPageProps {
  params: Promise<{
    repoName: string;
    serverName: string;
    version: string;
  }>;
  searchParams: Promise<{
    registryName?: string;
  }>;
}

export default async function CatalogDetailPage({
  params,
  searchParams,
}: CatalogDetailPageProps) {
  const { repoName, serverName, version } = await params;
  const { registryName } = await searchParams;

  const fullServerName = `${repoName}/${serverName}`;
  const { data: serverResponse, response } = await getServerDetails(
    registryName,
    fullServerName,
    version,
  );

  // error should be handled in a special error.tsx component https://github.com/stacklok/toolhive-cloud-ui/issues/94

  if (response?.status === 404) {
    notFound();
  }

  const server = serverResponse?.server ?? {};
  const remote = server.remotes?.[0];
  let tools = getTools(server);
  const publisher = server.repository?.source;
  const serverType = remote?.type;

  // 平台自建反馈（按 OCI 引用聚合）与镜像元数据（best-effort 关联平台提交记录）
  const ociRef = `${fullServerName}:${version}`;
  const issues = await safe(
    getIssues("mcp", ociRef),
    [],
    "mcpDetail.getIssues",
  );
  const mcpList = await safe(getMcpServers(), [], "mcpDetail.getMcpServers");
  const mcp = mcpList.find(
    (m) => m.group_key === fullServerName && m.version === version,
  );
  // 源码包 README：列表接口不携带（避免 64KB×N），按 id 拉详情获取
  const mcpDetail = mcp?.id
    ? await safe(getMcpById(mcp.id), null, "mcpDetail.getById")
    : null;
  const mcpReadme = mcpDetail?.mcp_readme || null;
  const mcpReadmeName = mcpDetail?.mcp_readme_name || null;
  const mcpTree = mcpDetail?.mcp_tree || null;
  const mcpFileCount = mcpDetail?.mcp_file_count ?? null;
  const { isAdmin } = await getAuthContext();

  // 优先用运行中实例的真实 tools/list；无实例/调用失败则回退注册中心静态元数据
  let toolsLive = false;
  if (mcp?.id) {
    try {
      const t = await getMcpTools(mcp.id);
      if (t?.live && t.tools?.length) {
        tools = t.tools;
        toolsLive = true;
      }
    } catch (error) {
      // 后端不可用时回退注册中心静态元数据渲染，但留痕
      console.error("[mcpDetail.getTools]", error);
    }
  }

  return (
    // 详情页统一口径：全宽靠左（与 /mcp/[ref]、/skills/[id] 一致），不做居中限宽
    <div className="flex flex-col gap-5 py-4">
      <ServerDetailTitle server={server} version={version} />

      <ServerDetailTabs
        tools={tools}
        toolsLive={toolsLive}
        repositoryUrl={server.repository?.url}
        mcpReadme={mcpReadme}
        mcpReadmeName={mcpReadmeName}
        mcpId={mcp?.id}
        mcpTree={mcpTree}
        mcpFileCount={mcpFileCount}
        issues={issues}
        ociRef={ociRef}
        isAdmin={isAdmin}
      >
        <ServerDetail
          description={server.description}
          serverName={server.name ?? serverName}
          serverUrl={remote?.url}
          repositoryUrl={server.repository?.url}
          publisher={publisher}
          type={serverType}
          version={version}
        />
      </ServerDetailTabs>
    </div>
  );
}
