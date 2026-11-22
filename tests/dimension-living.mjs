import assert from "node:assert/strict";
import {
  samplePerformance,
  poseCurve,
} from "../js/dimension/operator-performance.js";
import { sampleCreatureGait } from "../js/dimension/operator-gait.js";
import { createOperator } from "../js/dimension/operator.js";
const at = (kind, u, extra = {}) =>
  samplePerformance(
    { id: "basic", duration: 1, remaining: 1 - u, ...extra },
    kind,
    0,
    false,
  );
for (const kind of ["human", "ancient", "bio", "mare", "brute", "veloz"]) {
  const stages = [0.15, 0.48, 0.85].map((u) => at(kind, u));
  assert.equal(stages[0].beat, "anticipation");
  assert.equal(stages[2].beat, "recovery");
  assert.notDeepEqual(stages[0].arms, stages[1].arms);
  assert(
    stages.some(
      (p) => p.knees.some(Math.abs) && p.legs.some(Math.abs) && p.headYaw,
    ),
  );
  for (let i = 1; i < 1000; i++) {
    const a = at(kind, i / 1000),
      b = at(kind, (i - 1) / 1000);
    for (const key of ["arms", "legs", "knees", "elbows"])
      for (let j = 0; j < 2; j++)
        assert(
          Math.abs(a[key][j] - b[key][j]) < 0.07,
          `${kind} ${key} continuous`,
        );
  }
  assert.equal(at(kind, 1).weight, 0);
  assert.notDeepEqual(
    at(kind, 0.45, { id: "transform" }).arms,
    at(kind, 0.45, { id: "transform", returning: true }).arms,
  );
}
assert.equal(
  poseCurve(0.5, [
    [0, 0],
    [1, 1],
  ]),
  0.5,
);
assert(
  at("brute", 0.35).arms[1] < at("brute", 0.66).arms[1],
  "hammer raised before falling",
);
const idle = sampleCreatureGait(0.4, 0);
assert(idle.legs.every((x) => x === 0));
const gait = sampleCreatureGait(0.4, 8);
assert.notEqual(gait.arms[0], gait.legs[0]);
assert.notDeepEqual(gait.arms, sampleCreatureGait(1, 8).arms);
const controller = {
  x: 0,
  y: 0,
  z: 0,
  yaw: 0,
  speed: 4,
  grounded: true,
  mode: "TERRA",
};
for (const [id, kind, suit] of [
  ["motor_bio_forja", "bio", "bio_forja"],
  ["mare_astral", "mare", "mare"],
  ["lamina_dominio_anciao", "ancient", "dominio"],
]) {
  const civil = createOperator({ archetype: id });
  const equipped = createOperator({ archetype: id }, { equippedSuit: suit });
  const options = { action: { id: "basic", duration: 1, remaining: 0.55 } };
  civil.animate(controller, 1, options);
  equipped.animate(controller, 1, options);
  assert.equal(civil.root.userData.performance.identity, kind);
  assert.equal(civil.root.userData.performance.civilian, true);
  assert.equal(civil.root.getObjectByName("energy-blade").visible, false);
  assert.notDeepEqual(
    samplePerformance(options.action, kind, 1, false, true).arms,
    samplePerformance(options.action, kind, 1, false, false).arms,
  );
  const wrist = equipped.root.getObjectByName("weapon-wrist");
  assert(wrist && wrist.rotation.x !== 0);
}
const swift = createOperator(
  { archetype: "nucleo_dez_forma" },
  { nucleoForm: "forma_veloz" },
);
swift.animate(controller, 1);
assert.equal(swift.root.userData.performance.gait, "four-beat");
swift.animate({ ...controller, grounded: false, vy: 1 }, 1.05);
assert.notEqual(swift.root.userData.performance.gait, "four-beat");
console.log(
  "Living: continuous three-beat full-body actions, return choreography, civil identities, weapon wrist and independent grounded creature gait OK.",
);
