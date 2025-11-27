import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
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

interface MarkdownPreviewProps {
  content: string;
  theme?: 'classic' | 'serif' | 'night' | 'pastel' | 'paper' | 'contrast';
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

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content, theme = 'classic' }) => {
  const themeStyles = useMemo(
    () => ({
      classic: {
        prose: 'prose-slate',
        codeStyle: oneLight,
        codeBg: '#f8fafc',
        blockquote: 'border-blue-500 bg-blue-50/30 text-slate-700',
        tableHeader: 'bg-slate-50 text-slate-500',
        tableCell: 'text-slate-600 border-slate-100',
        container: '',
        link: 'prose-a:text-blue-600',
        tableBorder: 'border-slate-200 divide-slate-200',
        codeBorder: 'border border-slate-200',
        copyBg: 'bg-white/80',
        inlineCode: 'bg-slate-100 text-slate-700 border border-slate-200/60',
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
        codeBorder: 'border border-amber-100',
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
        codeBorder: 'border border-slate-700 bg-slate-900/60',
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
        codeBorder: 'border border-indigo-100 bg-indigo-50/60',
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
        codeBorder: 'border border-stone-200 bg-[#f7f3ec]',
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
        codeBorder: 'border border-[#1f1a2c] bg-[#14111b]',
        copyBg: 'bg-[#1f1a2c]/80',
        inlineCode: 'bg-[#1f1a2c] text-fuchsia-100 border border-[#2a2140]',
      },
    }),
    [],
  );

  const style = themeStyles[theme];

  return (
    <div className={`prose max-w-none prose-headings:font-bold prose-img:rounded-lg markdown-body ${style.prose} ${style.link} ${style.container}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          input({ node, ...props }) {
            if (props.type === 'checkbox') {
              return <input {...props} disabled className="mr-2 rounded accent-blue-600 h-4 w-4 align-middle" />;
            }
            return <input {...props} />;
          },
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const codeString = String(children).replace(/\n$/, '');

            if (!inline && language === 'mermaid') {
              return <Mermaid chart={codeString} />;
            }

            return !inline && match ? (
              <div className={`relative group my-4 rounded-lg overflow-hidden border shadow-sm ${style.codeBorder}`}>
                <CopyButton text={codeString} />
                <SyntaxHighlighter
                  style={style.codeStyle}
                  language={language}
                  PreTag="div"
                  customStyle={{ margin: 0, borderRadius: 0, backgroundColor: style.codeBg }}
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
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownPreview;
