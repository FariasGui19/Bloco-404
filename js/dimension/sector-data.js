// Setor Limiar: coordenadas em metros; Y é vertical (convenção Three.js).
// Sem DOM/WebGL: a física e o terreno usam os mesmos dados determinísticos.
export const SECTOR = Object.freeze({
  size: 256,
  chunk: 32,
  step: 2,
  sea: 0,
  ceiling: 90,
  spawn: { x: 0, z: 24 },
  anchor: { x: 22, z: -28 },
  lighthouse: { x: 40, z: -21 },
  boat: { x: -16, z: 65 },
});
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const gaussian = (x, z, cx, cz, r) =>
  Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / r ** 2);
export function rawHeight(x, z) {
  const radius = Math.hypot(x / 70, z / 64);
  return (
    -12 +
    17 * clamp((1.35 - radius) * 2, 0, 1) +
    24 * gaussian(x, z, 22, -28, 24) +
    5 * gaussian(x, z, -34, -10, 17) +
    0.65 * Math.sin(x * 0.16) * Math.cos(z * 0.13) * clamp(1.4 - radius, 0, 1) +
    9 * clamp((12 - Math.hypot(x + 32, z + 12)) / 1.5, 0, 1)
  );
}
// Exact interpolation of the two triangles used by PlaneGeometry per cell.
export function terrainHeight(x, z) {
  const s = SECTOR.step,
    x0 = Math.floor(x / s) * s,
    z0 = Math.floor(z / s) * s,
    u = (x - x0) / s,
    v = (z - z0) / s;
  const a = rawHeight(x0, z0),
    b = rawHeight(x0 + s, z0),
    c = rawHeight(x0, z0 + s),
    d = rawHeight(x0 + s, z0 + s);
  return u + v <= 1
    ? a + (b - a) * u + (c - a) * v
    : d + (c - d) * (1 - u) + (b - d) * (1 - v);
}
export const PLATFORMS = [
  {
    id: "anchor-dais",
    x: 22,
    z: -28,
    w: 6,
    d: 6,
    bottom: terrainHeight(22, -28) - 0.3,
    top: terrainHeight(22, -28) + 0.55,
  },
  { id: "pier", x: -16, z: 52, w: 7, d: 24, bottom: 4.8, top: 5.3 },
  ...Array.from({ length: 7 }, (_, i) => ({
    id: "ruin-" + i,
    x: -12 - i * 5,
    z: -9 - i * 5,
    w: 5,
    d: 5,
    bottom: terrainHeight(-12, -9) + 0.4 + i * 1.35,
    top: terrainHeight(-12, -9) + 1.2 + i * 1.35,
  })),
];
export const SOLIDS = [
  {
    id: "lighthouse",
    x: 40,
    z: -21,
    w: 6,
    d: 6,
    bottom: terrainHeight(40, -21),
    top: terrainHeight(40, -21) + 24,
  },
  ...Array.from({ length: 4 }, (_, i) => ({
    id: "pillar-" + i,
    x: -30 + i * 6,
    z: 3,
    w: 1.6,
    d: 1.6,
    bottom: terrainHeight(-30 + i * 6, 3),
    top: terrainHeight(-30 + i * 6, 3) + 6,
  })),
];
export const groundAt = (x, z, feet = Infinity) => {
  let h = terrainHeight(x, z);
  for (const p of PLATFORMS)
    if (
      Math.abs(x - p.x) <= p.w / 2 + 0.25 &&
      Math.abs(z - p.z) <= p.d / 2 + 0.25 &&
      feet >= p.top - 0.25
    )
      h = Math.max(h, p.top);
  return h;
};
export function blocked(x, y, z, r = 0.38, height = 1.8) {
  return [...SOLIDS, ...PLATFORMS].some(
    (b) =>
      Math.abs(x - b.x) < b.w / 2 + r &&
      Math.abs(z - b.z) < b.d / 2 + r &&
      y < b.top - 0.05 &&
      y + height > b.bottom + 0.05,
  );
}
export const ARCHETYPE_3D = {
  nucleo_dez_forma: {
    name: "NÚCLEO X10",
    color: 0xf1bd59,
    accent: 0x7ceeff,
    fly: true,
  },
  mare_astral: {
    name: "MARÉ ASTRAL",
    color: 0x39c5ca,
    accent: 0xa4f7ed,
    dive: true,
  },
  motor_bio_forja: {
    name: "MOTOR BIO-FORJA",
    color: 0xb6c76a,
    accent: 0xff925e,
    heavy: true,
  },
  lamina_dominio_anciao: {
    name: "LÂMINA DO DOMÍNIO",
    color: 0x9974dd,
    accent: 0xf1d1ff,
  },
};
export function profileFor(progress) {
  return (
    ARCHETYPE_3D[progress?.archetype] ?? {
      name: "OPERADOR EM CONTENÇÃO",
      color: 0x8398b0,
      accent: 0x80e6e0,
    }
  );
}
