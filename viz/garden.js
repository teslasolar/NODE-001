/**
 * NODE-001 Garden of Eden · Garden Trees
 *
 * Each NODE module is a tree in the garden surrounding the central orb.
 * Files are flowers on branches, colored by extension.
 * Trees are arranged in a golden spiral around the orb.
 */

const gardenTrees = [];
const clickableFlowers = [];

function initGarden() {
  const moduleCount = NODE_MODULES.length;

  NODE_MODULES.forEach((mod, i) => {
    const pos = goldenSpiral(i, moduleCount, 12);
    const fileCount = mod.files.length;
    const height = 6 + fileCount * 0.8;
    const radius = 0.5 + fileCount * 0.04;

    const tree = createModuleTree(pos.x, pos.z, height, radius, mod);
    gardenTrees.push(tree);
  });
}

function createModuleTree(x, z, height, radius, mod) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  // ─── Trunk ─────────────────────────────────────────────────────────
  const trunkGeo = new THREE.CylinderGeometry(radius * 0.35, radius * 0.8, height, 8);
  trunkGeo.translate(0, height / 2, 0);
  const trunk = new THREE.Mesh(trunkGeo, new THREE.MeshPhongMaterial({
    color: 0x3a2818,
  }));
  trunk.castShadow = true;
  group.add(trunk);

  // ─── Roots (visible at base) ───────────────────────────────────────
  for (let r = 0; r < 4; r++) {
    const angle = r * TAU / 4 + Math.random() * 0.5;
    const rootGeo = new THREE.CylinderGeometry(0.03, radius * 0.3, 1.5, 4);
    const root = new THREE.Mesh(rootGeo, new THREE.MeshPhongMaterial({ color: 0x2a1a10 }));
    root.position.set(Math.cos(angle) * radius * 0.6, 0.3, Math.sin(angle) * radius * 0.6);
    root.rotation.z = (Math.random() - 0.5) * 0.8;
    root.rotation.x = (Math.random() - 0.5) * 0.3;
    group.add(root);
  }

  // ─── Module Label (floating text sprite) ───────────────────────────
  const label = makeTextSprite(mod.label, mod.color);
  label.position.set(0, height + 1.2, 0);
  label.scale.set(4, 1.5, 1);
  group.add(label);

  // ─── Branches + File Flowers ───────────────────────────────────────
  const branchCount = Math.min(10, 3 + Math.floor(mod.files.length / 2));
  let fileIdx = 0;

  for (let b = 0; b < branchCount; b++) {
    const angle = b * GOLDEN_ANGLE + mod.name.charCodeAt(0) * 0.1;
    const h = height * (0.3 + (b / branchCount) * 0.5);
    const len = 1.5 + Math.random() * (height * 0.25);

    const start = new THREE.Vector3(
      Math.cos(angle) * radius * 0.25,
      h,
      Math.sin(angle) * radius * 0.25
    );
    const end = new THREE.Vector3(
      Math.cos(angle) * (radius + len),
      h + len * 0.2 + Math.random() * 0.5,
      Math.sin(angle) * (radius + len)
    );

    // Branch
    const branch = createBranch(start, end, 0.08 + 0.03 * (branchCount - b) / branchCount);
    group.add(branch);

    // Leaf cluster at branch end
    const leaves = createLeafCluster(0.8 + Math.random() * 0.6, mod.color);
    leaves.position.copy(end);
    group.add(leaves);

    // Flowers (files) along the branch
    const flowersOnBranch = Math.min(4, Math.ceil((mod.files.length - fileIdx) / Math.max(1, branchCount - b)));

    for (let f = 0; f < flowersOnBranch && fileIdx < mod.files.length; f++) {
      const file = mod.files[fileIdx++];
      const t = 0.3 + (f / flowersOnBranch) * 0.6;

      const pos = start.clone().lerp(end, t);
      pos.x += (Math.random() - 0.5) * 0.6;
      pos.y += (Math.random() - 0.5) * 0.4;
      pos.z += (Math.random() - 0.5) * 0.6;

      const hue = hueForExt(file.name);
      const size = 0.25 + Math.min(0.5, file.size / 5000);

      const flower = createFlower(size, hue, mod.color);
      flower.position.copy(pos);
      flower.userData = { file, module: mod.name, label: mod.label };
      group.add(flower);
      clickableFlowers.push({ mesh: flower, group, data: flower.userData });
    }
  }

  scene.add(group);
  return group;
}

// ─── Branch geometry ───────────────────────────────────────────────────
function createBranch(start, end, radius) {
  const dir = new THREE.Vector3().subVectors(end, start);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(radius * 0.3, radius, len, 6);
  const mesh = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ color: 0x4a3020 }));

  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  mesh.castShadow = true;

  return mesh;
}

// ─── Leaf cluster ──────────────────────────────────────────────────────
function createLeafCluster(size, tintHex) {
  const group = new THREE.Group();
  const count = 3 + Math.floor(Math.random() * 4);
  const tint = new THREE.Color(tintHex);
  const green = new THREE.Color(0x2a4a20);
  const blended = green.clone().lerp(tint, 0.15);

  for (let i = 0; i < count; i++) {
    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(size * (0.35 + Math.random() * 0.35), 6, 4),
      new THREE.MeshPhongMaterial({ color: blended })
    );
    leaf.scale.y = 0.45;
    leaf.position.set(
      (Math.random() - 0.5) * size * 1.8,
      (Math.random() - 0.5) * size * 0.8,
      (Math.random() - 0.5) * size * 1.8
    );
    group.add(leaf);
  }
  return group;
}

// ─── Flower (file) ─────────────────────────────────────────────────────
function createFlower(size, hue, moduleColor) {
  const group = new THREE.Group();
  const color = new THREE.Color().setHSL(hue, 0.7, 0.6);

  // Center (the clickable part)
  const center = new THREE.Mesh(
    new THREE.SphereGeometry(size * 0.3, 8, 8),
    new THREE.MeshPhongMaterial({ color: 0xffdd44, emissive: 0x332200 })
  );
  group.add(center);

  // Petals
  const petalCount = 5;
  for (let i = 0; i < petalCount; i++) {
    const petal = new THREE.Mesh(
      new THREE.SphereGeometry(size * 0.35, 6, 6),
      new THREE.MeshPhongMaterial({ color, transparent: true, opacity: 0.85 })
    );
    petal.scale.set(1, 0.25, 0.55);
    const a = (i / petalCount) * TAU;
    petal.position.set(Math.cos(a) * size * 0.35, 0, Math.sin(a) * size * 0.35);
    petal.rotation.y = -a;
    petal.rotation.z = -0.4;
    group.add(petal);
  }

  return group;
}

// ─── Text Sprite ───────────────────────────────────────────────────────
function makeTextSprite(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 36px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.7;
  ctx.fillText(text, 256, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  return new THREE.Sprite(mat);
}

// ─── Connection Lines (trees → orb) ───────────────────────────────────
function initConnections() {
  NODE_MODULES.forEach((mod, i) => {
    const pos = goldenSpiral(i, NODE_MODULES.length, 12);
    const treeBase = new THREE.Vector3(pos.x, 1, pos.z);
    const orbPos = new THREE.Vector3(0, ORB_Y, 0);

    const curve = new THREE.QuadraticBezierCurve3(
      treeBase,
      new THREE.Vector3(pos.x * 0.4, ORB_Y * 0.7, pos.z * 0.4),
      orbPos
    );

    const lineGeo = new THREE.TubeGeometry(curve, 32, 0.015, 4, false);
    const lineMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(mod.color),
      transparent: true,
      opacity: 0.06,
    });
    const line = new THREE.Mesh(lineGeo, lineMat);
    scene.add(line);
  });
}

function updateGarden(t) {
  // Gentle sway
  gardenTrees.forEach((tree, i) => {
    tree.rotation.z = Math.sin(t * 0.3 + i * PHI) * 0.008;
    tree.rotation.x = Math.cos(t * 0.2 + i) * 0.004;
  });
}
