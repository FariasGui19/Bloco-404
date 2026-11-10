// =====================================================================
// PERSONAS — 4 operadores criáveis, um módulo de cada
//
// Trava a regra que o criador pediu: "4 personagens criáveis lá no menu
// pra dar pra criar 1 de cada no máximo".
//
// O teste monta um localStorage de mentira e exercita o caminho REAL de
// `save.js` (não uma cópia da regra), porque a regra só vale se valer
// contra o que está gravado.
// =====================================================================
import assert from 'node:assert/strict';

// --- localStorage mínimo antes de importar save.js -------------------
const banco = new Map();
globalThis.localStorage = {
  getItem: k => (banco.has(k) ? banco.get(k) : null),
  setItem: (k, v) => banco.set(k, String(v)),
  removeItem: k => banco.delete(k),
  clear: () => banco.clear(),
};

const { createNewSave, deleteSave, listSaves, getSave } = await import('../js/game/save.js');
const {
  PERSONAS_MAX, arquetiposEmUso, arquitetosLivresHelper,
} = await import('../js/game/personas.js').then(m => ({
  ...m,
  arquitetosLivresHelper: m.arquétiposDisponíveis ?? null,
})).catch(async () => {
  const m = await import('../js/game/personas.js');
  return { ...m, arquitetosLivresHelper: m.arquétiposDisponíveis };
});
const {
  podeEscolherArquetipo, arquetiposDisponiveis, totalPersonas, resumoPersonas,
} = await import('../js/game/personas.js');
const { ARCHETYPES } = await import('../js/data/onboarding.js');

const MODULOS = Object.keys(ARCHETYPES);
assert.equal(MODULOS.length, 4, `esperava 4 módulos, achei ${MODULOS.length}`);
assert.equal(PERSONAS_MAX, 4, 'devem existir 4 personas');

// --- 4 slots, todos vazios no começo --------------------------------
assert.equal(listSaves().length, 4, 'o menu deveria listar 4 slots');
assert.equal(totalPersonas(), 0);
assert.equal(arquetiposEmUso().size, 0);
assert.equal(arquetiposDisponiveis().length, 4, 'todos os módulos livres no começo');
console.log(`Menu: ${listSaves().length} slots, ${arquetiposDisponiveis().length} módulos livres.`);

// --- Um de cada: preenche os 4 slots -------------------------------
// Grava pelo caminho real: cria o save e depois escreve o arquétipo como
// o onboarding faria. Sem inventar nome de chave no teste.
for (const [i, id] of MODULOS.entries()) {
  const slot = i + 1;
  assert(podeEscolherArquetipo(id, slot), `${id} deveria estar livre para o slot ${slot}`);
  createNewSave(slot);
  const save = getSave(slot);
  save.progress.archetype = id;
  // Mesma chave que `save.js` usa (prefixo documentado, não inventado).
  localStorage.setItem(`BLOCO404_SAVE_SLOT_${slot}`, JSON.stringify(save));
}

assert.equal(totalPersonas(), 4, 'deveriam existir 4 operadores');
assert.equal(arquetiposEmUso().size, 4, '4 módulos em uso');
assert.equal(arquetiposDisponiveis().length, 0, 'nenhum módulo deveria sobrar');

// --- Agora TODOS bloqueiam, inclusive contra o próprio slot ---------
for (const id of MODULOS) {
  for (let slot = 1; slot <= 4; slot++) {
    const dono = arquetiposEmUso(slot).get(id);
    if (dono === undefined) continue; // é o próprio slot
    assert.equal(
      podeEscolherArquetipo(id, slot), false,
      `${id} deveria estar bloqueado no slot ${slot} (dono: slot ${dono})`
    );
  }
}
console.log('Um de cada: com os 4 preenchidos, nenhum módulo pode repetir.');

// --- O próprio slot não se bloqueia (reabrir a ficha) --------------
MODULOS.forEach((id, i) => {
  const slot = i + 1;
  assert(podeEscolherArquetipo(id, slot), `o slot ${slot} deveria poder manter ${id}`);
});

// --- Apagar libera o módulo ----------------------------------------
const removido = MODULOS[2];
const slotRemovido = 3;
deleteSave(slotRemovido);
assert.equal(totalPersonas(), 3);
assert(podeEscolherArquetipo(removido, 3), `${removido} deveria voltar a ficar livre`);
assert(arquetiposDisponiveis().length === 1, 'deveria sobrar exatamente 1 módulo');
console.log(`Apagar o operador 0${slotRemovido} libera ${removido} de novo.`);

// --- Resumo do menu ------------------------------------------------
const resumo = resumoPersonas();
assert.equal(resumo.length, 4);
for (const r of resumo) {
  assert(r.nome && r.cor, 'resumo sem nome/cor');
  assert.equal(r.usado, r.slot != null, 'flag "usado" incoerente com o slot');
}
const ocupados = resumo.filter(r => r.usado).length;
assert.equal(ocupados, 3, 'o resumo deveria mostrar 3 módulos ocupados');

// --- Módulo inexistente nunca é escolhido --------------------------
assert.equal(podeEscolherArquetipo('nao_existe', 4), false);

console.log('\nPersonas: 4 operadores, um módulo de cada, liberado ao apagar.');
