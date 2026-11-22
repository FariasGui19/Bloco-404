import * as T from "../vendor/three.module.js";
import { createSculptTools } from "./operator-sculpt.js";
import { batchStatic } from "./sector-meshes.js";

// B404 / tear in the lattice: axial cartridge, offset latch and three data rails.
// No circular dial, hourglass, imported symbol or external texture.
export function createLatticeBracelet(parent, { industrial = false } = {}) {
  const root = new T.Group();
  root.name = "x10-bracelet";
  parent.add(root);
  root.userData.design = "b404-lattice-cartridge";
  const { loft, tube } = createSculptTools();
  const shell = new T.MeshLambertMaterial({
    color: industrial ? 0x34434a : 0x22333e,
    flatShading: true,
  });
  const edge = new T.MeshLambertMaterial({
    color: 0x8b9996,
    flatShading: true,
  });
  const signal = new T.MeshBasicMaterial({ color: 0x99ffe1 });
  const latch = new T.MeshLambertMaterial({
    color: 0xd8ab59,
    flatShading: true,
  });
  const slab = (pa, mat, x, y, z, w, h, d) =>
    loft(
      pa,
      mat,
      [
        [-h / 2, w * 0.38, d * 0.38],
        [-h * 0.34, w / 2, d / 2],
        [h * 0.34, w / 2, d / 2],
        [h / 2, w * 0.38, d * 0.38],
      ],
      x,
      y,
      z,
      8,
    );
  loft(
    root,
    shell,
    [
      [-0.255, 0.075, 0.07],
      [-0.045, 0.079, 0.074],
    ],
    0,
    0,
    0,
    10,
  );
  for (const y of [-0.242, -0.06])
    loft(
      root,
      edge,
      [
        [y - 0.009, 0.078, 0.073],
        [y + 0.009, 0.078, 0.073],
      ],
      0,
      0,
      0,
      10,
    );
  slab(root, shell, 0.014, -0.146, 0.081, 0.125, 0.252, 0.053);
  slab(root, edge, -0.057, -0.13, 0.087, 0.022, 0.2, 0.036);
  slab(root, latch, 0.073, -0.09, 0.087, 0.032, 0.067, 0.047);
  // Three unequal, broken rails encode 4-0-4 without a borrowed emblem.
  for (let i = 0; i < 3; i++) {
    const x = -0.023 + i * 0.028;
    for (const [y, h] of i === 1
      ? [[-0.14, 0.13]]
      : [
          [-0.088, 0.037],
          [-0.179, 0.061],
        ])
      slab(root, signal, x, y, 0.113, 0.009, h, 0.006);
  }
  const vanes = [-1, 1].map((side) => {
    const pivot = new T.Group();
    pivot.position.set(side * 0.062, -0.16, 0.092);
    root.add(pivot);
    slab(pivot, shell, side * 0.012, 0, 0, 0.028, 0.145, 0.032);
    tube(
      pivot,
      signal,
      [
        [side * 0.016, -0.05, 0.018],
        [side * 0.016, 0.025, 0.018],
        [side * 0.005, 0.055, 0.018],
      ],
      0.003,
    );
    batchStatic(pivot);
    return pivot;
  });
  batchStatic(root);
  return {
    root,
    update(p, reduced = false) {
      const open = reduced
        ? 0
        : p.transform
          ? p.converge
          : p.select || p.scan
            ? p.read * 0.55
            : 0;
      vanes.forEach((v, i) => {
        v.position.z = open * 0.012;
        v.rotation.y = (i ? 1 : -1) * open * 0.75;
      });
      signal.color.setHex(p.selected === "forma_bruta" ? 0xffce79 : 0x99ffe1);
      signal.color.multiplyScalar(
        1 + (reduced ? 0 : p.transform ? p.flare * 0.65 : p.select ? 0.25 : 0),
      );
      root.userData.phase = p.transform
        ? p.stage
        : p.select
          ? "selection"
          : "standby";
    },
  };
}
