import assert from "node:assert/strict";
import { samplePerformance } from "../js/dimension/operator-performance.js";
import { sampleFelineProfile } from "../js/dimension/feline-profile.js";
import { createOperator } from "../js/dimension/operator.js";
import { createOperatorActions } from "../js/dimension/operator-actions.js";
const action = (id, u = 0.5) => ({ id, duration: 1, remaining: 1 - u });
const sample = (id, kind, u) => samplePerformance(action(id, u), kind, 0);
const idle = sampleFelineProfile(sample(null, "veloz", 1), 0);
const running = sampleFelineProfile(sample(null, "veloz", 1), 8);
const attack = sampleFelineProfile(sample("basic", "veloz", 0.43), 8);
assert(running.width < idle.width);
assert(attack.width > idle.width && attack.mane > 1 && attack.jaw > 0);
assert(attack.height < 1.1 && attack.width < 1.2, "bounded visual phenotype");
assert.deepEqual(
  sampleFelineProfile(sample("basic", "veloz", 1), 0),
  idle,
  "full recovery",
);
assert(
  sampleFelineProfile(sample("basic", "veloz", 0.43), 8, true).width <
    attack.width,
);
for (const id of ["select", "transform", "interact"]) {
  const poses = ["ancient", "bio", "mare"].map((kind) => sample(id, kind));
  assert.notDeepEqual(poses[0].arms, poses[1].arms);
  assert.notDeepEqual(poses[1].armYaw, poses[2].armYaw);
  if (id === "interact")
    for (const p of poses)
      assert(!p.attack && !p.trail, "interaction is not an attack");
}
const c = { x: 0, y: 0, z: 0, yaw: 0, grounded: true, speed: 8, mode: "TERRA" };
const feline = createOperator(
  { archetype: "nucleo_dez_forma" },
  { nucleoForm: "forma_veloz" },
);
const before = JSON.stringify(c);
feline.animate(c, 0, { action: action("basic", 0.43) });
assert(feline.root.getObjectByName("alien-lion-mane"));
assert(feline.root.getObjectByName("feline-jaw").rotation.x > 0);
assert.equal(JSON.stringify(c), before);
assert.equal(feline.root.userData.identity.form, "forma_veloz");
feline.animate(c, 1);
assert.equal(feline.root.getObjectByName("feline-jaw").rotation.x, 0);
const ancient = createOperator(
  { archetype: "lamina_dominio_anciao" },
  { equippedSuit: "dominio" },
);
ancient.animate({ ...c, speed: 0 }, 0);
const sword = ancient.root.getObjectByName("ancestral-sword");
assert.equal(sword.scale.y, 1);
assert.equal(ancient.root.getObjectByName("energy-blade").scale.y, 0.88);
ancient.animate(c, 1, { action: action("basic") });
assert.equal(sword.scale.y, 1, "grip never stretches");
const state = {
  progress: { archetype: "mare_astral" },
  player: { energy: 50 },
};
const actions = createOperatorActions(state),
  snapshot = JSON.stringify(state);
actions.select();
assert.equal(actions.action.id, "select");
assert.equal(JSON.stringify(state), snapshot);
assert.equal(
  actions.presentInteraction(),
  false,
  "do not overwrite an active gesture",
);
actions.update(1);
assert(actions.presentInteraction());
assert.equal(actions.action.id, "interact");
assert.equal(state.player.energy, 50);
console.log(
  "Arrival polish: distinct archetype T/R/E, non-combat interaction, fixed sword grip, bounded feline aggression/recovery, reduced motion and unchanged native state OK.",
);
