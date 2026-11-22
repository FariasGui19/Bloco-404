// Renderiza a Enseada dos Ecos em Node para inspeção visual (sem navegador).
// Uso: node tools/qa/render-enseada.mjs [zoom] [saida.png] [cx] [cy] [--ref]
// Requer @napi-rs/canvas — dependência OPCIONAL de QA, não do jogo.
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas, loadImage, Image as NapiImage } from '@napi-rs/canvas';

if (process.env.QA_TIME !== undefined) globalThis.performance = { now: () => Number(process.env.QA_TIME) * 1000 };

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
process.chdir(root);

const noop = () => {};
const ctxProxy = () => new Proxy({}, {
  get: (_, key) => {
    if (key === 'canvas') return { width: 1600, height: 900 };
    if (key === 'measureText') return () => ({ width: 10 });
    if (key === 'createRadialGradient' || key === 'createLinearGradient') return () => ({ addColorStop: noop });
    if (key === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
    return noop;
  },
  set: () => true,
});
const el = () => ({
  style: {}, dataset: {}, children: [], classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
  width: 1600, height: 900, textContent: '', innerHTML: '',
  addEventListener: noop, appendChild: noop, remove: noop, setAttribute: noop, removeAttribute: noop,
  getContext: () => ctxProxy(), getBoundingClientRect: () => ({ left: 0, top: 0, width: 1600, height: 900 }),
  querySelector: () => null, querySelectorAll: () => [], animate: () => ({ finished: Promise.resolve() }),
});
const elReal = (tag) => (tag === 'canvas' ? createCanvas(1600, 900) : el());
globalThis.document = {
  createElement: elReal, createElementNS: elReal, body: el(), documentElement: el(),
  getElementById: () => el(), querySelector: () => el(), querySelectorAll: () => [],
  addEventListener: noop, fonts: { ready: Promise.resolve() },
};
globalThis.window = globalThis;
globalThis.devicePixelRatio = 1;
globalThis.addEventListener = noop; globalThis.requestAnimationFrame = () => 1;
globalThis.localStorage = { data: {}, getItem() { return null; }, setItem() {}, removeItem() {} };
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node' }, configurable: true });

// Image nativa do @napi-rs; o carregador do jogo usa `new Image()` + `src`.
globalThis.Image = class extends NapiImage {
  set src(v) { super.src = path.join(root, v); }
};

const { view, camera } = await import('../../js/engine/camera.js');
const { initRenderer, render } = await import('../../js/engine/renderer.js');
const { loadSprites } = await import('../../js/engine/sprites.js');
const { map } = await import('../../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js');
const { createCoastalFauna } = await import('../../js/game/fauna-costeira.js');

// --only=id1,id2 desenha só esses objetos; --except=id1,id2 esconde esses.
// Serve para identificar qual sprite está em cada ponto sem adivinhar.
const argOnly = process.argv.find(a => a.startsWith('--only='));
const argExcept = process.argv.find(a => a.startsWith('--except='));
const filtroArgs = (o) => {
  if (argOnly) return argOnly.slice(7).split(',').includes(o.id);
  if (argExcept) return !argExcept.slice(9).split(',').includes(o.id);
  return true;
};

const zoom = Number(process.argv[2] ?? 0.5);
const out = process.argv[3] ?? '.qa/enseada.png';
const cx = Number(process.argv[4] ?? 19);
const cy = Number(process.argv[5] ?? 31);
const VW = Number(process.env.QA_W ?? 1600), VH = Number(process.env.QA_H ?? 900);

const canvas = createCanvas(VW, VH);
initRenderer(canvas);
canvas.width = VW; canvas.height = VH;
view.w = VW; view.h = VH; view.dpr = 1;
camera.zoom = zoom; camera.targetZoom = zoom;
if (process.argv.includes('--ref')) {
  // 1:1 com a arte conceitual. A arte usa px = 737.5 + 16*(x-y) e o jogo usa
  // px = (x-y)*16 - camera.x + w/2; igualando: camera.x = w/2 - 737.5.
  // escala: o jogo desenha 32 px por tile de 45°, a arte desenha 16 px ->
  // zoom 0.5 iguala as duas. As constantes saem de igualar as duas fórmulas.
  camera.zoom = camera.targetZoom = 0.5;
  camera.x = VW - 1475;      // = (VW/2 - 737.5) / 0.5
  camera.y = VH + 305.5;     // = (VH/2 + 152.75) / 0.5
} else {
  camera.x = (cx - cy) * 32; camera.y = (cx + cy) * 16;
}
camera.follow = false;

const src = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
const lista = [...src.matchAll(/\{ id: '([^']+)', src: '([^']+)' \}/g)]
  .map(([, id, s]) => ({ id, src: s }))
  .filter(r => fs.existsSync(path.join(root, r.src)));
await loadSprites(lista);

const state = {
  player: { x: process.argv.includes('--sem-jogador') ? -100 : cx, y: process.argv.includes('--sem-jogador') ? -100 : cy, nado: null, ability: {}, health: 100, maxHealth: 100, energy: 60, maxEnergy: 100, facing: [1, 1] },
  actors: [], fauna: process.argv.includes('--fauna') ? createCoastalFauna(map) : [], companion: null, collectibles: [], hazards: [], trainingTargets: [],
  objects: (map.objects ?? [])
    .map(o => ({ ...o, x: o.x + .5, y: o.y + .5, renderType: 'object' }))
    .filter(filtroArgs),
  progress: { flags: {}, mastery: {}, kills: 0 }, world: { currentMapId: map.id },
};

render(map, state);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, canvas.toBuffer('image/png'));
console.log('ok', out);

// --labels: depois do render, escreve o id de cada objeto na sua posição de
// tela. Serve para saber EXATAMENTE qual sprite está em cada ponto antes de
// dizer que um portal/peça está no lugar errado.
if (process.argv.includes('--labels')) {
  const { worldToScreen } = await import('../../js/engine/camera.js');
  const c2 = canvas.getContext('2d');
  c2.setTransform(1, 0, 0, 1, 0, 0);
  c2.font = 'bold 11px sans-serif';
  c2.textBaseline = 'middle';
  for (const o of map.objects) {
    const p = worldToScreen(o.x + .5, o.y + .5);
    if (p.x < -60 || p.x > VW + 60 || p.y < -20 || p.y > VH + 20) continue;
    if (o.renderizar === false || o.oculto) continue;
    const t = o.id;
    const w = c2.measureText(t).width;
    c2.fillStyle = 'rgba(0,0,0,.72)';
    c2.fillRect(p.x - 1, p.y - 7, w + 4, 14);
    c2.fillStyle = '#ffe14d';
    c2.fillText(t, p.x + 1, p.y);
    c2.fillStyle = '#ff3b3b';
    c2.fillRect(p.x - 2, p.y - 2, 4, 4);
  }
  fs.writeFileSync(out, canvas.toBuffer('image/png'));
  console.log('labels', out);
}

// --colisao: mostra os novos contornos medidos sobre o render para conferência.
if (process.argv.includes('--colisao')) {
  const { worldToScreen } = await import('../../js/engine/camera.js');
  const c2 = canvas.getContext('2d');
  c2.setTransform(1,0,0,1,0,0); c2.strokeStyle = '#ff354b'; c2.fillStyle = 'rgba(255,25,60,.22)'; c2.lineWidth = 2;
  for (const o of state.objects.filter(o => o.poligonosColisao)) for (const poly of o.poligonosColisao) {
    c2.beginPath(); poly.forEach(([x,y],i) => {const p=worldToScreen(o.x+x,o.y+y); if(i) c2.lineTo(p.x,p.y); else c2.moveTo(p.x,p.y);});
    c2.closePath(); c2.fill(); c2.stroke();
  }
  fs.writeFileSync(out, canvas.toBuffer('image/png'));
}
