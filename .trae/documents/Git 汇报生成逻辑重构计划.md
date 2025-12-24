# Git 汇报生成逻辑重构计划（修正版）

我将重构 Git 汇报生成流程，确保代码 Diff 由本地提供，AI 仅负责分析。

## 1. 修改提示词 (`services/storage.ts`)

更新 `DEFAULT_MERGE_SUMMARY_PROMPT`，调整输出 JSON 结构：

*   **`title`**: 标题。
*   **`content`**: 核心总结（Context, Summary, Impact 等），**不包含**代码 Diff。
*   **`file_reviews`**: 新增字段 `Map<string, string>`，Key 为文件路径，Value 为该文件的技术分析文案。

## 2. 前端逻辑重构 (`components/GitReportModal.tsx`)

增加 Diff 切分与 Markdown 组装逻辑：

1.  **Diff 切分**：实现 `parseDiffMap` 函数，解析本地 `diffText`，提取每个文件的 Diff 代码块。
2.  **内容组装**：
    *   使用 AI 返回的 `content` 作为开头。
    *   追加 `## 文件更改详情`（或类似标题）。
    *   遍历变更文件列表：
        *   写入文件名标题：`### path/to/file`
        *   写入 AI 分析：直接插入 `file_reviews[path]` 的内容（如有）。
        *   写入 Diff 代码：直接插入本地切分出的 Diff 片段（包裹在代码块中）。
3.  **纯净输出**：确保拼接过程中**不添加**任何如“(AI 生成)”之类的额外注释或标记，保持文档专业整洁。

## 3. 最终效果示例

```markdown
# [Feature] 新增场景透传

## Summary
...

## 文件更改详情

### biz/handler/query_product_info.go

新增了 GetSceneType 方法，用于从上下文中提取场景信息。

```diff
 func ...
+ 	 	  "scene":            e.Params.GetSceneType(),
```

### ...
```