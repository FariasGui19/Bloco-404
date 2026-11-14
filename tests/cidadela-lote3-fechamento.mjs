// Testa o fechamento completo do Lote 3 da Cidadela 404:
// 10 novos sprites/cutscene, parry cinético [V], barris sobrecarregados,
// recompensa de ronda setorial, bônus de limpeza por setor, ícones no Códex,
// telemetria de retorno/diagnóstico e compatibilidade sem mutação de save.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { map, CITADEL_PATROL_CONSOLE } from '../js/data/worlds/cidadela-404/cidadela.js';
import { ITEMS } from '../js/data/items.js';
import { CITADEL_RETURN_SCENES } from '../js/ui/cutscene.js';
import { state } from '../js/game/state.js';
import { loadMap } from '../js/game/map-manager.js';
import { checkInteractions } from '../js/game/interactions.js';
import { getArchetypeAbilities } from '../js/game/abilities.js';
import { tryModuleInteraction } from '../js/game/module-interactions.js';
import { initDialogue, advanceDialogue, closeDialogue } from '../js/ui/dialogue.js';
import { updateCitadel, getCitadelRuntime, clearCitadelRuntime, citadelSpriteFrame } from '../js/game/cidadela-fps.js';

const BATCH3_ASSETS = [
  'assets/sprites/cidadela-404/parede-oficina.png',
  'assets/sprites/cidadela-404/vigilante-inerte-acorrentado.png',
  'assets/sprites/cidadela-404/nucleo-treino-ativo.png',
  'assets/sprites/cidadela-404/painel-transmissor-ativo.png',
  'assets/sprites/cidadela-404/projetil-elite.png',
  'assets/sprites/cidadela-404/imp-elite-colapso.png',
  'assets/sprites/cidadela-404/golpe-cinetico-pulso.png',
  'assets/sprites/cidadela-404/reliquia-selo-codigo.png',
  'assets/sprites/cidadela-404/reliquia-nucleo-vigilante.png',
  'assets/cutscenes/cidadela-retorno-estavel.jpg',
];
for (const file of BATCH3_ASSETS) assert(existsSync(file), `asset do lote 3 ausente: ${file}`);

assert.equal(ITEMS.selo_codigo_queimado.spritePath, 'assets/sprites/cidadela-404/reliquia-selo-codigo.png');
assert.equal(ITEMS.nucleo_vigilante_forjado.spritePath, 'assets/sprites/cidadela-404/reliquia-nucleo-vigilante.png');
assert.equal(CITADEL_RETURN_SCENES.length, 1);
assert.equal(CITADEL_RETURN_SCENES[0].image, 'assets/cutscenes/cidadela-retorno-estavel.jpg');
assert.equal(citadelSpriteFrame({ type: 'elite', hp: 0, death: .35 }, 0), 'elite_death');

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

// 1. Parry cinético [V]: anula projétil próximo, restaura +5 EN e reduz recarga.
{
  const g = boot();
  Object.assign(state.player, { x: 4.5, y: 5.5, energy: 50 });
  g.angle = 0;
  g.shots.push({ kind: 'elite', x: 5.4, y: 5.5, dx: -1, dy: 0, life: 2, damage: 10 });
  press('v');
  assert.equal(g.shots.length, 0, 'golpe cinético [V] anula projétil à frente');
  assert(state.player.energy >= 55, 'parry cinético restaura +5 EN');
  assert(g.melee < 0.8, 'parry cinético reduz a recarga do golpe');
}

// 2. Barril sobrecarregado via Ultimate causa dano ampliado (130).
{
  const g = boot({}, 'nucleo_dez_forma');
  const b = g.barrels[1];
  const foe = { type: 'imp', x: b.x + 1.0, y: b.y, hp: 140, maxHp: 140, cooldown: 99, slow: 0 };
  g.enemies = [foe];
  Object.assign(state.player, { x: b.x - 1.5, y: b.y, energy: 100 });
  g.angle = 0;
  press('f');
  assert(b.dead, 'ultimate detona barril próximo');
  assert(foe.slow >= 3.4, 'explosão sobrecarregada aplica lentidão estendida (3.5s)');
  assert.equal(foe.hp, 46, 'explosão sobrecarregada + ultimate causam dano ampliado (70 + 24)');
}

// 3. Conclusão da ronda setorial concede +25 XP uma única vez e solta núcleo no console.
{
  const g = boot({ cidadela_estavel: true, cidadela_final_visto: true });
  Object.assign(state.player, { x: CITADEL_PATROL_CONSOLE.x - .6, y: CITADEL_PATROL_CONSOLE.y });
  press('e');
  assert(g.patrol, 'ronda setorial iniciada');
  assert(g.enemies.length >= 3);
  g.enemies.forEach(e => { e.hp = 0; });
  step();
  assert(!g.patrol, 'ronda conclui ao zerar inimigos');
  assert.equal(state.progress.flags.cidadela_rondas_concluidas, 1);
  assert.equal(state.progress.archetypeProgress.mare_astral.xp, 25, 'primeira ronda concede +25 XP');
  assert(g.drops.some(d => d.kind === 'nucleo_estatica' && Math.hypot(d.x - (CITADEL_PATROL_CONSOLE.x + .5), d.y - CITADEL_PATROL_CONSOLE.y) < .2), 'console libera nucleo_estatica');
  // Segunda ronda incrementa contador sem repetir o bônus único de XP.
  Object.assign(state.player, { x: CITADEL_PATROL_CONSOLE.x - .6, y: CITADEL_PATROL_CONSOLE.y });
  press('e');
  g.enemies.forEach(e => { e.hp = 0; });
  step();
  assert.equal(state.progress.flags.cidadela_rondas_concluidas, 2);
  assert.equal(state.progress.archetypeProgress.mare_astral.xp, 25, 'XP único não se repete');
}

// 4. Bônus de estabilização por setor (+10 EN após limpar inimigos do setor visitado).
{
  const g = boot();
  Object.assign(state.player, { x: 4.5, y: 5.5, energy: 60 });
  const sector1Foes = g.enemies.filter(e => e.x < 8);
  sector1Foes.forEach((e, i) => { if (i > 0) e.hp = 0; });
  const last = sector1Foes[0];
  Object.assign(last, { x: 5.5, y: 5.5, hp: 10 });
  g.angle = 0; g.fire = 0; g.ammo = 12;
  press('space');
  step();
  assert(g.clearedSectors.has(0), 'setor 01 marcado como estabilizado');
  assert(state.player.energy >= 70, 'estabilizar setor concede +10 EN');
}

// 5. Códex exibe sprites das relíquias e materiais da Cidadela sem mutar progress.
{
  const el = () => ({ dataset: {}, style: {}, classList: { add() {}, remove() {}, toggle() {} }, textContent: '', innerHTML: '', children: [],
    addEventListener() {}, appendChild(n) { this.children.push(n); }, setAttribute() {}, focus() {}, remove() {}, querySelectorAll: () => [] });
  const elements = new Map();
  const overlay = Object.assign(el(), {
    querySelector(sel) { if (!elements.has(sel)) elements.set(sel, el()); return elements.get(sel); },
  });
  const docEl = Object.fromEntries(['dialogueBox', 'dialogueSpeaker', 'dialogueText', 'dialogueHint', 'dialogueChoices'].map(id => [id, el()]));
  globalThis.document = {
    activeElement: el(),
    getElementById: id => docEl[id],
    createElement: () => overlay,
    body: { appendChild() {} },
  };
  globalThis.window = { addEventListener() {}, removeEventListener() {} };

  const { openCodex, setTab, closeCodex } = await import('../js/ui/codex.js');
  const codexProgress = {
    archetype: 'mare_astral',
    inventory: ['selo_codigo_queimado', 'nucleo_vigilante_forjado'],
    flags: { cidadela_estavel: true, cidadela_rondas_concluidas: 3 },
    archetypeProgress: { mare_astral: { level: 3, xp: 25 } },
    citadelMaterials: { sucata_codigo: 4, nucleo_estatica: 2 },
  };
  const snap = JSON.stringify(codexProgress);
  openCodex(codexProgress, { id: 'cidadela_404' }, state.player);
  setTab('inventario');
  const html = elements.get('#codexPanel').innerHTML;
  assert(html.includes('reliquia-selo-codigo.png') && html.includes('reliquia-nucleo-vigilante.png'), 'Códex renderiza sprites das relíquias');
  assert(html.includes('4 Sucata de Código') && html.includes('2 Núcleo de Estática'), 'Códex exibe materiais da Cidadela');
  assert.equal(JSON.stringify(codexProgress), snap, 'openCodex permanece estritamente somente leitura');
  closeCodex();

  // 6. Diagnóstico [R] na Enseada e na Estação 66.6 + Rondas no Console da Estação.
  initDialogue();
  state.progress = {
    archetype: 'mare_astral',
    abilities: getArchetypeAbilities('mare_astral'),
    inventory: ['selo_codigo_queimado', 'nucleo_vigilante_forjado'],
    flags: { metroCalibrado: true, frequencia666Registrada: true, freq666_limiar_estavel: true, cidadela_estavel: true, cidadela_rondas_concluidas: 3, freq666_ancora_origem: true, freq666_ancora_retorno: true, freq666_ancora_memoria: true },
    archetypeProgress: { mare_astral: { level: 3, xp: 0 } },
    citadelMaterials: { sucata_codigo: 4, nucleo_estatica: 2 },
  };
  await loadMap('ilha_enseada_ecos', 'vindo_da_praia');
  const coveTerm = state.objects.find(o => o.id === 'terminal_frequencia_666');
  Object.assign(state.player, { x: coveTerm.x, y: coveTerm.y, ability: { scanning: 0 } });
  assert(tryModuleInteraction(), 'diagnóstico [R] ativa no terminal da Enseada');
  advanceDialogue();
  assert(docEl.dialogueText.textContent.includes('REATOR DA CIDADELA ESTÁ ESTÁVEL'), 'terminal da Enseada reconhece vitória');
  advanceDialogue();
  assert(docEl.dialogueText.textContent.includes('SELO DO CÓDIGO QUEIMADO'), 'terminal da Enseada reconhece relíquias');
  closeDialogue();

  await loadMap('estacao_limiar_666', 'vindo_da_enseada');
  const consoleObj = state.objects.find(o => o.id === 'console_limiar_666');
  Object.assign(state.player, { x: consoleObj.x, y: consoleObj.y, ability: { scanning: 0 } });
  assert(tryModuleInteraction(), 'diagnóstico [R] ativa no console da Estação 66.6');
  assert(docEl.dialogueText.textContent.includes('RONDAS CONCLUÍDAS: 3') && docEl.dialogueText.textContent.includes('RELÍQUIAS 2/2'), 'console 66.6 exibe telemetria completa no [R]');
  closeDialogue();

  await checkInteractions(true);
  advanceDialogue();
  assert(docEl.dialogueText.textContent.includes('RONDAS 3'), 'console da Estação exibe contagem de rondas no [E]');
  closeDialogue();
}

clearCitadelRuntime();
console.log('Cidadela Lote 3: assets, parry [V], barril sobrecarregado, rondas, setores, Códex e telemetria OK.');
