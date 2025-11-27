#!/usr/bin/env bash
set -e

# 一键打包 Tauri 桌面版（Win/macOS/Linux）
# 需提前安装 Rust toolchain、Node 18+，并已安装 @tauri-apps/cli

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo ">> 确认依赖安装..."
if ! command -v cargo >/dev/null 2>&1; then
  if [ "${AUTO_INSTALL_DEPS}" = "1" ]; then
    echo "未检测到 cargo，自动安装 Rust (rustup)..."
    curl https://sh.rustup.rs -sSf | sh -s -- -y
    # shellcheck source=/dev/null
    source "$HOME/.cargo/env"
  else
    echo "未检测到 Rust/cargo，请安装后重试，或执行 AUTO_INSTALL_DEPS=1 $0 自动安装。"
    echo "安装指令: curl https://sh.rustup.rs -sSf | sh -s -- -y"
    exit 1
  fi
fi
if ! command -v cc >/dev/null 2>&1; then
  OS="$(uname -s)"
  if [ "$OS" = "Darwin" ]; then
    echo "未检测到 C 编译器，尝试执行 xcode-select --install（可能会弹窗确认）..."
    xcode-select --install || true
  elif command -v apt-get >/dev/null 2>&1; then
    echo "未检测到 C 编译器，自动安装 build-essential（需要 sudo）..."
    if command -v sudo >/dev/null 2>&1; then
      sudo apt-get update -y && sudo apt-get install -y build-essential gcc g++ clang
    else
      apt-get update -y && apt-get install -y build-essential gcc g++ clang
    fi
  elif command -v dnf >/dev/null 2>&1; then
    echo "未检测到 C 编译器，自动安装 Development Tools（需要 sudo）..."
    sudo dnf groupinstall -y "Development Tools" || true
    sudo dnf install -y gcc gcc-c++ clang make || true
  elif command -v yum >/dev/null 2>&1; then
    echo "未检测到 C 编译器，自动安装 Development Tools（需要 sudo）..."
    sudo yum groupinstall -y "Development Tools" || true
    sudo yum install -y gcc gcc-c++ clang make || true
  elif command -v pacman >/dev/null 2>&1; then
    echo "未检测到 C 编译器，自动安装 base-devel（需要 sudo）..."
    sudo pacman -Syu --noconfirm base-devel gcc clang || true
  elif command -v apk >/dev/null 2>&1; then
    echo "未检测到 C 编译器，自动安装 build-base（需要 root/sudo）..."
    sudo apk add --no-cache build-base gcc g++ clang || true
  else
    echo "未检测到 C 编译器 (cc/gcc/clang)，且无法自动安装。"
    echo "请手动安装："
    echo "  - macOS: xcode-select --install"
    echo "  - Debian/Ubuntu: sudo apt-get install build-essential"
    echo "  - Windows MSVC: https://visualstudio.microsoft.com/visual-cpp-build-tools/"
    exit 1
  fi

  if ! command -v cc >/dev/null 2>&1; then
    echo "C 编译器仍未检测到，终止。请手动安装后重试。"
    exit 1
  fi
fi
if [ ! -d node_modules ]; then
  echo ">> 安装前端依赖..."
  npm install
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
