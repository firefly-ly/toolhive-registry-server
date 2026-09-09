import { headers } from "next/headers";
import { getServers } from "@/app/(app)/catalog/actions";
import { PageHeader } from "@/components/header-page";
import { auth } from "@/lib/auth/auth";
import {
  getMcpServers,
  getSkills,
  listFavorites,
} from "@/lib/platform-backend";
import { safe } from "@/lib/safe-async";
import { FavsBlock } from "./favs-block";

async function currentActor(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.email ?? session?.user?.name ?? "anonymous";
}

interface FavoriteRow {
  item_type: "mcp" | "skill";
  item_ref: string;
  title: string;
  subtitle: string;
  description: string;
  href: string;
}

export default async function FavoritesPage() {
  const actor = await currentActor();
  const [favorites, skills, serversResult, submittedMcps] = await Promise.all([
    safe(listFavorites(actor), [], "favorites.list"),
    safe(getSkills(), [], "favorites.getSkills"),
    safe(getServers(), { servers: [] }, "favorites.getServers"),
    safe(getMcpServers(), [], "favorites.getMcpServers"),
  ]);

  const skillById = new Map(skills.map((s) => [s.id, s]));
  const serverByName = new Map(
    (serversResult.servers ?? []).map((s) => [s.name, s]),
  );
  const submittedMcpById = new Map(submittedMcps.map((m) => [m.id, m]));

  const rows: FavoriteRow[] = favorites.map((f) => {
    if (f.item_type === "skill") {
      const s = skillById.get(f.item_ref);
      return {
        item_type: "skill",
        item_ref: f.item_ref,
        title: s?.name ?? f.item_ref,
        subtitle: s?.owner ?? "",
        description: s?.description ?? "",
        href: `/skills/${encodeURIComponent(f.item_ref)}?from=favorites`,
      };
    }
    const registryServer = serverByName.get(f.item_ref);
    const submitted = submittedMcpById.get(f.item_ref);
    return {
      item_type: "mcp",
      item_ref: f.item_ref,
      title: registryServer?.title ?? submitted?.name ?? f.item_ref,
      subtitle: "MCP Server",
      description: registryServer?.description ?? submitted?.description ?? "",
      href: `/mcp/${encodeURIComponent(f.item_ref)}?from=favorites`,
    };
  });

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="我的收藏" />

      <div className="flex-1 overflow-auto px-8 pb-10 pt-4">
        <FavsBlock title="我的收藏" count={rows.length} rows={rows} />
      </div>
    </div>
  );
}
