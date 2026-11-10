// =====================================================================
// FORMAS DO NÚCLEO — só a forma existente entra em jogo, e só transformado
// se solta Ultimate
//
// O 10X foi desenhado com quatro formas. Só a VELOZ tem transformação de
// verdade hoje; as outras três são árvore/horizonte. Deixar instalar uma
// forma sem transformação daria uma tecla F morta — o teste impede isso.
// =====================================================================
import assert from 'node:assert/strict';

import { ARCHETYPE_TOOLS, getTools } from '../js/data/archetype-tools.js';
import { listTools, selectTool, ensureTools, getSelectedTool } from '../js/game/tools.js';
import { toggleNucleoForm } from '../js/game/nucleo-form.js';
import { canCastUltimate, getUltimateStatus, tryUltimate } from '../js/game/ultimate.js';
import { ensureArchetypeProgress } from '../js/game/progression.js';
import { getArchetypeAbilities } from '../js/game/abilities.js';

const NUCLEO = 'nucleo_dez_forma';

function novoProgress(nivel = 3) {
  const progress = { archetype: NUCLEO, archetypeProgress: {}, abilities: getArchetypeAbilities(NUCLEO), tools: {} };
  ensureArchetypeProgress(progress, NUCLEO);
  progress.archetypeProgress[NUCLEO].level = nivel;
  return progress;
}

function novoPlayer(extra = {}) {
  return {
    x: 10, y: 10, facing: 'down',
    health: 100, maxHealth: 100,
    energy: 100, maxEnergy: 100,
    ability: { cooldowns: {} },
    nucleoForm: null,
    ...extra,
  };
}

// ---------------------------------------------------------------
// Catálogo: duas formas jogáveis, duas em projeto
// ---------------------------------------------------------------
const formas = getTools(NUCLEO);
assert.equal(formas.length, 4, 'quatro formas desenhadas');
const joggaveis = formas.filter(forma => forma.playable !== false);
assert.deepEqual(joggaveis.map(forma => forma.id), ['nucleo_veloz', 'nucleo_bruto'], 'Veloz e Quebra Sistemas existem em jogo');
for (const forma of formas.filter(item => !joggaveis.includes(item))) {
  assert.equal(forma.playable, false, `${forma.id}: forma futura`);
  assert.equal(forma.project, 'FORMA EM PROJETO', `${forma.id}: rótulo de projeto`);
  assert(forma.ultimate?.id, `${forma.id}: Ultimate já desenhada no dado`);
}

const progress = novoProgress();
const listadas = listTools(progress);
assert.equal(listadas.filter(item => item.playable).length, 2);
for (const item of listadas.filter(forma => !forma.playable)) {
  assert.equal(item.locked, true, `${item.id}: não instalável`);
  assert.equal(selectTool(progress, item.id), null, `${item.id}: instalação recusada`);
}
assert.equal(selectTool(progress, 'nucleo_veloz')?.id, 'nucleo_veloz', 'forma veloz instala');

// Uma escolha inválida antiga não sobrevive: ensureTools limpa.
const sujo = novoProgress();
sujo.tools[NUCLEO] = 'nucleo_puro';
ensureTools(sujo);
assert.equal(sujo.tools[NUCLEO], undefined, 'forma em projeto não fica selecionada');

// ---------------------------------------------------------------
// A Ultimate do Núcleo só sai transformado
// ---------------------------------------------------------------
const player = novoPlayer();
assert.equal(getSelectedTool(progress)?.id, 'nucleo_veloz');

const bloqueado = canCastUltimate(player, progress);
assert.equal(bloqueado.ok, false, 'sem forma não solta');
assert.equal(bloqueado.needsForm, true);
assert.match(bloqueado.reason, /TRANSFORME-SE/);
assert.match(bloqueado.reason, /T/, 'a dica aponta a tecla que transforma');

const statusParado = getUltimateStatus(player, progress);
assert.equal(statusParado.ready, false, 'HUD não anuncia pronta');
assert.equal(statusParado.needsForm, true);
assert(statusParado.formHint.includes('TRANSFORME-SE'));

const energiaAntes = player.energy;
assert.equal(tryUltimate({ player, progress, targets: [], showMessage: () => {}, rng: () => .5 }), null);
assert.equal(player.energy, energiaAntes, 'tentativa sem forma não cobra energia');
assert.equal(player.ultimate?.casts ?? 0, 0, 'não conta uso');

// Transforma (com o estado de sessão real do jogo) e a Ultimate libera.
assert.equal(toggleNucleoForm(progress, player), true);
assert.equal(player.nucleoForm, 'forma_veloz');
assert.equal(canCastUltimate(player, progress).ok, true, 'transformado pode soltar');
const statusForma = getUltimateStatus(player, progress);
assert.equal(statusForma.needsForm, false);
assert.equal(statusForma.ready, true, 'pronta com forma ativa, energia cheia e sem recarga');

const soltou = tryUltimate({ player, progress, targets: [], showMessage: () => {}, rng: () => .5 });
assert.equal(soltou?.kind, 'surge', 'a Ultimate da forma veloz é impulso');
assert.equal(player.ultimate.effect?.signature, 'tempo', 'a assinatura visual viaja no efeito');
assert.equal(player.ultimate.effect?.kind, 'surge', 'o efeito mantém a geometria da sobrecarga');
assert.equal(player.ultimate.casts, 1);

// ---------------------------------------------------------------
// A regra é só do Núcleo: outros arquétipos não pedem forma
// ---------------------------------------------------------------
for (const archetype of ['motor_bio_forja', 'lamina_dominio_anciao', 'mare_astral']) {
  const outro = { archetype, archetypeProgress: {}, abilities: [], tools: {} };
  ensureArchetypeProgress(outro, archetype);
  outro.archetypeProgress[archetype].level = 3;
  const check = canCastUltimate(novoPlayer(), outro);
  assert.equal(check.ok, true, `${archetype}: sem exigência de forma`);
  assert.equal(getUltimateStatus(novoPlayer(), outro).needsForm, false);
}

console.log('Formas do Núcleo: só a veloz instala, e a Ultimate exige transformação OK.');
