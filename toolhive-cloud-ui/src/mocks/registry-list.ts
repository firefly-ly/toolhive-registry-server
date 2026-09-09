import type { RequestHandler } from "msw";
import { HttpResponse, http } from "msw";
import { mockedGetRegistryByRegistryNameV01Servers } from "./fixtures/registry_registryName_v0_1_servers/get";

const ALL_SERVERS =
  mockedGetRegistryByRegistryNameV01Servers.defaultValue?.servers ?? [];

/**
 * 覆盖 /registry/:registryName/v0.1/servers 自动生成的静态 fixture，
 * 返回完整 registry server 列表（不做 cursor 切片），让 catalog page 能统一分页。
 */
export const registryListHandlers: RequestHandler[] = [
  http.get("/registry/:registryName/v0.1/servers", (info) => {
    // 测试通过 override/activateScenario 定制响应时，委托回 AutoAPIMock 实例，
    // 否则本 handler 会遮蔽 fixture 的场景/覆写机制（actions.test.ts 曾因此挂 5 个用例）。
    if (mockedGetRegistryByRegistryNameV01Servers.hasActiveOverride()) {
      return mockedGetRegistryByRegistryNameV01Servers.generatedHandler(info);
    }

    const url = new URL(info.request.url);
    const search = (url.searchParams.get("search") ?? "").trim().toLowerCase();

    const filtered = search
      ? ALL_SERVERS.filter((item) => {
          const s = item.server;
          return (
            s?.name?.toLowerCase().includes(search) ||
            s?.title?.toLowerCase().includes(search) ||
            s?.description?.toLowerCase().includes(search)
          );
        })
      : ALL_SERVERS;

    return HttpResponse.json({
      servers: filtered,
      metadata: { count: filtered.length },
    });
  }),
];
