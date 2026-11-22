// node --experimental-default-type=module tests/cidadela-sintese-combate.mjs
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { map, CITADEL_CRAFT_BENCH, CITADEL_PATROL_CONSOLE, CITADEL_DORMANT_GUARDIAN } from '../js/data/worlds/cidadela-404/cidadela.js';
import { state } from '../js/game/state.js';
import { loadMap } from '../js/game/map-manager.js';
import { saveGame, loadSaveIntoState } from '../js/game/save.js';
import { ITEMS } from '../js/data/items.js';
import { QUESTS } from '../js/data/quests.js';
import { getQuestState } from '../js/game/quests.js';
import { toggleCitadelAudio, playCitadelSound } from '../js/game/cidadela-audio.js';
import { CITADEL_RECIPES, grantCitadelMaterial, craftCitadelRecipe } from '../js/game/cidadela-sintese.js';
import {
  bossVisualFrame, updateCitadel, renderCitadel, getCitadelRuntime, clearCitadelRuntime, nearestInteraction
} from '../js/game/cidadela-fps.js';

const newSprites = [
  'rota-terminal-azul.png',
  'rota-icone-vermelha.png',
  'vigilante-queda.png',
  'vigilante-colapso.png',
  'vigilante-escudo-impacto.png',
  'suprimento-energia.png',
  'drop-sucata-codigo.png',
  'drop-nucleo-estatica.png',
  'bancada-sintese.png',
  'sonda-nexo-pulso.png',
];
for (const file of newSprites) {
  assert(existsSync(`assets/source-art/cidadela-404/${file}`), `source-art missing: ${file}`);
  assert(existsSync(`assets/sprites/cidadela-404/${file}`), `sprite missing: ${file}`);
  assert.equal(readFileSync(`assets/sprites/cidadela-404/${file}`)[25], 6, `not RGBA PNG: ${file}`);
}

assert(ITEMS.selo_codigo_queimado && ITEMS.nucleo_vigilante_forjado);
assert(QUESTS.cidadela_forja_sobrevivencia);

// Frames do Vigilante: fechado, escudo atingido, colapso e movimento reduzido.
assert.equal(bossVisualFrame({ cycle: 0, hp: 280, shieldFlash: 0 }), 'bossClosed');
assert.equal(bossVisualFrame({ cycle: 0, hp: 280, shieldFlash: 0.2 }), 'boss_shield');
assert.equal(bossVisualFrame({ cycle: 0, hp: 0, dead: true, death: 1.0 }, 0, false), 'boss_fall');
assert.equal(bossVisualFrame({ cycle: 0, hp: 0, dead: true, death: 0.4 }, 0, false), 'boss_death');
assert.equal(bossVisualFrame({ cycle: 0, hp: 0, dead: true, death: 1.0 }, 0, true), 'boss_death');

// Novos sons não lançam exceção sem AudioContext.
toggleCitadelAudio();
for (const s of ['key', 'craft', 'shield_deflect', 'phase2']) playCitadelSound(s);

const store = new Map();
globalThis.localStorage = { setItem: (k, v) => store.set(k, v), getItem: k => store.get(k) ?? null, removeItem: k => store.delete(k) };
const drawCalls = [];
const noop = () => {};
const ctx = new Proxy({}, {
  get(_t, k) {
    if (k === 'fillText') return (...a) => drawCalls.push(a[0]);
    if (k === 'measureText') return t => ({ width: String(t).length * 5 });
    return noop;
  },
  set() { return true; },
});
globalThis.document = { createElement: () => ({ width: 128, height: 128, getContext: () => ctx }) };
globalThis.window = { matchMedia: () => ({ matches: false }) };

state.progress = {
  archetype: 'motor_bio_forja',
  flags: { metroCalibrado: true, frequencia666Registrada: true, freq666_limiar_estavel: true, freq666_limiar_preparado: true },
  inventory: ['item_externo'],
};
state.player.health = null;
state.player.maxHealth = null;
state.player.energy = 50;
state.player.ultimate = { cooldown: 0 };
state.save.loaded = true;
state.save.activeSlot = 2;
state.save.profileName = 'Sintese';
await loadMap('cidadela_404', 'inicio');
clearCitadelRuntime();

const input = { keys: {}, pressed: new Set(), mouseDeltaX: 0 };
const step = (n = 1) => { for (let i = 0; i < n; i++) { updateCitadel(.033, state, input); input.pressed.clear(); } };

step();
const g = getCitadelRuntime();
assert.equal(g.enemies.length, 8);
assert.equal(g.energyCells.length, 4);

// Antes do reator estável, console de ronda e carcaça não ficam disponíveis.
Object.assign(state.player, { x: CITADEL_PATROL_CONSOLE.x, y: CITADEL_PATROL_CONSOLE.y });
assert.equal(nearestInteraction(map, state.progress.flags, state.player)?.kind, undefined);
Object.assign(state.player, { x: CITADEL_DORMANT_GUARDIAN.x, y: CITADEL_DORMANT_GUARDIAN.y });
assert.equal(nearestInteraction(map, state.progress.flags, state.player)?.kind, undefined);

// Célula de energia restaura energia e munição ao caminhar por cima.
g.ammo = 4;
state.player.energy = 40;
Object.assign(state.player, { x: g.energyCells[0].x, y: g.energyCells[0].y });
step();
assert(g.energyCells[0].used);
assert.equal(g.ammo, 10);
assert(state.player.energy >= 65);

// Abate de inimigo gera material coletável sem alterar inventário principal.
g.enemies = [{ type: 'imp', x: 6.0, y: 6.5, hp: 10, maxHp: 55, cooldown: 99, slow: 0 }];
Object.assign(state.player, { x: 4.5, y: 6.5, invulnerable: 999 });
g.angle = 0;
g.fire = 0;
input.keys.space = true;
step();
input.keys.space = false;
assert.equal(g.drops.length, 1);
assert.equal(g.drops[0].kind, 'sucata_codigo');
Object.assign(state.player, { x: g.drops[0].x, y: g.drops[0].y });
step();
assert.equal(g.drops.length, 0);
assert.equal(state.progress.citadelMaterials.sucata_codigo, 1);
assert.equal(getQuestState(state.progress, 'cidadela_forja_sobrevivencia').status, 'active');
assert.deepEqual(state.progress.inventory, ['item_externo'], 'coleta não polui inventário principal');

// Treino opcional não gera drops nem altera inventário.
g.training = true;
g.enemies = [{ type: 'imp', x: 6.0, y: 6.5, hp: 10, maxHp: 55, cooldown: 99, slow: 0, noLoot: true }];
Object.assign(state.player, { x: 4.5, y: 6.5 });
g.fire = 0;
input.keys.space = true;
step();
input.keys.space = false;
assert.equal(g.drops.length, 0);
g.training = false;

// Bancada de Síntese: abre com E, sintetiza com 1..4 e conclui missão de forja.
state.progress.flags.cidadela_chave_azul = true;
state.progress.flags.cidadela_chave_amarela = true;
grantCitadelMaterial(state.progress, 'sucata_codigo', 4);
grantCitadelMaterial(state.progress, 'nucleo_estatica', 2);
Object.assign(state.player, { x: CITADEL_CRAFT_BENCH.x, y: CITADEL_CRAFT_BENCH.y });
assert.equal(nearestInteraction(map, state.progress.flags, state.player)?.kind, 'crafting_bench');
input.pressed.add('e');
step();
assert.equal(g.panel, 'craft');

drawCalls.length = 0;
renderCitadel({ width: 960, height: 540, getContext: () => ctx }, state);
assert(drawCalls.some(t => String(t).includes('BANCADA DE SÍNTESE')));

// Tecla 4 forja o Selo do Código Queimado, entrega XP e aumenta o dano de tiro.
input.pressed.add('4');
step();
assert(state.progress.inventory.includes('selo_codigo_queimado'));
assert(state.progress.flags.cidadela_forja_concluida);
assert.equal(getQuestState(state.progress, 'cidadela_forja_sobrevivencia').status, 'completed');

// Receita 5 bloqueada antes do reator estável.
const lockedRes = craftCitadelRecipe(state.progress, g, state.player, 'nucleo_vigilante_forjado');
assert.equal(lockedRes.ok, false);

// Fecha bancada com E e verifica bônus +25% de dano (28 -> 35).
input.pressed.add('e');
step();
assert.equal(g.panel, null);
g.enemies = [{ type: 'orb', x: 18.0, y: 9.5, hp: 75, maxHp: 75, cooldown: 99, slow: 0 }];
Object.assign(state.player, { x: 16.5, y: 9.5 });
g.angle = 0;
g.fire = 0;
input.keys.space = true;
step();
input.keys.space = false;
assert.equal(g.enemies[0].hp, 40, 'Selo aplica +25% no dano base (28 -> 35)');

// Vigilante: escudo fechado reflete tiro; Fase 2 dispara leque; colapso dropa materiais e abre pós-jogo.
state.progress.flags.cidadela_chave_vermelha = true;
g.enemies = [];
Object.assign(state.player, { x: 25.5, y: 6.5, invulnerable: 999 });
g.angle = 0;
g.boss.cycle = 0.5;
g.fire = 0;
input.keys.space = true;
step();
input.keys.space = false;
assert(g.boss.shieldFlash > 0);
assert.equal(g.boss.hp, 280);

// Fase 2 aos 140 HP ou menos e disparo em leque (3 projéteis).
g.boss.hp = 130;
g.boss.cycle = 2.5;
g.boss.cooldown = 0;
g.shots = [];
step();
assert.equal(g.boss.phaseTwo, true);
assert.equal(g.shots.length, 3, 'Fase 2 dispara rajada tripla em leque');

// Derrota do Vigilante ativa morte animada e libera ronda setorial + relíquia 5.
g.boss.hp = 10;
g.boss.cycle = 5.0;
g.fire = 0;
input.keys.space = true;
step();
input.keys.space = false;
assert.equal(g.boss.dead, true);
assert(g.boss.death > 1.0);
assert(state.progress.flags.cidadela_estavel);
assert(g.drops.some(d => d.kind === 'nucleo_estatica'));

// Pós-vitória: console de ronda gera 7 inimigos e carcaça do Vigilante pode ser inspecionada.
Object.assign(state.player, { x: CITADEL_DORMANT_GUARDIAN.x, y: CITADEL_DORMANT_GUARDIAN.y });
assert.equal(nearestInteraction(map, state.progress.flags, state.player)?.kind, 'dormant_guardian');
input.pressed.add('e');
step();
assert(g.message.includes('VIGILANTE'));

Object.assign(state.player, { x: CITADEL_PATROL_CONSOLE.x, y: CITADEL_PATROL_CONSOLE.y });
assert.equal(nearestInteraction(map, state.progress.flags, state.player)?.kind, 'patrol_console');
input.pressed.add('e');
step();
assert.equal(g.patrol, true);
assert.equal(g.enemies.length, 7);

// Forja Núcleo do Vigilante Forjado pós-reator.
grantCitadelMaterial(state.progress, 'sucata_codigo', 2);
grantCitadelMaterial(state.progress, 'nucleo_estatica', 3);
const relic5 = craftCitadelRecipe(state.progress, g, state.player, 'nucleo_vigilante_forjado');
assert.equal(relic5.ok, true);
assert(state.progress.inventory.includes('nucleo_vigilante_forjado'));
step();
assert.equal(g.relicReactor, true);
const prevEnergy = state.player.energy;
g.q = 0;
input.pressed.add('q');
step();
assert(state.player.energy > prevEnergy - 18, 'Núcleo Forjado reduz custo de Q para 14 EN');

// Persistência de materiais e relíquias entre saves.
assert(saveGame());
state.progress = {};
assert(loadSaveIntoState(2));
assert(state.progress.citadelMaterials);
assert(state.progress.inventory.includes('selo_codigo_queimado'));
assert(state.progress.inventory.includes('nucleo_vigilante_forjado'));

assert.equal(CITADEL_RECIPES.length, 5);
console.log('Cidadela: síntese, drops, células de energia, fase 2, escudo, colapso e ronda setorial OK.');
