import * as T from "../vendor/three.module.js";
import { createOperatorMotion } from "./operator-motion.js";
import { profileFor } from "./sector-data.js";
export function createOperator(progress) {
  const p = profileFor(progress),
    root = new T.Group(),
    body = new T.Group();
  root.add(body);
  // Small grayscale atlas tints with each archetype; no photo filtering or new asset dependency.
  const pixels = new Uint8Array(32 * 32 * 4);
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      const i = (y * 32 + x) * 4,
        v = x % 8 === 0 || y % 16 === 0 ? 158 : (x + y) % 7 === 0 ? 218 : 245;
      pixels.set([v, v, v, 255], i);
    }
  const fabric = new T.DataTexture(pixels, 32, 32);
  fabric.magFilter = T.NearestFilter;
  fabric.minFilter = T.NearestFilter;
  fabric.colorSpace = T.SRGBColorSpace;
  fabric.generateMipmaps = false;
  fabric.needsUpdate = true;
  const suit = new T.MeshLambertMaterial({
    color: p.color,
    map: fabric,
    flatShading: true,
  });
  const dark = new T.MeshLambertMaterial({
    color: 0x202b43,
    flatShading: true,
  });
  const light = new T.MeshBasicMaterial({ color: p.accent });
  const visor = new T.MeshBasicMaterial({ color: 0xd4faff });
  function part(geo, mat, parent, x, y, z, sx = 1, sy = 1, sz = 1) {
    const m = new T.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    parent.add(m);
    return m;
  }
  part(
    new T.CylinderGeometry(0.32, 0.25, 0.65, 6),
    suit,
    body,
    0,
    1.15,
    0,
    p.heavy ? 1.45 : 1,
    1,
    1,
  );
  part(new T.SphereGeometry(0.31, 8, 5), suit, body, 0, 1.72, 0);
  part(
    new T.SphereGeometry(0.24, 8, 4, 0, Math.PI),
    visor,
    body,
    0,
    1.75,
    0.13,
    1,
    0.46,
    0.85,
  );
  part(new T.OctahedronGeometry(0.13), light, body, 0, 1.28, 0.29);
  part(new T.CylinderGeometry(0.27, 0.27, 0.11, 6), dark, body, 0, 0.88, 0);
  part(new T.BoxGeometry(0.22, 0.2, 0.07), light, body, 0, 1.04, 0.245);
  part(new T.BoxGeometry(0.31, 0.06, 0.05), dark, body, 0, 1.55, 0.25);
  const limbs = [],
    exhausts = [];
  const head = new T.Group();
  head.position.y = 1.72;
  body.add(head);
  // Head and visor pivot together; preserve the original silhouette.
  for (const mesh of [...body.children].filter(
    (o) => o.isMesh && o.position.y > 1.6,
  )) {
    body.remove(mesh);
    mesh.position.y -= 1.72;
    head.add(mesh);
  }
  for (const side of [-1, 1]) {
    const leg = new T.Group();
    leg.position.set(side * 0.18, 0.87, 0);
    body.add(leg);
    part(new T.CylinderGeometry(0.12, 0.11, 0.28, 5), dark, leg, 0, -0.14, 0);
    const knee = new T.Group();
    knee.position.y = -0.28;
    leg.add(knee);
    part(new T.CylinderGeometry(0.11, 0.1, 0.26, 5), dark, knee, 0, -0.13, 0);
    part(
      new T.DodecahedronGeometry(0.16),
      suit,
      knee,
      0,
      -0.32,
      0.08,
      1,
      1,
      1.5,
    );
    const arm = new T.Group();
    arm.position.set(side * 0.43, 1.4, 0);
    body.add(arm);
    part(
      new T.SphereGeometry(0.19, 6, 4),
      suit,
      arm,
      0,
      0,
      0,
      p.heavy ? 1.35 : 1,
      1,
      1,
    );
    part(new T.CylinderGeometry(0.1, 0.11, 0.26, 5), dark, arm, 0, -0.13, 0);
    const elbow = new T.Group();
    elbow.position.y = -0.26;
    arm.add(elbow);
    part(new T.CylinderGeometry(0.11, 0.13, 0.26, 5), dark, elbow, 0, -0.13, 0);
    part(new T.DodecahedronGeometry(0.13), suit, elbow, 0, -0.29, 0);
    if (p.fly) {
      part(
        new T.CylinderGeometry(0.11, 0.17, 0.55, 6),
        suit,
        body,
        side * 0.26,
        1.1,
        -0.33,
      );
      const flame = part(
        new T.ConeGeometry(0.12, 0.42, 5),
        light,
        body,
        side * 0.26,
        0.65,
        -0.33,
      );
      flame.rotation.z = Math.PI;
      flame.userData.exhaust = true;
      exhausts.push(flame);
      const shape = new T.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(side * 0.8, -0.25);
      shape.lineTo(side * 0.3, 0.4);
      shape.closePath();
      const wing = part(
        new T.ShapeGeometry(shape),
        suit,
        body,
        side * 0.27,
        1.35,
        -0.27,
      );
      wing.rotation.y = side * 0.25;
    }
    if (p.dive) {
      const fin = part(
        new T.ConeGeometry(0.21, 0.66, 3),
        light,
        arm,
        side * 0.12,
        -0.28,
        -0.15,
      );
      fin.rotation.x = -0.7;
      part(
        new T.ConeGeometry(0.16, 0.65, 3),
        light,
        knee,
        0,
        -0.24,
        -0.15,
      ).rotation.x = -0.9;
    }
    limbs.push({ leg, arm, knee, elbow, side });
  }
  if (!p.fly)
    part(
      new T.CylinderGeometry(0.19, 0.23, 0.42, 6),
      dark,
      body,
      0,
      1.17,
      -0.29,
    );
  if (progress?.archetype === "lamina_dominio_anciao") {
    const blade = part(
      new T.ConeGeometry(0.11, 1.4, 3),
      light,
      body,
      -0.4,
      1.1,
      -0.25,
    );
    blade.rotation.z = -0.45;
  }
  const motion = createOperatorMotion();
  root.name = "operator";
  body.name = "operator-rig";
  return {
    root,
    motion,
    get pose() {
      return motion.pose;
    },
    animate(c, t, options) {
      const pose = motion.update(c, t, options);
      root.position.set(c.x, c.y, c.z);
      // Controller yaw already follows the velocity, independent of orbit yaw.
      root.rotation.y = c.yaw;
      body.rotation.set(pose.pitch, 0, pose.bank);
      body.position.y = pose.bob;
      head.rotation.y = pose.head;
      limbs.forEach(({ leg, arm, knee, elbow, side }, i) => {
        leg.rotation.x = pose.legs[i];
        knee.rotation.x = pose.knees[i];
        arm.rotation.x = pose.arms[i];
        elbow.rotation.x = pose.elbows[i];
        arm.rotation.z = -side * pose.spread;
      });
      for (const flame of exhausts) {
        flame.visible = pose.exhaust > 0;
        flame.scale.y = pose.exhaust;
      }
    },
  };
}
