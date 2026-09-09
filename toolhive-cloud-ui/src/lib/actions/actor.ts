// 从当前 Casdoor 会话解析操作人标识（email 优先，回退 name）。
// 仅供 lib/actions/* 下的 server actions 复用，本身不是 action。

import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";

export async function currentActor(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.email ?? session?.user?.name ?? "anonymous";
}
