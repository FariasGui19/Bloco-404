import assert from "node:assert/strict";
import { createOperator, OPERATOR_STYLES } from "../js/dimension/operator.js";
import { createOperatorActions } from "../js/dimension/operator-actions.js";
import { SpatialController } from "../js/dimension/controller.js";
import { ARCHETYPE_KITS } from "../js/data/archetype-kits.js";
const make = (archetype = "nucleo_dez_forma") => ({
  player: { energy: 100, maxEnergy: 100 },
  progress: {
    archetype,
    abilities: Object.values(ARCHETYPE_KITS[archetype]).filter(Boolean),
    flags: {},
    inventory: [],
    archetypeProgress: { [archetype]: { level: 1, xp: 0 } },
  },
});
for (const id of Object.keys(OPERATOR_STYLES)) {
  const state = make(id),
    a = createOperatorActions(state),
    c = new SpatialController(state),
    rig = createOperator(state.progress, state.player);
  assert(
    rig.root.userData.identity.glasses &&
      rig.root.userData.identity.moustache &&
      rig.root.userData.identity.tattoos,
  );
  assert.equal(rig.root.userData.identity.bracelet, id === "nucleo_dez_forma");
  const energy = state.player.energy;
  assert(a.trigger("primary", c));
  assert(state.player.energy < energy);
  assert(!a.trigger("primary", c), "no spamming");
  for (let i = 0; i < 60; i++) {
    a.update(1 / 60);
    rig.animate(c, i / 60, { action: a.action });
  }
  assert.equal(a.action.remaining, 0);
  state.player.energy = 0;
  assert(!a.trigger("secondary", c), "no free skills");
  assert.deepEqual(state.progress.flags, {});
  assert.deepEqual(state.progress.inventory, []);
}
const s = make(),
  a = createOperatorActions(s),
  c = new SpatialController(s);
assert.deepEqual(
  a.available().map((f) => f.id),
  ["forma_veloz"],
  "no level2 unlock from the sandbox",
);
a.select();
assert.equal(a.selected, "forma_veloz");
assert(a.transform());
assert.equal(s.player.nucleoForm, "forma_veloz");
for (let i = 0; i < 90; i++) a.update(1 / 60);
assert(
  s.player.nucleoRuntime.remaining < 30 && s.player.nucleoRuntime.remaining > 0,
  "native form timer advances while 2D is paused",
);
assert(a.transform());
assert.equal(s.player.nucleoForm, null);
for (let i = 0; i < 90; i++) a.update(1 / 60);
assert(!a.transform(), "native recharge respected");
const denied = make();
denied.progress.abilities = [];
const locked = createOperatorActions(denied);
assert(!locked.transform());
assert(!locked.trigger("primary", new SpatialController(denied)));
const b = make("motor_bio_forja"),
  bio = createOperatorActions(b),
  bc = new SpatialController(b);
const before = [bc.x, bc.z];
assert(bio.trigger("primary", bc));
assert(bc.actionBoost > 0);
for (let i = 0; i < 30; i++)
  bc.step(1 / 120, { keys: new Set(), pressed: new Set() }, 0);
assert(
  Math.hypot(bc.x - before[0], bc.z - before[1]) > 0.2,
  "real collision-aware impulse, not only a flash",
);
assert.equal(bio.transform(), true);
assert.equal(b.player.equippedSuit, "bio_forja");
console.log(
  "Dimension identity: four lvl1 rigs, canonical kit IDs, gated native forms/timers, energy/cooldowns, suit toggle and physical impulse OK.",
);
