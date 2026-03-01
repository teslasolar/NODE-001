/**
 * MCP Tools Engine — In-Browser Virtual Filesystem + Git + Tool Execution
 *
 * Provides a complete virtual repo (files, commits, branches, diffs)
 * that lives entirely in memory. Tool calls from the LLM are parsed
 * and executed against this virtual FS, enabling a full code-builder
 * loop without any server.
 */

// ═══════════════════════════════════════════════════════════════════
// VIRTUAL FILESYSTEM
// ═══════════════════════════════════════════════════════════════════

let repoName = 'untitled';
let currentBranch = 'main';

// files: Map<path, { content, created, modified, type }>
const files = new Map();
// commits: Array<{ id, message, timestamp, snapshot }>
const commits = [];
// staging: Set<path> of modified files since last commit
const staging = new Set();

function detectType(path) {
  const ext = path.split('.').pop().toLowerCase();
  const map = {
    html: 'html', htm: 'html', css: 'css', js: 'javascript', mjs: 'javascript',
    ts: 'typescript', json: 'json', md: 'markdown', txt: 'text',
    py: 'python', rs: 'rust', go: 'go', svg: 'svg', xml: 'xml'
  };
  return map[ext] || 'text';
}

function normPath(p) {
  p = p.replace(/\\/g, '/');
  if (!p.startsWith('/')) p = '/' + p;
  return p;
}

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

// ═══════════════════════════════════════════════════════════════════
// REPO OPERATIONS
// ═══════════════════════════════════════════════════════════════════

export function initRepo(name = 'untitled') {
  repoName = name;
  currentBranch = 'main';
  files.clear();
  commits.length = 0;
  staging.clear();
  // Initial commit
  commits.push({
    id: genId(),
    message: 'Initial commit',
    timestamp: Date.now(),
    snapshot: new Map()
  });
  return { ok: true, name: repoName };
}

export function getRepoState() {
  return {
    name: repoName,
    branch: currentBranch,
    fileCount: files.size,
    files: [...files.keys()],
    commitCount: commits.length,
    staged: [...staging]
  };
}

// ═══════════════════════════════════════════════════════════════════
// FILE OPERATIONS
// ═══════════════════════════════════════════════════════════════════

export function createFile(path, content = '') {
  path = normPath(path);
  if (files.has(path)) {
    return { ok: false, error: `File already exists: ${path}. Use edit_file to modify.` };
  }
  const now = Date.now();
  files.set(path, {
    content: String(content),
    created: now,
    modified: now,
    type: detectType(path)
  });
  staging.add(path);
  return { ok: true, path, size: content.length, type: detectType(path) };
}

export function editFile(path, content) {
  path = normPath(path);
  const f = files.get(path);
  if (!f) {
    // Auto-create if it doesn't exist (common LLM behavior)
    return createFile(path, content);
  }
  f.content = String(content);
  f.modified = Date.now();
  staging.add(path);
  return { ok: true, path, size: content.length };
}

export function patchFile(path, search, replace) {
  path = normPath(path);
  const f = files.get(path);
  if (!f) return { ok: false, error: `File not found: ${path}` };
  if (!f.content.includes(search)) {
    return { ok: false, error: `Search string not found in ${path}` };
  }
  f.content = f.content.replace(search, replace);
  f.modified = Date.now();
  staging.add(path);
  return { ok: true, path, size: f.content.length };
}

export function readFile(path) {
  path = normPath(path);
  const f = files.get(path);
  if (!f) return { ok: false, error: `File not found: ${path}` };
  return { ok: true, path, content: f.content, size: f.content.length, type: f.type };
}

export function deleteFile(path) {
  path = normPath(path);
  if (!files.has(path)) return { ok: false, error: `File not found: ${path}` };
  files.delete(path);
  staging.add(path);
  return { ok: true, path, deleted: true };
}

export function listFiles(dir = '/') {
  dir = normPath(dir);
  const result = [];
  for (const [path, f] of files) {
    if (dir === '/' || path.startsWith(dir)) {
      result.push({
        path,
        size: f.content.length,
        type: f.type,
        modified: f.modified
      });
    }
  }
  result.sort((a, b) => a.path.localeCompare(b.path));
  return { ok: true, files: result, count: result.length };
}

export function searchFiles(query) {
  const results = [];
  const lower = query.toLowerCase();
  for (const [path, f] of files) {
    const lines = f.content.split('\n');
    const matches = [];
    lines.forEach((line, i) => {
      if (line.toLowerCase().includes(lower)) {
        matches.push({ line: i + 1, text: line.trim().slice(0, 120) });
      }
    });
    if (matches.length > 0 || path.toLowerCase().includes(lower)) {
      results.push({ path, matches, matchCount: matches.length });
    }
  }
  return { ok: true, results, count: results.length, query };
}

export function getAllFiles() {
  const result = {};
  for (const [path, f] of files) {
    result[path] = { content: f.content, type: f.type, size: f.content.length };
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════
// GIT OPERATIONS
// ═══════════════════════════════════════════════════════════════════

export function commitChanges(message) {
  const snapshot = new Map();
  for (const [p, f] of files) {
    snapshot.set(p, { ...f, content: f.content });
  }
  const commit = {
    id: genId(),
    message: String(message),
    timestamp: Date.now(),
    snapshot,
    filesChanged: [...staging]
  };
  commits.push(commit);
  staging.clear();
  return { ok: true, id: commit.id, message: commit.message, filesChanged: commit.filesChanged.length };
}

export function getLog(limit = 20) {
  const slice = commits.slice(-limit).reverse();
  return {
    ok: true,
    commits: slice.map(c => ({
      id: c.id,
      message: c.message,
      timestamp: c.timestamp,
      date: new Date(c.timestamp).toLocaleString(),
      filesChanged: c.filesChanged ? c.filesChanged.length : 0
    }))
  };
}

export function getDiff() {
  if (commits.length === 0) return { ok: true, changes: [], summary: 'No commits yet' };
  const lastSnapshot = commits[commits.length - 1].snapshot;
  const changes = [];
  // Files added or modified
  for (const [path, f] of files) {
    const prev = lastSnapshot.get(path);
    if (!prev) {
      changes.push({ path, status: 'added', lines: f.content.split('\n').length });
    } else if (prev.content !== f.content) {
      changes.push({ path, status: 'modified' });
    }
  }
  // Files deleted
  for (const path of lastSnapshot.keys()) {
    if (!files.has(path)) {
      changes.push({ path, status: 'deleted' });
    }
  }
  return { ok: true, changes, summary: `${changes.length} file(s) changed` };
}

export function checkout(commitId) {
  const commit = commits.find(c => c.id === commitId);
  if (!commit) return { ok: false, error: `Commit not found: ${commitId}` };
  files.clear();
  for (const [p, f] of commit.snapshot) {
    files.set(p, { ...f, content: f.content });
  }
  staging.clear();
  return { ok: true, id: commit.id, message: commit.message, fileCount: files.size };
}

// ═══════════════════════════════════════════════════════════════════
// PREVIEW
// ═══════════════════════════════════════════════════════════════════

export function getPreviewableFiles() {
  const result = [];
  for (const [path, f] of files) {
    if (f.type === 'html') result.push(path);
  }
  return { ok: true, files: result };
}

export function getPreviewHTML(path) {
  path = normPath(path);
  const f = files.get(path);
  if (!f) return { ok: false, error: `File not found: ${path}` };
  if (f.type !== 'html') return { ok: false, error: `Not an HTML file: ${path}` };

  let html = f.content;

  // Resolve relative <link href="..."> and <script src="..."> by inlining
  // CSS files
  html = html.replace(/<link\s+[^>]*href=["']([^"']+\.css)["'][^>]*>/gi, (match, href) => {
    const cssPath = resolveRelativePath(path, href);
    const css = files.get(cssPath);
    if (css) return `<style>/* ${href} */\n${css.content}\n</style>`;
    return match;
  });

  // JS files (local only, skip CDN)
  html = html.replace(/<script\s+[^>]*src=["'](?!https?:\/\/)([^"']+\.m?js)["'][^>]*><\/script>/gi, (match, src) => {
    const jsPath = resolveRelativePath(path, src);
    const js = files.get(jsPath);
    if (js) return `<script>/* ${src} */\n${js.content}\n</script>`;
    return match;
  });

  return { ok: true, html, path };
}

function resolveRelativePath(basePath, rel) {
  if (rel.startsWith('/')) return rel;
  const parts = basePath.split('/');
  parts.pop(); // remove filename
  const relParts = rel.split('/');
  for (const rp of relParts) {
    if (rp === '..') parts.pop();
    else if (rp !== '.') parts.push(rp);
  }
  return parts.join('/') || '/';
}

// ═══════════════════════════════════════════════════════════════════
// TOOL CALL PARSER
// Parses tool calls from LLM output in multiple formats:
//   - ```create /path\ncontent\n```
//   - ```edit /path\ncontent\n```
//   - ```delete /path```
//   - ```commit message```
//   - ```list```
//   - JSON tool_call blocks
//   - <tool_call> XML blocks
// ═══════════════════════════════════════════════════════════════════

export function parseToolCalls(text) {
  const calls = [];

  // Format 1: Code-fence tool calls  ```create /path\ncontent\n```
  const fenceRe = /```\s*(create|create_file|edit|edit_file|delete|delete_file|commit|list|search|preview|read|patch)\s*(\/[\w\-\.\/]*)?[ \t]*\n([\s\S]*?)```/gi;
  let m;
  while ((m = fenceRe.exec(text)) !== null) {
    let action = m[1].toLowerCase().replace(/_file$/, '');
    const pathArg = m[2] ? m[2].trim() : '';
    const body = m[3] || '';

    if (action === 'create') {
      calls.push({ name: 'create_file', args: { path: pathArg, content: body } });
    } else if (action === 'edit') {
      calls.push({ name: 'edit_file', args: { path: pathArg, content: body } });
    } else if (action === 'delete') {
      calls.push({ name: 'delete_file', args: { path: pathArg || body.trim() } });
    } else if (action === 'commit') {
      calls.push({ name: 'commit', args: { message: (pathArg + ' ' + body).trim() || 'Auto commit' } });
    } else if (action === 'list') {
      calls.push({ name: 'list_files', args: { path: pathArg || '/' } });
    } else if (action === 'search') {
      calls.push({ name: 'search_files', args: { query: body.trim() || pathArg } });
    } else if (action === 'preview') {
      calls.push({ name: 'preview', args: { path: pathArg } });
    } else if (action === 'read') {
      calls.push({ name: 'read_file', args: { path: pathArg } });
    } else if (action === 'patch') {
      // Patch format: first line is search, separated by ----, rest is replace
      const parts = body.split(/^-{3,}$/m);
      if (parts.length >= 2) {
        calls.push({ name: 'patch_file', args: { path: pathArg, search: parts[0].trimEnd(), replace: parts[1].trimStart() } });
      }
    }
  }

  // Format 2: JSON tool_call  {"name": "...", "arguments": {...}}
  const jsonRe = /\{[^{}]*"name"\s*:\s*"([^"]+)"[^{}]*"arguments"\s*:\s*(\{[^}]*\})/g;
  while ((m = jsonRe.exec(text)) !== null) {
    try {
      const args = JSON.parse(m[2]);
      calls.push({ name: m[1], args });
    } catch (e) { /* skip malformed JSON */ }
  }

  // Format 3: <tool_call> XML  — common from smaller models
  const xmlRe = /<tool_call>\s*\{([\s\S]*?)\}\s*<\/tool_call>/gi;
  while ((m = xmlRe.exec(text)) !== null) {
    try {
      const obj = JSON.parse('{' + m[1] + '}');
      if (obj.name) {
        calls.push({ name: obj.name, args: obj.arguments || obj.args || {} });
      }
    } catch (e) { /* skip */ }
  }

  // Format 4: Fuzzy <path>/content XML from small models
  const fuzzyCreateRe = /<path>([\s\S]*?)<\/path>\s*<content>([\s\S]*?)<\/content>/gi;
  while ((m = fuzzyCreateRe.exec(text)) !== null) {
    // Don't double-count if already parsed by fence
    const p = normPath(m[1].trim());
    if (!calls.some(c => c.args?.path === p)) {
      calls.push({ name: 'create_file', args: { path: p, content: m[2] } });
    }
  }

  return calls;
}

// ═══════════════════════════════════════════════════════════════════
// TOOL EXECUTOR
// ═══════════════════════════════════════════════════════════════════

export function executeTool(name, args) {
  switch (name) {
    case 'create_file':
      return createFile(args.path, args.content || '');
    case 'edit_file':
      return editFile(args.path, args.content || '');
    case 'patch_file':
      return patchFile(args.path, args.search || '', args.replace || '');
    case 'read_file':
      return readFile(args.path);
    case 'delete_file':
      return deleteFile(args.path);
    case 'list_files':
      return listFiles(args.path || '/');
    case 'search_files':
      return searchFiles(args.query || '');
    case 'commit':
      return commitChanges(args.message || 'Auto commit');
    case 'get_log':
      return getLog(args.limit || 10);
    case 'get_diff':
      return getDiff();
    case 'checkout':
      return checkout(args.id);
    case 'preview':
      return getPreviewHTML(args.path);
    default:
      return { ok: false, error: `Unknown tool: ${name}` };
  }
}

// ═══════════════════════════════════════════════════════════════════
// SYSTEM PROMPT BUILDER
// Generates the tool-use instructions for the LLM
// ═══════════════════════════════════════════════════════════════════

export function buildToolSystemPrompt() {
  return `You are an AI code builder inside a browser-based sandbox. You create, edit, and manage files in a virtual repo.

## AVAILABLE TOOLS
Use code fences with the tool name to execute actions:

### Create a file:
\`\`\`create /path/to/file.ext
file content here
\`\`\`

### Edit/overwrite a file:
\`\`\`edit /path/to/file.ext
new full content
\`\`\`

### Delete a file:
\`\`\`delete /path/to/file.ext
\`\`\`

### Commit changes:
\`\`\`commit descriptive commit message
\`\`\`

### List files:
\`\`\`list
\`\`\`

### Search files:
\`\`\`search query text
\`\`\`

## RULES
1. Always use \`\`\`create for NEW files, \`\`\`edit to REPLACE existing files.
2. Paths must start with / (e.g. /index.html, /styles/main.css, /app.js).
3. For HTML files, write COMPLETE valid HTML including <!DOCTYPE html>.
4. CSS can be inline or in separate .css files linked via <link>.
5. JS can be inline or in separate .js files linked via <script>.
6. After creating/editing files, commit your work.
7. You can create multi-file projects — HTML + CSS + JS.
8. Keep responses concise. Focus on building, not explaining.
9. If the user asks to build something, DO IT — create the files immediately.
10. Preview auto-activates for HTML files after creation.`;
}
