// Testa o Lote 4 da Cidadela 404: direcionais/dano e investida do elite,
// parede da Arena, gravações distintas + convergência narrativa, ícones de
// materiais no HUD/Códex, áudio expandido, fase 2 progressiva e travessia única.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { map, CITADEL_POSTGAME } from '../js/data/worlds/cidadela-404/cidadela.js';
import { THRESHOLD_SCENES, SIGNAL_SCENES } from '../js/ui/cutscene.js';
import { state } from '../js/game/state.js';
import { startQuest, recordQuestEvent } from '../js/game/quests.js';
import { CITADEL_REDE, CITADEL_VOZES } from '../js/game/cidadela-missoes.js';
import { citadelAudioEnabled, toggleCitadelAudio, playCitadelSound } from '../js/game/cidadela-audio.js';
import { updateCitadel, getCitadelRuntime, clearCitadelRuntime, citadelSpriteFrame } from '../js/game/cidadela-fps.js';

const BATCH4_ASSETS = [
  'assets/sprites/cidadela-404/imp-elite-lateral.png',
  'assets/sprites/cidadela-404/imp-elite-costas.png',
  'assets/sprites/cidadela-404/imp-elite-dano.png',
  'assets/sprites/cidadela-404/parede-arena.png',
  'assets/sprites/cidadela-404/registro-entrada.png',
  'assets/sprites/cidadela-404/registro-forja.png',
  'assets/sprites/cidadela-404/drop-sucata-hud.png',
  'assets/sprites/cidadela-404/drop-nucleo-hud.png',
  'assets/sprites/cidadela-404/vigilante-nucleo-aviso.png',
  'assets/cutscenes/cidadela-travessia-anel.jpg',
];
for (const file of BATCH4_ASSETS) assert(existsSync(file), `asset do lote 4 ausente: ${file}`);

// THRESHOLD_SCENES não reutiliza mais artes de SIGNAL_SCENES.
const signalSet = new Set(SIGNAL_SCENES.map(s => s.image));
assert(THRESHOLD_SCENES.every(s => !signalSet.has(s.image)), 'THRESHOLD_SCENES possui 3 artes exclusivas');
assert.equal(THRESHOLD_SCENES[2].image, 'assets/cutscenes/cidadela-travessia-anel.jpg');

assert.equal(citadelSpriteFrame({ type: 'elite', hp: 80, hurt: .15 }, 0), 'elite_hurt');

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

// 1. Sentinela de elite telegrafa e executa investida de choque a curta distância.
{
  const g = boot();
  const elite = g.enemies.find(e => e.type === 'elite');
  Object.assign(state.player, { x: 18.0, y: 5.5, health: 100 });
  Object.assign(elite, { x: 19.6, y: 5.5, cooldown: 0, windup: 0 });
  g.shield = 0; g.guard = 0;
  step();
  assert(elite.meleeCharge, 'sentinela de elite inicia investida de choque abaixo de 2.2 tiles');
  assert(elite.windup > 0);
  step(22);
  assert(state.player.health < 100, 'investida de choque aplica dano ao concluir preparo');
  assert(g.impacts.some(i => i.color === 'cyan'), 'investida gera impacto elétrico');
}

// 2. Vigilante Fase 2 emite fala progressiva abaixo de 25% de vida.
{
  const g = boot({ cidadela_chave_azul: true, cidadela_chave_amarela: true, cidadela_chave_vermelha: true });
  Object.assign(state.player, { x: 24.5, y: 6.5 });
  g.boss.hp = 68;
  g.boss.phaseTwo = true;
  g.boss.phaseTwoLow = false;
  step();
  assert(g.boss.phaseTwoLow, 'fase 2 registra marco abaixo de 25% PV');
  assert(g.radioQueue.some(m => m.includes('SUSTENTOU O REATOR')), 'emite fala de rádio sobre sacrifício do Vigilante');
}

// 3. Terceira caixa de registro dispara convergência narrativa dos 3 segundos.
{
  const g = boot({ cidadela_estavel: true, cidadela_final_visto: true });
  startQuest(state.progress, CITADEL_REDE);
  for (const id of ['entrada', 'galeria', 'forja']) recordQuestEvent(state.progress, { type: 'cidadela_rele', target: id });
  recordQuestEvent(state.progress, { type: 'cidadela_relato', target: 'rede' });
  startQuest(state.progress, CITADEL_VOZES);
  recordQuestEvent(state.progress, { type: 'cidadela_registro', target: 'entrada' });
  recordQuestEvent(state.progress, { type: 'cidadela_registro', target: 'galeria' });
  const forja = CITADEL_POSTGAME.registros.find(r => r.id === 'forja');
  Object.assign(state.player, { x: forja.x, y: forja.y - .6 });
  press('e');
  assert(g.radioQueue.some(m => m.includes('SINAL DE 3s ANTES')), 'terceiro registro conecta anomalia dos 3s e Vigília');
}

// 4. Áudio sintetizado aceita os novos tons do Lote 4 com segurança e limite de vozes.
{
  const played = [];
  globalThis.AudioContext = class {
    constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; }
    createOscillator() { return { type: '', frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start(t) { played.push(t); }, stop() {}, disconnect() {} }; }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }; }
  };
  if (!citadelAudioEnabled()) toggleCitadelAudio();
  for (const tone of ['step_reactor', 'elite_shot', 'rare_drop', 'core_open']) playCitadelSound(tone);
  assert.equal(played.length, 4, 'todos os 4 novos tons de áudio sintetizados são executáveis');
  if (citadelAudioEnabled()) toggleCitadelAudio();
}

// 5. Códex exibe os ícones de Sucata e Núcleo sem mutar progress.
{
  const el = () => ({ dataset: {}, style: {}, classList: { add() {}, remove() {}, toggle() {} }, textContent: '', innerHTML: '', children: [],
    addEventListener() {}, appendChild(n) { this.children.push(n); }, setAttribute() {}, focus() {}, remove() {}, querySelectorAll: () => [] });
  const elements = new Map();
  const overlay = Object.assign(el(), {
    querySelector(sel) { if (!elements.has(sel)) elements.set(sel, el()); return elements.get(sel); },
  });
  globalThis.document = { activeElement: el(), getElementById: () => el(), createElement: () => overlay, body: { appendChild() {} } };
  const { openCodex, setTab, closeCodex } = await import('../js/ui/codex.js');
  const codexProgress = {
    archetype: 'mare_astral',
    inventory: ['selo_codigo_queimado'],
    flags: { cidadela_estavel: true },
    archetypeProgress: { mare_astral: { level: 3, xp: 0 } },
    citadelMaterials: { sucata_codigo: 2, nucleo_estatica: 1 },
  };
  const snap = JSON.stringify(codexProgress);
  openCodex(codexProgress, { id: 'cidadela_404' }, state.player);
  setTab('inventario');
  const html = elements.get('#codexPanel').innerHTML;
  assert(html.includes('drop-sucata-hud.png') && html.includes('drop-nucleo-hud.png'), 'Códex exibe ícones de materiais do Lote 4');
  assert.equal(JSON.stringify(codexProgress), snap, 'openCodex não muta o progresso');
  closeCodex();
}

clearCitadelRuntime();
console.log('Cidadela Lote 4: direcionais elite, investida, arena, registros, ícones HUD/Códex, áudio e travessia OK.');
