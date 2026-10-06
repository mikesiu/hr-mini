/**
 * Reliable file download helpers for Chrome.
 * Large blob: URL downloads often fail with "Check internet connection".
 * Prefer File System Access (Save As) + direct write when available.
 */

const EXCEL_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

type SaveFilePickerHandle = {
  name: string;
  createWritable: () => Promise<{
    write: (data: BufferSource | Blob) => Promise<void>;
    close: () => Promise<void>;
    abort: () => Promise<void>;
  }>;
};

type SaveFilePickerWindow = Window & {
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    types?: Array<{ description: string; accept: Record<string, string[]> }>;
  }) => Promise<SaveFilePickerHandle>;
};

export type DownloadResult = 'saved' | 'downloaded' | 'cancelled';

function toUint8Array(buffer: ArrayBuffer | Uint8Array | Blob | ArrayBufferView): Promise<Uint8Array> {
  if (buffer instanceof Uint8Array) {
    return Promise.resolve(new Uint8Array(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)));
  }
  if (buffer instanceof ArrayBuffer) {
    return Promise.resolve(new Uint8Array(buffer.slice(0)));
  }
  if (ArrayBuffer.isView(buffer)) {
    const view = buffer as ArrayBufferView;
    return Promise.resolve(
      new Uint8Array(view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength))
    );
  }
  if (buffer instanceof Blob) {
    return buffer.arrayBuffer().then((ab) => new Uint8Array(ab.slice(0)));
  }
  return Promise.reject(new Error('Unsupported download buffer type'));
}

/**
 * Open the native Save dialog while the click gesture is still valid.
 * Call this before any long async work when possible.
 */
export async function promptExcelSaveDialog(
  filename: string
): Promise<SaveFilePickerHandle | null> {
  const win = window as SaveFilePickerWindow;
  if (typeof win.showSaveFilePicker !== 'function') {
    return null;
  }
  try {
    return await win.showSaveFilePicker({
      suggestedName: filename,
      types: [
        {
          description: 'Excel workbook',
          accept: { [EXCEL_MIME]: ['.xlsx'] },
        },
      ],
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw err; // caller treats as cancel
    }
    console.warn('showSaveFilePicker unavailable:', err);
    return null;
  }
}

/**
 * Write bytes to a previously chosen file handle, or fall back to blob download.
 */
export async function writeOrDownloadBytes(
  data: Uint8Array,
  filename: string,
  fileHandle: SaveFilePickerHandle | null,
  mimeType: string = EXCEL_MIME
): Promise<DownloadResult> {
  if (data.byteLength < 1) {
    throw new Error('Download file is empty');
  }

  if (fileHandle) {
    const writable = await fileHandle.createWritable();
    try {
      await writable.write(data);
      await writable.close();
    } catch (err) {
      try {
        await writable.abort();
      } catch {
        // ignore
      }
      throw err;
    }
    return 'saved';
  }

  const blob = new Blob([data], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  // Keep alive so GC does not collect before Chrome reads the blob
  (window as any).__hrDownloadKeepAlive = { blob, url, data };
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    try {
      a.remove();
      window.URL.revokeObjectURL(url);
      delete (window as any).__hrDownloadKeepAlive;
    } catch {
      // ignore
    }
  }, 60_000);
  return 'downloaded';
}

/**
 * Build an Excel file and save it. Opens Save As first (while gesture is valid),
 * then runs `build` and writes the result.
 */
export async function downloadGeneratedExcel(options: {
  filename: string;
  build: () => Promise<ArrayBuffer | Uint8Array | Blob | ArrayBufferView>;
}): Promise<DownloadResult> {
  let fileHandle: SaveFilePickerHandle | null = null;
  try {
    fileHandle = await promptExcelSaveDialog(options.filename);
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return 'cancelled';
    }
    fileHandle = null;
  }

  const raw = await options.build();
  const data = await toUint8Array(raw);
  return writeOrDownloadBytes(data, options.filename, fileHandle, EXCEL_MIME);
}

/**
 * Download an already-fetched blob/arraybuffer (e.g. API template).
 * Opens Save As first when possible.
 */
export async function downloadBlobFile(options: {
  filename: string;
  data: Blob | ArrayBuffer | Uint8Array;
  mimeType?: string;
}): Promise<DownloadResult> {
  const mimeType = options.mimeType || EXCEL_MIME;
  let fileHandle: SaveFilePickerHandle | null = null;

  // Prefer Save As for Excel; for other types still try picker with generic accept
  const win = window as SaveFilePickerWindow;
  if (typeof win.showSaveFilePicker === 'function') {
    try {
      const accept: Record<string, string[]> =
        mimeType === EXCEL_MIME
          ? { [EXCEL_MIME]: ['.xlsx'] }
          : mimeType === 'application/pdf'
            ? { 'application/pdf': ['.pdf'] }
            : mimeType === 'application/zip'
              ? { 'application/zip': ['.zip'] }
              : { [mimeType]: ['*'] };
      fileHandle = await win.showSaveFilePicker({
        suggestedName: options.filename,
        types: [{ description: 'Download', accept }],
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return 'cancelled';
      }
      fileHandle = null;
    }
  }

  const data = await toUint8Array(options.data);
  return writeOrDownloadBytes(data, options.filename, fileHandle, mimeType);
}
