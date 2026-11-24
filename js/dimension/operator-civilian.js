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

const KIND_BY_ARCHETYPE = {
  motor_bio_forja: "bio",
  mare_astral: "mare",
  lamina_dominio_anciao: "ancient",
  nucleo_dez_forma: "human",
};
export function createCivilianOperator(progress = {}, player = {}) {
  const id = progress?.archetype ?? "mare_astral";
  const kind = KIND_BY_ARCHETYPE[id] ?? "human";
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
    "../../assets/textures/setor-limiar-lote10/tatuagem-traco.png",
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
    flatShading: false,
    bumpMap: skinBump,
    bumpScale: 0.012,
  });
  const skinDark = new T.MeshLambertMaterial({ color: SKIN_DARK });
  const tattoo = new T.MeshLambertMaterial({
    map: tattooMap,
    flatShading: false,
    bumpMap: skinBump,
    bumpScale: 0.01,
  });
  // Padrão mais fino para membros esféricos (sem esticar as formas grandes).
  let tattooWrap = tattooMap;
  if (tattooMap?.clone) {
    tattooWrap = tattooMap.clone();
    tattooWrap.repeat.set(2.4, 2.4);
    tattooWrap.needsUpdate = true;
  }
  const tattooOrb = new T.MeshLambertMaterial({
    map: tattooWrap,
    flatShading: false,
    bumpMap: skinBump,
    bumpScale: 0.01,
  });
  const tank = new T.MeshLambertMaterial({
    map: tankMap,
    color: 0xffffff,
    flatShading: false,
    side: T.DoubleSide,
  });
  const pants = new T.MeshLambertMaterial({ map: cargoMap, color: 0xd3d0c7 });
  const pantsDark = new T.MeshLambertMaterial({ color: PANTS_DARK });
  const belt = new T.MeshLambertMaterial({ color: BELT });
  const metal = new T.MeshLambertMaterial({ color: METAL, flatShading: true });
  const sole = new T.MeshLambertMaterial({ color: SOLE });
  const orange = new T.MeshLambertMaterial({ color: ORANGE });
  const hair = new T.MeshLambertMaterial({
    color: HAIR,
    flatShading: false,
    bumpMap: hairBump,
    bumpScale: 0.02,
  });
  const hairHi = new T.MeshLambertMaterial({ color: HAIR_HI, flatShading: false });
  const eyeWhite = new T.MeshLambertMaterial({ color: 0xd9d0be });
  const iris = new T.MeshLambertMaterial({ color: 0x4b2f1d });
  const ink = new T.MeshLambertMaterial({ color: INK });
  const lens = new T.MeshLambertMaterial({
    color: LENS,
    transparent: true,
    opacity: 0.13,
    depthWrite: false,
  });

  const { mesh, loft, ellipsoid, tube, ring } = createSculptTools();
  const box = (parent, material, w, h, d, x = 0, y = 0, z = 0) =>
    mesh(parent, material, new T.BoxGeometry(w, h, d), x, y, z);
  // Esferas suaves (não icosaedros) para rosto, cachos, mãos e articulações.
  const orb = (parent, material, rx, ry, rz, x = 0, y = 0, z = 0, w = 14, h = 10) => {
    const o = mesh(parent, material, new T.SphereGeometry(1, w, h), x, y, z);
    o.scale.set(rx, ry, rz);
    return o;
  };
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
        const scoop = front < 0.6 ? 1.462 + 0.026 * smooth(front / 0.6) : top;
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
      [1.55, 0.196, 0.124],
    ],
    0,
    0,
    0,
    22,
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
        [side * 0.146, 1.432, 0.15],
        [side * 0.150, 1.478, 0.1],
        [side * 0.153, 1.500, 0.015],
        [side * 0.150, 1.478, -0.09],
        [side * 0.146, 1.434, -0.145],
      ],
      0.0175,
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
    loft(
      body,
      tattooOrb,
      [
        [1.487, 0.043, 0.041],
        [1.455, 0.056, 0.052],
        [1.418, 0.050, 0.047],
      ],
      side * 0.188,
      0,
      0,
      16,
    ).name = "deltoid";
  }

  // ---------- pescoço, gola e tatuagem do pescoço em geometria ----------
  loft(
    body,
    skin,
    [
      [1.5, 0.072, 0.068],
      [1.58, 0.068, 0.064],
      [1.63, 0.062, 0.06],
      [1.66, 0.058, 0.056],
    ],
    0,
    0,
    0,
    16,
  ).name = "neck";
  // Rosa + linhas geométricas do lado direito (mesmo lado da ficha).
  const neckTattoo = new T.Group();
  neckTattoo.name = "neck-tattoo";
  body.add(neckTattoo);
  // Traço fino de tinta na nuca, encostado na pele (sem virar pinta solta).
  tube(
    neckTattoo,
    ink,
    [
      [0.048, 1.585, 0.0435],
      [0.058, 1.578, 0.0480],
      [0.052, 1.566, 0.0505],
    ],
    0.0016,
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
    20,
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

  // ---------- cabeça: crânio orgânico, olhos, óculos e bigode ----------
  const head = new T.Group();
  head.name = "operator-head";
  head.position.y = proportions.headY;
  head.scale.setScalar(1.07);
  body.add(head);
  // Um único loft de 24 lados desenha crânio, maçãs, mandíbula e queixo. Não há
  // mais peças soltas empilhadas no rosto.
  const skull = loft(
    head,
    skin,
    [
      [-0.132, 0.024, 0.032, 0.012],
      [-0.118, 0.046, 0.056, 0.014],
      [-0.098, 0.061, 0.071, 0.012],
      [-0.074, 0.075, 0.083, 0.008],
      [-0.046, 0.084, 0.091, 0.004],
      [-0.014, 0.090, 0.097, 0.001],
      [0.020, 0.094, 0.100, 0],
      [0.056, 0.094, 0.099, -0.004],
      [0.094, 0.084, 0.090, -0.008],
      [0.126, 0.056, 0.062, -0.010],
      [0.146, 0.014, 0.018, -0.010],
    ],
    0,
    0,
    0,
    24,
  );
  skull.name = "sculpted-face";
  // Orelhas discretas: o loft já resolve maçãs e perfil.
  for (const side of [-1, 1]) {
    const ear = orb(head, skin, 0.009, 0.021, 0.015, side * 0.093, -0.004, -0.010, 12, 9);
    ear.rotation.y = side * 0.24;
    ear.name = "ear";
  }
  // Nariz: loft curto, ponta suave e narinas contidas.
  const nose = loft(
    head,
    skin,
    [
      [0.044, 0.0080, 0.0075, 0.0935],
      [0.014, 0.0100, 0.0105, 0.1010],
      [-0.010, 0.0140, 0.0150, 0.1080],
      [-0.028, 0.0190, 0.0135, 0.1055],
      [-0.039, 0.0160, 0.0090, 0.0985],
    ],
    0,
    0,
    0,
    16,
  );
  nose.name = "nose";
  const eyelids = [];
  for (const side of [-1, 1]) {
    const ex = side * 0.0435,
      ey = 0.0115;
    orb(head, eyeWhite, 0.0150, 0.0088, 0.0048, ex, ey, 0.0852, 14, 10);
    orb(head, iris, 0.0058, 0.0058, 0.0026, ex, ey, 0.0884, 12, 8);
    orb(head, ink, 0.0026, 0.0026, 0.0014, ex, ey, 0.0902, 10, 8);
    const lid = orb(head, skin, 0.0172, 0.0082, 0.0072, ex, ey + 0.0068, 0.0866, 14, 10);
    lid.name = "eyelid";
    eyelids.push(lid);
    const brow = tube(
      head,
      hair,
      [
        [side * 0.012, 0.0395, 0.0925],
        [side * 0.041, 0.0442, 0.0958],
        [side * 0.069, 0.0388, 0.0862],
      ],
      0.0046,
    );
    brow.name = "brow";
    brow.rotation.z = side * -0.05;
  }
  // Bigode fino, quase reto, logo abaixo do nariz; boca discreta abaixo.
  for (const side of [-1, 1])
    tube(
      head,
      hair,
      [
        [0, -0.0300, 0.0975],
        [side * 0.0145, -0.0318, 0.0958],
        [side * 0.0275, -0.0362, 0.0905],
      ],
      0.0031,
    ).name = "moustache";
  tube(
    head,
    skinDark,
    [
      [-0.0195, -0.0535, 0.0930],
      [0, -0.0555, 0.0952],
      [0.0195, -0.0535, 0.0930],
    ],
    0.0022,
  ).name = "mouth";
  // Óculos: aro arredondado contínuo, lente fina e hastes até a orelha.
  const glasses = new T.Group();
  glasses.name = "glasses";
  head.add(glasses);
  for (const side of [-1, 1]) {
    const cx = side * 0.0445,
      cy = 0.0115,
      cz = 0.0925,
      w = 0.0262,
      h = 0.0182,
      r = 0.0072,
      tilt = -side * 0.17;
    const ringPts = [
      [-w + r, -h],
      [w - r, -h],
      [w, -h + r],
      [w, h - r],
      [w - r, h],
      [-w + r, h],
      [-w, h - r],
      [-w, -h + r],
    ].map(([x, y]) => new T.Vector3(x, y, 0));
    const frame = new T.Mesh(
      new T.TubeGeometry(
        new T.CatmullRomCurve3(ringPts, true, "catmullrom", 0.25),
        48,
        0.0026,
        6,
        true,
      ),
      belt,
    );
    frame.position.set(cx, cy, cz);
    frame.rotation.y = tilt;
    frame.name = "glasses-frame";
    glasses.add(frame);
    const glassLens = new T.Mesh(
      new T.PlaneGeometry(w * 1.78, h * 1.78),
      lens,
    );
    glassLens.position.set(cx, cy, cz - 0.0012);
    glassLens.rotation.y = tilt;
    glassLens.name = "glasses-lens";
    glasses.add(glassLens);
    tube(
      glasses,
      belt,
      [
        [side * 0.0712, cy + 0.0055, cz - 0.0035],
        [side * 0.0885, cy + 0.0035, 0.0505],
        [side * 0.0965, cy - 0.0015, 0.0015],
      ],
      0.0024,
    ).name = "glasses-temple";
  }
  tube(
    glasses,
    belt,
    [
      [-0.0195, 0.0145, 0.0955],
      [0, 0.0165, 0.0972],
      [0.0195, 0.0145, 0.0955],
    ],
    0.0024,
  ).name = "glasses-bridge";

  // ---------- cabelo: base raspada + cachos volumosos no topo ----------
  const hairRig = new T.Group();
  hairRig.name = "layered-hair";
  head.add(hairRig);
  const fadeMat = new T.MeshLambertMaterial({ color: 0x3f2c24 });
  // Base colada no crânio: evita vãos entre os cachos e desenha o fade.
  orb(hairRig, fadeMat, 0.0938, 0.0720, 0.0905, 0, 0.0525, -0.0235, 22, 14).name =
    "hair-cap";
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  // 52 cachos em espiral de Fibonacci: volume orgânico, nada de blocos.
  for (let i = 0; i < 64; i++) {
    const theta = 0.08 + (i / 64) * 0.80;
    const phi = i * 2.399963;
    const rad = 0.094 + rand() * 0.010;
    const cr = 0.0135 + rand() * 0.0095;
    const curl = orb(
      hairRig,
      i % 4 === 0 ? hairHi : hair,
      cr,
      cr * (0.85 + rand() * 0.5),
      cr,
      Math.sin(theta) * Math.cos(phi) * rad,
      0.058 + Math.cos(theta) * 0.084,
      -0.010 + Math.sin(theta) * Math.sin(phi) * rad,
      12,
      9,
    );
    curl.rotation.set(rand() * 1.3, rand() * 1.3, rand() * 1.3);
    curl.name = "curl";
  }
  // Laterais e nuca raspadas: cerdas curtas só atrás das têmporas.
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    if (Math.cos(a) > 0.25) continue;
    orb(
      hairRig,
      fadeMat,
      0.0115,
      0.0155,
      0.0095,
      Math.sin(a) * 0.0925,
      -0.008 + (i % 3) * 0.021,
      Math.cos(a) * 0.0905,
      8,
      6,
    ).name = "fade-stubble";
  }
  // Linha da testa: fileira baixa de cachos escondendo a costura da base.
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    orb(
      hairRig,
      i % 2 ? hair : hairHi,
      0.0145,
      0.0125,
      0.0145,
      -0.062 + t * 0.124,
      0.1015 - Math.abs(t - 0.5) * 0.012,
      0.0625,
      12,
      9,
    ).name = "hairline-curls";
  }
  // Franja curta: cachos que caem só até a linha da testa.
  for (let i = 0; i < 9; i++) {
    const curl = orb(
      hairRig,
      i % 2 ? hairHi : hair,
      0.0155 + (i % 2) * 0.0035,
      0.0145,
      0.0155,
      -0.062 + i * 0.0155,
      0.0885 - (i % 3) * 0.0035,
      0.0775,
      12,
      9,
    );
    curl.rotation.set(0.4, i * 0.4, 0.3);
    curl.name = "fringe";
  }

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
      18,
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
      16,
    );
    ring(elbow, ink, 0.063, 0.0035, 0, -0.09, 0).rotation.x = Math.PI / 2;
    ring(elbow, ink, 0.043, 0.003, 0, -0.235, 0).rotation.x = Math.PI / 2;
    const palm = orb(elbow, skin, 0.048, 0.062, 0.027, 0, -0.302, 0.008, 16, 12);
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
      16,
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
      16,
    );
    // Alça preta logo abaixo do joelho, com fivela.
    loft(
      knee,
      belt,
      [
        [-0.028, 0.0955, 0.1005],
        [-0.048, 0.0955, 0.1005],
      ],
      0,
      0,
      0,
      10,
    );
    box(knee, metal, 0.018, 0.018, 0.007, side * 0.038, -0.038, 0.094);
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
      18,
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
  // Nó de arma sempre presente (oculto no civil): contrato com as formas.
  const energyBlade = new T.Group();
  energyBlade.name = "energy-blade";
  energyBlade.visible = false;
  body.add(energyBlade);
  const gaze = new T.Group();
  gaze.name = "gaze";
  head.add(gaze);
  root.userData.performance = {
    action: null,
    phase: 0,
    blink: 1,
    expression: 0.5,
    civilian: true,
    identity: kind,
  };
  // Os grupos animados precisam continuar separados; o resto entra em batches.
  for (const pivot of [body, head, hairRig, ...limbs.map((l) => l.arm), ...limbs.map((l) => l.elbow), ...legRig.map((l) => l.leg), ...legRig.map((l) => l.knee), ...legRig.map((l) => l.foot)])
    batchStatic(
      pivot,
      new Set([...eyelids, gaze, skull, nose]),
    );
  // Crânio e nariz já são volumes; nenhum billboard de rosto foi usado.

  let stepClock = 0,
    lastStepSign = 0;
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
      const { leg, knee, foot } = legRig[i];
      leg.rotation.x = pose.legs[i] * 0.82 + (p.legs?.[i] ?? 0) * blend;
      knee.rotation.x = pose.knees[i] * 0.85 + (p.knees?.[i] ?? 0) * blend;
      // Tornozelo compensa quadril+joelho: a sola fica paralela ao chão e o pé
      // não afunda nem flutua durante a passada.
      const ankle = -(leg.rotation.x + knee.rotation.x) * 0.92;
      foot.rotation.x = ankle + Math.sin(pose.phase + i * Math.PI + 0.7) * 0.038;
    }
    // Passo: avisa o runtime quando o pé troca de lado (som de pisada).
    const stepSign = Math.sign(Math.sin(pose.phase)) || 0;
    if (pose.state === "walk" && stepSign !== lastStepSign && stepSign !== 0) {
      if (t - stepClock > 0.16) {
        stepClock = t;
        options.onStep?.(stepSign);
      }
      lastStepSign = stepSign;
    } else if (stepSign !== 0) lastStepSign = stepSign;
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
      identity: kind,
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
