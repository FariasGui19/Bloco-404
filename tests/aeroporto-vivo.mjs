// node --experimental-default-type=module tests/aeroporto-vivo.mjs
// Cobre a rodada "Aeroporto Central 2.5D Vivo":
//  - escala por profundidade monotônica (pseudo-3D)
//  - mobília reposicionada/nova e NPCs ambientais no mapa
//  - render completo do side-view com um 2D context falso (inclui o
//    tingimento do vórtice e os estados trancado/liberado da Área de Carga)
//  - sprites registrados em main.js e arquivos presentes em disco
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { state } from '../js/game/state.js';
import { loadMap } from '../js/game/map-manager.js';
import { camera, view } from '../js/engine/camera.js';
import { renderSideViewMap } from '../js/engine/side-view.js';
import { getArchetypeAbilities } from '../js/game/abilities.js';

// ---- DOM falso mínimo (permite até <canvas> fora da tela) ----
const gradient = { addColorStop() {} };
const numericIssues = [];
function checkArgs(name, args) {
  for (const a of args) {
    if (typeof a === 'number' && !Number.isFinite(a)) numericIssues.push(`${name}(${a})`);
  }
}
function makeCtx() {
  const target = {
    measureText: () => ({ width: 80 }),
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    createConicGradient: () => gradient,
  };
  return new Proxy(target, {
    get(t, prop) {
      if (prop in t) return t[prop];
      return (...args) => { checkArgs(String(prop), args); };
    },
    set(t, prop, value) { t[prop] = value; return true; },
  });
}
function makeCanvas() {
  const c = { width: 0, height: 0 };
  c.getContext = () => makeCtx();
  return c;
}
const element = () => ({ dataset: {}, classList: { add() {}, remove() {} }, addEventListener() {}, textContent: '', innerHTML: '' });
const elements = Object.fromEntries(['dialogueBox', 'dialogueSpeaker', 'dialogueText', 'dialogueHint', 'dialogueChoices'].map(id => [id, element()]));
globalThis.document = {
  getElementById: id => elements[id],
  createElement: () => makeCanvas(),
};
globalThis.window = { addEventListener() {}, innerWidth: 1280, innerHeight: 720 };

view.w = 1280;
view.h = 720;
view.dpr = 1;

state.progress = {
  archetype: 'motor_bio_forja',
  abilities: getArchetypeAbilities('motor_bio_forja'),
  flags: {},
  inventory: [],
};

// ---- 1) Escala de profundidade removida por decisão de design (nov/2026):
//        todos os atores e objetos desenham em escala constante.
import { readFileSync as _rf } from 'node:fs';
assert(!_rf(new URL('../js/engine/side-view.js', import.meta.url), 'utf8').includes('svDepthScale'),
  'svDepthScale não deve mais existir no side-view');

// ---- 2) Mapa carrega com a mobília nova e os NPCs ambientais ----
const ok = await loadMap('hub_aeroporto', 'inicio');
assert(ok, 'falha ao carregar hub_aeroporto');
const map = state.world.currentMap;
const objIds = (map.objects ?? []).map(o => o.id);
for (const id of ['vending_aero_01', 'planta_aero_01', 'planta_aero_02', 'planta_aero_03',
                  'lamp_aero_01', 'lamp_aero_02', 'cone_aero_01', 'barreira_aero_01',
                  'carrinho_aero_01', 'totem_holo_01', 'totem_holo_02']) {
  assert(objIds.includes(id), `objeto ${id} ausente no mapa`);
}
// Arte IA nova registrada nos sprites certos
const aeroSprites = (map.objects ?? []).filter(o => String(o.sprite).startsWith('aero_')).map(o => o.sprite);
for (const sprite of ['aero_painel_partidas', 'aero_carrinho_bagagem', 'aero_totem_holo', 'aero_planta_aliena']) {
  assert(aeroSprites.includes(sprite), `sprite IA ${sprite} não usado no mapa`);
}
assert(!(map.objects ?? []).some(o => o.id === 'painel_partidas' && o.sprite !== 'aero_painel_partidas'),
  'painel de partidas deve usar a arte nova');
const viajante = map.actors.find(a => a.id === 'viajante_aeroporto');
assert(viajante?.tipo === 'viajante_ambiental', 'viajante ambiental ausente');
// Escalas calibradas (nov/2026): L-9 presença grande mas não dominante; Guia legível
const l9 = map.actors.find(a => a.id === 'robo_aeroporto');
assert(l9?.tipo === 'robo', 'L-9 ausente');
assert(l9.spriteScale > 1 && l9.spriteScale <= 1.4, `L-9 fora da proporção (${l9.spriteScale})`);
assert(Array.isArray(viajante.visitorRoute) && viajante.visitorRoute.length === 2, 'viajante sem rota própria');
assert(map.actors.some(a => a.id === 'robo_aeroporto' && a.tipo === 'robo'), 'unidade L-9 ausente');
assert(map.spawnPoints.inicio && map.spawnPoints.vindo_da_carga, 'spawns preservados');
// Bloqueios novos não entopem a passarela: faixas y=4..5 continuam caminháveis ao longo do mapa
assert(map.layout[4].slice(1, -1).every(cell => cell === 0), 'faixa central da passarela invadida');

// ---- 3) Render completo com ctx falso (vórtice, travado e liberado) ----
camera.x = 14.5 * 64;
camera.y = 4.4 * 22;
camera.zoom = 1;
const ctx = makeCtx();
let drawnPlayer = 0;
let drawnActor = 0;
const callbacks = {
  drawPlayer: () => { drawnPlayer += 1; },
  drawActor: () => { drawnActor += 1; },
};
renderSideViewMap(ctx, map, state, camera.x, camera.y, view.w, view.h, camera.zoom, 1, 123456789, callbacks);
assert(drawnPlayer >= 1, 'player não foi renderizado');
assert(drawnActor >= 3, 'guia + viajante + L-9 devem ser renderizados');

state.progress.flags.airportTerminalDiagnosed = true;
renderSideViewMap(ctx, map, state, camera.x, camera.y, view.w, view.h, camera.zoom, 1, 123456999, callbacks);

// Nenhum argumento NaN/Infinito pode chegar ao canvas nos dois estados
assert.equal(numericIssues.length, 0, `coordenadas inválidas no render: ${numericIssues.slice(0, 5).join(', ')}`);

// ---- 4) Sprites registrados e arquivos presentes ----
const mainSrc = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
for (const [id, file] of [
  ['aeroporto_portal_swirl', 'assets/sprites/aeroporto/portal-vortice.png'],
  ['aeroporto_nave_cargueiro', 'assets/sprites/aeroporto/nave-cargueiro.png'],
  ['aeroporto_nave_cruzador', 'assets/sprites/aeroporto/nave-cruzador.png'],
  ['aeroporto_nave_shuttle', 'assets/sprites/aeroporto/nave-shuttle.png'],
  ['aeroporto_planeta_anelado', 'assets/sprites/aeroporto/planeta-anelado.png'],
  ['aeroporto_planeta_vermelho', 'assets/sprites/aeroporto/planeta-vermelho.png'],
]) {
  assert(mainSrc.includes(`id: '${id}'`), `${id} não registrado em main.js`);
  assert(existsSync(new URL(`../${file}`, import.meta.url)), `arquivo ${file} não existe`);
}

console.log('Aeroporto Central 2.5D Vivo: profundidade, mobília, NPCs ambientais, render e assets OK.');
