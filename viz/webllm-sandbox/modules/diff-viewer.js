/**
 * Diff Viewer Module — Side-by-side & unified diff display
 *
 * Computes line-level diffs between two text strings using a
 * simplified LCS algorithm, then renders them as highlighted
 * side-by-side or unified views.
 */

const COLORS = {
  added:      { bg: 'rgba(68,255,136,0.08)', border: 'rgba(68,255,136,0.25)', text: '#98c379' },
  removed:    { bg: 'rgba(255,68,68,0.08)',   border: 'rgba(255,68,68,0.25)',  text: '#e06c75' },
  unchanged:  { bg: 'transparent',            border: 'transparent',           text: '#667' },
  header:     { bg: 'rgba(170,136,255,0.08)', border: 'rgba(170,136,255,0.2)', text: '#aa88ff' },
};

/**
 * Compute line-level diff using LCS (Longest Common Subsequence)
 * Returns array of { type: 'add'|'remove'|'equal', oldLine, newLine, text }
 */
export function computeDiff(oldText, newText) {
  const oldLines = (oldText || '').split('\n');
  const newLines = (newText || '').split('\n');
  const m = oldLines.length;
  const n = newLines.length;

  // Build LCS table
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build diff
  const hunks = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      hunks.unshift({ type: 'equal', oldLine: i, newLine: j, text: oldLines[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      hunks.unshift({ type: 'add', oldLine: null, newLine: j, text: newLines[j - 1] });
      j--;
    } else {
      hunks.unshift({ type: 'remove', oldLine: i, newLine: null, text: oldLines[i - 1] });
      i--;
    }
  }

  return hunks;
}

/**
 * Get diff stats
 */
export function diffStats(hunks) {
  let added = 0, removed = 0, unchanged = 0;
  for (const h of hunks) {
    if (h.type === 'add') added++;
    else if (h.type === 'remove') removed++;
    else unchanged++;
  }
  return { added, removed, unchanged, total: hunks.length };
}

/**
 * Render unified diff as HTML string
 */
export function renderUnifiedDiff(hunks, options = {}) {
  const { fileName = '', contextLines = 3 } = options;

  // Filter to show only changed lines + context
  const visible = new Set();
  hunks.forEach((h, idx) => {
    if (h.type !== 'equal') {
      for (let k = Math.max(0, idx - contextLines); k <= Math.min(hunks.length - 1, idx + contextLines); k++) {
        visible.add(k);
      }
    }
  });

  let html = '';

  if (fileName) {
    html += `<div style="padding:6px 10px;background:${COLORS.header.bg};border-bottom:1px solid ${COLORS.header.border};color:${COLORS.header.text};font-size:11px;font-weight:bold">${escHtml(fileName)}</div>`;
  }

  const stats = diffStats(hunks);
  html += `<div style="padding:4px 10px;font-size:10px;color:#556;border-bottom:1px solid rgba(42,42,58,0.5)">`;
  html += `<span style="color:#98c379">+${stats.added}</span> `;
  html += `<span style="color:#e06c75">-${stats.removed}</span> `;
  html += `<span style="color:#667">${stats.unchanged} unchanged</span></div>`;

  let lastVisible = -2;
  hunks.forEach((h, idx) => {
    if (!visible.has(idx)) return;

    // Show separator for gaps
    if (idx > lastVisible + 1 && lastVisible >= 0) {
      html += `<div style="padding:2px 10px;text-align:center;color:#334;font-size:10px;background:rgba(0,0,0,0.2)">···</div>`;
    }
    lastVisible = idx;

    const prefix = h.type === 'add' ? '+' : h.type === 'remove' ? '-' : ' ';
    const c = h.type === 'add' ? COLORS.added : h.type === 'remove' ? COLORS.removed : COLORS.unchanged;
    const lineNum = h.type === 'remove' ? (h.oldLine || '') : (h.newLine || '');

    html += `<div style="display:flex;background:${c.bg};border-left:2px solid ${c.border}">`;
    html += `<span style="min-width:32px;text-align:right;padding:0 6px;color:#3a3a5a;font-size:10px;user-select:none">${lineNum}</span>`;
    html += `<span style="width:14px;text-align:center;color:${c.text};font-weight:bold;user-select:none">${prefix}</span>`;
    html += `<span style="flex:1;padding-right:8px;color:${c.text};white-space:pre-wrap;word-break:break-all">${escHtml(h.text)}</span>`;
    html += `</div>`;
  });

  if (stats.added === 0 && stats.removed === 0) {
    html += `<div style="padding:12px;text-align:center;color:#445;font-size:11px">No changes</div>`;
  }

  return html;
}

/**
 * Render side-by-side diff as HTML string
 */
export function renderSideBySideDiff(hunks, options = {}) {
  const { oldTitle = 'Before', newTitle = 'After' } = options;

  let html = `<div style="display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid rgba(42,42,58,0.5)">`;
  html += `<div style="padding:4px 10px;font-size:10px;color:#e06c75;background:rgba(255,68,68,0.04)">${escHtml(oldTitle)}</div>`;
  html += `<div style="padding:4px 10px;font-size:10px;color:#98c379;background:rgba(68,255,136,0.04)">${escHtml(newTitle)}</div>`;
  html += `</div>`;

  // Pair up lines
  for (const h of hunks) {
    html += `<div style="display:grid;grid-template-columns:1fr 1fr">`;

    if (h.type === 'equal') {
      html += renderSideLine(h.oldLine, h.text, COLORS.unchanged);
      html += renderSideLine(h.newLine, h.text, COLORS.unchanged);
    } else if (h.type === 'remove') {
      html += renderSideLine(h.oldLine, h.text, COLORS.removed);
      html += `<div style="background:rgba(255,68,68,0.03)"></div>`;
    } else {
      html += `<div style="background:rgba(68,255,136,0.03)"></div>`;
      html += renderSideLine(h.newLine, h.text, COLORS.added);
    }

    html += `</div>`;
  }

  return html;
}

function renderSideLine(lineNum, text, colors) {
  return `<div style="display:flex;background:${colors.bg};border-left:2px solid ${colors.border}">
    <span style="min-width:28px;text-align:right;padding:0 4px;color:#3a3a5a;font-size:10px;user-select:none">${lineNum || ''}</span>
    <span style="flex:1;padding:0 6px;color:${colors.text};white-space:pre-wrap;word-break:break-all;font-size:11px">${escHtml(text)}</span>
  </div>`;
}

/**
 * Render diff into a container element
 */
export function mountDiffViewer(container, oldText, newText, options = {}) {
  const { mode = 'unified', fileName = '' } = options;
  const hunks = computeDiff(oldText, newText);

  container.style.cssText = `
    font-family:'Courier New',monospace;font-size:12px;line-height:1.5;
    background:#0a0a14;overflow:auto;border-radius:4px;border:1px solid rgba(42,42,58,0.5);
  `;

  if (mode === 'side-by-side') {
    container.innerHTML = renderSideBySideDiff(hunks, options);
  } else {
    container.innerHTML = renderUnifiedDiff(hunks, { fileName, ...options });
  }

  return { hunks, stats: diffStats(hunks) };
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
