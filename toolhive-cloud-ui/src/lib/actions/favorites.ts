"use server";

import { revalidatePath } from "next/cache";
import { currentActor } from "@/lib/actions/actor";
import {
  createFavorite,
  removeFavorite,
  reportMetric,
} from "@/lib/platform-backend";

// 切换收藏（MCP / skill 通用）：当前已收藏则取消，否则新增
export async function toggleFavoriteAction(
  item_type: string,
  item_ref: string,
  favorited: boolean,
) {
  const actor = await currentActor();
  if (favorited) {
    await removeFavorite({ user_id: actor, item_type, item_ref });
  } else {
    await createFavorite({ user_id: actor, item_type, item_ref });
  }
  revalidatePath("/catalog");
  revalidatePath("/skills");
  revalidatePath("/favorites");
}

// 记录下载事件（skill）：每点一次下载 +1
export async function recordDownloadAction(
  item_type: string,
  item_ref: string,
) {
  const actor = await currentActor();
  await reportMetric({
    item_type,
    item_ref,
    event: "download",
    actor_id: actor,
  });
  revalidatePath("/skills");
}

// 记录调用事件（mcp）：每点一次"调用" +1
export async function recordCallAction(item_type: string, item_ref: string) {
  const actor = await currentActor();
  await reportMetric({ item_type, item_ref, event: "call", actor_id: actor });
  revalidatePath("/catalog");
}
