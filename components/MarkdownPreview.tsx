import React, { useDeferredValue, useMemo, useState } from 'react';
import ReactMarkdown, { UrlTransform, defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
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

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content, attachments = {}, theme = 'classic', showToc = true }) => {
  const deferredContent = useDeferredValue(content);
  const headings = useMemo(() => {
    const lines = deferredContent.split('\n');
    return lines
      .map(line => {
        const match = /^(#{1,6})\s+(.+)$/.exec(line);
        if (!match) return null;
        const level = match[1].length;
        const text = match[2].trim();
        return { level, text, id: slugify(text) };
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
        codeStyle: oneLight,
        codeBg: '#f4f2ff',
        blockquote: 'border-indigo-400 bg-indigo-50/70 text-slate-700',
        tableHeader: 'bg-indigo-50 text-indigo-700',
        tableCell: 'text-slate-700 border-indigo-100',
        container: 'bg-gradient-to-b from-indigo-50 via-amber-50/60 to-white p-6 rounded-2xl border border-indigo-100 shadow-md shadow-indigo-100/70',
        link: 'prose-a:text-indigo-600',
        tableBorder: 'border-indigo-100 divide-indigo-100',
        codeBorder: 'bg-indigo-50/60',
        copyBg: 'bg-white/80',
        inlineCode: 'bg-indigo-50 text-indigo-800 border border-indigo-100',
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

  return (
    <div className={`relative prose max-w-none prose-headings:font-bold prose-img:rounded-lg markdown-body ${style.prose} ${style.link} ${style.container}`}>
      {showToc && headings.length > 0 && (
        <div className="hidden lg:block absolute left-[-220px] top-0 w-48 text-xs text-slate-500">
          <div className="sticky top-6 bg-white/80 backdrop-blur rounded-xl border border-slate-200 shadow-sm p-3 space-y-2">
            <div className="text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-400">目录</div>
            <div className="space-y-1 max-h-[320px] overflow-auto">
              {headings.map(h => (
                <button
                  key={h.id}
                  onClick={() => {
                    const el = document.getElementById(h.id);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        rehypePlugins={[rehypeKatex]}
        urlTransform={allowDataUrl}
        components={{
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

            if (!inline && language === 'mermaid') {
              return <Mermaid chart={codeString} />;
            }

            return !inline && match ? (
              <div className={`relative group my-4 rounded-lg overflow-hidden ${style.codeBorder}`}>
                <div className="absolute top-2 left-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 bg-white/90 px-2 py-1 rounded-md border border-slate-200 shadow-sm opacity-0 group-hover:opacity-100 pointer-events-none">
                  {language || 'code'}
                </div>
                <CopyButton text={codeString} />
                <SyntaxHighlighter
                  style={style.codeStyle}
                  language={language}
                  PreTag="div"
                  showLineNumbers
                  wrapLongLines
                  lineNumberStyle={{ color: '#94a3b8', fontSize: '12px', paddingRight: '12px' }}
                  customStyle={{ margin: 0, borderRadius: 0, backgroundColor: style.codeBg, fontSize: '13px', padding: '24px 18px 18px' }}
                  {...props}
                >
                  {codeString}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code className={`${className} px-1.5 py-0.5 rounded text-sm font-mono ${style.inlineCode}`} {...props}>
                {children}
              </code>
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
            return <blockquote className={`border-l-4 pl-4 py-1 my-4 italic rounded-r-lg ${style.blockquote}`}>{children}</blockquote>;
          },
          a({ href = '', children, ...props }) {
            const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
              e.preventDefault();
              window.open(href, '_blank', 'noopener,noreferrer');
            };
            let domain = '';
            try {
              domain = new URL(href).host;
            } catch (err) {
              domain = href;
            }
            return (
              <a
                href={href}
                onClick={handleClick}
                target="_blank"
                rel="noreferrer"
                title={`外链: ${domain}`}
                className="underline decoration-slate-300 hover:decoration-current"
              >
                {children}
              </a>
            );
          }
        }}
      >
        {deferredContent}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownPreview;
