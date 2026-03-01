/**
 * File Templates Module — Project scaffolding & boilerplate
 *
 * Provides ready-made project templates that the LLM or user
 * can instantiate with a single call. Each template returns
 * a map of { path: content } pairs.
 */

/**
 * Get list of available templates
 */
export function getTemplateList() {
  return [
    { id: 'html-basic',      name: 'Basic HTML Page',       desc: 'Single HTML file with CSS reset' },
    { id: 'html-css-js',     name: 'HTML + CSS + JS',       desc: '3-file web project scaffold' },
    { id: 'dashboard',       name: 'Dashboard Layout',      desc: 'Grid-based analytics dashboard' },
    { id: 'canvas-game',     name: 'Canvas Game Starter',   desc: 'HTML5 Canvas game loop boilerplate' },
    { id: 'api-client',      name: 'API Client Page',       desc: 'Fetch-based REST API tester' },
    { id: 'markdown-viewer',  name: 'Markdown Viewer',      desc: 'Live markdown editor + preview' },
    { id: 'three-scene',     name: 'Three.js Scene',        desc: '3D scene with orbit controls' },
    { id: 'landing-page',    name: 'Landing Page',          desc: 'Modern single-page marketing site' },
  ];
}

/**
 * Generate a project from a template
 * @param {string} templateId
 * @param {object} vars - { projectName, author, ... }
 * @returns {{ files: Object<string,string>, description: string }}
 */
export function generateTemplate(templateId, vars = {}) {
  const name = vars.projectName || 'my-project';
  const gen = TEMPLATES[templateId];
  if (!gen) {
    return { files: {}, description: `Unknown template: ${templateId}`, error: true };
  }
  return gen(name, vars);
}

// ─── Template generators ───

const TEMPLATES = {

  'html-basic': (name) => ({
    description: `Basic HTML page: ${name}`,
    files: {
      '/index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}</title>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      line-height: 1.6; color: #333; max-width: 800px;
      margin: 0 auto; padding: 2rem;
    }
    h1 { margin-bottom: 1rem; color: #1a1a2e; }
  </style>
</head>
<body>
  <h1>${name}</h1>
  <p>Edit this page to get started.</p>
</body>
</html>`
    }
  }),

  'html-css-js': (name) => ({
    description: `3-file web project: ${name}`,
    files: {
      '/index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header>
    <h1>${name}</h1>
    <nav><a href="#">Home</a> <a href="#">About</a> <a href="#">Contact</a></nav>
  </header>
  <main>
    <section id="content">
      <p>Welcome to <strong>${name}</strong>. Edit the files to build your project.</p>
      <button id="action-btn">Click Me</button>
      <div id="output"></div>
    </section>
  </main>
  <footer><p>&copy; ${new Date().getFullYear()} ${name}</p></footer>
  <script src="app.js"><\/script>
</body>
</html>`,

      '/style.css': `/* ${name} Styles */
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --primary: #2563eb;
  --bg: #f8fafc;
  --text: #1e293b;
  --border: #e2e8f0;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.6;
  color: var(--text);
  background: var(--bg);
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  border-bottom: 1px solid var(--border);
}

header h1 { font-size: 1.25rem; }

nav a {
  color: var(--primary);
  text-decoration: none;
  margin-left: 1.5rem;
  font-size: 0.9rem;
}
nav a:hover { text-decoration: underline; }

main { padding: 2rem; max-width: 960px; margin: 0 auto; }

button {
  background: var(--primary);
  color: #fff;
  border: none;
  padding: 0.5rem 1.5rem;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  margin-top: 1rem;
}
button:hover { opacity: 0.9; }

#output {
  margin-top: 1rem;
  padding: 1rem;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 6px;
  min-height: 60px;
}

footer {
  text-align: center;
  padding: 1rem;
  color: #94a3b8;
  font-size: 0.8rem;
  border-top: 1px solid var(--border);
  margin-top: 2rem;
}`,

      '/app.js': `// ${name} — Main Application
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('action-btn');
  const output = document.getElementById('output');
  let count = 0;

  btn.addEventListener('click', () => {
    count++;
    output.innerHTML = '<p>Button clicked <strong>' + count + '</strong> time(s)!</p>';
  });

  console.log('${name} loaded successfully');
});`
    }
  }),

  'dashboard': (name) => ({
    description: `Dashboard layout: ${name}`,
    files: {
      '/index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root { --bg: #0f172a; --card: #1e293b; --border: #334155; --accent: #3b82f6; --text: #e2e8f0; --dim: #64748b; }
    body { background: var(--bg); color: var(--text); font-family: system-ui, sans-serif; min-height: 100vh; }
    .topbar { display: flex; align-items: center; padding: 12px 20px; border-bottom: 1px solid var(--border); gap: 16px; }
    .topbar h1 { font-size: 16px; color: var(--accent); }
    .topbar .status { margin-left: auto; font-size: 12px; color: var(--dim); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; padding: 20px; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 20px; }
    .card h3 { font-size: 12px; color: var(--dim); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .card .value { font-size: 28px; font-weight: bold; color: var(--text); }
    .card .change { font-size: 12px; margin-top: 4px; }
    .card .change.up { color: #22c55e; }
    .card .change.down { color: #ef4444; }
    .chart-area { background: var(--card); border: 1px solid var(--border); border-radius: 8px; margin: 0 20px 20px; padding: 20px; }
    .chart-area h3 { font-size: 13px; color: var(--dim); margin-bottom: 12px; }
    canvas { width: 100%; height: 200px; }
  </style>
</head>
<body>
  <div class="topbar">
    <h1>${name}</h1>
    <span class="status" id="clock"></span>
  </div>
  <div class="grid">
    <div class="card"><h3>Users</h3><div class="value" id="v1">0</div><div class="change up">+12.5%</div></div>
    <div class="card"><h3>Revenue</h3><div class="value" id="v2">$0</div><div class="change up">+8.3%</div></div>
    <div class="card"><h3>Orders</h3><div class="value" id="v3">0</div><div class="change down">-2.1%</div></div>
    <div class="card"><h3>Conversion</h3><div class="value" id="v4">0%</div><div class="change up">+0.5%</div></div>
  </div>
  <div class="chart-area">
    <h3>Activity (Last 24h)</h3>
    <canvas id="chart"></canvas>
  </div>
  <script>
    // Simulated data
    document.getElementById('v1').textContent = (Math.random()*10000|0).toLocaleString();
    document.getElementById('v2').textContent = '$'+(Math.random()*100000|0).toLocaleString();
    document.getElementById('v3').textContent = (Math.random()*5000|0).toLocaleString();
    document.getElementById('v4').textContent = (Math.random()*10).toFixed(1)+'%';
    // Clock
    setInterval(()=>{ document.getElementById('clock').textContent = new Date().toLocaleTimeString(); }, 1000);
    // Mini chart
    const canvas = document.getElementById('chart');
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = 400;
    const data = Array.from({length: 48}, () => Math.random() * 80 + 20);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * canvas.width;
      const y = canvas.height - (v / 100) * canvas.height;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    // Fill below
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.closePath();
    ctx.fillStyle = 'rgba(59,130,246,0.1)';
    ctx.fill();
  <\/script>
</body>
</html>`
    }
  }),

  'canvas-game': (name) => ({
    description: `Canvas game starter: ${name}`,
    files: {
      '/index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}</title>
  <style>
    * { margin: 0; padding: 0; }
    body { background: #111; display: flex; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
    canvas { border: 2px solid #333; border-radius: 4px; image-rendering: pixelated; }
    #hud { position: fixed; top: 10px; left: 10px; color: #0f0; font-family: monospace; font-size: 14px; }
  </style>
</head>
<body>
  <div id="hud">Score: <span id="score">0</span> | FPS: <span id="fps">0</span></div>
  <canvas id="game" width="640" height="480"></canvas>
  <script>
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const $score = document.getElementById('score');
    const $fps = document.getElementById('fps');

    // Game state
    const player = { x: 320, y: 400, w: 32, h: 32, speed: 5, color: '#0af' };
    const stars = Array.from({length: 50}, () => ({
      x: Math.random() * 640, y: Math.random() * 480,
      s: Math.random() * 2 + 0.5, b: Math.random()
    }));
    let score = 0;
    const keys = {};

    document.addEventListener('keydown', e => keys[e.key] = true);
    document.addEventListener('keyup', e => keys[e.key] = false);

    let lastTime = 0, frameCount = 0, fpsTime = 0;

    function gameLoop(time) {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      // FPS counter
      frameCount++;
      if (time - fpsTime > 1000) { $fps.textContent = frameCount; frameCount = 0; fpsTime = time; }

      // Input
      if (keys['ArrowLeft'] || keys['a'])  player.x -= player.speed;
      if (keys['ArrowRight'] || keys['d']) player.x += player.speed;
      if (keys['ArrowUp'] || keys['w'])    player.y -= player.speed;
      if (keys['ArrowDown'] || keys['s'])  player.y += player.speed;
      player.x = Math.max(0, Math.min(640 - player.w, player.x));
      player.y = Math.max(0, Math.min(480 - player.h, player.y));

      // Clear
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, 640, 480);

      // Stars
      for (const s of stars) {
        s.y += s.s;
        if (s.y > 480) { s.y = 0; s.x = Math.random() * 640; }
        ctx.fillStyle = \`rgba(255,255,255,\${0.3 + s.b * 0.7})\`;
        ctx.fillRect(s.x, s.y, 2, 2);
      }

      // Player
      ctx.fillStyle = player.color;
      ctx.fillRect(player.x, player.y, player.w, player.h);
      ctx.strokeStyle = '#fff';
      ctx.strokeRect(player.x, player.y, player.w, player.h);

      requestAnimationFrame(gameLoop);
    }

    requestAnimationFrame(gameLoop);
  <\/script>
</body>
</html>`
    }
  }),

  'api-client': (name) => ({
    description: `API client page: ${name}`,
    files: {
      '/index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} — API Tester</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root { --bg: #0a0a18; --card: #12122a; --border: #252540; --accent: #6366f1; --text: #dde; --dim: #556; }
    body { background: var(--bg); color: var(--text); font-family: 'Courier New', monospace; padding: 20px; }
    h1 { color: var(--accent); font-size: 18px; margin-bottom: 16px; }
    .row { display: flex; gap: 8px; margin-bottom: 12px; }
    select, input, textarea { background: var(--card); color: var(--text); border: 1px solid var(--border); padding: 8px; border-radius: 4px; font-family: inherit; font-size: 13px; }
    select { width: 100px; }
    input { flex: 1; }
    textarea { width: 100%; height: 120px; resize: vertical; }
    button { background: var(--accent); color: #fff; border: none; padding: 8px 20px; border-radius: 4px; cursor: pointer; font-family: inherit; }
    button:hover { opacity: 0.9; }
    .response { background: var(--card); border: 1px solid var(--border); border-radius: 6px; padding: 12px; margin-top: 12px; white-space: pre-wrap; font-size: 12px; max-height: 400px; overflow: auto; }
    .status { font-size: 12px; margin-top: 8px; }
    .status.ok { color: #4ade80; }
    .status.err { color: #f87171; }
    label { font-size: 11px; color: var(--dim); display: block; margin-bottom: 4px; }
  </style>
</head>
<body>
  <h1>${name}</h1>
  <div class="row">
    <select id="method">
      <option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option>
    </select>
    <input id="url" placeholder="https://jsonplaceholder.typicode.com/posts/1">
    <button onclick="sendRequest()">Send</button>
  </div>
  <label>Headers (JSON)</label>
  <textarea id="headers">{"Content-Type": "application/json"}</textarea>
  <label style="margin-top:8px">Body (JSON)</label>
  <textarea id="body" placeholder='{"key": "value"}'></textarea>
  <div class="status" id="status"></div>
  <div class="response" id="response">Response will appear here...</div>
  <script>
    async function sendRequest() {
      const method = document.getElementById('method').value;
      const url = document.getElementById('url').value;
      const $status = document.getElementById('status');
      const $response = document.getElementById('response');
      let headers = {};
      try { headers = JSON.parse(document.getElementById('headers').value || '{}'); } catch(e) {}
      const bodyText = document.getElementById('body').value;
      $status.textContent = 'Sending...';
      $status.className = 'status';
      try {
        const opts = { method, headers };
        if (method !== 'GET' && bodyText) opts.body = bodyText;
        const t0 = performance.now();
        const res = await fetch(url, opts);
        const elapsed = (performance.now() - t0).toFixed(0);
        const text = await res.text();
        let display = text;
        try { display = JSON.stringify(JSON.parse(text), null, 2); } catch(e) {}
        $status.textContent = \`\${res.status} \${res.statusText} — \${elapsed}ms — \${text.length} bytes\`;
        $status.className = 'status ' + (res.ok ? 'ok' : 'err');
        $response.textContent = display;
      } catch(e) {
        $status.textContent = 'Error: ' + e.message;
        $status.className = 'status err';
        $response.textContent = e.stack || e.message;
      }
    }
  <\/script>
</body>
</html>`
    }
  }),

  'markdown-viewer': (name) => ({
    description: `Markdown viewer: ${name}`,
    files: {
      '/index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} — Markdown</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { display: grid; grid-template-columns: 1fr 1fr; height: 100vh; font-family: system-ui, sans-serif; }
    .pane { display: flex; flex-direction: column; }
    .pane-header { padding: 8px 12px; font-size: 12px; font-weight: bold; border-bottom: 1px solid #e5e7eb; background: #f9fafb; }
    textarea { flex: 1; border: none; padding: 12px; font-family: 'Courier New', monospace; font-size: 13px; resize: none; outline: none; background: #fefefe; }
    #preview { flex: 1; padding: 16px 20px; overflow-y: auto; line-height: 1.7; color: #1f2937; }
    #preview h1, #preview h2, #preview h3 { margin: 1em 0 0.5em; color: #111827; }
    #preview h1 { font-size: 1.8em; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.3em; }
    #preview h2 { font-size: 1.4em; }
    #preview code { background: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
    #preview pre { background: #1f2937; color: #e5e7eb; padding: 12px; border-radius: 6px; overflow-x: auto; margin: 1em 0; }
    #preview pre code { background: none; padding: 0; color: inherit; }
    #preview blockquote { border-left: 3px solid #6366f1; padding-left: 12px; color: #6b7280; margin: 1em 0; }
    #preview ul, #preview ol { padding-left: 1.5em; margin: 0.5em 0; }
    #preview a { color: #6366f1; }
    #preview hr { border: none; border-top: 1px solid #e5e7eb; margin: 1.5em 0; }
  </style>
</head>
<body>
  <div class="pane" style="border-right:1px solid #e5e7eb">
    <div class="pane-header">Editor (Markdown)</div>
    <textarea id="editor"># ${name}

Write **markdown** here and see it rendered live.

## Features
- Bold with \\*\\*text\\*\\*
- *Italic* with \\*text\\*
- \\\`inline code\\\`
- [Links](https://example.com)

> Blockquotes work too!

\\\`\\\`\\\`
code blocks
are supported
\\\`\\\`\\\`

---
*Edit the left pane to update the preview.*</textarea>
  </div>
  <div class="pane">
    <div class="pane-header">Preview</div>
    <div id="preview"></div>
  </div>
  <script>
    const editor = document.getElementById('editor');
    const preview = document.getElementById('preview');
    function render() {
      let md = editor.value;
      // Simple markdown → HTML
      md = md.replace(/^### (.*$)/gm, '<h3>$1</h3>');
      md = md.replace(/^## (.*$)/gm, '<h2>$1</h2>');
      md = md.replace(/^# (.*$)/gm, '<h1>$1</h1>');
      md = md.replace(/\\\`\\\`\\\`([\\s\\S]*?)\\\`\\\`\\\`/g, '<pre><code>$1</code></pre>');
      md = md.replace(/\\\`([^\\\`]+)\\\`/g, '<code>$1</code>');
      md = md.replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>');
      md = md.replace(/\\*([^*]+)\\*/g, '<em>$1</em>');
      md = md.replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>');
      md = md.replace(/^- (.*$)/gm, '<li>$1</li>');
      md = md.replace(/(<li>.*<\\/li>)/s, '<ul>$1</ul>');
      md = md.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href="$2">$1</a>');
      md = md.replace(/^---$/gm, '<hr>');
      md = md.replace(/\\n/g, '<br>');
      preview.innerHTML = md;
    }
    editor.addEventListener('input', render);
    render();
  <\/script>
</body>
</html>`
    }
  }),

  'three-scene': (name) => ({
    description: `Three.js scene: ${name}`,
    files: {
      '/index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} — 3D Scene</title>
  <style>
    * { margin: 0; padding: 0; }
    body { overflow: hidden; background: #000; }
    canvas { display: block; }
    #info { position: fixed; top: 10px; left: 10px; color: #aaa; font-family: monospace; font-size: 12px; }
  </style>
</head>
<body>
  <div id="info">${name} — 3D Scene (scroll to zoom, drag to orbit)</div>
  <script type="module">
    import * as THREE from 'https://esm.sh/three@0.160.0';
    import { OrbitControls } from 'https://esm.sh/three@0.160.0/addons/controls/OrbitControls.js';

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    scene.fog = new THREE.FogExp2(0x0a0a1a, 0.08);

    const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
    camera.position.set(4, 3, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lights
    scene.add(new THREE.AmbientLight(0x404060, 0.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 8, 3);
    scene.add(dirLight);
    const pointLight = new THREE.PointLight(0x4488ff, 1, 20);
    pointLight.position.set(-3, 2, -2);
    scene.add(pointLight);

    // Grid
    scene.add(new THREE.GridHelper(10, 20, 0x222244, 0x111133));

    // Objects
    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x4488ff, roughness: 0.4, metalness: 0.6 })
    );
    cube.position.y = 0.5;
    scene.add(cube);

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.6, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0xff4488, roughness: 0.3, metalness: 0.7 })
    );
    sphere.position.set(2, 0.6, 1);
    scene.add(sphere);

    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.2, 16, 48),
      new THREE.MeshStandardMaterial({ color: 0x44ff88, roughness: 0.3, metalness: 0.5 })
    );
    torus.position.set(-1.5, 1, -1);
    scene.add(torus);

    // Animate
    function animate(time) {
      requestAnimationFrame(animate);
      const t = time * 0.001;
      cube.rotation.y = t * 0.5;
      cube.rotation.x = t * 0.3;
      sphere.position.y = 0.6 + Math.sin(t * 2) * 0.3;
      torus.rotation.x = t;
      torus.rotation.y = t * 0.7;
      pointLight.position.x = Math.sin(t) * 3;
      pointLight.position.z = Math.cos(t) * 3;
      controls.update();
      renderer.render(scene, camera);
    }
    animate(0);

    window.addEventListener('resize', () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });
  <\/script>
</body>
</html>`
    }
  }),

  'landing-page': (name) => ({
    description: `Landing page: ${name}`,
    files: {
      '/index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <nav><div class="container"><strong>${name}</strong><div class="nav-links"><a href="#features">Features</a><a href="#about">About</a><a href="#cta" class="btn-nav">Get Started</a></div></div></nav>
  <section class="hero"><div class="container">
    <h1>Build Something<br><span class="gradient-text">Amazing</span></h1>
    <p class="subtitle">A modern platform for creators, builders, and dreamers.</p>
    <div class="hero-btns"><a href="#cta" class="btn">Get Started Free</a><a href="#features" class="btn btn-outline">Learn More</a></div>
  </div></section>
  <section id="features" class="features"><div class="container">
    <h2>Features</h2>
    <div class="grid">
      <div class="feature-card"><div class="icon">&#9889;</div><h3>Lightning Fast</h3><p>Optimized for speed from the ground up.</p></div>
      <div class="feature-card"><div class="icon">&#9881;</div><h3>Customizable</h3><p>Make it yours with powerful configuration.</p></div>
      <div class="feature-card"><div class="icon">&#9733;</div><h3>Beautiful</h3><p>Gorgeous defaults that just work.</p></div>
    </div>
  </div></section>
  <section id="cta" class="cta"><div class="container">
    <h2>Ready to Start?</h2>
    <p>Join thousands of users building with ${name}.</p>
    <a href="#" class="btn btn-large">Sign Up Now</a>
  </div></section>
  <footer><p>&copy; ${new Date().getFullYear()} ${name}. All rights reserved.</p></footer>
</body>
</html>`,

      '/style.css': `/* ${name} Landing Page */
* { margin: 0; padding: 0; box-sizing: border-box; }
:root { --primary: #6366f1; --bg: #0f0f23; --card: #1a1a3e; --text: #e5e7eb; --dim: #9ca3af; }
body { background: var(--bg); color: var(--text); font-family: system-ui, -apple-system, sans-serif; }
.container { max-width: 960px; margin: 0 auto; padding: 0 20px; }

nav { display: flex; padding: 16px 20px; position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: rgba(15,15,35,0.9); backdrop-filter: blur(10px); border-bottom: 1px solid rgba(255,255,255,0.05); }
nav .container { display: flex; align-items: center; justify-content: space-between; width: 100%; }
nav strong { font-size: 16px; color: #fff; }
.nav-links { display: flex; gap: 24px; align-items: center; }
.nav-links a { color: var(--dim); text-decoration: none; font-size: 14px; }
.nav-links a:hover { color: #fff; }
.btn-nav { background: var(--primary); color: #fff !important; padding: 6px 16px; border-radius: 6px; }

.hero { padding: 160px 0 80px; text-align: center; }
.hero h1 { font-size: 3.5rem; line-height: 1.1; margin-bottom: 20px; }
.gradient-text { background: linear-gradient(135deg, #6366f1, #a855f7, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.subtitle { color: var(--dim); font-size: 1.2rem; max-width: 500px; margin: 0 auto 32px; }
.hero-btns { display: flex; gap: 12px; justify-content: center; }
.btn { display: inline-block; background: var(--primary); color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; transition: transform 0.2s, box-shadow 0.2s; }
.btn:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(99,102,241,0.3); }
.btn-outline { background: transparent; border: 1px solid rgba(255,255,255,0.15); }
.btn-large { padding: 16px 40px; font-size: 17px; }

.features { padding: 80px 0; }
.features h2 { text-align: center; font-size: 2rem; margin-bottom: 40px; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.feature-card { background: var(--card); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 28px; text-align: center; }
.feature-card .icon { font-size: 32px; margin-bottom: 12px; }
.feature-card h3 { margin-bottom: 8px; font-size: 16px; }
.feature-card p { color: var(--dim); font-size: 14px; line-height: 1.6; }

.cta { padding: 80px 0; text-align: center; background: linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.1)); border-top: 1px solid rgba(255,255,255,0.04); }
.cta h2 { font-size: 2rem; margin-bottom: 12px; }
.cta p { color: var(--dim); margin-bottom: 28px; }

footer { text-align: center; padding: 24px; color: #445; font-size: 13px; border-top: 1px solid rgba(255,255,255,0.04); }

@media(max-width: 640px) {
  .hero h1 { font-size: 2.2rem; }
  .grid { grid-template-columns: 1fr; }
}`
    }
  }),
};
