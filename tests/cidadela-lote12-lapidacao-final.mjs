// Testa o Lote 12 (Lapidação Final: paridade dos 4 arquétipos, escudo no visor,
// aura de lentidão em inimigos, crítico/tracer de tiro e linhas de dash):
// - 10 artes novas (canhao-nucleo/dominio/bio-pulso, hud-arma-nucleo/dominio/bio-ativa,
//   visor-escudo-ativo, aura-lentidao, impacto-critico, efeito-dash-velocidade)
// - Áudio: crit_hit e dash
// - Renderização em combate: tracer, hitmarker + dano, impacto crítico, aura de lentidão,
//   escudo no visor, dash lines e troca ativa de canhão/HUD nos 4 arquétipos
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { map } from '../js/data/worlds/cidadela-404/cidadela.js';
import { state } from '../js/game/state.js';
import { playCitadelSound } from '../js/game/cidadela-audio.js';
import {
  updateCitadel,
  renderCitadel,
  getCitadelRuntime,
  clearCitadelRuntime,
} from '../js/game/cidadela-fps.js';

const RGBA_SPRITES = [
  'canhao-nucleo-pulso.png',
  'canhao-dominio-pulso.png',
  'canhao-bio-pulso.png',
  'hud-arma-nucleo-ativa.png',
  'hud-arma-dominio-ativa.png',
  'hud-arma-bio-ativa.png',
  'visor-escudo-ativo.png',
  'aura-lentidao.png',
  'impacto-critico.png',
  'efeito-dash-velocidade.png',
];

for (const file of RGBA_SPRITES) {
  assert(existsSync(`assets/source-art/cidadela-404/${file}`), `source-art ausente: ${file}`);
  assert(existsSync(`assets/sprites/cidadela-404/${file}`), `sprite ausente: ${file}`);
  assert.equal(readFileSync(`assets/sprites/cidadela-404/${file}`)[25], 6, `esperado PNG RGBA: ${file}`);
}

const input = { keys: {}, pressed: new Set(), mouseDeltaX: 0, fpsFireHeld: false };
const step = (n = 1) => { for (let i = 0; i < n; i++) { updateCitadel(.033, state, input); input.pressed.clear(); } };

function boot(archetype = 'nucleo_dez_forma', flags = {}) {
  state.progress = {
    archetype,
    inventory: [],
    flags: { ...flags },
    archetypeProgress: { [archetype]: { level: 3, xp: 0 } },
    tools: {},
    citadelMaterials: { sucata_codigo: 0, nucleo_estatica: 0 },
  };
  state.world.currentMap = map;
  state.world.isLoading = false;
  state.world.fpsPaused = false;
  Object.assign(state.player, { health: 100, maxHealth: 100, energy: 100, maxEnergy: 100, invulnerable: 0, ultimate: { cooldown: 0 } });
  input.keys = {}; input.pressed.clear(); input.fpsFireHeld = false;
  clearCitadelRuntime();
  step();
  return getCitadelRuntime();
}

const drawn = [];
const texts = [];
let arcs = 0;
let rotated = 0;
const noop = () => {};
const grad = { addColorStop: noop };
const ctx = {
  imageSmoothingEnabled: false,
  fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: 'left', globalAlpha: 1,
  fillRect: noop, clearRect: noop, strokeRect: noop, beginPath: noop, moveTo: noop, lineTo: noop, closePath: noop, stroke: noop, fill: noop,
  arc: () => { arcs++; },
  save: noop, restore: noop, setTransform: noop, scale: noop, translate: noop,
  rotate: () => { rotated++; },
  createRadialGradient: () => grad,
  measureText: (t) => ({ width: String(t).length * 5 }),
  fillText: (t) => { texts.push(String(t)); },
  drawImage: (img) => { if (img?.src) drawn.push(img.src); },
};
const motion = { matches: false };
globalThis.document = { createElement: () => ({ width: 480, height: 270, getContext: () => ctx }) };
globalThis.window = { matchMedia: () => motion };
globalThis.Image = class { constructor() { this.width = 128; this.height = 128; } set src(v) { this._src = v; this.onload?.(); } get src() { return this._src; } };

// 1. Paridade dos 4 arquétipos: pulso de canhão + ícone HUD ativo + efeitos Q/F
for (const [arch, mode] of [
  ['mare_astral', 'mare'],
  ['nucleo_dez_forma', 'nucleo'],
  ['lamina_dominio_anciao', 'dominio'],
  ['motor_bio_forja', 'bio'],
]) {
  const g = boot(arch);
  g.panel = null; state.world.fpsPaused = false;
  g.fx = .75; g.fxKind = 'q'; g.q = 5.8;
  drawn.length = 0;
  renderCitadel({ width: 960, height: 540, getContext: () => ctx }, state);
  assert(drawn.some(s => s.endsWith(`canhao-${mode}-pulso.png`)), `${mode}: canhão em pulso ativo`);
  assert(drawn.some(s => s.endsWith(`hud-arma-${mode}-ativa.png`)), `${mode}: HUD de arma ativa`);
  if (mode === 'nucleo') assert(drawn.some(s => s.endsWith('efeito-dash-velocidade.png')), 'nucleo Q exibe linhas cinéticas');
  if (mode === 'dominio') assert(drawn.some(s => s.endsWith('melee-dominio.png')), 'dominio Q exibe corte diagonal');
}

// 2. Tiro crítico, tracer, hitmarker com dano, aura de lentidão e escudo no visor
{
  const g = boot('nucleo_dez_forma');
  g.panel = null; state.world.fpsPaused = false;
  g.enemies = [{ type: 'imp', x: 4.5, y: 6.5, hp: 60, maxHp: 60, cooldown: 2, slow: 2.5 }];
  g.angle = 0;
  g.overdrive = 6; // força acerto crítico no disparo
  g.shield = 2.5;
  input.pressed.add(' ');
  step();

  assert(g.shotTracer > 0, 'disparo ativa rastro visual (shotTracer)');
  assert(g.hitCrit > 0, 'tiro em sobrecarga ativa crítico (hitCrit)');
  assert(g.hitDmg > 0, 'dano causado registrado para hitmarker');
  assert(g.impacts.some(i => i.color === 'crit'), 'impacto crítico adicionado no alvo');

  drawn.length = 0; texts.length = 0; arcs = 0;
  renderCitadel({ width: 960, height: 540, getContext: () => ctx }, state);
  assert(drawn.some(s => s.endsWith('aura-lentidao.png')), 'inimigo desacelerado exibe aura-lentidao.png');
  assert(drawn.some(s => s.endsWith('impacto-critico.png')), 'acerto crítico desenha impacto-critico.png');
  assert(drawn.some(s => s.endsWith('visor-escudo-ativo.png')), 'escudo ativo desenha visor-escudo-ativo.png');
  assert(texts.some(t => t.startsWith('-')), 'hitmarker exibe dano causado');
  assert(arcs > 0, 'tracer do tiro desenha brilho de impacto na mira');
}

// 3. Dash [Shift] exibe linhas cinéticas e áudio novo não quebra sem AudioContext
{
  const g = boot('mare_astral');
  g.panel = null; state.world.fpsPaused = false;
  input.pressed.add('shift');
  step();
  assert(g.dash > 0 && g.fxKind === 'dash', 'Shift inicia dash');
  drawn.length = 0;
  renderCitadel({ width: 960, height: 540, getContext: () => ctx }, state);
  assert(drawn.some(s => s.endsWith('efeito-dash-velocidade.png')), 'Shift desenha efeito-dash-velocidade.png');

  motion.matches = true;
  drawn.length = 0;
  renderCitadel({ width: 960, height: 540, getContext: () => ctx }, state);
  assert(!drawn.some(s => s.endsWith('efeito-dash-velocidade.png')), 'reducedMotion omite linhas cinéticas');
  motion.matches = false;

  playCitadelSound('crit_hit');
  playCitadelSound('dash');
}

clearCitadelRuntime();
console.log('Lote 12 da Cidadela 404 (lapidação final de combate, crítico, escudo, lentidão e HUD): 3/3 grupos ok.');
