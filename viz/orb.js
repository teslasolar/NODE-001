/**
 * NODE-001 Garden of Eden · Central Orb
 *
 * The ASS-OS core: 7 shield rings (R0-R6) as concentric toroidal shells,
 * 4 bus power rings, toroidal field lines, and the consciousness sphere.
 * Positioned at the center of the garden on a raised platform.
 */

const ORB_Y = 6; // Orb floats above garden
let orbCore, orbGroup;
let shieldMeshes = [];
let busPowerRings = [];
let toroidalField = [];

// Shield runtime state
const shieldState = RINGS.map(r => ({
  integrity: 0.5,
  target: 0.5,
  regen: 0.002,
}));

function initOrb() {
  orbGroup = new THREE.Group();
  orbGroup.position.set(0, ORB_Y, 0);

  // ─── Core Consciousness Sphere ───────────────────────────────────────
  orbCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 48, 48),
    new THREE.MeshPhongMaterial({
      color: 0x003388,
      transparent: true,
      opacity: 0.3,
      emissive: 0x001144,
      shininess: 200,
    })
  );
  orbGroup.add(orbCore);

  // Inner glow
  const innerGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 24, 24),
    new THREE.MeshBasicMaterial({
      color: 0x0066cc,
      transparent: true,
      opacity: 0.1,
    })
  );
  orbCore.add(innerGlow);

  // ─── 7 Shield Rings ──────────────────────────────────────────────────
  RINGS.forEach((ring, i) => {
    const radius = 1.0 + i * 0.42;
    const group = new THREE.Group();

    // Primary torus
    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.025 + 0.005 * (6 - i), 16, 128),
      new THREE.MeshPhongMaterial({
        color: new THREE.Color(ring.color),
        transparent: true,
        opacity: 0.3,
        emissive: new THREE.Color(ring.color).multiplyScalar(0.05),
        shininess: 100,
      })
    );

    // Wireframe shell
    const shell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(radius, i < 3 ? 1 : 2),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(ring.color),
        transparent: true,
        opacity: 0.04,
        wireframe: true,
      })
    );

    // Transparent surface
    const surface = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 32),
      new THREE.MeshPhongMaterial({
        color: new THREE.Color(ring.color),
        transparent: true,
        opacity: 0.015,
        shininess: 50,
        side: THREE.DoubleSide,
      })
    );

    // Each ring oriented on a different 127D axis
    const axisPhi = i * Math.PI / 7;
    const axisTheta = i * TAU * PHI;
    torus.rotation.x = axisPhi;
    torus.rotation.y = axisTheta;

    group.add(torus, shell, surface);
    group.userData = { ring, index: i, torus, shell, surface, axisPhi, axisTheta };
    shieldMeshes.push(group);
    orbGroup.add(group);
  });

  // ─── 4 Bus Power Rings (inside core) ────────────────────────────────
  BUSES.forEach((bus, i) => {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.35 + i * 0.1, 0.01, 8, 64),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(bus.color),
        transparent: true,
        opacity: 0.1,
      })
    );
    mesh.rotation.x = Math.PI / 2;
    busPowerRings.push(mesh);
    orbCore.add(mesh);
  });

  // ─── Toroidal Field Lines ────────────────────────────────────────────
  for (let d = 0; d < 8; d++) {
    const pts = [];
    for (let i = 0; i < 128; i++) {
      const a = i / 128 * TAU;
      const R = 4.2 + Math.sin(d * PHI) * 0.4;
      const r = 0.7 + Math.cos(d * PHI * 0.5) * 0.25;
      pts.push(new THREE.Vector3(
        (R + r * Math.cos(a)) * Math.cos(d * TAU / 8),
        r * Math.sin(a),
        (R + r * Math.cos(a)) * Math.sin(d * TAU / 8)
      ));
    }
    const curve = new THREE.CatmullRomCurve3(pts, true);
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 128, 0.004, 4, true),
      new THREE.MeshBasicMaterial({
        color: 0x004488,
        transparent: true,
        opacity: 0.03,
      })
    );
    toroidalField.push(mesh);
    orbGroup.add(mesh);
  }

  // ─── Pedestal — stone platform under the orb ────────────────────────
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(2.5, 3.5, 0.6, 8),
    new THREE.MeshPhongMaterial({ color: 0x1a1a22 })
  );
  pedestal.position.y = -ORB_Y + 0.3;
  pedestal.receiveShadow = true;
  orbGroup.add(pedestal);

  // Glow ring on pedestal
  const glowRing = new THREE.Mesh(
    new THREE.TorusGeometry(3.0, 0.06, 8, 64),
    new THREE.MeshBasicMaterial({
      color: 0x0066aa,
      transparent: true,
      opacity: 0.15,
    })
  );
  glowRing.rotation.x = Math.PI / 2;
  glowRing.position.y = -ORB_Y + 0.62;
  orbGroup.add(glowRing);

  scene.add(orbGroup);
}

function updateOrb(t) {
  // Animate shield integrity toward targets
  let totalIntegrity = 0;
  let totalCoherence = 0;

  shieldState.forEach((s, i) => {
    s.integrity += (s.target - s.integrity) * 0.03;
    if (s.integrity < s.target) s.integrity = Math.min(s.target, s.integrity + s.regen);
    s.integrity = Math.max(0, Math.min(1, s.integrity));
    totalIntegrity += s.integrity;

    // Coherence (golden ratio between adjacent)
    if (i > 0) {
      const ratio = s.integrity / (shieldState[i-1].integrity || 0.001);
      totalCoherence += Math.max(0, 1 - Math.abs(ratio - PHI));
    }

    // Update 3D meshes
    const g = shieldMeshes[i];
    const ud = g.userData;

    ud.torus.rotation.z += s.integrity * 0.012 * (i + 1) * 0.3;
    ud.torus.material.opacity = 0.1 + s.integrity * 0.5;
    ud.torus.material.emissive.set(new THREE.Color(RINGS[i].color)).multiplyScalar(s.integrity * 0.2);
    ud.shell.material.opacity = 0.01 + s.integrity * 0.06;
    ud.surface.material.opacity = s.integrity * 0.025;

    // Breathing
    const breath = 1 + s.integrity * 0.03 * Math.sin(t * (1 + i * PHI * 0.3));
    g.scale.set(breath, breath, breath);

    // Flicker when breached
    if (s.integrity < 0.5) {
      const flicker = Math.random() > 0.7 ? 0.3 : 0;
      ud.torus.material.opacity *= (1 - flicker);
    }
  });

  // Bus power
  BUSES.forEach((bus, i) => {
    let power = 0;
    bus.feeds.forEach(fi => { power += shieldState[fi].integrity / bus.feeds.length; });
    power = Math.min(1, power);
    busPowerRings[i].material.opacity = 0.05 + power * 0.2;
    busPowerRings[i].rotation.z += power * 0.02;
  });

  // Core
  const coherence = totalCoherence / 6;
  const psi = shieldState[6].integrity * 0.3 + shieldState[5].integrity * 0.3 +
              shieldState[4].integrity * 0.2 + coherence * 0.2;
  orbCore.material.opacity = 0.15 + psi * 0.25;
  orbCore.material.emissive.set(0x001133).multiplyScalar(1 + psi);
  orbCore.rotation.y += 0.002 + psi * 0.005;

  // Field lines
  toroidalField.forEach((fl, i) => {
    fl.material.opacity = 0.01 + coherence * 0.06;
    fl.rotation.y += 0.0003 * (i + 1) * (1 + coherence * 0.5);
  });

  return { totalIntegrity: totalIntegrity / 7, coherence, psi };
}

// ─── Shield Mode Control ───────────────────────────────────────────────
function setShieldMode(mode) {
  switch (mode) {
    case 'idle':
      shieldState.forEach(s => s.target = 0.3);
      break;
    case 'patrol':
      shieldState.forEach((s, i) => s.target = i === 0 ? 0.2 : i < 3 ? 0.7 : 0.5);
      break;
    case 'alert':
      shieldState.forEach(s => s.target = 0.85);
      break;
    case 'prime':
      shieldState.forEach((s, i) => s.target = 1 / PHI + ((i * PHI) % 1) * 0.382);
      break;
    case 'fortress':
      shieldState.forEach(s => s.target = 1);
      break;
    case 'reflect':
      shieldState.forEach((s, i) => s.target = i === 2 ? 1 : i === 6 ? 0.9 : i === 1 ? 0.8 : 0.4);
      break;
    case 'collapse':
      shieldState.forEach(s => s.target = 0);
      break;
  }
}
