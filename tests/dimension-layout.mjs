import assert from "node:assert/strict";
import * as T from "../js/vendor/three.module.js";
import { createSector } from "../js/dimension/sector-scene.js";
import {
  SECTOR_LAYOUT,
  SOLIDS,
  PLATFORMS,
  blocked,
  groundAt,
  terrainHeight,
  PIER_RAMP,
  pierRampHeight,
} from "../js/dimension/sector-data.js";
import {
  createSectorLayout,
  routeClearance,
  navigationBearing,
} from "../js/dimension/sector-layout.js";
import { SpatialController } from "../js/dimension/controller.js";
import { createSectorMaterials } from "../js/dimension/sector-materials.js";
import { cylinder } from "../js/dimension/sector-meshes.js";
const state = () => ({
  player: { energy: 100, maxEnergy: 100 },
  progress: {
    archetype: "nucleo_dez_forma",
    flags: {},
    inventory: ["echo"],
    archetypeProgress: { nucleo_dez_forma: { level: 1 } },
  },
});
assert.deepEqual(
  createSectorLayout(terrainHeight),
  SECTOR_LAYOUT,
  "authored density stays deterministic",
);
assert.equal(
  new Set(SECTOR_LAYOUT.props.map((p) => p.id)).size,
  SECTOR_LAYOUT.props.length,
);
assert(
  SECTOR_LAYOUT.props.length >= 150 && SECTOR_LAYOUT.props.length < 230,
  "intentional bounded density, not infinite random scatter",
);
for (const p of SECTOR_LAYOUT.props) {
  assert(Number.isFinite(p.y));
  assert.equal(p.y, terrainHeight(p.x, p.z));
  if (p.type !== "waystone")
    assert(
      routeClearance(p.x, p.z) > 0,
      "new scenery stays outside protected route buffers",
    );
}
// Spatial broadphase must reproduce the exact previous AABB predicate for all bodies.
const bodies = [...SOLIDS, ...PLATFORMS];
let seed = 404;
const rand = () =>
  (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
for (let i = 0; i < 10000; i++) {
  const x = rand() * 150 - 75,
    z = rand() * 150 - 75,
    y = rand() * 60 - 10,
    r = 0.2 + rand(),
    h = 0.5 + rand() * 3;
  const expected = bodies.some(
    (b) =>
      Math.abs(x - b.x) < b.w / 2 + r &&
      Math.abs(z - b.z) < b.d / 2 + r &&
      y < b.top - 0.05 &&
      y + h > b.bottom + 0.05,
  );
  assert.equal(
    blocked(x, y, z, r, h),
    expected,
    "broadphase cannot drop negative-grid or cross-cell bodies",
  );
}
for (const body of SECTOR_LAYOUT.colliders)
  assert(
    blocked(body.x, body.bottom + 0.1, body.z),
    `${body.id} has a physical solid`,
  );
const held = (...names) => ({ keys: new Set(names), pressed: new Set() });
// Traverse every authored foot route using the unchanged controller, not teleport BFS.
for (const route of SECTOR_LAYOUT.routes.filter((r) => r.mode === "walk")) {
  const c = new SpatialController(state()),
    [sx, sz] = route.points[0];
  c.x = sx;
  c.z = sz;
  c.y = groundAt(sx, sz);
  for (const [x, z] of route.points.slice(1)) {
    let frames = 0;
    for (; frames < 4000 && Math.hypot(c.x - x, c.z - z) > 0.6; frames++)
      c.step(1 / 120, held("KeyW"), Math.atan2(c.x - x, c.z - z));
    assert(
      frames < 4000,
      `${route.id}: reaches ${x},${z} without flight/jump/forced climb`,
    );
  }
  if (route.id === "arrival-harbor")
    assert.equal(
      c.y,
      5.3,
      "ramp connects the original pier deck without changing jump height",
    );
}
assert.equal(
  pierRampHeight(-16, PIER_RAMP.startZ),
  terrainHeight(-16, PIER_RAMP.startZ),
);
assert.equal(pierRampHeight(-16, PIER_RAMP.endZ), 5.3);
// All six old platform gaps remain jumpable, with the original gravity/impulse.
const platforms = PLATFORMS.filter((p) => p.id.startsWith("ruin-")),
  jumper = new SpatialController(state());
Object.assign(jumper, {
  x: platforms[0].x,
  z: platforms[0].z,
  y: platforms[0].top,
});
for (let i = 1; i < platforms.length; i++) {
  const target = platforms[i],
    previous = platforms[i - 1];
  let n = 0;
  while (
    Math.hypot(jumper.x - previous.x, jumper.z - previous.z) < 1.7 &&
    n++ < 1000
  )
    jumper.step(
      1 / 120,
      held("KeyW"),
      Math.atan2(jumper.x - target.x, jumper.z - target.z),
    );
  jumper.step(
    1 / 120,
    { keys: new Set(["KeyW"]), pressed: new Set(["Space"]) },
    Math.atan2(jumper.x - target.x, jumper.z - target.z),
  );
  for (n = 0; n < 1000; n++) {
    jumper.step(
      1 / 120,
      held("KeyW"),
      Math.atan2(jumper.x - target.x, jumper.z - target.z),
    );
    if (
      jumper.grounded &&
      Math.hypot(jumper.x - target.x, jumper.z - target.z) < 0.6
    )
      break;
  }
  assert(n < 1000, `jump reaches ${target.id}`);
  assert.equal(jumper.y, target.top);
}
// Protected sea paths do not require driving the boat over new props or dry land.
for (const route of SECTOR_LAYOUT.routes.filter((r) => r.mode === "water"))
  for (let i = 1; i < route.points.length; i++)
    for (let t = 0; t <= 1; t += 0.025) {
      const a = route.points[i - 1],
        b = route.points[i],
        x = a[0] + (b[0] - a[0]) * t,
        z = a[1] + (b[1] - a[1]) * t;
      assert(terrainHeight(x, z) < -0.8, `${route.id}: navigable water`);
      assert(!blocked(x, 0.65, z), `${route.id}: no submerged blocking props`);
    }
const flight = SECTOR_LAYOUT.routes.find((r) => r.mode === "flight");
for (const [x, z] of flight.points) assert(!blocked(x, flight.altitude, z));
assert(Math.abs(navigationBearing(0, 0, 0, { x: 0, z: -10 }).delta) < 1e-8);
const world = createSector();
assert.equal(world.landmarks.roots.size, 5);
for (const poi of world.layout.pois) {
  const root = world.landmarks.roots.get(poi.id);
  assert(root && root.userData.poi === poi);
  assert(poi.hooks.lore);
  if (["limiar.anchor", "limiar.ruins", "limiar.lighthouse"].includes(poi.id))
    assert(poi.hooks.progression);
}
const bodyIds = new Set(world.cameraSolids.map((p) => p.userData.bodyId));
for (const b of bodies)
  assert(bodyIds.has(b.id), "every physical body has a camera proxy");
assert(
  world.cameraSolids
    .filter((m) => m.userData.cameraOnly)
    .every((m) => !m.visible),
  "no visible collision boxes after batching",
);
const m = createSectorMaterials();
assert.equal(m.textures.length, 3);
assert(
  m.textures.every(
    (t) =>
      t.magFilter === T.NearestFilter &&
      t.minFilter === T.NearestFilter &&
      t.colorSpace === T.SRGBColorSpace,
  ),
);
assert(
  m.textures.reduce((n, t) => n + t.image.data.byteLength, 0) < 256 * 1024,
);
const wall = cylinder(new T.Group(), m.masonry, 2.5, 2.5, 20, 0, 0, 0);
const vs = Array.from(wall.geometry.attributes.uv.array).filter(
  (_, i) => i % 2,
);
assert(
  Math.max(...vs) >= 10,
  "lighthouse masonry repeats by metre, not stretched to tower height",
);
let lights = 0;
world.scene.traverse((o) => {
  if (o.isLight) lights++;
});
assert.equal(lights, 4, "emissive lanterns do not add point lights");
assert.deepEqual(state().progress.flags, {});
assert.equal(
  state().progress.archetypeProgress.nucleo_dez_forma.level,
  1,
  "POI hooks are metadata, not an early level-2 reward",
);
console.log(
  "Limiar step 2: deterministic POIs/density, indexed solids, all foot/sea routes, six platform jumps, pier ramp, shared nearest materials, camera proxies and passive lore hooks OK.",
);
