// node --experimental-default-type=module tests/enseada-2-lote4.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { map as enseada } from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';
import { state } from '../js/game/state.js';
import { loadMap } from '../js/game/map-manager.js';
import { canStandAt } from '../js/game/collision.js';
import { findNearestInteraction, checkInteractions } from '../js/game/interactions.js';
import { getPlayerMoveSpeed } from '../js/game/player.js';
import { criarClima } from '../js/game/clima.js';
import { initDialogue, isDialogueOpen, closeDialogue } from '../js/ui/dialogue.js';
import { getItem } from '../js/data/items.js';

const listeners = new Map();
const element = () => {
  let html = '';
  return {
    dataset: {},
    classList: { add() {}, remove() {} },
    addEventListener(type, fn) { listeners.set(type, fn); },
    textContent: '',
    children: [],
    appendChild(child) { this.children.push(child); },
    get innerHTML() { return html; },
    set innerHTML(v) { html = v; if (v === '') this.children = []; },
  };
};
const elements = Object.fromEntries(
  ['dialogueBox', 'dialogueSpeaker', 'dialogueText', 'dialogueHint', 'dialogueChoices'].map(id => [id, element()])
);
elements.dialogueChoices.appendChild = child => { elements.dialogueChoices.children.push(child); };
globalThis.document = {
  getElementById: id => elements[id] ?? null,
  createElement: () => {
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

// 1. Todos os 10 sprites do Lote #4 existem no disco e estão registrados em js/main.js
const spritesLote4 = [
  'embarcadouro-mare-astral.png',
  'espelho-eco-arquetipo.png',
  'relogio-mare-solar.png',
  'ninho-tartarugas-praia.png',
  'poleiro-aves-costeiro.png',
  'banco-areia-conchas.png',
  'lanterna-marinha-flutuante.png',
  'fonte-termal-enseada.png',
  'banco-ostras-perola.png',
  'carrilhao-vento-bambu.png',
];
const mainSrc = fs.readFileSync('js/main.js', 'utf8');
for (const file of spritesLote4) {
  const path = `assets/sprites/enseada-2/${file}`;
  assert(fs.existsSync(path), `Sprite ausente: ${path}`);
  assert(mainSrc.includes(path), `Sprite não registrado em js/main.js: ${path}`);
}

// 2. Estrutura ampliada do mapa (>= 50x44), poça, detalhes do oceano e fundo do mar
assert(enseada.layout.length >= 44);
assert(enseada.layout[0].length >= 50);
assert(enseada.pocas?.length >= 1, 'Enseada deve ter poça costeira');
assert(enseada.detalhesOceano?.length >= 8, 'Enseada deve ter detalhes de oceano');
assert(enseada.fundoMar?.length >= 4, 'Enseada deve ter elementos de fundo do mar');
assert(enseada.fauna.length >= 8, 'Enseada deve ter fauna rica');

// 3. Acessibilidade a pé até todos os marcos interativos em terra
state.save.loaded = false;
state.save.activeSlot = 1;
state.progress = {
  archetype: 'motor_bio_forja',
  abilities: [],
  flags: {},
  inventory: [],
  questLog: {},
  archetypeProgress: {},
};
state.clima = criarClima(1);
assert(await loadMap(enseada.id, 'vindo_da_praia'));
assert(state.progress.questLog.ecos_da_enseada_viva, 'Missão ecos_da_enseada_viva inicia na Enseada');

const walkVisited = new Set();
const q = [[Math.floor(enseada.spawnPoints.inicio.x), Math.floor(enseada.spawnPoints.inicio.y)]];
while (q.length) {
  const [x, y] = q.shift();
  const key = `${x},${y}`;
  if (walkVisited.has(key) || !canStandAt(enseada, x + 0.5, y + 0.5, 0.2, state.player)) continue;
  walkVisited.add(key);
  q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
}

const reachables = [
  'espelho_arquetipos_enseada',
  'relogio_mare_enseada',
  'carrilhao_vento_enseada',
  'fonte_termal_enseada',
  'banco_conchas_enseada',
  'poleiro_aves_enseada',
  'ninho_tartarugas_enseada',
  'banco_ostras_enseada',
  'embarcadouro_mare_astral',
];
for (const id of reachables) {
  const obj = state.objects.find(o => o.id === id);
  assert(obj, `Objeto ${id} ausente`);
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

// 4. Testar cada interação real + missão ecos_da_enseada_viva + arquétipos
async function interactNear(x, y, expectedKind, expectedId) {
  if (isDialogueOpen()) closeDialogue();
  Object.assign(state.player, { x, y });
  const nearest = findNearestInteraction();
  assert.equal(nearest?.kind, expectedKind, `Esperado ${expectedKind} perto de (${x},${y}), veio ${nearest?.kind}:${nearest?.data?.id}`);
  assert.equal(nearest?.data?.id, expectedId, `Esperado ${expectedId}, veio ${nearest?.data?.id}`);
  await checkInteractions(true);
}

// 4a. Relógio de Maré Solar: troca o clima para 'ressaca' via choice 4 (índice 3)
const relogio = state.objects.find(o => o.id === 'relogio_mare_enseada');
await interactNear(relogio.x, relogio.y, 'object', 'relogio_mare_enseada');
assert.equal(elements.dialogueChoices.children.length, 4);
elements.dialogueChoices.children[3].click();
assert.equal(state.clima.atual, 'ressaca');
assert.equal(state.progress.flags.enseada_clima_sintonizado, true);
closeDialogue();

// 4b. Fonte Termal: restaura HP e Energia
const fonte = state.objects.find(o => o.id === 'fonte_termal_enseada');
state.player.health = 25;
state.player.maxHealth = 100;
state.player.energy = 10;
state.player.maxEnergy = 100;
await interactNear(fonte.x, fonte.y, 'object', 'fonte_termal_enseada');
assert.equal(state.player.health, 100);
assert.equal(state.player.energy, 100);
closeDialogue();

// 4c. Banco de Ostras Pérola: coleta perola_luminescente_enseada
const ostras = state.objects.find(o => o.id === 'banco_ostras_enseada');
await interactNear(ostras.x, ostras.y, 'object', 'banco_ostras_enseada');
assert(state.progress.inventory.includes('perola_luminescente_enseada'));
assert.equal(getItem('perola_luminescente_enseada').name, 'PÉROLA LUMINESCENTE DA ENSEADA');
closeDialogue();

// 4d. Espelho dos Arquétipos: troca para mare_astral (choice 4) e verifica velocidade na orla molhada
const espelho = state.objects.find(o => o.id === 'espelho_arquetipos_enseada');
await interactNear(espelho.x, espelho.y, 'object', 'espelho_arquetipos_enseada');
assert.equal(elements.dialogueChoices.children.length, 4);
const mareIdx = elements.dialogueChoices.children.findIndex(c => (c.innerHTML || c.textContent || '').includes('MARÉ ASTRAL'));
assert(mareIdx >= 0);
elements.dialogueChoices.children[mareIdx].click();
assert.equal(state.progress.archetype, 'mare_astral');
assert.equal(state.progress.flags.enseada_espelho_sintonizado, true);
closeDialogue();

// Missão ecos_da_enseada_viva concluída com recompensa concha_eco_enseada
assert.equal(state.progress.flags.enseada_viva_concluida, true);
assert(state.progress.inventory.includes('concha_eco_enseada'));

// Velocidade diferenciada na Enseada (Maré Astral na areia molhada x Núcleo 10X na areia seca)
Object.assign(state.player, { x: 16.5, y: 54.5 }); // tile 'M' na orla oeste da nova silhueta
const speedMareOrla = getPlayerMoveSpeed(state.progress, state.player);
state.progress.archetype = 'lamina_dominio_anciao';
const speedDominioOrla = getPlayerMoveSpeed(state.progress, state.player);
assert(speedMareOrla > speedDominioOrla, 'Maré Astral deve ter agilidade extra na orla molhada');

// 4e. Fauna interativa: Caranguejo da orla e Capivara da Fonte Termal
const crab = state.fauna.find(f => f.id === 'enseada_caranguejo_1');
await interactNear(crab.x, crab.y, 'fauna', 'enseada_caranguejo_1');
closeDialogue();
const capy = state.fauna.find(f => f.id === 'enseada_capivara');
await interactNear(capy.x, capy.y, 'fauna', 'enseada_capivara');
closeDialogue();

console.log('Enseada 2.0 Lote #4: 10 sprites, 36x34, clima, fonte termal, ostras, espelho de arquétipos, fauna interativa e missão concluída OK.');
