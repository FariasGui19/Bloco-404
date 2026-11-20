import * as T from "../vendor/three.module.js";
import { createSculptTools } from "./operator-sculpt.js";
import { batchStatic } from "./sector-meshes.js";

// Owned, bounded geometry. No emitter, frame-time uploads, spawned lights or textures.
export function createOperatorVFX(body, hand, color, kind) {
  const root = new T.Group();
  root.name = "operator-vfx";
  body.add(root);
  const light = new T.MeshBasicMaterial({ color, side: T.DoubleSide });
  const veil = new T.MeshBasicMaterial({
    color,
    side: T.DoubleSide,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    blending: T.AdditiveBlending,
  });
  const metal = new T.MeshLambertMaterial({
    color: 0xae8244,
    flatShading: true,
  });
  const grip = new T.MeshLambertMaterial({
    color: 0x252b35,
    flatShading: true,
  });
  const { tube, loft, mesh: sculptMesh } = createSculptTools();
  const mesh = (geometry, mat, parent = root) =>
    sculptMesh(parent, mat, geometry);
  const group = (name) => {
    const g = new T.Group();
    g.name = name;
    root.add(g);
    return g;
  };
  const shape = new T.Shape();
  shape.moveTo(-0.025, 0);
  for (const point of kind === "ancient"
    ? [
        [-0.035, -0.16],
        [-0.025, -0.52],
        [0.035, -0.84],
        [0.15, -1.04],
        [0.105, -0.82],
        [0.055, -0.48],
        [0.04, -0.12],
        [0.025, 0],
      ]
    : [
        [-0.065, -0.12],
        [-0.055, -0.67],
        [0, -1.04],
        [0.055, -0.67],
        [0.065, -0.12],
        [0.025, 0],
      ])
    shape.lineTo(...point);
  shape.closePath();
  const blade = mesh(
    new T.ExtrudeGeometry(shape, { depth: 0.018, bevelEnabled: false }),
    light,
    hand,
  );
  blade.name = "energy-blade";
  blade.position.set(0, -0.31, 0.07);
  const sword = new T.Group();
  sword.name = "ancestral-sword";
  hand.add(sword);
  if (kind === "ancient") {
    loft(
      sword,
      grip,
      [
        [-0.31, 0.025, 0.025],
        [-0.18, 0.025, 0.025],
      ],
      0,
      0,
      0.075,
      8,
    );
    tube(
      sword,
      metal,
      [
        [-0.16, -0.35, 0.075],
        [-0.09, -0.3, 0.075],
        [0, -0.31, 0.075],
        [0.09, -0.3, 0.075],
        [0.16, -0.35, 0.075],
      ],
      0.018,
    );
    loft(
      sword,
      metal,
      [
        [-0.195, 0.038, 0.035],
        [-0.163, 0.021, 0.02],
      ],
      0,
      0,
      0.075,
      8,
    );
    const inlay = new T.MeshBasicMaterial({ color: 0xfff4cc });
    // A luminous central fuller and three small etched intervals, not floating gems.
    tube(
      sword,
      inlay,
      [
        [0, -0.36, 0.09],
        [0, -0.75, 0.09],
        [0.035, -0.96, 0.09],
      ],
      0.005,
    );
    for (let i = 0; i < 3; i++)
      tube(
        sword,
        metal,
        [
          [-0.021, -0.39 - i * 0.065, 0.091],
          [0.018, -0.415 - i * 0.065, 0.091],
        ],
        0.003,
      );
    batchStatic(sword);
  } else {
    sword.visible = false;
    metal.dispose();
    grip.dispose();
  }
  const trail = mesh(
    new T.RingGeometry(
      kind === "mare" ? 0.67 : 0.45,
      kind === "bio" ? 0.72 : 0.86,
      24,
      1,
      0,
      kind === "ancient" ? 2.8 : 2.2,
    ),
    veil,
    hand,
  );
  trail.name = "energy-trail";
  trail.position.set(0, -0.37, 0.08);
  const read = mesh(
    new T.RingGeometry(0.26, 0.28, 20, 1, 0, Math.PI * 1.65),
    veil,
  );
  read.name = "diagnostic-fan";
  read.position.set(-0.27, 1.05, 0.4);
  const glyph = mesh(new T.TorusGeometry(0.11, 0.009, 3, 8), light);
  glyph.name = "diagnostic-reticle";
  glyph.position.copy(read.position);
  const holograms = ["veloz", "brute"].map((id) => {
    const s = new T.Shape();
    const points =
      id === "veloz"
        ? [
            [-0.09, 0.02],
            [-0.11, 0.15],
            [0, 0.08],
            [0.11, 0.15],
            [0.09, -0.05],
            [0, -0.1],
          ]
        : [
            [-0.08, 0.13],
            [0.08, 0.13],
            [0.1, 0.07],
            [0.1, -0.1],
            [-0.1, -0.1],
            [-0.1, 0.07],
          ];
    s.moveTo(...points[0]);
    points.slice(1).forEach((p) => s.lineTo(...p));
    s.closePath();
    const icon = mesh(new T.ShapeGeometry(s), veil);
    icon.name = "bracelet-hologram-" + id;
    icon.position.set(-0.27, 1.05, 0.414);
    return icon;
  });
  const convergence = group("transformation-convergence");
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3,
      x = Math.sin(a),
      z = Math.cos(a);
    const points =
      kind === "brute"
        ? [
            [x * 0.58, 0.08, z * 0.42],
            [x * 0.58, 0.8, z * 0.42],
            [x * 0.35, 1.65, z * 0.26],
          ]
        : kind === "mare"
          ? [
              [x * 0.45, 0.2, z * 0.4],
              [x * 0.6, 0.65, z * 0.5],
              [x * 0.28, 1.4, z * 0.24],
            ]
          : [
              [x * 0.5, 0.18, z * 0.4],
              [x * 0.34, 0.85, z * 0.3],
              [x * 0.16, 1.5, z * 0.15],
            ];
    tube(convergence, veil, points, kind === "brute" ? 0.028 : 0.014);
  }
  batchStatic(convergence);
  const impact = mesh(new T.RingGeometry(0.22, 0.3, 20), veil);
  impact.name = "impact-echo";
  impact.rotation.x = -Math.PI / 2;
  impact.position.y = 0.025;
  const signature = group("signature-" + kind);
  if (kind === "ancient") {
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      tube(
        signature,
        light,
        [
          [Math.sin(a) * 0.58, 0.028, Math.cos(a) * 0.58],
          [Math.sin(a) * 0.74, 0.028, Math.cos(a) * 0.74],
          [Math.sin(a + 0.11) * 0.78, 0.028, Math.cos(a + 0.11) * 0.78],
        ],
        0.009,
      );
    }
    const seal = mesh(new T.RingGeometry(0.48, 0.5, 8), veil, signature);
    seal.rotation.x = -Math.PI / 2;
    seal.position.y = 0.029;
  } else if (kind === "bio") {
    for (const side of [-1, 1]) {
      tube(
        signature,
        light,
        [
          [side * 0.29, 0.65, -0.22],
          [side * 0.38, 1, -0.3],
          [side * 0.3, 1.42, -0.2],
        ],
        0.028,
      );
      const flame = mesh(new T.ConeGeometry(0.09, 0.65, 6), veil, signature);
      flame.position.set(side * 0.29, 0.68, -0.31);
      flame.rotation.x = -0.35;
      flame.rotation.z = Math.PI;
    }
  } else if (kind === "mare") {
    for (let i = 0; i < 3; i++)
      tube(
        signature,
        i === 1 ? light : veil,
        [
          [-0.7, 0.2 + i * 0.25, 0.1],
          [-0.35, 0.34 + i * 0.25, 0.45],
          [0.2, 0.22 + i * 0.25, 0.56],
          [0.72, 0.38 + i * 0.25, 0.22],
        ],
        0.017 + i * 0.004,
      );
  } else if (kind === "brute") {
    for (let i = 0; i < 7; i++) {
      const a = (i * Math.PI * 2) / 7;
      tube(
        signature,
        light,
        [
          [Math.sin(a) * 0.22, 0.025, Math.cos(a) * 0.22],
          [Math.sin(a + 0.14) * 0.55, 0.025, Math.cos(a + 0.14) * 0.55],
          [Math.sin(a) * 0.9, 0.025, Math.cos(a) * 0.9],
        ],
        0.012,
      );
    }
  } else {
    for (let i = 0; i < 3; i++)
      tube(
        signature,
        i === 1 ? light : veil,
        [
          [(i - 1) * 0.16, 0.42, -0.15],
          [(i - 1) * 0.2, 0.55, -0.65],
          [(i - 1) * 0.28, 0.48, -1.45],
        ],
        0.015,
      );
  }
  batchStatic(signature);
  const wake = group("locomotion-wake");
  if (kind === "veloz" || kind === "mare")
    for (const side of [-1, 1])
      tube(
        wake,
        veil,
        [
          [side * 0.18, 0.24, -0.15],
          [side * 0.25, 0.26, -0.7],
          [side * 0.3, 0.18, -1.35],
        ],
        0.018,
      );
  batchStatic(wake);
  const assembly = group("transformation-assembly");
  for (const side of [-1, 1]) {
    if (kind === "brute") {
      loft(
        assembly,
        veil,
        [
          [0.25, 0.04, 0.04],
          [1.85, 0.04, 0.04],
        ],
        side * 0.44,
        0,
        0,
        6,
      );
    } else
      tube(
        assembly,
        light,
        [
          [side * 0.25, 0.4, 0.14],
          [side * 0.21, 0.9, 0.16],
          [side * 0.28, 1.35, 0.16],
        ],
        0.011,
      );
  }
  batchStatic(assembly);
  const all = [
    trail,
    read,
    glyph,
    convergence,
    impact,
    signature,
    wake,
    assembly,
    ...holograms,
  ];
  all.forEach((o) => (o.visible = false));
  blade.visible = kind === "ancient";
  blade.scale.y = 0.7;
  return {
    root,
    excluded: new Set([blade, trail]),
    update(p, time, reduced = false, c = {}) {
      root.userData.action = p.id;
      root.userData.phase = p.u;
      root.userData.stage = p.stage;
      const moving = (c.speed ?? 0) > 2 && !c.boating && !c.flying;
      const watery = c.mode === "SUBMERSO" || c.mode === "NADO";
      blade.visible =
        kind === "ancient" || (p.attack && ["bio", "veloz"].includes(kind));
      blade.scale.set(
        kind === "bio" ? 2.2 : 1,
        kind === "bio"
          ? 0.42
          : kind === "ancient"
            ? p.attack
              ? 0.92
              : 0.7
            : 0.8,
        1,
      );
      sword.scale.y = p.attack ? 1 : 0.78;
      trail.visible = p.attack && p.trail > 0.03;
      trail.rotation.z = (p.variant === 1 ? 1 : -1) * (0.9 - p.u * 3.2);
      trail.scale.setScalar(kind === "brute" ? 1.55 : 1 + p.trail * 0.2);
      veil.opacity = reduced
        ? 0.22
        : 0.17 + p.trail * 0.24 + (p.transform ? p.flare * 0.12 : 0);
      read.visible = p.select || (p.scan && ["human", "veloz"].includes(kind));
      glyph.visible = read.visible;
      holograms.forEach((icon, i) => {
        icon.visible =
          p.select &&
          (i === 1
            ? p.selected === "forma_bruta"
            : p.selected !== "forma_bruta");
      });
      read.rotation.z = reduced ? 0 : p.u * 0.6;
      read.scale.setScalar(0.7 + p.read * 0.65);
      convergence.visible = p.transform && p.u < 0.72;
      convergence.scale.setScalar(reduced ? 1 : 1.35 - p.converge * 0.55);
      assembly.visible = p.transform && p.u > 0.2 && p.u < 0.86;
      assembly.scale.y = reduced ? 1 : 0.25 + p.assembly * 0.75;
      impact.visible =
        (p.scan && kind === "ancient") ||
        (p.attack &&
          p.trail > 0.2 &&
          ["bio", "brute", "mare"].includes(kind)) ||
        (p.transform && p.u > 0.65 && p.u < 0.9);
      impact.scale.setScalar(
        reduced ? 1 : 0.4 + p.u * (kind === "brute" ? 4.2 : 2.4),
      );
      signature.visible =
        p.scan ||
        (p.attack && (p.variant === 2 || kind === "brute") && p.trail > 0.12);
      signature.scale.setScalar(
        reduced ? 1 : kind === "mare" ? 0.7 + p.u * 0.6 : 1,
      );
      signature.rotation.y = reduced ? 0 : kind === "mare" ? p.u * 0.6 : 0;
      wake.visible =
        !!moving && (kind === "veloz" || kind === "mare") && !reduced;
      wake.scale.z = Math.min(1.8, 0.5 + (c.speed ?? 0) * 0.07);
      wake.position.y = watery ? 0.2 : 0;
      root.userData.signature = signature.visible ? kind : null;
    },
  };
}
