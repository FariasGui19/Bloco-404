// Composition/POI contract only: no DOM, Three.js, quest triggers or save writes.
// Positions remain in world metres. Stage 4 may subscribe to hook IDs later.
const distanceSegment = (x, z, a, b) => {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    t = Math.max(
      0,
      Math.min(
        1,
        ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1),
      ),
    );
  return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
};
export const ROUTES = Object.freeze([
  {
    id: "arrival-harbor",
    mode: "walk",
    width: 3.1,
    points: [
      [0, 24],
      [-5, 32],
      [-16, 35],
      [-16, 42],
      [-16, 50],
      [-16, 62],
    ],
  },
  {
    id: "arrival-ruins",
    mode: "walk",
    width: 3.0,
    points: [
      [0, 24],
      [-7, 14],
      [-8, 7],
      [-7, 0],
      [-7, -5],
      [-8, -9],
    ],
  },
  {
    id: "summit-trail",
    mode: "walk",
    width: 3.2,
    points: [
      [0, 24],
      [16, 11],
      [25, 0],
      [28, -12],
      [22, -23.8],
    ],
  },
  {
    id: "lighthouse-trail",
    mode: "walk",
    width: 3.2,
    points: [
      [16, 11],
      [28, 3],
      [39, -6],
      [40, -16],
    ],
  },
  {
    id: "cliff-climb",
    mode: "climb",
    width: 2.4,
    points: [
      [-32, 2],
      [-32, -6],
    ],
  },
  {
    id: "ruin-hops",
    mode: "jump",
    width: 3.5,
    points: Array.from({ length: 7 }, (_, i) => [-12 - i * 5, -9 - i * 5]),
  },
  {
    id: "harbor-channel",
    mode: "water",
    width: 6,
    points: [
      [-16, 65],
      [-16, 85],
      [12, 85],
      [65, 45],
    ],
  },
  {
    id: "open-dive",
    mode: "water",
    width: 5,
    points: [
      [78, 65],
      [90, 80],
      [100, 90],
    ],
  },
  {
    id: "flight-vistas",
    mode: "flight",
    altitude: 56,
    width: 5,
    points: [
      [-42, 12],
      [-27, -24],
      [22, -28],
      [40, -21],
      [-16, 65],
    ],
  },
]);
export const POINTS_OF_INTEREST = Object.freeze([
  {
    id: "limiar.harbor",
    code: "P",
    name: "PÍER DA VIGÍLIA",
    short: "PÍER",
    x: -16,
    z: 60,
    clearance: 8,
    color: "#f1c487",
    hook: "limiar.harbor.lore",
    progressionHook: null,
  },
  {
    id: "limiar.anchor",
    code: "A",
    name: "NÚCLEO DE ÂNCORA",
    short: "ÂNCORA",
    x: 22,
    z: -28,
    clearance: 8,
    color: "#9affe1",
    hook: "limiar.anchor.perspective",
    progressionHook: "limiar.level2.anchor",
  },
  {
    id: "limiar.lighthouse",
    code: "F",
    name: "FAROL DO LIMIAR",
    short: "FAROL",
    x: 40,
    z: -21,
    clearance: 7,
    color: "#ffe5ad",
    hook: "limiar.lighthouse.signal",
    progressionHook: "limiar.level2.lighthouse",
  },
  {
    id: "limiar.ruins",
    code: "R",
    name: "RUÍNAS SUSPENSAS",
    short: "RUÍNAS",
    x: -27,
    z: -24,
    clearance: 6,
    color: "#d1a4ee",
    hook: "limiar.ruins.memory",
    progressionHook: "limiar.level2.ruins",
  },
  {
    id: "limiar.rift",
    code: "O",
    name: "ANEL FRATURADO",
    short: "ANEL",
    x: -58,
    z: -45,
    clearance: 9,
    color: "#a9bedb",
    hook: "limiar.rift.horizon",
    progressionHook: null,
  },
]);
export function routeClearance(x, z) {
  let nearest = Infinity;
  for (const route of ROUTES) {
    if (route.mode === "flight") continue;
    for (let i = 1; i < route.points.length; i++)
      nearest = Math.min(
        nearest,
        distanceSegment(x, z, route.points[i - 1], route.points[i]) -
          route.width,
      );
  }
  return nearest;
}
export function safeForScenery(x, z, radius = 1) {
  return (
    routeClearance(x, z) > radius &&
    Math.hypot(x, z - 24) > 8 + radius &&
    POINTS_OF_INTEREST.every(
      (p) => Math.hypot(x - p.x, z - p.z) > p.clearance + radius,
    )
  );
}
function random(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const CLUSTERS = [
  ["arrival-west", -23, 29, 9, 9, "wind"],
  ["arrival-east", 18, 31, 9, 10, "broad"],
  ["watch-grove", 48, 3, 9, 10, "needle"],
  ["mesa-west", -47, 13, 9, 9, "wind"],
  ["basalt-shelf", -47, -9, 7, 7, "needle"],
  ["north-grove", 1, -48, 10, 10, "needle"],
  ["salt-garden", 39, 40, 10, 10, "wind"],
  ["eastern-ridge", 57, -19, 7, 7, "broad"],
  ["western-cove", -50, 39, 8, 8, "broad"],
];
export function createSectorLayout(heightAt) {
  const props = [],
    colliders = [];
  function add(type, x, z, scale, seed, cluster) {
    const y = heightAt(x, z);
    const p = {
      id: `${cluster}.${props.length}`,
      type,
      x,
      y,
      z,
      scale,
      seed,
      cluster,
    };
    props.push(p);
    if (type.startsWith("tree"))
      colliders.push({
        id: p.id,
        x,
        z,
        w: 0.65 * scale,
        d: 0.65 * scale,
        bottom: y - 0.1,
        top: y + 3.5 * scale,
        kind: "trunk",
      });
    if (type === "boulder")
      colliders.push({
        id: p.id,
        x,
        z,
        w: 1.8 * scale,
        d: 1.8 * scale,
        bottom: y - 0.25,
        top: y + 0.95 * scale,
        kind: "rock",
      });
    if (type === "wall")
      colliders.push({
        id: p.id,
        x,
        z,
        w: 2.8 * scale,
        d: 0.65 * scale,
        bottom: y - 0.1,
        top: y + 1.1 * scale,
        kind: "ruin",
      });
  }
  for (let c = 0; c < CLUSTERS.length; c++) {
    const [id, cx, cz, radius, count, tree] = CLUSTERS[c],
      rand = random(404 + c * 199);
    for (let i = 0, accepted = 0; i < 240 && accepted < count * 2; i++) {
      const angle = rand() * Math.PI * 2,
        r = Math.sqrt(rand()) * radius,
        x = cx + Math.cos(angle) * r,
        z = cz + Math.sin(angle) * r;
      const type =
          accepted % 3 === 0
            ? "boulder"
            : accepted % 3 === 1
              ? `tree-${tree}`
              : "fern",
        scale = 0.7 + rand() * 0.65;
      const clearance = type.startsWith("tree")
        ? 2.5 * scale
        : type === "boulder"
          ? 1.5 * scale
          : 0.6;
      const h = heightAt(x, z),
        slope = Math.hypot(heightAt(x + 1, z) - h, heightAt(x, z + 1) - h);
      if (
        h < 2.1 ||
        h > 23 ||
        slope > 1.1 ||
        !safeForScenery(x, z, clearance) ||
        props.some((p) => Math.hypot(p.x - x, p.z - z) < clearance + 0.7)
      )
        continue;
      add(type, x, z, scale, c * 100 + i, id);
      accepted++;
    }
  }
  // Low remnants frame the approach, never the protected traversal corridors.
  for (const [x, z, s] of [
    [-21, 13, 1.2],
    [-25, 8, 0.9],
    [-4, -5, 1],
    [6, 7, 0.8],
    [35, 13, 1],
    [45, -7, 0.8],
    [-42, -32, 0.9],
  ]) {
    if (safeForScenery(x, z, 2.4 * s))
      add("wall", x, z, s, props.length, "low-remnants");
  }
  // Small waystones outside the walkable corridor clarify the route without UI quests.
  for (const route of ROUTES.filter((r) => r.mode === "walk"))
    for (let i = 1; i < route.points.length - 1; i++) {
      const [x, z] = route.points[i],
        nx = x + route.width + 1.8,
        nz = z + 0.4;
      if (
        heightAt(nx, nz) > 1 &&
        !POINTS_OF_INTEREST.some(
          (p) => Math.hypot(nx - p.x, nz - p.z) < p.clearance,
        )
      )
        add("waystone", nx, nz, 0.6, props.length, route.id);
    }
  const structural = [];
  for (const x of [-19, -13])
    for (const z of [43, 49, 55, 61])
      structural.push({
        id: `pier-post-${x}-${z}`,
        x,
        z,
        w: 0.35,
        d: 0.35,
        bottom: -3,
        top: 7.35,
        kind: "post",
      });
  for (const x of [-19.15, -12.85])
    structural.push({
      id: `pier-rail-${x}`,
      x,
      z: 50.5,
      w: 0.14,
      d: 17,
      bottom: 5.3,
      top: 6.4,
      kind: "rail",
    });
  const ay = heightAt(22, -28);
  for (const x of [18.75, 25.25])
    for (const z of [-30, -26])
      structural.push({
        id: `anchor-rib-${x}-${z}`,
        x,
        z,
        w: 0.55,
        d: 0.55,
        bottom: ay - 0.3,
        top: ay + 4.8,
        kind: "rib",
      });
  const pois = POINTS_OF_INTEREST.map((p) => ({
    ...p,
    y: heightAt(p.x, p.z),
    hooks: Object.freeze({ lore: p.hook, progression: p.progressionHook }),
    arrival:
      p.id === "limiar.lighthouse"
        ? { x: 40, z: -16 }
        : p.id === "limiar.anchor"
          ? { x: 22, z: -23.8 }
          : p.id === "limiar.ruins"
            ? { x: -12, z: -9 }
            : p.id === "limiar.harbor"
              ? { x: -16, z: 62 }
              : { x: -58, z: -45 },
  }));
  return {
    props,
    colliders: [...colliders, ...structural],
    pois,
    routes: ROUTES,
  };
}
export function navigationBearing(x, z, yaw, poi) {
  const dx = poi.x - x,
    dz = poi.z - z,
    angle = Math.atan2(-dx, -dz),
    delta = Math.atan2(Math.sin(angle - yaw), Math.cos(angle - yaw));
  return {
    poi,
    distance: Math.hypot(dx, dz),
    angle,
    delta,
    arrow: Math.abs(delta) < 0.25 ? "↑" : delta > 0 ? "←" : "→",
  };
}
// Local broadphase; no per-substep concatenation or scan of all scenery bodies.
export function createCollisionIndex(bodies, cell = 16) {
  const bins = new Map();
  for (const b of bodies)
    for (
      let x = Math.floor((b.x - b.w / 2) / cell);
      x <= Math.floor((b.x + b.w / 2) / cell);
      x++
    )
      for (
        let z = Math.floor((b.z - b.d / 2) / cell);
        z <= Math.floor((b.z + b.d / 2) / cell);
        z++
      ) {
        const key = `${x},${z}`,
          list = bins.get(key) ?? [];
        list.push(b);
        bins.set(key, list);
      }
  return {
    bins,
    blocked(x, y, z, r = 0.38, height = 1.8) {
      for (
        let ix = Math.floor((x - r) / cell);
        ix <= Math.floor((x + r) / cell);
        ix++
      )
        for (
          let iz = Math.floor((z - r) / cell);
          iz <= Math.floor((z + r) / cell);
          iz++
        )
          for (const b of bins.get(`${ix},${iz}`) ?? [])
            if (
              Math.abs(x - b.x) < b.w / 2 + r &&
              Math.abs(z - b.z) < b.d / 2 + r &&
              y < b.top - 0.05 &&
              y + height > b.bottom + 0.05
            )
              return true;
      return false;
    },
  };
}
