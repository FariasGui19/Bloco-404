import * as T from "../vendor/three.module.js";
// Fixed, reusable geometry; no per-frame textures, particle spawning or lights.
export function createOperatorVFX(body, hand, color, kind) {
  const root = new T.Group();
  root.name = "operator-vfx";
  body.add(root);
  const light = new T.MeshBasicMaterial({ color, side: T.DoubleSide });
  const veil = new T.MeshBasicMaterial({
    color,
    side: T.DoubleSide,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    blending: T.AdditiveBlending,
  });
  const mesh = (geo, mat, parent = root) => {
    const o = new T.Mesh(geo, mat);
    parent.add(o);
    return o;
  };
  const shape = new T.Shape();
  shape.moveTo(-0.035, 0);
  for (const p of [
    [-0.075, -0.34],
    [-0.035, -0.68],
    [0.015, -0.95],
    [0.055, -0.57],
    [0.05, -0.05],
  ])
    shape.lineTo(...p);
  shape.closePath();
  const blade = mesh(
    new T.ExtrudeGeometry(shape, { depth: 0.015, bevelEnabled: false }),
    light,
    hand,
  );
  blade.position.set(0, -0.31, 0.07);
  blade.name = "energy-blade";
  const trail = mesh(new T.RingGeometry(0.45, 0.8, 20, 1, 0, 2.25), veil, hand);
  trail.position.set(0, -0.37, 0.08);
  trail.name = "energy-trail";
  const read = mesh(
    new T.RingGeometry(0.26, 0.28, 20, 1, 0, Math.PI * 1.65),
    veil,
  );
  read.position.set(-0.27, 1.05, 0.4);
  read.name = "diagnostic-fan";
  const glyph = mesh(new T.TorusGeometry(0.11, 0.009, 3, 8), light);
  glyph.position.copy(read.position);
  glyph.name = "diagnostic-reticle";
  const holograms = ["veloz", "brute"].map((kind) => {
    const shape = new T.Shape();
    const points =
      kind === "veloz"
        ? [
            [-0.08, 0.04],
            [-0.1, 0.15],
            [-0.02, 0.09],
            [0.02, 0.09],
            [0.1, 0.15],
            [0.08, 0.04],
            [0.09, -0.05],
            [0, -0.1],
            [-0.09, -0.05],
          ]
        : [
            [-0.07, 0.13],
            [0.07, 0.13],
            [0.1, 0.09],
            [0.1, -0.09],
            [0.07, -0.12],
            [-0.07, -0.12],
            [-0.1, -0.09],
            [-0.1, 0.09],
          ];
    shape.moveTo(...points[0]);
    points.slice(1).forEach((p) => shape.lineTo(...p));
    shape.closePath();
    const icon = mesh(new T.ShapeGeometry(shape), veil);
    icon.name = "bracelet-hologram-" + kind;
    icon.position.set(-0.27, 1.05, 0.414);
    icon.visible = false;
    return icon;
  });
  const shards = new T.Group();
  shards.name = "transformation-shards";
  root.add(shards);
  const shardGeo = new T.OctahedronGeometry(0.045, 0);
  for (let i = 0; i < 8; i++) {
    const o = mesh(shardGeo, light, shards),
      a = (i * Math.PI) / 4;
    o.position.set(Math.sin(a) * 0.33, 0.4 + i * 0.13, Math.cos(a) * 0.25);
    o.scale.set(0.7, 2, 0.7);
  }
  const impact = mesh(new T.RingGeometry(0.22, 0.3, 16), veil);
  impact.rotation.x = -Math.PI / 2;
  impact.position.y = 0.025;
  impact.name = "impact-echo";
  // Batched shards remain one rigid effect around the rig, not eight draw calls.
  const parts = [];
  shards.updateMatrixWorld(true);
  for (const o of [...shards.children]) {
    o.updateMatrix();
    parts.push(o.geometry.clone().applyMatrix4(o.matrix));
    shards.remove(o);
  }
  const positions = new Float32Array(
    parts.reduce((n, g) => n + g.attributes.position.array.length, 0),
  );
  let offset = 0;
  for (const g of parts) {
    positions.set(g.attributes.position.array, offset);
    offset += g.attributes.position.array.length;
    g.dispose();
  }
  shardGeo.dispose();
  const merged = new T.BufferGeometry();
  merged.setAttribute("position", new T.BufferAttribute(positions, 3));
  shards.add(new T.Mesh(merged, light));
  const all = [blade, trail, read, glyph, shards, impact];
  all.forEach((o) => (o.visible = false));
  return {
    root,
    excluded: new Set([blade, trail]),
    update(p, time, reduced = false) {
      root.userData.action = p.id;
      root.userData.phase = p.u;
      blade.visible = p.attack && ["ancient", "bio", "veloz"].includes(kind);
      blade.scale.y = 0.8 + p.trail * 0.25;
      trail.visible = p.attack && p.trail > 0.03;
      trail.rotation.z = -0.9 + p.u * 2.7;
      trail.scale.setScalar(
        kind === "brute" ? 1.3 : kind === "mare" ? 1.05 : 1,
      );
      veil.opacity = reduced ? 0.22 : 0.18 + p.trail * 0.22;
      read.visible = p.scan || p.select;
      glyph.visible = read.visible;
      holograms.forEach((icon, i) => {
        icon.visible =
          p.select &&
          (i === 1
            ? p.selected === "forma_bruta"
            : p.selected !== "forma_bruta");
      });
      read.rotation.z = p.u * 0.9;
      read.scale.setScalar(0.7 + p.read * 0.65);
      glyph.rotation.z = -p.u * 0.8;
      shards.visible = p.transform;
      shards.rotation.y = reduced ? 0 : p.u * 2.8;
      shards.scale.setScalar(0.8 + p.flare * 0.5);
      impact.visible =
        p.attack && p.trail > 0.2 && ["bio", "brute", "mare"].includes(kind);
      impact.scale.setScalar(0.4 + p.u * (kind === "brute" ? 3.5 : 2));
    },
  };
}
