/**
 * Code Editor Module — Syntax-highlighted inline file editor
 *
 * Provides a lightweight code editor with syntax highlighting,
 * line numbers, auto-indent, and bracket matching. Renders into
 * any container element and syncs edits back to the virtual FS.
 */

// ─── Token types & colors ───
const THEME = {
  keyword:    '#c678dd',
  string:     '#98c379',
  number:     '#d19a66',
  comment:    '#5c6370',
  tag:        '#e06c75',
  attr:       '#d19a66',
  attrVal:    '#98c379',
  punctuation:'#abb2bf',
  property:   '#61afef',
  function:   '#61afef',
  operator:   '#56b6c2',
  default:    '#abb2bf',
  bg:         '#0d0d18',
  gutterBg:   '#0a0a14',
  gutterText: '#3a3a5a',
  lineHi:     'rgba(68,170,255,0.06)',
  cursor:     '#528bff',
  selection:  'rgba(68,170,255,0.2)',
};

// ─── Language tokenizers ───
const RULES = {
  javascript: [
    { re: /(\/\/.*$)/m,                             type: 'comment'  },
    { re: /(\/\*[\s\S]*?\*\/)/,                      type: 'comment'  },
    { re: /(`[\s\S]*?`)/,                            type: 'string'   },
    { re: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/,   type: 'string'   },
    { re: /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|this|class|extends|import|export|from|default|async|await|try|catch|finally|throw|typeof|instanceof|in|of|yield|delete|void|null|undefined|true|false)\b/, type: 'keyword' },
    { re: /\b(\d+\.?\d*(?:e[+-]?\d+)?)\b/i,          type: 'number'   },
    { re: /([+\-*/%=<>!&|^~?:]+)/,                   type: 'operator' },
    { re: /\b([a-zA-Z_$]\w*)\s*(?=\()/,              type: 'function' },
    { re: /([{}()\[\];,.])/,                          type: 'punctuation' },
  ],
  html: [
    { re: /(<!--[\s\S]*?-->)/,                        type: 'comment'  },
    { re: /(<\/?[a-zA-Z][\w-]*)/,                     type: 'tag'      },
    { re: /\b([a-zA-Z-]+)(=)/,                        type: 'attr'     },
    { re: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/,    type: 'attrVal'  },
    { re: /(>|\/?>)/,                                  type: 'tag'      },
  ],
  css: [
    { re: /(\/\*[\s\S]*?\*\/)/,                       type: 'comment'  },
    { re: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/,    type: 'string'   },
    { re: /(@[a-zA-Z-]+)/,                             type: 'keyword'  },
    { re: /([.#]?[a-zA-Z_-][\w-]*)\s*(?=\{|,)/,       type: 'tag'      },
    { re: /\b([a-zA-Z-]+)\s*(?=:)/,                    type: 'property' },
    { re: /(\d+\.?\d*(?:px|em|rem|%|vh|vw|s|ms|deg|fr)?)\b/, type: 'number' },
    { re: /(#[0-9a-fA-F]{3,8})\b/,                    type: 'number'   },
    { re: /([{}();:,])/,                               type: 'punctuation' },
  ],
  json: [
    { re: /("(?:[^"\\]|\\.)*")\s*(?=:)/,               type: 'property' },
    { re: /("(?:[^"\\]|\\.)*")/,                        type: 'string'   },
    { re: /\b(true|false|null)\b/,                      type: 'keyword'  },
    { re: /\b(-?\d+\.?\d*(?:e[+-]?\d+)?)\b/i,          type: 'number'   },
    { re: /([{}()\[\]:,])/,                             type: 'punctuation' },
  ],
  python: [
    { re: /(#.*$)/m,                                    type: 'comment'  },
    { re: /("""[\s\S]*?"""|'''[\s\S]*?''')/,             type: 'string'   },
    { re: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/,      type: 'string'   },
    { re: /\b(def|class|return|if|elif|else|for|while|import|from|as|try|except|finally|raise|with|yield|lambda|pass|break|continue|and|or|not|in|is|True|False|None|self|async|await|global|nonlocal)\b/, type: 'keyword' },
    { re: /\b(\d+\.?\d*(?:e[+-]?\d+)?j?)\b/i,          type: 'number'   },
    { re: /\b([a-zA-Z_]\w*)\s*(?=\()/,                  type: 'function' },
    { re: /([+\-*/%=<>!&|^~@:]+)/,                      type: 'operator' },
  ],
  markdown: [
    { re: /^(#{1,6}\s.*)$/m,                             type: 'keyword'  },
    { re: /(\*\*[^*]+\*\*|__[^_]+__)/,                   type: 'keyword'  },
    { re: /(\*[^*]+\*|_[^_]+_)/,                          type: 'string'   },
    { re: /(`[^`]+`)/,                                    type: 'property' },
    { re: /(```[\s\S]*?```)/,                              type: 'comment'  },
    { re: /(\[.*?\]\(.*?\))/,                              type: 'function' },
  ],
};

// Map file types to syntax
const TYPE_MAP = {
  html: 'html', css: 'css', javascript: 'javascript', typescript: 'javascript',
  json: 'json', python: 'python', markdown: 'markdown', text: null, svg: 'html', xml: 'html'
};

/**
 * Highlight a single line of code
 */
export function highlightLine(text, lang) {
  const rules = RULES[lang];
  if (!rules) return escHtml(text);

  const tokens = [];
  let remaining = text;
  let pos = 0;

  while (remaining.length > 0) {
    let bestMatch = null;
    let bestIndex = remaining.length;
    let bestRule = null;

    for (const rule of rules) {
      const m = remaining.match(rule.re);
      if (m && m.index < bestIndex) {
        bestMatch = m;
        bestIndex = m.index;
        bestRule = rule;
      }
    }

    if (!bestMatch || bestIndex >= remaining.length) {
      tokens.push(escHtml(remaining));
      break;
    }

    if (bestIndex > 0) {
      tokens.push(escHtml(remaining.slice(0, bestIndex)));
    }

    const color = THEME[bestRule.type] || THEME.default;
    tokens.push(`<span style="color:${color}">${escHtml(bestMatch[0])}</span>`);
    remaining = remaining.slice(bestIndex + bestMatch[0].length);
  }

  return tokens.join('');
}

/**
 * Highlight full content, returns array of highlighted HTML lines
 */
export function highlightCode(content, fileType) {
  const lang = TYPE_MAP[fileType] || null;
  const lines = content.split('\n');
  return lines.map(line => highlightLine(line, lang));
}

/**
 * Create an editor instance in a container
 * @param {HTMLElement} container - DOM element to mount editor in
 * @param {object} options - { content, fileType, onChange, readOnly }
 * @returns {object} - editor API: { getValue, setValue, setFileType, focus, destroy }
 */
export function createEditor(container, options = {}) {
  const { content = '', fileType = 'text', onChange = null, readOnly = false } = options;

  let currentContent = content;
  let currentType = fileType;
  let cursorLine = 0;

  // Build DOM
  container.innerHTML = '';
  container.style.cssText = `
    display:flex;background:${THEME.bg};font-family:'Courier New',monospace;font-size:12px;
    line-height:1.6;overflow:auto;position:relative;height:100%;
  `;

  const gutter = document.createElement('div');
  gutter.style.cssText = `
    min-width:40px;padding:4px 8px 4px 4px;text-align:right;
    background:${THEME.gutterBg};color:${THEME.gutterText};
    user-select:none;font-size:11px;line-height:1.6;border-right:1px solid #1a1a2a;
    flex-shrink:0;
  `;

  const codeArea = document.createElement('textarea');
  codeArea.style.cssText = `
    flex:1;background:transparent;color:${THEME.default};border:none;outline:none;
    padding:4px 8px;font-family:inherit;font-size:inherit;line-height:inherit;
    resize:none;white-space:pre;overflow-wrap:normal;tab-size:2;
  `;
  codeArea.spellcheck = false;
  codeArea.readOnly = readOnly;
  codeArea.value = currentContent;

  const highlight = document.createElement('div');
  highlight.style.cssText = `
    position:absolute;top:0;left:40px;right:0;padding:4px 8px;
    pointer-events:none;white-space:pre;line-height:1.6;font-size:12px;
    font-family:'Courier New',monospace;overflow:hidden;
  `;

  container.appendChild(gutter);
  container.appendChild(codeArea);

  function renderGutter() {
    const lines = currentContent.split('\n');
    gutter.innerHTML = lines.map((_, i) => {
      const bg = i === cursorLine ? THEME.lineHi : 'transparent';
      return `<div style="background:${bg};padding:0 4px">${i + 1}</div>`;
    }).join('');
  }

  function syncScroll() {
    gutter.scrollTop = codeArea.scrollTop;
  }

  codeArea.addEventListener('scroll', syncScroll);

  codeArea.addEventListener('input', () => {
    currentContent = codeArea.value;
    renderGutter();
    if (onChange) onChange(currentContent);
  });

  codeArea.addEventListener('click', () => {
    const pos = codeArea.selectionStart;
    cursorLine = currentContent.slice(0, pos).split('\n').length - 1;
    renderGutter();
  });

  codeArea.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = codeArea.selectionStart;
      const end = codeArea.selectionEnd;
      codeArea.value = currentContent.slice(0, start) + '  ' + currentContent.slice(end);
      codeArea.selectionStart = codeArea.selectionEnd = start + 2;
      currentContent = codeArea.value;
      renderGutter();
      if (onChange) onChange(currentContent);
    }
    // Auto-close brackets
    const pairs = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`' };
    if (pairs[e.key]) {
      const start = codeArea.selectionStart;
      const end = codeArea.selectionEnd;
      if (start !== end) {
        e.preventDefault();
        const selected = currentContent.slice(start, end);
        codeArea.value = currentContent.slice(0, start) + e.key + selected + pairs[e.key] + currentContent.slice(end);
        codeArea.selectionStart = start + 1;
        codeArea.selectionEnd = end + 1;
        currentContent = codeArea.value;
        if (onChange) onChange(currentContent);
      }
    }
  });

  renderGutter();

  return {
    getValue() { return currentContent; },
    setValue(val) {
      currentContent = val;
      codeArea.value = val;
      renderGutter();
    },
    setFileType(t) { currentType = t; },
    focus() { codeArea.focus(); },
    getElement() { return container; },
    destroy() { container.innerHTML = ''; }
  };
}

/**
 * Get syntax language from file type
 */
export function getSyntaxLang(fileType) {
  return TYPE_MAP[fileType] || null;
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
