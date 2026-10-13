"use client";

import { Fragment, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Hint } from "@/components/hint";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RegistryClassify } from "@/lib/platform-backend";
import { cn } from "@/lib/utils";
import { classifyRegistryAction } from "./actions";
import {
  inputClass,
  McpSourceSection,
  selectTriggerClass,
} from "./mcp-source-section";
import { SkillSourceSection } from "./skill-source-section";

interface SubmissionFormProps {
  action: (formData: FormData) => Promise<{
    ok: boolean;
    error?: string;
    existing_id?: string;
    existing_status?: string;
  }>;
}

const STEPS = [
  { n: 0, label: "选择类型", sub: "决定后续流程" },
  { n: 1, label: "基本信息", sub: "名称 · 引用 · 版本" },
  { n: 2, label: "制品来源", sub: "ghcr / tar / 源码包" },
  { n: 3, label: "确认提交", sub: "校验清单把关" },
] as const;

/** 校验清单单条：ok=通过（绿），否则红；pending=提交时校验（琥珀） */
function CheckItem({
  ok,
  pending,
  label,
}: {
  ok: boolean;
  pending?: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={cn(
          "flex size-4.5 shrink-0 items-center justify-center rounded-full text-xs font-medium",
          ok
            ? "bg-success/15 text-success"
            : pending
              ? "bg-warning/15 text-warning"
              : "bg-destructive/15 text-destructive",
        )}
      >
        {ok ? "✓" : pending ? "⟳" : "✕"}
      </span>
      <span className={ok ? "" : pending ? "text-muted-foreground" : ""}>
        {label}
      </span>
    </div>
  );
}

/**
 * 提交表单「发布通道」：顶部三站进度轨（可点击跳转）+ 分步展示 +
 * 第 3 步实时校验清单（全绿才亮提交钮）。
 * 三段 DOM 始终挂载（隐藏不卸载），FormData 完整性不受分步影响；
 * 表单 noValidate，必填校验由 handleSubmit 手动接管（隐藏字段的浏览器校验会误拦）。
 */
export function SubmissionForm({ action }: SubmissionFormProps) {
  const [type, setType] = useState<"mcp" | "skill">("skill");
  const [transport, setTransport] = useState("auto");
  const [imageRef, setImageRef] = useState("");
  const [mcpSource, setMcpSource] = useState<"ghcr" | "tar" | "source">("ghcr");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [envFile, setEnvFile] = useState<File | null>(null);
  const [tarFile, setTarFile] = useState<File | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [skillSource, setSkillSource] = useState<"file" | "url">("file");
  const [error, setError] = useState("");
  // 报错统一以 toast 弹出（自动消失、点击可关），不再在表单内嵌红字
  useEffect(() => {
    if (error) toast.error(error, { duration: 6000 });
  }, [error]);
  const [cls, setCls] = useState<RegistryClassify | null>(null);
  const [autoMirror, setAutoMirror] = useState(false);
  // 数据源声明（两段式豁免第 1 段）：提交者声明意图，审批者决定是否授权解除隔离
  const [dataSourceType, setDataSourceType] = useState("none");
  const [dataSourceTargets, setDataSourceTargets] = useState("");
  const [dataSourceNote, setDataSourceNote] = useState("");
  const [pending, startTransition] = useTransition();

  // 发布通道状态：当前步骤 + 清单所需的基本字段受控值
  // step 0 = 选择类型（效果图 03 分道版）；1/2/3 与原三步一致
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [payloadRef, setPayloadRef] = useState("");
  const [desc, setDesc] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const isMcp = type === "mcp";
  const basicOk = !!payloadRef.trim() && !!name.trim();
  const descOk = isMcp ? true : !!desc.trim();
  // URL 模式的文件位置无法实时响应（非受控），交给提交时校验，清单显示为琥珀待检
  const urlMode = !isMcp && skillSource === "url";
  const sourceReady = isMcp
    ? mcpSource === "ghcr"
      ? !!imageRef.trim() && (!cls || cls.allowed)
      : mcpSource === "tar"
        ? !!tarFile
        : !!sourceFile
    : skillSource === "file"
      ? !!file
      : true;
  const allOk = basicOk && sourceReady && descOk;

  // 镜像来源实时校验：debounce 400ms 后查后端分级结果（仅 ghcr 来源需要）。
  // 白名单以后端配置为准，前端不另存一份，避免两边不一致。
  useEffect(() => {
    if (!isMcp || mcpSource !== "ghcr") {
      setCls(null);
      return;
    }
    const ref = imageRef.trim();
    if (!ref) {
      setCls(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      classifyRegistryAction(ref).then((r) => {
        if (!cancelled) setCls(r);
      });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [imageRef, isMcp, mcpSource]);

  // 外部受信源默认开启自动同步；平台后端在审批阶段也会强制 mirror，这里只是给用户明示。
  useEffect(() => {
    if (cls?.tier === 2) setAutoMirror(true);
  }, [cls]);

  function validateSkillExtension(filename: string) {
    const lower = filename.toLowerCase();
    const allowed = [".zip", ".tar.gz", ".tgz", ".tar"];
    return allowed.some((ext) => lower.endsWith(ext));
  }

  function resetFormState() {
    setFile(null);
    setSkillSource("file");
    setImageRef("");
    setMcpSource("ghcr");
    setTarFile(null);
    setSourceFile(null);
    setEnvFile(null);
    setAutoMirror(false);
    setCls(null);
    setName("");
    setPayloadRef("");
    setDesc("");
    setStep(1);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    // noValidate 后浏览器不再拦截，必填项在此手动接管（分步下隐藏字段浏览器校验会误拦）
    if (!payloadRef.trim() || !name.trim()) {
      setError("请填写引用与名称（第 1 步）");
      setStep(1);
      return;
    }
    if (!isMcp && !desc.trim()) {
      setError("请填写描述（Skill 提交必填）");
      setStep(3);
      return;
    }
    // 事件对象不能跨异步边界使用；进入 startTransition 前捕获 form 引用。
    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);
    startTransition(async () => {
      try {
        if (isMcp) {
          fd.set("mcp_source", mcpSource);
          // 数据源声明：仅在有声明时传（none 不传，后端视为未声明）
          if (dataSourceType !== "none") {
            fd.set("data_source_type", dataSourceType);
            fd.set("data_source_targets", dataSourceTargets);
            fd.set("data_source_note", dataSourceNote);
          }
          if (mcpSource === "tar") {
            if (!tarFile) {
              setError("请选择要上传的镜像 tar 包（来自 docker save）");
              setStep(2);
              return;
            }
            if (!/\.(tar|tar\.gz|tgz)$/i.test(tarFile.name)) {
              setError(
                "镜像包仅支持 .tar / .tar.gz / .tgz（请使用 docker save 导出）",
              );
              return;
            }
            // file 已在 form 中，Server Action 会读取并上传到 /upload/tar
          } else if (mcpSource === "source") {
            if (!sourceFile) {
              setError(
                "请选择源码包文件（zip / tar.gz，含 package.json 或 requirements.txt）",
              );
              setStep(2);
              return;
            }
            if (!/\.(zip|tar\.gz|tgz)$/i.test(sourceFile.name)) {
              setError("源码包仅支持 .zip / .tar.gz / .tgz 格式");
              return;
            }
            if (sourceFile.size > 20 * 1024 * 1024) {
              setError("源码包上限 20MB");
              return;
            }
            if (
              envFile &&
              !/\.env/i.test(envFile.name) &&
              !envFile.name.includes("env")
            ) {
              setError("私密配置文件请使用 .env 格式");
              return;
            }
            // source_file / env_file 已在 form 中，Server Action 会走源码构建提交链
          } else {
            if (!imageRef.trim()) {
              setError(
                "请填写外部镜像源地址（如 ghcr.io/你的组织/my-mcp:1.0.0）",
              );
              setStep(2);
              return;
            }
            // 未知来源先在本地拦一道，不必发到后端才报错
            if (cls && !cls.allowed) {
              setError(`镜像来源未通过校验：${cls.message}`);
              setStep(2);
              return;
            }
            fd.set("image_ref", imageRef.trim());
            if (transport !== "auto") fd.set("transport", transport);
            else fd.delete("transport");
            if (autoMirror) fd.set("auto_mirror", "1");
            else fd.delete("auto_mirror");
          }
        } else {
          if (skillSource === "file") {
            if (!file) {
              setError("请选择要上传的技能包文件");
              setStep(2);
              return;
            }
            if (!validateSkillExtension(file.name)) {
              setError("技能包只支持 .zip / .tar.gz / .tgz / .tar 格式");
              return;
            }
            // file 已在 form 中，Server Action 会读取并上传
          } else {
            const url = String(fd.get("download_url") ?? "").trim();
            if (!url) {
              setError("请填写技能包文件所在位置");
              setStep(2);
              return;
            }
            fd.delete("file");
          }
        }
        const result = await action(fd);
        // 后端拦截（去重 409 / 限流 429 等）：保留表单内容，直接回显错误
        if (result && !result.ok) {
          const hint = result.existing_id
            ? `（已存在提交 ${result.existing_id}，状态：${result.existing_status}）`
            : "";
          setError(result.error + hint);
          return;
        }
        // 成功才重置 DOM
        toast.success("已提交，进入审核队列");
        form.reset();
        resetFormState();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`提交发生异常：${msg}`);
      }
    });
  }

  /** 分步「下一步」的准入校验：每步只检自己的事 */
  function goNext(from: 1 | 2) {
    if (from === 1 && !basicOk) {
      setError("请先填写引用与名称");
      return;
    }
    if (from === 2 && !sourceReady) {
      setError("请先在第 2 步补全制品来源");
      return;
    }
    setError("");
    setStep(from + 1);
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col md:flex-row"
    >
      {/* 左侧竖排步骤轨（效果图 03：灰底、28px 圆圈、当前步琥珀底 + 副标） */}
      <aside
        aria-label="提交步骤"
        className="hidden w-[230px] shrink-0 border-r-[1.5px] border-border bg-secondary/50 px-7 py-7 md:block"
      >
        {STEPS.map((r) => {
          const done = step > r.n;
          const active = step === r.n;
          const label = r.n === 2 && !isMcp ? "上传技能包" : r.label;
          const sub = r.n === 2 && !isMcp ? "zip 包 · SKILL.md 校验" : r.sub;
          return (
            <button
              key={r.n}
              type="button"
              onClick={() => setStep(r.n)}
              className="flex w-full cursor-pointer gap-3 py-2.5 text-left"
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border-[1.5px] text-xs font-semibold",
                  active
                    ? "border-foreground bg-highlight text-foreground"
                    : done
                      ? "border-success bg-success/10 text-success"
                      : "border-border bg-card text-muted-foreground",
                )}
              >
                {done ? "✓" : r.n === 0 ? "1" : r.n + 1}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-[15px] font-semibold",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
                {sub && (
                  <span
                    className={cn(
                      "mt-0.5 block text-[14px]",
                      active ? "text-warning" : "text-muted-foreground/80",
                    )}
                  >
                    {sub}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </aside>

      <div className="min-w-0 flex-1 space-y-5 md:px-9 md:py-7">
        <input type="hidden" name="type" value={type} />

        {/* ── 第 0 步：选择类型（MCP / Skill 分道，效果图 03）── */}
        {step === 0 && (
          <section>
            <p className="mb-3.5 text-[14px] font-semibold tracking-[0.15em] text-muted-foreground">
              条目类型（决定后续流程，提交后不可更改）
            </p>
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
              {/* MCP 大卡：52px 蓝拱内嵌琥珀圆点，选中 2px 黑边 + 琥珀垂片 */}
              <button
                type="button"
                onClick={() => setType("mcp")}
                aria-pressed={isMcp}
                className={cn(
                  "relative cursor-pointer overflow-hidden rounded-xl p-5 text-left transition-colors",
                  isMcp
                    ? "border-2 border-foreground bg-card"
                    : "border-[1.5px] border-border bg-card hover:border-muted-foreground/60",
                )}
              >
                {isMcp && (
                  <span className="absolute top-0 right-4.5 rounded-b-lg bg-highlight px-3 py-1 text-[12.5px] font-semibold text-foreground">
                    已选
                  </span>
                )}
                <span
                  aria-hidden
                  className="relative block size-13 rounded-t-full bg-info"
                >
                  <span className="absolute top-6.5 left-4 size-5 rounded-full bg-highlight" />
                </span>
                <b className="mt-3.5 block text-[19px]">MCP 服务</b>
                <p className="mt-1.5 text-xs leading-[1.7] text-muted-foreground">
                  给助手接入外部能力的工具服务：部署运行、被调用、可回滚。
                </p>
                <div className="mt-3 flex flex-col gap-1 text-[14.5px] text-success">
                  <span>✓ 镜像地址 / tar 包 / 源码包三种来源</span>
                  <span>✓ 审批通过后自动部署，支持版本回滚</span>
                  <span>✓ 统计调用量 / 延迟 / 失败率</span>
                </div>
              </button>
              {/* Skill 大卡：52px 绿圆内嵌琥珀山形 */}
              <button
                type="button"
                onClick={() => setType("skill")}
                aria-pressed={!isMcp}
                className={cn(
                  "relative cursor-pointer overflow-hidden rounded-xl p-5 text-left transition-colors",
                  !isMcp
                    ? "border-2 border-foreground bg-card"
                    : "border-[1.5px] border-border bg-card hover:border-muted-foreground/60",
                )}
              >
                {!isMcp && (
                  <span className="absolute top-0 right-4.5 rounded-b-lg bg-highlight px-3 py-1 text-[12.5px] font-semibold text-foreground">
                    已选
                  </span>
                )}
                <span
                  aria-hidden
                  className="relative block size-13 rounded-full bg-success"
                >
                  <span className="absolute bottom-1.5 left-3.5 h-4 w-7.5 bg-highlight [clip-path:polygon(0_100%,50%_0,100%_100%)]" />
                </span>
                <b
                  className={cn(
                    "mt-3.5 block text-[19px]",
                    !isMcp ? "" : "text-muted-foreground",
                  )}
                >
                  Skill 技能
                </b>
                <p className="mt-1.5 text-xs leading-[1.7] text-muted-foreground">
                  打包上传的提示词技能：上传时自动校验，审批通过后上架下载。
                </p>
                <div className="mt-3 flex flex-col gap-1 text-[14.5px] text-success">
                  <span>✓ zip / tar.gz 上传，SKILL.md 自动校验</span>
                  <span>✓ 审批通过后上架，按权限下载</span>
                  <span>✓ 统计下载量与版本分布</span>
                </div>
              </button>
            </div>
            <div className="mt-6 flex justify-end">
              <Button type="button" size="lg" onClick={() => setStep(1)}>
                下一步：基本信息 →
              </Button>
            </div>
          </section>
        )}

        <div className={step !== 1 ? "hidden" : ""}>
          <section className="rounded-xl border p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                1
              </span>
              <h3 className="font-medium">基本信息</h3>
              <span className="text-xs text-muted-foreground">
                类型、引用与展示名称
              </span>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[180px_1fr_1fr]">
                <div className="space-y-2">
                  <label
                    htmlFor="submission-type"
                    className="block text-sm font-medium"
                  >
                    类型
                  </label>
                  <Select
                    value={type}
                    onValueChange={(value) => setType(value as "mcp" | "skill")}
                  >
                    <SelectTrigger
                      id="submission-type"
                      className={selectTriggerClass}
                    >
                      <SelectValue placeholder="选择类型">
                        {type === "mcp" ? "MCP Server" : "Skills"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      className="w-[var(--radix-select-trigger-width)]"
                    >
                      <SelectItem value="mcp">MCP Server</SelectItem>
                      <SelectItem value="skill">Skills</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="payload_ref"
                    className="block text-sm font-medium"
                  >
                    引用
                  </label>
                  <input
                    id="payload_ref"
                    name="payload_ref"
                    placeholder="dws-explorer:1.0.0"
                    className={inputClass}
                    value={payloadRef}
                    onChange={(e) => setPayloadRef(e.target.value)}
                  />
                  <Hint text="提交引用（payload_ref）：产品名:版本号，如 dws-explorer:1.0.0。系统据此自动分组并识别版本，同名产品多版本可并存。">
                    <span>格式建议</span>
                  </Hint>
                </div>

                <div className="space-y-2">
                  <label htmlFor="name" className="block text-sm font-medium">
                    名称（必填）
                  </label>
                  <input
                    id="name"
                    name="name"
                    placeholder="DWS 数据探查器"
                    className={inputClass}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor="group_key"
                    className="block text-sm font-medium"
                  >
                    产品标识（可选）
                  </label>
                  <input
                    id="group_key"
                    name="group_key"
                    placeholder="默认从引用中提取，如 dws-explorer"
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="version"
                    className="block text-sm font-medium"
                  >
                    版本号（可选）
                  </label>
                  <input
                    id="version"
                    name="version"
                    placeholder="默认从引用中提取，如 1.0.0"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="w-full space-y-2">
                <label
                  htmlFor="repository_url"
                  className="block text-sm font-medium"
                >
                  仓库地址（可选）
                </label>
                <input
                  id="repository_url"
                  name="repository_url"
                  placeholder="https://github.com/你的组织/你的仓库"
                  className={inputClass}
                />
                <p className="text-xs text-muted-foreground">
                  填写后详情页会展示仓库入口（最新代码 / 最新
                  README）；不填则以上传的源码包为准。
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                onClick={() => goNext(1)}
                disabled={!basicOk}
              >
                下一步
              </Button>
            </div>
          </section>
        </div>

        <div className={step !== 2 ? "hidden" : ""}>
          <section className="rounded-xl border p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                2
              </span>
              <h3 className="font-medium">制品来源</h3>
              <span className="text-xs text-muted-foreground">
                {isMcp ? "镜像 / tar 包 / 源码构建" : "技能包文件或下载地址"}
              </span>
            </div>
            {isMcp ? (
              <McpSourceSection
                mcpSource={mcpSource}
                onSourceChange={setMcpSource}
                imageRef={imageRef}
                onImageRefChange={setImageRef}
                cls={cls}
                autoMirror={autoMirror}
                onAutoMirrorChange={setAutoMirror}
                transport={transport}
                onTransportChange={setTransport}
                tarFile={tarFile}
                onTarFile={setTarFile}
                sourceFile={sourceFile}
                onSourceFile={setSourceFile}
                envFile={envFile}
                onEnvFile={setEnvFile}
                dataSourceType={dataSourceType}
                onDataSourceTypeChange={setDataSourceType}
                dataSourceTargets={dataSourceTargets}
                onDataSourceTargetsChange={setDataSourceTargets}
                dataSourceNote={dataSourceNote}
                onDataSourceNoteChange={setDataSourceNote}
              />
            ) : (
              <SkillSourceSection
                skillSource={skillSource}
                onSourceChange={setSkillSource}
                file={file}
                onFile={setFile}
              />
            )}
            <div className="mt-4 flex justify-between">
              <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                上一步
              </Button>
              <Button
                type="button"
                onClick={() => goNext(2)}
                disabled={!sourceReady}
              >
                下一步
              </Button>
            </div>
          </section>
        </div>

        <div className={step !== 3 ? "hidden" : ""}>
          <section className="rounded-xl border p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                3
              </span>
              <h3 className="font-medium">描述与提交</h3>
              <span className="text-xs text-muted-foreground">
                描述会展示在目录卡片上
              </span>
            </div>
            <div className="space-y-4">
              <div className="w-full space-y-2">
                <label
                  htmlFor="description"
                  className="block text-sm font-medium"
                >
                  描述{isMcp ? "（可选）" : "（必填）"}
                </label>
                <input
                  id="description"
                  name="description"
                  placeholder={
                    isMcp
                      ? "一句话描述这个 MCP Server 能做什么"
                      : "一句话描述这个技能能做什么"
                  }
                  className={inputClass}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
              </div>

              {/* 发布前检查单：全绿才亮提交钮 */}
              <div className="space-y-2 rounded-xl border bg-muted/30 p-4">
                <p className="text-sm font-medium">发布前检查</p>
                <CheckItem ok={basicOk} label="引用与名称已填写" />
                <CheckItem
                  ok={sourceReady}
                  pending={urlMode}
                  label={
                    urlMode ? "文件位置将在提交时校验可达性" : "制品来源已就绪"
                  }
                />
                <CheckItem
                  ok={descOk}
                  label={isMcp ? "描述已填写（可选）" : "描述已填写"}
                />
                {isMcp && mcpSource === "ghcr" && (
                  <CheckItem
                    ok={!!cls?.allowed}
                    pending={!cls}
                    label={
                      cls
                        ? cls.allowed
                          ? `镜像来源校验通过（${cls.tier === 2 ? "受信源" : cls.tier === 1 ? "外部公网源" : "受限来源"}）`
                          : `镜像来源未通过校验：${cls.message}`
                        : "镜像来源校验中…"
                    }
                  />
                )}
              </div>

              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep(2)}
                >
                  上一步
                </Button>
                <Button type="submit" size="lg" disabled={pending || !allOk}>
                  {pending ? "提交中…" : "提交"}
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </form>
  );
}
