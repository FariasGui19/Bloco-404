import * as T from "../vendor/three.module.js";
import { createSculptTools } from "./operator-sculpt.js";
import { createOperatorMotion } from "./operator-motion.js";
import { samplePerformance, facialSample } from "./operator-performance.js";
import { batchStatic } from "./sector-meshes.js";

// Operador civil pós-Maré Cromática, reconstruído a partir da ficha técnica e
// do modelo Tripo (6.018 quads / 5.372 vértices): homem musculoso, cabelo
// cacheado escuro com fade, óculos retangulares, bigode fino, regata preta,
// calça cargo cinza, tênis preto/laranja e tatuagens nos dois braços.
//
// A malha é low-poly de verdade (lofts e icosaedros), não uma figura em billboard.
// Os três mapas obrigatórios são tatuagem, regata e cargo; o resto é cor de
// material para preservar o orçamento PS1 (menos de 55 draws e 7.100 triângulos).

const SKIN = 0xb57a52;
const SKIN_DARK = 0x9c6442;
const HAIR = 0x332326;
const HAIR_HI = 0x4a3231;
const TANK = 0x121216;
const PANTS = 0xb3ada5;
const PANTS_DARK = 0x9e9891;
const BELT = 0x141416;
const METAL = 0xb9b6ad;
const SOLE = 0xd8d2c4;
const ORANGE = 0xe0862e;
const LENS = 0x74888e;
const INK = 0x253436;

function makeDataTexture(size, paint) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      data.set([...paint(x, y), 255], (y * size + x) * 4);
  const tex = new T.DataTexture(data, size, size);
  tex.colorSpace = T.SRGBColorSpace;
  tex.magFilter = tex.minFilter = T.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

// Fallback procedural determinístico: os testes Node não têm DOM para carregar
// PNG, mas ainda precisam dos três mapas e dos filtros PS1.
const armFallback = () =>
  makeDataTexture(64, (x, y) => {
    const skin = [181, 122, 82];
    const ink =
      ((x * 5 + y * 3) % 29 < 4 && y > 6) ||
      ((x - 20) ** 2 + (y - 22) ** 2 < 70 && (x + y) % 7 < 3) ||
      ((x - 44) ** 2 + (y - 46) ** 2 < 58 && (x - y) % 5 < 2);
    return ink ? [37, 52, 54] : [skin[0], skin[1] + (y % 9 === 0 ? 4 : 0), skin[2]];
  });
const tankFallback = () =>
  makeDataTexture(64, (x, y) => {
    const v = 16 + ((x + y * 3) % 7 === 0 ? 7 : 0) + (y % 11 === 0 ? 3 : 0);
    return [v, v, v + 2];
  });
const cargoFallback = () =>
  makeDataTexture(64, (x, y) => {
    const v = 174 + ((x * 3 + y) % 13 === 0 ? 9 : 0) - (y % 17 === 0 ? 8 : 0);
    return [v, v - 3, v - 10];
  });

function loadMap(path, fallback, repeat) {
  let tex;
  if (typeof document !== "undefined") {
    tex = new T.TextureLoader().load(new URL(path, import.meta.url).href);
    tex.wrapS = tex.wrapT = T.MirroredRepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
  } else {
    tex = fallback();
    tex.wrapS = tex.wrapT = T.MirroredRepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
  }
  tex.magFilter = T.NearestFilter;
  tex.minFilter = T.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = T.SRGBColorSpace;
  return tex;
}

export function createCivilianOperator(progress = {}, player = {}) {
  const id = progress?.archetype ?? "mare_astral";
  const x10 = id === "nucleo_dez_forma";
  const root = new T.Group();
  root.name = "operator";
  const body = new T.Group();
  body.name = "operator-rig";
  root.add(body);
  const proportions = {
    headWidth: 0.205,
    headHeight: 0.26,
    shoulder: 0.235,
    hip: 0.122,
    hipY: 0.98,
    headY: 1.72,
  };
  root.userData.identity = {
    archetype: id,
    level: 1,
    form: null,
    model: "human",
    bracelet: x10,
    clothing: "civilian",
    hair: "curls-fade",
    glasses: true,
    moustache: true,
    tattoos: true,
    reference: "tripo-c4343c10",
    polygons: 6018,
  };
  root.userData.sculpt = {
    revision: "4.0",
    source: "ficha-operador + Tripo 6018 quads",
    ...proportions,
  };

  // Três mapas canônicos. O bump de pele/cabelo não entra como `map` para não
  // inflar o contrato de texturas do rig.
  const tattooMap = loadMap(
    "../../assets/textures/operador/tatuagem-manga.png",
    armFallback,
    [1, 1],
  );
  const tankMap = loadMap(
    "../../assets/textures/operador/tecido-regata.png",
    tankFallback,
    [2, 2],
  );
  const cargoMap = loadMap(
    "../../assets/textures/operador/tecido-carga.png",
    cargoFallback,
    [2, 3],
  );

  // Bump sutil de pele/cabelo: detalhe de close sem virar um quarto `map`.
  let skinBump = null, hairBump = null;
  if (typeof document !== "undefined") {
    const bump = (path) => {
      const tex = new T.TextureLoader().load(new URL(path, import.meta.url).href);
      tex.wrapS = tex.wrapT = T.MirroredRepeatWrapping;
      tex.magFilter = tex.minFilter = T.NearestFilter;
      tex.generateMipmaps = false;
      tex.colorSpace = T.SRGBColorSpace;
      return tex;
    };
    skinBump = bump("../../assets/textures/operador/pele-operador.png");
    hairBump = bump("../../assets/textures/operador/cabelo-cachos.png");
  }
  const skin = new T.MeshLambertMaterial({
    color: SKIN,
    flatShading: true,
    bumpMap: skinBump,
    bumpScale: 0.012,
  });
  const skinDark = new T.MeshLambertMaterial({ color: SKIN_DARK, flatShading: true });
  const tattoo = new T.MeshLambertMaterial({
    map: tattooMap,
    flatShading: true,
    bumpMap: skinBump,
    bumpScale: 0.01,
  });
  const tank = new T.MeshLambertMaterial({
    map: tankMap,
    color: 0xffffff,
    flatShading: true,
    side: T.DoubleSide,
  });
  const pants = new T.MeshLambertMaterial({ map: cargoMap, color: 0xffffff, flatShading: true });
  const pantsDark = new T.MeshLambertMaterial({ color: PANTS_DARK, flatShading: true });
  const belt = new T.MeshLambertMaterial({ color: BELT, flatShading: true });
  const metal = new T.MeshLambertMaterial({ color: METAL, flatShading: true });
  const sole = new T.MeshLambertMaterial({ color: SOLE, flatShading: true });
  const orange = new T.MeshLambertMaterial({ color: ORANGE, flatShading: true });
  const hair = new T.MeshLambertMaterial({
    color: HAIR,
    flatShading: false,
    bumpMap: hairBump,
    bumpScale: 0.02,
  });
  const hairHi = new T.MeshLambertMaterial({ color: HAIR_HI, flatShading: false });
  const eyeWhite = new T.MeshLambertMaterial({ color: 0xd9d0be, flatShading: true });
  const iris = new T.MeshLambertMaterial({ color: 0x4b2f1d, flatShading: true });
  const ink = new T.MeshLambertMaterial({ color: INK, flatShading: true });
  const lens = new T.MeshLambertMaterial({
    color: LENS,
    transparent: true,
    opacity: 0.13,
    depthWrite: false,
    flatShading: true,
  });

  const { mesh, loft, ellipsoid, tube, ring } = createSculptTools();
  const box = (parent, material, w, h, d, x = 0, y = 0, z = 0) =>
    mesh(parent, material, new T.BoxGeometry(w, h, d), x, y, z);
  // Regata real: painel paramétrico com decote em U e cavas recortadas. Uma
  // malha fechada com "pele por cima" parecia um colete com peitoral solto.
  const tankGeometry = () => {
    // Perfil de raio por altura e uma borda superior que varia com o ângulo:
    // decote em U na frente e cavas afundadas nas laterais, deixando alças
    // contínuas sobre o ombro. Sem quads apagados, a borda não vira degrau.
    const profile = [
      [0.965, 0.176, 0.123],
      [1.02, 0.181, 0.127],
      [1.1, 0.191, 0.133],
      [1.2, 0.212, 0.144],
      [1.3, 0.24, 0.155],
      [1.36, 0.256, 0.162],
      [1.4, 0.264, 0.166],
      [1.44, 0.27, 0.169],
      [1.475, 0.266, 0.166],
    ];
    const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
    const radiusAt = (h) => {
      for (let i = 1; i < profile.length; i++)
        if (h <= profile[i][0]) {
          const [h0, x0, z0] = profile[i - 1];
          const [h1, x1, z1] = profile[i];
          const t = (h - h0) / (h1 - h0);
          return [x0 + (x1 - x0) * t, z0 + (z1 - z0) * t];
        }
      const last = profile[profile.length - 1];
      return [last[1], last[2]];
    };
    const sides = 40,
      levels = 12,
      top = 1.475,
      hem = 0.965,
      pos = [],
      uv = [],
      hole = [],
      index = [];
    const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
    for (let r = 0; r <= levels; r++) {
      const f = r / levels;
      const [rx, rz] = radiusAt(hem + f * (top - hem));
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        const front = Math.abs(wrap(a));
        const scoop = front < 0.6 ? 1.375 + 0.1 * smooth(front / 0.6) : top;
        const y = hem + f * (scoop - hem);
        const side = Math.abs(front - Math.PI / 2);
        pos.push(Math.sin(a) * rx, y, Math.cos(a) * rz);
        uv.push(i / sides, f);
        // Cava retangular: o ombro e a alça ficam acima dela.
        hole.push(f > 0.8 && Math.abs(Math.sin(a) * rx) > 0.165);
      }
    }
    for (let r = 0; r < levels; r++)
      for (let i = 0; i < sides; i++) {
        const j = (i + 1) % sides;
        const a = r * sides + i,
          b = r * sides + j,
          c = (r + 1) * sides + i,
          d = (r + 1) * sides + j;
        if (hole[a] && hole[b] && hole[c] && hole[d]) continue;
        index.push(a, c, b, b, c, d);
      }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    geo.setIndex(index);
    geo.computeVertexNormals();
    return geo;
  };

  // ---------- torso: pele sob a regata, regata preta de alcinha larga ----------
  loft(
    body,
    skin,
    [
      [0.98, 0.155, 0.105],
      [1.08, 0.165, 0.112],
      [1.22, 0.195, 0.125],
      [1.36, 0.25, 0.148],
      [1.46, 0.262, 0.155],
      [1.53, 0.205, 0.128],
    ],
    0,
    0,
    0,
    12,
  ).name = "torso-skin";
  // Regata preta com decote em U e cavas; a pele do torso aparece nos recortes.
  const tankBody = mesh(body, tank, tankGeometry());
  tankBody.name = "tank-body";
  // Alças: passam por cima do ombro e ligam o painel da frente ao das costas.
  for (const side of [-1, 1])
    tube(
      body,
      tank,
      [
        [side * 0.146, 1.438, 0.15],
        [side * 0.152, 1.49, 0.1],
        [side * 0.156, 1.516, 0.015],
        [side * 0.152, 1.49, -0.09],
        [side * 0.146, 1.44, -0.145],
      ],
      0.022,
    ).name = "tank-strap";
  // Cós inferior, agora sem costura diagonal atravessando o peito.
  loft(
    body,
    tank,
    [
      [1.005, 0.17, 0.12],
      [1.032, 0.172, 0.122],
    ],
    0,
    0,
    0,
    14,
  );
  for (const side of [-1, 1]) {
    tube(
      body,
      skin,
      [
        [side * 0.012, 1.508, 0.132],
        [side * 0.07, 1.502, 0.118],
        [side * 0.132, 1.482, 0.084],
      ],
      0.0085,
    );
    tube(
      body,
      skin,
      [
        [side * 0.02, 1.492, 0.126],
        [side * 0.062, 1.486, 0.118],
        [side * 0.104, 1.474, 0.096],
      ],
      0.0045,
    );
    // Preenche a junta do ombro sem deixar um vão entre torso e deltoide.
    ellipsoid(body, tattoo, 0.056, 0.05, 0.05, side * 0.19, 1.438, 0);
  }

  // ---------- pescoço, gola e tatuagem do pescoço em geometria ----------
  loft(
    body,
    skin,
    [
      [1.5, 0.072, 0.068],
      [1.58, 0.068, 0.064],
      [1.63, 0.062, 0.06],
    ],
    0,
    0,
    0,
    10,
  ).name = "neck";
  // Rosa + linhas geométricas do lado direito (mesmo lado da ficha).
  const neckTattoo = new T.Group();
  neckTattoo.name = "neck-tattoo";
  body.add(neckTattoo);
  ellipsoid(neckTattoo, ink, 0.018, 0.02, 0.003, 0.062, 1.565, 0.055);
  ring(neckTattoo, ink, 0.014, 0.0022, 0.062, 1.565, 0.058).rotation.x = Math.PI / 2;
  tube(
    neckTattoo,
    ink,
    [
      [0.055, 1.61, 0.05],
      [0.076, 1.59, 0.035],
      [0.083, 1.55, 0.025],
      [0.07, 1.52, 0.04],
    ],
    0.0028,
  );
  tube(
    neckTattoo,
    ink,
    [
      [0.07, 1.55, 0.06],
      [0.09, 1.53, 0.045],
      [0.088, 1.5, 0.035],
    ],
    0.0022,
  );

  // ---------- cintura, cinto e calça cargo ----------
  const pelvis = loft(
    body,
    pants,
    [
      [1.05, 0.176, 0.12],
      [0.99, 0.179, 0.122],
      [0.93, 0.163, 0.112],
      [0.9, 0.132, 0.096],
    ],
    0,
    0,
    0,
    12,
  );
  pelvis.name = "cargo-pelvis";
  loft(
    body,
    belt,
    [
      [0.995, 0.19, 0.128],
      [1.045, 0.19, 0.128],
    ],
    0,
    0,
    0,
    12,
  );
  box(body, metal, 0.062, 0.032, 0.012, 0, 1.02, 0.133);
  box(body, belt, 0.026, 0.024, 0.006, 0, 1.02, 0.14);
  for (let i = 0; i < 5; i++) {
    const a = -1.05 + i * 0.52;
    box(body, belt, 0.014, 0.05, 0.008, Math.sin(a) * 0.188, 1.018, Math.cos(a) * 0.127);
  }
  tube(
    body,
    belt,
    [
      [0, 1.04, 0.125],
      [0, 0.95, 0.123],
    ],
    0.0035,
  );
  // Bolsos cargo grandes nas coxas, com pala e presilha.
  for (const side of [-1, 1]) {
    const px = side * 0.155;
    box(body, pants, 0.07, 0.115, 0.07, px, 0.845, 0.012).rotation.z = side * 0.06;
    box(body, pantsDark, 0.075, 0.032, 0.074, px, 0.9, 0.014).rotation.z = side * 0.06;
    box(body, pantsDark, 0.022, 0.036, 0.006, px, 0.86, 0.053);
    box(body, metal, 0.007, 0.007, 0.003, px, 0.875, 0.057);
  }

  // ---------- cabeça: crânio, mandíbula, olhos, óculos e bigode ----------
  const head = new T.Group();
  head.name = "operator-head";
  head.position.y = proportions.headY;
  head.scale.setScalar(1.07);
  body.add(head);
  const skull = loft(
    head,
    skin,
    [
      [-0.1, 0.062, 0.058, 0.008],
      [-0.086, 0.082, 0.083, 0.01],
      [-0.06, 0.094, 0.096, 0.006],
      [0, 0.098, 0.1, 0],
      [0.055, 0.092, 0.094, -0.006],
      [0.1, 0.066, 0.072, -0.012],
    ],
    0,
    0,
    0,
    12,
  );
  skull.name = "sculpted-face";
  ellipsoid(head, skinDark, 0.084, 0.04, 0.072, 0, -0.07, 0.018);
  // Arcada, maçãs e queixo: dão perfil ao rosto na vista lateral.
  ellipsoid(head, skin, 0.072, 0.013, 0.014, 0, 0.05, 0.09);
  for (const side of [-1, 1]) {
    ellipsoid(head, skin, 0.03, 0.022, 0.026, side * 0.056, -0.018, 0.07);
    ellipsoid(head, skin, 0.02, 0.016, 0.014, side * 0.048, -0.036, 0.082);
  }
  ellipsoid(head, skin, 0.032, 0.024, 0.02, 0, -0.106, 0.078);
  // Occipital: sem isso o perfil lateral do crânio era uma tábua reta.
  ellipsoid(head, skin, 0.088, 0.078, 0.038, 0, 0.028, -0.074);
  ellipsoid(head, skin, 0.072, 0.05, 0.03, 0, -0.03, -0.062);
  for (const side of [-1, 1]) {
    ellipsoid(head, skin, 0.06, 0.038, 0.062, side * 0.045, -0.05, 0.045);
    ellipsoid(head, skin, 0.017, 0.028, 0.011, side * 0.102, -0.005, 0.005).rotation.y =
      side * 0.25;
  }
  const nose = loft(
    head,
    skin,
    [
      [-0.012, 0.011, 0.012, 0.1],
      [-0.028, 0.016, 0.016, 0.106],
      [-0.041, 0.021, 0.014, 0.101],
    ],
    0,
    0,
    0,
    8,
  );
  nose.name = "nose";
  for (const side of [-1, 1]) {
    ellipsoid(head, eyeWhite, 0.0135, 0.0075, 0.005, side * 0.043, 0.017, 0.092);
    ellipsoid(head, skin, 0.016, 0.0055, 0.004, side * 0.043, 0.025, 0.091);
    ellipsoid(head, iris, 0.006, 0.006, 0.004, side * 0.043, 0.017, 0.097);
    ellipsoid(head, belt, 0.0032, 0.0032, 0.003, side * 0.043, 0.017, 0.101);
    const brow = tube(
      head,
      hair,
      [
        [side * 0.018, 0.052, 0.099],
        [side * 0.045, 0.058, 0.1],
        [side * 0.072, 0.052, 0.09],
      ],
      0.008,
    );
    brow.name = "brow";
  }
  // Óculos: aro retangular fino, ponte e hastes até a orelha.
  for (const side of [-1, 1]) {
    const cx = side * 0.045,
      cy = 0.019;
    box(head, belt, 0.052, 0.0032, 0.005, cx, cy + 0.0178, 0.107);
    box(head, belt, 0.052, 0.0032, 0.005, cx, cy - 0.0178, 0.107);
    box(head, belt, 0.0032, 0.035, 0.005, cx - 0.0244, cy, 0.107);
    box(head, belt, 0.0032, 0.035, 0.005, cx + 0.0244, cy, 0.107);
    box(head, lens, 0.046, 0.032, 0.0015, cx, cy, 0.1045);
    tube(
      head,
      belt,
      [
        [side * 0.069, cy + 0.012, 0.105],
        [side * 0.094, cy + 0.008, 0.062],
        [side * 0.1005, cy - 0.002, 0.004],
      ],
      0.0028,
    );
  }
  box(head, belt, 0.021, 0.0045, 0.005, 0, 0.036, 0.107);
  // Bigode fino, narinas e boca.
  for (const side of [-1, 1]) {
    tube(
      head,
      hair,
      [
        [0, -0.042, 0.109],
        [side * 0.024, -0.047, 0.111],
        [side * 0.046, -0.056, 0.1],
      ],
      0.0075,
    );
    ellipsoid(head, skinDark, 0.004, 0.003, 0.003, side * 0.014, -0.03, 0.109);
  }
  const mouth = tube(
    head,
    skinDark,
    [
      [-0.026, -0.062, 0.099],
      [0, -0.066, 0.106],
      [0.026, -0.062, 0.099],
    ],
    0.0036,
  );
  mouth.name = "mouth";
  const eyelids = [];
  for (const side of [-1, 1]) {
    const lid = ellipsoid(head, skin, 0.023, 0.009, 0.009, side * 0.043, 0.026, 0.096);
    lid.name = "eyelid";
    eyelids.push(lid);
  }

  // ---------- cabelo: fade curto + cacho volumoso em tufos ----------
  const hairRig = new T.Group();
  hairRig.name = "layered-hair";
  head.add(hairRig);
  hairRig.position.set(0, -0.052, 0.006);
  // Base raspada nas laterais.
  // Base raspada (fade), curta e opaca; não é um capacete de cabelo.
  const fadeMat = new T.MeshLambertMaterial({ color: 0x4a342c, flatShading: true });
  const hairCap = new T.Mesh(
    new T.SphereGeometry(1, 14, 7, 0, Math.PI * 2, 0, 1.7),
    fadeMat,
  );
  hairCap.scale.set(0.106, 0.058, 0.105);
  hairCap.position.set(0, 0.145, -0.012);
  hairRig.add(hairCap);
  for (const side of [-1, 1])
    box(hairRig, hair, 0.009, 0.055, 0.028, side * 0.096, 0.02, 0.026);
  // Tufos determinísticos: 30 cachos, sem depender de random.
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 40; i++) {
    const theta = 0.16 + (i / 40) * 1.05;
    const phi = i * 2.399 + (i % 3) * 0.35;
    const radius = 0.134 + rand() * 0.014;
    const r = 0.027 + rand() * 0.016;
    const curl = ellipsoid(
      hairRig,
      i % 3 === 0 ? hairHi : hair,
      r,
      r * (0.85 + rand() * 0.55),
      r,
      Math.sin(theta) * Math.cos(phi) * radius,
      0.108 + Math.cos(theta) * 0.088,
      -0.008 + Math.sin(theta) * Math.sin(phi) * radius,
    );
    curl.rotation.set(rand() * 1.4, rand() * 1.4, rand() * 1.4);
    curl.name = "curl";
  }
  // Nuca: massa de cabelo baixa, cobrindo o occipital.
  ellipsoid(hairRig, hair, 0.088, 0.078, 0.045, 0, 0.045, -0.078);
  ellipsoid(hairRig, hairHi, 0.062, 0.04, 0.035, 0, -0.012, -0.086);
  // Segunda camada nas laterais e nuca, para o cabelo não virar topete.
  for (let i = 0; i < 16; i++) {
    const theta = 1.16 + (i / 16) * 0.42;
    const phi = i * 2.2;
    const curl = ellipsoid(
      hairRig,
      i % 2 ? hairHi : hair,
      0.026 + (i % 3) * 0.005,
      0.03,
      0.026,
      Math.sin(theta) * Math.cos(phi) * 0.134,
      0.108 + Math.cos(theta) * 0.088,
      -0.006 + Math.sin(theta) * Math.sin(phi) * 0.13,
    );
    curl.rotation.set(i * 0.5, i * 0.9, i * 0.3);
    curl.name = "curl-side";
  }
  // Franja: cachos que caem sobre a testa, como na ficha.
  for (let i = 0; i < 7; i++) {
    const curl = ellipsoid(
      hairRig,
      i % 2 ? hairHi : hair,
      0.028 + (i % 2) * 0.006,
      0.023,
      0.026,
      -0.096 + i * 0.032,
      0.152 - (i % 3) * 0.004,
      0.102,
    );
    curl.rotation.set(0.4, i * 0.4, 0.3);
    curl.name = "fringe";
  }
  for (let i = 0; i < 7; i++)
    ring(
      hairRig,
      hairHi,
      0.022 + (i % 3) * 0.005,
      0.0065,
      -0.05 + (i % 4) * 0.033,
      0.155 + (i % 2) * 0.012,
      0.055 + (i % 3) * 0.012,
      Math.PI * (1.5 + (i % 3) * 0.2),
    ).rotation.set(0.3, 0.2, 0.4);

  // ---------- braços: tatuagem nos dois, mão e dedos ----------
  const limbs = [];
  for (const side of [-1, 1]) {
    const arm = new T.Group();
    arm.position.set(side * 0.232, 1.455, 0);
    arm.rotation.z = side * 0.07;
    body.add(arm);
    loft(
      arm,
      tattoo,
      [
        [0.0, 0.058, 0.06],
        [-0.045, 0.088, 0.086],
        [-0.12, 0.092, 0.09],
        [-0.2, 0.082, 0.082],
        [-0.3, 0.064, 0.067],
      ],
      0,
      0,
      0,
      12,
    );
    // Faixas de tinta em relevo, visíveis mesmo antes do PNG carregar.
    ring(arm, ink, 0.073, 0.004, 0, -0.12, 0).rotation.x = Math.PI / 2;
    ring(arm, ink, 0.059, 0.0035, 0, -0.27, 0).rotation.x = Math.PI / 2;
    const elbow = new T.Group();
    elbow.position.y = -0.3;
    arm.add(elbow);
    loft(
      elbow,
      tattoo,
      [
        [0.015, 0.056, 0.057],
        [-0.08, 0.062, 0.064],
        [-0.18, 0.048, 0.052],
        [-0.26, 0.037, 0.04],
      ],
      0,
      0,
      0,
      10,
    );
    ring(elbow, ink, 0.063, 0.0035, 0, -0.09, 0).rotation.x = Math.PI / 2;
    ring(elbow, ink, 0.043, 0.003, 0, -0.235, 0).rotation.x = Math.PI / 2;
    const palm = ellipsoid(elbow, skin, 0.048, 0.062, 0.027, 0, -0.302, 0.008);
    palm.rotation.x = 0.08;
    for (let f = 0; f < 4; f++)
      box(
        elbow,
        skin,
        0.018,
        0.066 - f * 0.006,
        0.016,
        -0.024 + f * 0.016,
        -0.345,
        0.006,
      ).rotation.z = (f - 1.5) * 0.05;
    box(elbow, skin, 0.016, 0.045, 0.014, -side * 0.036, -0.312, 0.02).rotation.z =
      side * 0.5;
    if (x10 && side === 1) {
      const bracelet = ring(elbow, ink, 0.043, 0.007, 0, -0.25, 0);
      bracelet.rotation.x = Math.PI / 2;
      bracelet.name = "lattice-bracelet";
    }
    limbs.push({ arm, elbow });
  }

  // ---------- pernas: calça cargo folgada, joelho, tênis ----------
  const legRig = [];
  for (const side of [-1, 1]) {
    const leg = new T.Group();
    leg.position.set(side * proportions.hip, proportions.hipY, 0);
    body.add(leg);
    loft(
      leg,
      pants,
      [
        [0.02, 0.098, 0.106],
        [-0.13, 0.104, 0.11],
        [-0.3, 0.094, 0.104],
        [-0.44, 0.085, 0.096],
      ],
      0,
      0,
      0,
      10,
    );
    // Faixa lateral escura, como a costura da ficha.
    tube(
      leg,
      pantsDark,
      [
        [side * 0.098, 0.02, 0.0],
        [side * 0.104, -0.16, 0.0],
        [side * 0.09, -0.34, 0.0],
      ],
      0.006,
    );
    // Cargo do lado externo da coxa.
    box(leg, pants, 0.048, 0.1, 0.055, side * 0.082, -0.31, 0.015).rotation.z =
      side * 0.05;
    box(leg, pantsDark, 0.052, 0.028, 0.06, side * 0.082, -0.258, 0.017);
    box(leg, pantsDark, 0.018, 0.03, 0.005, side * 0.084, -0.286, 0.055);
    const knee = new T.Group();
    knee.position.y = -0.45;
    leg.add(knee);
    loft(
      knee,
      pants,
      [
        [0.02, 0.093, 0.098],
        [-0.1, 0.096, 0.104],
        [-0.24, 0.082, 0.09],
        [-0.35, 0.068, 0.08],
        [-0.38, 0.076, 0.088],
      ],
      0,
      0,
      0,
      10,
    );
    // Alça preta logo abaixo do joelho, com fivela.
    loft(
      knee,
      belt,
      [
        [-0.02, 0.098, 0.103],
        [-0.056, 0.098, 0.103],
      ],
      0,
      0,
      0,
      10,
    );
    box(knee, metal, 0.022, 0.022, 0.008, side * 0.04, -0.04, 0.096);
    const foot = new T.Group();
    foot.position.y = -0.385;
    foot.scale.set(1.22, 1.16, 1.22);
    knee.add(foot);
    // Sola chunky, cabedal alto, biqueira, faixa laranja e cadarços.
    loft(
      foot,
      sole,
      [
        [-0.108, 0.058, 0.126, 0.042],
        [-0.084, 0.064, 0.139, 0.044],
        [-0.06, 0.064, 0.137, 0.044],
        [-0.044, 0.06, 0.13, 0.042],
      ],
      0,
      0,
      0,
      12,
    );
    ellipsoid(foot, belt, 0.057, 0.06, 0.104, 0, -0.004, 0.02);
    ellipsoid(foot, belt, 0.052, 0.04, 0.072, 0, -0.026, 0.086);
    ellipsoid(foot, sole, 0.05, 0.022, 0.034, 0, -0.05, 0.146);
    loft(
      foot,
      belt,
      [
        [0.02, 0.055, 0.05, 0.012],
        [0.062, 0.052, 0.048, 0.01],
      ],
      0,
      0,
      0,
      10,
    );
    // Faixa laranja contínua em volta do cabedal, sem blocos soltos.
    tube(
      foot,
      orange,
      [
        [-0.052, 0.0, -0.03],
        [-0.03, 0.01, 0.014],
        [0, 0.014, 0.038],
        [0.03, 0.01, 0.014],
        [0.052, 0.0, -0.03],
      ],
      0.0055,
    );
    for (const side of [-1, 1])
      tube(
        foot,
        orange,
        [
          [side * 0.057, -0.03, -0.045],
          [side * 0.058, -0.005, 0.02],
          [side * 0.054, -0.008, 0.075],
        ],
        0.005,
      );
    box(foot, orange, 0.026, 0.022, 0.014, 0, 0.045, 0.036);
    box(foot, orange, 0.04, 0.016, 0.01, 0, 0.012, -0.072);
    box(foot, sole, 0.03, 0.012, 0.018, 0, 0.049, 0.044);
    for (let l = 0; l < 3; l++)
      tube(
        foot,
        belt,
        [
          [-0.044, 0.024 + l * 0.01, 0.024 + l * 0.014],
          [0, 0.03 + l * 0.01, 0.032 + l * 0.014],
          [0.044, 0.024 + l * 0.01, 0.024 + l * 0.014],
        ],
        0.003,
      );
    legRig.push({ leg, knee, foot });
  }

  // ---------- batimento, piscada e desempenho ----------
  const motion = createOperatorMotion();
  const energyTrail = new T.Group();
  energyTrail.name = "energy-trail";
  energyTrail.visible = false;
  body.add(energyTrail);
  const gaze = new T.Group();
  gaze.name = "gaze";
  head.add(gaze);
  root.userData.performance = {
    action: null,
    phase: 0,
    blink: 1,
    expression: 0.5,
    civilian: true,
    identity: "mare-civil",
  };
  // Os grupos animados precisam continuar separados; o resto entra em batches.
  for (const pivot of [body, head, hairRig, ...limbs.map((l) => l.arm), ...limbs.map((l) => l.elbow), ...legRig.map((l) => l.leg), ...legRig.map((l) => l.knee), ...legRig.map((l) => l.foot)])
    batchStatic(pivot, new Set([...eyelids, gaze, ...(pivot === body ? [] : [])]));
  // Crânio e nariz já são volumes; nenhum billboard de rosto foi usado.

  const animate = (c, t, options = {}) => {
    const pose = motion.update(c, t, { ...options, archetype: id });
    const p = samplePerformance(
      options.action,
      "human",
      t,
      options.reducedMotion,
      true,
    );
    const f = facialSample(t, p.expression ?? 0.5, options.reducedMotion);
    const blend = 0.55;
    root.position.set(c.x, c.y, c.z);
    root.rotation.y = c.yaw;
    body.position.set(
      (p.shiftX ?? 0) * 0.5,
      pose.bob * 0.9 - (p.crouch ?? 0) * 0.7,
      (p.shiftZ ?? 0) * 0.5,
    );
    body.rotation.set(
      pose.pitch * 0.5 + (p.lean ?? 0) * 0.4,
      (pose.torsoYaw ?? 0) * 0.6 + (p.twist ?? 0) * 0.4,
      pose.bank * 0.35 + (p.bank ?? 0) * 0.35 + Math.sin(t * 0.9) * 0.004,
    );
    head.rotation.set(
      (pose.headPitch ?? 0) * 0.7 + (p.headPitch ?? 0) * 0.5,
      (pose.head ?? 0) * 0.6 + (p.headYaw ?? 0) * 0.4,
      -(pose.hipRoll ?? 0) * 0.35,
    );
    for (let i = 0; i < 2; i++) {
      const limb = limbs[i];
      limb.arm.rotation.set(
        pose.arms[i] * 0.85 +
          (p.arms?.[i] ?? 0) * blend +
          Math.sin(t * 1.1 + i * 2) * 0.012,
        (p.armYaw?.[i] ?? 0) * 0.6,
        -(i === 0 ? 1 : -1) * pose.spread * 0.55 + (p.armRoll?.[i] ?? 0) * 0.3,
      );
      limb.elbow.rotation.x =
        pose.elbows[i] * 0.9 + (p.elbows?.[i] ?? 0) * blend;
      const { leg, knee } = legRig[i];
      leg.rotation.x = pose.legs[i] * 0.82 + (p.legs?.[i] ?? 0) * blend;
      knee.rotation.x = pose.knees[i] * 0.85 + (p.knees?.[i] ?? 0) * blend;
    }
    hairRig.rotation.set(
      (options.reducedMotion ? 0 : Math.sin(t * 2.1 + 1) * 0.006) +
        (pose.pitch + (p.lean ?? 0)) * 0.05,
      0,
      options.reducedMotion ? 0 : -pose.bank * 0.035,
    );
    eyelids.forEach((l) => {
      l.visible = f.blink > 0.02;
      l.scale.y = Math.max(0.001, 0.009 * f.blink);
    });
    gaze.position.x = f.look * 0.3;
    root.userData.performance = {
      action: p.id ?? null,
      phase: p.u ?? 0,
      blink: f.blink,
      expression: p.expression ?? 0.5,
      twist: p.twist ?? 0,
      scan: p.scan ?? 0,
      stage: p.stage ?? 0,
      variant: p.variant ?? 0,
      beat: p.beat ?? 0,
      blend,
      identity: "mare-civil",
      civilian: true,
      clothing: "civilian",
    };
    energyTrail.visible = false;
    return pose;
  };
  return {
    root,
    motion,
    get pose() {
      return motion.pose;
    },
    animate,
  };
}
