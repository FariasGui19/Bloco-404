import assert from "node:assert/strict";
import { DimensionManager } from "../js/dimension/dimension-manager.js";
import {
  requestRupture,
  canRequestRupture,
  createRuptureBridge,
  RUPTURE_ID,
} from "../js/dimension/rupture.js";
const make = () => ({
  world: { currentMapId: "mare_cromatica_fenda" },
  player: { x: 4, y: 7, health: 57, energy: 31 },
  progress: {
    archetype: "nucleo_dez_forma",
    level: 8,
    inventory: ["fita"],
    mareCromatica: {
      iniciada: true,
      ancoraEstavel: true,
      desfecho: "parcial",
      restante: 42,
    },
  },
});
const flush = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};
for (const outcome of ["total", "parcial"]) {
  const state = make();
  state.progress.mareCromatica.desfecho = outcome;
  const player = state.player,
    progress = state.progress,
    before = JSON.stringify(state.progress.mareCromatica);
  let eligible = false,
    saves = 0,
    created = 0,
    disposed = 0;
  const phases = [];
  const manager = new DimensionManager({
    state,
    canEnter: () => eligible,
    createWorld: async ({ reason }) => {
      assert.equal(reason, RUPTURE_ID);
      created++;
      return {
        frame() {},
        dispose() {
          disposed++;
        },
      };
    },
  });
  const bridge = createRuptureBridge({
    state,
    manager,
    save: () => saves++,
    emit: (e) => phases.push(e.phase),
  });
  assert(canRequestRupture(state));
  assert(requestRupture(state));
  assert(!requestRupture(state));
  bridge.tick();
  await flush();
  assert.equal(created, 0, "wait for dialogue/menu guards");
  eligible = true;
  bridge.tick();
  bridge.tick();
  await flush();
  assert.equal(created, 1);
  assert.equal(manager.mode, "entering");
  for (let i = 0; i < 40; i++) manager.tick(0.05);
  bridge.tick();
  assert.equal(progress.dimensionalRupture.status, "arrived");
  manager.exit();
  for (let i = 0; i < 20; i++) manager.tick(0.05);
  bridge.tick();
  assert.deepEqual(phases, ["interference", "entering", "arrived", "returned"]);
  assert.equal(disposed, 1);
  assert.equal(saves, 1);
  assert.equal(state.player, player);
  assert.equal(state.progress, progress);
  assert.equal(player.health, 57);
  assert.equal(player.x, 4);
  assert.equal(JSON.stringify(progress.mareCromatica), before);
  assert(!requestRupture(state));
  bridge.tick();
  await flush();
  assert.equal(created, 1, "return does not loop");
}
{
  const state = make();
  const phases = [];
  requestRupture(state);
  const manager = new DimensionManager({
    state,
    createWorld: async () => {
      throw Error("WebGL unavailable");
    },
  });
  const bridge = createRuptureBridge({
    state,
    manager,
    emit: (e) => phases.push(e.phase),
  });
  bridge.tick();
  await flush();
  bridge.tick();
  assert.equal(manager.mode, "2d");
  assert.equal(state.player.health, 57);
  assert.equal(state.world.dimensionActive, false);
  assert.equal(state.progress.dimensionalRupture.status, "unavailable");
  assert(phases.includes("unavailable"));
  assert(requestRupture(state), "explicit retry");
}
for (const changes of [
  { ancoraEstavel: false },
  { desfecho: "colapso" },
  { desfecho: null },
]) {
  const s = make();
  Object.assign(s.progress.mareCromatica, changes);
  assert(!requestRupture(s));
}
const wrong = make();
wrong.world.currentMapId = "mare_cromatica_docas";
assert(!requestRupture(wrong));
console.log(
  "Rupture: mission gating, dialogue guards, idempotent handoff, hooks, unchanged vitals/mission/references, 2D return, WebGL rollback and explicit retry OK.",
);
