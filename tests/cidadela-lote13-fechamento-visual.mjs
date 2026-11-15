// Testa o Lote 13 (Fechamento Visual & Acabamento Final — 350 sprites):
// - 10 artes novas RGBA em source-art + sprites (melee-nucleo/dominio/bio-b,
//   barril-explosao-b, projetil-estatica-b, projetil-vigilante-fase2-b,
//   bancada-sintese-ativa, terminal-ronda-ativo, visor-pulso-cura, visor-echo-alerta)
// - meleeVisualFrame em 2 quadros para os 4 arquétipos (respeitando reducedMotion)
// - Iluminação dinâmica (muzzleLight / ultFlash) em tiro e explosão de barril
// - Visores de cura (heal_visor) e alerta de Echovore (echo_visor) + estados ativos de props
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { map, CITADEL_CRAFT_BENCH, CITADEL_PATROL_CONSOLE } from '../js/data/worlds/cidadela-404/cidadela.js';
import { state } from '../js/game/state.js';
import {
  clearCitadelRuntime,
  getCitadelRuntime,
  meleeVisualFrame,
  renderCitadel,
  updateCitadel,
} from '../js/game/cidadela-fps.js';

const LOTE13_FILES = [
  'melee-nucleo-b.png',
  'melee-dominio-b.png',
  'melee-bio-b.png',
  'barril-explosao-b.png',
  'projetil-estatica-b.png',
  'projetil-vigilante-fase2-b.png',
  'bancada-sintese-ativa.png',
  'terminal-ronda-ativo.png',
  'visor-pulso-cura.png',
  'visor-echo-alerta.png',
];

for (const file of LOTE13_FILES) {
  assert(existsSync(`assets/source-art/cidadela-404/${file}`), `source-art ausente: ${file}`);
  assert(existsSync(`assets/sprites/cidadela-404/${file}`), `sprite ausente: ${file}`);
  assert.equal(readFileSync(`assets/sprites/cidadela-404/${file}`)[25], 6, `esperado PNG RGBA: ${file}`);
}

for (const mode of ['mare', 'nucleo', 'dominio', 'bio']) {
  assert.equal(meleeVisualFrame(mode, 0.30, false), `melee_${mode}`);
  assert.equal(meleeVisualFrame(mode, 0.08, false), `melee_${mode}_b`);
  assert.equal(meleeVisualFrame(mode, 0.08, true), `melee_${mode}`);
}

const input = { keys: {}, pressed: new Set(), mouseDeltaX: 0, fpsFireHeld: false };
const step = (n = 1) => {
  for (let i = 0; i < n; i++) {
    updateCitadel(0.033, state, input);
    input.pressed.clear();
  }
};

function boot(archetype = 'motor_bio_forja', flags = {}) {
  state.progress = {
    archetype,
    inventory: [],
    flags: { ...flags },
    archetypeProgress: { [archetype]: { level: 3, xp: 0 } },
    tools: {},
    citadelMaterials: { sucata_codigo: 4, nucleo_estatica: 2 },
  };
  state.world.currentMap = map;
  state.world.isLoading = false;
  state.world.fpsPaused = false;
  Object.assign(state.player, {
    health: 100,
    maxHealth: 100,
    energy: 100,
    maxEnergy: 100,
    invulnerable: 0,
    ultimate: { cooldown: 0 },
  });
  input.keys = {};
  input.pressed.clear();
  input.fpsFireHeld = false;
  clearCitadelRuntime();
  step();
  return getCitadelRuntime();
}

const drawn = [];
const fillStyles = [];
const noop = () => {};
const grad = { addColorStop: noop };
const ctx = {
  imageSmoothingEnabled: false,
  _fillStyle: '',
  get fillStyle() { return this._fillStyle; },
  set fillStyle(v) { this._fillStyle = v; fillStyles.push(v); },
  strokeStyle: '',
  lineWidth: 1,
  font: '',
  textAlign: 'left',
  globalAlpha: 1,
  fillRect: noop,
  clearRect: noop,
  strokeRect: noop,
  beginPath: noop,
  moveTo: noop,
  lineTo: noop,
  closePath: noop,
  stroke: noop,
  fill: noop,
  arc: noop,
  save: noop,
  restore: noop,
  setTransform: noop,
  scale: noop,
  translate: noop,
  rotate: noop,
  createRadialGradient: () => grad,
  measureText: (t) => ({ width: String(t).length * 5 }),
  fillText: noop,
  drawImage: (img) => { if (img?.src) drawn.push(img.src); },
};
const motion = { matches: false };
globalThis.document = { createElement: () => ({ width: 480, height: 270, getContext: () => ctx }) };
globalThis.window = { matchMedia: () => motion };
globalThis.Image = class {
  constructor() { this.width = 128; this.height = 128; }
  set src(v) { this._src = v; this.onload?.(); }
  get src() { return this._src; }
};
const canvas = { width: 480, height: 270, getContext: () => ctx };

// 1. Deploy inicial da arma + muzzleLight no disparo + melee 2-quadros nos 4 arquétipos
const g = boot('nucleo_dez_forma');
assert(g.weaponDeploy > 0, 'deploy inicial da arma deve ser positivo');
input.pressed.add('space');
step();
assert(g.muzzleLight > 0, 'disparo deve acionar muzzleLight no raycaster');

for (const [arch, mode] of [
  ['mare_astral', 'mare'],
  ['nucleo_dez_forma', 'nucleo'],
  ['lamina_dominio_anciao', 'dominio'],
  ['motor_bio_forja', 'bio'],
]) {
  const gm = boot(arch);
  input.pressed.add('v');
  step();
  step(5); // avança fx para a 2ª metade do golpe
  drawn.length = 0;
  renderCitadel(canvas, state);
  assert(drawn.some((s) => s.includes(`melee-${mode}-b.png`)), `esperado 2º quadro melee-${mode}-b.png`);
  assert(gm.melee >= 0);
}

// 2. Cura aciona healFlash + visor-pulso-cura, Echo >= 75 aciona visor-echo-alerta, munição baixa destaca em âmbar
const gh = boot('motor_bio_forja');
state.player.health = 70;
gh.supplies[0].x = state.player.x;
gh.supplies[0].y = state.player.y;
gh.echo = 82;
gh.ammo = 2;
step();
assert(gh.healFlash > 0, 'suprimento de cura deve ativar healFlash');
drawn.length = 0;
fillStyles.length = 0;
renderCitadel(canvas, state);
assert(drawn.some((s) => s.includes('visor-pulso-cura.png')), 'esperado visor-pulso-cura.png na tela');
assert(drawn.some((s) => s.includes('visor-echo-alerta.png')), 'esperado visor-echo-alerta.png com Echo >= 75%');
assert(fillStyles.includes('#ffd180'), 'esperado destaque âmbar para munição baixa');

// 3. Props ativos (bancada + terminal de ronda), explosão frame B e projéteis alternantes
const gp = boot('mare_astral', { cidadela_estavel: true });
gp.patrol = true;
gp.angle = 0;
gp.time = 1 / 12 + 0.01; // fase ímpar de alternância dos projéteis
gp.shots.push(
  { x: state.player.x + 1.2, y: state.player.y, dx: -1, dy: 0, damage: 5, kind: 'imp', life: 2 },
  { x: state.player.x + 1.5, y: state.player.y, dx: -1, dy: 0, damage: 5, kind: 'boss_p2', life: 2 },
);
gp.impacts.push({ x: state.player.x + 1.8, y: state.player.y, color: 'explosion', life: 0.14 });
drawn.length = 0;
renderCitadel(canvas, state);
assert(drawn.some((s) => s.includes('projetil-estatica-b.png')), 'esperado quadro B de projetil-estatica');
assert(drawn.some((s) => s.includes('projetil-vigilante-fase2-b.png')), 'esperado quadro B de projetil-vigilante-fase2');
assert(drawn.some((s) => s.includes('barril-explosao-b.png')), 'esperado quadro B da explosão');

// Bancada ativa e terminal de ronda ativo quando visíveis à frente do jogador
state.player.x = CITADEL_CRAFT_BENCH.x - 1.2;
state.player.y = CITADEL_CRAFT_BENCH.y;
gp.angle = 0;
drawn.length = 0;
renderCitadel(canvas, state);
assert(drawn.some((s) => s.includes('bancada-sintese-ativa.png')), 'esperado bancada-sintese-ativa.png quando receita pronta');

state.player.x = CITADEL_PATROL_CONSOLE.x - 1.2;
state.player.y = CITADEL_PATROL_CONSOLE.y;
gp.angle = 0;
drawn.length = 0;
renderCitadel(canvas, state);
assert(drawn.some((s) => s.includes('terminal-ronda-ativo.png')), 'esperado terminal-ronda-ativo.png durante ronda');

clearCitadelRuntime();
console.log('Lote 13 da Cidadela 404 (fechamento visual, luz dinâmica, visores e 2-quadros): 3/3 grupos ok');
