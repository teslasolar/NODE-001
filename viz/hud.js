/**
 * NODE-001 Garden of Eden · HUD (Heads-Up Display)
 *
 * Shield status bars, ISA-95 hierarchy, file inspector tooltip,
 * file detail panel, metrics readout, and shield mode controls.
 */

let currentHoverFlower = null;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function initHUD() {
  buildShieldPanel();
  buildISAPanel();
  setupInteraction();
  setupControls();
}

// ─── Shield Status Panel (right side) ──────────────────────────────────
function buildShieldPanel() {
  const panel = document.getElementById('shield-panel');
  let html = '<div class="panel-title">SHIELD STATUS</div>';

  RINGS.forEach((ring, i) => {
    html += `
      <div class="shield-row" title="${ring.desc}\nWEAKNESS: ${ring.weakness}">
        <span class="sh-id" style="color:${ring.color}">${ring.id}</span>
        <div class="sh-bar-wrap">
          <div class="sh-bar" id="sb${i}" style="background:${ring.color};width:50%"></div>
        </div>
        <span class="sh-val" id="sv${i}">50</span>
        <span class="sh-status" id="ss${i}" style="color:${ring.color}">◐</span>
      </div>`;
  });

  html += '<div class="bus-section"><div class="bus-title">BUS POWER</div>';
  BUSES.forEach((bus, i) => {
    html += `
      <div class="bus-row">
        <span class="bus-label" style="color:${bus.color}">BUS ${bus.id}</span>
        <div class="bus-bar-wrap">
          <div class="bus-bar" id="bb${i}" style="background:${bus.color};width:0%"></div>
        </div>
        <span class="bus-pct" id="bp${i}">0%</span>
      </div>`;
  });
  html += '</div>';

  panel.innerHTML = html;
}

// ─── ISA-95 Hierarchy Panel (left side) ────────────────────────────────
function buildISAPanel() {
  const panel = document.getElementById('isa-panel');
  let html = '<div class="panel-title">ISA-95 HIERARCHY</div>';

  ISA_LEVELS.forEach((level, i) => {
    html += `
      <div class="isa-level" id="isa-${i}" style="border-left-color:${level.color}" onclick="highlightISA(${i})">
        <div class="isa-name" style="color:${level.color}">${level.level} · ${level.name}</div>
        <div class="isa-desc">${level.desc}</div>
      </div>`;
  });

  // Pipeline stages below ISA
  html += '<div class="panel-title" style="margin-top:8px">PIPELINE</div>';
  PIPELINE.forEach(stage => {
    html += `
      <div class="pipeline-stage">
        <span class="ps-dot" style="background:${stage.color}"></span>
        <span class="ps-name">${stage.stage}</span>
        <span class="ps-ring">${stage.ring}</span>
      </div>`;
  });

  panel.innerHTML = html;
}

function highlightISA(i) {
  document.querySelectorAll('.isa-level').forEach(e => e.classList.remove('active'));
  document.getElementById(`isa-${i}`).classList.add('active');

  // Flash corresponding shield bars
  ISA_LEVELS[i].rings.forEach(rid => {
    const idx = RINGS.findIndex(r => r.id === rid);
    if (idx >= 0) {
      const el = document.getElementById(`sb${idx}`);
      el.style.boxShadow = `0 0 8px ${RINGS[idx].color}`;
      setTimeout(() => el.style.boxShadow = 'none', 600);
    }
  });
}

// ─── Tooltip + Click Interaction ───────────────────────────────────────
function setupInteraction() {
  const tooltip = document.getElementById('tooltip');
  const canvas = document.getElementById('canvas');

  canvas.addEventListener('mousemove', e => {
    if (isDragging) {
      tooltip.classList.remove('visible');
      return;
    }

    mouse.x = (e.clientX / innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    let hit = null;
    for (const flower of clickableFlowers) {
      const intersects = raycaster.intersectObject(flower.mesh, true);
      if (intersects.length > 0) {
        hit = flower;
        break;
      }
    }

    if (hit) {
      canvas.style.cursor = 'pointer';
      const d = hit.data;
      document.getElementById('tooltip-path').textContent = d.file.path;
      document.getElementById('tooltip-meta').innerHTML =
        `${d.file.size} bytes · <span style="color:${NODE_MODULES.find(m=>m.name===d.module)?.color||'#fff'}">${d.label}</span>`;
      tooltip.style.left = (e.clientX + 12) + 'px';
      tooltip.style.top = (e.clientY + 12) + 'px';
      tooltip.classList.add('visible');
      currentHoverFlower = hit;
    } else {
      canvas.style.cursor = 'default';
      tooltip.classList.remove('visible');
      currentHoverFlower = null;
    }
  });

  canvas.addEventListener('click', e => {
    if (isDragging) return;
    if (currentHoverFlower) {
      openFilePanel(currentHoverFlower.data);
    }
  });
}

function openFilePanel(data) {
  const panel = document.getElementById('file-panel');
  const file = data.file;
  const mod = NODE_MODULES.find(m => m.name === data.module);

  document.getElementById('file-title').textContent = file.path;
  document.getElementById('file-detail-meta').innerHTML = `
    <span>${file.size} B</span>
    <span>${file.name.split('.').pop().toUpperCase()}</span>
    <span style="color:${mod?.color || '#fff'}">${data.label}</span>`;

  // Map file to ring if applicable
  let ringInfo = '';
  if (data.module === 'rings') {
    const ringMatch = file.name.match(/R(\d)/);
    if (ringMatch) {
      const ring = RINGS[parseInt(ringMatch[1])];
      if (ring) {
        ringInfo = `<div class="file-ring-info" style="border-color:${ring.color}">
          <span style="color:${ring.color}">${ring.id} · ${ring.name}</span><br>
          <span class="file-ring-desc">${ring.desc}</span>
        </div>`;
      }
    }
  }
  document.getElementById('file-ring').innerHTML = ringInfo;

  panel.classList.add('visible');
}

// ─── Shield Mode Controls ──────────────────────────────────────────────
function setupControls() {
  document.getElementById('file-close').onclick = () => {
    document.getElementById('file-panel').classList.remove('visible');
  };
  document.onkeydown = e => {
    if (e.key === 'Escape') document.getElementById('file-panel').classList.remove('visible');
  };
}

// ─── HUD Update (called each frame) ───────────────────────────────────
function updateHUD(orbMetrics) {
  // Shield bars
  shieldState.forEach((s, i) => {
    const pct = Math.round(s.integrity * 100);
    document.getElementById(`sb${i}`).style.width = pct + '%';
    document.getElementById(`sv${i}`).textContent = pct;
    const status = pct > 80 ? '●' : pct > 40 ? '◐' : '○';
    const color = pct > 80 ? RINGS[i].color : pct > 40 ? '#fa0' : '#f33';
    document.getElementById(`ss${i}`).textContent = status;
    document.getElementById(`ss${i}`).style.color = color;
  });

  // Bus power
  BUSES.forEach((bus, i) => {
    let power = 0;
    bus.feeds.forEach(fi => power += shieldState[fi].integrity / bus.feeds.length);
    power = Math.min(1, power);
    document.getElementById(`bb${i}`).style.width = (power * 100) + '%';
    document.getElementById(`bp${i}`).textContent = Math.round(power * 100) + '%';
  });

  // Bottom metrics
  const integrity = orbMetrics.totalIntegrity * 100;
  const coherence = orbMetrics.coherence * 100;

  document.getElementById('m-integrity').textContent = Math.round(integrity);
  document.getElementById('m-integrity').style.color = integrity > 80 ? '#0f8' : integrity > 40 ? '#fa0' : '#f33';
  document.getElementById('m-coherence').textContent = coherence.toFixed(0);
  document.getElementById('m-psi').textContent = orbMetrics.psi.toFixed(2);

  const fileCount = NODE_MODULES.reduce((sum, m) => sum + m.files.length, 0);
  document.getElementById('m-files').textContent = fileCount;
  document.getElementById('m-modules').textContent = NODE_MODULES.length;

  const threat = integrity > 85 ? 'NONE' : integrity > 50 ? 'LOW' : integrity > 25 ? 'MED' : 'HIGH';
  const tColor = threat === 'NONE' ? '#0f8' : threat === 'LOW' ? '#fa0' : threat === 'MED' ? '#f80' : '#f33';
  document.getElementById('m-threat').textContent = threat;
  document.getElementById('m-threat').style.color = tColor;

  // Clock
  const elapsed = clock.getElapsedTime();
  const s = Math.floor(elapsed);
  document.getElementById('clock').textContent =
    `T+${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor(s%3600/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}
