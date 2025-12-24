import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { X, Code, Globe, Play, Copy, Trash2, Maximize2, Minimize2, FileJson, ArrowRightLeft, Check, Terminal, Eye, AlignLeft, ListTree, ChevronRight, ChevronDown, PanelLeftClose, PanelLeftOpen, FoldVertical, UnfoldVertical, Split, GitMerge } from 'lucide-react';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { searchPanelTheme, searchLocalization } from './CodeMirrorTheme';
import ReactJson from 'react-json-view';
import * as Diff from 'diff';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';

interface DevToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'json' | 'api';

const DevToolsModal: React.FC<DevToolsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('json');
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white shrink-0">
        <div className="flex items-center gap-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Terminal size={24} />
            </div>
            开发工具箱
          </h2>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('json')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'json' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileJson size={16} />
              JSON 工具
            </button>
            <button
              onClick={() => setActiveTab('api')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'api' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Globe size={16} />
              API 调试
            </button>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-slate-50 relative flex flex-col">
        <div className={`absolute inset-0 flex flex-col ${activeTab === 'json' ? 'z-10' : 'z-0 invisible'}`}>
             <JsonTools />
        </div>
        <div className={`absolute inset-0 flex flex-col ${activeTab === 'api' ? 'z-10' : 'z-0 invisible'}`}>
             <ApiTools />
        </div>
      </div>
    </div>
  );
};

const JsonTools = () => {
  // Format States
  const [formatInput, setFormatInput] = useState('');
  const [formatOutput, setFormatOutput] = useState('');
  const [formatError, setFormatError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'text' | 'tree'>('text');
  const [jsonObj, setJsonObj] = useState<object | null>(null);
  const [isInputCollapsed, setIsInputCollapsed] = useState(false);
  const [showStructure, setShowStructure] = useState(true);
  const [structure, setStructure] = useState<JsonNode[]>([]);
  const [collapseLevel, setCollapseLevel] = useState<number | boolean>(2);
  const [targetPath, setTargetPath] = useState<string[] | null>(null);
  
  // Diff States
  const [diffLeft, setDiffLeft] = useState('');
  const [diffRight, setDiffRight] = useState('');
  const [diffViewType, setDiffViewType] = useState<'split' | 'unified' | 'tree'>('split');
  const [diffTreeNodes, setDiffTreeNodes] = useState<JsonNode[]>([]);

  const [mode, setMode] = useState<'format' | 'diff'>('format');
  
  // Refs
  const outputEditorRef = useRef<ReactCodeMirrorRef>(null);

  // Debounce Input Parsing for Format
  useEffect(() => {
    const timer = setTimeout(() => {
        if (!formatInput.trim()) {
            setFormatOutput('');
            setFormatError(null);
            setJsonObj(null);
            setStructure([]);
            return;
        }
        try {
            const parsed = JSON.parse(formatInput);
            const formatted = JSON.stringify(parsed, null, 2);
            setFormatOutput(formatted);
            setJsonObj(parsed);
            setFormatError(null);
            
            // Generate Structure
            if (showStructure) {
                const nodes = parseStructureFromText(formatted);
                setStructure(nodes);
            }
        } catch (e: any) {
            setFormatError(e.message);
        }
    }, 600); 

    return () => clearTimeout(timer);
  }, [formatInput, showStructure]);
  
  // Diff Tree Generation
  useEffect(() => {
      if (mode === 'diff' && diffViewType === 'tree') {
          try {
              const oldObj = JSON.parse(diffLeft || '{}');
              const newObj = JSON.parse(diffRight || '{}');
              const nodes = generateDiffStructure(oldObj, newObj);
              setDiffTreeNodes(nodes);
          } catch {
              setDiffTreeNodes([]);
          }
      }
  }, [diffLeft, diffRight, mode, diffViewType]);

  const handleStructureClick = (node: JsonNode) => {
      if (viewMode === 'text') {
          setTimeout(() => {
              if (outputEditorRef.current?.view) {
                  const view = outputEditorRef.current.view;
                  const linePos = view.state.doc.line(node.line);
                  view.dispatch({
                      selection: { anchor: linePos.from, head: linePos.from },
                      effects: [
                          import('@codemirror/view').then(m => m.EditorView.scrollIntoView(linePos.from, { y: 'center' })) as any
                      ]
                  });
                  view.dispatch({
                      effects: [
                          // @ts-ignore
                          view.constructor.scrollIntoView(linePos.from, { y: 'center' })
                      ]
                  });
              }
          }, 50);
      } else {
          setTargetPath(node.path || []);
      }
  };

  const shouldCollapse = useCallback((field: any) => {
      if (targetPath) {
          const currentPath = [...field.namespace, field.name];
          const isPrefix = currentPath.every((key, index) => key === targetPath[index]);
          const isTarget = currentPath.length === targetPath.length && isPrefix;
          
          if (isPrefix && currentPath.length < targetPath.length) {
              return false; 
          }
          if (isTarget) {
              return false; 
          }
      }
      if (typeof collapseLevel === 'boolean') return collapseLevel;
      return field.namespace.length >= collapseLevel;
  }, [collapseLevel, targetPath]);

  // Immediate Actions
  const handleFormat = () => {
    try {
      if (!formatInput.trim()) return;
      const parsed = JSON.parse(formatInput);
      const formatted = JSON.stringify(parsed, null, 2);
      setFormatInput(formatted); 
      setFormatOutput(formatted);
      setJsonObj(parsed);
      setFormatError(null);
    } catch (e: any) {
      setFormatError(e.message);
    }
  };

  const handleMinify = () => {
    try {
      if (!formatInput.trim()) return;
      const parsed = JSON.parse(formatInput);
      setFormatOutput(JSON.stringify(parsed));
      setJsonObj(parsed);
      setFormatError(null);
    } catch (e: any) {
      setFormatError(e.message);
    }
  };

  const handleEscape = () => {
     const res = JSON.stringify(formatInput).slice(1, -1);
     setFormatOutput(res); 
     try { setJsonObj(JSON.parse(res)); } catch { setJsonObj(null); }
  };
  
  const handleUnescape = () => {
      try {
          const toParse = formatInput.startsWith('"') ? formatInput : `"${formatInput}"`;
          const res = JSON.parse(toParse);
          setFormatOutput(res);
          try { setJsonObj(JSON.parse(res)); } catch { setJsonObj(null); }
          setFormatError(null);
      } catch (e: any) {
          setFormatError(e.message);
      }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="h-12 border-b border-slate-200 bg-white px-4 flex items-center justify-between shrink-0">
         <div className="flex items-center gap-2">
             <button 
                onClick={() => setMode('format')}
                className={`text-xs font-medium px-3 py-1.5 rounded-md border ${mode === 'format' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
             >
                 格式化/压缩
             </button>
             <button 
                onClick={() => setMode('diff')}
                className={`text-xs font-medium px-3 py-1.5 rounded-md border ${mode === 'diff' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
             >
                 JSON 对比
             </button>
         </div>
         {mode === 'format' && (
             <div className="flex items-center gap-2">
                <button onClick={handleFormat} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 font-medium">格式化</button>
                <button onClick={handleMinify} className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-md hover:bg-slate-200 font-medium">压缩</button>
                <div className="w-px h-4 bg-slate-300 mx-1"></div>
                <button onClick={handleEscape} className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-md hover:bg-slate-200 font-medium">转义</button>
                <button onClick={handleUnescape} className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-md hover:bg-slate-200 font-medium">去转义</button>
             </div>
         )}
         {mode === 'diff' && (
             <div className="flex items-center gap-2 bg-slate-100 p-0.5 rounded-lg">
                <button 
                    onClick={() => setDiffViewType('split')}
                    className={`px-3 py-1 text-[10px] font-medium rounded-md flex items-center gap-1 ${diffViewType === 'split' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Split size={12} /> Split
                </button>
                <button 
                    onClick={() => setDiffViewType('unified')}
                    className={`px-3 py-1 text-[10px] font-medium rounded-md flex items-center gap-1 ${diffViewType === 'unified' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <GitMerge size={12} /> Unified
                </button>
                <button 
                    onClick={() => setDiffViewType('tree')}
                    className={`px-3 py-1 text-[10px] font-medium rounded-md flex items-center gap-1 ${diffViewType === 'tree' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <ListTree size={12} /> Tree
                </button>
             </div>
         )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {mode === 'format' ? (
             <>
                {/* Input Panel */}
                <div className={`flex flex-col border-r border-slate-200 transition-all duration-300 ${isInputCollapsed ? 'w-10' : 'flex-1 w-0'}`}>
                    <div className="bg-slate-50 px-2 py-1 text-xs text-slate-500 font-medium border-b border-slate-100 flex justify-between items-center h-8">
                        {!isInputCollapsed && <span>输入 (Input)</span>}
                        <button 
                            onClick={() => setIsInputCollapsed(!isInputCollapsed)}
                            className="p-1 hover:bg-slate-200 rounded text-slate-500"
                            title={isInputCollapsed ? "展开输入" : "折叠输入"}
                        >
                            {isInputCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
                        </button>
                    </div>
                    <div className={`flex-1 overflow-hidden relative ${isInputCollapsed ? 'opacity-0' : 'opacity-100'}`}>
                         <CodeMirror 
                            value={formatInput} 
                            height="100%" 
                            onChange={setFormatInput}
                            extensions={[markdown({ base: markdownLanguage }), searchPanelTheme, searchLocalization]}
                            className="flex-1 text-sm overflow-auto absolute inset-0"
                        />
                    </div>
                </div>

                {/* Structure Panel (Optional) */}
                {showStructure && !formatError && (
                    <div className="w-64 border-r border-slate-200 flex flex-col bg-white shrink-0">
                         <div className="bg-slate-50 px-3 py-1 text-xs text-slate-500 font-medium border-b border-slate-100 h-8 flex items-center gap-2">
                             <ListTree size={14} />
                             <span>结构大纲</span>
                         </div>
                         <div className="flex-1 overflow-auto">
                             <StructureTree nodes={structure} onItemClick={handleStructureClick} />
                         </div>
                    </div>
                )}

                {/* Output Panel */}
                <div className="flex-[2] w-0 flex flex-col bg-slate-50/30">
                     <div className="bg-slate-50 px-3 py-1 text-xs text-slate-500 font-medium border-b border-slate-100 flex justify-between items-center h-8">
                         <div className="flex items-center gap-2">
                             <span>输出 (Output)</span>
                             <button 
                                onClick={() => setShowStructure(!showStructure)}
                                className={`p-1 rounded flex items-center gap-1 ${showStructure ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                                title="Toggle Structure"
                             >
                                 <ListTree size={12} />
                             </button>
                         </div>
                         <div className="flex items-center gap-2">
                            {formatError && <span className="text-red-500 mr-2 text-[10px] truncate max-w-[200px]">{formatError}</span>}
                            
                            {viewMode === 'tree' && (
                                <div className="flex bg-slate-200 rounded p-0.5 mr-2">
                                     <button onClick={() => setCollapseLevel(false)} className="p-1 px-2 text-[10px] hover:bg-white rounded" title="Expand All"><UnfoldVertical size={10}/></button>
                                     <button onClick={() => setCollapseLevel(true)} className="p-1 px-2 text-[10px] hover:bg-white rounded" title="Collapse All"><FoldVertical size={10}/></button>
                                     <button onClick={() => setCollapseLevel(1)} className="p-1 px-2 text-[10px] hover:bg-white rounded">L1</button>
                                     <button onClick={() => setCollapseLevel(2)} className="p-1 px-2 text-[10px] hover:bg-white rounded">L2</button>
                                </div>
                            )}

                            <div className="flex bg-slate-200 rounded p-0.5">
                                <button 
                                    onClick={() => setViewMode('text')}
                                    className={`p-1 rounded ${viewMode === 'text' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                    title="Text View"
                                >
                                    <AlignLeft size={12} />
                                </button>
                                <button 
                                    onClick={() => setViewMode('tree')}
                                    className={`p-1 rounded ${viewMode === 'tree' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                    title="Tree View"
                                >
                                    <Eye size={12} />
                                </button>
                            </div>
                         </div>
                     </div>
                     {viewMode === 'text' ? (
                        <CodeMirror 
                            ref={outputEditorRef}
                            value={formatOutput} 
                            height="100%" 
                            readOnly 
                            extensions={[markdown({ base: markdownLanguage }), searchPanelTheme, searchLocalization]}
                            className="flex-1 text-sm overflow-auto"
                        />
                     ) : (
                        <div className="flex-1 overflow-auto p-4 bg-white">
                            {jsonObj ? (
                                <ReactJson 
                                    src={jsonObj} 
                                    name={false} 
                                    displayDataTypes={false} 
                                    enableClipboard={true} 
                                    collapsed={shouldCollapse}
                                    style={{fontSize: '12px'}} 
                                />
                            ) : (
                                <div className="text-slate-400 text-sm text-center mt-10">无效的 JSON 数据</div>
                            )}
                        </div>
                     )}
                </div>
             </>
        ) : (
            <div className="flex-1 flex flex-col min-h-0">
                <div className="h-1/3 flex border-b border-slate-200 shrink-0">
                     <div className="flex-1 min-w-0 border-r border-slate-200 flex flex-col">
                        <div className="bg-slate-50 px-3 py-1 text-xs text-slate-500 font-medium border-b border-slate-100">原始 JSON (Old)</div>
                        <div className="flex-1 overflow-hidden relative">
                            <CodeMirror value={diffLeft} height="100%" onChange={setDiffLeft} extensions={[searchPanelTheme, searchLocalization]} className="flex-1 text-sm overflow-auto absolute inset-0"/>
                        </div>
                     </div>
                     <div className="flex-1 min-w-0 flex flex-col">
                        <div className="bg-slate-50 px-3 py-1 text-xs text-slate-500 font-medium border-b border-slate-100">变更后 JSON (New)</div>
                        <div className="flex-1 overflow-hidden relative">
                            <CodeMirror value={diffRight} height="100%" onChange={setDiffRight} extensions={[searchPanelTheme, searchLocalization]} className="flex-1 text-sm overflow-auto absolute inset-0"/>
                        </div>
                     </div>
                </div>
                <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
                    <div className="bg-slate-100 px-3 py-1 text-xs text-slate-600 font-bold border-b border-slate-200 flex justify-between items-center">
                        <span>Diff 结果</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                             {diffViewType === 'tree' ? '可视化差异结构' : 'Side-by-Side 文本差异'}
                        </span>
                    </div>
                    <div className="flex-1 overflow-auto bg-white">
                        {(diffViewType === 'split' || diffViewType === 'unified') ? (
                            <ReactDiffViewer 
                                oldValue={diffLeft} 
                                newValue={diffRight} 
                                splitView={diffViewType === 'split'}
                                useDarkTheme={false}
                                styles={{
                                    diffContainer: {
                                        width: '100%',
                                        tableLayout: 'fixed',
                                    },
                                    gutter: {
                                        minWidth: '40px',
                                        padding: '0 4px',
                                        textAlign: 'right',
                                        flexBasis: '40px',
                                        backgroundColor: '#f6f8fa',
                                        color: '#6e7781',
                                        borderRight: '1px solid #d0d7de',
                                    },
                                    marker: {
                                        display: 'none',
                                    },
                                    variables: {
                                        dark: {
                                            diffViewerBackground: '#ffffff',
                                            diffViewerColor: '#212121',
                                            addedBackground: '#e6ffed',
                                            addedColor: '#24292e',
                                            removedBackground: '#ffeef0',
                                            removedColor: '#24292e',
                                            wordAddedBackground: '#acf2bd',
                                            wordRemovedBackground: '#fdb8c0',
                                        }
                                    },
                                    line: {
                                        fontSize: '12px',
                                        fontFamily: 'monospace',
                                        padding: '2px 0',
                                        whiteSpace: 'pre-wrap', // Ensure long lines wrap
                                    },
                                    content: {
                                        fontSize: '12px',
                                        fontFamily: 'monospace',
                                        wordBreak: 'break-all',
                                        paddingLeft: '8px',
                                    },
                                    codeFold: {
                                        minWidth: '40px',
                                        width: '40px',
                                        flexBasis: '40px',
                                        padding: '0 4px',
                                        textAlign: 'center',
                                        backgroundColor: '#f6f8fa',
                                        color: '#6e7781',
                                        borderRight: '1px solid #d0d7de',
                                    }
                                }}
                            />
                        ) : (
                            <div className="p-4">
                                <StructureTree nodes={diffTreeNodes} onItemClick={() => {}} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

// --- Structure Helper ---

interface JsonNode {
    key: string;
    type: 'object' | 'array' | 'primitive';
    valueType?: string;
    line: number;
    path?: string[];
    children?: JsonNode[];
    status?: 'added' | 'removed' | 'modified' | 'unchanged';
}

const generateJsonStructure = (data: any): JsonNode[] => {
    // This is a simplified generator that assumes formatted JSON (2 spaces)
    // For a real robust one, we'd need to track line numbers during parsing or use a tokenizer.
    // Here we will try to approximate by traversing and matching stringified output.
    // ACTUALLY: Since we control the output format (JSON.stringify(data, null, 2)), we can predict line numbers perfectly!
    
    let currentLine = 1;
    
    const traverse = (obj: any, keyName: string = 'root'): JsonNode => {
        const startLine = currentLine;
        const type = Array.isArray(obj) ? 'array' : typeof obj === 'object' && obj !== null ? 'object' : 'primitive';
        
        const node: JsonNode = {
            key: keyName,
            type,
            line: startLine,
            children: []
        };
        
        if (type === 'primitive') {
             // "key": "value" -> 1 line
             // or just "value" (in array)
             currentLine++;
             return node;
        }
        
        // For Object/Array start line
        currentLine++; 
        
        if (type === 'object') {
            Object.keys(obj).forEach(k => {
                // Key line usually is same as start of value for object/array?
                // In "  "key": {\n" -> line is current
                node.children?.push(traverse(obj[k], k));
            });
        } else if (type === 'array') {
            obj.forEach((item: any, idx: number) => {
                node.children?.push(traverse(item, `[${idx}]`));
            });
        }
        
        // Closing bracket line
        currentLine++;
        
        return node;
    };
    
    // We only want the children of root usually, or root itself
    currentLine = 1; // Reset
    // Actually JSON.stringify(obj, null, 2) output:
    // {
    //   "key": ...
    // }
    // Line 1 is {.
    
    // Let's refine the traverse to match JSON.stringify(null, 2) behavior exactly.
    // It's recursive.
    
    const lines: JsonNode[] = [];
    
    const buildTree = (obj: any, depth: number = 0): JsonNode[] => {
        const nodes: JsonNode[] = [];
        
        if (typeof obj === 'object' && obj !== null) {
            const isArr = Array.isArray(obj);
            const keys = isArr ? obj : Object.keys(obj);
            
            // Note: This naive approach fails because JSON.stringify order is not guaranteed same as Object.keys in all JS engines (though mostly is for string keys).
            // But JSON.stringify(obj) follows insertion order for non-integer keys.
            // Let's rely on the fact that we just stringified it.
            
            // To be accurate without a parser, we might need to parse the *string* output.
            // But let's try a simple approximate tree for navigation.
            // It doesn't have to be perfect, just helpful.
            
            Object.keys(obj).forEach(k => {
                const val = (obj as any)[k];
                if (typeof val === 'object' && val !== null) {
                    nodes.push({
                        key: k,
                        type: Array.isArray(val) ? 'array' : 'object',
                        line: 0, // We can't easily know line number without parsing string
                        children: buildTree(val, depth + 1)
                    });
                }
            });
        }
        return nodes;
    };
    
    // Better Approach: Regex the formatted string to find keys and line numbers.
    // Since we have the `output` string state, we can parse THAT.
    // But `generateJsonStructure` needs `input`... wait, we have `output` in state!
    // But we are inside `useEffect` where we just generated `formatted`.
    
    return [];
};

// Re-implementing structure generation based on string analysis which is reliable for line numbers
const parseStructureFromText = (text: string): JsonNode[] => {
    const lines = text.split('\n');
    const root: JsonNode = { key: 'root', type: 'object', line: 1, children: [], path: [] };
    const stack: { node: JsonNode, indent: number }[] = [{ node: root, indent: -1 }];
    
    lines.forEach((lineStr, idx) => {
        const lineNum = idx + 1;
        const trim = lineStr.trim();
        if (!trim) return;
        
        const indentMatch = lineStr.match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1].length : 0;
        
        while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
            stack.pop();
        }
        const parent = stack[stack.length - 1].node;
        
        let key = '';
        let type: 'object' | 'array' | 'primitive' = 'primitive';
        let valueType = 'unknown';
        
        // Check if it's a structure start
        // "key": {
        // "key": [
        // {
        // [
        // "key": value
        
        // Simple heuristic parsing
        
        let isObject = false;
        let isArray = false;
        
        if (trim.endsWith('{') || (trim.includes('{') && !trim.includes('}'))) isObject = true;
        if (trim.endsWith('[')) isArray = true;
        
        // Extract Key
        const keyMatch = trim.match(/^"([^"]+)":/);
        
        if (keyMatch) {
            key = keyMatch[1];
        } else {
            // Array item or root object
            if (trim === '{' || trim === '[') {
                key = trim === '{' ? '{}' : '[]';
            } else {
                // Check if it's a primitive array item
                // "value",
                // 123,
                // true,
                // But we usually don't show primitives in structure unless requested.
                // The prompt says "结构大纲应该要能解析里面类型 string之类的"
                // So we should include primitives too?
                // Previously: "if (type !== 'primitive')" -> skip.
                // Now user wants types. So we should include leaf nodes if we can determine type.
                
                // Let's try to identify value type for array items too.
                // e.g. "foo", -> string
            }
        }
        
        // Determine Type
        if (isObject) type = 'object';
        else if (isArray) type = 'array';
        else type = 'primitive';
        
        // Determine Value Type (for primitive)
        if (type === 'primitive') {
            const valuePart = trim.replace(/^"([^"]+)":\s*/, '').replace(/,$/, '');
            if (valuePart.startsWith('"')) valueType = 'string';
            else if (valuePart === 'true' || valuePart === 'false') valueType = 'boolean';
            else if (valuePart === 'null') valueType = 'null';
            else if (!isNaN(Number(valuePart))) valueType = 'number';
        } else {
            valueType = type;
        }
        
        // Build Path
        const currentPath = parent.path ? [...parent.path] : [];
        if (parent.type === 'array') {
            // For array items, we don't have explicit keys in text usually.
            // But we can count children.
            const index = parent.children?.length || 0;
            currentPath.push(index.toString());
            if (!key) key = `[${index}]`;
        } else {
            if (keyMatch) currentPath.push(key);
        }
        
        // Only add if it's a structure node OR if we want to show primitives (User asked for types)
        // If we show primitives, the tree might get huge.
        // "结构大纲应该要能解析里面类型 string之类的" implies they want to see the fields and their types.
        // So yes, we should add primitive fields.
        
        const newNode: JsonNode = { 
            key: key || (type === 'object' ? '{}' : type === 'array' ? '[]' : 'value'), 
            type, 
            valueType, 
            line: lineNum, 
            children: [],
            path: currentPath
        };
        
        // Add to parent
        parent.children = parent.children || [];
        parent.children.push(newNode);
        
        if (type !== 'primitive') {
            stack.push({ node: newNode, indent });
        }
    });
    
    return root.children || [];
};

const generateDiffStructure = (oldObj: any, newObj: any): JsonNode[] => {
    const buildDiffTree = (oldData: any, newData: any, keyName: string = 'root', path: string[] = []): JsonNode => {
        const node: JsonNode = {
            key: keyName,
            type: 'primitive',
            line: 0,
            children: [],
            path,
            status: 'unchanged'
        };

        const getType = (v: any) => Array.isArray(v) ? 'array' : typeof v === 'object' && v !== null ? 'object' : 'primitive';
        const oldType = getType(oldData);
        const newType = getType(newData);

        if (oldData === undefined && newData !== undefined) {
             node.status = 'added';
             node.type = newType;
             if (newType !== 'primitive') {
                 node.children = buildChildren(newData, path, 'added');
             } else {
                 node.valueType = typeof newData;
             }
        } else if (oldData !== undefined && newData === undefined) {
             node.status = 'removed';
             node.type = oldType;
             if (oldType !== 'primitive') {
                 node.children = buildChildren(oldData, path, 'removed');
             } else {
                 node.valueType = typeof oldData;
             }
        } else if (oldType !== newType) {
             node.status = 'modified';
             node.type = newType;
             if (newType !== 'primitive') {
                 node.children = buildChildren(newData, path, 'added'); 
             } else {
                 node.valueType = typeof newData;
             }
        } else if (newType === 'primitive') {
             node.type = 'primitive';
             node.valueType = typeof newData;
             if (String(oldData) !== String(newData)) {
                 node.status = 'modified';
             }
        } else {
             node.type = newType;
             let keysToIterate: string[] = [];
             if (newType === 'array') {
                 const maxLen = Math.max(oldData.length, newData.length);
                 keysToIterate = Array.from({length: maxLen}, (_, i) => i.toString());
             } else {
                 const oldKeys = Object.keys(oldData);
                 const newKeys = Object.keys(newData);
                 keysToIterate = Array.from(new Set([...oldKeys, ...newKeys])).sort();
             }

             node.children = keysToIterate.map(k => {
                 const oVal = newType === 'array' ? oldData[Number(k)] : oldData[k];
                 const nVal = newType === 'array' ? newData[Number(k)] : newData[k];
                 const displayKey = newType === 'array' ? `[${k}]` : k;
                 return buildDiffTree(oVal, nVal, displayKey, [...path, k]);
             });
             
             // If only children changed, mark parent as modified? 
             // Let's keep parent unchanged to avoid polluting the tree with color, only show changes at leaves or added subtrees.
        }
        return node;
    };

    const buildChildren = (data: any, path: string[], status: 'added' | 'removed'): JsonNode[] => {
        const type = Array.isArray(data) ? 'array' : typeof data === 'object' && data !== null ? 'object' : 'primitive';
        if (type === 'primitive') return [];
        
        return Object.keys(data).map(k => {
            const val = (data as any)[k];
            const childType = Array.isArray(val) ? 'array' : typeof val === 'object' && val !== null ? 'object' : 'primitive';
            const node: JsonNode = {
                key: Array.isArray(data) ? `[${k}]` : k,
                type: childType,
                line: 0,
                path: [...path, k],
                status: status,
                children: []
            };
            if (childType !== 'primitive') {
                node.children = buildChildren(val, [...path, k], status);
            } else {
                node.valueType = typeof val;
            }
            return node;
        });
    }

    try {
        const root = buildDiffTree(oldObj, newObj);
        return root.children || [];
    } catch {
        return [];
    }
};

const StructureTree = ({ nodes, onItemClick }: { nodes: JsonNode[], onItemClick: (node: JsonNode) => void }) => {
    // Global Expand State
    const [expandAll, setExpandAll] = useState(false);
    
    // Toggle signal (simple timestamp or boolean flip)
    const [toggleSignal, setToggleSignal] = useState(0);

    const handleExpandAll = () => {
        setExpandAll(true);
        setToggleSignal(prev => prev + 1);
    };

    const handleCollapseAll = () => {
        setExpandAll(false);
        setToggleSignal(prev => prev + 1);
    };

    if (!nodes || nodes.length === 0) return <div className="p-4 text-slate-400 text-xs text-center">无结构</div>;
    
    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center px-2 py-1 bg-slate-50 border-b border-slate-100 shrink-0">
                <span className="text-[10px] text-slate-400">Actions</span>
                <div className="flex gap-1">
                    <button onClick={handleExpandAll} className="p-1 hover:bg-white rounded text-slate-500" title="全部展开"><UnfoldVertical size={10} /></button>
                    <button onClick={handleCollapseAll} className="p-1 hover:bg-white rounded text-slate-500" title="全部折叠"><FoldVertical size={10} /></button>
                </div>
            </div>
            <div className="flex-1 overflow-auto flex flex-col text-xs font-mono">
                {nodes.map((node, i) => (
                    <StructureItem 
                        key={i} 
                        node={node} 
                        onClick={onItemClick} 
                        depth={0} 
                        forceExpand={expandAll} 
                        toggleSignal={toggleSignal}
                    />
                ))}
            </div>
        </div>
    );
};

const StructureItem = ({ node, onClick, depth, forceExpand, toggleSignal }: { 
    key?: React.Key,
    node: JsonNode, 
    onClick: (n: JsonNode) => void, 
    depth: number,
    forceExpand: boolean,
    toggleSignal: number 
}) => {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;
    
    // Sync with global expand/collapse signal
    useEffect(() => {
        if (toggleSignal > 0) {
            setExpanded(forceExpand);
        }
    }, [forceExpand, toggleSignal]);

    // Type Badge Color
    const getTypeColor = (t?: string) => {
        switch(t) {
            case 'string': return 'text-green-600';
            case 'number': return 'text-blue-600';
            case 'boolean': return 'text-purple-600';
            case 'null': return 'text-slate-400';
            default: return 'text-slate-400';
        }
    };
    
    return (
        <div>
            <div 
                className={`flex items-center py-1 px-2 cursor-pointer select-none transition-colors border-l-2 
                    ${expanded ? 'border-blue-200' : 'border-transparent'}
                    ${node.status === 'added' ? 'bg-green-50/50 hover:bg-green-100' : 
                      node.status === 'removed' ? 'bg-red-50/50 hover:bg-red-100' : 
                      node.status === 'modified' ? 'bg-yellow-50/50 hover:bg-yellow-100' : 
                      'hover:bg-blue-50'}`}
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                onClick={(e) => {
                    e.stopPropagation();
                    onClick(node);
                }}
            >
                <button 
                    className={`p-0.5 mr-1 rounded hover:bg-slate-200 text-slate-400 ${hasChildren ? '' : 'invisible'}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        setExpanded(!expanded);
                    }}
                >
                    {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                </button>
                <span className={`mr-1 truncate ${
                    node.status === 'added' ? 'text-green-700' :
                    node.status === 'removed' ? 'text-red-700 line-through' :
                    node.status === 'modified' ? 'text-yellow-700' :
                    node.type === 'array' ? 'text-orange-600 font-medium' : 
                    node.type === 'object' ? 'text-purple-600 font-medium' : 'text-slate-700'
                }`}>
                    {node.key}
                </span>
                {node.type !== 'primitive' ? (
                     <span className="text-slate-300 text-[10px]">{node.type === 'array' ? '[]' : '{}'}</span>
                ) : (
                     <span className={`text-[10px] ml-auto bg-slate-100 px-1 rounded ${getTypeColor(node.valueType)}`}>
                        {node.valueType}
                     </span>
                )}
            </div>
            {hasChildren && expanded && (
                <div>
                    {node.children!.map((child, i) => (
                        <StructureItem 
                            key={i} 
                            node={child} 
                            onClick={onClick} 
                            depth={depth + 1} 
                            forceExpand={forceExpand}
                            toggleSignal={toggleSignal}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};


    const KeyValueTable = ({ 
        data, 
        setData, 
        onUpdate 
    }: { 
        data: {key:string, value:string, active: boolean}[], 
        setData: (d: any) => void,
        onUpdate?: (d: any) => void 
    }) => (
        <div className="flex-1 flex flex-col min-h-0">
            <div className="flex text-xs font-semibold text-slate-500 border-b border-slate-200 bg-slate-50/50">
                <div className="w-10 py-2 text-center">启用</div>
                <div className="flex-1 py-2 px-2 border-l border-slate-200">Key</div>
                <div className="flex-1 py-2 px-2 border-l border-slate-200">Value</div>
                <div className="w-10 py-2 text-center border-l border-slate-200"></div>
            </div>
            <div className="flex-1 overflow-auto">
                {data.map((row, i) => (
                    <div key={i} className="flex group border-b border-slate-100 hover:bg-slate-50">
                        <div className="w-10 flex items-center justify-center">
                            <input 
                                type="checkbox" 
                                checked={row.active} 
                                onChange={e => {
                                    const newData = [...data];
                                    newData[i].active = e.target.checked;
                                    setData(newData);
                                    onUpdate?.(newData);
                                }}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex-1 border-l border-slate-200">
                            <input 
                                placeholder="Key"
                                value={row.key}
                                onChange={e => {
                                    const newData = [...data];
                                    newData[i].key = e.target.value;
                                    if (i === data.length - 1 && (e.target.value || newData[i].value)) {
                                        newData.push({key: '', value: '', active: true});
                                    }
                                    setData(newData);
                                    onUpdate?.(newData);
                                }}
                                className="w-full px-2 py-1.5 text-sm bg-transparent outline-none"
                            />
                        </div>
                        <div className="flex-1 border-l border-slate-200">
                            <input 
                                placeholder="Value"
                                value={row.value}
                                onChange={e => {
                                    const newData = [...data];
                                    newData[i].value = e.target.value;
                                    if (i === data.length - 1 && (newData[i].key || e.target.value)) {
                                        newData.push({key: '', value: '', active: true});
                                    }
                                    setData(newData);
                                    onUpdate?.(newData);
                                }}
                                className="w-full px-2 py-1.5 text-sm bg-transparent outline-none"
                            />
                        </div>
                        <div className="w-10 border-l border-slate-200 flex items-center justify-center">
                            <button 
                                onClick={() => {
                                    if (data.length > 1) {
                                        const newData = data.filter((_, idx) => idx !== i);
                                        setData(newData);
                                        onUpdate?.(newData);
                                    }
                                }}
                                className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

const ApiTools = () => {
    const [method, setMethod] = useState('GET');
    const [url, setUrl] = useState('');
    const [headers, setHeaders] = useState<{key:string, value:string, active: boolean}[]>([{key: '', value: '', active: true}]);
    const [queryParams, setQueryParams] = useState<{key:string, value:string, active: boolean}[]>([{key: '', value: '', active: true}]);
    
    // Body States
    const [bodyType, setBodyType] = useState<'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw'>('none');
    const [bodyRaw, setBodyRaw] = useState('');
    const [formData, setFormData] = useState<{key:string, value:string, active: boolean}[]>([{key: '', value: '', active: true}]);
    const [urlEncodedData, setUrlEncodedData] = useState<{key:string, value:string, active: boolean}[]>([{key: '', value: '', active: true}]);

    const [response, setResponse] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [curlInput, setCurlInput] = useState('');
    const [showCurlImport, setShowCurlImport] = useState(false);
    const [activeTab, setActiveTab] = useState<'params'|'headers'|'body'>('params');
    const [responseTab, setResponseTab] = useState<'body'|'headers'>('body');

    // Sync URL to Params
    const handleUrlChange = (newUrl: string) => {
        setUrl(newUrl);
        try {
            const [base, search] = newUrl.split('?');
            if (search) {
                const params = new URLSearchParams(search);
                const newParams: {key:string, value:string, active: boolean}[] = [];
                params.forEach((value, key) => {
                    newParams.push({ key, value, active: true });
                });
                newParams.push({ key: '', value: '', active: true });
                setQueryParams(newParams);
            } else {
                if (!newUrl.includes('?')) {
                     setQueryParams([{key: '', value: '', active: true}]);
                }
            }
        } catch (e) {}
    };

    // Sync Params to URL
    const updateUrlFromParams = (newParams: {key:string, value:string, active: boolean}[]) => {
        try {
            const [baseUrl] = url.split('?');
            const searchParams = new URLSearchParams();
            newParams.forEach(p => {
                if (p.key && p.active) searchParams.append(p.key, p.value);
            });
            const searchString = searchParams.toString();
            if (searchString) {
                setUrl(`${baseUrl}?${searchString}`);
            } else {
                setUrl(baseUrl);
            }
        } catch (e) {}
    };

    const parseCurl = (curl: string) => {
        try {
            let parsedUrl = '';
            let parsedMethod = 'GET';
            let parsedHeaders: {key:string, value:string, active: boolean}[] = [];
            let parsedBodyRaw = '';
            let parsedBodyType: any = 'none';

            // Extract URL and Method
            const args = curl.split(/\s+(?=(?:[^'"]*['"][^'"]*['"])*[^'"]*$)/); 
            
            for (let i = 0; i < args.length; i++) {
                const arg = args[i].trim();
                if (arg === 'curl') continue;
                
                if (arg.startsWith('http') || arg.startsWith("'http") || arg.startsWith('"http')) {
                    parsedUrl = arg.replace(/['"]/g, '');
                }
                
                if (arg === '-X' || arg === '--request') {
                    parsedMethod = args[i+1]?.toUpperCase().replace(/['"]/g, '') || 'GET';
                }
                
                if (arg === '-H' || arg === '--header') {
                    const headerStr = args[i+1]?.replace(/^['"]|['"]$/g, '');
                    if (headerStr) {
                        const [key, value] = headerStr.split(/:\s*/);
                        if (key && value) parsedHeaders.push({key, value, active: true});
                    }
                }
                
                if (arg === '-d' || arg === '--data' || arg === '--data-raw') {
                     const dataStr = args[i+1]?.replace(/^['"]|['"]$/g, '');
                     if (dataStr) parsedBodyRaw = dataStr;
                     parsedBodyType = 'json'; // Assume raw/json for -d
                     if (parsedMethod === 'GET') parsedMethod = 'POST';
                }
            }
            
            if (!parsedUrl) {
                const potentialUrl = args.find(a => a.startsWith('http') || a.startsWith("'http") || a.startsWith('"http'));
                if (potentialUrl) parsedUrl = potentialUrl.replace(/['"]/g, '');
            }

            if (parsedUrl) handleUrlChange(parsedUrl); // Use handleUrlChange to sync params
            if (parsedMethod) setMethod(parsedMethod);
            if (parsedHeaders.length > 0) setHeaders([...parsedHeaders, {key:'', value:'', active: true}]);
            
            if (parsedBodyRaw) {
                setBodyRaw(parsedBodyRaw);
                setBodyType(parsedBodyType);
                // Try to check if it's JSON
                try {
                    JSON.parse(parsedBodyRaw);
                    setBodyType('json');
                } catch {
                    setBodyType('raw');
                }
            }
            
            setShowCurlImport(false);
            setCurlInput('');
        } catch (e) {
            alert('Failed to parse cURL');
        }
    };

    const handleSend = async () => {
        if (!url) return;
        setLoading(true);
        setResponse(null);
        
        const startTime = Date.now();
        
        try {
            const headerObj: Record<string, string> = {};
            headers.forEach(h => {
                if(h.key && h.active) headerObj[h.key] = h.value;
            });

            const options: RequestInit = {
                method,
                headers: headerObj,
            };
            
            if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
                if (bodyType === 'json' || bodyType === 'raw') {
                    options.body = bodyRaw;
                    if (bodyType === 'json' && !headerObj['Content-Type']) {
                        // Auto-add Content-Type if missing for JSON
                        (options.headers as Record<string, string>)['Content-Type'] = 'application/json';
                    }
                } else if (bodyType === 'form-data') {
                    const fd = new FormData();
                    formData.forEach(f => {
                        if (f.key && f.active) fd.append(f.key, f.value);
                    });
                    options.body = fd;
                    // Note: Content-Type header should NOT be set manually for FormData, browser sets it with boundary
                    delete (options.headers as Record<string, string>)['Content-Type'];
                } else if (bodyType === 'x-www-form-urlencoded') {
                    const params = new URLSearchParams();
                    urlEncodedData.forEach(p => {
                        if (p.key && p.active) params.append(p.key, p.value);
                    });
                    options.body = params;
                    if (!headerObj['Content-Type']) {
                         (options.headers as Record<string, string>)['Content-Type'] = 'application/x-www-form-urlencoded';
                    }
                }
            }

            let res;
            let dataText;
            let dataJson;
            let resHeaders;
            let status;
            let statusText;

            // Check if running in Electron and use proxy
            if ((window as any).desktop?.proxyRequest) {
                const proxyRes = await (window as any).desktop.proxyRequest(url, {
                    ...options,
                    // Convert headers to plain object for IPC
                    headers: options.headers,
                    // Convert body if needed (string/buffer)
                    body: options.body instanceof FormData ? undefined : options.body // FormData not supported over IPC directly yet
                });
                
                if (proxyRes.error) {
                    throw new Error(proxyRes.error);
                }

                status = proxyRes.status;
                statusText = proxyRes.statusText;
                resHeaders = proxyRes.headers;
                dataText = proxyRes.text;
                dataJson = proxyRes.json || dataText;

            } else {
                // Browser Fetch
                res = await fetch(url, options);
                status = res.status;
                statusText = res.statusText;
                resHeaders = Object.fromEntries(res.headers.entries());
                dataText = await res.text();
                try {
                    dataJson = JSON.parse(dataText);
                } catch {
                    dataJson = dataText;
                }
            }

            setResponse({
                status,
                statusText,
                time: Date.now() - startTime,
                headers: resHeaders,
                body: dataJson,
                rawBody: dataText
            });
        } catch (e: any) {
            setResponse({
                error: e.message + (window.navigator.userAgent.includes('Electron') ? '' : ' (若遇到 CORS 错误，请尝试使用桌面版应用)'),
                time: Date.now() - startTime
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 bg-white border-b border-slate-200 space-y-3">
                <div className="flex gap-2">
                    <select 
                        value={method} 
                        onChange={e => setMethod(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 w-28 outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                    >
                        {['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                    <input 
                        type="text" 
                        value={url}
                        onChange={e => handleUrlChange(e.target.value)}
                        placeholder="请输入请求 URL"
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                    />
                    <button 
                        onClick={handleSend}
                        disabled={loading}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-blue-600/20"
                    >
                        {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Play size={16} fill="currentColor" />}
                        发送
                    </button>
                </div>
                <div className="flex justify-end">
                     <button 
                        onClick={() => setShowCurlImport(!showCurlImport)}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                     >
                         <Terminal size={12} />
                         导入 cURL
                     </button>
                </div>
                {showCurlImport && (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 animate-in fade-in slide-in-from-top-2">
                        <textarea 
                            value={curlInput}
                            onChange={e => setCurlInput(e.target.value)}
                            placeholder="在此粘贴 cURL 命令..."
                            className="w-full h-24 text-xs font-mono bg-white border border-slate-200 rounded p-2 outline-none mb-2"
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowCurlImport(false)} className="text-xs text-slate-500 px-3 py-1">取消</button>
                            <button onClick={() => parseCurl(curlInput)} className="text-xs bg-slate-900 text-white px-3 py-1 rounded">导入</button>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left: Params/Body */}
                <div className="w-1/2 border-r border-slate-200 flex flex-col bg-white">
                    <div className="flex border-b border-slate-200 px-2">
                        {[
                            { id: 'params', label: 'Params' },
                            { id: 'headers', label: 'Headers' },
                            { id: 'body', label: 'Body' }
                        ].map(t => (
                            <button 
                                key={t.id}
                                onClick={() => setActiveTab(t.id as any)}
                                className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${activeTab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                {t.label}
                                {t.id === 'params' && queryParams.length > 1 && <span className="ml-1 text-[10px] bg-slate-100 px-1 rounded-full text-slate-500">{queryParams.filter(p => p.active && p.key).length}</span>}
                                {t.id === 'headers' && headers.length > 1 && <span className="ml-1 text-[10px] bg-slate-100 px-1 rounded-full text-slate-500">{headers.filter(p => p.active && p.key).length}</span>}
                            </button>
                        ))}
                    </div>
                    
                    <div className="flex-1 flex flex-col min-h-0">
                        {activeTab === 'params' && (
                            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs text-slate-500 shrink-0">Query Parameters</div>
                                <KeyValueTable data={queryParams} setData={setQueryParams} onUpdate={updateUrlFromParams} />
                            </div>
                        )}
                        
                        {activeTab === 'headers' && (
                            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs text-slate-500 shrink-0">Request Headers</div>
                                <KeyValueTable data={headers} setData={setHeaders} />
                            </div>
                        )}
                        
                        {activeTab === 'body' && (
                             <div className="flex-1 flex flex-col min-h-0">
                                <div className="flex items-center gap-4 px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs">
                                    <label className="flex items-center gap-1 cursor-pointer">
                                        <input type="radio" name="bodyType" checked={bodyType === 'none'} onChange={() => setBodyType('none')} />
                                        None
                                    </label>
                                    <label className="flex items-center gap-1 cursor-pointer">
                                        <input type="radio" name="bodyType" checked={bodyType === 'json'} onChange={() => setBodyType('json')} />
                                        JSON
                                    </label>
                                    <label className="flex items-center gap-1 cursor-pointer">
                                        <input type="radio" name="bodyType" checked={bodyType === 'form-data'} onChange={() => setBodyType('form-data')} />
                                        form-data
                                    </label>
                                    <label className="flex items-center gap-1 cursor-pointer">
                                        <input type="radio" name="bodyType" checked={bodyType === 'x-www-form-urlencoded'} onChange={() => setBodyType('x-www-form-urlencoded')} />
                                        x-www-form-urlencoded
                                    </label>
                                    <label className="flex items-center gap-1 cursor-pointer">
                                        <input type="radio" name="bodyType" checked={bodyType === 'raw'} onChange={() => setBodyType('raw')} />
                                        Raw
                                    </label>
                                </div>
                                
                                <div className="flex-1 overflow-hidden relative">
                                    {bodyType === 'none' && (
                                        <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                                            This request does not have a body
                                        </div>
                                    )}
                                    
                                    {(bodyType === 'json' || bodyType === 'raw') && (
                                        <CodeMirror 
                                            value={bodyRaw} 
                                            height="100%" 
                                            onChange={setBodyRaw}
                                            className="h-full text-sm"
                                            extensions={bodyType === 'json' ? [markdown({ base: markdownLanguage }), searchPanelTheme, searchLocalization] : [searchPanelTheme, searchLocalization]} 
                                        />
                                    )}

                                    {bodyType === 'form-data' && (
                                        <KeyValueTable data={formData} setData={setFormData} />
                                    )}

                                    {bodyType === 'x-www-form-urlencoded' && (
                                        <KeyValueTable data={urlEncodedData} setData={setUrlEncodedData} />
                                    )}
                                </div>
                             </div>
                        )}
                    </div>
                </div>

                {/* Right: Response */}
                <div className="w-1/2 flex flex-col bg-slate-50/50">
                    <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center justify-between shrink-0">
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setResponseTab('body')}
                                className={`text-xs font-bold ${responseTab === 'body' ? 'text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Body
                            </button>
                            <button 
                                onClick={() => setResponseTab('headers')}
                                className={`text-xs font-bold ${responseTab === 'headers' ? 'text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Headers
                            </button>
                        </div>
                        
                        {response && (
                            <div className="flex gap-4 text-xs">
                                <span className={`${response.status >= 200 && response.status < 300 ? 'text-green-600' : 'text-red-600'} font-bold`}>
                                    {response.status} {response.statusText}
                                </span>
                                <span className="text-slate-500">{response.time}ms</span>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex-1 overflow-auto relative bg-white">
                        {response ? (
                            response.error ? (
                                <div className="p-4 text-red-600 text-sm">请求错误: {response.error}</div>
                            ) : (
                                <>
                                    {responseTab === 'body' && (
                                        <CodeMirror 
                                            value={typeof response.body === 'string' ? response.body : JSON.stringify(response.body, null, 2)} 
                                            readOnly 
                                            height="100%"
                                            extensions={[markdown({ base: markdownLanguage }), searchPanelTheme, searchLocalization]}
                                            className="h-full text-sm"
                                        />
                                    )}
                                    {responseTab === 'headers' && (
                                        <div className="flex-1 overflow-auto">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                                                    <tr>
                                                        <th className="px-4 py-2 font-semibold">Key</th>
                                                        <th className="px-4 py-2 font-semibold">Value</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {Object.entries(response.headers).map(([k, v]) => (
                                                        <tr key={k} className="hover:bg-slate-50">
                                                            <td className="px-4 py-2 font-medium text-slate-700">{k}</td>
                                                            <td className="px-4 py-2 text-slate-600 break-all">{v as any}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </>
                            )
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <Globe size={40} className="mb-2 opacity-20" />
                                <p className="text-sm">输入 URL 并点击发送</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DevToolsModal;
