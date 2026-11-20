import assert from "node:assert/strict";
import { DimensionManager } from "../js/dimension/dimension-manager.js";
import { SpatialController } from "../js/dimension/controller.js";
import {
  terrainHeight,
  groundAt,
  SECTOR,
  profileFor,
} from "../js/dimension/sector-data.js";
const makeState = (archetype = "nucleo_dez_forma") => ({
  world: { currentMapId: "hub_saguao" },
  player: {
    x: 12,
    y: 14,
    facing: "left",
    health: 77,
    maxHealth: 100,
    energy: 100,
    maxEnergy: 100,
  },
  progress: {
    archetype,
    inventory: [{ id: "echo" }],
    archetypeProgress: { [archetype]: { level: 3 } },
    flags: {},
  },
});
const state = makeState();
let disposed = 0,
  steps = 0;
const inventory = state.progress.inventory,
  player = state.player,
  progress = state.progress;
const manager = new DimensionManager({
  state,
  createWorld: async () => ({
    frame() {
      steps++;
    },
    dispose() {
      disposed++;
    },
  }),
});
assert(await manager.enter());
assert.equal(manager.mode, "entering");
assert.equal(await manager.enter(), false);
for (let i = 0; i < 40; i++) manager.tick(0.05);
assert.equal(manager.mode, "3d");
assert(steps > 0);
state.player.energy = 42;
state.player.health = 62;
state.progress.flags.dimensionalAnchorStabilized = true;
manager.exit();
for (let i = 0; i < 14; i++) manager.tick(0.05);
assert.equal(manager.mode, "2d");
assert.equal(disposed, 1);
assert.equal(state.world.dimensionActive, false);
assert.equal(state.player, player);
assert.equal(state.progress, progress);
assert.equal(state.progress.inventory, inventory);
assert.deepEqual(
  [state.player.x, state.player.y, state.player.health, state.player.energy],
  [12, 14, 62, 42],
);
assert.equal(state.world.currentMapId, "hub_saguao");
const failed = new DimensionManager({
  state,
  createWorld: async () => {
    throw new Error("WebGL ausente");
  },
});
assert.equal(await failed.enter(), false);
assert.equal(failed.mode, "2d");
assert.equal(failed.error, "WebGL ausente");
let resolve;
const late = new DimensionManager({
  state,
  createWorld: () => new Promise((r) => (resolve = r)),
});
const entering = late.enter();
late.exit();
resolve({
  dispose() {
    disposed++;
  },
});
assert.equal(await entering, false);
assert.equal(late.mode, "2d");
assert.equal(disposed, 2);
const denied = new DimensionManager({
  state,
  canEnter: () => false,
  createWorld: () => {
    throw Error("not called");
  },
});
assert.equal(await denied.enter(), false);
const tick = (c, seconds, keys = [], pressed = []) => {
  for (let i = 0; i < seconds * 120; i++)
    c.step(
      1 / 120,
      { keys: new Set(keys), pressed: new Set(i === 0 ? pressed : []) },
      0,
    );
};
const c = new SpatialController(makeState());
const initial = c.z;
tick(c, 1, ["KeyW"]);
assert(c.z < initial - 5);
const ground = c.y;
tick(c, 0.2, [], ["Space"]);
assert(c.y > ground + 0.6);
tick(c, 2);
assert(c.grounded);
assert(Math.abs(c.y - groundAt(c.x, c.z, c.y + 0.3)) < 0.05);
tick(c, 0.1, ["Space"], ["KeyF"]);
assert(c.flying);
const flightStart = c.y;
tick(c, 2, ["Space", "KeyW", "ShiftLeft"]);
assert(c.y > flightStart + 10);
assert(c.state.player.energy < 100);
tick(c, 20, ["Space"]);
assert(c.y <= SECTOR.ceiling);
tick(c, 15, ["ControlLeft"]);
assert(c.y >= terrainHeight(c.x, c.z));
const noFly = new SpatialController(makeState("mare_astral"));
tick(noFly, 0.1, [], ["KeyF"]);
assert(!noFly.flying);
const swim = new SpatialController(makeState("mare_astral"));
Object.assign(swim, { x: 90, z: 80, y: -0.6, grounded: false });
tick(swim, 1, ["ControlLeft"]);
assert(swim.y < -3);
assert.equal(swim.mode, "SUBMERSO");
tick(swim, 2, ["Space"]);
assert(swim.y > -0.5);
const surface = new SpatialController(makeState("motor_bio_forja"));
Object.assign(surface, { x: 90, z: 80, y: -0.6, grounded: false });
tick(surface, 2, ["ControlLeft"]);
assert(surface.y >= -0.65);
const boat = new SpatialController(makeState());
Object.assign(boat, { x: -16, z: 70, y: 0.65, boating: true });
tick(boat, 4, ["KeyW"]);
assert(boat.z > 60, "boat cannot drive inland");
assert(terrainHeight(boat.x, boat.z) < -0.8);
const solid = new SpatialController(makeState());
Object.assign(solid, {
  x: 40,
  z: -15,
  y: terrainHeight(40, -15) + 1,
  flying: true,
  grounded: false,
});
tick(solid, 2, ["KeyW"]);
assert(solid.z >= -17.7, "lighthouse wall blocks a flying capsule");
const cliffs = [];
for (const climbing of [false, true]) {
  const climber = new SpatialController(makeState("motor_bio_forja"));
  Object.assign(climber, { x: -32, z: 2, y: terrainHeight(-32, 2) });
  tick(climber, 3, climbing ? ["KeyW", "KeyE"] : ["KeyW"]);
  cliffs.push(climber);
}
assert(
  cliffs[1].y > cliffs[0].y + 4,
  "cliff needs deliberate climbing, not normal walking",
);
assert(profileFor({ archetype: "unknown" }).name);
console.log(
  "Dimension: transactional entry/exit/failure/cancel, shared state, terrestrial jump, flight, sea/dive, boat and wall collision OK.",
);
