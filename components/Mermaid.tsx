import React, { useEffect, useRef, useState, memo } from 'react';
import mermaid from 'mermaid';
import katex from 'katex';

interface MermaidProps {
  chart: string;
}

let mermaidInitialized = false;

const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
    let canceled = false;
    
    // When chart changes, if we have an existing SVG (from a previous chart), 
    // we should clear it or show a loading state to avoid showing the wrong chart.
    // However, flickering to white might be annoying.
    // But since we removed the 'key' prop from MarkdownPreview, components are reused.
    // So 'svg' state currently holds the OLD chart's SVG.
    // We MUST clear it immediately to prevent showing Chart A while calculating Chart B.
    setSvg(''); 

    if (!mermaidInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        themeVariables: {
          primaryColor: '#EEF2FF',
          primaryTextColor: '#312E81',
          primaryBorderColor: '#A855F7',
          lineColor: '#94A3B8',
          secondaryColor: '#F8FAFC',
          tertiaryColor: '#E0E7FF',
          fontFamily: 'Inter, "PingFang SC", "Microsoft YaHei", sans-serif',
          textColor: '#0F172A',
          noteBkgColor: '#E0E7FF',
          noteTextColor: '#1E293B',
          background: '#FFFFFF',
        },
        themeCSS: `
          .node rect, .node path {
            rx: 12px;
            ry: 12px;
            filter: drop-shadow(0 8px 16px rgba(148, 163, 184, 0.18));
          }
          .label text {
            font-weight: 600;
          }
          .edgePath .path {
            stroke-width: 2px;
          }
          .cluster rect {
            stroke-width: 1.4px;
            rx: 14px;
            ry: 14px;
            fill: #F8FAFC;
            stroke: #E2E8F0;
          }
          .marker {
            fill: #A855F7;
            stroke: none;
          }
        `,
      });
      mermaidInitialized = true;
    }

    const renderChart = async () => {
      if (!containerRef.current || canceled) return;
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        const enhanced = enhanceSvgWithMath(svg);
        if (!canceled) setSvg(enhanced);
      } catch (error) {
        if (!canceled) {
          console.error('Mermaid render error:', error);
          setSvg('<div class="text-red-500 text-sm p-2 bg-red-50 rounded">图表语法错误</div>');
        }
      }
    };

    renderChart();
    return () => { canceled = true; };
  }, [chart]);

  return (
    <div
      ref={containerRef}
      className="flex justify-center my-4 overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

function enhanceSvgWithMath(svgSource: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgSource, 'image/svg+xml');
    const texts = Array.from(doc.querySelectorAll('text')) as SVGTextElement[];
    for (const t of texts) {
      const raw = t.textContent || '';
      if (!/(\$\$[\s\S]+?\$\$|\$[^$]+\$)/.test(raw)) continue;
      const x = t.getAttribute('x') || '0';
      const y = t.getAttribute('y') || '0';
      const html = renderInlineMathHtml(raw);
      const fo = doc.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
      fo.setAttribute('x', x);
      fo.setAttribute('y', String(Number(y) - 12));
      fo.setAttribute('width', '1');
      fo.setAttribute('height', '1');
      fo.setAttribute('style', 'overflow: visible');
      const div = doc.createElementNS('http://www.w3.org/1999/xhtml', 'div');
      div.setAttribute('style', 'display:inline-block; white-space:nowrap; transform: translateY(-0.35em);');
      div.innerHTML = html;
      fo.appendChild(div);
      const parent = t.parentNode;
      if (parent) parent.replaceChild(fo, t);
    }
    const serializer = new XMLSerializer();
    return serializer.serializeToString(doc.documentElement);
  } catch {
    return svgSource;
  }
}

function renderInlineMathHtml(text: string): string {
  const parts = [] as string[];
  const regex = /(\$\$[\s\S]+?\$\$|\$[^$]+\$)/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIndex) {
      parts.push(escapeHtml(text.slice(lastIndex, m.index)));
    }
    const token = m[0];
    const isDisplay = token.startsWith('$$');
    const expr = token.replace(/^\$\$|\$\$/g, '').replace(/^\$|\$/g, '');
    try {
      const rendered = katex.renderToString(expr, { displayMode: isDisplay, throwOnError: false, strict: false, trust: true });
      parts.push(rendered);
    } catch {
      parts.push(escapeHtml(token));
    }
    lastIndex = m.index + token.length;
  }
  if (lastIndex < text.length) parts.push(escapeHtml(text.slice(lastIndex)));
  return parts.join('');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default memo(Mermaid);
