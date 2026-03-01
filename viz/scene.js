/**
 * NODE-001 Garden of Eden · Scene Setup
 *
 * Three.js renderer, camera, lighting, sky dome, garden ground plane.
 */

let scene, camera, renderer, clock;
let camAngle = 0.4, camPitch = 0.25, camDist = 45, camTarget = new THREE.Vector3(0, 5, 0);
let isDragging = false, dragStart = { x: 0, y: 0 };

function initScene() {
  scene = new THREE.Scene();
  clock = new THREE.Clock();

  camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 800);
  renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('canvas'),
    antialias: true,
  });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x050308);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // ─── Lighting ────────────────────────────────────────────────────────
  // Ambient — cool twilight
  scene.add(new THREE.AmbientLight(0x334466, 0.5));

  // Sun — warm gold from above-right
  const sun = new THREE.DirectionalLight(0xffeedd, 0.7);
  sun.position.set(40, 60, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.far = 200;
  scene.add(sun);

  // Fill — cool blue from opposite side
  const fill = new THREE.DirectionalLight(0x8899cc, 0.25);
  fill.position.set(-30, 40, -30);
  scene.add(fill);

  // Central orb point light — emanates from the core
  const coreLight = new THREE.PointLight(0x0088ff, 0.6, 30);
  coreLight.position.set(0, 6, 0);
  scene.add(coreLight);

  // ─── Sky Dome ────────────────────────────────────────────────────────
  const skyGeo = new THREE.SphereGeometry(400, 32, 24);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {},
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vPos;
      void main() {
        float h = normalize(vPos).y;
        vec3 lo = vec3(0.03, 0.02, 0.06);
        vec3 hi = vec3(0.01, 0.01, 0.03);
        vec3 col = mix(lo, hi, smoothstep(-0.1, 0.6, h));
        // Stars
        float star = step(0.9992, fract(sin(dot(vPos.xz, vec2(12.9898, 78.233))) * 43758.5453));
        col += star * 0.3;
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  // ─── Ground Plane — Garden floor ─────────────────────────────────────
  const groundGeo = new THREE.CircleGeometry(200, 128);
  const groundMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        // Concentric golden rings
        float ring = sin(r * 20.0 - uTime * 0.5) * 0.5 + 0.5;
        ring *= smoothstep(1.0, 0.0, r);
        // Radial glow from center
        float glow = 0.015 / (r + 0.1);
        vec3 col = vec3(0.04, 0.03, 0.02);
        col += vec3(0.0, 0.02, 0.04) * ring * 0.15;
        col += vec3(0.0, 0.04, 0.08) * glow;
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  scene.add(ground);

  // ─── Camera Controls ─────────────────────────────────────────────────
  const cv = renderer.domElement;
  cv.addEventListener('mousedown', e => {
    isDragging = true;
    dragStart = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener('mouseup', () => isDragging = false);
  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    camAngle += (e.clientX - dragStart.x) * 0.005;
    camPitch = Math.max(0.05, Math.min(1.2, camPitch + (e.clientY - dragStart.y) * 0.003));
    dragStart = { x: e.clientX, y: e.clientY };
  });
  cv.addEventListener('wheel', e => {
    camDist = Math.max(12, Math.min(120, camDist + e.deltaY * 0.05));
  }, { passive: true });

  // Touch
  cv.addEventListener('touchstart', e => {
    isDragging = true;
    dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  window.addEventListener('touchend', () => isDragging = false);
  window.addEventListener('touchmove', e => {
    if (!isDragging) return;
    camAngle += (e.touches[0].clientX - dragStart.x) * 0.005;
    camPitch = Math.max(0.05, Math.min(1.2, camPitch + (e.touches[0].clientY - dragStart.y) * 0.003));
    dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });

  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}

function updateCamera(t) {
  camAngle += 0.0005; // Slow auto-orbit
  camera.position.set(
    Math.sin(camAngle) * Math.cos(camPitch) * camDist,
    Math.sin(camPitch) * camDist + 5,
    Math.cos(camAngle) * Math.cos(camPitch) * camDist
  );
  camera.lookAt(camTarget);

  // Update ground shader time
  const ground = scene.children.find(c => c.geometry && c.geometry.type === 'CircleGeometry');
  if (ground && ground.material.uniforms) {
    ground.material.uniforms.uTime.value = t;
  }
}
