import React, { useMemo, useRef, useState } from 'react';
import { ArrowDownToLine, Eye, FileDown, FileJson, Image as ImageIcon, Loader2, Monitor, Ruler, X } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Note } from '../types';
import MarkdownPreview from './MarkdownPreview';
import { MarkdownTheme, markdownToHtml, pxToMm, mmToPx } from '../services/exporters';
import { saveFile } from '../services/saveFile';

type ExportFormat = 'pdf' | 'png' | 'html' | 'markdown';
type PaperSize = 'a4' | 'letter' | 'screen' | 'custom';

const paperSizesPx: Record<PaperSize, { width: number; height: number }> = {
  a4: { width: 794, height: 1123 }, // 8.27x11.69in * 96
  letter: { width: 816, height: 1056 }, // 8.5x11in * 96
  screen: { width: 1024, height: 1440 },
  custom: { width: 900, height: 1200 },
};

interface ExportModalProps {
  open: boolean;
  note: Note | null;
  theme: MarkdownTheme;
  onClose: () => void;
  onExportMarkdown: () => Promise<void>;
}

const ExportModal: React.FC<ExportModalProps> = ({ open, note, theme, onClose, onExportMarkdown }) => {
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [paperSize, setPaperSize] = useState<PaperSize>('a4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [scale, setScale] = useState<number>(1);
  const [margin, setMargin] = useState<number>(10); // mm
  const [customWidth, setCustomWidth] = useState<number>(900);
  const [customHeight, setCustomHeight] = useState<number>(1200);
  const [showTitle, setShowTitle] = useState(true);
  const [showMetadata, setShowMetadata] = useState(false);
  const [loading, setLoading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const sizePx = useMemo(() => {
    const base = paperSize === 'custom' ? { width: customWidth, height: customHeight } : paperSizesPx[paperSize];
    const width = orientation === 'portrait' ? base.width : base.height;
    const height = orientation === 'portrait' ? base.height : base.width;
    // For preview, we want to simulate the paper size with margins
    // The content area will be smaller
    return { width, height };
  }, [paperSize, orientation, customWidth, customHeight]);

  const previewScale = useMemo(() => Math.min(1, 900 / sizePx.width), [sizePx.width]);

  // Convert margin mm to px for preview padding
  const marginPx = useMemo(() => mmToPx(margin), [margin]);

  const handleDownload = async () => {
    if (!note || !previewRef.current) return;
    setLoading(true);
    try {
      if (format === 'markdown') {
        await onExportMarkdown();
        return;
      }

      if (format === 'html') {
        const html = await markdownToHtml(note.content, theme, note.title);
        const blob = new Blob([html], { type: 'text/html' });
        await saveFile(blob, { suggestedName: `${note.title || 'note'}.html`, mime: 'text/html' });
        return;
      }

      const dataUrl = await htmlToImage.toPng(previewRef.current, { pixelRatio: scale });
      if (format === 'png') {
        const pngBlob = await (await fetch(dataUrl)).blob();
        await saveFile(pngBlob, { suggestedName: `${note.title || 'note'}.png`, mime: 'image/png' });
        return;
      }

      // PDF
      const widthMm = pxToMm(sizePx.width);
      const heightMm = pxToMm(sizePx.height);
      const doc = new jsPDF({ orientation, unit: 'mm', format: [widthMm, heightMm] });
      const img = new Image();
      img.src = dataUrl;
      await new Promise(resolve => { img.onload = () => resolve(true); });

      const pageContentWidthMm = widthMm - margin * 2;
      const pageContentHeightMm = heightMm - margin * 2;

      const mmPerPx = pageContentWidthMm / img.naturalWidth;
      const sliceHeightPx = Math.floor(pageContentHeightMm / mmPerPx);

      let y = 0;
      let pageIndex = 0;
      while (y < img.naturalHeight) {
        const currSlicePx = Math.min(sliceHeightPx, img.naturalHeight - y);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = currSlicePx;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 不支持 2D 上下文');
        ctx.drawImage(img, 0, y, img.naturalWidth, currSlicePx, 0, 0, img.naturalWidth, currSlicePx);
        const sliceUrl = canvas.toDataURL('image/png');

        const renderWidthMm = pageContentWidthMm;
        const renderHeightMm = currSlicePx * mmPerPx;
        if (pageIndex > 0) doc.addPage([widthMm, heightMm], orientation);
        doc.addImage(sliceUrl, 'PNG', margin, margin, renderWidthMm, renderHeightMm);

        y += currSlicePx;
        pageIndex += 1;
      }

      const pdfBlob = doc.output('blob');
      await saveFile(pdfBlob, { suggestedName: `${note.title || 'note'}.pdf`, mime: 'application/pdf' });
    } catch (err) {
      alert(`导出失败：${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col border border-slate-100">
        <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-white to-slate-50">
          <div className="flex items-center gap-3 text-slate-800">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
              <FileDown size={18} />
            </div>
            <div className="leading-tight">
              <div className="font-semibold text-lg">导出与预览</div>
              <div className="text-xs text-slate-500">保持当前 Markdown 样式 · 可视化微调</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex min-h-0">
          <div className="w-full md:w-80 border-r border-slate-100 p-4 space-y-4 bg-gradient-to-b from-slate-50 to-white overflow-y-auto custom-scrollbar flex-shrink-0">
            <div className="bg-white/80 border border-slate-100 rounded-2xl p-3 shadow-sm">
              <div className="text-xs font-bold text-slate-400 uppercase mb-2">格式</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'pdf', label: 'PDF', icon: <FileDown size={16} /> },
                  { key: 'png', label: 'PNG', icon: <ImageIcon size={16} /> },
                  { key: 'html', label: 'HTML', icon: <Monitor size={16} /> },
                  { key: 'markdown', label: 'Markdown', icon: <FileJson size={16} /> },
                ].map(item => (
                  <button
                    key={item.key}
                    onClick={() => setFormat(item.key as ExportFormat)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all ${
                      format === item.key ? 'border-blue-300 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 hover:border-blue-200'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 bg-white/80 border border-slate-100 rounded-2xl p-3 shadow-sm">
              <div className="text-xs font-bold text-slate-400 uppercase">尺寸与比例</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'a4', label: 'A4' },
                  { key: 'letter', label: 'Letter' },
                  { key: 'screen', label: '屏幕宽' },
                  { key: 'custom', label: '自定义' },
                ].map(item => (
                  <button
                    key={item.key}
                    onClick={() => setPaperSize(item.key as PaperSize)}
                    className={`px-3 py-2 rounded-xl border text-sm transition-all ${
                      paperSize === item.key ? 'border-blue-300 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 hover:border-blue-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <label className="flex-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1 mb-1">宽 (px)</span>
                  <input
                    type="number"
                    value={sizePx.width}
                    disabled={paperSize !== 'custom'}
                    onChange={e => setCustomWidth(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm disabled:bg-slate-100"
                  />
                </label>
                <label className="flex-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1 mb-1">高 (px)</span>
                  <input
                    type="number"
                    value={sizePx.height}
                    disabled={paperSize !== 'custom'}
                    onChange={e => setCustomHeight(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm disabled:bg-slate-100"
                  />
                </label>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-400 uppercase">内容选项</div>
                <label className="flex items-center justify-between text-sm text-slate-600 cursor-pointer">
                  <span>显示标题</span>
                  <input
                    type="checkbox"
                    checked={showTitle}
                    onChange={e => setShowTitle(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-0"
                  />
                </label>
                <label className="flex items-center justify-between text-sm text-slate-600 cursor-pointer">
                  <span>显示元数据</span>
                  <input
                    type="checkbox"
                    checked={showMetadata}
                    onChange={e => setShowMetadata(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-0"
                  />
                </label>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">方向</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOrientation('portrait')}
                    className={`px-3 py-1.5 rounded-lg border text-sm ${orientation === 'portrait' ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200'}`}
                  >
                    竖向
                  </button>
                  <button
                    onClick={() => setOrientation('landscape')}
                    className={`px-3 py-1.5 rounded-lg border text-sm ${orientation === 'landscape' ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200'}`}
                  >
                    横向
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">缩放 ({Math.round(scale * 100)}%)</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={scale}
                    onChange={e => setScale(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <button
                    onClick={() => setScale(1)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    重置
                  </button>
                </div>
              </div>

              <label className="flex items-center justify-between text-sm text-slate-600">
                <span className="flex items-center gap-1">
                  <Ruler size={14} />
                  边距 (mm)
                </span>
                <input
                  type="number"
                  min={0}
                  value={margin}
                  onChange={e => setMargin(Number(e.target.value) || 0)}
                  className="w-20 px-3 py-1.5 rounded-lg border border-slate-200 text-sm"
                />
              </label>
            </div>

            <div className="bg-white/80 border border-slate-100 rounded-2xl p-3 shadow-sm space-y-2 text-xs text-slate-500">
              <div className="flex items-center justify-between">
                <span>预览比例</span>
                <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700">{Math.round(previewScale * 100)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>输出尺寸</span>
                <span className="text-slate-700">{Math.round(sizePx.width)} × {Math.round(sizePx.height)} px</span>
              </div>
              <div className="flex items-center justify-between">
                <span>当前主题</span>
                <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">{theme}</span>
              </div>
            </div>

            <button
              onClick={handleDownload}
              disabled={loading || !note}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg shadow-blue-500/30 hover:brightness-110 disabled:opacity-60"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowDownToLine size={16} />}
              生成并下载
            </button>
          </div>

          <div className="flex-1 bg-slate-100/70 p-4 overflow-auto relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.08),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.08),transparent_30%)] pointer-events-none" />
            <div className="flex items-center gap-2 text-slate-600 text-sm mb-3 relative z-10">
              <Eye size={16} />
              导出预览（跟随当前渲染主题）
              <span className="text-xs text-slate-400">预览缩放: {Math.round(previewScale * 100)}%</span>
            </div>
            <div className="flex justify-center relative z-10">
              <div
                ref={previewRef}
                className="bg-white shadow-2xl overflow-hidden border border-slate-200 origin-top-left transition-all duration-200"
                style={{
                  width: sizePx.width,
                  minHeight: sizePx.height,
                  padding: marginPx,
                  transform: `scale(${previewScale})`,
                }}
              >
                {note ? (
                  <div className="h-full flex flex-col" style={{ zoom: scale }}>
                    {(showTitle || showMetadata) && (
                      <div className="mb-6 border-b border-slate-100 pb-4">
                        {showTitle && <h1 className="text-3xl font-bold text-slate-900 mb-2">{note.title || '未命名笔记'}</h1>}
                        {showMetadata && (
                          <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                            <span>分类: {note.category || '未分类'}</span>
                            <span>更新: {new Date(note.updatedAt).toLocaleDateString()}</span>
                            {note.tags.length > 0 && <span>标签: {note.tags.join(', ')}</span>}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex-1">
                      <MarkdownPreview content={note.content} attachments={note.attachments} theme={theme} showToc={false} />
                    </div>
                  </div>
                ) : (
                  <div className="p-10 text-center text-slate-400">暂无笔记可预览</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
