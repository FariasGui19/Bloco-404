// Reusable environmental art recipe. No Three.js, DOM, physics or save writes.
// Bounds, sea level and height source are supplied by each map, not inferred
// from the Setor Limiar landmarks. A cached CPU bake is reused on re-entry.
export const LIMIAR_TERRAIN_PALETTE = Object.freeze(
  Object.fromEntries(
    Object.entries({
      moss: [53, 77, 73],
      grass: [88, 111, 85],
      earth: [106, 91, 89],
      rock: [104, 108, 126],
      sand: [169, 151, 135],
      wet: [75, 99, 102],
      bed: [53, 80, 94],
    }).map(([key, color]) => [key, Object.freeze(color)]),
  ),
);
export const LIMIAR_ENVIRONMENT = Object.freeze({
  id: "limiar-twilight-01",
  seed: 404,
  terrainPalette: LIMIAR_TERRAIN_PALETTE,
  bounds: Object.freeze({ minX: -128, minZ: -128, sizeX: 256, sizeZ: 256 }),
  seaLevel: 0,
  albedoSize: 1024,
  heightSize: 257,
  sky: Object.freeze({
    zenith: "#111c37",
    upper: "#283957",
    horizon: "#626680",
    afterglow: "#c3919c",
  }),
  fog: Object.freeze({
    color: "#626680",
    density: 0.0058,
    underwaterColor: "#244e63",
    underwaterDensity: 0.045,
  }),
  light: Object.freeze({
    sky: 0xa1b8dd,
    ground: 0x5a4d63,
    ambient: 1.55,
    key: 0xc1d3f5,
    intensity: 1.9,
  }),
  water: Object.freeze({
    deep: "#244761",
    shallow: "#487d7d",
    foam: "#bad9cf",
    reflection: "#8586a6",
    amplitude: 0.12,
  }),
});
export const saturate = (n) => Math.max(0, Math.min(1, n));
export const smooth = (a, b, n) => {
  const t = saturate((n - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export function hash2(x, z, seed = 404) {
  let h = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ seed;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
export function noise2(x, z, seed = 404) {
  const ix = Math.floor(x),
    iz = Math.floor(z),
    u = smooth(0, 1, x - ix),
    v = smooth(0, 1, z - iz);
  const a = hash2(ix, iz, seed),
    b = hash2(ix + 1, iz, seed),
    c = hash2(ix, iz + 1, seed),
    d = hash2(ix + 1, iz + 1, seed);
  return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
}
const mix = (a, b, t) => {
  for (let i = 0; i < 3; i++) a[i] += (b[i] - a[i]) * t;
};
let cached = null;
export function bakeEnvironment(heightAt, profile = LIMIAR_ENVIRONMENT) {
  // Bounded to ONE CPU bake across all future maps; no unbounded biome cache.
  if (typeof heightAt !== "function")
    throw new Error("A height source is required");
  const {
    bounds: b,
    heightSize: hs,
    albedoSize: size,
    seed,
    seaLevel,
    terrainPalette: palette = LIMIAR_TERRAIN_PALETTE,
  } = profile;
  const key = JSON.stringify([b, hs, size, seed, seaLevel, palette]);
  if (cached?.heightAt === heightAt && cached.key === key) return cached.bake;
  if (
    !Number.isInteger(hs) ||
    hs < 2 ||
    !Number.isInteger(size) ||
    size < 2 ||
    b.sizeX <= 0 ||
    b.sizeZ <= 0
  )
    throw new Error("Invalid environmental bake bounds/resolution");
  const heights = new Float32Array(hs * hs);
  for (let z = 0; z < hs; z++)
    for (let x = 0; x < hs; x++) {
      const h = heightAt(
        b.minX + (x / (hs - 1)) * b.sizeX,
        b.minZ + (z / (hs - 1)) * b.sizeZ,
      );
      if (!Number.isFinite(h)) throw new Error("Height source must be finite");
      heights[z * hs + x] = h;
    }
  // A single nearest sample carries four corner heights. The water shader
  // reconstructs continuous depth without float-linear extensions or four reads.
  const heightCorners = new Float32Array(hs * hs * 4);
  for (let z = 0; z < hs; z++)
    for (let x = 0; x < hs; x++) {
      const x1 = Math.min(hs - 1, x + 1),
        z1 = Math.min(hs - 1, z + 1),
        i = (z * hs + x) * 4;
      heightCorners.set(
        [
          heights[z * hs + x],
          heights[z * hs + x1],
          heights[z1 * hs + x],
          heights[z1 * hs + x1],
        ],
        i,
      );
    }
  const albedo = new Uint8Array(size * size * 4),
    stats = { grass: 0, rock: 0, coast: 0, submerged: 0 },
    color = new Float64Array(3);
  for (let z = 0; z < size; z++)
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size,
        v = (z + 0.5) / size,
        wx = b.minX + u * b.sizeX,
        wz = b.minZ + v * b.sizeZ;
      const gx = u * (hs - 1),
        gz = v * (hs - 1),
        ix = Math.min(hs - 2, Math.floor(gx)),
        iz = Math.min(hs - 2, Math.floor(gz)),
        tx = gx - ix,
        tz = gz - iz;
      const a = heights[iz * hs + ix],
        bb = heights[iz * hs + ix + 1],
        c = heights[(iz + 1) * hs + ix],
        d = heights[(iz + 1) * hs + ix + 1];
      const h = (a + (bb - a) * tx) * (1 - tz) + (c + (d - c) * tx) * tz;
      const slope = Math.hypot(
        (((bb - a) * (1 - tz) + (d - c) * tz) * (hs - 1)) / b.sizeX,
        (((c - a) * (1 - tx) + (d - bb) * tx) * (hs - 1)) / b.sizeZ,
      );
      const broad = noise2(wx * 0.058, wz * 0.058, seed),
        patch = noise2(wx * 0.31 + 11, wz * 0.31, seed + 17),
        grain = noise2(wx * 1.7, wz * 1.7, seed + 29);
      const rock = smooth(0.38, 1.15, slope + (patch - 0.5) * 0.35),
        earth = smooth(0.55, 0.85, patch) * 0.42;
      color.set(palette.moss);
      mix(color, palette.grass, smooth(0.2, 0.8, broad * 0.55 + patch * 0.45));
      mix(color, palette.earth, earth);
      mix(color, palette.rock, rock);
      // Organic moisture/coast bands follow height and slope, not map/chunk UVs.
      const coast =
        1 - smooth(seaLevel + 0.65, seaLevel + 3.3 + (broad - 0.5) * 1.8, h);
      mix(color, palette.sand, coast * (1 - rock * 0.5));
      const wet =
        1 - smooth(seaLevel - 0.15, seaLevel + 0.85 + (patch - 0.5) * 0.35, h);
      mix(color, palette.wet, wet);
      mix(color, palette.bed, 1 - smooth(seaLevel - 7, seaLevel - 1, h));
      // Sparse, clustered grass blades and stone seams, not independent pixel noise.
      const rootSeed = hash2(x, z, seed + 61),
        shoot = hash2(x, z + 1, seed + 61);
      const blade = shoot > 0.983 && patch > 0.4 ? 1 : 0;
      const vein =
        1 -
        smooth(
          0.07,
          0.18,
          Math.abs(noise2(wx * 0.7, wz * 0.18, seed + 7) - 0.5),
        );
      const root = rootSeed > 0.983 && patch > 0.4 ? 1 : 0;
      const shade =
        0.9 +
        grain * 0.18 +
        (broad - 0.5) * 0.15 +
        (blade * 0.09 - root * 0.08) * (1 - rock) * (1 - coast) -
        vein * 0.22 * rock;
      const offset = (z * size + x) * 4;
      for (let k = 0; k < 3; k++)
        albedo[offset + k] = Math.max(
          0,
          Math.min(255, Math.round((color[k] * shade) / 2) * 2),
        );
      albedo[offset + 3] = 255;
      stats[
        h < seaLevel
          ? "submerged"
          : coast > 0.5
            ? "coast"
            : rock > 0.5
              ? "rock"
              : "grass"
      ]++;
    }
  const bake = {
    albedo,
    heights,
    heightCorners,
    size,
    heightSize: hs,
    bounds: b,
    stats,
    bytes: albedo.byteLength + heights.byteLength + heightCorners.byteLength,
  };
  cached = { heightAt, key, bake };
  return bake;
}
