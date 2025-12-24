import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';

export const searchPanelTheme = EditorView.theme({
  ".cm-panel.cm-search": {
    padding: "8px 12px",
    backgroundColor: "white",
    border: "1px solid #e2e8f0", // slate-200
    borderRadius: "8px",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    fontFamily: "inherit",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
    minWidth: "300px",
    maxWidth: "600px"
  },
  ".cm-search input": {
    border: "1px solid #cbd5e1", // slate-300
    borderRadius: "6px",
    padding: "4px 8px",
    outline: "none",
    fontSize: "13px",
    color: "#334155", // slate-700
    transition: "border-color 0.2s"
  },
  ".cm-search input:focus": {
    borderColor: "#3b82f6", // blue-500
    boxShadow: "0 0 0 1px #3b82f6"
  },
  ".cm-search button": {
    backgroundImage: "none",
    border: "1px solid #cbd5e1",
    backgroundColor: "white",
    borderRadius: "6px",
    padding: "4px 10px",
    margin: "0",
    cursor: "pointer",
    color: "#475569", // slate-600
    textTransform: "none",
    fontSize: "12px",
    fontWeight: "500",
    transition: "all 0.2s"
  },
  ".cm-search button:hover": {
    backgroundColor: "#f1f5f9", // slate-100
    borderColor: "#94a3b8",
    color: "#1e293b"
  },
  ".cm-search button[name='close']": {
    border: "none",
    padding: "4px",
    color: "#94a3b8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px"
  },
  ".cm-search button[name='close']:hover": {
    backgroundColor: "#f1f5f9",
    color: "#ef4444" // red-500
  },
  ".cm-search label": {
    fontSize: "12px",
    color: "#64748b", // slate-500
    display: "flex",
    alignItems: "center",
    gap: "4px",
    cursor: "pointer"
  },
  ".cm-search input[type='checkbox']": {
    margin: "0",
    cursor: "pointer"
  },
  ".cm-panel.cm-search [name=close]": {
    order: "100",
    marginLeft: "auto"
  }
});

export const searchLocalization = EditorState.phrases.of({
  "Find": "查找",
  "Replace": "替换",
  "next": "↓",
  "previous": "↑",
  "all": "全部",
  "match case": "区分大小写",
  "by word": "全字匹配",
  "replace": "替换",
  "replace all": "全部替换",
  "close": "✕",
  "regexp": "正则"
});
