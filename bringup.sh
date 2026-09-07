#!/usr/bin/env bash
# ToolHive 平台本地全栈拉起（在 WSL2 内运行）
#   用法：bash /mnt/c/Users/19076/toolhive-registry-server/bringup.sh
#   可选：--force-3000   自动停掉占用 3000 端口的容器（如 malibang-app-1）
#         --keep-next    不删除 .next 缓存（默认删除，避免 DrvFS 写坏导致 500/ChunkLoadError）
set -u

UI_DIR="/mnt/c/Users/19076/toolhive-registry-server/toolhive-cloud-ui"
BE_SRC="/mnt/c/Users/19076/platform-backend/server.js"
BE_DIR="$HOME/platform-backend"

FORCE_3000=0
KEEP_NEXT=0
for a in "$@"; do
  case "$a" in
    --force-3000) FORCE_3000=1 ;;
    --keep-next)  KEEP_NEXT=1 ;;
  esac
done

hr() { printf '%s\n' "------------------------------------------------------------"; }

hr
echo "[1/5] 检查依赖服务（Casdoor :8000 / Registry API :8080）"
hr
for svc in "casdoor:8000" "toolhive-registry-api:8080"; do
  name="${svc%%:*}"; port="${svc##*:}"
  if docker ps --format '{{.Names}}' | grep -qx "$name"; then
    echo "  OK   $name 正在运行（:$port）"
  else
    echo "  WARN $name 未运行，尝试启动..."
    docker start "$name" >/dev/null 2>&1 && echo "       已启动" || echo "       启动失败，请手动检查"
  fi
done

hr
echo "[2/5] 释放 3000 端口（Cloud UI 专用，端口在 .env.local / Casdoor 回调中硬编码，不可更换）"
hr
OCCUPIER="$(docker ps --format '{{.Names}}\t{{.Ports}}' | grep ':3000->' | cut -f1 || true)"
if [ -n "$OCCUPIER" ]; then
  echo "  冲突：容器 [$OCCUPIER] 正占用 3000 端口"
  if [ "$FORCE_3000" = "1" ]; then
    docker stop "$OCCUPIER" >/dev/null && echo "  已停止 $OCCUPIER，3000 已释放"
  else
    echo "  未处理。请执行以下任一操作后重跑："
    echo "    docker stop $OCCUPIER"
    echo "    或给本脚本加参数： --force-3000"
    exit 1
  fi
else
  echo "  OK   3000 端口空闲"
fi

hr
echo "[3/5] 同步并启动平台后端（:4000）"
hr
if [ -f "$BE_SRC" ]; then
  cp "$BE_SRC" "$BE_DIR/server.js" && echo "  已同步 server.js 到 $BE_DIR（原生 ext4，规避 DrvFS 卡死）"
else
  echo "  WARN 未找到 $BE_SRC，沿用 $BE_DIR 现有版本"
fi
( cd "$BE_DIR" && bash start.sh )

echo "  健康检查："
if curl -s --max-time 3 127.0.0.1:4000/health | grep -q '"ok":true'; then
  echo "  OK   后端 :4000 健康"
  echo "  MCP 条目数：$(curl -s --max-time 3 127.0.0.1:4000/mcp | grep -o '"id"' | wc -l)"
else
  echo "  FAIL 后端未就绪，请查看 $BE_DIR/server.log"
  exit 1
fi

hr
echo "[4/5] 清理 Cloud UI 构建缓存"
hr
cd "$UI_DIR" || { echo "  找不到 $UI_DIR"; exit 1; }
if [ "$KEEP_NEXT" = "1" ]; then
  echo "  跳过（--keep-next）"
else
  rm -rf .next && echo "  已删除 .next"
fi

hr
echo "[5/5] 启动 Cloud UI（前台运行，Ctrl+C 停止）"
echo "      浏览器打开 http://localhost:3000    登录 admin / 123"
hr
exec pnpm dev:next
