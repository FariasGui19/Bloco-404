// Testa o Lote 10 (Protocolo da Vigília, Fase 2 completa, Forja/Galeria e HUD S4):
// - 10 artes novas (parede-forja, teto-galeria, vigilante-aviso-fase2,
//   vigilante-fase2-ataque-b, baliza-protocolo-final, sonda-nexo-protocolo,
//   reliquia-insignia-vigilia, hud-rank-max, hud-combo-emblema, cidadela-protocolo-desperto.jpg)
// - Missão cidadela_protocolo_vigilia + relíquia insignia_vigilia_404 (+1 EN/s e +10% V/F)
// - Cutscene CITADEL_PROTOCOL_SCENES e 4 novos tons de áudio
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { map, CITADEL_PROTOCOL_BEACON, CITADEL_DORMANT_GUARDIAN, CITADEL_REACTOR_CONSOLE } from '../js/data/worlds/cidadela-404/cidadela.js';
import { CITADEL_MILESTONES } from '../js/data/cidadela-progressao.js';
import { ITEMS } from '../js/data/items.js';
import { QUESTS } from '../js/data/quests.js';
import { CITADEL_PROTOCOL_SCENES } from '../js/ui/cutscene.js';
import { state } from '../js/game/state.js';
import { playCitadelSound } from '../js/game/cidadela-audio.js';
import { citadelMissions, isCitadelProtocolComplete, missionObjective } from '../js/game/cidadela-missoes.js';
import { updateCitadel, renderCitadel, getCitadelRuntime, clearCitadelRuntime } from '../js/game/cidadela-fps.js';

const RGBA_SPRITES = [
  'vigilante-aviso-fase2.png',
  'vigilante-fase2-ataque-b.png',
  'baliza-protocolo-final.png',
  'sonda-nexo-protocolo.png',
  'reliquia-insignia-vigilia.png',
  'hud-rank-max.png',
  'hud-combo-emblema.png',
];
for (const file of [...RGBA_SPRITES, 'parede-forja.png', 'teto-galeria.png']) {
  assert(existsSync(`assets/source-art/cidadela-404/${file}`), `source-art ausente: ${file}`);
  assert(existsSync(`assets/sprites/cidadela-404/${file}`), `sprite ausente: ${file}`);
}
for (const file of RGBA_SPRITES) {
  assert.equal(readFileSync(`assets/sprites/cidadela-404/${file}`)[25], 6, `esperado PNG RGBA: ${file}`);
}
assert(existsSync('assets/source-art/cidadela-404/cidadela-protocolo-desperto.jpg'));
assert(existsSync('assets/cutscenes/cidadela-protocolo-desperto.jpg'));
assert.equal(CITADEL_PROTOCOL_SCENES.length, 1);
assert.equal(CITADEL_PROTOCOL_SCENES[0].image, 'assets/cutscenes/cidadela-protocolo-desperto.jpg');
assert(ITEMS.insignia_vigilia_404?.spritePath?.endsWith('reliquia-insignia-vigilia.png'));
assert.equal(QUESTS.cidadela_protocolo_vigilia?.objectives?.length, 3);

const input = { keys: {}, pressed: new Set(), mouseDeltaX: 0, fpsFireHeld: false };
const step = (n = 1) => { for (let i = 0; i < n; i++) { updateCitadel(.033, state, input); input.pressed.clear(); } };
const press = (k) => { input.pressed.add(k); step(); };

function boot(flags = {}, archetype = 'mare_astral', inventory = []) {
  state.progress = {
    archetype,
    inventory: [...inventory],
    flags: { ...flags },
    archetypeProgress: { [archetype]: { level: 3, xp: 0 } },
    tools: {},
    citadelMaterials: { sucata_codigo: 0, nucleo_estatica: 0 },
  };
  state.world.currentMap = map;
  state.world.isLoading = false;
  state.world.fpsPaused = false;
  Object.assign(state.player, { health: 100, maxHealth: 100, energy: 60, maxEnergy: 100, invulnerable: 0, ultimate: { cooldown: 0 } });
  input.keys = {}; input.pressed.clear(); input.fpsFireHeld = false;
  clearCitadelRuntime();
  step();
  return getCitadelRuntime();
}

// 1. Renderizador desenha todas as 9 artes de sprites/texturas nos cenários corretos
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

  // Setor 03 // Forja: parede-forja + teto-galeria
  const fullFlags = Object.fromEntries(CITADEL_MILESTONES.map(f => [f, true]));
  const g = boot(fullFlags, 'lamina_dominio_anciao', ['insignia_vigilia_404']);
  g.panel = null; state.world.fpsPaused = false;
  Object.assign(state.player, { x: 18.5, y: 6.5 });
  g.angle = 0;
  g.combo = 3; g.comboTimer = 5;
  drawn.length = 0;
  renderCitadel({ width: 960, height: 540, getContext: () => ctx }, state);
  assert(drawn.some(s => s.endsWith('parede-forja.png')), 'parede-forja.png desenhada no Setor 03');
  assert(drawn.some(s => s.endsWith('teto-galeria.png')), 'teto-galeria.png desenhado nos setores internos');
  assert(drawn.some(s => s.endsWith('hud-rank-max.png')), 'hud-rank-max.png desenhado no HUD em Sintonia S4');
  assert(drawn.some(s => s.endsWith('hud-combo-emblema.png')), 'hud-combo-emblema.png desenhado quando sequência >= 2');

  // Arena: Baliza desligada + Vigilante Fase 2 aviso e ataque B
  Object.assign(state.player, { x: 25.2, y: 4.5 });
  g.angle = Math.atan2(CITADEL_PROTOCOL_BEACON.y - 4.5, CITADEL_PROTOCOL_BEACON.x - 25.2);
  drawn.length = 0;
  renderCitadel({ width: 960, height: 540, getContext: () => ctx }, state);
  assert(drawn.some(s => s.endsWith('baliza-protocolo-final.png')), 'baliza-protocolo-final.png desenhada antes da conclusão');

  state.progress.flags.cidadela_protocolo_concluido = true;
  drawn.length = 0;
  renderCitadel({ width: 960, height: 540, getContext: () => ctx }, state);
  assert(drawn.some(s => s.endsWith('sonda-nexo-protocolo.png')), 'sonda-nexo-protocolo.png desenhada após conclusão');

  Object.assign(state.player, { x: 25.5, y: 6.5 });
  g.angle = 0;
  Object.assign(g.boss, { dead: false, hp: 100, phaseTwo: true, cycle: 1.5 });
  drawn.length = 0;
  renderCitadel({ width: 960, height: 540, getContext: () => ctx }, state);
  assert(drawn.some(s => s.endsWith('vigilante-aviso-fase2.png')), 'vigilante-aviso-fase2.png desenhado na preparação da Fase 2');

  g.boss.cycle = 3.0;
  g.time = 0.5;
  drawn.length = 0;
  renderCitadel({ width: 960, height: 540, getContext: () => ctx }, state);
  assert(drawn.some(s => s.endsWith('vigilante-fase2-ataque-b.png')), 'vigilante-fase2-ataque-b.png desenhado na alternância de rajada da Fase 2');

  g.panel = 'journal';
  drawn.length = 0;
  renderCitadel({ width: 960, height: 540, getContext: () => ctx }, state);
  assert(drawn.some(s => s.endsWith('reliquia-insignia-vigilia.png')), 'reliquia-insignia-vigilia.png desenhada no Diário [L]');
  globalThis.document = undefined;
}

// 2. Fluxo completo da missão cidadela_protocolo_vigilia + bônus de Insígnia
{
  const fullFlags = Object.fromEntries(CITADEL_MILESTONES.map(f => [f, true]));
  fullFlags.cidadela_forja_concluida = true;
  fullFlags.cidadela_fendas_concluidas = true;
  fullFlags.cidadela_rondas_concluidas = 1;
  fullFlags.cidadela_final_visto = true;
  const g = boot(fullFlags, 'lamina_dominio_anciao');
  state.progress.questLog = {
    cidadela_rede_escuta: { status: 'completed', counters: [1, 1, 1, 1], claimed: true },
    cidadela_vozes_estatica: { status: 'completed', counters: [1, 1, 1, 1], claimed: true },
  };
  g.panel = null; state.world.fpsPaused = false;
  assert.equal(citadelMissions(state.progress).protocolo.status, 'available');
  assert(missionObjective(state.progress).includes('BALIZA DO PROTOCOLO'));

  // Inicia na Baliza do Protocolo
  Object.assign(state.player, { x: CITADEL_PROTOCOL_BEACON.x, y: CITADEL_PROTOCOL_BEACON.y });
  press('e');
  assert.equal(citadelMissions(state.progress).protocolo.status, 'active');

  // Passo 1: Console do Reator
  Object.assign(state.player, { x: CITADEL_REACTOR_CONSOLE.x, y: CITADEL_REACTOR_CONSOLE.y });
  press('e');
  assert(citadelMissions(state.progress).protocolo.objectives[0].done, 'passo sonda/console concluído');

  // Passo 2: Vigilante Inerte
  Object.assign(state.player, { x: CITADEL_DORMANT_GUARDIAN.x, y: CITADEL_DORMANT_GUARDIAN.y });
  press('e');
  assert(citadelMissions(state.progress).protocolo.objectives[1].done, 'passo vigilante inerte concluído');

  // Passo 3: Selar na Baliza do Protocolo -> entrega insignia_vigilia_404
  Object.assign(state.player, { x: CITADEL_PROTOCOL_BEACON.x, y: CITADEL_PROTOCOL_BEACON.y });
  press('e');
  assert.equal(citadelMissions(state.progress).protocolo.status, 'completed');
  assert(state.progress.flags.cidadela_protocolo_concluido, 'flag cidadela_protocolo_concluido ativada');
  assert(state.progress.inventory.includes('insignia_vigilia_404'), 'relíquia insignia_vigilia_404 entregue ao inventário');
  assert(isCitadelProtocolComplete(state.progress), 'isCitadelProtocolComplete retorna true');

  // Bônus da insígnia no [V]: Domínio base 32 -> +10% = 35
  const foe = { type: 'imp', x: state.player.x + 1.0, y: state.player.y, hp: 60, maxHp: 60, cooldown: 99, slow: 0 };
  g.enemies = [foe];
  g.angle = 0;
  press('v');
  assert.equal(foe.hp, 25, 'insignia_vigilia_404 amplia golpe cinético [V] em +10% (32 -> 35)');
}

// 3. Novos tons de áudio executam sem erro
for (const tone of ['protocol_step', 'protocol_complete', 'boss_phase2_warn', 'rank_up']) {
  playCitadelSound(tone);
}

console.log('Lote 10 da Cidadela 404 (Protocolo da Vigília, Fase 2 e Forja): 3/3 grupos de testes ok.');
