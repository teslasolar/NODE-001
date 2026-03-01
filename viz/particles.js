/**
 * NODE-001 Garden of Eden · 127D Particle Field
 *
 * 127-dimensional particle cloud folded through golden ratio.
 * Each dimension maps to a ring. Particles orbit the orb
 * and flow through the garden like pollen / energy.
 */

let particles127, gardenParticles;
const PARTICLE_COUNT = 8000;
const GARDEN_PARTICLE_COUNT = 2000;

// Shared shader
const particleVtx = `
  attribute float size;
  varying vec3 vColor;
  void main() {
    vColor = color;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (80.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const particleFrg = `
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float glow = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor, glow * 0.6);
  }
`;

function initParticles() {
  // ─── 127D Orb Particles ──────────────────────────────────────────────
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(PARTICLE_COUNT * 3);
  const col = new Float32Array(PARTICLE_COUNT * 3);
  const siz = new Float32Array(PARTICLE_COUNT);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const dim = i % 127;
    const ring = dim % 7;
    const { theta, phi } = fibonacci127(dim);
    const r = 1.0 + ring * 0.42 + Math.random() * 0.2;

    pos[i * 3]     = Math.sin(phi) * Math.cos(theta) * r;
    pos[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r;
    pos[i * 3 + 2] = Math.cos(phi) * r;

    const c = new THREE.Color(RINGS[ring].color);
    col[i * 3]     = c.r * 0.12;
    col[i * 3 + 1] = c.g * 0.12;
    col[i * 3 + 2] = c.b * 0.12;
    siz[i] = 0.3 + Math.random() * 0.4;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(siz, 1));

  particles127 = new THREE.Points(geo, new THREE.ShaderMaterial({
    vertexShader: particleVtx,
    fragmentShader: particleFrg,
    transparent: true,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  particles127.position.set(0, ORB_Y, 0);
  scene.add(particles127);

  // ─── Garden Floating Particles (pollen / fireflies) ─────────────────
  const gGeo = new THREE.BufferGeometry();
  const gPos = new Float32Array(GARDEN_PARTICLE_COUNT * 3);
  const gCol = new Float32Array(GARDEN_PARTICLE_COUNT * 3);
  const gSiz = new Float32Array(GARDEN_PARTICLE_COUNT);

  for (let i = 0; i < GARDEN_PARTICLE_COUNT; i++) {
    const angle = i * GOLDEN_ANGLE;
    const r = 5 + Math.sqrt(i) * 2.5;
    const h = Math.random() * 12;

    gPos[i * 3]     = Math.cos(angle) * r + (Math.random() - 0.5) * 3;
    gPos[i * 3 + 1] = h;
    gPos[i * 3 + 2] = Math.sin(angle) * r + (Math.random() - 0.5) * 3;

    // Mix of gold and module colors
    const modIdx = i % NODE_MODULES.length;
    const c = new THREE.Color(NODE_MODULES[modIdx].color);
    const gold = new THREE.Color(0xffd700);
    c.lerp(gold, 0.4);
    gCol[i * 3]     = c.r * 0.08;
    gCol[i * 3 + 1] = c.g * 0.08;
    gCol[i * 3 + 2] = c.b * 0.08;
    gSiz[i] = 0.2 + Math.random() * 0.5;
  }

  gGeo.setAttribute('position', new THREE.BufferAttribute(gPos, 3));
  gGeo.setAttribute('color', new THREE.BufferAttribute(gCol, 3));
  gGeo.setAttribute('size', new THREE.BufferAttribute(gSiz, 1));

  gardenParticles = new THREE.Points(gGeo, new THREE.ShaderMaterial({
    vertexShader: particleVtx,
    fragmentShader: particleFrg,
    transparent: true,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  scene.add(gardenParticles);
}

function updateParticles(t) {
  // ─── 127D Orb Particles ──────────────────────────────────────────────
  const pp = particles127.geometry.attributes.position;
  const pc = particles127.geometry.attributes.color;
  const ps = particles127.geometry.attributes.size;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const dim = i % 127;
    const ring = dim % 7;
    const si = shieldState[ring].integrity;

    const theta = dim * PHI * TAU + t * (si * 0.04 + 0.001);
    const phi = Math.acos(2 * (dim / 127) - 1) + Math.sin(t * 0.04 + i * 0.0005) * 0.03;
    const r = 1.0 + ring * 0.42 + si * 0.5 + Math.sin(t * 0.15 + i * 0.004) * 0.1;

    pp.array[i * 3]     = Math.sin(phi) * Math.cos(theta) * r;
    pp.array[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r;
    pp.array[i * 3 + 2] = Math.cos(phi) * r;

    const c = new THREE.Color(RINGS[ring].color);
    const bright = 0.04 + si * 0.25;
    pc.array[i * 3]     = c.r * bright;
    pc.array[i * 3 + 1] = c.g * bright;
    pc.array[i * 3 + 2] = c.b * bright;
    ps.array[i] = 0.15 + si * 0.7;
  }

  pp.needsUpdate = pc.needsUpdate = ps.needsUpdate = true;

  // ─── Garden Particles ────────────────────────────────────────────────
  const gp = gardenParticles.geometry.attributes.position;
  const gs = gardenParticles.geometry.attributes.size;

  for (let i = 0; i < GARDEN_PARTICLE_COUNT; i++) {
    // Gentle float upward + drift
    gp.array[i * 3 + 1] += 0.003 + Math.sin(t * 0.5 + i) * 0.001;
    gp.array[i * 3]     += Math.sin(t * 0.2 + i * 0.3) * 0.003;
    gp.array[i * 3 + 2] += Math.cos(t * 0.15 + i * 0.2) * 0.003;

    // Reset when too high
    if (gp.array[i * 3 + 1] > 15) {
      gp.array[i * 3 + 1] = 0.5;
    }

    // Pulse size
    gs.array[i] = 0.15 + Math.sin(t * 0.8 + i * PHI) * 0.15 + 0.2;
  }

  gp.needsUpdate = gs.needsUpdate = true;
}
