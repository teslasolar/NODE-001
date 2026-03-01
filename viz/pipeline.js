/**
 * NODE-001 Garden of Eden · Pipeline Flow Visualization
 *
 * Visualizes the 6-stage processing pipeline as luminous arcs
 * flowing around the orb: Sense → Sort → Feel → Act → Store → Watch
 *
 * Energy particles travel along these paths, showing data flow.
 */

let pipelineArcs = [];
let flowParticles = [];
const FLOW_PARTICLES_PER_ARC = 30;

function initPipeline() {
  const stageCount = PIPELINE.length;

  PIPELINE.forEach((stage, i) => {
    const angle0 = (i / stageCount) * TAU - Math.PI / 2;
    const angle1 = ((i + 1) / stageCount) * TAU - Math.PI / 2;
    const radius = 5.0;

    // Arc from one stage position to the next
    const pts = [];
    const steps = 32;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const a = angle0 + (angle1 - angle0) * t;
      const r = radius + Math.sin(t * Math.PI) * 0.8; // Bulge outward
      const y = ORB_Y + Math.sin(t * Math.PI) * 1.2 - 0.5;
      pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
    }

    const curve = new THREE.CatmullRomCurve3(pts);
    const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.02, 6, false);
    const tubeMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(stage.color),
      transparent: true,
      opacity: 0.12,
    });
    const tube = new THREE.Mesh(tubeGeo, tubeMat);
    scene.add(tube);

    // Stage label
    const midPt = curve.getPoint(0.5);
    const label = makeTextSprite(stage.stage, stage.color);
    label.position.copy(midPt);
    label.position.y += 0.8;
    label.scale.set(2.5, 1, 1);
    scene.add(label);

    pipelineArcs.push({ curve, tube, stage, label });

    // Flow particles along this arc
    for (let p = 0; p < FLOW_PARTICLES_PER_ARC; p++) {
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 6, 6),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(stage.color),
          transparent: true,
          opacity: 0.5,
        })
      );
      sphere.userData = {
        arcIndex: i,
        offset: p / FLOW_PARTICLES_PER_ARC,
        speed: 0.08 + Math.random() * 0.04,
      };
      scene.add(sphere);
      flowParticles.push(sphere);
    }
  });
}

function updatePipeline(t) {
  // Update flow particles along arcs
  flowParticles.forEach(p => {
    const arc = pipelineArcs[p.userData.arcIndex];
    if (!arc) return;

    const progress = (p.userData.offset + t * p.userData.speed) % 1;
    const pos = arc.curve.getPoint(progress);
    p.position.copy(pos);

    // Pulse opacity based on shield integrity of corresponding ring
    const ringIdx = p.userData.arcIndex;
    const integrity = shieldState[Math.min(ringIdx, 6)].integrity;
    p.material.opacity = 0.2 + integrity * 0.6;
    p.scale.setScalar(0.6 + integrity * 0.8);
  });

  // Pulse arc opacity based on shield state
  pipelineArcs.forEach((arc, i) => {
    const integrity = shieldState[Math.min(i, 6)].integrity;
    arc.tube.material.opacity = 0.04 + integrity * 0.15;
  });
}
