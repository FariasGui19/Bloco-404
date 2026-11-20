import assert from "node:assert/strict";
import { createOperatorMotion } from "../js/dimension/operator-motion.js";
import { createCameraMotion } from "../js/dimension/camera-motion.js";
import { createOperator } from "../js/dimension/operator.js";
import * as T from "../js/vendor/three.module.js";
const base = {
  x: 0,
  y: 5,
  z: 0,
  vx: 0,
  vy: 0,
  vz: 0,
  yaw: 0,
  speed: 0,
  grounded: true,
  flying: false,
  boating: false,
  mode: "TERRA",
};
const m = createOperatorMotion();
let time = 0;
function sample(changes = {}, options) {
  const c = { ...base, ...changes },
    before = JSON.stringify(c);
  for (let i = 0; i < 120; i++) m.update(c, (time += 1 / 120), options);
  assert.equal(
    JSON.stringify(c),
    before,
    "presentation cannot mutate simulation",
  );
  return structuredClone(m.pose);
}
assert.equal(sample().state, "idle");
const walk = sample({ speed: 7, vz: 7 });
assert.equal(walk.state, "walk");
assert(Math.abs(walk.legs[0] - walk.legs[1]) > 0.01);
assert(walk.knees.some((n) => n > 0));
assert.equal(sample({ grounded: false, vy: 8 }).state, "rise");
assert.equal(sample({ grounded: false, vy: -8 }).state, "fall");
assert.equal(sample({ boating: true }).state, "boat");
assert.equal(sample({ mode: "ESCALADA", speed: 2 }).state, "climb");
assert.equal(
  sample({ mode: "SUBMERSO", grounded: false, speed: 5 }).state,
  "swim",
);
const flight = sample({ flying: true, grounded: false, speed: 25 });
assert.equal(flight.state, "flight");
assert(flight.exhaust > 1 && flight.pitch > 0.5);
assert.equal(sample().exhaust, 0, "no jets while idle");
const wrap = createOperatorMotion();
wrap.update({ ...base, flying: true, yaw: Math.PI - 0.001 }, 0);
const wp = wrap.update(
  { ...base, flying: true, yaw: -Math.PI + 0.001 },
  1 / 60,
);
assert(Math.abs(wp.bank) < 0.03, "yaw wrap is not a violent bank");
const freeze = createOperatorMotion();
freeze.update(base, 2);
const snapshot = JSON.stringify(freeze.pose);
freeze.update(base, 2);
assert.equal(
  JSON.stringify(freeze.pose),
  snapshot,
  "no motion on a paused visual clock",
);
const reduced = sample({ flying: true, speed: 20 }, { reducedMotion: true });
assert(Math.abs(reduced.bank) < 1e-6);
assert.equal(reduced.bob, 0);
assert.equal(reduced.head, 0);
assert(
  reduced.pitch > 0.1,
  "essential locomotion is not frozen by reduced motion",
);
const camera = createCameraMotion();
for (let i = 0; i < 180; i++)
  camera.update(
    { ...base, flying: true, speed: 100, vx: 100, vy: 100 },
    1 / 60,
  );
assert(
  camera.value.fov <= 63 &&
    camera.value.distance <= 1.6 &&
    camera.value.lookX <= 2 &&
    camera.value.lookY <= 1.85,
);
for (let i = 0; i < 300; i++)
  camera.update({ ...base, flying: true, speed: 100, vx: 100 }, 1 / 60, {
    reducedMotion: true,
  });
assert(
  Math.abs(camera.value.fov - 58) < 1e-5 && Math.abs(camera.value.lookX) < 1e-5,
);
for (const archetype of [
  "nucleo_dez_forma",
  "mare_astral",
  "lamina_dominio_anciao",
  "motor_bio_forja",
]) {
  const operator = createOperator({ archetype });
  const controller = {
    ...base,
    flying: archetype === "nucleo_dez_forma",
    grounded: false,
    speed: 12,
  };
  for (let i = 0; i < 120; i++) operator.animate(controller, i / 60);
  operator.root.traverse((o) => {
    for (const v of [
      ...o.position,
      ...o.rotation.toArray().slice(0, 3),
      ...o.scale,
    ])
      assert(Number.isFinite(v));
  });
  let nearest = false;
  operator.root.traverse((o) => {
    if (o.material?.map) {
      assert.equal(o.material.map.magFilter, T.NearestFilter);
      nearest = true;
    }
  });
  assert(nearest);
  assert.equal(operator.root.position.y, controller.y);
  assert.equal(operator.root.rotation.y, controller.yaw);
}
console.log(
  "Dimension motion: distinct blended locomotion, articulated limbs, paused clock, yaw wrap, bounded camera, explicit reduced motion and four operator rigs OK.",
);
