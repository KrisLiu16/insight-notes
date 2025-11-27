import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidProps {
  chart: string;
}

let mermaidInitialized = false;

const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
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
      if (!containerRef.current) return;
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        setSvg(svg);
      } catch (error) {
        console.error('Mermaid render error:', error);
        setSvg('<div class="text-red-500 text-sm p-2 bg-red-50 rounded">图表语法错误</div>');
      }
    };

    renderChart();
  }, [chart]);

  return (
    <div
      ref={containerRef}
      className="flex justify-center my-4 overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

export default Mermaid;
