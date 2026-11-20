import assert from "node:assert/strict";
import * as T from "../js/vendor/three.module.js";
import { createOperator } from "../js/dimension/operator.js";
import {
  samplePerformance,
  deferAppearance,
} from "../js/dimension/operator-performance.js";
import { createOperatorActions } from "../js/dimension/operator-actions.js";
import { ARCHETYPE_KITS } from "../js/data/archetype-kits.js";
const controller = {
  x: 0,
  y: 0,
  z: 0,
  yaw: 0,
  speed: 0,
  grounded: true,
  mode: "TERRA",
};
const action = (id, u, variant = 0) => ({
  id,
  duration: 1,
  remaining: 1 - u,
  variant,
});
assert(deferAppearance(action("transform", 0.1)));
assert(!deferAppearance(action("transform", 0.3)));
assert(!deferAppearance(action("transform", 0.1), true));
assert.deepEqual(
  [0.1, 0.4, 0.7, 0.95].map(
    (u) => samplePerformance(action("transform", u)).stage,
  ),
  ["converge", "assemble", "release", "settle"],
);
for (const kind of ["ancient", "bio", "mare", "brute", "veloz"]) {
  const poses = [0, 1, 2].map((variant) =>
    samplePerformance(action("golpe_ruptura", 0.55, variant), kind),
  );
  assert(poses.every((p) => p.attack && p.trail > 0));
  assert.notDeepEqual(poses[0].arms, poses[2].arms);
  const reduced = samplePerformance(action("transform", 0.4), kind, 0, true);
  assert.equal(reduced.assembly, 1);
}
const suits = {
  lamina_dominio_anciao: "dominio",
  motor_bio_forja: "bio_forja",
  mare_astral: "mare",
};
for (const [archetype, equippedSuit] of Object.entries(suits)) {
  const rig = createOperator({ archetype }, { equippedSuit });
  rig.animate(controller, 0);
  rig.animate(controller, 0.55, {
    action: action(ARCHETYPE_KITS[archetype].r, 0.55),
  });
  const kind = archetype.startsWith("lamina")
    ? "ancient"
    : archetype.startsWith("motor")
      ? "bio"
      : "mare";
  assert.equal(
    rig.root.getObjectByName("operator-vfx").userData.signature,
    kind,
  );
  if (kind === "ancient") {
    assert(rig.root.getObjectByName("ancestral-sword").visible);
    assert(rig.root.getObjectByName("energy-blade").visible);
  }
  const state = {
    progress: {
      archetype,
      abilities: Object.values(ARCHETYPE_KITS[archetype]),
      flags: {},
      inventory: [],
      archetypeProgress: {},
    },
    player: { energy: 100, equippedSuit },
  };
  const a = createOperatorActions(state);
  assert(a.trigger("signature", controller));
  assert.equal(a.action.variant, 2);
  const energy = state.player.energy;
  assert(!a.trigger("primary", controller));
  assert.equal(state.player.energy, energy);
  a.update(3);
  state.player.energy = 100;
  assert(a.trigger("primary", controller));
  assert.equal(a.action.variant, 0);
  a.update(3);
  state.player.energy = 100;
  assert(a.trigger("primary", controller));
  assert.equal(a.action.variant, 1);
}
const human = createOperator({ archetype: "nucleo_dez_forma" });
human.animate(controller, 0);
const bracelet = human.root.getObjectByName("x10-bracelet");
assert.equal(bracelet.userData.design, "b404-lattice-cartridge");
bracelet.traverse((o) =>
  assert(
    !["CircleGeometry", "TorusGeometry"].includes(o.geometry?.type),
    "no circular/hourglass dial in original bracelet",
  ),
);
const brute = createOperator(
  { archetype: "nucleo_dez_forma" },
  { nucleoForm: "forma_bruta" },
);
brute.animate(controller, 0);
const visibleBounds = (rig) => {
  rig.root.updateMatrixWorld(true);
  const b = new T.Box3();
  rig.root.traverse((o) => {
    if (!o.isMesh) return;
    for (let p = o; p; p = p.parent) if (!p.visible) return;
    o.geometry.computeBoundingBox();
    b.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
  });
  return b;
};
const bh = visibleBounds(brute).getSize(new T.Vector3()).y,
  hh = visibleBounds(human).getSize(new T.Vector3()).y;
assert(bh > hh * 1.2 && bh < 2.6);
assert(visibleBounds(brute).min.y >= -0.02);
const veloz = createOperator(
  { archetype: "nucleo_dez_forma" },
  { nucleoForm: "forma_veloz" },
);
veloz.animate({ ...controller, speed: 12 }, 1);
assert(veloz.root.getObjectByName("locomotion-wake").visible);
veloz.animate({ ...controller, speed: 12 }, 1.1, { reducedMotion: true });
assert(!veloz.root.getObjectByName("locomotion-wake").visible);
veloz.animate(controller, 2);
assert(!veloz.root.getObjectByName("locomotion-wake").visible);
console.log(
  "Surgery: four transform stages, native ability variant costs/cooldowns, distinct signatures, original cartridge, persistent sword, imposing grounded Bruta and reduced-motion wake OK.",
  { humanHeight: hh, bruteHeight: bh },
);
