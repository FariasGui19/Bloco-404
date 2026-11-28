// PSX / Puppet-Combo bay renderer for the Maré Cromática mission.
// Low-poly geometry, nearest-filtered textures, dense exponential fog and a
// gaze-following flashlight. The WebGL layer is composited into the mission's
// 2D canvas so saves, HUD, map and tests keep one capture surface.
import * as THREE from "../vendor/three.module.js";
import { cell, waterAt, shoreX, CABINS } from "./mare-mission-model.js";
import { lote7Walls } from "./mare-mission-lote7.js";
import { anchor, systems, circuitLegs, siteStatus, statusColor } from './mare-mission-circuit.js';
import { installStations } from './mare-mission-stations.js';
import { enemyFamily, enemyFrame } from "./mare-mission-life.js";

const TAU = Math.PI * 2;
const hash = (x, y, seed = 0) => {
  const v = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return v - Math.floor(v);
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const inCabin = (x, y) =>
  CABINS.some(([cx, cy, w, h]) => x > cx && x < cx + w && y > cy && y < cy + h);
const onCabinWall = (x, y) =>
  CABINS.some(
    ([cx, cy, w, h]) =>
      ((x === cx || x === cx + w - 1) && y >= cy && y <= cy + h - 1) ||
      ((y === cy || y === cy + h - 1) && x >= cx && x <= cx + w - 1),
  );

function canvasTexture(draw, w = 128, h = 256) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  return tex;
}

function glowTexture(color = "255,180,105") {
  // Halo com filtro linear e curva contínua: com NearestFilter o gradiente
  // virava anéis concêntricos gigantes no céu.
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const rad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (let i = 0; i <= 18; i++) {
    const t = i / 18;
    const a = (0.95 * Math.pow(1 - t, 2.4)).toFixed(3);
    rad.addColorStop(t, `rgba(${color},${a})`);
  }
  g.fillStyle = rad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

function silhouetteTexture() {
  return canvasTexture((g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = "rgba(1,3,6,.98)";
    // cabeça, ombros, tronco longo e braços finos: leitura de figura humana
    g.beginPath();
    g.ellipse(w * 0.5, h * 0.12, w * 0.11, h * 0.075, 0, 0, TAU);
    g.fill();
    g.beginPath();
    g.moveTo(w * 0.36, h * 0.2);
    g.quadraticCurveTo(w * 0.22, h * 0.31, w * 0.24, h * 0.52);
    g.lineTo(w * 0.18, h * 0.86);
    g.lineTo(w * 0.29, h * 0.85);
    g.lineTo(w * 0.34, h * 0.56);
    g.lineTo(w * 0.4, h * 0.92);
    g.lineTo(w * 0.48, h * 0.92);
    g.lineTo(w * 0.49, h * 0.5);
    g.lineTo(w * 0.52, h * 0.92);
    g.lineTo(w * 0.6, h * 0.92);
    g.lineTo(w * 0.66, h * 0.55);
    g.lineTo(w * 0.71, h * 0.85);
    g.lineTo(w * 0.82, h * 0.86);
    g.lineTo(w * 0.76, h * 0.51);
    g.quadraticCurveTo(w * 0.78, h * 0.3, w * 0.64, h * 0.2);
    g.closePath();
    g.fill();
    // ondulação do casaco
    g.strokeStyle = "rgba(20,45,52,.34)";
    g.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.moveTo(w * (0.36 + i * 0.08), h * 0.4);
      g.lineTo(w * (0.34 + i * 0.08), h * 0.78);
      g.stroke();
    }
  }, 96, 192);
}

export async function createMareWorld3D({
  images = {},
  props = [],
  width = 384,
  height = 216,
  onFear = () => {},
} = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });
  } catch {
    return { available: false };
  }
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.24;
  renderer.setClearColor(0x060c14, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060c14);
  const fog = new THREE.FogExp2(0x0d1a25, 0.054);
  scene.fog = fog;
  const camera = new THREE.PerspectiveCamera(61, width / height, 0.055, 95);
  camera.rotation.order = "YXZ";
  scene.add(camera);

  const loader = new THREE.TextureLoader();
  const texture = async (file, repeat = 1, dir = "mare-upgrade") => {
    const map = await loader.loadAsync(
      new URL(`../../assets/textures/${dir}/${file}.png`, import.meta.url)
        .href,
    );
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.MirroredRepeatWrapping;
    map.repeat.set(repeat, repeat);
    map.magFilter = THREE.NearestFilter;
    map.minFilter = THREE.NearestMipmapNearestFilter;
    map.anisotropy = 1;
    return map;
  };
  const [
    concrete, wood, metal, container, rock, water, pier,
    sandWet, sandDry, pebbles, pierWood, cabinWood, roofRust, darkRock, crystalTex, hull, cliff,
    espumaTex, aguaRasaTex, concretoSalTex, pisoPierTex, areiaConchasTex, azulejoTex,
  ] = await Promise.all([
    texture("concreto-limoso", 2),
    texture("madeira-cabana", 1, "mare-coast"),
    texture("metal-ondulado", 1),
    texture("container-ferrugem", 1),
    texture("rocha-escura", 1, "mare-coast"),
    texture("agua-negra", 12),
    texture("tabuas-pier", 2, "mare-coast"),
    texture("areia-molhada", 7, "mare-coast"),
    texture("areia-seca", 5, "mare-coast"),
    texture("pedras-praia", 4, "mare-coast"),
    texture("tabuas-pier", 1, "mare-coast"),
    texture("madeira-cabana", 1, "mare-coast"),
    texture("telha-ferrugem", 2, "mare-coast"),
    texture("rocha-escura", 2, "mare-coast"),
    texture("cristal-cromatico", 1, "mare-coast"),
    texture("casco-barco", 2, "mare-coast"),
    texture("penhasco-farol", 2, "mare-coast"),
    texture("espuma-mar", 2, "mare-coast"),
    texture("agua-rasa-caustica", 6, "mare-coast"),
    texture("parede-concreto-sal", 2, "mare-coast"),
    texture("piso-pier-molhado", 1, "mare-coast"),
    texture("areia-conchas", 4, "mare-coast"),
    texture("parede-azulejo-mar", 1, "mare-coast"),
  ]);

  // Lote 9: materiais pintados (metal, lona, pedra molhada).
  const [metalCorroidoTex, lonaTex, pedraMolhadaTex] = await Promise.all([
    texture("metal-corroido", 1, "mare-missao-lote9"),
    texture("lona-encardida", 1.2, "mare-missao-lote9"),
    texture("pedra-molhada", 2, "mare-missao-lote9"),
  ]);
  // Lote 13: tábua da passarela e a lona do cabo-guia.
  const [trilhaTex, caboTex] = await Promise.all([
    texture("trilha-tabua", 1, "mare-missao-lote13"),
    texture("cabo-guia", 1, "mare-missao-lote13"),
  ]);
  // Lote 11: papel de carta, vidro de Fresnel e corda alcatroada.
  const [vidroFarolTex, cordaTex] = await Promise.all([
    texture("vidro-farol", 1, "mare-missao-lote11"),
    texture("corda-alcatrao", 4, "mare-missao-lote11"),
  ]);
  const lambert = (map, color = 0xffffff) =>
    new THREE.MeshLambertMaterial({ map, color });
  const mat = {
    concrete: lambert(concretoSalTex, 0xc4d2cc),
    concreteDark: lambert(concrete, 0x778c8b),
    tiles: lambert(azulejoTex, 0xb9d0c8),
    sandShells: lambert(areiaConchasTex, 0xb5ab90),
    pierFloor: lambert(pisoPierTex, 0xb7a17d),
    wood: lambert(wood, 0xd8c0a8),
    woodDark: lambert(wood, 0x8c7060),
    metal: lambert(metal, 0xb8c8c4),
    metalDark: lambert(metal, 0x74898c),
    container: lambert(container, 0xb2c7c4),
    containerRust: lambert(container, 0xc8a88a),
    rock: lambert(rock, 0x8f9c9a),
    cliff: lambert(cliff, 0x9aa3a0),
    hull: lambert(hull, 0xb28a72),
    roof: lambert(roofRust, 0xb98d74),
    sandDry: lambert(sandDry, 0xb5ab90),
    pebbles: lambert(pebbles, 0x9db1ad),
    floor: (() => {
      const map = sandWet.clone();
      map.needsUpdate = true;
      map.repeat.set(7, 7);
      return new THREE.MeshLambertMaterial({ map, color: 0xa7b1a4 });
    })(),
    pier: (() => {
      const map = pierWood.clone();
      map.needsUpdate = true;
      map.repeat.set(4, 1.4);
      return new THREE.MeshLambertMaterial({ map, color: 0xb5a17f });
    })(),
    crystal: new THREE.MeshLambertMaterial({
      map: crystalTex,
      color: 0xc06ad8,
      emissive: 0x5d1370,
      emissiveIntensity: 0.9,
    }),
    water: new THREE.MeshLambertMaterial({
      map: water,
      color: 0x87aeb5,
      emissive: 0x102a33,
    }),
    black: new THREE.MeshLambertMaterial({ color: 0x182226 }),
    rust: new THREE.MeshLambertMaterial({ color: 0x58402f }),
    plastic: new THREE.MeshLambertMaterial({ color: 0x1f3234 }),
    rope: lambert(cordaTex, 0xc9b394),
  };
  // Texturas do lote 9 substituem telhado, metal escuro e pedras molhadas.
  mat.roof.map = lonaTex;
  mat.roof.color.setHex(0xa89079);
  mat.roof.needsUpdate = true;
  mat.metalDark.map = metalCorroidoTex;
  mat.metalDark.color.setHex(0x93a8a2);
  mat.metalDark.needsUpdate = true;
  mat.rockWet = lambert(pedraMolhadaTex, 0x87999a);
  mat.black.fog = true;
  for (const key of ["concrete", "concreteDark", "wood", "woodDark", "metal", "metalDark", "container", "containerRust"])
    if (mat[key]) mat[key].userData.kind = key;

  const mesh = (geo, material, x, y, z, ry = 0) => {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    scene.add(m);
    return m;
  };
  const box = (w, h, d, material, x, y, z, ry = 0) =>
    mesh(new THREE.BoxGeometry(w, h, d), material, x, y, z, ry);

  // ---------- mar, areia, píeres e maré ----------
  // A água é um plano subdividido de baixa contagem: ondas reais de vértice,
  // textura rolando e espuma em faixas separadas. Sem reflexo caro.
  const seaGeo = new THREE.PlaneGeometry(180, 180, 48, 48);
  const sea = mesh(seaGeo, mat.water, 16, -0.34, 16);
  sea.rotation.x = -Math.PI / 2;
  const seaPos = seaGeo.getAttribute("position");
  const seaBase = new Float32Array(seaPos.array);
  const sand = mesh(new THREE.PlaneGeometry(34, 34), mat.floor, 16, -0.012, 16);
  sand.rotation.x = -Math.PI / 2;
  // Água rasa recortada pela linha da maré: o plano de areia não pode cobrir
  // a enseada. Esta faixa é um ribbon de 34 m com UVs em metros e vértices
  // animados; o mar aberto continua no plano grande abaixo.
  const shoreSegments = 34;
  const shoreVerts = 5;
  const shoreGeo = new THREE.BufferGeometry();
  const shorePos = [];
  const shoreUv = [];
  for (let zi = 0; zi <= shoreSegments; zi++) {
    const z = zi;
    const x0 = shoreX(z) - 0.12;
    for (let xi = 0; xi < shoreVerts; xi++) {
      const x = x0 + (34 - x0) * (xi / (shoreVerts - 1));
      shorePos.push(x, 0.022, z);
      shoreUv.push(x / 3.2, z / 3.2);
    }
  }
  const shoreIndex = [];
  for (let zi = 0; zi < shoreSegments; zi++) {
    for (let xi = 0; xi < shoreVerts - 1; xi++) {
      const a = zi * shoreVerts + xi, b = a + 1, c = a + shoreVerts, d = c + 1;
      shoreIndex.push(a, c, b, b, c, d);
    }
  }
  shoreGeo.setAttribute("position", new THREE.Float32BufferAttribute(shorePos, 3));
  shoreGeo.setAttribute("uv", new THREE.Float32BufferAttribute(shoreUv, 2));
  shoreGeo.setIndex(shoreIndex);
  shoreGeo.computeVertexNormals();
  const shoreMat = new THREE.MeshBasicMaterial({
    map: water,
    color: 0x3f6f78,
    transparent: true,
    opacity: 0.94,
    side: THREE.DoubleSide,
    fog: true,
  });
  const nearWater = new THREE.Mesh(shoreGeo, shoreMat);
  scene.add(nearWater);
  const shoreBase = new Float32Array(shorePos);
  // areia seca mais clara no miolo/oeste e uma língua de areia batida no spawn.
  const dry = mesh(new THREE.PlaneGeometry(19, 15), mat.sandDry, 8.5, 0.004, 22.5);
  dry.rotation.x = -Math.PI / 2;
  const spit = mesh(new THREE.PlaneGeometry(9, 6), mat.sandShells, 16, 0.006, 28.2);
  spit.rotation.x = -Math.PI / 2;
  // seixos e pedras soltas ao longo da arrebentação
  const shoreStones = [];
  for (let i = 0; i < 18; i++) {
    const z = 4 + i * 1.45 + hash(i, 1) * 0.7;
    const x = shoreX(z) - 1.2 - hash(i, 2) * 2.1;
    const stone = mesh(
      new THREE.PlaneGeometry(0.35 + hash(i, 3) * 0.8, 0.26 + hash(i, 4) * 0.55),
      mat.pebbles,
      x, 0.012, z, hash(i, 5) * TAU,
    );
    stone.rotation.x = -Math.PI / 2;
    shoreStones.push(stone);
  }

  // poças de maré, sem reflexo: só a textura e um brilho frio.
  for (let i = 0; i < 9; i++) {
    const px = 3 + hash(i, 1, 4) * 24,
      pz = 3 + hash(i, 2, 4) * 24;
    if (cell(px, pz) || waterAt(px, pz)) continue;
    const puddle = mesh(
      new THREE.PlaneGeometry(0.7 + hash(i, 3) * 1.5, 0.32 + hash(i, 4) * 0.8),
      new THREE.MeshLambertMaterial({
        map: aguaRasaTex,
        color: 0x1d3036,
        transparent: true,
        opacity: 0.52,
        emissive: 0x061219,
        depthWrite: false,
      }),
      px, 0.014, pz, hash(i, 5) * TAU,
    );
    puddle.rotation.x = -Math.PI / 2;
  }

  const plankMat = (w, d) => {
    const map = pisoPierTex.clone();
    map.needsUpdate = true;
    map.wrapS = map.wrapT = THREE.MirroredRepeatWrapping;
    map.repeat.set(Math.max(1, w / 6.2), Math.max(1, d / 6.2));
    return new THREE.MeshLambertMaterial({ map, color: 0xd6c1a2 });
  };
  const pierDeck = (x, z, w, d, y = 0.16, withPosts = true) => {
    const deck = box(w, 0.16, d, plankMat(w, d), x, y, z);
    if (!withPosts) return deck;
    for (let px = x - w / 2 + 0.55; px < x + w / 2; px += 1.9) {
      for (const pz of [z - d / 2 + 0.35, z + d / 2 - 0.35]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 2.6, 6), mat.woodDark);
        post.position.set(px, -0.75, pz);
        scene.add(post);
      }
    }
    return deck;
  };
  // Píer do Ponto Zero: o spawn é uma passarela que entra na arrebentação.
  pierDeck(16, 27.5, 7.4, 5.4, 0.1, false);
  box(0.18, 1.15, 0.18, mat.woodDark, 12.8, 0.55, 25.2);
  box(0.18, 1.15, 0.18, mat.woodDark, 19.2, 0.55, 25.2);
  // Píer leste, avançando sobre o mar profundo.
  pierDeck(33.8, 13.2, 17.5, 3.4, 0.18);
  // Plataforma de serviço: o portal final fica de fato sobre o píer.
  pierDeck(27.4, 26.0, 6.0, 8.6, 0.18);

  // espuma costeira: três faixas que sobem e descem
  const foamMap = espumaTex.clone();
  foamMap.needsUpdate = true;
  foamMap.repeat.set(1.4, 1);
  const foam = [];
  for (let i = 0; i < 12; i++) {
    const z = 4 + i * 1.75;
    const strip = mesh(
      new THREE.PlaneGeometry(1.9 + hash(i, 6) * 1.3, 0.38 + hash(i, 2) * 0.3),
      new THREE.MeshBasicMaterial({
        alphaMap: foamMap,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        color: 0xcfe8e1,
      }),
      shoreX(z) + 0.45, 0.13, z, 0,
    );
    strip.rotation.x = -Math.PI / 2;
    strip.rotation.z = (hash(i, 5) - 0.5) * 0.9;
    foam.push({ mesh: strip, baseX: strip.position.x, phase: i * 1.7, z });
  }

  // brilhos de lua sobre a água: faixas aditivas que seguem a maré.
  const glints = [];
  for (let i = 0; i < 12; i++) {
    const g = mesh(
      new THREE.PlaneGeometry(7 + hash(i, 1) * 16, 0.05 + hash(i, 2) * 0.12),
      new THREE.MeshBasicMaterial({
        color: hash(i, 3) > 0.3 ? 0x7fb7b0 : 0x9c78c8,
        transparent: true,
        opacity: 0.12 + hash(i, 4) * 0.16,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
      29 + hash(i, 5) * 16,
      0.058,
      2 + hash(i, 6) * 28,
      hash(i, 7) * TAU,
    );
    // ordem YXZ: o yaw entra antes da inclinação, senão a faixa fica em pé.
    g.rotation.order = "YXZ";
    g.rotation.x = -Math.PI / 2;
    glints.push({ mesh: g, phase: hash(i, 8) * 9, baseX: g.position.x });
  }

  // reflexos do farol e dos cristais: poças aditivas sobre a água rasa.
  const reflections = [];
  const moonPath = mesh(
    new THREE.PlaneGeometry(26, 7),
    new THREE.MeshBasicMaterial({
      map: glowTexture("116,190,186"),
      color: 0xffffff,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
    38, 0.06, 10,
  );
  moonPath.rotation.x = -Math.PI / 2;
  reflections.push({ mesh: moonPath, phase: 1.7, base: 0.2 });
  for (const [x, z, color, sx, sz, op] of [
    [54.0, 4.0, 0xffd28a, 18, 3.2, 0.16],
    [30.2, 8.0, 0xd34ce0, 6.5, 2.2, 0.15],
    [34.0, 17.0, 0x4fd9d2, 8.0, 2.0, 0.1],
    [29.0, 24.0, 0xd34ce0, 5.0, 1.6, 0.09],
  ]) {
    const refl = mesh(
      new THREE.PlaneGeometry(sx, sz),
      new THREE.MeshBasicMaterial({
        map: glowTexture(color === 0xffd28a ? "255,210,138" : color === 0x4fd9d2 ? "79,217,210" : "211,76,224"),
        color: 0xffffff,
        transparent: true,
        opacity: op,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
      x, 0.064, z,
    );
    refl.rotation.x = -Math.PI / 2;
    reflections.push({ mesh: refl, phase: hash(x, z) * 7, base: op });
  }

  // ---------- muralha, galpões e silhuetas ----------
  const wallCount = { all: 0 };
  // Paredes são fundidas em um único lote por material: ~5 draw calls em vez
  // de 600. UVs são calculadas em metros, então nenhuma face estica.
  const batches = { concrete: null, wood: null, metal: null, container: null, rock: null, trim: null };
  const makeBatch = () => ({ p: [], n: [], u: [], c: [] });
  for (const k of Object.keys(batches)) batches[k] = makeBatch();
  const TILE = 2.35;
  const col = (hex, mul = 1) => {
    const c = new THREE.Color(hex);
    c.multiplyScalar(mul);
    return c;
  };
  function quad(batch, a, b, c, d, normal, uvs, color) {
    // Respeitar a normal externa inclusive nas tampas e faces em X. Com a
    // ordem invertida essas fachadas desapareciam quando vistas de fora.
    const ab = new THREE.Vector3(b[0]-a[0], b[1]-a[1], b[2]-a[2]);
    const ac = new THREE.Vector3(c[0]-a[0], c[1]-a[1], c[2]-a[2]);
    const ccw = ab.cross(ac).dot(new THREE.Vector3(...normal)) > 0;
    const corners = [a,b,c,d];
    for (const i of ccw ? [0,1,2,0,2,3] : [0,2,1,0,3,2]) {
      batch.p.push(...corners[i]); batch.n.push(...normal);
      batch.u.push(uvs[i*2],uvs[i*2+1]); batch.c.push(color.r,color.g,color.b);
    }
  }
  function addBox(batch, cx, cy, cz, w, h, d, color, topDark = 0.38) {
    const x0 = cx - w / 2, x1 = cx + w / 2;
    const y0 = cy - h / 2, y1 = cy + h / 2;
    const z0 = cz - d / 2, z1 = cz + d / 2;
    const top = color.clone().multiplyScalar(topDark);
    quad(batch, [x1,y0,z0], [x1,y0,z1], [x1,y1,z1], [x1,y1,z0], [1,0,0],
      [z0/TILE,y0/TILE, z1/TILE,y0/TILE, z1/TILE,y1/TILE, z0/TILE,y1/TILE], color);
    quad(batch, [x0,y0,z1], [x0,y0,z0], [x0,y1,z0], [x0,y1,z1], [-1,0,0],
      [z1/TILE,y0/TILE, z0/TILE,y0/TILE, z0/TILE,y1/TILE, z1/TILE,y1/TILE], color);
    quad(batch, [x0,y0,z1], [x1,y0,z1], [x1,y1,z1], [x0,y1,z1], [0,0,1],
      [x0/TILE,y0/TILE, x1/TILE,y0/TILE, x1/TILE,y1/TILE, x0/TILE,y1/TILE], color);
    quad(batch, [x1,y0,z0], [x0,y0,z0], [x0,y1,z0], [x1,y1,z0], [0,0,-1],
      [x1/TILE,y0/TILE, x0/TILE,y0/TILE, x0/TILE,y1/TILE, x1/TILE,y1/TILE], color);
    quad(batch, [x0,y1,z0], [x1,y1,z0], [x1,y1,z1], [x0,y1,z1], [0,1,0],
      [x0/TILE,z0/TILE, x1/TILE,z0/TILE, x1/TILE,z1/TILE, x0/TILE,z1/TILE], top);
  }
  const batchFor = (kind) => batches[kind] ?? batches.concrete;
  const windowBatch = makeBatch();
  const faceQuad = (batch, axis, sign, cx, cy, cz, w, h, color, offset = 0.012) => {
    const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
    const z0 = cz - w / 2, z1 = cz + w / 2;
    const uv = [0,0, 1,0, 1,1, 0,1];
    if (axis === 'z' && sign > 0)
      quad(batch, [x0,y0,cz+offset], [x1,y0,cz+offset], [x1,y1,cz+offset], [x0,y1,cz+offset], [0,0,1], uv, color);
    else if (axis === 'z')
      quad(batch, [x1,y0,cz-offset], [x0,y0,cz-offset], [x0,y1,cz-offset], [x1,y1,cz-offset], [0,0,-1], uv, color);
    else if (axis === 'x' && sign > 0)
      quad(batch, [cx+offset,y0,z0], [cx+offset,y0,z1], [cx+offset,y1,z1], [cx+offset,y1,z0], [1,0,0], uv, color);
    else
      quad(batch, [cx-offset,y0,z1], [cx-offset,y0,z0], [cx-offset,y1,z0], [cx-offset,y1,z1], [-1,0,0], uv, color);
  };
  const addWindow = (x, y, h, axis, sign) => {
    const lit = hash(x, y, 21) > 0.52;
    const cx = x + 0.5, cz = y + 0.5;
    const cy = h * 0.62;
    const wx = axis === 'x' ? cx + sign*.51 : cx;
    const wz = axis === 'z' ? cz + sign*.51 : cz;
    faceQuad(windowBatch, axis, sign, wx, cy, wz, 0.58, 0.62, col(0x05090a));
    faceQuad(windowBatch, axis, sign, wx, cy, wz, 0.44, 0.48, col(lit ? 0xa87a46 : 0x142427), 0.02);
    if (lit) faceQuad(windowBatch, axis, sign, wx, cy, wz, 0.16, 0.48, col(0x061013), 0.028);
  };
  const addWall = (x, y, h, kind, type = 0) => {
    const flick = 0.84 + hash(x, y, 15) * 0.3;
    const tone = kind === 'wood' || kind === 'woodDark' ? 0xffe9cf
      : kind === 'container' ? 0xdff3ea
        : kind === 'metal' || kind === 'metalDark' ? 0xe4f0ec
          : kind === 'rock' ? 0xb8c8c2
            : 0xeef7f2;
    addBox(batchFor(kind), x + 0.5, h / 2, y + 0.5, 1.02, h, 1.02, col(tone, flick), 0.32);
    wallCount.all++;
  };

  const lowWallAt = (x, y) =>
    lote7Walls.some(([a, b, w, h]) => x >= a && x < a + w && y >= b && y < b + h);
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const c = cell(x + 0.5, y + 0.5);
      if (!c || c === 4) continue;
      const boundary = x === 0 || y === 0 || x === 31 || y === 31;
      if (boundary && waterAt(x + 0.5, y + 0.5)) continue;
      if (boundary || lowWallAt(x, y)) {
        // limite natural: rochas baixas e dunas. O mar aparece por cima.
        const h = boundary
          ? 0.5 + hash(x, y, 40) * 0.55 + (hash(x, y, 41) > 0.86 ? 0.9 : 0)
          : 0.46 + hash(x, y, 42) * 0.34;
        addWall(x, y, h, 'rock', 4);
        continue;
      }
      if (onCabinWall(x, y)) {
        // trechos desabados: a colisão permanece, mas o olhar atravessa o vão.
        const h = hash(x, y, 23) > 0.78 ? 1.06 : 2.92 + hash(x, y, 6) * 0.22;
        addWall(x, y, h, c === 3 || y < 12 ? 'metal' : 'wood', c === 3 ? 3 : 0);
        addBox(batches.trim, x + 0.5, h / 2, y + 0.5, 1.06, 0.055, 1.06, col(0x2c322e, 0.9), 0.8);
        addBox(batches.trim, x + 0.045, h / 2, y + 0.5, 0.07, h, 0.07, col(0x242a26, 0.9), 0.8);
        addBox(batches.trim, x + 0.955, h / 2, y + 0.5, 0.07, h, 0.07, col(0x242a26, 0.9), 0.8);
        if (h > 2.2 && hash(x, y, 18) > 0.6)
          addWindow(x, y, h, hash(x, y, 19) > 0.5 ? 'z' : 'x', hash(x, y, 20) > 0.5 ? 1 : -1);
      }
    }
  }
  const wallMaterials = {
    concrete: lambert(concrete, 0xffffff),
    wood: lambert(cabinWood, 0xffffff),
    metal: lambert(metal, 0xffffff),
    container: lambert(container, 0xffffff),
    rock: lambert(darkRock, 0xffffff),
  };
  for (const material of Object.values(wallMaterials)) {
    material.map.wrapS = material.map.wrapT = THREE.MirroredRepeatWrapping;
    material.map.repeat.set(1, 1);
  }
  // A rocha de limite tem 0,6–1,4 m: uma textura por célula vira um mosaico
  // gigante quando o jogador encosta na mureta. Três repetições dão escala.
  wallMaterials.rock.map.repeat.set(3, 3);
  const batchMesh = (batch, material) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(batch.p, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(batch.n, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(batch.u, 2));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(batch.c, 3));
    const m = new THREE.Mesh(geo, material);
    scene.add(m);
  };
  // fundação de concreto salgado sob as cabanas: dá peso e escala à orla.
  // O rodapé azulejado aparece dos dois lados da porta e ancora a paleta.
  for (const [a, b, w, h] of CABINS) {
    box(w + 0.32, 0.2, h + 0.32, mat.concrete, a + w / 2, 0.1, b + h / 2);
    const doorX = a + 3.5, z = b + h + 0.055;
    for (const [x0, x1] of [[a - 0.02, doorX - 1.5], [doorX + 1.5, a + w + 0.02]]) {
      const pw = x1 - x0;
      if (pw < 0.4) continue;
      const map = azulejoTex.clone();
      map.needsUpdate = true;
      map.repeat.set(Math.max(1, pw / 1.6), 0.62);
      box(pw, 0.95, 0.06, new THREE.MeshLambertMaterial({ map, color: 0xaec6bd }), (x0 + x1) / 2, 0.55, z);
    }
  }
  for (const [kind, batch] of Object.entries(batches)) {
    if (!batch.p.length) continue;
    if (kind === 'trim') {
      batchMesh(batch, new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true }));
      continue;
    }
    batchMesh(batch, new THREE.MeshLambertMaterial({
      map: wallMaterials[kind].map,
      vertexColors: true,
    }));
  }
  if (windowBatch.p.length)
    batchMesh(windowBatch, new THREE.MeshBasicMaterial({ vertexColors: true, fog: true }));
  for (const [cx, cy, w, h] of CABINS) {
    // telhado metálico com beiral; o interior continua escuro e fechado.
    box(w + 0.7, 0.2, h + 0.7, mat.roof, cx + w / 2, 3.62, cy + h / 2);
    box(w + 0.86, 0.09, h + 0.86, mat.black, cx + w / 2, 3.72, cy + h / 2);
    for (const [px, pz] of [
      [cx + 0.4, cy + 0.4],
      [cx + w - 0.4, cy + 0.4],
      [cx + 0.4, cy + h - 0.4],
      [cx + w - 0.4, cy + h - 0.4],
    ])
      box(0.16, 3.6, 0.16, mat.rust, px, 1.8, pz);
    // telhado de duas águas simplificado (duas lajes inclinadas)
    for (const side of [-1, 1]) {
      const slab = box(w + 0.9, 0.12, h * 0.58, mat.roof, cx + w / 2, 3.95, cy + h / 2 + side * h * 0.24);
      slab.rotation.x = side * 0.11;
    }
  }
  // Letreiro preso ao beiral, acima da entrada larga do galpão (não é um billboard).
  const shedSign = canvasTexture(g => {
    g.fillStyle = '#1a3337'; g.fillRect(0,0,144,32);
    g.strokeStyle = '#79918a'; g.strokeRect(1.5,1.5,141,29);
    g.fillStyle = '#d5ae68'; g.fillRect(4,4,28,24);
    g.font = 'bold 20px monospace'; g.fillStyle = '#142629'; g.fillText('02',6,23);
    g.font = 'bold 15px monospace'; g.fillStyle = '#d0dad1'; g.fillText('GALPÕES',38,17);
    g.font = '8px monospace'; g.fillText('GRUPO AUXILIAR',39,27);
  },144,32);
  mesh(new THREE.PlaneGeometry(3.6,.8),new THREE.MeshBasicMaterial({map:shedSign}),8.5,3.14,11.12);
  // Fiação alta só entre beirais; a única linha que cruza o pátio é o
  // cabo H-03 no chão. Não deixar pontas suspensas onde não há mais galpão.
  const wire = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(11.8, 3.62, 10.5), new THREE.Vector3(12.2, 2.62, 15.4),
    new THREE.Vector3(12.6, 3.62, 20.3),
  );
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(wire.getPoints(10)),
    new THREE.LineBasicMaterial({ color: 0x0b1111 })));

  const spriteTextures = new Map();
  const spriteTexture = (name) => {
    if (!spriteTextures.has(name)) {
      const im = images[name];
      if (!im) return null;
      const tex = new THREE.Texture(im);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestMipmapNearestFilter;
      tex.generateMipmaps = true;
      tex.needsUpdate = true;
      spriteTextures.set(name, tex);
    }
    return spriteTextures.get(name);
  };

  // ---------- orla: naufrágio, dunas, marcos e cristais ----------
  const scenery = [];
  const scenerySprite = (name, x, z, h, opacity = 1) => {
    const tex = spriteTexture(name);
    if (!tex) return null;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        alphaTest: 0.08,
        depthWrite: true,
        fog: true,
        opacity,
      }),
    );
    sprite.scale.set((h * tex.image.width) / tex.image.height, h, 1);
    sprite.center.set(0.5, 0);
    sprite.position.set(x, 0.02, z);
    scene.add(sprite);
    scenery.push({ sprite, x, z, baseY: 0.02, phase: hash(x, z) * 9 });
    return sprite;
  };
  // Píer do Ponto Zero: portal de quarentena sobre a passarela do spawn.
  scenerySprite("pier-zero", 13, 31.8, 2.2);
  // destroços encalhados na arrebentação
  const wreck = new THREE.Group();
  const hullMesh = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.35, 2.1), mat.hull);
  hullMesh.position.set(0, 0.55, 0);
  hullMesh.rotation.z = 0.1;
  wreck.add(hullMesh);
  const wreckCabin = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.35, 1.7), mat.hull);
  wreckCabin.position.set(-0.9, 1.55, 0);
  wreckCabin.rotation.z = -0.15;
  wreck.add(wreckCabin);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 5.6, 6), mat.woodDark);
  mast.position.set(1.2, 3.1, 0);
  mast.rotation.z = 0.3;
  wreck.add(mast);
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.2, 5), mat.woodDark);
  boom.position.set(2.2, 3.9, 0);
  boom.rotation.z = 1.1;
  wreck.add(boom);
  wreck.position.set(34.5, -.2, 19.5);
  wreck.rotation.y = -0.4;
  scene.add(wreck);
  scenerySprite("barco-destroco", 34.1, 20, 2.9, 0.9);

  // ---------- fauna ambiente ----------
  // Sprites de pose única animados por deslocamento/rotação: gaivotas circulam,
  // peixes saltam, caranguejos andam de lado e ondas correm para a praia.
  const airSprite = (name, height, tint = 0x9fb0aa) => {
    const tex = spriteTexture(name);
    if (!tex) return null;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tex, transparent: true, alphaTest: 0.08,
        depthWrite: false, fog: true, color: tint,
      }),
    );
    sprite.scale.set((height * tex.image.width) / tex.image.height, height, 1);
    sprite.center.set(0.5, 0.5);
    scene.add(sprite);
    return sprite;
  };
  const crabs = [
    [4.6, 26.4, 0.22], [8.2, 28.3, 0.18], [12.4, 26.6, 0.2],
    [22.6, 26.8, 0.21], [26.2, 23.4, 0.17],
  ].map(([x, z, h], i) => {
    const sprite = scenerySprite("caranguejo", x, z, h);
    return sprite ? { sprite, x, z, phase: i * 1.9, w: sprite.scale.x } : null;
  }).filter(Boolean);
  const gulls = [
    [16, 9, 7.2, 6.8, 0.2, 0.58], [24, 21, 8.5, 8.4, 2.1, 0.68],
    [9, 15, 6.2, 7.6, 4.4, 0.5],
  ].map(([cx, cz, r, y, phase, h]) => {
    const sprite = airSprite("gaivota", h, 0x8ea4a0);
    return sprite ? { sprite, cx, cz, r, y, phase } : null;
  }).filter(Boolean);
  const fish = [
    [6.0, 5.2, 0.0], [13.0, 6.8, 1.7], [21.0, 5.6, 3.1],
  ].map(([z, period, phase]) => {
    const sprite = airSprite("peixe", 0.48, 0xb3c2be);
    return sprite ? { sprite, z, period, phase } : null;
  }).filter(Boolean);
  const waveTex = spriteTexture("onda");
  const waves = [5, 11, 17, 23].map((z, i) => {
    if (!waveTex) return null;
    const sheet = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 1.6),
      new THREE.MeshBasicMaterial({
        map: waveTex, alphaMap: waveTex, transparent: true, opacity: 0.3,
        depthWrite: false, color: 0xd7e6df, side: THREE.DoubleSide,
      }),
    );
    sheet.rotation.x = -Math.PI / 2;
    sheet.position.set(shoreX(z) + 0.3, 0.18, z);
    scene.add(sheet);
    return { sheet, z, phase: i * 0.23 };
  }).filter(Boolean);

  // dunas: tufos secos nas bordas e pedras grandes apenas onde não cortam a
  // passagem nem o visual da arrebentação.
  for (let i = 0; i < 16; i++) {
    const x = 2.2 + (i % 4) * 1.1 + hash(i, 1, 31) * 0.8;
    const z = 4 + i * 1.55 + hash(i, 2, 31) * 0.6;
    if (cell(x, z) || waterAt(x, z)) continue;
    scenerySprite("vegetacao-duna", x, z, 0.55 + hash(i, 3) * 0.5, 0.9);
  }
  for (let i = 0; i < 10; i++) {
    const x = 2.2 + (i % 3) * 1.2 + hash(i, 4, 31) * 0.7;
    const z = 3.2 + i * 2.4 + hash(i, 5, 31) * 0.5;
    if (cell(x, z) || waterAt(x, z)) continue;
    scenerySprite("vegetacao-duna", x, z, 0.5 + hash(i, 6) * 0.45, 0.8);
  }
  for (const [x, z, r] of [
    [3.1, 6.4, 0.8], [2.6, 12.2, 0.65], [4.4, 23.6, 0.9],
    [7.2, 3.2, 0.7], [12.4, 2.6, 0.55], [24.8, 2.8, 0.75],
    [28.2, 27.8, 0.7], [3.3, 28.8, 0.62],
  ]) {
    if (cell(x, z) || waterAt(x, z)) continue;
    const nearWater =
      waterAt(x + 1.5, z) || waterAt(x - 1.5, z) ||
      waterAt(x, z + 1.5) || waterAt(x, z - 1.5);
    const rockMesh = new THREE.Mesh(
      new THREE.DodecahedronGeometry(r, 0),
      nearWater ? mat.rockWet : mat.rock,
    );
    rockMesh.position.set(x, r * 0.42, z);
    rockMesh.rotation.set(hash(x, z, 5) * TAU, hash(x, z, 6) * TAU, hash(x, z, 7) * TAU);
    rockMesh.scale.set(1.4, 0.5, 1);
    scene.add(rockMesh);
  }
  // Cristais discretos nas rochas periféricas.
  const crystalClusters = [];
  const addCrystalCluster = (x, z, scale = 1) => {
    const group = new THREE.Group();
    const shards = 5 + Math.floor(hash(x, z, 4) * 4);
    for (let j = 0; j < shards; j++) {
      const shard = new THREE.Mesh(
        new THREE.ConeGeometry(0.07 + hash(x, j, 8) * 0.1, 0.34 + hash(x, j, 9) * 0.5, 5),
        mat.crystal,
      );
      shard.position.set((hash(x, j, 10) - 0.5) * 0.62, 0.15 + hash(x, j, 11) * 0.15, (hash(x, j, 12) - 0.5) * 0.55);
      shard.rotation.z = (hash(x, j, 13) - 0.5) * 0.7;
      shard.rotation.x = (hash(x, j, 14) - 0.5) * 0.7;
      group.add(shard);
    }
    group.position.set(x, 0.02, z);
    group.scale.setScalar(scale);
    scene.add(group);
    crystalClusters.push({ group, phase: hash(x, z) * 7, base: 1 });
    return group;
  };
  addCrystalCluster(27.1, 6.7, 0.62);
  addCrystalCluster(3.4, 8.2, 0.6);
  addCrystalCluster(27.5, 12.3, 0.55);
  addCrystalCluster(13.9, 4.2, 0.55);

  const updateCircuit = installStations(scene, mat, trilhaTex, caboTex);

  // Âncora Próxima do Nulo: o marco final, com anel e eletricidade roxa.
  const anchorGroup = new THREE.Group();
  const anchorStone = new THREE.Mesh(new THREE.DodecahedronGeometry(.92, 0), mat.rock);
  anchorStone.position.y = 0.3;
  anchorStone.scale.set(1.4, 0.55, 1.1);
  anchorGroup.add(anchorStone);
  const anchorRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.65, 0.075, 6, 26),
    new THREE.MeshBasicMaterial({ color: 0xc74dde, transparent: true, opacity: 0.55, fog: true }),
  );
  anchorRing.position.y = 2.0;
  anchorGroup.add(anchorRing);
  const anchorRing2 = anchorRing.clone();
  anchorRing2.scale.setScalar(0.72);
  anchorRing2.material = anchorRing.material.clone();
  anchorRing2.material.color.setHex(0x54e0d2);
  anchorGroup.add(anchorRing2);
  const anchorHalo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture("255,255,255"),
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    }),
  );
  anchorHalo.scale.set(7.5, 7.5, 1);
  anchorHalo.position.y = 2.0;
  anchorGroup.add(anchorHalo);
  for (let i = 0; i < 8; i++) {
    const shard = new THREE.Mesh(
      new THREE.ConeGeometry(0.1 + hash(i, 2) * 0.09, 0.45 + hash(i, 3) * 0.75, 5),
      mat.crystal,
    );
    const a = (i / 8) * TAU;
    shard.position.set(Math.cos(a) * 1.25, 0.35, Math.sin(a) * 1.1);
    shard.rotation.z = (hash(i, 4) - 0.5) * 0.8;
    anchorGroup.add(shard);
  }
  anchorGroup.scale.setScalar(.80);
  anchorGroup.position.set(anchor.x, .26, anchor.y);
  anchorGroup.rotation.y = Math.atan2(anchor.approach[0]-anchor.x, anchor.approach[1]-anchor.y);
  scene.add(anchorGroup);

  // Sobrecarga final: o Nulo rompe o próprio corpo antes de a fenda abrir.
  const overload = new THREE.Group();
  const overloadRings = [];
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.1 + i * 0.5, 0.045 + i * 0.015, 5, 28),
      new THREE.MeshBasicMaterial({
        color: i === 1 ? 0x54e0d2 : 0xe248e8,
        transparent: true,
        opacity: 0,
        fog: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    ring.rotation.x = Math.PI / 2;
    overload.add(ring);
    overloadRings.push(ring);
  }
  const overloadCore = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture("226,72,232"),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    }),
  );
  overloadCore.scale.set(3, 3, 1);
  overload.add(overloadCore);
  overload.position.set(anchor.x, 1.4, anchor.y);
  overload.visible = false;
  scene.add(overload);
  const overloadSprite = scenerySprite("nulo-sobrecarga", anchor.x, anchor.y, 4.3, 0);
  if (overloadSprite) overloadSprite.visible = false;

  // pilhas de contêineres / galpões fora do limite jogável (silhueta)
  const cladMaterial = (material, w, h) => {
    const map = material.map.clone();
    map.needsUpdate = true;
    map.wrapS = map.wrapT = THREE.MirroredRepeatWrapping;
    map.repeat.set(Math.max(1, w / 2.6), Math.max(1, h / 2.6));
    return new THREE.MeshLambertMaterial({ map, color: material.color.clone() });
  };
  const outside = [
    [-7, 7, 6, 2.9, 8, mat.container],
    [-9, 19, 12, 3.1, 5, mat.containerRust],
    [36, 1, 5, 2.7, 5, mat.containerRust],
    [8, -7, 14, 4.4, 7, mat.metalDark],
    [24, -9, 9, 5.2, 8, mat.metalDark],
    [-4, 33, 10, 3.4, 6, mat.container],
  ];
  for (const [x, z, w, h, d, material] of outside) {
    box(w, h, d, cladMaterial(material, w, h), x, h / 2, z);
    box(w + 0.15, 0.18, d + 0.15, mat.black, x, h + 0.09, z);
    if (hash(x, z) > 0.45) box(0.14, h * 0.7, 0.14, mat.rust, x + w / 2, h * 0.4, z - d / 2);
  }

  // O farol: torre facetada, lanterna de Fresnel e feixe no nevoeiro.
  const lighthouse = new THREE.Group();
  const towerMat = lambert(cliff, 0x9ca7a2);
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 2.25, 12, 9, 3), towerMat);
  tower.position.y = 6;
  lighthouse.add(tower);
  for (let i = 0; i < 4; i++) {
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(2.25 - i * 0.24, 2.25 - i * 0.24, 0.16, 9),
      mat.metalDark,
    );
    band.position.y = 1.4 + i * 2.8;
    lighthouse.add(band);
  }
  const gallery = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.65, 0.3, 9), mat.black);
  gallery.position.y = 12.1;
  lighthouse.add(gallery);
  const lantern = new THREE.Mesh(
    new THREE.CylinderGeometry(1.18, 1.4, 1.8, 8),
    new THREE.MeshLambertMaterial({
      map: vidroFarolTex,
      color: 0x3b4136,
      emissive: 0x8a5a20,
      emissiveIntensity: 0.9,
      transparent: true,
      opacity: 0.9,
    }),
  );
  lantern.position.y = 13.1;
  lighthouse.add(lantern);
  const lighthouseGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture("255,190,96"),
      color: 0xffffff,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    }),
  );
  lighthouseGlow.scale.set(2.6, 2.6, 1);
  lighthouseGlow.position.set(0, 13.1, 0);
  lighthouse.add(lighthouseGlow);
  // O feixe volumétrico foi removido: o halo do Fresnel, o nevoeiro denso e
  // os reflexos no mar já leem como farol, sem planos aditivos cortando a cena.
  // base de penhasco: o farol nasce de uma massa de rocha, não flutua.
  for (let i = 0; i < 7; i++) {
    const rockBase = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1.3 + hash(i, 1) * 1.1, 0),
      mat.cliff,
    );
    const a = (i / 7) * TAU;
    rockBase.position.set(Math.cos(a) * 2.6, -0.7 + hash(i, 2) * 0.9, Math.sin(a) * 2.6);
    rockBase.scale.set(1.35, 1.0 + hash(i, 3) * 0.9, 1.15);
    lighthouse.add(rockBase);
  }
  const cliffIsland = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 6.2, 4.6, 9, 2),
    mat.cliff,
  );
  cliffIsland.position.set(58, 1.05, 2);
  cliffIsland.scale.set(1, 1, 1.15);
  scene.add(cliffIsland);
  lighthouse.position.set(58, 2.1, 2);
  lighthouse.rotation.y = -0.2;
  scene.add(lighthouse);

  // rochas litorâneas e cristais cromáticos (geometria real, não textura chapada)
  const crystals = [];
  const crystalMat = new THREE.MeshLambertMaterial({
    color: 0x9a42c2,
    map: crystalTex,
    emissive: 0x6a1280,
    emissiveIntensity: 1.15,
  });
  const crystalMat2 = new THREE.MeshLambertMaterial({
    color: 0x3b8aa8,
    emissive: 0x14859c,
    emissiveIntensity: 0.9,
  });
  // Agulhas e rochas marinhas fora do alcance: silhueta no horizonte, sem
  // invadir a praia nem a câmera.
  for (const [x, z, r, h] of [
    [42.5, 3.2, 2.2, 4.2], [45.4, 14.8, 2.8, 5.1], [40.2, 29.8, 1.9, 3.0],
    [34.8, 38.4, 2.4, 3.2], [48.6, 21.2, 1.8, 2.4],
  ]) {
    const stack = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), mat.cliff);
    stack.position.set(x, h * 0.35, z);
    stack.scale.set(1, h / r * 0.55, 1);
    stack.rotation.set(hash(x, z, 1) * TAU, hash(x, z, 2) * TAU, hash(x, z, 3) * TAU);
    scene.add(stack);
    const skirt = new THREE.Mesh(new THREE.DodecahedronGeometry(r * 1.5, 0), mat.cliff);
    skirt.position.set(x, -0.35, z);
    skirt.scale.set(1, 0.22, 1);
    scene.add(skirt);
  }

  // postes de luz falhantes, lâmpadas de serviço e halos
  const lamps = [];
  const lampAt = (x, z, height = 3.4, flicker = 0) => {
    box(0.12, height, 0.12, mat.black, x, height / 2, z);
    box(0.7, 0.12, 0.16, mat.black, x, height, z);
    const bulb = box(
      0.28,
      0.16,
      0.2,
      new THREE.MeshBasicMaterial({ color: 0xffb15c }),
      x,
      height - 0.16,
      z,
    );
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture("255,178,98"),
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    );
    halo.scale.set(2.2, 2.2, 1);
    halo.position.set(x, height - 0.1, z);
    scene.add(halo);
    lamps.push({ light: null, bulb, halo, base: 30, flicker, phase: hash(x, z) * 10 });
  };
  lampAt(2.5, 5.5, 3.6, 0.1);
  lampAt(29.4, 2.4, 3.5, 0.02);
  lampAt(2.6, 27.5, 3.2, 0.35);
  lampAt(31.5, 29.4, 3.8, 0.08);
  lampAt(11.5, 10.5, 2.7, 0.22);
  lampAt(31.2, 12.3, 3.1, 0.04);

  // lâmpadas presas em cabos, à deriva
  const swinging = [];
  for (const [x, z, y] of [
    [12.3, 9.5, 3.0],
    [20.2, 17.2, 3.3],
    [9.3, 21.0, 2.8],
  ]) {
    box(0.16, 0.16, 0.16, mat.black, x, y + 0.4, z);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 6, 4),
      new THREE.MeshBasicMaterial({ color: 0xffcf8b }),
    );
    bulb.position.set(x, y, z);
    scene.add(bulb);
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture("255,190,110"),
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    );
    halo.scale.set(1.5, 1.5, 1);
    halo.position.copy(bulb.position);
    scene.add(halo);
    swinging.push({ bulb, halo, x, z, y, phase: hash(x, z) * 8 });
  }

  // caixas, tambores, paletes e mourões: props coerentes com o cais.
  for (let i = 0; i < 9; i++) {
    const x = 2 + hash(i, 1, 21) * 9,
      z = 2 + hash(i, 2, 21) * 25;
    if (cell(x, z) || waterAt(x, z) || inCabin(x, z)) continue;
    const kind = i % 3;
    if (kind === 0) {
      const crate = box(0.66, 0.58, 0.62, mat.woodDark, x, 0.29, z, hash(i, 3) * TAU);
      box(0.72, 0.055, 0.07, mat.rust, x, 0.5, z, crate.rotation.y);
      box(0.07, 0.055, 0.68, mat.rust, x, 0.5, z, crate.rotation.y);
      if (hash(i, 4) > 0.55) box(0.46, 0.44, 0.46, mat.woodDark, x + 0.32, 0.79, z + 0.08, hash(i, 5));
    } else if (kind === 1) {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.9, 7), mat.container);
      barrel.position.set(x, 0.45, z);
      barrel.rotation.z = hash(i, 6) > 0.76 ? Math.PI / 2 : 0;
      scene.add(barrel);
      for (const yy of [0.23, 0.67]) {
        const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.018, 4, 12), mat.rust);
        hoop.rotation.x = Math.PI / 2;
        hoop.position.set(x, yy, z);
        scene.add(hoop);
      }
    } else if (kind === 2) {
      // palete de tábuas e corda enrolada, em vez de cano solto.
      box(1.1, 0.1, 0.72, mat.pier, x, 0.16, z, hash(i, 7) * 0.3);
      box(1.1, 0.09, 0.1, mat.woodDark, x, 0.06, z - 0.29);
      box(1.1, 0.09, 0.1, mat.woodDark, x, 0.06, z + 0.29);
      const rope = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.055, 4, 12), mat.rust);
      rope.rotation.x = Math.PI / 2;
      rope.position.set(x, 0.24, z);
      scene.add(rope);
    }
  }
  // antenas e postes de rádio na silhueta norte
  for (const [x, z, h] of [
    [10, -2, 9],
    [22, -3, 12],
    [34, 9, 8],
    [-3, 14, 7],
  ]) {
    box(0.1, h, 0.1, mat.black, x, h / 2, z);
    for (let i = 1; i < 4; i++) box(h * 0.16, 0.045, 0.045, mat.black, x, (h / 4) * i, z);
    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 4, 3),
      new THREE.MeshBasicMaterial({ color: 0xff4d3d }),
    );
    tip.position.set(x, h + 0.15, z);
    scene.add(tip);
    swinging.push({ bulb: tip, halo: null, x, z, y: h, phase: hash(x, z) * 4, antenna: true });
  }

  // ---------- iluminação e lanterna ----------
  const hemi = new THREE.HemisphereLight(0x9fc3d4, 0x131820, 4.0);
  const ambient = new THREE.AmbientLight(0x6d8798, 4.2);
  scene.add(hemi);
  scene.add(ambient);
  const moon = new THREE.DirectionalLight(0xa9c8dc, 0.95);
  moon.position.set(-12, 22, -12);
  scene.add(moon);
  // preenchimento frio vindo do sul: as fachadas que o jogador encara não
  // somem em preto absoluto. A sombra continua concentrada no cone da lanterna.
  const facadeFill = new THREE.DirectionalLight(0x7394a6, 1.15);
  facadeFill.position.set(8, 9, 28);
  scene.add(facadeFill);
  const torch = new THREE.SpotLight(0xffd9a4, 42, 30, 0.46, 0.55, 1.4);
  torch.position.set(0.11, -0.06, 0);
  torch.target.position.set(0, 0, -5.5);
  camera.add(torch);
  camera.add(torch.target);
  const torchCone = new THREE.Mesh(
    new THREE.ConeGeometry(1.35, 7.5, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xffe0ae,
      transparent: true,
      opacity: 0.018,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    }),
  );
  torchCone.rotation.x = -Math.PI / 2;
  torchCone.position.set(0, 0, -3.8);
  camera.add(torchCone);

  // finos feixes de poeira no ar
  const moteCount = 260;
  const moteGeo = new THREE.BufferGeometry();
  const motePos = new Float32Array(moteCount * 3);
  for (let i = 0; i < moteCount; i++) {
    motePos[i * 3] = 2 + Math.random() * 28;
    motePos[i * 3 + 1] = 0.15 + Math.random() * 4;
    motePos[i * 3 + 2] = 2 + Math.random() * 28;
  }
  moteGeo.setAttribute("position", new THREE.BufferAttribute(motePos, 3));
  const moteMat = new THREE.PointsMaterial({
    color: 0xb6d8d0,
    size: 0.035,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const motes = new THREE.Points(moteGeo, moteMat);
  scene.add(motes);

  // Chuva fina e spray da arrebentação: partículas locais que seguem o jogador.
  const rainCount = 360;
  const rainPos = new Float32Array(rainCount * 3);
  for (let i = 0; i < rainCount; i++) {
    rainPos[i * 3] = 4 + Math.random() * 24;
    rainPos[i * 3 + 1] = Math.random() * 12;
    rainPos[i * 3 + 2] = 4 + Math.random() * 24;
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({
    color: 0x9fc4c2, size: 0.055, transparent: true, opacity: 0.34,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  }));
  scene.add(rain);

  const sprayCount = 140;
  const sprayPos = new Float32Array(sprayCount * 3);
  const spraySeed = new Float32Array(sprayCount);
  for (let i = 0; i < sprayCount; i++) {
    const z = Math.random() * 32;
    sprayPos[i * 3] = shoreX(z) + 0.3 + Math.random() * 4.5;
    sprayPos[i * 3 + 1] = 0.1 + Math.random() * 1.4;
    sprayPos[i * 3 + 2] = z;
    spraySeed[i] = Math.random() * 6;
  }
  const sprayGeo = new THREE.BufferGeometry();
  sprayGeo.setAttribute("position", new THREE.BufferAttribute(sprayPos, 3));
  const spray = new THREE.Points(sprayGeo, new THREE.PointsMaterial({
    color: 0xc6ece6, size: 0.09, transparent: true, opacity: 0.2,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  }));
  scene.add(spray);

  // bancos de névoa rasante sobre a arrebentação: planos suaves, sem blending
  // aditivo (o SwiftShader desenha halos duros em aditivos grandes).
  const mistTex = glowTexture("156,186,190");
  const mist = [];
  for (let i = 0; i < 7; i++) {
    const puff = new THREE.Mesh(
      new THREE.PlaneGeometry(11 + (i % 3) * 4, 7 + (i % 2) * 3),
      new THREE.MeshBasicMaterial({
        map: mistTex, color: 0x9fb8bc, transparent: true,
        opacity: 0.05 + (i % 3) * 0.012, depthWrite: false, fog: true,
      }),
    );
    puff.rotation.x = -Math.PI / 2;
    puff.position.set(30 + (i % 4) * 3.4, 0.6 + (i % 3) * 0.35, 4 + i * 4.1);
    puff.userData.baseX = puff.position.x;
    puff.userData.phase = i * 1.7;
    mist.push(puff);
    scene.add(puff);
  }

  const overloadLight = new THREE.PointLight(0xe04ce6, 0, 30, 2);
  overloadLight.position.set(anchor.x, 4.2, anchor.y);
  scene.add(overloadLight);

  // ---------- sprites de objetos ----------
  const propSprites = new Map();
  const propShadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
  });
  // Vento/água: props leves balançam de forma determinística.
  const propBob = {
    "boia-sinalizadora": [0.042, 1.3],
    "bote-salva-vidas": [0.028, 1.05],
    "rede-pesca": [0.012, 1.5],
    "bandeira-sinal": [0.02, 2.35],
    "cogumelo-sal": [0.005, 1.8],
    "lanterna-querosene": [0.008, 1.2],
    "boia-cromatica": [0.05, 1.18],
    "rede-deriva": [0.011, 1.42],
    "sino-neblina": [0.007, 1.55],
    "lente-farolim": [0.004, 0.95],
  };
  const addProp = (o) => {
    const art = o.art;
    const tex = spriteTexture(art);
    if (!tex) return;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        alphaTest: 0.12,
        depthWrite: true,
        fog: true,
        color: 0xffffff,
      }),
    );
    const h = (o.scale ?? 0.8) * (o.note ? 1.7 : 1.3);
    sprite.scale.set((h * tex.image.width) / tex.image.height, h, 1);
    sprite.center.set(0.5, 0);
    sprite.position.set(o.x, 0.025 + (o.lift ?? 0), o.y);
    scene.add(sprite);
    const shadow = mesh(
      new THREE.CircleGeometry(Math.max(0.22, h * 0.26), 10),
      propShadowMat,
      o.x,
      0.018,
      o.y,
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(1, 0.55, 1);
    const key = `${o.art}@${o.x.toFixed(2)},${o.y.toFixed(2)}`;
    propSprites.set(key, {
      sprite,
      shadow,
      prop: o,
      bob: propBob[art] ?? null,
    });
  };
  props.forEach(addProp);

  // Uma seta baixa por trecho, apontando no sentido real do corredor.
  const paint = new THREE.MeshBasicMaterial({map: spriteTexture('seta-chao'), transparent: true, alphaTest: .18, depthWrite: false});
  for (const { walk } of circuitLegs) {
    const [[ax,az],[bx,bz]] = walk;
    const arrow = mesh(new THREE.PlaneGeometry(.75,.75),paint,(ax+bx)/2,.281,(az+bz)/2);
    arrow.rotation.set(-Math.PI/2,0,-Math.atan2(bz-az,bx-ax));
  }

  // Marcador do objetivo: a mesma tira de quatro quadros do lote 13. Ele é o
  // "para onde ir" no mundo; o chip da HUD só repete a informação em texto.
  const markerFrames = Array.from({ length: 4 }, (_, index) =>
    spriteTexture(`marcador-objetivo-${index}`),
  ).filter(Boolean);
  const marker = markerFrames.length
    ? new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: markerFrames[0],
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          fog: true,
          opacity: 0.9,
        }),
      )
    : null;
  if (marker) {
    marker.center.set(0.5, 0.5);
    marker.scale.setScalar(0.9);
    marker.visible = false;
    marker.renderOrder = 6;
    scene.add(marker);
  }
  let markerTarget = null;

  // Ondas de interação: pool de quatro sprites, nada é criado em jogo.
  const waveFrames = Array.from({ length: 6 }, (_, index) =>
    spriteTexture(`interacao-onda-${index}`),
  ).filter(Boolean);
  const interactWaves = [];
  for (let i = 0; i < 4; i++) {
    if (!waveFrames.length) break;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: waveFrames[0],
        transparent: true,
        opacity: 0,
        depthWrite: false,
        fog: true,
      }),
    );
    sprite.center.set(0.5, 0.5);
    sprite.visible = false;
    sprite.renderOrder = 5;
    scene.add(sprite);
    interactWaves.push({ sprite, age: 1, frame: 0 });
  }
  let waveCursor = 0;
  const pulse = (site) => {
    if (!interactWaves.length) return;
    const wave = interactWaves[waveCursor++ % interactWaves.length];
    wave.age = 0;
    wave.frame = 0;
    wave.size = site === anchor ? 1.25 : .47;
    wave.sprite.material.color.set(statusColor.online);
    wave.sprite.material.map = waveFrames[0];
    // Onda na face do equipamento, não enterrada no piso ou dentro da malha.
    wave.sprite.position.set((site.x+site.approach[0])/2, site === anchor ? 2 : 1.45, (site.y+site.approach[1])/2);
    wave.sprite.visible = true;
  };

  // Cordame de proteção na ponta sul do píer, virado para a água.
  const dockRopes = [];
  for (const x of [26.4, 28.2, 30.0]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 1.02, 5), mat.woodDark);
    post.position.set(x, 0.51, 30.15);
    scene.add(post);
  }
  for (const y of [0.55, 0.92]) {
    const rope = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 3.7, 5),
      mat.rope,
    );
    rope.rotation.z = Math.PI / 2;
    rope.position.set(28.2, y, 30.15);
    scene.add(rope);
    dockRopes.push(rope);
  }

  // Sprites não recebem luz: escurecemos por distância/cone para integrarem a
  // cena em vez de parecerem adesivos flutuantes.
  const shadeSprite = (sprite, m) => {
    const dx = sprite.position.x - m.x, dz = sprite.position.z - m.y;
    const d = Math.hypot(dx, dz) || 1;
    const dot = (dx * Math.cos(m.angle) + dz * Math.sin(m.angle)) / d;
    const beam = dot > 0.55 ? 1 : dot > 0.1 ? 0.58 : 0.28;
    const torchFactor = m.lampOn === false || (m.lamp ?? 100) <= 0.5 ? 0.42 : 1;
    const shade = clamp(0.24 + beam * 0.5 * torchFactor - d * 0.007, 0.14, 0.76);
    sprite.material.color.setRGB(shade * 0.9, shade * 0.94, shade * 0.9);
    // Sprite colado na câmera vira uma parede de textura: desvanece antes.
    if (sprite.userData.baseOpacity === undefined) sprite.userData.baseOpacity = sprite.material.opacity;
    // A partir de 1,15 m o adereço começa a aparecer: antes disso ele é a
    // própria parede da câmera. O ramo curto mantém os props legíveis já na
    // distância de interação, sem sumir quando o jogador chega perto.
    const near = clamp((d - 0.9) / 0.85, 0, 1);
    sprite.material.opacity = sprite.userData.baseOpacity * near;
    sprite.material.transparent = true;
  };
  const shadeDynamic = (m) => {
    for (const sprite of dynamic.values()) if (sprite.visible) shadeSprite(sprite, m);
  };

  // nulo, inimigos e vultos de nevoeiro
  const dynamic = new Map();
  const dynamicSprite = (name) => {
    const tex = spriteTexture(name);
    if (!tex) return null;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        alphaTest: 0.1,
        depthWrite: true,
        fog: true,
      }),
    );
    scene.add(sprite);
    return sprite;
  };
  const ghostTexture = silhouetteTexture();
  const ghosts = [];
  const ghostSpots = [
    [16.5, 3.2, 2.8],
    [2.7, 15.2, 2.5],
    [29.2, 22.2, 2.9],
    [11.6, 30.1, 3.3],
  ];
  for (let i = 0; i < ghostSpots.length; i++) {
    const [x, z, y] = ghostSpots[i];
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: ghostTexture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        fog: false,
        color: 0x000000,
      }),
    );
    sprite.scale.set(1.15, 2.6, 1);
    sprite.center.set(0.5, 0);
    sprite.position.set(x, y - 2.4, z);
    scene.add(sprite);
    ghosts.push({
      sprite,
      x,
      z,
      delay: [26, 68, 112, 165][i],
      lit: 0,
      seen: 0,
      active: false,
      cooldown: 0,
      phase: hash(x, z) * 5,
    });
  }

  let sting = 0;
  const state = {
    available: true,
    interference: 0,
    flashlight: false,
    entry: 1,
    ready: true,
    fear: 0,
    litSilhouette: false,
    threat: 0,
    enemyFrame: 0,
    overload: false,
  };
  const lookAt = new THREE.Vector3();
  const projected = new THREE.Vector3();

  function updateGhosts(dt, m, tension) {
    const fx = Math.cos(m.angle),
      fz = Math.sin(m.angle);
    for (const g of ghosts) {
      g.sprite.getWorldPosition(projected);
      const dx = g.x - m.x,
        dz = g.z - m.y;
      const d = Math.hypot(dx, dz);
      const dot = d > 0.001 ? (dx * fx + dz * fz) / d : 0;
      g.cooldown = Math.max(0, g.cooldown - dt);
      if (!g.active && m.p.elapsed > g.delay && g.cooldown <= 0) {
        g.active = true;
        g.seen = 0;
        g.lit = 0;
        sting = Math.max(sting, 0.65);
        onFear({ kind: "silhouette", x: g.x, z: g.z });
      }
      if (!g.active) {
        g.sprite.material.opacity = Math.max(0, g.sprite.material.opacity - dt * 1.2);
        continue;
      }
      g.seen += dt;
      // a lanterna "mata" o vulto: quando o olhar o encontra, ele desmancha.
      const illuminated = d < 19 && dot > 0.915;
      if (illuminated) {
        g.lit += dt;
        torch.intensity = 55;
        sting = Math.max(sting, 0.9);
      } else g.lit = Math.max(0, g.lit - dt * 0.6);
      const base = 0.82 - clamp(d / 34, 0, 0.55);
      g.sprite.material.opacity = clamp(base * (1 - g.lit / 1.1), 0, 0.82);
      if (g.lit > 0.85 || g.seen > 34) {
        g.active = false;
        g.cooldown = 40 + hash(g.x, g.z, 3) * 20;
        sting = 1;
        onFear({ kind: "vanish", x: g.x, z: g.z });
      }
    }
    state.fear = ghosts.filter((g) => g.active).length;
    state.litSilhouette = ghosts.some((g) => g.active && g.lit > 0.2);
  }

  function setSpriteFor(mapKey, name, x, z, scale, opts = {}) {
    let sprite = dynamic.get(mapKey);
    if (!sprite) {
      sprite = dynamicSprite(name);
      if (!sprite) return null;
      dynamic.set(mapKey, sprite);
    } else if (sprite.material.map !== spriteTexture(name)) {
      sprite.material.map = spriteTexture(name);
      sprite.material.needsUpdate = true;
    }
    const tex = sprite.material.map;
    const h = scale * (opts.height ?? 1.6);
    sprite.scale.set((h * tex.image.width) / tex.image.height, h, 1);
    sprite.center.set(0.5, 0);
    sprite.position.set(x, 0.03, z);
    sprite.visible = !!opts.visible;
    sprite.material.opacity = opts.opacity ?? 1;
    return sprite;
  }

  function updateEnemies(enemies = [], m, t = 0, dt = 0) {
    let closest = Infinity;
    enemies.forEach((e, i) => {
      const phase = e.phase || "idle";
      const family = enemyFamily(e);
      let frame = family ? enemyFrame(e, t) : 0;
      let name =
        family && images[`${family}-${frame}`]
          ? `${family}-${frame}`
          : e.hunter ? (phase === "hurt" || phase === "dissolve" ? "afogado-dano" : "afogado-mare")
          : e.guardian ? (phase === "hurt" || phase === "dissolve" ? "guardiao-dano" : "guardiao-mare")
            : phase === "dissolve" ? "infectado-dissolvido"
              : phase === "hurt" ? "infectado-dano"
                : phase === "windup" || phase === "strike" ? (e.variant === "alto" ? "infectado-golpe-alto" : "infectado-golpe-baixo")
                  : phase === "stunned" ? "infectado-atordoado"
                    : phase === "rise" || phase === "recover" ? "infectado-erguendo"
                      : phase === "listen" ? "infectado-escuta"
                        : phase === "search" ? "infectado-busca"
                          : "infectado";
      const dist = Math.hypot(e.x - m.x, e.y - m.y);
      closest = Math.min(closest, dist);
      const lunge = frame === 3 ? 1.16 : 1;
      const sprite = setSpriteFor(`enemy:${i}`, name, e.x, e.y,
        (e.hunter ? 1.08 : e.guardian ? 1.12 : 1) * lunge, {
          visible: !e.dead,
          height: 1.5,
        });
      if (!sprite) return;
      // respiração/andar: o sprite nunca fica parado no mundo.
      const bob = Math.sin(t * (frame === 3 ? 13 : 4.2) + i * 2.1) * (frame === 3 ? 0.035 : 0.018);
      const glitch = frame === 2 && !motionless;
      sprite.position.set(
        e.x + (glitch ? Math.sin(t * 51 + i) * 0.055 : 0),
        0.03 + bob,
        e.y + (glitch ? Math.cos(t * 43 + i) * 0.045 : 0),
      );
      sprite.material.rotation = glitch
        ? Math.sin(t * 37 + i) * 0.018
        : Math.sin(t * 2.6 + i) * 0.005;
      if (glitch) {
        const k = Math.sin(t * 19 + i) > 0 ? [1, 0.35, 0.95] : [0.35, 1, 0.95];
        sprite.material.color.setRGB(k[0], k[1], k[2]);
      }
      // a distância física modula a distorção de tela e a respiração do HUD.
      sprite.material.opacity = e.dead ? 0 : clamp(1 - Math.max(0, dist - 16) * 0.015, 0.55, 1);
    });
    state.threat = Number.isFinite(closest) ? clamp(1 - closest / 12, 0, 1) : 0;
    state.enemyFrame = enemies[0] && enemyFamily(enemies[0]) ? enemyFrame(enemies[0], t) : 0;
    state.overload = m.timedOut;
  }

  function updateNulo(n, m, t = 0, endClock = 0) {
    if (!n) return;
    const over = m.timedOut;
    state.overload = over;
    if (over) {
      const name = images["nulo-sobrecarga"] ? "nulo-sobrecarga" : "nulo-operador-voz";
      const sprite = setSpriteFor("nulo", name, n.x, n.y, 1.7 + Math.min(1.8, endClock * 0.45), {
        visible: true,
        height: 2.4,
      });
      if (sprite) {
        sprite.material.opacity = 0.72 + Math.sin(t * 17) * 0.24;
        sprite.material.color.setRGB(
          0.9 + Math.sin(t * 31) * 0.2,
          0.7 + Math.cos(t * 23) * 0.2,
          1,
        );
        sprite.position.x = n.x + Math.sin(t * 41) * 0.08;
        sprite.position.z = n.y + Math.cos(t * 37) * 0.06;
      }
      overload.visible = true;
      overload.scale.setScalar(0.7 + Math.min(2.2, endClock * 0.55));
      overloadCore.material.opacity = 0.35 + Math.sin(t * 12) * 0.2;
      overloadRings.forEach((ring, i) => {
        ring.material.opacity = clamp((endClock - i * 0.35) * 0.45, 0, 0.85);
        ring.rotation.z += 0.02 + i * 0.006;
        ring.scale.setScalar(1 + Math.sin(t * (3 + i) + i) * 0.12 + endClock * 0.08);
      });
      if (overloadSprite) {
        overloadSprite.visible = true;
        overloadSprite.material.opacity = 0.35 + Math.sin(t * 9) * 0.15;
      }
      return;
    }
    overload.visible = false;
    if (overloadSprite) overloadSprite.visible = false;
    const frames = [0, 1, 0, 1, 2, 1, 3, 1];
    const idx = frames[Math.floor(t * 2.4 + (n.stage || "").length) % frames.length];
    const fallback = (n.stage || "").length % 2 ? "nulo-operador-voz" : "nulo-operador";
    const name = images[`nulo-${idx}`] ? `nulo-${idx}` : fallback;
    const sprite = setSpriteFor("nulo", name, n.x, n.y, 1.45, { visible: true, height: 1.7 });
    if (sprite) {
      const pulse = 0.78 + Math.sin(performance.now() * 0.006) * 0.14;
      sprite.material.opacity = pulse;
      sprite.position.y = 0.03 + Math.sin(t * 2.7) * 0.02;
      sprite.material.rotation = Math.sin(t * 1.9) * 0.006;
      sprite.material.color.setRGB(1, 1, 1);
    }
  }

  function render({
    ctx,
    m,
    t,
    dt,
    mode,
    intro = 0,
    endClock = 0,
    shine = 0,
    moving = 0,
    enemies = [],
    nulo = null,
    reducedMotion = false,
  }) {
    if (!state.available) return false;
    state.entry = clamp(intro / 1.8, 0, 1);
    const tension = clamp(m.stress / 100, 0, 1);
    const interference = clamp(
      tension * 0.55 +
        clamp((m.p.elapsed - 80) / 420, 0, 0.28) +
        (m.p.nulo?.length ?? 0) * 0.035 +
        (m.fenda ? 0.1 : 0),
      0,
      0.95,
    );
    state.interference = interference;
    state.flashlight = m.lampOn && m.lamp > .5;
    updateCircuit(m, t, reducedMotion);
    for (const entry of propSprites.values()) {
      if (!entry.bob || !entry.sprite.visible) continue;
      const [amp, speed] = entry.bob;
      entry.sprite.position.y =
        0.025 +
        (entry.prop.lift ?? 0) +
        Math.sin(t * speed + (entry.prop.x + entry.prop.y) * 0.7) * amp;
    }

    // Marcador do próximo equipamento e onda de leitura do scanner.
    if (marker) {
      if (markerTarget) {
        marker.visible = true;
        const bob = reducedMotion ? 0 : Math.sin(t * 1.7) * 0.11;
        const dist = Math.hypot(markerTarget.x - m.x, markerTarget.y - m.y);
        marker.position.set(markerTarget.x, (markerTarget === anchor ? 4.05 : 2.83) + bob, markerTarget.y);
        const index = reducedMotion
          ? 0
          : Math.floor(t * 5) % markerFrames.length;
        if (marker.material.map !== markerFrames[index])
          marker.material.map = markerFrames[index];
        marker.material.opacity =
          (0.5 + Math.sin(t * 2.6) * 0.14) *
          Math.max(0, Math.min(1, (23 - dist) / 8));
        marker.scale.setScalar(dist < 3 ? 0.42 : 0.6);
        marker.visible = dist > 2 && dist < 26;
      } else marker.visible = false;
    }
    for (const wave of interactWaves) {
      if (!wave.sprite.visible) continue;
      wave.age = Math.min(1, wave.age + dt * 2.6);
      const indexFrame = Math.min(
        waveFrames.length - 1,
        Math.floor(wave.age * waveFrames.length),
      );
      if (indexFrame !== wave.frame) {
        wave.frame = indexFrame;
        wave.sprite.material.map = waveFrames[indexFrame];
      }
      wave.sprite.scale.setScalar(wave.size * (0.9 + wave.age * 1.05));
      wave.sprite.material.opacity = 0.65 * (1 - wave.age) ** 1.6;
      if (wave.age >= 1) wave.sprite.visible = false;
    }
    // respiração + passada: o eixo vertical da câmera nunca fica morto.
    const speed = Math.hypot(m.vx || 0, m.vy || 0);
    const breathRate = 1.55 + tension * 1.9 + interference * 0.5;
    const breath = Math.sin(t * breathRate * TAU * 0.36) * (0.008 + tension * 0.013);
    const bobFreq = speed > 0.05 ? 2.15 : 0;
    const bob = Math.sin(t * 8.2 * clamp(speed / 2.4, 0.35, 1.5)) * bobFreq * (m.crouched ? 0.022 : 0.028);
    const lean = clamp(-(m.lookVel || 0) * 0.035, -0.055, 0.055);
    const eye = (m.crouched ? 0.96 : 1.62) + bob + breath;
    const entry = state.entry;
    camera.position.set(m.x, eye + entry * 1.2, m.y);
    camera.rotation.set(
      clamp(m.pitch || 0, -0.92, 0.92) + (reducedMotion ? 0 : Math.sin(t * 1.1) * 0.0035) + entry * 0.12,
      -m.angle - Math.PI / 2 + lean + (reducedMotion ? 0 : Math.sin(t * 0.43) * 0.004),
      0,
    );
    camera.fov = 61 - entry * 4 - (m.finished ? clamp(endClock / 3.2, 0, 1) * 13 : 0);
    camera.updateProjectionMatrix();

    const danger = clamp((state.threat || 0) * 0.55 + (m.finished ? 0.35 : 0), 0, 0.9);
    fog.density = 0.039 + entry * 0.075 + tension * 0.006 + danger * 0.008 + (m.finished ? clamp(endClock / 3, 0, 1) * 0.022 : 0);
    fog.color.setHex(m.timedOut ? 0x24101f : m.finished ? 0x174040 : 0x0d1a25);
    if (danger > 0.02) fog.color.lerp(new THREE.Color(0x2b102d), danger * 0.35);
    scene.background.copy(fog.color);

    // lanterna: segue o olhar, inclusive para cima/baixo, com flicker do Nulo.
    const flicker =
      m.timedOut ? 0.35 + Math.random() * 0.65
        : interference > 0.4 && Math.random() < interference * 0.12 ? 0.15
          : 0.9 + Math.sin(t * 11.7) * 0.04;
    const lampOn = m.lampOn !== false && (m.lamp ?? 100) > 0.5;
    const lampLow = lampOn && (m.lamp ?? 100) < 22;
    const lampFlicker = lampLow ? (Math.random() < 0.16 ? 0.25 : 1) : 1;
    torch.intensity = lampOn ? (m.p.containment?.lanterna ? 54 : 42) * flicker * lampFlicker : 0;
    // Sem lanterna a noite fecha de verdade: ambiente cai e o halo das lâmpadas
    // passa a ser a única leitura de profundidade.
    const ambientScale = lampOn ? 1 : 0.5;
    hemi.intensity += (4.0 * ambientScale - hemi.intensity) * Math.min(1, dt * 4);
    ambient.intensity += (4.2 * ambientScale - ambient.intensity) * Math.min(1, dt * 4);
    facadeFill.intensity += (1.15 * (lampOn ? 1 : 0.64) - facadeFill.intensity) * Math.min(1, dt * 3);
    torch.angle = 0.43 + tension * 0.035;
    torchCone.material.opacity = lampOn ? 0.014 + tension * 0.014 : 0;
    torchCone.visible = !motionless && lampOn;
    overloadLight.intensity = m.timedOut
      ? (Math.sin(t * 27) > 0.55 ? 10 + Math.sin(t * 9) * 5 : 0)
      : 0;
    motes.material.opacity = 0.25 + tension * 0.18;

    updateGhosts(dt, m, tension);
    updateEnemies(enemies, m, t, dt);
    updateNulo(nulo, m, t, endClock);
    for (const entry of propSprites.values())
      if (entry.sprite.visible) shadeSprite(entry.sprite, m);
    shadeDynamic(m);

    // lâmpadas falhando
    for (const l of lamps) {
      const n = Math.sin(t * (0.7 + l.flicker * 8) + l.phase);
      const fail = !m.p.data.includes(systems[1].id) && l.flicker > .2 && n > .96 ? .15 : 1;
      if (l.light) l.light.intensity = l.base * (0.72 + 0.28 * Math.sin(t * 3.1 + l.phase)) * fail;
      l.halo.material.opacity = 0.2 * fail;
      l.bulb.material.color.setHex(fail < 1 ? 0x5b2a12 : 0xffb15c);
    }
    for (const s of swinging) {
      const sway = Math.sin(t * 0.8 + s.phase) * 0.07;
      s.bulb.position.x = s.x + sway;
      if (s.halo) s.halo.position.x = s.bulb.position.x;
      if (s.antenna && Math.sin(t * 1.7 + s.phase) > 0.82) s.bulb.material.color.setHex(0x38100e);
      else if (s.antenna) s.bulb.material.color.setHex(0xff4d3d);
    }
    for (const c of crystalClusters) {
      c.group.rotation.y += dt * 0.1;
      c.group.scale.setScalar(c.base * (1 + Math.sin(t * 1.3 + c.phase) * 0.035));
    }
    for (const c of crystals) c.rotation.y += dt * 0.06;

    // mar vivo: ondas de vértice, textura rolando e espuma correndo na praia.
    for (let i = 0; i < seaPos.count; i++) {
      const x = seaBase[i * 3], y = seaBase[i * 3 + 1];
      seaPos.setZ(i,
        Math.sin(x * 0.31 + t * 0.9) * 0.07 +
        Math.cos(y * 0.23 + t * 0.62) * 0.045 +
        Math.sin((x + y) * 0.13 + t * 1.4) * 0.025,
      );
    }
    seaPos.needsUpdate = true;
    const shoreAttr = shoreGeo.getAttribute("position");
    for (let i = 0; i < shoreAttr.count; i++) {
      const x = shoreBase[i * 3], z = shoreBase[i * 3 + 2];
      const edge = clamp((x - shoreX(z)) / 3, 0, 1);
      shoreAttr.setY(i, 0.022 + edge * (Math.sin(x * 0.8 + t * 1.1) * 0.035 + Math.cos(z * 0.55 + t * 0.8) * 0.025));
    }
    shoreAttr.needsUpdate = true;
    water.offset.x = (water.offset.x + dt * 0.009) % 1;
    water.offset.y = (water.offset.y + dt * 0.004) % 1;
    for (const f of foam) {
      f.mesh.position.x = f.baseX + Math.sin(t * 0.62 + f.phase) * 0.9;
      f.mesh.material.opacity = 0.12 + (Math.sin(t * 0.9 + f.phase) * 0.5 + 0.5) * 0.18;
      f.mesh.position.z = f.z + Math.cos(t * 0.45 + f.phase) * 0.35;
    }
    for (const g of glints) {
      g.mesh.position.x = g.baseX + Math.sin(t * 0.34 + g.phase) * 1.7;
      g.mesh.material.opacity = 0.08 + (Math.sin(t * 0.7 + g.phase) * 0.5 + 0.5) * 0.2;
    }
    for (const r of reflections) {
      r.mesh.material.opacity = r.base * (0.55 + (Math.sin(t * 0.9 + r.phase) * 0.5 + 0.5) * 0.7);
      r.mesh.scale.x = 1 + Math.sin(t * 0.5 + r.phase) * 0.08;
    }
    // farol varrendo a baía
    lighthouseGlow.material.opacity = 0.3 + Math.sin(t * 2.2) * 0.08;
    for (let i = 0; i < dockRopes.length; i++)
      dockRopes[i].position.y = (i ? 0.92 : 0.55) + Math.sin(t * 1.1 + i) * 0.012;
    const status = siteStatus(m, anchor);
    anchorRing.material.color.set(statusColor[status]);
    anchorRing2.material.color.copy(anchorRing.material.color);
    anchorHalo.material.color.copy(anchorRing.material.color);
    anchorRing.material.opacity = status === 'offline' ? .37 : .95;
    anchorRing2.material.opacity = status === 'offline' ? .20 : .8;
    anchorRing2.rotation.y = status === 'offline' ? 1.18 : .18;
    anchorRing2.rotation.z = reducedMotion ? 0 : t * .3;
    anchorHalo.material.opacity = status === 'offline' ? .12 : .48;
    anchorHalo.scale.setScalar(status === 'online' ? 7 : 4.6);
    for (const s of scenery) {
      s.sprite.position.y = s.baseY + Math.sin(t * 0.8 + s.phase) * 0.012;
      if (s.sprite.visible) shadeSprite(s.sprite, m);
    }

    // chuva local, spray do mar e pulso de sobrecarga na âncora
    const rainAttr = rain.geometry.getAttribute("position");
    const sprayAttr = spray.geometry.getAttribute("position");
    for (let i = 0; i < rainCount; i++) {
      let y = rainAttr.getY(i) - dt * (5.5 + (i % 5) * 0.55);
      let x = rainAttr.getX(i) - dt * 1.1;
      let z = rainAttr.getZ(i) - dt * 0.35;
      if (y < 0 || Math.abs(x - m.x) > 15 || Math.abs(z - m.y) > 15) {
        x = m.x + (Math.random() - 0.5) * 26;
        z = m.y + (Math.random() - 0.5) * 26;
        y = 9 + Math.random() * 5;
      }
      rainAttr.setXYZ(i, x, y, z);
    }
    rainAttr.needsUpdate = true;
    for (let i = 0; i < sprayCount; i++) {
      const z = sprayAttr.getZ(i);
      let y = sprayAttr.getY(i) + dt * (0.28 + (i % 4) * 0.12);
      let x = sprayAttr.getX(i) + Math.sin(t * 0.8 + spraySeed[i]) * dt * 0.22;
      if (y > 1.9) {
        const nz = Math.random() * 32;
        sprayAttr.setZ(i, nz);
        x = shoreX(nz) + 0.2 + Math.random() * 4.5;
        y = 0.08;
        spraySeed[i] = Math.random() * 6;
      }
      sprayAttr.setXYZ(i, x, y, z);
    }
    sprayAttr.needsUpdate = true;
    // Seixos rentes ao chão viram uma parede de textura a menos de 2 m: some
    // com eles antes que a câmera entre no decalque.
    for (const stone of shoreStones) {
      stone.visible = Math.hypot(stone.position.x - m.x, stone.position.z - m.y) > 2.1;
    }
    for (const puff of mist) {
      puff.position.x = puff.userData.baseX + Math.sin(t * 0.07 + puff.userData.phase) * 3.2;
      puff.position.z += dt * 0.16;
      if (puff.position.z > 34) puff.position.z = 2;
      puff.material.opacity = 0.045 + Math.sin(t * 0.22 + puff.userData.phase) * 0.016;
    }

    // fauna: gaivotas em círculo, peixes em arco, caranguejos de lado e ondas.
    for (const gull of gulls) {
      const a = t * 0.16 + gull.phase;
      gull.sprite.position.set(
        gull.cx + Math.cos(a) * gull.r,
        gull.y + Math.sin(t * 0.9 + gull.phase) * 0.35,
        gull.cz + Math.sin(a) * gull.r,
      );
      gull.sprite.material.rotation = Math.sin(a) * 0.12;
    }
    for (const f of fish) {
      const cycle = (t + f.phase) % f.period;
      const p = cycle / (f.period * 0.62);
      if (p >= 1) {
        f.sprite.visible = false;
        continue;
      }
      f.sprite.visible = true;
      const z = f.z + Math.sin(f.phase + t * 0.11) * 2.2;
      f.sprite.position.set(
        shoreX(z) + 0.5 + p * 2.2,
        0.2 + Math.sin(p * Math.PI) * 1.35,
        z,
      );
      f.sprite.material.rotation = -Math.cos(p * Math.PI) * 0.85;
    }
    for (const crab of crabs) {
      const wob = Math.sin(t * 1.35 + crab.phase);
      crab.sprite.position.x = crab.x + wob * 0.52;
      crab.sprite.position.z = crab.z + Math.cos(t * 0.7 + crab.phase) * 0.16;
      crab.sprite.scale.x = crab.w * (wob >= 0 ? 1 : -1);
    }
    for (const wave of waves) {
      const p = (t * 0.13 + wave.phase) % 1;
      const z = wave.z + Math.sin(t * 0.05 + wave.phase) * 0.7;
      wave.sheet.position.set(shoreX(z) + 0.35 - p * 2.2, 0.18, z);
      wave.sheet.material.opacity = Math.sin(p * Math.PI) * 0.6;
      const k = 0.8 + p * 0.35;
      wave.sheet.scale.set(k, k, 1);
    }

    // poeira: sobe e reaparece perto da câmera
    const attr = motes.geometry.getAttribute("position");
    for (let i = 0; i < moteCount; i++) {
      let y = attr.getY(i) + dt * (0.035 + (i % 7) * 0.008);
      if (y > 4.6) y = 0.1;
      attr.setY(i, y);
    }
    attr.needsUpdate = true;

    if (sting > 0) sting = Math.max(0, sting - dt);
    renderer.render(scene, camera);
    ctx.drawImage(renderer.domElement, 0, 0, width, height);

    // ---------- Pós-processamento VHS / PSX ----------
    const g = ctx;
    g.save();
    if (!reducedMotion) {
      const shakeAmt = (m.shake ?? 0) + (m.timedOut ? Math.min(0.6, endClock * 0.24) : 0) + sting * 0.06;
      if (shakeAmt > 0.01)
        g.translate(Math.round(Math.sin(t * 71) * shakeAmt * 9), Math.round(Math.cos(t * 59) * shakeAmt * 6));
    }

    // aberração cromática sob interferência / ruptura
    const split = Math.round(
      (interference * 1.2 + sting * 2 + (m.timedOut ? Math.min(5, endClock * 2.4) : 0)) *
        (reducedMotion ? 0.3 : 1),
    );
    if (split > 0) {
      const snap = document.createElement("canvas");
      snap.width = width;
      snap.height = height;
      snap.getContext("2d").drawImage(canvas, 0, 0);
      g.globalCompositeOperation = "screen";
      g.globalAlpha = 0.25 + interference * 0.22;
      g.drawImage(snap, -split, 0);
      g.globalAlpha = 0.2 + interference * 0.14;
      g.drawImage(snap, split, 0);
      g.globalCompositeOperation = "source-over";
      g.globalAlpha = 1;
    }

    // banda de tracking VHS e estática progressiva
    if (!reducedMotion && (interference > 0.26 || sting > 0.1 || m.finished)) {
      const intensity = clamp(interference + sting * 0.35 + (m.finished ? 0.3 : 0), 0, 1);
      for (let i = 0; i < 4; i++) {
        const y = (t * (47 + i * 17) + i * 61) % 216;
        g.fillStyle = `rgba(190,230,225,${0.018 + intensity * 0.035})`;
        g.fillRect(0, y | 0, width, 1 + (i % 2));
      }
      const band = (t * 31) % 260 - 20;
      g.fillStyle = `rgba(2,8,12,${0.13 * intensity})`;
      g.fillRect(band, 0, 10 + intensity * 22, height);
      if (Math.sin(t * 13) > 0.4) {
        g.fillStyle = `rgba(230,245,238,${0.05 * intensity})`;
        for (let i = 0; i < 26; i++)
          g.fillRect((Math.random() * width) | 0, (Math.random() * height) | 0, 1, 1);
      }
    }

    // letterbox mínimo, granulação e scanlines
    g.fillStyle = "rgba(0,0,0,.07)";
    for (let y = 1; y < height; y += 3) g.fillRect(0, y, width, 1);
    if (!reducedMotion) {
      for (let i = 0; i < 32; i++) {
        g.fillStyle = `rgba(236,248,232,${0.018 + Math.random() * 0.03})`;
        g.fillRect((Math.random() * width) | 0, (Math.random() * height) | 0, 1, 1);
      }
    }
    const vig = g.createRadialGradient(192, 104, 22, 192, 112, 244);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(0.55, "rgba(0,0,0,.10)");
    vig.addColorStop(0.82, "rgba(0,0,0,.33)");
    vig.addColorStop(1, "rgba(0,0,0,.72)");
    g.fillStyle = vig;
    g.fillRect(0, 0, width, height);

    // entrada cinematográfica: corte de estática e revelação lenta
    if (entry > 0.002) {
      g.fillStyle = `rgba(2,5,9,${entry})`;
      g.fillRect(-8, -8, width + 16, height + 16);
      g.fillStyle = `rgba(180,220,214,${entry * 0.07})`;
      for (let i = 0; i < 48; i++)
        g.fillRect(0, (i * 7 + t * 300) % 216, width, 1);
      // fresta de luz que abre a cena
      const slit = g.createLinearGradient(0, 0, 0, 216);
      slit.addColorStop(0, "rgba(0,0,0,0)");
      slit.addColorStop(0.5, `rgba(202,229,214,${entry * 0.12})`);
      slit.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = slit;
      g.fillRect(0, 0, width, height);
    }

    // Prazo esgotado: reservar o colapso visual para a retirada de emergência.
    if (m.timedOut && !reducedMotion) {
      const k = clamp(endClock / 3.4, 0, 1);
      g.globalCompositeOperation = "screen";
      for (let i = 0; i < 3; i++) {
        const flash = Math.max(0, Math.sin(t * (9 + i * 3) + i)) * 0.11;
        g.fillStyle = i === 1 ? `rgba(255,65,180,${flash})` : `rgba(110,235,222,${flash})`;
        g.fillRect(0, 0, width, height);
      }
      g.globalCompositeOperation = "source-over";
      g.fillStyle = `rgba(4,7,11,${k * 0.55})`;
      g.fillRect(0, 0, width, height);
      const iris = Math.max(0, 1 - k * 1.15);
      if (iris > 0) {
        g.strokeStyle = `rgba(255,197,113,${0.3 + k * 0.5})`;
        g.lineWidth = 1 + k * 3;
        g.beginPath();
        g.arc(192, 108, 170 * iris + 12, 0, TAU);
        g.stroke();
      }
    }
    g.restore();

    // Apenas a mira: rumo e telemetria já estão no HUD.
    g.fillStyle = "rgba(205,231,219,.7)";
    g.fillRect(190, 106, 4, 1);
    g.fillRect(192, 104, 1, 4);
    return true;
  }

  const motionless = false;
  return {
    available: true,
    state,
    scene,
    camera,
    render,
    setMarker(target) { markerTarget = target; },
    pulse,
    resize() {},
    dispose() {
      for (const tex of spriteTextures.values()) tex.dispose();
      scene.traverse((o) => {
        o.geometry?.dispose?.();
        if (o.material) {
          const list = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of list) {
            m.map?.dispose?.();
            m.dispose?.();
          }
        }
      });
      renderer.dispose();
      state.available = false;
    },
  };
}
