"use client";

import { useState } from "react";
import { Eye, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Submission } from "@/lib/platform-backend";
import { setVisibilityAction } from "../../submissions/actions";

interface VisibilityData {
  mode: "all" | "restricted";
  users: string[];
  groups: string[];
}

function readVisibility(s: Submission): VisibilityData {
  try {
    const meta = s.meta ? (JSON.parse(s.meta) as Record<string, unknown>) : {};
    const v = meta.visibility as Partial<VisibilityData> | undefined;
    if (v && v.mode === "restricted") {
      return {
        mode: "restricted",
        users: Array.isArray(v.users) ? v.users : [],
        groups: Array.isArray(v.groups) ? v.groups : [],
      };
    }
  } catch {
    /* 解析失败按默认 */
  }
  return { mode: "all", users: [], groups: [] };
}

const inputClass =
  "border-input h-10 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]";

// 管理员配置条目可见范围：全员可见，或仅指定成员（邮箱）/组可见。
// 提交到 setVisibilityAction（Server Action），后端硬校验管理员身份。
export function VisibilityDialog({ s }: { s: Submission }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"all" | "restricted">(
    readVisibility(s).mode,
  );
  const vis = readVisibility(s);
  const notOnShelf =
    (s.meta ? (() => { try { const m = JSON.parse(s.meta); return m?.visibility_configured === false; } catch { return false; } })() : false) === true;
  const isMcp = s.type === "mcp";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={notOnShelf ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
        >
          <Eye className="size-3.5" />
          {notOnShelf ? "上线 / 可见范围" : "可见范围"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>设置可见范围</DialogTitle>
          <DialogDescription>
            决定哪些成员或组可以查看、下载、调用「{s.payload_ref}
            」。
            {notOnShelf
              ? isMcp
                ? " 该条目尚未上线：保存可见范围即完成上线，此后才解锁「部署」按钮。"
                : " 该条目尚未上线：保存可见范围即完成上架，此后才对所选范围开放目录可见与下载。"
              : " 默认全员可见；设为指定范围后，未授权用户在目录中不可见、无法下载与调用。"}
          </DialogDescription>
        </DialogHeader>
        <form action={setVisibilityAction} className="space-y-4">
          <input type="hidden" name="id" value={s.id} />
          <input type="hidden" name="mode" value={mode} />

          <div className="grid grid-cols-1 gap-2">
            <label
              className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 ${
                mode === "all" ? "border-primary bg-primary/5" : ""
              }`}
            >
              <input
                type="radio"
                name="mode-radio"
                checked={mode === "all"}
                onChange={() => setMode("all")}
                className="mt-1 size-4"
              />
              <span>
                <span className="block text-sm font-medium">全员可见</span>
                <span className="block text-xs text-muted-foreground">
                  所有登录用户都可在目录中查看、下载、调用该条目。
                </span>
              </span>
            </label>
            <label
              className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 ${
                mode === "restricted" ? "border-primary bg-primary/5" : ""
              }`}
            >
              <input
                type="radio"
                name="mode-radio"
                checked={mode === "restricted"}
                onChange={() => setMode("restricted")}
                className="mt-1 size-4"
              />
              <span>
                <span className="block text-sm font-medium">
                  仅指定成员 / 组可见
                </span>
                <span className="block text-xs text-muted-foreground">
                  只有下方名单内的成员或组成员可以访问，其他人完全不可见。
                </span>
              </span>
            </label>
          </div>

          {mode === "restricted" && (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="vis-users"
                  className="flex items-center gap-1.5 text-sm font-medium"
                >
                  <Users className="size-3.5" />
                  允许的成员（邮箱，逗号分隔）
                </label>
                <Input
                  id="vis-users"
                  name="users"
                  defaultValue={vis.users.join(", ")}
                  placeholder="user_0jlya@example.com, user_1abvfd@example.com"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="vis-groups"
                  className="flex items-center gap-1.5 text-sm font-medium"
                >
                  <Eye className="size-3.5" />
                  允许的组（组名，逗号分隔）
                </label>
                <Input
                  id="vis-groups"
                  name="groups"
                  defaultValue={vis.groups.join(", ")}
                  placeholder="product-team, platform-eng"
                  className={inputClass}
                />
                <p className="text-xs text-muted-foreground">
                  组名与登录用户身上的 groups 标识匹配（来自 Casdoor / IdP 的
                  groups 声明）。管理员始终可见全部条目。
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              取消
            </Button>
            <Button type="submit">
              {notOnShelf ? "保存并上线" : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
