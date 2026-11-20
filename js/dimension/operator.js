import * as T from "../vendor/three.module.js";
import { createOperatorMotion } from "./operator-motion.js";
import { batchStatic, chamferSlab } from "./sector-meshes.js";

export const OPERATOR_STYLES = Object.freeze({
  nucleo_dez_forma: { suit: 0x536b6d, accent: 0x64ffa3, trim: 0x9aaead },
  motor_bio_forja: { suit: 0x202a36, accent: 0x43e5ff, trim: 0xd5a746 },
  mare_astral: { suit: 0x20343d, accent: 0x57ecf5, trim: 0x4d7c88 },
  lamina_dominio_anciao: { suit: 0x292d39, accent: 0xffd564, trim: 0xc59647 },
});
function texture(size, pixel) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      data.set([...pixel(x, y), 255], (y * size + x) * 4);
  const t = new T.DataTexture(data, size, size);
  t.colorSpace = T.SRGBColorSpace;
  t.magFilter = t.minFilter = T.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}
export function createOperator(progress, player = {}) {
  const id = progress?.archetype,
    style = OPERATOR_STYLES[id] ?? OPERATOR_STYLES.nucleo_dez_forma;
  const bio = id === "motor_bio_forja",
    mare = id === "mare_astral",
    ancient = id === "lamina_dominio_anciao",
    x10 = id === "nucleo_dez_forma";
  const form = x10 ? player.nucleoForm : null,
    brute = form === "forma_bruta";
  const root = new T.Group(),
    body = new T.Group();
  root.name = "operator";
  root.userData.identity = {
    archetype: id,
    level: 1,
    form,
    bracelet: x10,
    hair: "2b",
    glasses: true,
    moustache: true,
    tattoos: true,
  };
  body.name = "operator-rig";
  root.add(body);
  const cloth = texture(32, (x, y) => {
    const v =
      x % 16 === 0 || y % 16 === 0
        ? 150
        : (x * 7 + y * 3) % 19 === 0
          ? 216
          : 245;
    return [v, v, v];
  });
  const faceMap = texture(32, (x, y) => {
    y = 31 - y;
    let c = [185, 128, 91];
    if (x < 3 || x > 28) c = [151, 99, 72];
    if (y < 5) c = [37, 29, 29];
    // Glasses, eyebrows, eyes and moustache are opaque pixels on skin, never reference backgrounds.
    if (y === 10 && ((x >= 5 && x <= 12) || (x >= 19 && x <= 26)))
      c = [40, 29, 27];
    if (y >= 12 && y <= 18 && ((x >= 4 && x <= 13) || (x >= 18 && x <= 27))) {
      c = [66, 82, 85];
      if (y === 12 || y === 18 || [4, 13, 18, 27].includes(x)) c = [20, 24, 30];
      else if (y === 15 && [9, 22].includes(x)) c = [20, 17, 17];
      else if (y === 13) c = [165, 188, 183];
    }
    if (y === 14 && x >= 13 && x <= 18) c = [20, 24, 30];
    if (y >= 23 && y <= 25 && x >= 10 && x <= 22) c = [37, 26, 24];
    if (y === 28 && x >= 13 && x <= 19) c = [92, 46, 37];
    return c;
  });
  const tattooMap = texture(32, (x, y) => {
    const ink =
      ((x * 3 + Math.floor(y / 3)) % 13 < 3 && y > 3 && y < 29) ||
      ((x - 16) ** 2 + (y - 16) ** 2 < 55 && (x + y) % 5 < 2);
    return ink ? [45, 65, 66] : [177, 122, 86];
  });
  const suit = new T.MeshLambertMaterial({
      color: brute ? 0x3f4849 : form === "forma_veloz" ? 0x315947 : style.suit,
      map: cloth,
      flatShading: true,
    }),
    dark = new T.MeshLambertMaterial({ color: 0x141e29, flatShading: true });
  const skin = new T.MeshLambertMaterial({
      color: 0xb9805c,
      flatShading: true,
    }),
    hair = new T.MeshLambertMaterial({ color: 0x241e22, flatShading: true });
  const ink = new T.MeshLambertMaterial({ map: tattooMap, flatShading: true }),
    trim = new T.MeshLambertMaterial({ color: style.trim, flatShading: true }),
    glow = new T.MeshBasicMaterial({ color: style.accent });
  const limbs = [],
    jets = [],
    effects = new T.Group();
  effects.name = "operator-action";
  body.add(effects);
  function mesh(g, m, parent, x = 0, y = 0, z = 0) {
    const o = new T.Mesh(g, m);
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  }
  const box = (pa, m, w, h, d, x, y, z) =>
    mesh(new T.BoxGeometry(w, h, d), m, pa, x, y, z);
  const cyl = (pa, m, r1, r2, h, x, y, z) =>
    mesh(new T.CylinderGeometry(r1, r2, h, 8), m, pa, x, y, z);
  const ball = (pa, m, r, x, y, z) =>
    mesh(new T.IcosahedronGeometry(r, 1), m, pa, x, y, z);
  cyl(body, suit, brute ? 0.43 : 0.31, brute ? 0.35 : 0.25, 0.61, 0, 1.17, 0);
  box(body, dark, 0.42, 0.3, 0.3, 0, 0.86, 0);
  cyl(body, dark, 0.27, 0.27, 0.09, 0, 0.91, 0);
  for (const side of [-1, 1]) {
    const plate = ball(body, suit, 0.23, side * 0.17, 1.28, 0.12);
    plate.scale.set(1, 0.8, 0.6);
    box(body, glow, 0.035, 0.29, 0.025, side * 0.18, 1.16, 0.255);
    box(body, trim, 0.09, 0.09, 0.055, side * 0.18, 0.93, 0.18);
  }
  box(body, glow, 0.09, 0.11, 0.045, 0, 1.39, 0.25);
  if (player.equippedSuit) {
    box(body, trim, 0.37, 0.09, 0.04, 0, 1.35, 0.275);
    for (const side of [-1, 1])
      box(body, glow, 0.04, 0.22, 0.025, side * 0.25, 1.17, 0.26);
  }
  const neck = cyl(body, ink, 0.12, 0.13, 0.18, 0, 1.53, 0);
  neck.name = "neck-tattoos";
  const head = new T.Group();
  head.position.y = 1.76;
  body.add(head);
  const skull = ball(head, skin, 0.255, 0, 0, 0);
  skull.scale.set(0.88, 1.12, 0.85);
  const faceShape = new T.Shape();
  faceShape.moveTo(-0.13, -0.195);
  for (const [x, y] of [
    [0.13, -0.195],
    [0.185, -0.13],
    [0.185, 0.13],
    [0.13, 0.195],
    [-0.13, 0.195],
    [-0.185, 0.13],
    [-0.185, -0.13],
  ])
    faceShape.lineTo(x, y);
  faceShape.closePath();
  const faceGeometry = new T.ShapeGeometry(faceShape),
    faceUV = faceGeometry.attributes.uv,
    facePositions = faceGeometry.attributes.position;
  for (let i = 0; i < faceUV.count; i++)
    faceUV.setXY(
      i,
      facePositions.getX(i) / 0.37 + 0.5,
      facePositions.getY(i) / 0.39 + 0.5,
    );
  mesh(
    faceGeometry,
    new T.MeshLambertMaterial({ map: faceMap }),
    head,
    0,
    -0.005,
    0.219,
  );
  box(head, skin, 0.065, 0.08, 0.07, 0, -0.01, 0.24);
  for (const side of [-1, 1]) ball(head, skin, 0.056, side * 0.235, -0.015, 0);
  const hairBase = ball(head, hair, 0.249, 0, 0.12, -0.04);
  hairBase.scale.set(0.95, 0.63, 0.98);
  // Overlapping low-poly locks give a wavy 2b silhouette rather than a smooth helmet.
  for (let i = 0; i < 11; i++) {
    const a = i * 2.399,
      r = i < 7 ? 0.16 : 0.08;
    const lock = ball(
      head,
      hair,
      0.125,
      Math.cos(a) * r,
      0.18 + (i % 3) * 0.026,
      Math.sin(a) * r - 0.015,
    );
    lock.scale.set(1, 0.65, 1);
  }
  for (let i = 0; i < 5; i++) {
    const curl = ball(
      head,
      hair,
      0.073,
      (i - 2) * 0.073,
      0.15 + Math.sin(i * 1.7) * 0.02,
      0.15,
    );
    curl.scale.y = 0.7;
  }
  for (const side of [-1, 1])
    box(head, hair, 0.035, 0.1, 0.04, side * 0.21, 0.01, 0.12);
  for (const side of [-1, 1]) {
    const leg = new T.Group();
    leg.position.set(side * 0.17, 0.84, 0);
    body.add(leg);
    cyl(leg, suit, 0.135, 0.115, 0.28, 0, -0.14, 0);
    const knee = new T.Group();
    knee.position.y = -0.28;
    leg.add(knee);
    cyl(knee, dark, 0.115, 0.105, 0.25, 0, -0.125, 0);
    ball(knee, trim, 0.105, 0, 0, 0.085);
    const boot = chamferSlab(
      knee,
      suit,
      0.23,
      0.19,
      0.35,
      0,
      -0.31,
      0.065,
      0.04,
    );
    box(knee, glow, 0.13, 0.025, 0.03, 0, -0.29, 0.247);
    const arm = new T.Group();
    arm.position.set(side * (brute ? 0.49 : 0.37), 1.4, 0);
    body.add(arm);
    const shoulder = ball(arm, suit, bio || brute ? 0.19 : 0.16, 0, 0, 0);
    shoulder.scale.y = 0.85;
    cyl(arm, bio ? ink : suit, 0.105, 0.09, 0.25, 0, -0.14, 0);
    const elbow = new T.Group();
    elbow.position.y = -0.27;
    arm.add(elbow);
    cyl(elbow, dark, 0.1, 0.12, 0.23, 0, -0.12, 0);
    box(elbow, trim, 0.13, 0.19, 0.06, 0, -0.13, 0.09);
    ball(elbow, skin, 0.095, 0, -0.3, 0);
    if (mare) {
      const duct = mesh(
        new T.TorusGeometry(0.11, 0.025, 4, 8, Math.PI),
        glow,
        arm,
        side * 0.015,
        -0.1,
        -0.06,
      );
      duct.rotation.y = (side * Math.PI) / 2;
      box(elbow, glow, 0.035, 0.2, 0.04, 0, -0.12, 0.13);
    }
    if (x10 && side === -1) {
      const watch = cyl(elbow, dark, 0.16, 0.16, 0.16, 0, -0.15, 0);
      watch.name = "x10-bracelet";
      const dial = mesh(
        new T.CylinderGeometry(0.12, 0.12, 0.05, 8),
        glow,
        elbow,
        0,
        -0.15,
        0.14,
      );
      dial.rotation.x = Math.PI / 2;
      const glyph = mesh(
        new T.TorusGeometry(0.065, 0.015, 3, 4),
        dark,
        elbow,
        0,
        -0.15,
        0.174,
      );
      glyph.rotation.z = Math.PI / 4;
    }
    if (bio || x10) {
      cyl(body, dark, 0.105, 0.12, 0.34, side * 0.19, 1.14, -0.25);
      const jet = mesh(
        new T.ConeGeometry(0.09, 0.36, 6),
        glow,
        knee,
        0,
        -0.37,
        -0.06,
      );
      jet.rotation.z = Math.PI;
      jet.visible = false;
      jets.push(jet);
    }
    limbs.push({ leg, knee, arm, elbow, side });
  }
  if (mare) {
    for (const side of [-1, 1]) {
      const pipe = mesh(
        new T.TorusGeometry(0.24, 0.035, 4, 10, Math.PI * 1.25),
        glow,
        body,
        side * 0.13,
        1.4,
        -0.035,
      );
      pipe.rotation.y = (side * Math.PI) / 2;
    }
    cyl(body, suit, 0.15, 0.16, 0.48, 0, 1.18, -0.25);
    box(body, glow, 0.065, 0.31, 0.04, 0, 1.2, -0.4);
  }
  if (ancient) {
    const collar = cyl(body, trim, 0.19, 0.26, 0.12, 0, 1.49, 0);
    const lens = mesh(
      new T.TorusGeometry(0.055, 0.012, 4, 10),
      glow,
      head,
      -0.1,
      0.01,
      0.245,
    );
    lens.name = "ancestral-lens";
  }
  if (form === "forma_veloz")
    for (const side of [-1, 1])
      box(body, glow, 0.05, 0.38, 0.04, side * 0.22, 1.12, -0.19);
  const blade = mesh(
    new T.ConeGeometry(0.11, 0.85, 3),
    glow,
    limbs[1].elbow,
    0,
    -0.48,
    0.04,
  );
  blade.name = "energy-blade";
  blade.visible = false;
  const halo = mesh(
    new T.TorusGeometry(0.6, 0.025, 4, 24),
    glow,
    effects,
    0,
    0.8,
    0,
  );
  halo.rotation.x = Math.PI / 2;
  halo.visible = false;
  const pulse = mesh(
    new T.TorusGeometry(0.14, 0.015, 4, 12),
    glow,
    effects,
    0,
    1.25,
    0.5,
  );
  pulse.visible = false;
  // Batch rigid parts per joint, never merge across an animated pivot.
  const pivots = [
    body,
    head,
    ...limbs.flatMap((l) => [l.arm, l.elbow, l.leg, l.knee]),
  ];
  const excluded = new Set([blade, halo, pulse, ...jets]);
  for (const pivot of pivots) batchStatic(pivot, excluded);
  const motion = createOperatorMotion();
  return {
    root,
    motion,
    get pose() {
      return motion.pose;
    },
    animate(c, t, options = {}) {
      const pose = motion.update(c, t, options),
        action = options.action,
        active = action?.remaining > 0,
        u = active ? 1 - action.remaining / action.duration : 0;
      root.position.set(c.x, c.y, c.z);
      root.rotation.y = c.yaw;
      body.rotation.set(pose.pitch, 0, pose.bank);
      body.position.y = pose.bob;
      head.rotation.y = pose.head;
      limbs.forEach(({ leg, knee, arm, elbow, side }, i) => {
        leg.rotation.x = pose.legs[i];
        knee.rotation.x = pose.knees[i];
        arm.rotation.x = pose.arms[i];
        elbow.rotation.x = pose.elbows[i];
        arm.rotation.z = -side * pose.spread;
      });
      if (active) {
        limbs[1].arm.rotation.x = -1.3 - Math.sin(u * Math.PI) * 0.9;
        limbs[1].arm.rotation.y = Math.sin(u * Math.PI) * 0.6;
        limbs[0].arm.rotation.x = -0.7;
      } else limbs[1].arm.rotation.y = 0;
      blade.visible =
        active && (action.id === "golpe_ruptura" || action.id === "bio_dash");
      halo.visible = active;
      halo.scale.setScalar(0.5 + u * 2.5);
      halo.rotation.z = t * 0.6;
      pulse.visible = active && !ancient && !bio;
      pulse.scale.setScalar(1 + Math.sin(u * Math.PI) * 1.3);
      for (const jet of jets) {
        const thrust =
          pose.exhaust || (bio && (c.dash > 0 || c.actionBoost > 0) ? 1.5 : 0);
        jet.visible = thrust > 0;
        jet.scale.y = thrust;
      }
    },
  };
}
