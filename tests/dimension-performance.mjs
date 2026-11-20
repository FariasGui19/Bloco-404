import assert from "node:assert/strict";
import * as T from "../js/vendor/three.module.js";
import { createOperator } from "../js/dimension/operator.js";
import {
  samplePerformance,
  facialSample,
} from "../js/dimension/operator-performance.js";
import { createOperatorActions } from "../js/dimension/operator-actions.js";
const c = {
  x: 0,
  y: 0,
  z: 0,
  yaw: 0,
  speed: 0,
  vx: 0,
  vy: 0,
  vz: 0,
  grounded: true,
  mode: "TERRA",
};
const action = (id, u = 0.5) => ({ id, duration: 1, remaining: 1 - u });
const attack = samplePerformance(action("golpe_ruptura"), "ancient"),
  scan = samplePerformance(action("postura_dominio"), "ancient"),
  transform = samplePerformance(action("transform"));
assert(
  attack.attack &&
    Math.abs(attack.twist) > 0.1 &&
    attack.knees.some((v) => v > 0.01),
);
assert(scan.scan && !scan.attack && scan.read > 0);
assert(transform.transform && !transform.attack && transform.assembly < 1);
assert.notDeepEqual(attack.arms, scan.arms);
assert.notDeepEqual(
  samplePerformance(action("bio_dash"), "bio"),
  samplePerformance(action("passo_corrente"), "mare"),
);
assert.equal(facialSample(3.65).blink, 1);
assert.equal(facialSample(3.65, 1, true).blink, 0);
assert(facialSample(0, 1).mouth > facialSample(0).mouth);
const all = [];
for (const form of [null, "forma_veloz", "forma_bruta"]) {
  const rig = createOperator(
    { archetype: "nucleo_dez_forma" },
    { nucleoForm: form },
  );
  rig.animate(c, 0);
  rig.root.updateMatrixWorld(true);
  const model = rig.root.userData.identity.model;
  assert.equal(
    model,
    form === "forma_veloz"
      ? "veloz"
      : form === "forma_bruta"
        ? "brute"
        : "human",
  );
  assert.equal(
    !!rig.root.getObjectByName("sculpted-face"),
    !form,
    "no human portrait pasted over a transformed head",
  );
  if (form === "forma_bruta")
    assert(rig.root.getObjectByName("industrial-hammer"));
  const bounds = new T.Box3();
  let triangles = 0,
    calls = 0;
  const textures = new Set();
  rig.root.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material])
      if (m?.map) {
        assert.equal(m.map.magFilter, T.NearestFilter);
        textures.add(m.map);
      }
    for (let p = o; p; p = p.parent) if (!p.visible) return;
    o.geometry.computeBoundingBox();
    bounds.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
    triangles +=
      (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
    calls += Array.isArray(o.material) ? o.geometry.groups.length : 1;
  });
  assert(triangles < 7100 && calls < 55);
  assert.equal(textures.size, form ? 1 : 3);
  all.push({
    form,
    model,
    height: bounds.getSize(new T.Vector3()).y,
    width: bounds.getSize(new T.Vector3()).x,
    triangles,
    calls,
  });
  for (const id of ["forma_veloz", "eco_scan", "transform", "select"])
    for (let i = 0; i < 20; i++)
      rig.animate(c, i / 60, { action: action(id, i / 20) });
  rig.animate(c, 2, { action: null });
  assert.equal(rig.root.userData.performance.action, null);
  assert(
    !rig.root.getObjectByName("energy-trail").visible,
    "trail clears on recovery/return",
  );
}
assert(
  Math.abs(all[1].height - all[0].height) > 0.15,
  "Veloz silhouette differs in height",
);
assert(
  all[2].width > all[0].width * 1.2,
  "industrial form is substantially broader",
);
const base = createOperator({ archetype: "nucleo_dez_forma" });
base.animate(c, 3.65);
assert(base.root.userData.performance.blink > 0.99);
assert(base.root.getObjectByName("eyelid").visible);
base.animate(c, 3.7, { reducedMotion: true });
assert(!base.root.getObjectByName("eyelid").visible);
const state = {
  player: { energy: 100 },
  progress: {
    archetype: "nucleo_dez_forma",
    abilities: ["forma_veloz", "eco_scan"],
    flags: {},
    inventory: [],
    archetypeProgress: { nucleo_dez_forma: { level: 1 } },
  },
};
const native = createOperatorActions(state);
native.select();
assert.equal(native.action.id, "select");
assert.deepEqual(
  native.available().map((f) => f.id),
  ["forma_veloz"],
);
assert(native.transform());
assert.equal(native.action.from, null);
assert.equal(native.action.to, "forma_veloz");
for (let i = 0; i < 90; i++) native.update(1 / 60);
state.player.nucleoRuntime.remaining = 0.001;
native.update(0.02);
assert.equal(state.player.nucleoForm, null);
assert.equal(
  native.action.id,
  "transform",
  "expiry also produces clean visual return",
);
const progressed = {
  player: { energy: 100 },
  progress: {
    archetype: "nucleo_dez_forma",
    abilities: ["forma_veloz"],
    flags: {},
    archetypeProgress: { nucleo_dez_forma: { level: 4 } },
  },
};
const unlocked = createOperatorActions(progressed);
assert.equal(unlocked.available().length, 2);
unlocked.select();
unlocked.select();
assert.equal(unlocked.selected, "forma_bruta");
assert(unlocked.transform());
assert.equal(progressed.player.nucleoForm, "forma_bruta");
assert.equal(progressed.progress.archetypeProgress.nucleo_dez_forma.level, 4);
console.log(
  "Performance 3B.2: distinct real form silhouettes, facial micro-rig, full-body choreography, reset, native selection/expiry and level gating OK.",
  all,
);
