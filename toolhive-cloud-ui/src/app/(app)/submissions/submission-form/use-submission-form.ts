// submission-form/use-submission-form.ts —— 提交表单状态 hook（自检整改重构④ 自主文件抽出）。
// 职责：全部字段状态、派生校验标志、镜像来源实时分级、分步推进/提交逻辑。
// 步骤组件（steps/*）只消费本 hook 的返回值；三段 DOM 常挂载（hidden 不卸载），
// FormData 完整性不受分步影响；表单 noValidate，必填校验由 handleSubmit 手动接管。
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import type { RegistryClassify } from "@/lib/platform-backend";
import { classifyRegistryAction } from "../actions";

export type FormType = "mcp" | "skill";

/** 校验清单单条的准入数据由派生标志计算，此处不需要额外类型 */

export function useSubmissionForm(
  action: (formData: FormData) => Promise<{
    ok: boolean;
    error?: string;
    existing_id?: string;
    existing_status?: string;
  }>,
) {
  const [type, setType] = useState<FormType>("skill");
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

  return {
    // 字段状态
    type,
    setType,
    transport,
    setTransport,
    imageRef,
    setImageRef,
    mcpSource,
    setMcpSource,
    sourceFile,
    setSourceFile,
    envFile,
    setEnvFile,
    tarFile,
    setTarFile,
    file,
    setFile,
    skillSource,
    setSkillSource,
    cls,
    autoMirror,
    setAutoMirror,
    dataSourceType,
    setDataSourceType,
    dataSourceTargets,
    setDataSourceTargets,
    dataSourceNote,
    setDataSourceNote,
    name,
    setName,
    payloadRef,
    setPayloadRef,
    desc,
    setDesc,
    // 步骤与提交
    step,
    setStep,
    pending,
    formRef,
    handleSubmit,
    goNext,
    resetFormState,
    // 派生标志
    isMcp,
    basicOk,
    descOk,
    urlMode,
    sourceReady,
    allOk,
  };
}

export type SubmissionFormState = ReturnType<typeof useSubmissionForm>;
