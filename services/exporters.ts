import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';
import { AppSettings } from '../types';
import katexCss from 'katex/dist/katex.min.css?inline';

export type MarkdownTheme = NonNullable<AppSettings['markdownTheme']> | 'classic';

const baseCss = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; font-family: 'Inter','PingFang SC','Microsoft YaHei',system-ui,sans-serif; }
  .container { padding: 32px; max-width: 860px; margin: 0 auto; }
  h1,h2,h3,h4,h5,h6 { margin-top: 1.6em; margin-bottom: 0.6em; line-height: 1.25; }
  h1 { font-size: 2.2rem; }
  h2 { font-size: 1.7rem; }
  h3 { font-size: 1.4rem; }
  p,li { line-height: 1.75; }
  a { text-decoration: none; }
  img { max-width: 100%; border-radius: 12px; }
  pre { overflow: auto; padding: 16px; border-radius: 14px; }
  code { font-family: 'JetBrains Mono','SFMono-Regular',Consolas,monospace; }
  table { width: 100%; border-collapse: collapse; border-radius: 12px; overflow: hidden; }
  th, td { padding: 10px 12px; }
  blockquote { margin: 18px 0; padding: 12px 16px; border-left: 4px solid; border-radius: 12px; font-style: italic; }
`;

const themeCss: Record<MarkdownTheme, string> = {
  classic: `
    body { background: #f7f9fb; color: #1f2937; font-family: 'Lato','Inter','PingFang SC','Microsoft YaHei',sans-serif; }
    a { color: #2563eb; text-decoration: none; }
    pre { background: #f6f8fa; border: 1px solid #e2e8f0; color: #0f172a; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 8px; border: 1px solid #e2e8f0; }
    table { border: 1px solid #e2e8f0; }
    th { background: #f8fafc; color: #475569; text-transform: uppercase; font-size: 12px; letter-spacing: 0.08em; }
    td { border-top: 1px solid #e2e8f0; color: #475569; }
    blockquote { background: #eff6ff; border-color: #3b82f6; color: #1f2937; }
  `,
  serif: `
    body { background: radial-gradient(circle at 20% 20%, #fff7e6 0%, #ffffff 45%); color: #1f2937; font-family: 'Georgia','Songti SC',serif; }
    a { color: #92400e; text-decoration: underline; }
    pre { background: #fdf6e3; border: 1px solid #f3e0b3; }
    code { background: #f5e8c7; padding: 2px 6px; border-radius: 8px; border: 1px solid #f3e0b3; }
    table { border: 1px solid #f3e0b3; }
    th { background: #fef3c7; color: #92400e; text-transform: uppercase; font-size: 12px; letter-spacing: 0.08em; }
    td { border-top: 1px solid #f3e0b3; color: #374151; }
    blockquote { background: #fff7e6; border-color: #d97706; color: #92400e; }
  `,
  night: `
    body { background: #0b1220; color: #e2e8f0; }
    a { color: #7dd3fc; }
    pre { background: #0f172a; border: 1px solid #1f2937; color: #e5e7eb; }
    code { background: #0f172a; padding: 2px 6px; border-radius: 8px; border: 1px solid #1f2937; color: #e5e7eb; }
    table { border: 1px solid #1f2937; }
    th { background: #111827; color: #cbd5f5; text-transform: uppercase; font-size: 12px; letter-spacing: 0.08em; }
    td { border-top: 1px solid #1f2937; color: #e2e8f0; }
    blockquote { background: #0f172a; border-color: #22d3ee; color: #e2e8f0; }
  `,
  pastel: `
    body { background: linear-gradient(180deg, #f6f5ff 0%, #fffaf0 60%, #ffffff 100%); color: #1f2937; }
    a { color: #6366f1; }
    pre { background: #f4f2ff; border: 1px solid #e0e7ff; }
    code { background: #eef2ff; padding: 2px 6px; border-radius: 8px; border: 1px solid #e0e7ff; }
    table { border: 1px solid #e0e7ff; }
    th { background: #eef2ff; color: #4f46e5; text-transform: uppercase; font-size: 12px; letter-spacing: 0.08em; }
    td { border-top: 1px solid #e0e7ff; color: #374151; }
    blockquote { background: #eef2ff; border-color: #818cf8; color: #312e81; }
  `,
  paper: `
    body { background: #fdfbf7; color: #1f2937; }
    a { color: #2b2b2b; text-decoration: underline; }
    pre { background: #f7f3ec; border: 1px solid #e5decf; }
    code { background: #f5efe2; padding: 2px 6px; border-radius: 8px; border: 1px solid #e5decf; }
    table { border: 1px solid #e5decf; }
    th { background: #f7f3ec; color: #6b7280; text-transform: uppercase; font-size: 12px; letter-spacing: 0.08em; }
    td { border-top: 1px solid #e5decf; color: #374151; }
    blockquote { background: #f7f3ec; border-color: #a78b73; color: #5b4231; }
  `,
  contrast: `
    body { background: #0e0b14; color: #f3e8ff; }
    a { color: #f472b6; }
    pre { background: #14111b; border: 1px solid #1f1a2c; color: #f3e8ff; }
    code { background: #1f1a2c; padding: 2px 6px; border-radius: 8px; border: 1px solid #312347; color: #f8e7ff; }
    table { border: 1px solid #1f1a2c; }
    th { background: #1c1a24; color: #fbcfe8; text-transform: uppercase; font-size: 12px; letter-spacing: 0.08em; }
    td { border-top: 1px solid #1f1a2c; color: #f3e8ff; }
    blockquote { background: #1c142a; border-color: #f472b6; color: #f8e7ff; }
  `,
  mono: `
    body { background: #f4f6fb; color: #0f172a; font-family: 'JetBrains Mono','SFMono-Regular',Consolas,monospace; }
    a { color: #2563eb; }
    pre { background: #eef2ff; border: 1px solid #cbd5ff; color: #0f172a; }
    code { background: #e2e8f0; padding: 2px 6px; border-radius: 8px; border: 1px solid #cbd5e1; }
    table { border: 1px solid #cbd5e1; }
    th { background: #e2e8f0; color: #1f2937; text-transform: uppercase; font-size: 12px; letter-spacing: 0.08em; }
    td { border-top: 1px solid #cbd5e1; color: #1f2937; }
    blockquote { background: #e0f2fe; border-color: #38bdf8; color: #0f172a; }
  `,
  terminal: `
    body { background: radial-gradient(circle at 20% 20%, #0f172a 0%, #0b1220 45%, #0a0f1a 100%); color: #e0f2fe; font-family: 'JetBrains Mono','SFMono-Regular',Consolas,monospace; }
    a { color: #34d399; }
    pre { background: #0c111b; border: 1px solid #1f2937; color: #d1fae5; }
    code { background: #111827; padding: 2px 6px; border-radius: 8px; border: 1px solid #1f2937; color: #d1fae5; }
    table { border: 1px solid #1f2937; }
    th { background: #0f172a; color: #a7f3d0; text-transform: uppercase; font-size: 12px; letter-spacing: 0.08em; }
    td { border-top: 1px solid #1f2937; color: #e0f2fe; }
    blockquote { background: #0e1a1a; border-color: #34d399; color: #d1fae5; }
  `,
};

export const markdownToHtml = async (markdown: string, theme: MarkdownTheme, title?: string) => {
  const processed = await unified().use(remarkParse).use(remarkGfm).use(remarkMath).use(remarkRehype).use(rehypeKatex).use(rehypeStringify).process(markdown || '');
  const body = String(processed);
  const themeKey: MarkdownTheme = theme || 'classic';

  return `<!DOCTYPE html>
  <html lang="zh-CN">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${title || '导出内容'}</title>
      <style>${katexCss}</style>
      <style>${baseCss}${themeCss[themeKey]}</style>
    </head>
    <body>
      <div class="container">
        ${title ? `<h1>${title}</h1>` : ''}
        ${body}
      </div>
    </body>
  </html>`;
};

export const pxToMm = (px: number) => (px / 96) * 25.4;
export const mmToPx = (mm: number) => (mm / 25.4) * 96;
