"use client";

import { Download, FileText, Folder } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { recordDownloadAction } from "@/lib/platform-actions";

interface SkillDownloadDialogProps {
  skill: {
    id: string;
    name: string;
    description: string;
    owner: string;
    item_ref: string;
    download_url?: string;
    group_key?: string;
    version?: string;
    skill_tree?: string[];
  };
}

export function SkillDownloadDialog({ skill }: SkillDownloadDialogProps) {
  const [open, setOpen] = useState(false);

  function doDownload() {
    void recordDownloadAction("skill", skill.id);

    if (skill.download_url) {
      window.open(skill.download_url, "_blank", "noopener,noreferrer");
    } else {
      const payload = {
        name: skill.name,
        description: skill.description,
        owner: skill.owner,
        ref: skill.item_ref,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${skill.name}.skill.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    setOpen(false);
  }

  const files = skill.skill_tree?.length ? skill.skill_tree : ["skill.json"];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Download className="h-3.5 w-3.5" />
          下载
        </Button>
      </DialogTrigger>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>下载「{skill.name}」</DialogTitle>
          <DialogDescription>
            确认下载以下文件？下载后可在本地导入使用。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md border">
            <div className="flex items-center gap-2 border-b bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
              <Folder className="h-3.5 w-3.5" />
              包含文件（{files.length}）
            </div>
            <ul className="max-h-56 overflow-auto py-1">
              {files.map((file) => (
                <li
                  key={file}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm"
                >
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate">{file}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              取消
            </Button>
            <Button type="button" size="sm" onClick={doDownload}>
              确认下载
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
