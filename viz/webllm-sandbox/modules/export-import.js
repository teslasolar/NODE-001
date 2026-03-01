/**
 * Export-Import Module — Download/upload project as ZIP, JSON, or raw files
 *
 * Uses the browser's built-in Blob/FileReader APIs. ZIP encoding
 * is done with a minimal in-line implementation (store-only, no compression)
 * to avoid external dependencies.
 */

/**
 * Export all files as a JSON bundle
 * @param {Map|Object} files - { path: { content, type }, ... }
 * @param {string} repoName
 * @returns {{ blob: Blob, filename: string }}
 */
export function exportAsJSON(files, repoName = 'project') {
  const data = {
    name: repoName,
    exported: new Date().toISOString(),
    version: 1,
    files: {}
  };

  const entries = files instanceof Map ? files.entries() : Object.entries(files);
  for (const [path, f] of entries) {
    data.files[path] = {
      content: f.content,
      type: f.type || 'text'
    };
  }

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  return { blob, filename: `${repoName}.sandbox.json` };
}

/**
 * Import files from a JSON bundle
 * @param {string} jsonStr - JSON string from exported bundle
 * @returns {{ files: Object, name: string, error?: string }}
 */
export function importFromJSON(jsonStr) {
  try {
    const data = JSON.parse(jsonStr);
    if (!data.files || typeof data.files !== 'object') {
      return { files: {}, name: '', error: 'Invalid bundle: no files found' };
    }
    return { files: data.files, name: data.name || 'imported' };
  } catch (e) {
    return { files: {}, name: '', error: 'Invalid JSON: ' + e.message };
  }
}

/**
 * Export all files as a ZIP (store-only, no compression)
 * Implements the ZIP file format specification inline.
 * @param {Map|Object} files
 * @param {string} repoName
 * @returns {{ blob: Blob, filename: string }}
 */
export function exportAsZIP(files, repoName = 'project') {
  const entries = [];
  const fileMap = files instanceof Map ? files : new Map(Object.entries(files));

  for (const [path, f] of fileMap) {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const content = typeof f === 'string' ? f : f.content || '';
    entries.push({ path: cleanPath, content: new TextEncoder().encode(content) });
  }

  const parts = [];
  const centralDir = [];
  let offset = 0;

  for (const entry of entries) {
    const pathBytes = new TextEncoder().encode(entry.path);
    const crc = crc32(entry.content);

    // Local file header
    const local = new ArrayBuffer(30 + pathBytes.length + entry.content.length);
    const lv = new DataView(local);
    lv.setUint32(0, 0x04034b50, true);   // signature
    lv.setUint16(4, 20, true);            // version needed
    lv.setUint16(6, 0, true);             // flags
    lv.setUint16(8, 0, true);             // compression: store
    lv.setUint16(10, 0, true);            // mod time
    lv.setUint16(12, 0, true);            // mod date
    lv.setUint32(14, crc, true);          // crc32
    lv.setUint32(18, entry.content.length, true); // compressed size
    lv.setUint32(22, entry.content.length, true); // uncompressed size
    lv.setUint16(26, pathBytes.length, true);     // filename length
    lv.setUint16(28, 0, true);            // extra field length

    const localArr = new Uint8Array(local);
    localArr.set(pathBytes, 30);
    localArr.set(entry.content, 30 + pathBytes.length);

    parts.push(localArr);

    // Central directory entry
    const cd = new ArrayBuffer(46 + pathBytes.length);
    const cv = new DataView(cd);
    cv.setUint32(0, 0x02014b50, true);    // signature
    cv.setUint16(4, 20, true);            // version made by
    cv.setUint16(6, 20, true);            // version needed
    cv.setUint16(8, 0, true);             // flags
    cv.setUint16(10, 0, true);            // compression: store
    cv.setUint16(12, 0, true);            // mod time
    cv.setUint16(14, 0, true);            // mod date
    cv.setUint32(16, crc, true);          // crc32
    cv.setUint32(20, entry.content.length, true); // compressed
    cv.setUint32(24, entry.content.length, true); // uncompressed
    cv.setUint16(28, pathBytes.length, true);
    cv.setUint16(30, 0, true);            // extra length
    cv.setUint16(32, 0, true);            // comment length
    cv.setUint16(34, 0, true);            // disk number
    cv.setUint16(36, 0, true);            // internal attrs
    cv.setUint32(38, 0, true);            // external attrs
    cv.setUint32(42, offset, true);       // local header offset

    const cdArr = new Uint8Array(cd);
    cdArr.set(pathBytes, 46);
    centralDir.push(cdArr);

    offset += localArr.length;
  }

  // Central directory
  const cdOffset = offset;
  let cdSize = 0;
  for (const cd of centralDir) {
    parts.push(cd);
    cdSize += cd.length;
  }

  // End of central directory record
  const eocd = new ArrayBuffer(22);
  const ev = new DataView(eocd);
  ev.setUint32(0, 0x06054b50, true);     // signature
  ev.setUint16(4, 0, true);              // disk number
  ev.setUint16(6, 0, true);              // cd disk
  ev.setUint16(8, entries.length, true);  // entries on disk
  ev.setUint16(10, entries.length, true); // total entries
  ev.setUint32(12, cdSize, true);         // cd size
  ev.setUint32(16, cdOffset, true);       // cd offset
  ev.setUint16(20, 0, true);             // comment length

  parts.push(new Uint8Array(eocd));

  const blob = new Blob(parts, { type: 'application/zip' });
  return { blob, filename: `${repoName}.zip` };
}

/**
 * Export a single file for download
 */
export function exportSingleFile(path, content) {
  const mimeMap = {
    html: 'text/html', css: 'text/css', js: 'text/javascript',
    json: 'application/json', md: 'text/markdown', txt: 'text/plain',
    svg: 'image/svg+xml', xml: 'text/xml'
  };
  const ext = path.split('.').pop().toLowerCase();
  const mime = mimeMap[ext] || 'text/plain';
  const blob = new Blob([content], { type: mime });
  const filename = path.split('/').pop();
  return { blob, filename };
}

/**
 * Trigger browser download of a Blob
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Read a file from a File input (drag-drop or <input type="file">)
 * @returns {Promise<{ name, content, type }>}
 */
export function readUploadedFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        name: file.name,
        content: reader.result,
        type: file.type || 'text/plain',
        size: file.size
      });
    };
    reader.onerror = () => reject(new Error('Failed to read file: ' + file.name));
    reader.readAsText(file);
  });
}

/**
 * Read multiple uploaded files
 * @returns {Promise<Array<{ name, content, type }>>}
 */
export function readUploadedFiles(fileList) {
  return Promise.all(Array.from(fileList).map(readUploadedFile));
}

/**
 * Set up drag-and-drop on an element
 * @param {HTMLElement} element
 * @param {function} onDrop - callback({files: Array<{name,content}>})
 */
export function setupDragDrop(element, onDrop) {
  element.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    element.style.outline = '2px dashed #44aaff';
    element.style.outlineOffset = '-4px';
  });

  element.addEventListener('dragleave', (e) => {
    e.preventDefault();
    element.style.outline = '';
    element.style.outlineOffset = '';
  });

  element.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    element.style.outline = '';
    element.style.outlineOffset = '';

    if (e.dataTransfer.files.length > 0) {
      const files = await readUploadedFiles(e.dataTransfer.files);
      onDrop({ files });
    }
  });
}

// ─── CRC32 ───
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
})();

function crc32(data) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
