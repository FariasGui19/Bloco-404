// Testa as novidades do Lote 2 da Cidadela 404: barris explosivos, escudo
// de campo, golpe cinético [V], sentinela de elite, fase 2 visual, setor no HUD,
// pulso do reator estabilizado, cutscene de entrada e telemetria na Estação 66.6.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { map, CITADEL_BARRELS, CITADEL_SHIELD_CELLS, CITADEL_DECOR, sectorNameAt } from '../js/data/worlds/cidadela-404/cidadela.js';
import { THRESHOLD_SCENES } from '../js/ui/cutscene.js';
import { state } from '../js/game/state.js';
import { loadMap } from '../js/game/map-manager.js';
import { checkInteractions } from '../js/game/interactions.js';
import { initDialogue, advanceDialogue, closeDialogue } from '../js/ui/dialogue.js';
import { updateCitadel, getCitadelRuntime, clearCitadelRuntime, bossVisualFrame, citadelSpriteFrame } from '../js/game/cidadela-fps.js';

const EXPECTED_ASSETS = [
  'assets/sprites/cidadela-404/barril-estatica.png',
  'assets/sprites/cidadela-404/barril-explosao.png',
  'assets/sprites/cidadela-404/escudo-campo.png',
  'assets/sprites/cidadela-404/vigilante-sobretensao.png',
  'assets/sprites/cidadela-404/terminal-ronda.png',
  'assets/sprites/cidadela-404/vigilia-sentinela-ativo.png',
  'assets/sprites/cidadela-404/prop-reator-estavel.png',
  'assets/sprites/cidadela-404/imp-elite.png',
  'assets/sprites/cidadela-404/imp-elite-ataque.png',
  'assets/cutscenes/cidadela-entrada-corredor.jpg',
];
for (const file of EXPECTED_ASSETS) assert(existsSync(file), `asset ausente: ${file}`);

// Cutscene de travessia deve ter 3 imagens distintas.
const thresholdImgs = THRESHOLD_SCENES.map(s => s.image);
assert.equal(new Set(thresholdImgs).size, 3, 'THRESHOLD_SCENES possui 3 artes distintas');

// Barris, escudos e nomes de setor.
assert.equal(CITADEL_BARRELS.length, 5);
assert.equal(CITADEL_SHIELD_CELLS.length, 3);
assert.equal(sectorNameAt(3, 6.5), 'SETOR 01 // ENTRADA');
assert.equal(sectorNameAt(11, 6.5), 'SETOR 02 // GALERIA');
assert.equal(sectorNameAt(18, 6.5), 'SETOR 03 // FORJA');
assert.equal(sectorNameAt(25, 6.5), 'ARENA DO REATOR');
assert.equal(sectorNameAt(10, 15), 'OFICINA DA VIGÍLIA');

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
  state.world.fpsPauseRequested = false;
  Object.assign(state.player, { health: 100, maxHealth: 100, energy: 100, maxEnergy: 100, invulnerable: 0, ultimate: { cooldown: 0 } });
  input.keys = {}; input.pressed.clear(); input.fpsFireHeld = false;
  clearCitadelRuntime();
  step();
  return getCitadelRuntime();
}

// 1. Sentinela de elite presente no Setor 3 com 95 HP e ataque duplo + drop + energia.
{
  const g = boot();
  const elite = g.enemies.find(e => e.type === 'elite');
  assert(elite, 'sentinela de elite presente nos inimigos iniciais');
  assert.equal(elite.hp, 95);
  assert.equal(citadelSpriteFrame({ type: 'elite', hp: 95, windup: .2 }, 0), 'elite_attack');
  Object.assign(state.player, { x: 17.5, y: 5.5, energy: 60 });
  g.angle = 0;
  Object.assign(elite, { x: 18.8, y: 5.5, windup: .01, cooldown: 0 });
  step();
  assert.equal(g.shots.length, 2, 'sentinela de elite dispara rajada dupla');
  elite.hp = 10; g.fire = 0; g.ammo = 12;
  press('space');
  assert(elite.hp <= 0);
  step();
  assert(state.player.energy >= 69, 'abate de elite restaura +10 EN');
  assert(g.drops.some(d => d.kind === 'nucleo_estatica'), 'abate de elite solta nucleo_estatica');
}

// 2. Barris explosivos: detonam com tiro, causam dano em área e lentidão.
{
  const g = boot();
  const b = g.barrels[1];
  assert(!b.dead);
  const foe = { type: 'imp', x: b.x + 1.0, y: b.y, hp: 80, maxHp: 80, cooldown: 99, slow: 0 };
  g.enemies = [foe];
  Object.assign(state.player, { x: b.x - 1.5, y: b.y });
  g.angle = 0; g.fire = 0; g.ammo = 12;
  press('space');
  assert(b.dead, 'tiro detona barril de estática');
  assert(foe.hp < 80, 'explosão do barril fere inimigos próximos');
  assert(foe.slow >= 1.9, 'explosão aplica lentidão');
  assert(g.impacts.some(i => i.color === 'explosion'), 'gera impacto visual de explosão');
}

// 3. Golpe cinético [V]: custo zero de munição/energia, recarga, empurrão e detonação.
{
  const g = boot();
  Object.assign(state.player, { x: 4.5, y: 5.5, energy: 50 });
  g.angle = 0; g.ammo = 0;
  const foe = { type: 'imp', x: 5.7, y: 5.5, hp: 55, maxHp: 55, cooldown: 99, slow: 0 };
  g.enemies = [foe];
  press('v');
  assert.equal(foe.hp, 29, 'golpe cinético [V] causa dano sem gastar munição');
  assert(state.player.energy >= 50, 'golpe cinético não gasta energia');
  assert(foe.x > 5.7, 'golpe cinético empurra o inimigo');
  assert(g.melee > 1.0, 'entra em recarga');
  press('v');
  assert.equal(foe.hp, 29, 'recarga impede golpe repetido no quadro seguinte');
}

// 4. Escudo de campo restaura proteção e energia.
{
  const g = boot();
  const cell = g.shieldCells[0];
  Object.assign(state.player, { x: cell.x, y: cell.y, energy: 65 });
  g.shield = 0;
  step();
  assert(cell.used, 'escudo de campo coletado ao passar por cima');
  assert(g.shield >= 3.9, 'escudo ativo por ~4s');
  assert(state.player.energy >= 74, 'escudo concede +10 EN');
}

// 5. Vigilante Fase 2 usa sprite próprio quando blindagem está fechada.
{
  assert.equal(bossVisualFrame({ cycle: .5, phaseTwo: true, shieldFlash: 0, dead: false, hp: 120 }, 0), 'boss_phase2');
  assert.equal(bossVisualFrame({ cycle: 5.0, phaseTwo: true, shieldFlash: 0, dead: false, hp: 120 }, 0), 'boss_open_a');
}

// 6. Reator estabilizado concede pulso único de +15 EN por visita.
{
  const g = boot({ cidadela_estavel: true, cidadela_final_visto: true });
  g.panel = null; state.world.fpsPaused = false;
  const reactor = CITADEL_DECOR.find(o => o.type === 'reactor');
  Object.assign(state.player, { x: reactor.x - 1.1, y: reactor.y, energy: 50 });
  press('e');
  assert(state.player.energy >= 65 && state.player.energy < 66, 'reator estável restaura +15 EN na primeira ativação');
  assert(g.reactorBoosted);
  const afterFirst = state.player.energy;
  press('e');
  assert(state.player.energy < afterFirst + 1, 'pulso do reator não se repete na mesma visita');
}

// 7. Estação 66.6 exibe telemetria da Cidadela após estabilização.
{
  const el = () => ({ dataset: {}, style: {}, classList: { add() {}, remove() {} }, textContent: '', innerHTML: '', children: [],
    addEventListener() {}, appendChild(n) { this.children.push(n); }, setAttribute() {}, focus() {}, remove() {} });
  const elements = Object.fromEntries(['dialogueBox', 'dialogueSpeaker', 'dialogueText', 'dialogueHint', 'dialogueChoices'].map(id => [id, el()]));
  globalThis.document = { activeElement: el(), getElementById: id => elements[id], createElement: () => el() };
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  initDialogue();
  state.progress = {
    archetype: 'mare_astral',
    inventory: ['selo_codigo_queimado'],
    flags: { freq666_limiar_estavel: true, cidadela_estavel: true, freq666_ancora_origem: true, freq666_ancora_retorno: true, freq666_ancora_memoria: true },
    citadelMaterials: { sucata_codigo: 3, nucleo_estatica: 2 },
  };
  await loadMap('estacao_limiar_666', 'vindo_da_enseada');
  const consoleObj = state.objects.find(o => o.id === 'console_limiar_666');
  const ringObj = state.objects.find(o => o.id === 'anel_limiar_666');
  Object.assign(state.player, { x: consoleObj.x, y: consoleObj.y });
  await checkInteractions(true);
  advanceDialogue();
  const consoleText = elements.dialogueText.textContent;
  assert(consoleText.includes('RELÍQUIAS 1/2') && consoleText.includes('SUCATA 3') && consoleText.includes('NÚCLEOS 2'), 'console exibe telemetria da Cidadela');
  closeDialogue();
  Object.assign(state.player, { x: ringObj.x, y: ringObj.y });
  await checkInteractions(true);
  const ringFirst = elements.dialogueText.textContent;
  advanceDialogue();
  const ringSecond = elements.dialogueText.textContent;
  assert(ringFirst.includes('RONDA SETORIAL') && ringSecond.includes('V GOLPE CINÉTICO'), 'anel menciona pós-vitória e golpe [V]');
  closeDialogue();
}

clearCitadelRuntime();
console.log('Cidadela Lote 2: barris, escudos, golpe [V], elite, fase 2, reator, cutscene e Estação 66.6 OK.');
