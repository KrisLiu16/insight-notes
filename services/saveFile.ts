export interface SaveFileOptions {
  suggestedName?: string;
  mime?: string;
}

export const saveFile = async (data: BlobPart | Blob, options: SaveFileOptions = {}) => {
  const mime = options.mime || 'application/octet-stream';
  const suggestedName = options.suggestedName || 'export';
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime });

  const tryPicker = async () => {
    const picker = (window as any).showSaveFilePicker;
    if (typeof picker !== 'function') return false;
    const ext = suggestedName.includes('.') ? suggestedName.substring(suggestedName.lastIndexOf('.')) : '';
    const accept: Record<string, string[]> = { [mime]: ext ? [ext] : ['.bin'] };
    const handle = await picker({
      suggestedName,
      types: [{ description: 'Export', accept }],
    });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return true;
  };

  try {
    const usedPicker = await tryPicker();
    if (usedPicker) return;
  } catch (err) {
    console.warn('showSaveFilePicker failed, fallback to download', err);
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
