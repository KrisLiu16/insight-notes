# Zhishi — AI 笔记与桌面应用

一个支持 AI 分析、润色、对话、Markdown 预览/多主题、Mermaid、KaTeX，以及多格式导出的现代笔记应用。已接入 Tauri 打包脚本，可一键生成 Win/macOS/Linux 桌面版本。

## 开发

```bash
npm install
npm run dev    # 开发服务：默认 3334
```

## 特性速览

- 笔记：分类、标签、全局搜索、侧栏与列表折叠动画
- AI：分析/润色带确认弹窗；对话侧栏；多模型预设；撤回式编辑
- 预览：多套 Markdown 主题（经典/书卷/柔彩/纸质/夜间/高对比）、Mermaid、KaTeX、任务列表
- 导出：PDF/PNG/HTML/Markdown，尺寸/方向/缩放/边距可调，文件保存支持文件选择器
- 备份：笔记+配置 JSON 导入/导出，支持文件保存器

## 打包桌面应用（Tauri）

1. 安装 Rust toolchain & Node 18+，并确保 `cargo` 可用。
2. 一键打包：
   ```bash
   ./scripts/tauri-build.sh
   ```
   产物位于 `src-tauri/target/release`（Windows: exe/msi，macOS: app/dmg）。

如需自定义窗口或图标，可修改 `src-tauri/tauri.conf.json`。+
