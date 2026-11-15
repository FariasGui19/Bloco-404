// Testa o Lote 11 (Polimento FPS da Maré Astral & Ultimates Multi-Quadro + Epílogo Estação 66.6):
// - 10 artes novas (ultimate-mare-b/c, ultimate-nucleo/dominio/bio-b, melee-mare-b,
//   canhao-mare-pulso, hud-arma-mare-ativa, estacao-666-selo-convergencia, cidadela-mare-desfecho.jpg)
// - Animação multi-quadro de Ultimates & Golpe Cinético, lunge da arma, canhão/HUD ativos,
//   camera shake, empurrão/limpeza de projéteis na Ultimate da Maré Astral
// - Selo de Convergência e epílogo na Estação 66.6
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { map } from '../js/data/worlds/cidadela-404/cidadela.js';
import { map as station666 } from '../js/data/worlds/arquipelago-rotas-perdidas/estacao-666.js';
import { CITADEL_MARE_EPILOGUE_SCENES } from '../js/ui/cutscene.js';
import { initDialogue } from '../js/ui/dialogue.js';
import { state } from '../js/game/state.js';
import { loadMap } from '../js/game/map-manager.js';
import { findNearestInteraction, checkInteractions } from '../js/game/interactions.js';
import {
  updateCitadel,
  renderCitadel,
  getCitadelRuntime,
  clearCitadelRuntime,
  ultimateVisualFrame,
  meleeVisualFrame,
} from '../js/game/cidadela-fps.js';

const RGBA_SPRITES = [
  'ultimate-mare-b.png',
  'ultimate-mare-c.png',
  'ultimate-nucleo-b.png',
  'ultimate-dominio-b.png',
  'ultimate-bio-b.png',
  'melee-mare-b.png',
  'canhao-mare-pulso.png',
  'hud-arma-mare-ativa.png',
  'estacao-666-selo-convergencia.png',
];

for (const file of RGBA_SPRITES) {
  assert(existsSync(`assets/source-art/cidadela-404/${file}`), `source-art ausente: ${file}`);
  assert(existsSync(`assets/sprites/cidadela-404/${file}`), `sprite ausente: ${file}`);
  assert.equal(readFileSync(`assets/sprites/cidadela-404/${file}`)[25], 6, `esperado PNG RGBA: ${file}`);
}
assert(existsSync('assets/source-art/cidadela-404/cidadela-mare-desfecho.jpg'));
assert(existsSync('assets/cutscenes/cidadela-mare-desfecho.jpg'));
assert.equal(CITADEL_MARE_EPILOGUE_SCENES.length, 1);
assert.equal(CITADEL_MARE_EPILOGUE_SCENES[0].image, 'assets/cutscenes/cidadela-mare-desfecho.jpg');

// 1. Quadros multi-frame de Ultimates & Golpe Cinético
assert.equal(ultimateVisualFrame('mare', 0.9, false), 'ultimate_mare');
assert.equal(ultimateVisualFrame('mare', 0.5, false), 'ultimate_mare_b');
assert.equal(ultimateVisualFrame('mare', 0.15, false), 'ultimate_mare_c');
assert.equal(ultimateVisualFrame('mare', 0.5, true), 'ultimate_mare');

for (const mode of ['nucleo', 'dominio', 'bio']) {
  assert.equal(ultimateVisualFrame(mode, 0.9, false), `ultimate_${mode}`);
  assert.equal(ultimateVisualFrame(mode, 0.5, false), `ultimate_${mode}_b`);
  assert.equal(ultimateVisualFrame(mode, 0.1, false), `ultimate_${mode}`);
  assert.equal(ultimateVisualFrame(mode, 0.5, true), `ultimate_${mode}`);
}

assert.equal(meleeVisualFrame('mare', 0.30, false), 'melee_mare');
assert.equal(meleeVisualFrame('mare', 0.08, false), 'melee_mare_b');
assert.equal(meleeVisualFrame('mare', 0.08, true), 'melee_mare');

// 2. Renderizador + combate FPS da Maré Astral
const input = { keys: {}, pressed: new Set(), mouseDeltaX: 0, fpsFireHeld: false };
const step = (n = 1) => { for (let i = 0; i < n; i++) { updateCitadel(.033, state, input); input.pressed.clear(); } };

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
  Object.assign(state.player, { health: 100, maxHealth: 100, energy: 90, maxEnergy: 100, invulnerable: 0, ultimate: { cooldown: 0 } });
  input.keys = {}; input.pressed.clear(); input.fpsFireHeld = false;
  clearCitadelRuntime();
  step();
  return getCitadelRuntime();
}

{
  const drawn = [];
  let translated = 0;
  let rotated = 0;
  const noop = () => {};
  const grad = { addColorStop: noop };
  const ctx = {
    imageSmoothingEnabled: false,
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: 'left', globalAlpha: 1,
    fillRect: noop, clearRect: noop, strokeRect: noop, beginPath: noop, moveTo: noop, lineTo: noop, arc: noop, closePath: noop, stroke: noop, fill: noop,
    save: noop, restore: noop, setTransform: noop, scale: noop,
    translate: () => { translated++; },
    rotate: () => { rotated++; },
    createRadialGradient: () => grad,
    measureText: (t) => ({ width: String(t).length * 5 }),
    fillText: noop,
    drawImage: (img) => { if (img?.src) drawn.push(img.src); },
  };
  globalThis.document = { createElement: () => ({ width: 480, height: 270, getContext: () => ctx }) };
  globalThis.window = { matchMedia: () => ({ matches: false }) };
  globalThis.Image = class { constructor() { this.width = 128; this.height = 128; } set src(v) { this._src = v; this.onload?.(); } get src() { return this._src; } };

  const g = boot({}, 'mare_astral', []);
  g.panel = null; state.world.fpsPaused = false;
  // Inimigo e projétil dentro do raio da Ultimate da Maré
  g.enemies = [{ type: 'imp', x: 4.5, y: 6.5, hp: 80, maxHp: 80, cooldown: 2, slow: 0 }];
  g.shots = [{ x: 3.8, y: 6.5, dx: -1, dy: 0, damage: 10, life: 3 }];
  const startEnemyX = g.enemies[0].x;
  input.pressed.add('f');
  step();

  assert(g.shake > 0, 'Ultimate ativa tremor de câmera');
  assert(g.ultFlash > 0, 'Ultimate ativa flash sutil');
  assert(g.enemies[0].slow >= 2.5, 'Ultimate da Maré aplica lentidão');
  assert(g.enemies[0].x > startEnemyX, 'Ultimate da Maré empurra inimigos para longe');
  assert.equal(g.shots.length, 0, 'Ultimate da Maré dissipa projéteis hostis na área');

  // Render nos 3 momentos da Ultimate da Maré
  drawn.length = 0; translated = 0;
  for (const fxVal of [0.9, 0.5, 0.15]) {
    g.fx = fxVal; g.fxKind = 'ultimate';
    renderCitadel({ width: 960, height: 540, getContext: () => ctx }, state);
  }
  assert(translated > 0, 'Camera shake translada worldCtx');
  assert(drawn.some(s => s.endsWith('ultimate-mare.png')), 'Ultimate quadro 1');
  assert(drawn.some(s => s.endsWith('ultimate-mare-b.png')), 'Ultimate quadro 2');
  assert(drawn.some(s => s.endsWith('ultimate-mare-c.png')), 'Ultimate quadro 3');
  assert(drawn.some(s => s.endsWith('canhao-mare-pulso.png')), 'Canhão da Maré ativo no pulso');
  assert(drawn.some(s => s.endsWith('hud-arma-mare-ativa.png')), 'Ícone HUD da Maré ativo');

  // Golpe cinético [V] com lunge + animação 2 quadros
  drawn.length = 0; rotated = 0;
  g.melee = 1.05; g.fx = 0.08; g.fxKind = 'melee';
  renderCitadel({ width: 960, height: 540, getContext: () => ctx }, state);
  assert(rotated > 0, 'Lunge do golpe cinético rotaciona o canhão');
  assert(drawn.some(s => s.endsWith('melee-mare-b.png')), 'Segundo quadro do corte da Maré');
}

// 3. Estação 66.6: Selo de Convergência oculto antes da vitória e ativo depois
{
  const mainSrc = readFileSync('js/main.js', 'utf8');
  assert(mainSrc.includes("'freq666_selo_convergencia'") && mainSrc.includes('estacao-666-selo-convergencia.png'), 'main.js registra sprite do selo');
  const seloDef = station666.objects.find(o => o.id === 'selo_convergencia_666');
  assert(seloDef && seloDef.showWhenFlag === 'cidadela_estavel', 'Selo definido na Estação 66.6');

  const el = () => ({ dataset: {}, style: {}, classList: { add() {}, remove() {} }, textContent: '', innerHTML: '', children: [],
    addEventListener() {}, appendChild(n) { this.children.push(n); }, setAttribute() {}, focus() {}, remove() {} });
  const elements = Object.fromEntries(['dialogueBox', 'dialogueSpeaker', 'dialogueText', 'dialogueHint', 'dialogueChoices'].map(id => [id, el()]));
  globalThis.document = { activeElement: el(), getElementById: id => elements[id], createElement: () => el() };
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  initDialogue();

  state.progress = {
    archetype: 'mare_astral',
    inventory: ['selo_codigo_queimado', 'nucleo_vigilante_forjado', 'insignia_vigilia_404'],
    flags: { freq666_limiar_estavel: true },
    citadelMaterials: { sucata_codigo: 0, nucleo_estatica: 0 },
  };
  await loadMap('estacao_limiar_666', 'vindo_da_cidadela');
  Object.assign(state.player, { x: seloDef.x, y: seloDef.y, health: 40, maxHealth: 100, energy: 20, maxEnergy: 100 });
  assert.notEqual(findNearestInteraction()?.data?.id, 'selo_convergencia_666', 'Selo oculto antes de estabilizar a Cidadela');

  state.progress.flags.cidadela_estavel = true;
  state.progress.flags.cidadela_protocolo_concluido = true;
  state.progress.flags.cidadela_100_porcento = true;
  assert.equal(findNearestInteraction()?.data?.id, 'selo_convergencia_666', 'Selo interativo após estabilizar a Cidadela');
  await checkInteractions(true);
  assert.equal(state.player.health, 100, 'Selo restaura vida ao máximo');
  assert.equal(state.player.energy, 100, 'Selo restaura energia ao máximo');
  assert(elements.dialogueText.textContent.includes('CONVERGÊNCIA 100% SELADA'), 'Selo exibe fechamento 100%');
}

clearCitadelRuntime();
console.log('Cidadela Lote 11: Ultimates multi-quadro, Maré Astral animada/física, camera shake e Epílogo Estação 66.6 OK.');
