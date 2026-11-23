// PSX / Puppet-Combo bay renderer for the Maré Cromática mission.
// Low-poly geometry, nearest-filtered textures, dense exponential fog and a
// gaze-following flashlight. The WebGL layer is composited into the mission's
// 2D canvas so saves, HUD, map and tests keep one capture surface.
import * as THREE from "../vendor/three.module.js";
import { cell } from "./mare-mission-model.js";

const TAU = Math.PI * 2;
const hash = (x, y, seed = 0) => {
  const v = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return v - Math.floor(v);
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const CABINS = [
  [5, 5, 7, 6],
  [19, 5, 7, 7],
  [6, 20, 7, 7],
  [21, 21, 6, 6],
];
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
  return canvasTexture((g, w, h) => {
    const rad = g.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2);
    rad.addColorStop(0, `rgba(${color},.95)`);
    rad.addColorStop(0.28, `rgba(${color},.35)`);
    rad.addColorStop(1, `rgba(${color},0)`);
    g.fillStyle = rad;
    g.fillRect(0, 0, w, h);
  }, 64, 64);
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
  const texture = async (file, repeat = 1) => {
    const map = await loader.loadAsync(
      new URL(`../../assets/textures/mare-upgrade/${file}.png`, import.meta.url)
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
  const [concrete, wood, metal, container, rock, water, pier] =
    await Promise.all([
      texture("concreto-limoso", 2),
      texture("madeira-tabuas", 1),
      texture("metal-ondulado", 1),
      texture("container-ferrugem", 1),
      texture("rocha-basalto", 1),
      texture("agua-negra", 16),
      texture("pier-madeira", 2),
    ]);

  const lambert = (map, color = 0xffffff) =>
    new THREE.MeshLambertMaterial({ map, color });
  const mat = {
    concrete: lambert(concrete, 0xc4d2cc),
    concreteDark: lambert(concrete, 0x778c8b),
    wood: lambert(wood, 0xd8c0a8),
    woodDark: lambert(wood, 0x8c7060),
    metal: lambert(metal, 0xb8c8c4),
    metalDark: lambert(metal, 0x74898c),
    container: lambert(container, 0xb2c7c4),
    containerRust: lambert(container, 0xc8a88a),
    rock: lambert(rock, 0x9aa4a6),
    floor: (() => {
      const map = concrete.clone();
      map.needsUpdate = true;
      map.repeat.set(11, 11);
      return new THREE.MeshLambertMaterial({ map, color: 0x95a5a0 });
    })(),
    pier: (() => {
      const map = pier.clone();
      map.needsUpdate = true;
      map.repeat.set(5, 2);
      return new THREE.MeshLambertMaterial({ map, color: 0xb09978 });
    })(),
    water: new THREE.MeshLambertMaterial({
      map: water,
      color: 0x5f8d9b,
      emissive: 0x08151c,
    }),
    black: new THREE.MeshLambertMaterial({ color: 0x182226 }),
    rust: new THREE.MeshLambertMaterial({ color: 0x58402f }),
    plastic: new THREE.MeshLambertMaterial({ color: 0x1f3234 }),
  };
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

  // ---------- mar, cais e chão ----------
  const sea = mesh(new THREE.PlaneGeometry(170, 170), mat.water, 16, -0.34, 16);
  sea.rotation.x = -Math.PI / 2;
  const ground = mesh(new THREE.PlaneGeometry(32, 32), mat.floor, 16, -0.012, 16);
  ground.rotation.x = -Math.PI / 2;

  // Poças: planos quase pretos com a textura da água, sem custo de reflexo.
  for (let i = 0; i < 12; i++) {
    const px = 2 + hash(i, 1, 4) * 28,
      pz = 2 + hash(i, 2, 4) * 28;
    if (cell(px, pz)) continue;
    const puddle = mesh(
      new THREE.PlaneGeometry(0.7 + hash(i, 3) * 1.8, 0.4 + hash(i, 4) * 1.1),
      new THREE.MeshLambertMaterial({
        map: water,
        color: 0x15262d,
        transparent: true,
        opacity: 0.6,
        emissive: 0x061219,
        depthWrite: false,
      }),
      px,
      0.008,
      pz,
      hash(i, 5) * TAU,
    );
    puddle.rotation.x = -Math.PI / 2;
  }

  // Píer de madeira a leste, sobre a água, visível por cima da mureta.
  box(10.5, 0.22, 3.2, mat.pier, 37.2, 0.15, 18, 0);
  for (let i = 0; i < 7; i++) {
    const x = 32.6 + i * 1.5;
    box(0.16, 2.4, 0.16, mat.woodDark, x, -0.85, 16.8);
    box(0.16, 2.4, 0.16, mat.woodDark, x, -0.85, 19.2);
  }
  box(0.5, 0.9, 3.2, mat.woodDark, 42.2, 0.55, 18);
  // guindaste do cais
  const crane = new THREE.Group();
  const craneMat = mat.black;
  const addCrane = (w, h, d, x, y, z, rz = 0) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), craneMat);
    b.position.set(x, y, z);
    b.rotation.z = rz;
    crane.add(b);
  };
  addCrane(0.6, 9.5, 0.6, 0, 4.75, 0);
  addCrane(9, 0.45, 0.5, 3.6, 9.2, 0);
  addCrane(0.12, 5.2, 0.12, 7.4, 6.7, 0);
  addCrane(3.2, 0.5, 2.2, -1.4, 8.7, 0);
  crane.position.set(44, 0, 7);
  scene.add(crane);
  const craneLamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 5, 4),
    new THREE.MeshBasicMaterial({ color: 0xff4d3d }),
  );
  craneLamp.position.set(8, 9.2, 0);
  crane.add(craneLamp);

  // ---------- muralha, galpões e silhuetas ----------
  const wallCount = { all: 0 };
  // Paredes são fundidas em um único lote por material: ~5 draw calls em vez
  // de 600. UVs são calculadas em metros, então nenhuma face estica.
  const batches = { concrete: null, wood: null, metal: null, container: null, trim: null };
  const makeBatch = () => ({ p: [], n: [], u: [], c: [] });
  for (const k of Object.keys(batches)) batches[k] = makeBatch();
  const TILE = 2.35;
  const col = (hex, mul = 1) => {
    const c = new THREE.Color(hex);
    c.multiplyScalar(mul);
    return c;
  };
  function quad(batch, a, b, c, d, normal, uvs, color) {
    const verts = [a, b, c, a, c, d];
    // Dois triângulos por face: a,b,c e a,c,d. O segundo triângulo precisa
    // repetir os UVs de a e c, não inventar índices fora do array.
    const uvOrder = [
      uvs[0], uvs[1], uvs[2], uvs[3], uvs[4], uvs[5],
      uvs[0], uvs[1], uvs[4], uvs[5], uvs[6], uvs[7],
    ];
    for (let i = 0; i < 6; i++) {
      batch.p.push(verts[i][0], verts[i][1], verts[i][2]);
      batch.n.push(normal[0], normal[1], normal[2]);
      batch.u.push(uvOrder[i * 2], uvOrder[i * 2 + 1]);
      batch.c.push(color.r, color.g, color.b);
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
    const wx = axis === 'x' ? cx : cx;
    const wz = axis === 'z' ? cz : cz;
    faceQuad(windowBatch, axis, sign, wx, cy, wz, 0.58, 0.62, col(0x05090a));
    faceQuad(windowBatch, axis, sign, wx, cy, wz, 0.44, 0.48, col(lit ? 0xa87a46 : 0x142427), 0.02);
    if (lit) faceQuad(windowBatch, axis, sign, wx, cy, wz, 0.16, 0.48, col(0x061013), 0.028);
  };
  const addWall = (x, y, h, kind, type = 0) => {
    const flick = 0.84 + hash(x, y, 15) * 0.3;
    const tone = kind === 'wood' || kind === 'woodDark' ? 0xffe9cf
      : kind === 'container' ? 0xdff3ea
        : kind === 'metal' || kind === 'metalDark' ? 0xe4f0ec
          : 0xeef7f2;
    addBox(batchFor(kind), x + 0.5, h / 2, y + 0.5, 1.02, h, 1.02, col(tone, flick), 0.32);
    wallCount.all++;
  };

  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const c = cell(x + 0.5, y + 0.5);
      if (!c) continue;
      const boundary = x === 0 || y === 0 || x === 31 || y === 31;
      if (boundary) {
        if (x === 0 || x === 31) {
          const pillar = (y % 7 === 0 && y > 2 && y < 29) || y === 1;
          const h = pillar ? 3.7 + hash(x, y) * 0.5 : 1.08;
          addWall(x, y, h, pillar ? 'concreteDark' : 'concrete', pillar ? 1 : 0);
        } else {
          const h = 3.5 + hash(x, y, 3) * 1.5;
          addWall(x, y, h, y === 0 ? 'metalDark' : 'container', 1);
        }
        continue;
      }
      let h;
      if (onCabinWall(x, y)) {
        // trechos desabados: a colisão permanece, mas o olhar atravessa o vão.
        h = hash(x, y, 23) > 0.74 ? 1.08 : 3.05 + hash(x, y, 6) * 0.16;
        addWall(x, y, h, c === 3 ? 'metalDark' : 'wood', c === 3 ? 3 : 0);
      } else if (c === 3) {
        h = 2.6;
        addWall(x, y, h, 'metalDark', 3);
      } else {
        h = 2.15 + hash(x, y, 7) * 1.25;
        addWall(x, y, h, c === 1 ? 'concrete' : 'metal', 0);
      }
      // montantes e cintas: quebram a repetição vertical da textura
      addBox(batches.trim, x + 0.5, h / 2, y + 0.5, 1.06, 0.055, 1.06, col(0x2c322e, 0.9), 0.8);
      addBox(batches.trim, x + 0.045, h / 2, y + 0.5, 0.07, h, 0.07, col(0x242a26, 0.9), 0.8);
      addBox(batches.trim, x + 0.955, h / 2, y + 0.5, 0.07, h, 0.07, col(0x242a26, 0.9), 0.8);
      if (h > 2.2 && hash(x, y, 18) > 0.62)
        addWindow(x, y, h, hash(x, y, 19) > 0.5 ? 'z' : 'x', hash(x, y, 20) > 0.5 ? 1 : -1);
    }
  }
  const wallMaterials = {
    concrete: lambert(concrete, 0xffffff),
    wood: lambert(wood, 0xffffff),
    metal: lambert(metal, 0xffffff),
    container: lambert(container, 0xffffff),
  };
  for (const material of Object.values(wallMaterials)) {
    material.map.wrapS = material.map.wrapT = THREE.MirroredRepeatWrapping;
    material.map.repeat.set(1, 1);
  }
  const batchMesh = (batch, material) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(batch.p, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(batch.n, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(batch.u, 2));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(batch.c, 3));
    const m = new THREE.Mesh(geo, material);
    scene.add(m);
  };
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
    box(w + 0.7, 0.2, h + 0.7, mat.metalDark, cx + w / 2, 3.62, cy + h / 2);
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
      const slab = box(w + 0.9, 0.12, h * 0.58, mat.metal, cx + w / 2, 3.95, cy + h / 2 + side * h * 0.24);
      slab.rotation.z = side * 0.11;
    }
    // portas de serviço: dão escala humana e quebram a fachada cega
    for (const [side, flip] of [[1, 1], [-1, -1]]) {
      const doorZ = cy + (side > 0 ? h : 0) + side * 0.025;
      box(1.06, 2.16, 0.05, mat.black, cx + 2.4, 1.08, doorZ);
      box(0.86, 1.94, 0.045, mat.woodDark, cx + 2.4, 0.98, doorZ + flip * 0.025);
      box(0.68, 0.12, 0.03, mat.rust, cx + 2.4, 1.84, doorZ + flip * 0.05);
      box(0.06, 0.06, 0.04, mat.rust, cx + 2.72, 1.0, doorZ + flip * 0.055);
      box(0.38, 0.08, 0.035, new THREE.MeshBasicMaterial({ color: 0xb98243 }), cx + 2.4, 2.32, doorZ + flip * 0.05);
    }
  }
  // cabos caídos / fios entre telhados
  const cableMat = new THREE.LineBasicMaterial({ color: 0x030607, transparent: true, opacity: 0.95 });
  for (const [ax, az, bx, bz, y] of [
    [10, 7, 20, 13, 3.4],
    [7, 19, 18, 24, 3.6],
    [22, 8, 29, 15, 3.2],
    [12, 25, 24, 27, 3.1],
  ]) {
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const k = i / 10;
      pts.push(new THREE.Vector3(
        ax + (bx - ax) * k,
        y - Math.sin(k * Math.PI) * 0.55,
        az + (bz - az) * k,
      ));
    }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), cableMat));
  }

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
    [39, 27, 8, 3.2, 6, mat.container],
    [36, 1, 5, 2.7, 5, mat.containerRust],
    [8, -7, 14, 4.4, 7, mat.metalDark],
    [24, -9, 9, 5.2, 8, mat.metalDark],
    [-4, 33, 10, 3.4, 6, mat.container],
    [30, 38, 12, 3.8, 7, mat.metalDark],
  ];
  for (const [x, z, w, h, d, material] of outside) {
    box(w, h, d, cladMaterial(material, w, h), x, h / 2, z);
    box(w + 0.15, 0.18, d + 0.15, mat.black, x, h + 0.09, z);
    if (hash(x, z) > 0.45) box(0.14, h * 0.7, 0.14, mat.rust, x + w / 2, h * 0.4, z - d / 2);
  }

  // O farol: torre facetada, lanterna de Fresnel e feixe no nevoeiro.
  const lighthouse = new THREE.Group();
  const towerMat = lambert(concrete, 0x8a9a94);
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
    new THREE.MeshPhongMaterial({
      color: 0x2b3028,
      emissive: 0x8a5a20,
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.86,
    }),
  );
  lantern.position.y = 13.1;
  lighthouse.add(lantern);
  const lighthouseGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture("255,190,96"),
      color: 0xffffff,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    }),
  );
  lighthouseGlow.scale.set(9, 9, 1);
  lighthouseGlow.position.set(0, 13.1, 0);
  lighthouse.add(lighthouseGlow);
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(4.2, 33, 8, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xffd18a,
      transparent: true,
      opacity: 0.028,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    }),
  );
  beam.rotation.z = Math.PI / 2;
  beam.position.set(16.5, 13.1, 0);
  lighthouse.add(beam);
  lighthouse.position.set(34, 0, 4);
  scene.add(lighthouse);

  // rochas litorâneas e cristais cromáticos (geometria real, não textura chapada)
  const crystals = [];
  const crystalMat = new THREE.MeshPhongMaterial({
    color: 0x8b2fbd,
    emissive: 0xd52bff,
    emissiveIntensity: 1.1,
    shininess: 90,
    specular: 0xffb4ff,
    flatShading: true,
  });
  const crystalMat2 = new THREE.MeshPhongMaterial({
    color: 0x2e6f9e,
    emissive: 0x13b8d8,
    emissiveIntensity: 0.8,
    flatShading: true,
  });
  for (let i = 0; i < 13; i++) {
    const angle = (i / 13) * TAU + hash(i, 0, 2) * 0.5;
    const rad = 17 + hash(i, 1) * 4;
    const x = 16 + Math.cos(angle) * rad,
      z = 16 + Math.sin(angle) * rad;
    const rockMesh = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.8 + hash(i, 2) * 1.7, 0),
      mat.rock,
    );
    rockMesh.position.set(x, 0.2 + hash(i, 3) * 0.5, z);
    rockMesh.rotation.set(hash(i, 4) * TAU, hash(i, 5) * TAU, hash(i, 6) * TAU);
    rockMesh.scale.set(1.4, 0.8 + hash(i, 7) * 0.7, 1);
    scene.add(rockMesh);
    if (i % 3 === 0) {
      const cluster = new THREE.Group();
      for (let j = 0; j < 4; j++) {
        const shard = new THREE.Mesh(
          new THREE.ConeGeometry(0.18 + hash(i, j, 8) * 0.13, 0.8 + hash(i, j, 9) * 1.2, 5),
          j % 3 === 2 ? crystalMat2 : crystalMat,
        );
        shard.position.set((hash(i, j, 10) - 0.5) * 0.6, shard.geometry.parameters.height / 2, (hash(i, j, 11) - 0.5) * 0.5);
        shard.rotation.z = (hash(i, j, 12) - 0.5) * 0.55;
        shard.rotation.x = (hash(i, j, 13) - 0.5) * 0.55;
        cluster.add(shard);
      }
      cluster.position.set(x, 0.5, z);
      scene.add(cluster);
      crystals.push(cluster);

    }
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
  lampAt(2.7, 2.5, 3.6, 0.1);
  lampAt(29.4, 2.4, 3.5, 0.02);
  lampAt(2.6, 29.2, 3.2, 0.35);
  lampAt(29.6, 29.4, 3.8, 0.08);
  lampAt(16.45, 20.4, 2.7, 0.22);
  lampAt(23.4, 12.3, 3.1, 0.04);

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

  // canos, caixas, tambores e vergalhões (leitura industrial)
  for (let i = 0; i < 18; i++) {
    const x = 2 + hash(i, 1, 21) * 28,
      z = 2 + hash(i, 2, 21) * 28;
    if (cell(x, z) || inCabin(x, z)) continue;
    const kind = i % 4;
    if (kind === 0) {
      box(0.62, 0.62, 0.62, mat.woodDark, x, 0.31, z, hash(i, 3) * TAU);
      if (hash(i, 4) > 0.5) box(0.48, 0.48, 0.48, mat.rust, x + 0.3, 0.85, z + 0.1, hash(i, 5));
    } else if (kind === 1) {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.88, 8), mat.rust);
      barrel.position.set(x, 0.44, z);
      barrel.rotation.z = hash(i, 6) > 0.7 ? Math.PI / 2 : 0;
      scene.add(barrel);
    } else if (kind === 2) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.4, 6), mat.metalDark);
      pipe.position.set(x, 1.7, z);
      pipe.rotation.z = Math.PI / 2;
      scene.add(pipe);
      box(0.16, 0.7, 0.16, mat.rust, x, 0.35, z + 0.5);
    } else {
      box(0.08, 2.6, 0.08, mat.rust, x, 1.3, z);
      box(0.05, 1.1, 0.05, mat.rust, x + 0.38, 2.2, z);
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
  scene.add(new THREE.HemisphereLight(0x9fc3d4, 0x131820, 4.0));
  scene.add(new THREE.AmbientLight(0x6d8798, 4.2));
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

  // ---------- sprites de objetos ----------
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
  const propSprites = new Map();
  const propShadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
  });
  const artHeight = { boia: 0.58, "porta-recompilacao": 1.05, "portal-mare": 1.2, "selo-recompilado": 0.8 };
  const addProp = (o) => {
    const art = o.art === "terminal" ? "terminal-baia" : o.art === "cristal-mare" ? "cristal-magenta" : o.art;
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
    const h = (o.scale ?? 0.8) * (o.decor ? 1.05 : 1.7) * (artHeight[art] ?? 1);
    sprite.scale.set((h * tex.image.width) / tex.image.height, h, 1);
    sprite.center.set(0.5, 0);
    sprite.position.set(o.x, 0.025, o.y);
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
    propSprites.set(key, { sprite, shadow, prop: o });
  };
  props.forEach(addProp);
  const activeKeys = (list) => new Set(list.map((o) => `${o.art}@${o.x.toFixed(2)},${o.y.toFixed(2)}`));
  let active = null;
  const syncProps = (list) => {
    active = activeKeys(list);
    for (const [key, entry] of propSprites) {
      const visible = entry.prop.decor || active.has(key);
      entry.sprite.visible = visible;
      entry.shadow.visible = visible;
    }
  };
  // Sprites não recebem luz: escurecemos por distância/cone para integrarem a
  // cena em vez de parecerem adesivos flutuantes.
  const shadeSprite = (sprite, m) => {
    const dx = sprite.position.x - m.x, dz = sprite.position.z - m.y;
    const d = Math.hypot(dx, dz) || 1;
    const dot = (dx * Math.cos(m.angle) + dz * Math.sin(m.angle)) / d;
    const beam = dot > 0.55 ? 1 : dot > 0.1 ? 0.58 : 0.28;
    const shade = clamp(0.3 + beam * 0.64 - d * 0.008, 0.22, 0.92);
    sprite.material.color.setRGB(shade * 0.96, shade, shade * 0.95);
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

  function updateEnemies(enemies = [], m) {
    enemies.forEach((e, i) => {
      const phase = e.phase || "idle";
      const name =
        e.hunter ? (phase === "hurt" || phase === "dissolve" ? "afogado-dano" : "afogado-mare")
          : e.guardian ? (phase === "hurt" || phase === "dissolve" ? "guardiao-dano" : "guardiao-mare")
            : phase === "dissolve" ? "infectado-dissolvido"
              : phase === "hurt" ? "infectado-dano"
                : phase === "windup" || phase === "strike" ? (e.variant === "alto" ? "infectado-golpe-alto" : "infectado-golpe-baixo")
                  : phase === "stunned" ? "infectado-atordoado"
                    : phase === "rise" || phase === "recover" ? "infectado-erguendo"
                      : phase === "listen" ? "infectado-escuta"
                        : phase === "search" ? "infectado-busca"
                          : "infectado";
      setSpriteFor(`enemy:${i}`, name, e.x, e.y, e.hunter ? 1.08 : e.guardian ? 1.12 : 1, {
        visible: !e.dead,
        height: 1.5,
      });
    });
  }

  function updateNulo(n) {
    if (!n) return;
    const stage = (n.stage || "").length;
    const name = stage % 2 ? "nulo-operador-voz" : "nulo-operador";
    const sprite = setSpriteFor("nulo", name, n.x, n.y, 1.45, { visible: true, height: 1.7 });
    if (sprite) {
      const pulse = 0.78 + Math.sin(performance.now() * 0.006) * 0.14;
      sprite.material.opacity = pulse;
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
    activeProps = [],
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
    state.flashlight = m.finished ? false : true;
    if (active) syncProps(activeProps);

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

    fog.density = 0.046 + entry * 0.075 + tension * 0.007 + (m.finished ? clamp(endClock / 3, 0, 1) * 0.028 : 0);
    fog.color.setHex(m.finished && endClock < 2 ? 0x24101f : 0x0d1a25);
    scene.background.copy(fog.color);

    // lanterna: segue o olhar, inclusive para cima/baixo, com flicker do Nulo.
    const flicker =
      m.finished ? 0.35 + Math.random() * 0.65
        : interference > 0.4 && Math.random() < interference * 0.12 ? 0.15
          : 0.9 + Math.sin(t * 11.7) * 0.04;
    torch.intensity = (m.p.containment?.lanterna ? 54 : 42) * flicker;
    torch.angle = 0.43 + tension * 0.035;
    torchCone.material.opacity = 0.014 + tension * 0.014;
    torchCone.visible = !motionless;
    motes.material.opacity = 0.25 + tension * 0.18;

    updateGhosts(dt, m, tension);
    updateEnemies(enemies, m);
    updateNulo(nulo);
    for (const entry of propSprites.values())
      if (entry.sprite.visible) shadeSprite(entry.sprite, m);
    shadeDynamic(m);

    // lâmpadas falhando
    for (const l of lamps) {
      const n = Math.sin(t * (0.7 + l.flicker * 8) + l.phase);
      const fail = l.flicker > 0.2 && n > 0.96 ? 0.15 : 1;
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
    for (const c of crystals) c.rotation.y += dt * 0.06;

    // textura da água corre devagar
    water.offset.x = (water.offset.x + dt * 0.007) % 1;
    water.offset.y = (water.offset.y + dt * 0.003) % 1;

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
      const shakeAmt = (m.shake ?? 0) + (m.finished ? Math.min(0.6, endClock * 0.24) : 0) + sting * 0.06;
      if (shakeAmt > 0.01)
        g.translate(Math.round(Math.sin(t * 71) * shakeAmt * 9), Math.round(Math.cos(t * 59) * shakeAmt * 6));
    }

    // aberração cromática sob interferência / ruptura
    const split = Math.round(
      (interference * 1.2 + sting * 2 + (m.finished ? Math.min(5, endClock * 2.4) : 0)) *
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

    // colapso / ruptura: quando Nulo sabota o desfecho, a imagem rompe.
    if (m.finished) {
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

    // barra de status interna ao canvas (fora do HUD DOM)
    g.font = "7px monospace";
    g.fillStyle = "rgba(183,215,205,.66)";
    const dirs = ["L", "S", "O", "N"];
    const heading = dirs[((Math.round(m.angle / (Math.PI / 2)) % 4) + 4) % 4];
    g.fillText(`${heading} · ${m.p.details.gerador ? "ENERGIA" : "SEM REDE"}`, 12, 15);
    g.fillStyle = "rgba(205,231,219,.7)";
    g.fillRect(190, 106, 4, 1);
    g.fillRect(192, 104, 1, 4);
    if (m.finished) {
      // relatório de eco compacto, sempre legível no encerramento
      const detailCount = Object.keys(m.p.details ?? {}).length;
      g.fillStyle = "rgba(3,9,13,.9)";
      g.fillRect(36, 48, 312, 116);
      g.strokeStyle = "rgba(116,164,161,.65)";
      g.strokeRect(36.5, 48.5, 311, 115);
      g.fillStyle = "#d8e5d0";
      g.font = "10px monospace";
      g.fillText("RELATÓRIO DE ECO // MARÉ CROMÁTICA", 52, 66);
      g.font = "8px monospace";
      g.fillStyle = "#a8c8c1";
      g.fillText(`DESCOMPASSO ${m.p.rank}/4 · MEMÓRIAS ${m.p.data?.length ?? 0}/3`, 52, 84);
      g.fillText(`REGISTROS ${Math.min(8, detailCount)}/8 · LORE ${m.p.lore?.length ?? 0}/6 · NULO ${m.p.nulo?.length ?? 0}/4`, 52, 98);
      g.fillText(`BALIZA ${m.p.checkpoint === "boia" ? "VINCULADA" : "NÃO VINCULADA"} · FÔLEGO ${Math.round(m.stamina)}`, 52, 112);
      g.fillStyle = "#e0b56a";
      g.fillText("A ponte do Limiar aceitará seu eco.", 52, 132);
      g.fillStyle = "rgba(255,197,113,.8)";
      g.fillText("NULO: a âncora foi desviada. O retorno 2D está preservado.", 52, 148);
    }
    return true;
  }

  const motionless = false;
  return {
    available: true,
    state,
    scene,
    camera,
    render,
    syncProps,
    resize() {},
    dispose() {
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
