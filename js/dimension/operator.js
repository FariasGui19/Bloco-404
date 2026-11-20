import * as T from "../vendor/three.module.js";
import { profileFor } from "./sector-data.js";
export function createOperator(progress) {
  const p = profileFor(progress),
    root = new T.Group(),
    body = new T.Group();
  root.add(body);
  const suit = new T.MeshLambertMaterial({ color: p.color, flatShading: true });
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
  const limbs = [];
  for (const side of [-1, 1]) {
    const leg = new T.Group();
    leg.position.set(side * 0.18, 0.87, 0);
    body.add(leg);
    part(new T.CylinderGeometry(0.12, 0.1, 0.55, 5), dark, leg, 0, -0.28, 0);
    part(new T.DodecahedronGeometry(0.16), suit, leg, 0, -0.6, 0.08, 1, 1, 1.5);
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
    part(new T.CylinderGeometry(0.1, 0.13, 0.52, 5), dark, arm, 0, -0.28, 0);
    part(new T.DodecahedronGeometry(0.13), suit, arm, 0, -0.55, 0);
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
        leg,
        0,
        -0.52,
        -0.15,
      ).rotation.x = -0.9;
    }
    limbs.push({ leg, arm, side });
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
  let previousYaw = 0,
    previousTime = 0,
    bank = 0;
  return {
    root,
    animate(c, t) {
      const dt = Math.max(0.001, t - previousTime),
        turn = Math.atan2(
          Math.sin(c.yaw - previousYaw),
          Math.cos(c.yaw - previousYaw),
        );
      const desiredBank = c.flying
        ? Math.max(-0.45, Math.min(0.45, (-turn / dt) * 0.08))
        : 0;
      bank += (desiredBank - bank) * (1 - Math.exp(-dt * 7));
      previousYaw = c.yaw;
      previousTime = t;
      root.position.set(c.x, c.y, c.z);
      root.rotation.y = c.yaw;
      const flying = c.flying,
        swim = c.mode === "NADO" || c.mode === "SUBMERSO";
      body.rotation.x = flying
        ? Math.min(0.5, c.speed * 0.018)
        : swim
          ? 0.65
          : 0;
      body.rotation.z = bank;
      body.position.y = c.grounded
        ? Math.abs(Math.sin(t * 9)) * 0.035 * Math.min(1, c.speed / 3)
        : 0;
      for (const { leg, arm, side } of limbs) {
        leg.rotation.x = flying
          ? 0.22
          : Math.sin(t * (swim ? 5 : 10) + (side * Math.PI) / 2) *
            Math.min(0.65, c.speed * 0.1);
        arm.rotation.x = flying ? -0.6 : -leg.rotation.x * 0.7;
        arm.rotation.z = flying ? -side * 0.6 : side * 0.12;
      }
      body.traverse((o) => {
        if (o.userData.exhaust) {
          o.visible = flying;
          o.scale.y = 0.75 + Math.sin(t * 35) * 0.25;
        }
      });
    },
  };
}
