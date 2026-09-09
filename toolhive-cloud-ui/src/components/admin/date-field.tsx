"use client";

import { useState } from "react";

/**
 * 筛选表单用的日期字段：空值时显示中文占位文字（原生 type=date 会显示
 * 生硬的 "yyyy/mm/dd"，观感差），聚焦或已有值时切换为真正的日期选择器。
 * 保持 <input name> 原样提交，GET 表单无需其它改动。
 */
export function DateField({
  id,
  name,
  placeholder,
  defaultValue,
  className = "h-9 w-40 rounded-md border bg-transparent px-2 text-sm shadow-xs dark:bg-input/30",
}: {
  id?: string;
  name: string;
  placeholder: string;
  defaultValue?: string;
  className?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState(defaultValue ?? "");
  const type = focused || value ? "date" : "text";
  return (
    <input
      id={id}
      type={type}
      name={name}
      value={value}
      placeholder={placeholder}
      onChange={(e) => setValue(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className={className}
    />
  );
}
