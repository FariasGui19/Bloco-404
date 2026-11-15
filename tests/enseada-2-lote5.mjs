// node --experimental-default-type=module tests/enseada-2-lote5.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { map as enseada } from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';
import { state } from '../js/game/state.js';
import { loadMap } from '../js/game/map-manager.js';
import { canStandAt } from '../js/game/collision.js';
import { findNearestInteraction, checkInteractions } from '../js/game/interactions.js';
import { getPlayerMoveSpeed } from '../js/game/player.js';
import { updateHazards } from '../js/game/hazards.js';
import { tryBasicAttack } from '../js/game/combat.js';
import { criarClima, sintonizarClima } from '../js/game/clima.js';
import { initDialogue, isDialogueOpen, closeDialogue } from '../js/ui/dialogue.js';
import { getItem } from '../js/data/items.js';

const element = () => {
  let html = '';
  return {
    dataset: {},
    classList: { add() {}, remove() {} },
    addEventListener() {},
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

// 1. Todos os 10 sprites do Lote #5 existem no disco e estão registrados em js/main.js
const spritesLote5 = [
  'portal-caminho-correntes.png',
  'portico-trilha-praia.png',
  'barco-expedicao-enseada.png',
  'santuario-lumeo-pedra.png',
  'acampamento-vigilia-fogueira.png',
  'torre-antena-escuta.png',
  'farolete-baia-enseada.png',
  'bancada-campo-arquetipos.png',
  'baliza-mare-boia.png',
  'totem-eco-instavel.png',
];
const mainSrc = fs.readFileSync('js/main.js', 'utf8');
for (const file of spritesLote5) {
  const path = `assets/sprites/enseada-2/${file}`;
  assert(fs.existsSync(path), `Sprite ausente: ${path}`);
  assert(mainSrc.includes(path), `Sprite não registrado em js/main.js: ${path}`);
}

// 2. Carregar Enseada e confirmar missão expedicao_da_baia_enseada + acessibilidade
state.save.loaded = false;
state.save.activeSlot = 1;
state.progress = {
  archetype: 'motor_bio_forja',
  abilities: ['propulsor_impulso'],
  flags: {},
  inventory: [],
  questLog: {},
  archetypeProgress: {},
};
state.clima = criarClima(1);
assert(await loadMap(enseada.id, 'vindo_da_praia'));
assert(state.progress.questLog.expedicao_da_baia_enseada, 'Missão expedicao_da_baia_enseada inicia na Enseada');

const walkVisited = new Set();
const q = [[6, 15]];
while (q.length) {
  const [x, y] = q.shift();
  const key = `${x},${y}`;
  if (walkVisited.has(key) || !canStandAt(enseada, x + 0.5, y + 0.5, 0.2, state.player)) continue;
  walkVisited.add(key);
  q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
}

for (const id of [
  'bancada_campo_enseada',
  'torre_antena_enseada',
  'barco_expedicao_enseada',
  'farolete_baia_enseada',
  'acampamento_vigilia_enseada',
  'santuario_lumeo_enseada',
  'totem_eco_enseada',
]) {
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

async function interactAt(x, y, expectedId) {
  if (isDialogueOpen()) closeDialogue();
  Object.assign(state.player, { x, y });
  const nearest = findNearestInteraction();
  assert.equal(nearest?.kind, 'object', `Esperado object perto de (${x},${y}), veio ${nearest?.kind}:${nearest?.data?.id}`);
  assert.equal(nearest?.data?.id, expectedId, `Esperado ${expectedId}, veio ${nearest?.data?.id}`);
  await checkInteractions(true);
}

// 3. Bancada de Campo: buff motor_bio_forja + redução de dano em hazards
const bancada = state.objects.find(o => o.id === 'bancada_campo_enseada');
await interactAt(bancada.x, bancada.y, 'bancada_campo_enseada');
assert.equal(state.player.enseadaBuff, 'escudo_bio');
closeDialogue();

const hazard = state.hazards[0];
state.player.health = 100;
state.player.invulnerableTimer = 0;
Object.assign(state.player, { x: hazard.x, y: hazard.y });
const hitBio = updateHazards(state.hazards, state.player, state.progress, 0.05);
assert(hitBio && hitBio.dealt <= Math.round(hazard.damage * 0.5), 'Escudo Bio-Forja reduz dano de eco instável');

// 4. Bancada com Domínio Ancião: Fio Ancestral aumenta dano básico + combate em Ressaca concede XP bônus
state.progress.archetype = 'lamina_dominio_anciao';
await interactAt(bancada.x, bancada.y, 'bancada_campo_enseada');
assert.equal(state.player.enseadaBuff, 'fio_ancestral');
closeDialogue();

sintonizarClima(state.clima, 'ressaca');
const target = state.trainingTargets[0];
state.player.combat = null;
state.player.ability = {};
Object.assign(state.player, { x: target.x - 0.8, y: target.y });
target.health = 10;
assert(tryBasicAttack({ player: state.player, progress: state.progress, map: enseada, targets: state.trainingTargets, point: target, rng: () => 0.5 }));
assert.equal(target.health, 0);
assert.equal(state.progress.flags.enseada_eco_tempestade_disperso, true, 'Vitória em ressaca concede bônus de tempestade');

// 5. Bancada com Maré Astral: Pulso Salino acelera na orla
state.progress.archetype = 'mare_astral';
await interactAt(bancada.x, bancada.y, 'bancada_campo_enseada');
assert.equal(state.player.enseadaBuff, 'pulso_salino');
closeDialogue();
Object.assign(state.player, { x: 3.5, y: 15.5 }); // tile 'M' at the widened west shoreline
const speedComBuff = getPlayerMoveSpeed(state.progress, state.player);
state.player.enseadaBuff = null;
const speedSemBuff = getPlayerMoveSpeed(state.progress, state.player);
assert(speedComBuff > speedSemBuff, 'Pulso Salino aumenta agilidade na orla');

// 6. Torre-Antena, Barco de Expedição e Acampamento concluem a missão EXPEDIÇÃO DA BAÍA
const torre = state.objects.find(o => o.id === 'torre_antena_enseada');
await interactAt(torre.x, torre.y, 'torre_antena_enseada');
closeDialogue();

// A aproximação acompanha a posição atual do barco no novo mapa ampliado.
const barco = state.objects.find(o => o.id === 'barco_expedicao_enseada');
await interactAt(barco.x, barco.y, 'barco_expedicao_enseada');
assert.equal(elements.dialogueChoices.children.length, 2);
closeDialogue();

const camp = state.objects.find(o => o.id === 'acampamento_vigilia_enseada');
state.player.health = 50;
state.player.maxHealth = 100;
await interactAt(camp.x, camp.y, 'acampamento_vigilia_enseada');
assert(state.player.health > 50, 'Acampamento recupera vida junto à fogueira');
closeDialogue();

assert.equal(state.progress.flags.expedicao_enseada_concluida, true);
assert(state.progress.inventory.includes('bussola_mar_ecos'));
assert.equal(getItem('bussola_mar_ecos').name, 'BÚSSOLA DE MARÉ DA ENSEADA');

// 7. Sair da Enseada limpa enseadaBuff
await loadMap('hub_saguao');
assert.equal(state.player.enseadaBuff, null);

console.log('Enseada 2.0 Lote #5: 10 sprites, portais próprios, barco, buffs por arquétipo, combate climático e missão Expedição da Baía OK.');
