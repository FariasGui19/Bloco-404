import assert from "node:assert/strict";
import * as T from "../js/vendor/three.module.js";
import {
  LIMIAR_ENVIRONMENT,
  bakeEnvironment,
  noise2,
} from "../js/dimension/environment-data.js";
import { createSector } from "../js/dimension/sector-scene.js";
import { terrainHeight, rawHeight } from "../js/dimension/sector-data.js";

const flat = (x, z) => x * 0.2 + z * 0.1;
const recipe = {
  ...LIMIAR_ENVIRONMENT,
  albedoSize: 32,
  heightSize: 9,
  bounds: { minX: -8, minZ: -8, sizeX: 16, sizeZ: 16 },
};
const small = bakeEnvironment(flat, recipe);
assert.equal(
  small,
  bakeEnvironment(flat, recipe),
  "same source/immutable recipe reuses the CPU bake",
);
assert.equal(small.bytes, 32 * 32 * 4 + 9 * 9 * 4 * 5);
assert.equal(
  small,
  bakeEnvironment(flat, { ...recipe, fog: { ...recipe.fog, density: 0.01 } }),
  "atmosphere-only changes do not redo the CPU albedo",
);
assert.equal(small.albedo.length, 32 * 32 * 4);
assert([...small.albedo].every((n) => Number.isFinite(n)));
for (let i = 3; i < small.albedo.length; i += 4)
  assert.equal(small.albedo[i], 255);
const other = bakeEnvironment(flat, { ...recipe, seed: 405 });
assert.notDeepEqual(
  other.albedo,
  small.albedo,
  "map seeds vary organic surface patches",
);
assert.equal(noise2(-17.2, 5.1), noise2(-17.2, 5.1));
assert.throws(() => bakeEnvironment(() => Infinity, recipe), /finite/);
assert.throws(
  () => bakeEnvironment(flat, { ...recipe, heightSize: 1 }),
  /bounds/,
);
// Four nearest-packed corners recover continuous data, including negative origins.
for (let z = 0; z < 8; z++)
  for (let x = 0; x < 8; x++) {
    const i = (z * 9 + x) * 4,
      h = small.heightCorners;
    const bilinear =
      (h[i] + (h[i + 1] - h[i]) * 0.37) * 0.39 +
      (h[i + 2] + (h[i + 3] - h[i + 2]) * 0.37) * 0.61;
    assert(
      Math.abs(bilinear - flat(-8 + (x + 0.37) * 2, -8 + (z + 0.61) * 2)) <
        1e-6,
    );
  }
const world = createSector(),
  env = world.environment,
  bake = env.bake;
assert.equal(world.chunks.length, 64);
assert(
  bake.bytes < 6 * 1024 * 1024,
  "environment CPU recipe stays below 6 MiB",
);
for (const kind of ["grass", "rock", "coast", "submerged"])
  assert(bake.stats[kind] > 1000, `${kind} present`);
assert.equal(env.terrainMaterial.map.magFilter, T.NearestFilter);
assert.equal(env.terrainMaterial.map.minFilter, T.NearestFilter);
assert.equal(env.terrainMaterial.map.colorSpace, T.SRGBColorSpace);
assert(
  env.textures.every(
    (t) => !t.generateMipmaps && t.magFilter === T.NearestFilter,
  ),
);
const terrain = world.cameraSolids.filter(
  (m) => m.material === env.terrainMaterial,
);
assert.equal(terrain.length, 64);
for (const mesh of terrain) {
  const p = mesh.geometry.attributes.position,
    uv = mesh.geometry.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    assert(
      Math.abs(p.getY(i) - rawHeight(p.getX(i), p.getZ(i))) < 2e-6,
      "visual relief is unchanged",
    );
    assert(
      Math.abs(uv.getX(i) - (p.getX(i) + 128) / 256) < 1e-7,
      "global UV: no chunk repeat/seam",
    );
    assert(Math.abs(uv.getY(i) - (p.getZ(i) + 128) / 256) < 1e-7);
  }
}
const water = world.scene.children.find(
  (m) => m.material === env.waterMaterial,
);
assert(water);
assert(env.waterMaterial.fog);
assert.equal(env.waterMaterial.forceSinglePass, true);
const positions = water.geometry.attributes.position.array.slice(),
  version = water.geometry.attributes.position.version;
world.update({ x: 0, y: 5, z: 24, boating: false }, 20);
assert.equal(env.waterMaterial.uniforms.uTime.value, 20);
assert.deepEqual(
  water.geometry.attributes.position.array,
  positions,
  "waves do not change/upload CPU geometry each frame",
);
assert.equal(water.geometry.attributes.position.version, version);
const camera = new T.PerspectiveCamera();
camera.position.set(0, 8, 32);
env.setCamera(camera, false);
assert.equal(world.scene.fog.density, LIMIAR_ENVIRONMENT.fog.density);
assert(env.sky.visible);
env.setCamera(camera, true);
assert.equal(world.scene.fog.density, LIMIAR_ENVIRONMENT.fog.underwaterDensity);
assert(!env.sky.visible && !env.celestial.visible);
env.setCamera(camera, false);
assert(env.sky.visible && env.celestial.visible);
let lights = 0;
world.scene.traverse((o) => {
  if (o.isLight) lights++;
});
assert.equal(
  lights,
  4,
  "same lightweight light count: hemisphere, directional, two points",
);
let disposals = 0;
for (const tex of env.textures)
  tex.addEventListener("dispose", () => disposals++);
env.dispose();
env.dispose();
assert.equal(
  disposals,
  env.textures.length,
  "explicit idempotent ownership of shader-uniform textures",
);
assert.equal(
  bake,
  bakeEnvironment(terrainHeight),
  "reentry does not regenerate the terrain albedo",
);
console.log(
  "Environment 01: seeded bake, grass/stone/coast bands, continuous depth, global nearest UVs, unchanged relief, GPU-only waves, atmosphere and disposal OK.",
);
