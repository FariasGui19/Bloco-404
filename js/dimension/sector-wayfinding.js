import * as T from "../vendor/three.module.js";

// Trilha do Limiar: quatro pilares de runa marcam o caminho entre a chegada e o
// Núcleo de Âncora. Cada pilar acende com E e muda de cor na cena e no minimapa.
export const LIMIAR_ROUTE = Object.freeze([
  [0, 0],
  [5, -5],
  [10, -11],
  [15, -17],
  [19, -23],
  [22, -28],
]);

export const LIMIAR_PYLONS = Object.freeze([
  { id: "pilar-1", x: 5, z: -5 },
  { id: "pilar-2", x: 10, z: -11 },
  { id: "pilar-3", x: 15, z: -17 },
  { id: "pilar-4", x: 19, z: -23 },
]);

export const wayfindingProgress = (ids = []) => {
  const unique = [...new Set(ids)].filter((id) =>
    LIMIAR_PYLONS.some((p) => p.id === id),
  );
  return {
    lit: unique.length,
    total: LIMIAR_PYLONS.length,
    complete: unique.length === LIMIAR_PYLONS.length,
  };
};

function glowTexture() {
  if (typeof document === "undefined") return null;
  const size = 64,
    canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d"),
    grad = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
  grad.addColorStop(0, "rgba(180,255,236,0.85)");
  grad.addColorStop(0.5, "rgba(120,240,214,0.28)");
  grad.addColorStop(1, "rgba(120,240,214,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new T.CanvasTexture(canvas);
  tex.colorSpace = T.SRGBColorSpace;
  tex.magFilter = tex.minFilter = T.NearestFilter;
  tex.generateMipmaps = false;
  return tex;
}

const dist = (c, x, z) => Math.hypot((c?.x ?? 0) - x, (c?.z ?? 0) - z);

export function createWayfinding({
  scene,
  heightAt = () => 0,
  state = null,
  reach = 3.4,
  trailMaterial = null,
  sigilMap = null,
} = {}) {
  const group = new T.Group();
  group.name = "limiar-wayfinding";
  scene?.add(group);

  const flags = state ? (state.progress.flags ??= {}) : null;
  const saved = Array.isArray(flags?.limiarPylons) ? flags.limiarPylons : [];
  const lit = new Set(wayfindingProgress(saved).complete ? saved : saved);

  const stone = new T.MeshLambertMaterial({ color: 0x97a3ad, flatShading: true });
  const stoneDark = new T.MeshLambertMaterial({ color: 0x6d7a86, flatShading: true });
  const runeOff = new T.MeshBasicMaterial({ color: 0x2c4650 });
  const runeOn = new T.MeshBasicMaterial({ color: 0x9cf7dc });
  // Lote 11: a trilha usa o piso pintado quando ele está disponível.
  const trailMat =
    trailMaterial ??
    new T.MeshLambertMaterial({ color: 0xa9b4bd, flatShading: true });
  const glowTex = sigilMap ?? glowTexture();

  const mesh = (parent, geometry, material, x, y, z) => {
    const m = new T.Mesh(geometry, material);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };

  const pylons = LIMIAR_PYLONS.map((def, index) => {
    const root = new T.Group();
    root.name = def.id;
    const y = heightAt(def.x, def.z);
    root.position.set(def.x, y, def.z);
    group.add(root);
    mesh(root, new T.CylinderGeometry(0.62, 0.72, 0.34, 10), stoneDark, 0, 0.17, 0);
    mesh(root, new T.CylinderGeometry(0.26, 0.34, 1.95, 10), stone, 0, 1.16, 0);
    mesh(root, new T.CylinderGeometry(0.34, 0.3, 0.18, 10), stoneDark, 0, 2.2, 0);
    const ring = mesh(
      root,
      new T.TorusGeometry(0.33, 0.045, 4, 18),
      runeOff,
      0,
      1.5,
      0,
    );
    ring.rotation.x = Math.PI / 2;
    ring.name = "rune-ring";
    const core = mesh(
      root,
      new T.OctahedronGeometry(0.17, 0),
      runeOff,
      0,
      2.52,
      0,
    );
    core.name = "rune-core";
    let glow = null;
    if (glowTex) {
      glow = new T.Sprite(
        new T.SpriteMaterial({
          map: glowTex,
          transparent: true,
          depthWrite: false,
          blending: T.AdditiveBlending,
          opacity: 0,
        }),
      );
      glow.scale.setScalar(1.5);
      glow.position.set(0, 2.52, 0);
      glow.renderOrder = 5;
      root.add(glow);
    }
    return {
      def,
      index,
      root,
      ring,
      core,
      glow,
      lit: lit.has(def.id),
      phase: index * 1.37,
    };
  });

  // Trilha contínua: uma fita de chão que acompanha o terreno. Antes eram
  // lajes soltas, que na encosta liam como pedras flutuando.
  const route = [];
  for (let i = 1; i < LIMIAR_ROUTE.length; i++) {
    const [x0, z0] = LIMIAR_ROUTE[i - 1],
      [x1, z1] = LIMIAR_ROUTE[i];
    const steps = Math.max(2, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.7));
    for (let s = i === 1 ? 0 : 1; s <= steps; s++)
      route.push([x0 + ((x1 - x0) * s) / steps, z0 + ((z1 - z0) * s) / steps]);
  }
  const halfWidth = 0.9,
    positions = [],
    uvs = [],
    indices = [],
    trail = [];
  let travelled = 0;
  for (let i = 0; i < route.length; i++) {
    const [x, z] = route[i],
      [px, pz] = route[Math.max(0, i - 1)],
      [nx, nz] = route[Math.min(route.length - 1, i + 1)];
    let tx = nx - px,
      tz = nz - pz;
    const tl = Math.hypot(tx, tz) || 1;
    tx /= tl;
    tz /= tl;
    // Borda irregular: a fita lê como chão gasto, não como laje reta.
    // Pontas afinadas: a fita entra e sai do chão sem corte reto.
    const ends = Math.min(i, route.length - 1 - i),
      taper = Math.min(1, 0.28 + ends * 0.26);
    const width =
      (halfWidth + Math.sin(i * 0.63) * 0.14 + Math.sin(i * 1.77) * 0.08) * taper;
    for (const side of [1, -1]) {
      const vx = x - tz * width * side,
        vz = z + tx * width * side,
        vy = heightAt(vx, vz) + 0.055;
      positions.push(vx, vy, vz);
      uvs.push(side > 0 ? 0 : 1, travelled / 1.7);
    }
    if (i > 0) {
      const a = (i - 1) * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      travelled += Math.hypot(x - px, z - pz);
    }
    trail.push({ position: { x, z } });
  }
  const ribbonGeometry = new T.BufferGeometry();
  ribbonGeometry.setAttribute(
    "position",
    new T.Float32BufferAttribute(positions, 3),
  );
  ribbonGeometry.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2));
  ribbonGeometry.setIndex(indices);
  ribbonGeometry.computeVertexNormals();
  ribbonGeometry.computeBoundingSphere();
  const ribbonMaterial =
    trailMaterial ?? new T.MeshLambertMaterial({ color: 0xa9b4bd, flatShading: true });
  ribbonMaterial.side = T.DoubleSide;
  const ribbon = new T.Mesh(ribbonGeometry, ribbonMaterial);
  ribbon.name = "limiar-trail";
  ribbon.renderOrder = 1;
  group.add(ribbon);

  // Feixe do núcleo: só aparece com os quatro pilares acesos.
  const beam = new T.Mesh(
    new T.CylinderGeometry(0.5, 1.5, 11, 12, 1, true),
    new T.MeshBasicMaterial({
      color: 0x8df4d7,
      transparent: true,
      opacity: 0.16,
      side: T.DoubleSide,
      depthWrite: false,
    }),
  );
  beam.position.set(22, heightAt(22, -28) + 5.5, -28);
  beam.visible = false;
  beam.name = "anchor-beam";
  group.add(beam);

  const applyLook = (pylon) => {
    pylon.ring.material = pylon.lit ? runeOn : runeOff;
    pylon.core.material = pylon.lit ? runeOn : runeOff;
    pylon.core.scale.setScalar(pylon.lit ? 1.25 : 0.85);
    if (pylon.glow) pylon.glow.material.opacity = pylon.lit ? 0.4 : 0;
  };
  pylons.forEach(applyLook);

  const progress = () => wayfindingProgress([...lit]);
  const syncBeam = () => {
    const done = progress().complete;
    beam.visible = done;
    if (flags) flags.limiarPath = done;
  };
  syncBeam();

  const activate = (pylon) => {
    if (!pylon || pylon.lit) return null;
    pylon.lit = true;
    lit.add(pylon.def.id);
    if (flags) flags.limiarPylons = [...lit].sort();
    applyLook(pylon);
    syncBeam();
    return pylon;
  };

  // Próximo objetivo da trilha: pilar na ordem da rota, depois o núcleo.
  const objective = (c) => {
    const pylon = pylons.find((p) => !p.lit);
    const x = pylon ? pylon.def.x : 22,
      z = pylon ? pylon.def.z : -28;
    return {
      x,
      z,
      index: pylon ? pylon.index : pylons.length,
      label: pylon ? `PILAR ${pylon.index + 1}` : "NÚCLEO",
      distance: dist(c, x, z),
    };
  };

  const nearest = (c) =>
    pylons
      .filter((p) => !p.lit && dist(c, p.def.x, p.def.z) <= reach)
      .sort((a, b) => dist(c, a.def.x, a.def.z) - dist(c, b.def.x, b.def.z))[0] ??
    null;

  return {
    group,
    pylons,
    trail,
    route,
    ribbon,
    beam,
    get lit() {
      return [...lit];
    },
    get progress() {
      return progress();
    },
    nearest,
    objective,
    activate,
    interact(c) {
      return activate(nearest(c));
    },
    prompt(c) {
      const pylon = nearest(c);
      if (!pylon) return "";
      const { lit: n, total } = progress();
      return `E · ACENDER PILAR ${pylon.index + 1} · ${n}/${total}`;
    },
    update(time = 0, reducedMotion = false) {
      for (const pylon of pylons) {
        if (!pylon.lit) continue;
        const pulse = reducedMotion ? 0 : Math.sin(time * 2.1 + pylon.phase);
        if (pylon.glow) pylon.glow.material.opacity = 0.3 + pulse * 0.1;
        pylon.ring.rotation.z = time * 0.4 + pylon.phase;
        pylon.core.rotation.y = time * 0.8 + pylon.phase;
      }
      if (beam.visible) {
        beam.material.opacity =
          0.13 + (reducedMotion ? 0 : Math.sin(time * 1.3) * 0.04);
      }
    },
    dots() {
      return pylons.map((p) => ({ x: p.def.x, z: p.def.z, on: p.lit }));
    },
  };
}
