# Prompt Config Enhancement Plan

I will refine the default "Git Merge Summary" prompt to match your requested "concise, technical" style and add a feature to export/import prompt configurations, allowing for granular selection.

## 1. Refine Default Prompt
I will update `DEFAULT_MERGE_SUMMARY_PROMPT` in `services/storage.ts` to remove emojis and adopt a cleaner, more technical structure similar to your example.

**New Template Structure:**
```markdown
# [Type] Title

## Context
- **Time**: {commit_date}
- **Author**: {author}
- **Commit**: {hash}

## Summary
{brief_summary}

## Key Changes
- {point_1}
- {point_2}

## Impact
{impact_analysis}
```

## 2. Configuration Management (Export/Import)
I will implement a "Prompt Manager" feature within the Settings, allowing you to manage your custom prompts as "documents".

- **New `PromptImportExportModal` Component**:
    - **Export**: Lists available prompts (Analyze, Polish, Merge Summary). You can check/uncheck which ones to export to a JSON file.
    - **Import**: Reads a JSON file, shows available prompts in it, and lets you select which ones to import (overwriting current settings).

- **Update `SettingsModal`**:
    - Add a "Manage Prompts" section under "AI Model Config" -> "Prompts Engineering".
    - This section will have "Export Prompts" and "Import Prompts" buttons that trigger the new modal.
    - I will also add the "Git Merge Summary" prompt to the main `SettingsModal` so you can edit it globally, not just in the Git Report window.

- **Update Data Persistence**:
    - Add `customMergePrompt` to `AppSettings` in `types.ts`.
    - Update `loadSettings` / `saveSettings` in `storage.ts` to persist this new field.
    - Update `GitReportModal` to use the global setting `settings.customMergePrompt` as the default value for its local state.

## 3. Execution Steps
1.  **Modify `services/storage.ts`**: Update `DEFAULT_MERGE_SUMMARY_PROMPT` and `loadSettings`.
2.  **Modify `types.ts`**: Add `customMergePrompt` to `AppSettings`.
3.  **Create `components/PromptImportExportModal.tsx`**: Implement the granular selection UI.
4.  **Modify `components/SettingsModal.tsx`**: Add the "Git Merge Prompt" editor and the Export/Import buttons.
5.  **Modify `components/GitReportModal.tsx`**: Sync with the global setting.

This plan addresses both your need for a "cleaner" default template and the ability to manage/share these configurations flexibly.