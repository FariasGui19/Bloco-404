// Testa o Lote 6 da Cidadela 404:
// - 10 novas artes (passadas/queda/ataque lateral do elite, Fase 2 ataque do Vigilante,
//   piso da Oficina e 4 explosões de Ultimate [F] por arquétipo)
// - Passivas e leituras exclusivas dos 4 arquétipos na Cidadela
// - Renderização de piso-oficina e ultimate_${mod.mode}
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { map, CITADEL_DORMANT_GUARDIAN, CITADEL_SECRET_E1M1, CITADEL_POSTGAME } from '../js/data/worlds/cidadela-404/cidadela.js';
import { state } from '../js/game/state.js';
import { startQuest, recordQuestEvent } from '../js/game/quests.js';
import { CITADEL_REDE, interactCitadelMission } from '../js/game/cidadela-missoes.js';
import { updateCitadel, renderCitadel, getCitadelRuntime, clearCitadelRuntime, citadelSpriteFrame, bossVisualFrame } from '../js/game/cidadela-fps.js';

const BATCH6_ASSETS = [
  'assets/sprites/cidadela-404/imp-elite-passo-a.png',
  'assets/sprites/cidadela-404/imp-elite-passo-b.png',
  'assets/sprites/cidadela-404/imp-elite-lateral-ataque.png',
  'assets/sprites/cidadela-404/imp-elite-queda.png',
  'assets/sprites/cidadela-404/vigilante-fase2-ataque.png',
  'assets/sprites/cidadela-404/piso-oficina.png',
  'assets/sprites/cidadela-404/ultimate-mare.png',
  'assets/sprites/cidadela-404/ultimate-nucleo.png',
  'assets/sprites/cidadela-404/ultimate-dominio.png',
  'assets/sprites/cidadela-404/ultimate-bio.png',
];
for (const file of BATCH6_ASSETS) assert(existsSync(file), `asset do lote 6 ausente: ${file}`);

// 1. Quadros dedicados de elite e Vigilante Fase 2
assert.equal(citadelSpriteFrame({ type: 'elite', hp: 95, moving: true, walkPhase: 0 }, 0, false), 'elite_walk_a');
assert.equal(citadelSpriteFrame({ type: 'elite', hp: 95, moving: true, walkPhase: 1.2 }, 0, false), 'elite_walk_b');
assert.equal(citadelSpriteFrame({ type: 'elite', hp: 0, death: .55 }, 0, false), 'elite_fall');
assert.equal(citadelSpriteFrame({ type: 'elite', hp: 0, death: .55 }, 0, true), 'elite_death');
assert.equal(bossVisualFrame({ cycle: 2.5, phaseTwo: true, hp: 120 }, 0, false), 'boss_phase2_attack');
assert.equal(bossVisualFrame({ cycle: 2.5, phaseTwo: true, hp: 120 }, 0, true), 'boss_attack');

const input = { keys: {}, pressed: new Set(), mouseDeltaX: 0, fpsFireHeld: false };
const step = (n = 1) => { for (let i = 0; i < n; i++) { updateCitadel(.033, state, input); input.pressed.clear(); } };
const press = (k) => { input.pressed.add(k); step(); };

function boot(flags = {}, archetype = 'mare_astral') {
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

// 2. Passivas dos 4 arquétipos
{
  // Núcleo X10: recarga mais rápida (1.25s) e impulso Shift mais longo (0.22s)
  const gNuc = boot({}, 'nucleo_dez_forma');
  gNuc.ammo = 6;
  press('t');
  assert.equal(gNuc.reload, 1.25, 'Núcleo X10 recarrega em 1.25s');
  press('shift');
  assert(gNuc.dash > 0.18, 'Núcleo X10 prolonga duração do impulso Shift');

  // Domínio Ancião: +8 de precisão no núcleo exposto do Vigilante (35 + 8 = 43)
  const gDom = boot({ cidadela_chave_azul: true, cidadela_chave_amarela: true, cidadela_chave_vermelha: true }, 'lamina_dominio_anciao');
  Object.assign(state.player, { x: 25.5, y: 6.5 });
  gDom.angle = 0;
  gDom.boss.cycle = 5.0;
  const hpBefore = gDom.boss.hp;
  press(' ');
  assert.equal(hpBefore - gDom.boss.hp, 43, 'Domínio Ancião aplica +8 de dano de precisão no núcleo aberto');

  // Bio-Forja: reduz 15% do dano de projétil quando acima de 50% PV
  const gBio = boot({}, 'motor_bio_forja');
  gBio.shield = 0; gBio.guard = 0;
  gBio.shots.push({ x: state.player.x, y: state.player.y, dx: 0, dy: 0, damage: 20, life: 1 });
  step();
  assert.equal(state.player.health, 83, 'Bio-Forja reduz dano recebido em 15% acima de 50% PV (20 -> 17)');

  // Maré Astral: velocidade em corredor 10% maior e decaimento passivo de eco mais rápido
  const gMare = boot({}, 'mare_astral');
  gMare.echo = 50;
  const xBefore = state.player.x;
  input.keys.w = true;
  step();
  input.keys.w = false;
  const movedMare = state.player.x - xBefore;
  assert(movedMare > 2.8 * 0.033 * 1.05, 'Maré Astral desloca mais rápido nos corredores');
  assert(gMare.echo < 50 - 0.033 * 0.75, 'Maré Astral dissipa eco passivamente mais rápido');
}

// 3. Leituras por arquétipo na Carcaça Inerte, Placa E1M1 e NEXO-04 pós-rede
{
  const g = boot({ cidadela_estavel: true, cidadela_final_visto: true }, 'lamina_dominio_anciao');
  Object.assign(state.player, { x: CITADEL_DORMANT_GUARDIAN.x - 0.6, y: CITADEL_DORMANT_GUARDIAN.y });
  press('e');
  assert(g.message.includes('DOMÍNIO:'), 'carcaça do Vigilante inclui leitura do Domínio Ancião');

  Object.assign(state.player, { x: CITADEL_SECRET_E1M1.x, y: CITADEL_SECRET_E1M1.y + 0.6 });
  press('e');
  assert(g.radioQueue.some(m => m.includes('DOMÍNIO:')), 'placa E1M1 inclui reflexão do arquétipo');

  startQuest(state.progress, CITADEL_REDE);
  for (const id of ['entrada', 'galeria', 'forja']) recordQuestEvent(state.progress, { type: 'cidadela_rele', target: id });
  recordQuestEvent(state.progress, { type: 'cidadela_relato', target: 'rede' });
  const res = interactCitadelMission(state.progress, CITADEL_POSTGAME.sonda);
  assert(res.message.includes('DOMÍNIO ANCIÃO'), 'NEXO-04 reconhece o arquétipo ativo após restaurar a rede');
}

// 4. Renderizador desenha piso-oficina e ultimate_${mode} sem erros
{
  const drawn = [];
  const noop = () => {};
  const ctx = {
    imageSmoothingEnabled: false,
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: 'left', globalAlpha: 1,
    fillRect: noop, clearRect: noop, strokeRect: noop, beginPath: noop, moveTo: noop, lineTo: noop, arc: noop, closePath: noop, stroke: noop, fill: noop,
    save: noop, restore: noop, setTransform: noop, translate: noop, scale: noop,
    measureText: (t) => ({ width: String(t).length * 5 }),
    fillText: noop,
    drawImage: (img) => { if (img?.src) drawn.push(img.src); },
  };
  globalThis.document = { createElement: () => ({ width: 480, height: 270, getContext: () => ctx }) };
  globalThis.window = { matchMedia: () => ({ matches: false }) };
  globalThis.Image = class { constructor() { this.width = 128; this.height = 128; } set src(v) { this._src = v; this.onload?.(); } get src() { return this._src; } };

  const g = boot({ cidadela_estavel: true, cidadela_final_visto: true }, 'mare_astral');
  Object.assign(state.player, { x: 10, y: 16 });
  g.fx = 0.8; g.fxKind = 'ultimate';
  renderCitadel({ width: 960, height: 540, getContext: () => ctx }, state);
  assert(drawn.some(s => s.endsWith('piso-oficina.png')), 'piso-oficina.png é desenhado na Oficina da Vigília');
  assert(drawn.some(s => s.endsWith('ultimate-mare.png')), 'ultimate-mare.png é desenhado durante [F] de Maré Astral');
}

console.log('Lote 6 da Cidadela 404 (animações finais + arquétipos): 4/4 grupos de testes ok.');
