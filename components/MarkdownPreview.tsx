import React, { memo, useDeferredValue, useMemo, useState, useRef, useEffect } from 'react';
import ReactMarkdown, { UrlTransform, defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import type { Options as KatexOptions } from 'katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { okaidia } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy } from 'lucide-react';
import Mermaid from './Mermaid';
import { MarkdownTheme } from '../types';

interface MarkdownPreviewProps {
  content: string;
  attachments?: Record<string, string>;
  theme?: MarkdownTheme;
  showToc?: boolean;
  onLinkClick?: (href: string) => void;
  validNoteIds?: string[];
}

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/80 backdrop-blur text-slate-500 hover:text-blue-600 hover:bg-white transition-all opacity-0 group-hover:opacity-100 shadow-sm border border-slate-200 z-10"
      title="复制代码"
    >
      {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
    </button>
  );
};

const slugify = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '');

const FONT_FAMILY = '"JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace';

const CodeBlock = memo(({ language, codeString, style }: { language: string; codeString: string, style: any }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  // Pre-calculate line numbers for diff highlighting to avoid re-calculation during render
  const { addSet, delSet } = useMemo(() => {
    const lines = codeString.split('\n');
    const add = new Set<number>();
    const del = new Set<number>();
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('+')) add.add(i + 1);
      if (lines[i].startsWith('-')) del.add(i + 1);
    }
    return { addSet: add, delSet: del };
  }, [codeString]);

  useEffect(() => {
    if (isLoaded) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // Use requestAnimationFrame to ensure we don't block the main thread right at the scroll event
          requestAnimationFrame(() => setIsLoaded(true));
          observer.disconnect();
        }
      },
      { rootMargin: '200px' } // Load well before it comes into view
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [isLoaded]);

  return (
    <div ref={ref} className={`relative group my-4 rounded-lg overflow-hidden ${style.codeBorder}`}>
      {language && (
        <div className="absolute top-2 left-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 bg-white/90 px-2 py-1 rounded-md border border-slate-200 shadow-sm opacity-0 group-hover:opacity-100 pointer-events-none z-10">
          {language}
        </div>
      )}
      <CopyButton text={codeString} />
      
      {/* 
        Double Rendering Strategy to eliminate flicker:
        1. Always render the placeholder <pre> to maintain layout stability.
        2. Render SyntaxHighlighter on top (absolute) or replace it only when fully ready.
        
        However, Absolute positioning might cause height issues if fonts differ slightly.
        Best approach: Ensure <pre> matches SyntaxHighlighter EXACTLY.
      */}
      
      {isLoaded ? (
        <SyntaxHighlighter
          style={style.codeStyle}
          language={language || 'text'}
          PreTag="div"
          showLineNumbers={!!language}
          wrapLongLines={false}
          wrapLines
          lineProps={(lineNumber: number) => {
            if (addSet.has(lineNumber)) return { style: { backgroundColor: '#e6ffed' } };
            if (delSet.has(lineNumber)) return { style: { backgroundColor: '#ffebe9' } };
            return {};
          }}
          lineNumberStyle={{ 
            color: '#94a3b8', 
            fontSize: '13px', 
            paddingRight: '12px', 
            fontFamily: FONT_FAMILY 
          }}
          customStyle={{ 
            margin: 0, 
            borderRadius: 0, 
            backgroundColor: style.codeBg, 
            fontSize: '13px', 
            padding: '24px 18px 18px',
            fontFamily: FONT_FAMILY,
            lineHeight: '1.5',
          }}
          codeTagProps={{
            style: { fontFamily: FONT_FAMILY }
          }}
        >
          {codeString}
        </SyntaxHighlighter>
      ) : (
        <pre 
          className="overflow-x-auto" 
          style={{ 
            backgroundColor: style.codeBg,
            margin: 0,
            padding: '24px 18px 18px',
            fontFamily: FONT_FAMILY,
            fontSize: '13px',
            lineHeight: '1.5',
            color: '#333', // Use a visible color instead of transparent to avoid "pop-in" effect
            whiteSpace: 'pre-wrap', // Match SyntaxHighlighter's wrapping behavior
            wordBreak: 'break-all',
          }}
        >
          {codeString}
        </pre>
      )}
    </div>
  );
}, (prev, next) => prev.codeString === next.codeString && prev.language === next.language && prev.style === next.style);

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content, attachments = {}, theme = 'classic', showToc = true, onLinkClick, validNoteIds }) => {
  const katexOptions: KatexOptions & { throwOnError?: boolean } = useMemo(() => ({
    strict: false,
    throwOnError: false,
    trust: true,
    fleqn: false,
    macros: {
      "\\dd": "\\,\\mathrm{d}",
      "\\EE": "\\mathbb{E}",
      "\\PP": "\\mathbb{P}",
      "\\Var": "\\mathrm{Var}",
      "\\Cov": "\\mathrm{Cov}",
      "\\sgn": "\\mathrm{sgn}",
      "\\arg": "\\mathrm{arg}",
      "\\abs": "\\left\\lvert #1\\right\\rvert",
      "\\norm": "\\left\\lVert #1\\right\\rVert",
      "\\vect": "\\mathbf{#1}",
      "\\degree": "^\\circ",
    }
  }), []);
  const processedContent = useMemo(() => {
    // 简单保护代码块
    const codeBlockRegex = /(```[\s\S]*?```|`[^`]*`)/g;
    const placeholders: string[] = [];
    let protectedText = content.replace(codeBlockRegex, (match) => {
      placeholders.push(match);
      return `__CODE_PLACEHOLDER_${placeholders.length - 1}__`;
    });

    // 保护 LaTeX 内部的括号结构 \left( \right) \left[ \right]
    const latexStructureRegex = /(\\(?:left|right|big|Big|bigg|Bigg)(?:[\(\)\[\]\|\.]))/g;
    const latexPlaceholders: string[] = [];
    protectedText = protectedText.replace(latexStructureRegex, (match) => {
      latexPlaceholders.push(match);
      return `__LATEX_STRUCT_${latexPlaceholders.length - 1}__`;
    });

    // 预处理：Unicode 数学符号转 LaTeX (在非代码块区域)
    let processed = protectedText
      .replace(/≈/g, '\\approx ')
      .replace(/∼/g, '\\sim ')
      .replace(/≤/g, '\\le ')
      .replace(/≥/g, '\\ge ')
      .replace(/×/g, '\\times ')
      .replace(/÷/g, '\\div ')
      .replace(/±/g, '\\pm ')
      .replace(/∞/g, '\\infty ')
      .replace(/≠/g, '\\neq ')
      .replace(/μ/g, '\\mu ')
      .replace(/φ/g, '\\phi ')
      .replace(/Φ/g, '\\Phi ')
      .replace(/π/g, '\\pi ')
      .replace(/θ/g, '\\theta ')
      .replace(/Ω/g, '\\Omega ')
      .replace(/ω/g, '\\omega ')
      .replace(/Δ/g, '\\Delta ')
      .replace(/δ/g, '\\delta ')
      .replace(/Σ/g, '\\Sigma ')
      .replace(/σ/g, '\\sigma ')
      .replace(/ρ/g, '\\rho ')
      .replace(/°/g, '\\degree ')
      .replace(/·/g, '\\cdot ');

    // 修复常见的 LaTeX 语法错误
    // 修复 \left$ -> \left( (推测用户意图)
    processed = processed.replace(/\\left\$/g, '\\left(').replace(/\\right\$/g, '\\right)');

    // 纠正错误的 $approx 等写法：将 $approx / approx$ 等裸定界改为 \\approx（不进入公式模式）
    const bareMathWords = ['approx','le','ge','times','div','pm','infty','neq','sim'];
    bareMathWords.forEach(w => {
      const left = new RegExp(`\\$${w}\\b`, 'g');
      const right = new RegExp(`\\b${w}\\$`, 'g');
      processed = processed.replace(left, `\\${w}`).replace(right, `\\${w}`);
    });

    // 替换 LaTeX 格式
    processed = processed
      // 标准 LaTeX \[ ... \] -> $$ ... $$
      .replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$')
      // 标准 LaTeX \( ... \) -> $ ... $
      .replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$')
      // 容错：[ ... ] 且包含反斜杠 -> $$ ... $$ (排除链接语法 [text](url))
      .replace(/\[(?!\s*\])((?:[^\]]*\\[^\]]*)+)\](?!\()/g, '$$$$$1$$$$')
      // 容错：( ... ) 且包含反斜杠 -> $ ... $
      .replace(/\((?!\s*\))((?:[^)]*\\[^)]*)+)\)/g, '$$$1$$');

    // 移除整行自动包裹，避免将中文正文误判为数学导致“反向渲染”

    const inlineTokens = ['\\approx', '\\le', '\\ge', '\\times', '\\div', '\\pm', '\\infty', '\\neq', '\\sim', '\\mu', '\\phi', '\\Phi', '\\pi', '\\theta', '\\Omega', '\\omega', '\\Delta', '\\delta', '\\Sigma', '\\sigma', '\\rho', '\\degree'];
    processed = processed.replace(/^.*$/gm, (line) => {
      if (line.includes('__CODE_PLACEHOLDER_') || line.includes('$$') || line.includes('$')) return line;
      let replaced = line;
      inlineTokens.forEach(tok => {
        replaced = replaced.replace(new RegExp(`(${tok})(?![a-zA-Z])`, 'g'), '$$$1$');
      });
      return replaced;
    });

    // 还原 LaTeX 结构
    processed = processed.replace(/__LATEX_STRUCT_(\d+)__/g, (_, index) => latexPlaceholders[parseInt(index)]);
    
    // 还原代码块
    processed = processed.replace(/__CODE_PLACEHOLDER_(\d+)__/g, (_, index) => placeholders[parseInt(index)]);
    
    return processed;
  }, [content]);

  const deferredContent = useDeferredValue(processedContent);
  const headings = useMemo(() => {
    const lines = deferredContent.split('\n');
    return lines
      .map(line => {
        const match = /^(#{1,6})\s+(.+)$/.exec(line);
        if (!match) return null;
        const level = match[1].length;
        const rawText = match[2].trim();
        // Simple strip: remove **bold**, *italic*, [link](url), `code`
        const text = rawText
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
          .replace(/`([^`]+)`/g, '$1');
        return { level, text, id: slugify(rawText) };
      })
      .filter(Boolean) as { level: number; text: string; id: string }[];
  }, [deferredContent]);

  const themeStyles = useMemo(
    () => ({
      classic: {
        prose: 'prose-slate',
        codeStyle: oneLight,
        codeBg: '#f6f8fa',
        blockquote: 'border-blue-400 bg-blue-50/60 text-slate-800',
        tableHeader: 'bg-slate-50 text-slate-600',
        tableCell: 'text-slate-700 border-slate-200',
        container: 'bg-white p-6 rounded-2xl border border-slate-200 shadow-sm',
        link: 'prose-a:text-blue-600 prose-a:no-underline',
        tableBorder: 'border-slate-200 divide-slate-200',
        codeBorder: 'bg-[#f6f8fa]',
        copyBg: 'bg-white/80',
        inlineCode: 'bg-slate-100 text-slate-800 border border-slate-200/70',
      },
      serif: {
        prose: 'prose-stone prose-h1:font-serif prose-h2:font-serif prose-h3:font-serif prose-p:font-serif',
        codeStyle: oneLight,
        codeBg: '#fdf6e3',
        blockquote: 'border-amber-500 bg-amber-50/60 text-stone-700',
        tableHeader: 'bg-amber-50 text-amber-700',
        tableCell: 'text-stone-700 border-amber-100',
        container: 'bg-gradient-to-b from-amber-50/70 to-white p-6 rounded-2xl border border-amber-100 shadow-inner',
        link: 'prose-a:text-amber-700',
        tableBorder: 'border-amber-100 divide-amber-100',
        codeBorder: 'bg-amber-50/60',
        copyBg: 'bg-white/80',
        inlineCode: 'bg-amber-100/60 text-stone-800 border border-amber-200',
      },
      night: {
        prose: 'prose-invert prose-sky',
        codeStyle: dracula,
        codeBg: '#0b1220',
        blockquote: 'border-cyan-400 bg-slate-800/80 text-slate-100',
        tableHeader: 'bg-slate-800 text-slate-100',
        tableCell: 'text-slate-100 border-slate-800',
        container: 'bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-lg shadow-slate-900/80',
        link: 'prose-a:text-sky-300',
        tableBorder: 'border-slate-800 divide-slate-800',
        codeBorder: 'bg-slate-900/60',
        copyBg: 'bg-slate-800/80',
        inlineCode: 'bg-slate-800 text-slate-100 border border-slate-700',
      },
      pastel: {
        prose: 'prose-slate',
        codeStyle: vs,
        codeBg: '#f6f8fa',
        blockquote: 'border-[#d0d7de] bg-transparent text-slate-700',
        tableHeader: 'bg-[#f6f8fa] text-slate-700',
        tableCell: 'text-slate-700 border-[#d0d7de]',
        container: 'bg-white p-6 rounded-md border border-[#d0d7de]',
        link: 'prose-a:text-[#0969da]',
        tableBorder: 'border-[#d0d7de] divide-[#d0d7de]',
        codeBorder: 'bg-[#f6f8fa]',
        copyBg: 'bg-white/80',
        inlineCode: 'bg-[#f6f8fa] text-slate-800 border border-[#d0d7de]',
      },
      github: {
        prose: 'prose-slate',
        codeStyle: vs,
        codeBg: '#f6f8fa',
        blockquote: 'border-[#d0d7de] bg-transparent text-slate-700',
        tableHeader: 'bg-[#f6f8fa] text-slate-700',
        tableCell: 'text-slate-700 border-[#d0d7de]',
        container: 'bg-white p-6 rounded-md border border-[#d0d7de]',
        link: 'prose-a:text-[#0969da]',
        tableBorder: 'border-[#d0d7de] divide-[#d0d7de]',
        codeBorder: 'bg-[#f6f8fa]',
        copyBg: 'bg-white/80',
        inlineCode: 'bg-[#f6f8fa] text-slate-800 border border-[#d0d7de]',
      },
      paper: {
        prose: 'prose-slate prose-p:tracking-wide prose-h1:font-serif prose-h2:font-serif',
        codeStyle: vs,
        codeBg: '#f7f3ec',
        blockquote: 'border-stone-400 bg-stone-100/80 text-stone-800',
        tableHeader: 'bg-stone-100 text-stone-700',
        tableCell: 'text-stone-700 border-stone-200',
        container: 'bg-[#fdfbf7] p-6 rounded-2xl border border-stone-200 shadow-inner',
        link: 'prose-a:text-stone-900 underline decoration-stone-300',
        tableBorder: 'border-stone-200 divide-stone-200',
        codeBorder: 'bg-[#f7f3ec]',
        copyBg: 'bg-white/70',
        inlineCode: 'bg-[#f5efe2] text-stone-800 border border-stone-200',
      },
      contrast: {
        prose: 'prose-invert prose-slate',
        codeStyle: okaidia,
        codeBg: '#14111b',
        blockquote: 'border-fuchsia-400 bg-[#1c142a] text-slate-100',
        tableHeader: 'bg-[#1c1a24] text-fuchsia-100',
        tableCell: 'text-slate-100 border-[#1f1a2c]',
        container: 'bg-[#0e0b14] p-6 rounded-2xl border border-[#1f1a2c] shadow-2xl shadow-black/60',
        link: 'prose-a:text-fuchsia-300',
        tableBorder: 'border-[#1f1a2c] divide-[#1f1a2c]',
        codeBorder: 'bg-[#14111b]',
        copyBg: 'bg-[#1f1a2c]/80',
        inlineCode: 'bg-[#1f1a2c] text-fuchsia-100 border border-[#2a2140]',
      },
      mono: {
        prose: 'prose-slate prose-code:font-mono prose-pre:font-mono',
        codeStyle: vs,
        codeBg: '#f4f6fb',
        blockquote: 'border-sky-500 bg-sky-50/60 text-slate-800',
        tableHeader: 'bg-slate-100 text-slate-700',
        tableCell: 'text-slate-700 border-slate-200',
        container: 'bg-gradient-to-b from-slate-50 to-white p-6 rounded-2xl border border-slate-200 shadow-sm',
        link: 'prose-a:text-sky-700',
        tableBorder: 'border-slate-200 divide-slate-200',
        codeBorder: 'bg-[#f8fafc]',
        copyBg: 'bg-white/80',
        inlineCode: 'bg-slate-200/60 text-slate-900 border border-slate-300',
      },
      terminal: {
        prose: 'prose-invert prose-slate prose-code:font-mono prose-pre:font-mono',
        codeStyle: okaidia,
        codeBg: '#0c111b',
        blockquote: 'border-emerald-400 bg-[#0e1a1a] text-emerald-50',
        tableHeader: 'bg-[#0f172a] text-emerald-100',
        tableCell: 'text-emerald-50 border-[#162032]',
        container: 'bg-gradient-to-b from-[#0b1020] to-[#0a0d16] p-6 rounded-2xl border border-[#162032] shadow-2xl shadow-black/40',
        link: 'prose-a:text-emerald-300',
        tableBorder: 'border-[#162032] divide-[#162032]',
        codeBorder: 'bg-[#0c111b]',
        copyBg: 'bg-[#0f172a]/80',
        inlineCode: 'bg-[#11182a] text-emerald-100 border border-[#1b2a44]',
      },
    }),
    [],
  );

  const style = themeStyles[theme] || themeStyles.classic;
  // const deferredContent = content; // Removed in favor of top-level useDeferredValue
  const allowDataUrl: UrlTransform = (url, key, node) => {
    if (key === 'src' && (node as any).tagName === 'img') {
      if (url.startsWith('attachment:')) {
        const id = url.replace('attachment:', '');
        return attachments[id] || '';
      }
      if (url.startsWith('data:')) return url;
    }
    return defaultUrlTransform(url);
  };

  const components = useMemo(() => ({
    pre({ children }) {
      return <>{children}</>;
    },
    input({ node, ...props }) {
      if (props.type === 'checkbox') {
        return (
          <label className="inline-flex items-center gap-2 cursor-default align-middle translate-y-[1px]">
            <input
              {...props}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-0 focus:outline-none align-middle"
              onChange={() => {}}
            />
            <span className="text-slate-700 text-sm leading-none">{props.checked ? '' : ''}</span>
          </label>
        );
      }
      return <input {...props} />;
    },
    h1({ children }) {
      const text = String(children);
      const id = slugify(text);
      return <h1 id={id}>{children}</h1>;
    },
    h2({ children }) {
      const text = String(children);
      const id = slugify(text);
      return <h2 id={id}>{children}</h2>;
    },
    h3({ children }) {
      const text = String(children);
      const id = slugify(text);
      return <h3 id={id}>{children}</h3>;
    },
    h4({ children }) {
      const text = String(children);
      const id = slugify(text);
      return <h4 id={id}>{children}</h4>;
    },
    h5({ children }) {
      const text = String(children);
      const id = slugify(text);
      return <h5 id={id}>{children}</h5>;
    },
    h6({ children }) {
      const text = String(children);
      const id = slugify(text);
      return <h6 id={id}>{children}</h6>;
    },
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      const codeString = String(children).replace(/\n$/, '');
      const isMatch = !!match;
      const isBlock = isMatch || codeString.includes('\n');

      if (isBlock && language === 'mermaid') {
        return <Mermaid chart={codeString} />;
      }

      if (isBlock) {
        return <CodeBlock language={language} codeString={codeString} style={style} />;
      }

      return (
        <span className={`${className} inline-code-marker px-1.5 py-0.5 rounded text-sm font-mono ${style.inlineCode}`} {...props}>
          {children}
        </span>
      );
    },
    // Customizing table styles
    table({ children }) {
      const borderClass = style.tableBorder || 'border-slate-200 divide-slate-200';
      return (
        <div className={`overflow-x-auto my-6 border rounded-lg shadow-sm ${borderClass}`}>
          <table className={`min-w-full divide-y ${borderClass}`}>
            {children}
          </table>
        </div>
      );
    },
    thead({ children }) {
      return <thead className={style.tableHeader}>{children}</thead>;
    },
    th({ children }) {
      return <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">{children}</th>;
    },
    td({ children }) {
      return <td className={`px-4 py-3 whitespace-nowrap text-sm border-t ${style.tableCell}`}>{children}</td>;
    },
    blockquote({ children }) {
      return (
        <blockquote className={`border-l-2 pl-3 pr-2 py-0.5 my-2 rounded-md bg-transparent text-slate-700 leading-tight ${style.blockquote} [&>p]:before:content-none [&>p]:after:content-none`}>
          {children}
        </blockquote>
      );
    },
    a({ href = '', children, ...props }) {
      const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        if (href.startsWith('note://') || href.match(/^\d{9,10}$/)) {
          onLinkClick?.(href);
          return;
        }
        window.open(href, '_blank', 'noopener,noreferrer');
      };
      
      let domain = '';
      let isInternal = false;
      let isValidInternal = true;

      try {
        if (href.startsWith('note://') || href.match(/^\d{9,10}$/)) {
          isInternal = true;
          const id = href.replace('note://', '');
          if (validNoteIds && !validNoteIds.includes(id)) {
            isValidInternal = false;
          }
          domain = isValidInternal ? '内部引用' : '引用失效';
        } else {
          domain = new URL(href).host;
        }
      } catch (err) {
        domain = href;
      }

      if (isInternal && !isValidInternal) {
        return (
          <span className="text-red-400 decoration-red-300 line-through decoration-2 cursor-not-allowed" title="该笔记不存在或已被删除">
            {children}
            <span className="text-[10px] ml-1 opacity-70">(失效)</span>
          </span>
        );
      }

      return (
        <a
          href={href}
          onClick={handleClick}
          target={isInternal ? undefined : '_blank'}
          rel="noreferrer"
          title={isInternal ? '跳转到笔记' : `外链: ${domain}`}
          className="underline decoration-[#d0d7de] hover:decoration-current cursor-pointer text-[#0969da]"
        >
          {children}
        </a>
      );
    }
  }), [style, onLinkClick, validNoteIds]); // Dependencies for useMemo

  return (
    <div className={`relative prose max-w-none prose-headings:font-bold prose-img:rounded-lg markdown-body break-words ${style.prose} ${style.link} ${style.container}`}>
      {showToc && headings.length > 0 && (
        <div className="hidden lg:block absolute left-[-220px] top-0 h-full w-48 text-xs text-slate-500">
          <div className="sticky top-6 bg-white/80 backdrop-blur rounded-xl border border-slate-200 shadow-sm p-3 space-y-2">
            <div className="text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-400">目录</div>
            <div className="space-y-1 max-h-[320px] overflow-auto">
              {headings.map(h => (
                <button
                  key={h.id}
                  onClick={e => {
                    e.preventDefault();
                    const el = document.getElementById(h.id);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  className="block w-full text-left hover:text-blue-600 transition-colors"
                  style={{ paddingLeft: `${(h.level - 1) * 10}px` }}
                >
                  {h.text}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, katexOptions]]}
        urlTransform={allowDataUrl}
        components={components as any}
      >
        {deferredContent}
      </ReactMarkdown>
    </div>
  );
};

export default memo(MarkdownPreview);
