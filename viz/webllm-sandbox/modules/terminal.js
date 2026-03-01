/**
 * Terminal Emulator Module — In-browser JS execution console
 *
 * Provides a REPL-style terminal that executes JavaScript in a
 * sandboxed scope with captured console output, timing, and
 * error handling. Also supports special sandbox commands.
 */

/**
 * Create a terminal instance
 * @param {HTMLElement} container
 * @param {object} options - { onCommand, getFiles, getRepoState }
 * @returns {object} terminal API
 */
export function createTerminal(container, options = {}) {
  const { onCommand = null, getFiles = null, getRepoState = null } = options;

  const history = [];
  let historyIndex = -1;
  const outputLines = [];
  let lineCount = 0;

  // Build DOM
  container.innerHTML = '';
  container.style.cssText = `
    display:flex;flex-direction:column;background:#0a0a14;
    font-family:'Courier New',monospace;font-size:12px;height:100%;
    color:#abb2bf;overflow:hidden;
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    padding:4px 10px;background:#111120;border-bottom:1px solid #1a1a2a;
    font-size:10px;color:#44ff88;display:flex;align-items:center;gap:8px;
    flex-shrink:0;
  `;
  header.innerHTML = `<span>TERMINAL</span><span style="color:#556;margin-left:auto">JS Console</span>`;

  const output = document.createElement('div');
  output.style.cssText = `
    flex:1;overflow-y:auto;padding:8px;white-space:pre-wrap;word-break:break-all;
    line-height:1.5;
  `;

  const inputRow = document.createElement('div');
  inputRow.style.cssText = `
    display:flex;align-items:center;padding:4px 8px;border-top:1px solid #1a1a2a;
    background:#0d0d18;flex-shrink:0;
  `;

  const prompt = document.createElement('span');
  prompt.style.cssText = 'color:#44ff88;margin-right:6px;font-size:12px;user-select:none';
  prompt.textContent = '>';

  const input = document.createElement('input');
  input.type = 'text';
  input.style.cssText = `
    flex:1;background:transparent;border:none;outline:none;color:#abb2bf;
    font-family:inherit;font-size:12px;caret-color:#528bff;
  `;
  input.placeholder = 'Type JavaScript or :help';
  input.spellcheck = false;

  inputRow.appendChild(prompt);
  inputRow.appendChild(input);
  container.appendChild(header);
  container.appendChild(output);
  container.appendChild(inputRow);

  // ─── Output helpers ───
  function writeLine(text, color = '#abb2bf', prefix = '') {
    lineCount++;
    const div = document.createElement('div');
    div.style.cssText = `color:${color};padding:1px 0;font-size:12px`;
    if (prefix) {
      div.innerHTML = `<span style="color:#556;margin-right:4px">${escHtml(prefix)}</span>${escHtml(String(text))}`;
    } else {
      div.textContent = String(text);
    }
    output.appendChild(div);
    output.scrollTop = output.scrollHeight;
    return div;
  }

  function writeHTML(html) {
    const div = document.createElement('div');
    div.style.cssText = 'padding:1px 0;font-size:12px';
    div.innerHTML = html;
    output.appendChild(div);
    output.scrollTop = output.scrollHeight;
  }

  function writeError(text) { writeLine(text, '#e06c75', 'ERR'); }
  function writeInfo(text)  { writeLine(text, '#61afef', 'INF'); }
  function writeWarn(text)  { writeLine(text, '#d19a66', 'WRN'); }
  function writeOk(text)    { writeLine(text, '#98c379', ' OK'); }

  // ─── Console capture ───
  function createSandboxConsole() {
    return {
      log:   (...args) => writeLine(args.map(formatValue).join(' '), '#abb2bf', 'LOG'),
      error: (...args) => writeError(args.map(formatValue).join(' ')),
      warn:  (...args) => writeWarn(args.map(formatValue).join(' ')),
      info:  (...args) => writeInfo(args.map(formatValue).join(' ')),
      table: (data) => {
        if (Array.isArray(data)) {
          writeLine(JSON.stringify(data, null, 2), '#61afef', 'TBL');
        } else if (typeof data === 'object') {
          writeLine(JSON.stringify(data, null, 2), '#61afef', 'TBL');
        }
      },
      clear: () => { output.innerHTML = ''; lineCount = 0; },
      time:  (label = 'default') => { createSandboxConsole._timers = createSandboxConsole._timers || {}; createSandboxConsole._timers[label] = performance.now(); },
      timeEnd: (label = 'default') => {
        const timers = createSandboxConsole._timers || {};
        if (timers[label]) {
          const elapsed = (performance.now() - timers[label]).toFixed(2);
          writeInfo(`${label}: ${elapsed}ms`);
          delete timers[label];
        }
      }
    };
  }

  function formatValue(v) {
    if (v === null) return 'null';
    if (v === undefined) return 'undefined';
    if (typeof v === 'object') {
      try { return JSON.stringify(v, null, 2); }
      catch { return String(v); }
    }
    return String(v);
  }

  // ─── Built-in commands ───
  const COMMANDS = {
    ':help': () => {
      writeHTML(`
        <div style="color:#61afef">Available commands:</div>
        <div style="color:#abb2bf;padding-left:12px">
          <div><span style="color:#c678dd">:help</span> — show this help</div>
          <div><span style="color:#c678dd">:clear</span> — clear terminal</div>
          <div><span style="color:#c678dd">:files</span> — list project files</div>
          <div><span style="color:#c678dd">:cat /path</span> — show file contents</div>
          <div><span style="color:#c678dd">:eval /path</span> — execute a .js file</div>
          <div><span style="color:#c678dd">:status</span> — show repo status</div>
          <div><span style="color:#c678dd">:history</span> — show command history</div>
          <div><span style="color:#c678dd">:bench expr</span> — benchmark an expression</div>
          <div style="color:#556;margin-top:4px">Or type any JavaScript expression to evaluate it.</div>
        </div>
      `);
    },

    ':clear': () => {
      output.innerHTML = '';
      lineCount = 0;
    },

    ':files': () => {
      if (!getFiles) { writeError('No file system connected'); return; }
      const allFiles = getFiles();
      const paths = Object.keys(allFiles);
      if (paths.length === 0) { writeInfo('No files in project'); return; }
      for (const p of paths.sort()) {
        const f = allFiles[p];
        const size = f.content ? f.content.length : 0;
        writeLine(`  ${p}  (${size}B, ${f.type || 'text'})`, '#abb2bf');
      }
      writeOk(`${paths.length} file(s)`);
    },

    ':status': () => {
      if (!getRepoState) { writeError('No repo connected'); return; }
      const state = getRepoState();
      writeInfo(`Repo: ${state.name} | Branch: ${state.branch}`);
      writeInfo(`Files: ${state.fileCount} | Commits: ${state.commitCount}`);
      if (state.staged.length > 0) {
        writeWarn(`Staged: ${state.staged.join(', ')}`);
      }
    },

    ':history': () => {
      if (history.length === 0) { writeInfo('No command history'); return; }
      history.forEach((cmd, i) => {
        writeLine(`  ${i + 1}. ${cmd}`, '#556');
      });
    },
  };

  // ─── Execute ───
  async function execute(cmd) {
    cmd = cmd.trim();
    if (!cmd) return;

    history.push(cmd);
    historyIndex = history.length;

    // Echo the command
    writeLine(cmd, '#c678dd', ' > ');

    // Built-in commands
    if (cmd.startsWith(':')) {
      const parts = cmd.split(/\s+/);
      const base = parts[0];
      const arg = parts.slice(1).join(' ');

      if (COMMANDS[base]) {
        COMMANDS[base]();
        return;
      }

      if (base === ':cat') {
        if (!getFiles || !arg) { writeError('Usage: :cat /path'); return; }
        const allFiles = getFiles();
        const f = allFiles[arg] || allFiles['/' + arg];
        if (!f) { writeError(`File not found: ${arg}`); return; }
        writeLine(f.content, '#abb2bf');
        return;
      }

      if (base === ':eval') {
        if (!getFiles || !arg) { writeError('Usage: :eval /path.js'); return; }
        const allFiles = getFiles();
        const f = allFiles[arg] || allFiles['/' + arg];
        if (!f) { writeError(`File not found: ${arg}`); return; }
        await executeJS(f.content);
        return;
      }

      if (base === ':bench') {
        if (!arg) { writeError('Usage: :bench <expression>'); return; }
        const iterations = 10000;
        const start = performance.now();
        for (let i = 0; i < iterations; i++) {
          try { new Function('"use strict"; return (' + arg + ')')(); } catch { break; }
        }
        const elapsed = performance.now() - start;
        writeOk(`${iterations} iterations in ${elapsed.toFixed(2)}ms (${(elapsed / iterations * 1000).toFixed(2)}us/op)`);
        return;
      }

      writeError(`Unknown command: ${base}. Type :help`);
      return;
    }

    // External command hook
    if (onCommand) {
      const handled = onCommand(cmd);
      if (handled) return;
    }

    // JavaScript evaluation
    await executeJS(cmd);
  }

  async function executeJS(code) {
    const sandboxConsole = createSandboxConsole();
    const t0 = performance.now();

    try {
      // Create sandboxed function with captured console
      const fn = new Function('console', '"use strict";\n' + code);
      const result = fn(sandboxConsole);

      // Handle promises
      let resolved = result;
      if (result instanceof Promise) {
        writeInfo('Awaiting promise...');
        resolved = await result;
      }

      const elapsed = (performance.now() - t0).toFixed(1);

      if (resolved !== undefined) {
        const formatted = formatValue(resolved);
        writeLine(formatted, '#98c379', ' ← ');
      }
      writeLine(`${elapsed}ms`, '#334', '  T');
    } catch (e) {
      writeError(e.message);
      if (e.stack) {
        const stackLines = e.stack.split('\n').slice(1, 3);
        for (const line of stackLines) {
          writeLine(line.trim(), '#5c6370', '   ');
        }
      }
    }
  }

  // ─── Input handling ───
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = input.value;
      input.value = '';
      execute(cmd);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex > 0) {
        historyIndex--;
        input.value = history[historyIndex] || '';
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        historyIndex++;
        input.value = history[historyIndex] || '';
      } else {
        historyIndex = history.length;
        input.value = '';
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      output.innerHTML = '';
      lineCount = 0;
    }
  });

  // Welcome message
  writeHTML(`<div style="color:#44ff88">WebLLM Sandbox Terminal v1.0</div>`);
  writeLine('Type JavaScript or :help for commands', '#556');
  writeLine('', '#556');

  return {
    execute,
    writeLine,
    writeError,
    writeInfo,
    writeOk,
    writeHTML,
    clear() { output.innerHTML = ''; lineCount = 0; },
    focus() { input.focus(); },
    getHistory() { return [...history]; },
    getElement() { return container; },
    destroy() { container.innerHTML = ''; }
  };
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
