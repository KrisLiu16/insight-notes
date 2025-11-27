#!/usr/bin/env bash
set -e

# 一键打包 Tauri 桌面版（Win/macOS/Linux）
# 需提前安装 Rust toolchain、Node 18+，并已安装 @tauri-apps/cli

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo ">> 确认依赖安装..."
if ! command -v cargo >/dev/null 2>&1; then
  echo "未检测到 Rust/cargo，请先安装 https://www.rust-lang.org/tools/install"
  exit 1
fi
if ! npx tauri -h >/dev/null 2>&1; then
  echo "安装 tauri cli..."
  npm install -D @tauri-apps/cli
fi

echo ">> 构建前端..."
npm run build

echo ">> 打包 Tauri 应用..."
npx tauri build

echo ">> 完成。产物位于 src-tauri/target/release 下。"
