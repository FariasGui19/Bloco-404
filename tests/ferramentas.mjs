// =====================================================================
// FERRAMENTAS E SOBRECARGAS — Ultimate nível 1 por arquétipo
//
// Cobre: catálogo das ferramentas, escolha persistida, troca da Ultimate
// ativa e a geometria de cada tipo de sobrecarga (cone, onda, guarda,
// avanço, bônus). Nada aqui depende de DOM.
// =====================================================================
import assert from 'node:assert/strict';

import { ARCHETYPE_TOOLS, TOOL_ULTIMATES, TOOL_ULTIMATE_IDS, ULTIMATE_KINDS, getTool, getTools } from '../js/data/archetype-tools.js';
import { ARCHETYPE_PATHS, LEVEL_TITLES, PATH_STATES, getPath } from '../js/data/archetype-progression.js';
import { MODULE_ULTIMATE_IDS } from '../js/data/ultimates.js';
import { ensureTools, getSelectedTool, getSelectedToolId, listTools, selectTool } from '../js/game/tools.js';
import { getActiveUltimate, getUltimateStatus, tryUltimate, updateUltimate } from '../js/game/ultimate.js';
import { ensureArchetypeProgress } from '../js/game/progression.js';

const ARCHETIPOS = ['motor_bio_forja', 'lamina_dominio_anciao', 'mare_astral', 'nucleo_dez_forma'];

// ---------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------
assert.deepEqual(Object.keys(ARCHETYPE_TOOLS).sort(), [...ARCHETIPOS].sort());

const idsFerramentas = new Set();
for (const arquetipo of ARCHETIPOS) {
  const entrada = ARCHETYPE_TOOLS[arquetipo];
  const tools = getTools(arquetipo);
  assert(tools.length >= 4, `${arquetipo} tem pelo menos quatro escolhas`);
  assert(typeof entrada.label === 'string' && entrada.label.length > 3, `${arquetipo} rotula a escolha`);
  assert(typeof entrada.hint === 'string' && entrada.hint.length > 10, `${arquetipo} explica a escolha`);

  for (const tool of tools) {
    assert(!idsFerramentas.has(tool.id), `id de ferramenta único: ${tool.id}`);
    idsFerramentas.add(tool.id);
    for (const campo of ['name', 'short', 'color', 'tagline']) assert(tool[campo]?.length > 2, `${tool.id}.${campo}`);
    assert.equal(getTool(arquetipo, tool.id), tool, 'busca por id');
    assert.deepEqual(tool.ultimate, getTool(arquetipo, tool.id).ultimate);
  }
}

assert.equal(new Set(TOOL_ULTIMATE_IDS).size, TOOL_ULTIMATE_IDS.length, 'ids de sobrecarga únicos');
for (const id of MODULE_ULTIMATE_IDS) assert(!TOOL_ULTIMATE_IDS.includes(id), 'sobrecarga não reusa id de arquétipo');

for (const ultimate of TOOL_ULTIMATES) {
  assert.equal(ultimate.tier, 'tool');
  assert(ULTIMATE_KINDS.includes(ultimate.kind), `${ultimate.id}: tipo conhecido (${ultimate.kind})`);
  assert(ultimate.cost >= 40 && ultimate.cost <= 80, `${ultimate.id}: custo alto e pagável`);
  assert(ultimate.cooldown >= 20, `${ultimate.id}: recarga longa`);
  assert(ultimate.buff?.id && ultimate.buff.duration >= 5, `${ultimate.id}: bônus identificado`);
  assert(ultimate.description.length > 20 && ultimate.effectText.length > 5, `${ultimate.id}: textos`);
  if (ultimate.kind === 'line' || ultimate.kind === 'dash') {
    assert(ultimate.range > 0 && ultimate.arc > 0 && ultimate.damage > 0, `${ultimate.id}: alcance e dano`);
  } else if (ultimate.kind === 'guard') {
    assert(ultimate.guard > 0 && ultimate.healPct > 0, `${ultimate.id}: guarda e cura`);
    assert(ultimate.radius > 0 && ultimate.damage > 0, `${ultimate.id}: empurrão curto em volta`);
  } else {
    assert(ultimate.radius > 0 && ultimate.damage > 0, `${ultimate.id}: onda com raio e dano`);
  }
}

// ---------------------------------------------------------------
// Caminho 0–5: o que está pronto e o que é plano
// ---------------------------------------------------------------
assert.deepEqual(Object.keys(ARCHETYPE_PATHS).sort(), [...ARCHETIPOS].sort());
for (const arquetipo of ARCHETIPOS) {
  const path = getPath(arquetipo);
  assert.equal(path.levels.length, 6, `${arquetipo}: seis degraus`);
  assert.deepEqual(path.levels.map(entry => entry.level), [0, 1, 2, 3, 4, 5]);
  for (const degrau of path.levels) {
    assert(degrau.title?.length > 3, `${arquetipo}: título do degrau ${degrau.level}`);
    assert(LEVEL_TITLES[degrau.level], `degrau ${degrau.level} tem nome canônico`);
    assert(PATH_STATES[degrau.state], `${arquetipo}: estado válido no degrau ${degrau.level}`);
    assert(degrau.items.length >= 1);
  }
  assert.equal(path.levels[0].title, 'MÓDULO INSTALADO', `${arquetipo}: degrau 0 usa o nome canônico`);
  assert.equal(path.levels[0].state, 'pronto');
  assert.equal(path.levels[5].state, 'futuro', 'a Ultimate de arquétipo ainda é plano');
}

// ---------------------------------------------------------------
// Escolha: padrão, troca, isolamento por arquétipo e limpeza
// ---------------------------------------------------------------
// Ferramenta abre no nível 2; Ultimate no 3.
const progress = { archetype: 'motor_bio_forja', archetypeProgress: {}, tools: {} };
ensureArchetypeProgress(progress);
progress.archetypeProgress.motor_bio_forja.level = 3;

assert.equal(getSelectedTool(progress), null, 'sem escolha não há ferramenta');
assert.equal(getActiveUltimate(progress).tier, 'module', 'a base vale até escolher');
assert.equal(getActiveUltimate(progress).definition.id, 'pulso_forja_viva');

assert.equal(selectTool(progress, 'lamina_de_forja')?.id, 'lamina_de_forja');
assert.equal(progress.tools.motor_bio_forja, 'lamina_de_forja', 'escolha gravada no progresso');
assert.equal(getSelectedToolId(progress), 'lamina_de_forja');
assert.equal(getActiveUltimate(progress).tier, 'tool');
assert.equal(getActiveUltimate(progress).definition.id, 'corte_de_reconfiguracao');
assert(listTools(progress).find(tool => tool.id === 'lamina_de_forja').selected);
assert.equal(listTools(progress).filter(tool => tool.selected).length, 1, 'só uma ferramenta instalada');

// Ferramenta de outro arquétipo não vale para este.
assert.equal(selectTool(progress, 'chicote_de_mare'), null, 'recusa ferramenta de outro módulo');
assert.equal(progress.tools.motor_bio_forja, 'lamina_de_forja', 'recusa não troca a escolha');

// Trocar de arquétipo usa a escolha daquele arquétipo, não a do anterior.
const outro = { archetype: 'mare_astral', archetypeProgress: {}, tools: {} };
ensureArchetypeProgress(outro);
outro.archetypeProgress.mare_astral.level = 3;
assert.equal(getSelectedToolId(outro), null);
selectTool(outro, 'escudo_liquido');
assert.equal(getSelectedToolId(outro), 'escudo_liquido');
assert.equal(getSelectedToolId(progress), 'lamina_de_forja', 'escolhas não se cruzam');

// Save antigo/estranho: limpa o que não pertence ao arquétipo.
const sujo = { archetype: 'nucleo_dez_forma', tools: { nucleo_dez_forma: 'lamina_de_forja', motor_bio_forja: 'asa_de_impulso', mare_astral: 'inexistente' } };
ensureTools(sujo);
assert.equal(sujo.tools.nucleo_dez_forma, undefined, 'id de outro arquétipo é descartado');
assert.equal(sujo.tools.motor_bio_forja, 'asa_de_impulso', 'escolha válida de outro arquétipo permanece');
assert.equal(sujo.tools.mare_astral, undefined, 'id inexistente é descartado');
ensureTools({});
assert.deepEqual(ensureTools(null), null);

// Limpar a escolha volta para a Ultimate de arquétipo.
assert.equal(selectTool(progress, null), null);
assert.equal(getSelectedTool(progress), null);
assert.equal(getActiveUltimate(progress).tier, 'module');
selectTool(progress, 'lamina_de_forja');

// ---------------------------------------------------------------
// Uso: custo, recarga e bônus vêm da sobrecarga escolhida
// ---------------------------------------------------------------
const criarPlayer = (extra = {}) => ({
  x: 10, y: 10, facing: 'down',
  health: 60, maxHealth: 150,
  energy: 100, maxEnergy: 100,
  ability: { cooldowns: {} },
  ultimate: undefined,
  ...extra,
});

const alvo = (x, y, vida = 200) => ({ id: `alvo_${x}_${y}`, x, y, health: vida, maxHealth: vida });

let player = criarPlayer();
const lamina = getTool('motor_bio_forja', 'lamina_de_forja').ultimate;
const resultado = tryUltimate({ player, progress, targets: [], showMessage: () => {}, rng: () => .5 });
assert(resultado, 'sobrecarga dispara com energia cheia');
assert.equal(resultado.definition.id, lamina.id);
assert.equal(resultado.kind, 'line');
assert.equal(player.energy, 100 - lamina.cost, 'cobra o custo da sobrecarga, não o da base');
assert.equal(player.ultimate.cooldown, lamina.cooldown);
assert.equal(player.ultimate.buff.id, lamina.buff.id);
assert.equal(player.ultimate.effect.kind, 'line', 'efeito visual sabe que é corte');

// ---------------------------------------------------------------
// Geometria: cone (line) acerta à frente e ignora atrás/lado
// ---------------------------------------------------------------
player = criarPlayer();
const frente = alvo(12, 12);
const atras = alvo(8, 8);
const lado = alvo(13, 7);
tryUltimate({ player, progress, targets: [frente, atras, lado], showMessage: () => {}, rng: () => .5 });
assert(frente.health < 200, 'corte atinge quem está à frente');
assert.equal(atras.health, 200, 'corte não volta');
assert.equal(lado.health, 200, 'corte não abre para o lado');

// ---------------------------------------------------------------
// Onda: raio maior alcança o que o impacto curto não alcança
// ---------------------------------------------------------------
const bio = (toolId) => {
  const p = { archetype: 'motor_bio_forja', archetypeProgress: {}, tools: { motor_bio_forja: toolId } };
  ensureArchetypeProgress(p);
  p.archetypeProgress.motor_bio_forja.level = 3;
  return p;
};
const distante = () => alvo(16, 10);
const alvoOnda = distante();
const ondaPlayer = criarPlayer();
tryUltimate({ player: ondaPlayer, progress: bio('gancho_magnetico'), targets: [alvoOnda], showMessage: () => {}, rng: () => .5 });
assert(alvoOnda.health < 200, 'rede de ancoragem alcança longe');

const alvoCurto = distante();
const curtoPlayer = criarPlayer();
tryUltimate({ player: curtoPlayer, progress: bio('punho_de_impacto'), targets: [alvoCurto], showMessage: () => {}, rng: () => .5 });
assert.equal(alvoCurto.health, 200, 'martelo de forja não alcança o mesmo alvo');

// ---------------------------------------------------------------
// Guarda: invulnerabilidade, cura e empurrão curto
// ---------------------------------------------------------------
const dominio = { archetype: 'lamina_dominio_anciao', archetypeProgress: {}, tools: { lamina_dominio_anciao: 'escudo_de_dominio' } };
ensureArchetypeProgress(dominio);
dominio.archetypeProgress.lamina_dominio_anciao.level = 3;
const guardiao = criarPlayer({ health: 20, invulnerable: 0 });
const colado = alvo(11.2, 11.2);
const longe = alvo(18, 18);
const guarda = tryUltimate({ player: guardiao, progress: dominio, targets: [colado, longe], showMessage: () => {}, rng: () => .5 });
assert.equal(guarda.kind, 'guard');
assert.equal(guarda.guard, getTool('lamina_dominio_anciao', 'escudo_de_dominio').ultimate.guard);
assert.equal(guardiao.invulnerable, guarda.guard, 'guarda aplicada');
assert(guardiao.health > 20, 'muralha cura');
assert(colado.health < 200, 'quem encosta leva o empurrão');
assert.equal(longe.health, 200, 'guarda não é ataque de longo alcance');

// ---------------------------------------------------------------
// Avanço: cria o dash do mapa e corta em cone
// ---------------------------------------------------------------
const mare = { archetype: 'mare_astral', archetypeProgress: {}, tools: { mare_astral: 'passo_abissal' } };
ensureArchetypeProgress(mare);
mare.archetypeProgress.mare_astral.level = 3;
const corredor = criarPlayer({ facing: 'right', health: 100 });
const naFrente = alvo(14, 8);
const avanco = tryUltimate({ player: corredor, progress: mare, targets: [naFrente], showMessage: () => {}, rng: () => .5 });
assert.equal(avanco.kind, 'dash');
assert(corredor.ability.dash, 'avanço usa o dash do mapa (colisão manda)');
assert.equal(Math.round(corredor.ability.dash.directionX * 100), 71, 'direção vem do facing');
assert.equal(corredor.ability.dash.mode, 'ultimate');
assert(corredor.ability.dash.speed > 10, 'avanço é rápido');
assert(naFrente.health < 200, 'corrente corta quem está na frente');

// ---------------------------------------------------------------
// Bônus e energia: surge devolve energia com o tempo
// ---------------------------------------------------------------
const nucleo = { archetype: 'nucleo_dez_forma', archetypeProgress: {}, tools: { nucleo_dez_forma: 'nucleo_veloz' } };
ensureArchetypeProgress(nucleo);
nucleo.archetypeProgress.nucleo_dez_forma.level = 3;
const veloz = criarPlayer({ energy: 100 });
// Ultimate do Núcleo exige a forma ativa (regra do 10X).
veloz.nucleoForm = 'forma_veloz';
const impulso = tryUltimate({ player: veloz, progress: nucleo, targets: [], showMessage: () => {}, rng: () => .5 });
assert.equal(impulso.kind, 'surge');
assert(impulso.buff.moveSpeedPct > .4, 'forma veloz acelera de verdade');
const energiaDepoisDoUso = veloz.energy;
updateUltimate(veloz, nucleo, 1);
assert(veloz.energy > energiaDepoisDoUso, 'bônus devolve energia por segundo');
assert(veloz.ultimate.buff.timeLeft < impulso.buff.duration - .5);

// ---------------------------------------------------------------
// Status para HUD/Códex
// ---------------------------------------------------------------
const status = getUltimateStatus(criarPlayer(), progress);
assert.equal(status.tier, 'tool');
assert.equal(status.tool.id, 'lamina_de_forja');
assert.equal(status.definition.id, lamina.id);
assert(status.charge >= 0 && status.charge <= 1);

// ---------------------------------------------------------------
// Save: a escolha sobrevive ao ciclo salvar → carregar
// ---------------------------------------------------------------
const store = new Map();
globalThis.localStorage = {
  getItem: key => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, value),
  removeItem: key => store.delete(key),
};
const { state } = await import('../js/game/state.js');
const { getSave, loadSaveIntoState, saveGame, startNewSave } = await import('../js/game/save.js');

startNewSave(1, 'TESTE');
state.progress.archetype = 'motor_bio_forja';
ensureArchetypeProgress(state.progress, 'motor_bio_forja');
state.progress.archetypeProgress.motor_bio_forja.level = 2;
selectTool(state.progress, 'gancho_magnetico');
assert.equal(saveGame(), true);
assert.equal(getSave(1).progress.tools.motor_bio_forja, 'gancho_magnetico', 'escolha no save');

// Carregar de novo mantém a escolha e a Ultimate correspondente.
loadSaveIntoState(1);
assert.equal(state.progress.tools.motor_bio_forja, 'gancho_magnetico');
assert.equal(getActiveUltimate(state.progress).definition.id, 'rede_de_ancoragem');

// Save adulterado: id inválido não vira Ultimate.
const bruto = JSON.parse(store.get('BLOCO404_SAVE_SLOT_1'));
bruto.progress.tools = { motor_bio_forja: 'ferramenta_que_nao_existe' };
store.set('BLOCO404_SAVE_SLOT_1', JSON.stringify(bruto));
const limpo = getSave(1);
assert.equal(limpo.progress.tools.motor_bio_forja, undefined, 'save inválido é saneado');
assert.equal(getActiveUltimate(limpo.progress).tier, 'module', 'sem escolha válida, volta para a base');

console.log('Ferramentas: catálogo, escolha persistida, caminho 0–5 e cinco geometrias de sobrecarga OK.');
