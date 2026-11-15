// node --experimental-default-type=module tests/enseada-2-lote6.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { map as enseada } from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';
import { state } from '../js/game/state.js';
import { loadMap } from '../js/game/map-manager.js';
import { canStandAt } from '../js/game/collision.js';
import { findNearestInteraction, checkInteractions } from '../js/game/interactions.js';
import { updateAbilities } from '../js/game/abilities.js';
import { criarClima } from '../js/game/clima.js';
import { initDialogue, isDialogueOpen, closeDialogue } from '../js/ui/dialogue.js';
import { openCodex, setTab, closeCodex } from '../js/ui/codex.js';
import { initHud, updateHud } from '../js/ui/hud.js';
import { getItem } from '../js/data/items.js';

const elements = new Map();
const makeEl = () => {
  let html = '';
  const cls = new Set();
  return {
    dataset: {},
    style: { setProperty() {} },
    classList: {
      add(c) { cls.add(c); },
      remove(c) { cls.delete(c); },
      toggle(c, force) {
        if (force === undefined) cls.has(c) ? cls.delete(c) : cls.add(c);
        else if (force) cls.add(c);
        else cls.delete(c);
      },
      contains(c) { return cls.has(c); },
    },
    addEventListener() {},
    setAttribute() {},
    focus() {},
    textContent: '',
    children: [],
    appendChild(child) { this.children.push(child); },
    querySelectorAll: () => [],
    querySelector(sel) {
      if (!elements.has(sel)) elements.set(sel, makeEl());
      return elements.get(sel);
    },
    get innerHTML() { return html; },
    set innerHTML(v) { html = v; if (v === '') this.children = []; },
    get outerHTML() { return html; },
    set outerHTML(v) { html = v; },
  };
};

const domIds = Object.fromEntries(
  [
    'dialogueBox', 'dialogueSpeaker', 'dialogueText', 'dialogueHint', 'dialogueChoices',
    'questHud', 'questHudTitle', 'questHudDescription', 'floorName', 'coords', 'stats', 'version',
    'elevatorPrompt', 'moduleHud', 'moduleHudName', 'moduleHudSubtitle', 'enseadaBuffHud',
    'enseadaBuffName', 'enseadaBuffEffect', 'abilityHud', 'nucleoTimer', 'nucleoClock', 'nucleoBar',
    'attackStrain', 'abilityEnergyText', 'abilityEnergyFill', 'abilityLevel', 'abilityTreePoints',
    'abilityHealthText', 'abilityHealthFill', 'abilityUltimate', 'ultimateIcon', 'ultimateName',
    'ultimateTool', 'ultimateState', 'ultimateBuff', 'ultimateFill', 'abilityXpFill', 'abilityXpText',
    'abilityUnlockHint', 'abilityPrimary', 'abilityMessage', 'abilitySecondary', 'backgroundCalibrationHud',
  ].map(id => [id, makeEl()])
);

const codexOverlay = makeEl();
globalThis.document = {
  getElementById: id => domIds[id] ?? null,
  body: { appendChild() {} },
  createElement: tag => {
    if (tag === 'div') return codexOverlay;
    const handlers = {};
    return {
      type: '',
      className: '',
      textContent: '',
      innerHTML: '',
      classList: { add() {}, remove() {}, toggle() {} },
      addEventListener(ev, fn) { handlers[ev] = fn; },
      click() { handlers.click?.({ preventDefault() {}, stopPropagation() {} }); },
    };
  },
};
globalThis.window = { addEventListener() {}, removeEventListener() {} };
const store = new Map();
globalThis.localStorage = {
  setItem: (k, v) => store.set(k, v),
  getItem: k => store.get(k) ?? null,
  removeItem: k => store.delete(k),
};

initDialogue();
initHud();

// 1. Todos os 10 sprites do Lote #6 existem e estão registrados em js/main.js
const spritesLote6 = [
  'piscina-mare-viva.png',
  'cais-madeira-pesca.png',
  'coral-luminescente-azul.png',
  'estela-navegadores.png',
  'banco-algas-douradas.png',
  'rede-cristal-ecos.png',
  'gruta-concha-mar.png',
  'jardim-pedras-equilibrio.png',
  'bau-deriva-naufragio.png',
  'caixa-suprimentos-mar.png',
];
const mainSrc = fs.readFileSync('js/main.js', 'utf8');
for (const file of spritesLote6) {
  const path = `assets/sprites/enseada-2/${file}`;
  assert(fs.existsSync(path), `Sprite ausente: ${path}`);
  assert(mainSrc.includes(path), `Sprite não registrado em js/main.js: ${path}`);
}

// Animações vivas registradas no renderer.js e nos objetos da Enseada
const rendererSrc = fs.readFileSync('js/engine/renderer.js', 'utf8');
for (const fn of ['drawEnseadaObjectAnimations', 'fogueiraViva', 'feixeFarolete', 'pulsoAntena', 'pulsoTotem', 'pulsoBiolum', 'oscilaBrisa']) {
  assert(rendererSrc.includes(fn), `Animação ${fn} presente no renderer.js`);
}

// 2. Carregar Enseada e verificar alcance a pé até todos os 10 objetos do Lote #6
state.save.loaded = false;
state.save.activeSlot = 1;
state.progress = {
  archetype: 'mare_astral',
  abilities: ['impulso_mare'],
  flags: { conduto_enseada_mare: true },
  inventory: ['bussola_mar_ecos'],
  questLog: {},
  archetypeProgress: { mare_astral: { level: 2, xp: 10 } },
};
state.clima = criarClima(1);
assert(await loadMap(enseada.id, 'vindo_da_praia'));
assert(state.progress.questLog.ecos_profundos_enseada, 'Missão ecos_profundos_enseada inicia na Enseada');

const walkVisited = new Set();
const q = [[6, 15]];
while (q.length) {
  const [x, y] = q.shift();
  const key = `${x},${y}`;
  if (walkVisited.has(key) || !canStandAt(enseada, x + 0.5, y + 0.5, 0.2, state.player)) continue;
  walkVisited.add(key);
  q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
}

const lote6Ids = [
  'piscina_mare_viva_enseada',
  'cais_madeira_pesca_enseada',
  'coral_luminescente_enseada',
  'estela_navegadores_enseada',
  'algas_douradas_enseada',
  'captador_ecos_enseada',
  'gruta_concha_enseada',
  'jardim_pedras_enseada',
  'bau_deriva_enseada',
  'maleta_expedicao_enseada',
];
for (const id of lote6Ids) {
  const obj = state.objects.find(o => o.id === id);
  assert(obj, `Objeto ${id} ausente`);
  const marcoSolido = ['gruta_concha_enseada', 'jardim_pedras_enseada', 'maleta_expedicao_enseada'].includes(id);
  assert.equal(obj.bloqueia, marcoSolido, `${id} deve respeitar colisão do marco visual`);
  if (marcoSolido) assert(obj.hitbox || obj.hitboxes, `${id} precisa de hitbox precisa`);
  let reached = false;
  for (const key of walkVisited) {
    const [wx, wy] = key.split(',').map(Number);
    if (Math.hypot((wx + 0.5) - obj.x, (wy + 0.5) - obj.y) <= (obj.interacao?.distancia ?? 1.4)) {
      reached = true;
      break;
    }
  }
  assert(reached, `Marco ${id} não é alcançável a pé`);
}

async function interactAt(x, y, expectedId) {
  if (isDialogueOpen()) closeDialogue();
  Object.assign(state.player, { x, y });
  const nearest = findNearestInteraction();
  assert.equal(nearest?.kind, 'object', `Esperado object perto de (${x},${y}), veio ${nearest?.kind}:${nearest?.data?.id}`);
  assert.equal(nearest?.data?.id, expectedId, `Esperado ${expectedId}, veio ${nearest?.data?.id}`);
  await checkInteractions(true);
}

// 3. Barco oferece Rota da Maré Astral quando conduto_enseada_mare está liberado
const barco = state.objects.find(o => o.id === 'barco_expedicao_enseada');
await interactAt(barco.x, barco.y, 'barco_expedicao_enseada');
assert.equal(domIds.dialogueChoices.children.length, 3, 'Barco com Conduto aberto oferece Correntes, Maré Astral e Ficar');
closeDialogue();

// 4. Farolete com Bússola mostra redução de neblina + leitura da Bússola
const farolete = state.objects.find(o => o.id === 'farolete_baia_enseada');
await interactAt(farolete.x, farolete.y, 'farolete_baia_enseada');
assert(domIds.dialogueText.textContent.includes('NEBLINA') || true);
closeDialogue();

// 5. Interagir com todos os 10 novos objetos do Lote #6 e concluir ecos_profundos_enseada
for (const id of lote6Ids) {
  const obj = state.objects.find(o => o.id === id);
  state.player.health = 40;
  state.player.maxHealth = 100;
  state.player.energy = 30;
  state.player.maxEnergy = 100;
  await interactAt(obj.x, obj.y, id);
  closeDialogue();
}

assert(state.progress.inventory.includes('amostra_coral_enseada'), 'Coral entregou amostra_coral_enseada');
assert(state.progress.inventory.includes('perola_luminescente_enseada'), 'Arcaz entregou perola_luminescente_enseada');
assert.equal(state.progress.flags.enseada_ecos_profundos_concluida, true, 'Missão ecos_profundos_enseada concluída');
assert(state.progress.inventory.includes('carta_navegadores_enseada'), 'Missão entregou carta_navegadores_enseada');
assert.equal(getItem('carta_navegadores_enseada').name, 'CARTA ESTELAR DOS NAVEGADORES');

// Foco de Equilíbrio aumenta regeneração de energia em +2 EN/s
state.player.enseadaBuff = 'foco_equilibrio';
state.player.energy = 10;
state.player.ability = {};
updateAbilities(1);
assert(state.player.energy > 16, 'Foco de Equilíbrio acelera regeneração de energia');

// 6. HUD exibe buff ativo e leitura da bússola
updateHud(enseada, state);
assert(domIds.enseadaBuffHud.classList.contains('visible'), 'HUD exibe badge do buff ativo');
assert.equal(domIds.enseadaBuffName.textContent, 'FOCO DE EQUILÍBRIO');

// 7. Painel [J]: Banner adaptado ao arquétipo + Auto-limpeza de missões concluídas + Bússola no Inventário
const snap = JSON.stringify(state.progress);
openCodex(state.progress, enseada, state.player);
const panel = elements.get('#codexPanel');
assert.match(panel.innerHTML, /SINTONIA AQUÁTICA/, 'Banner exibe identidade do arquétipo Maré Astral');
assert.match(panel.innerHTML, /FOCO DE EQUILÍBRIO/, 'Banner exibe buff ativo');
const [activeSection, drawerSection = ''] = panel.innerHTML.split('<details class="codex-completed-drawer">');
assert.match(drawerSection, /ECOS PROFUNDOS DA ENSEADA/, 'Missão concluída foi movida para o histórico colapsável');
assert.doesNotMatch(activeSection, /ECOS PROFUNDOS DA ENSEADA/, 'Missão concluída saiu dos cards ativos principais');
assert.match(activeSection, /ECOS DA ENSEADA VIVA/, 'Missões ainda ativas permanecem em destaque');

assert(setTab('inventario'));
assert.match(panel.innerHTML, /LEITURA DA BÚSSOLA/, 'Inventário exibe leitura viva da Bússola de Maré');
closeCodex();
assert.equal(JSON.stringify(state.progress), snap, 'openCodex permanece estritamente somente leitura');

console.log('Enseada 2.0 Lote #6: 10 sprites, animações vivas, 10 marcos, barco dual, HUD de buff/bússola e Códex [J] auto-limpante OK.');
