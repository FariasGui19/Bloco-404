// =====================================================================
// PRAIA 2.0 — CONTRATO DA MISSÃO DO MARÉ
//
// A missão "MARÉ PROFUNDA" é o que dá razão ao mergulho. Este teste trava
// as regras que impedem o save de mentir:
//
//   1. os fragmentos existem, ficam em água funda e estão espalhados;
//   2. o mesmo fragmento NUNCA conta duas vezes;
//   3. mergulho conta na ENTRADA no fundo, não por frame;
//   4. `reach` do fundo só dispara na enseada;
//   5. a missão abre só para o Maré Astral e recompensa uma única vez.
// =====================================================================
import assert from 'node:assert/strict';
import {
  criarFragmentosDeMare, atualizarMissaoMare, fragmentosColetados,
  FRAGMENTOS_POR_MAPA,
} from '../js/game/mare-missao.js';
import { getQuest } from '../js/data/quests.js';
import {
  startQuest, getQuestState, recordQuestEvent, ensureQuestLog,
} from '../js/game/quests.js';
import { createCoastField } from '../js/engine/coast-field.js';
import { map as praia } from '../js/data/worlds/arquipelago-rotas-perdidas/praia-inicial.js';
import { map as enseada } from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';

const agua = c => 'YyDdX'.includes(c ?? ' ');
const campoEnseada = createCoastField(enseada.aguaPraia, 8);
const campoPraia = createCoastField(praia.aguaPraia, 8);

// --- 1. Fragmentos existem, em água funda e espalhados ----------------
const frags = criarFragmentosDeMare(enseada, campoEnseada);
assert.equal(frags.length, FRAGMENTOS_POR_MAPA, `esperava ${FRAGMENTOS_POR_MAPA} fragmentos`);
for (const f of frags) {
  assert(agua(enseada.aguaPraia[Math.floor(f.y)]?.[Math.floor(f.x)]), `fragmento fora da água: ${f.id}`);
  const px = Math.floor(f.x * campoEnseada.scale), py = Math.floor(f.y * campoEnseada.scale);
  assert(campoEnseada.distLand[py * campoEnseada.width + px] > 1.5, `fragmento raso demais: ${f.id}`);
  assert(f.id.startsWith(enseada.id), 'id do fragmento deve incluir o mapa');
}
const ys = frags.map(f => f.y);
const espalhado = Math.max(...ys) - Math.min(...ys);
assert(espalhado > enseada.aguaPraia.length * .4, `fragmentos empilhados (faixa y de ${espalhado.toFixed(1)})`);
console.log(`Fragmentos: ${frags.length} na enseada, faixa y de ${espalhado.toFixed(0)} tiles.`);

// Determinismo: a mesma chamada dá os mesmos pontos.
assert.deepEqual(
  criarFragmentosDeMare(enseada, campoEnseada).map(f => f.id),
  frags.map(f => f.id),
  'fragmentos devem ser determinísticos'
);

// --- 2. Coleta não repete --------------------------------------------
const progress = { archetype: 'mare_astral', flags: {}, inventory: [], mastery: {} };
ensureQuestLog(progress, true);
startQuest(progress, 'mare_profunda');
assert.equal(getQuestState(progress, 'mare_profunda').status, 'active');

const alvo = frags[0];
const player = { x: alvo.x, y: alvo.y };
const nado = { ativo: true, profundidade: 2 };

const r1 = atualizarMissaoMare({ map: enseada, player, nado, progress, fragmentos: frags });
assert.equal(r1.coletou?.id, alvo.id, 'deveria coletar o fragmento onde o jogador está');
assert(fragmentosColetados(progress).has(alvo.id), 'fragmento deveria estar marcado no save');

// Continua em cima da mesma célula: não pode coletar de novo.
let repetiu = 0;
for (let i = 0; i < 30; i++) {
  const r = atualizarMissaoMare({ map: enseada, player, nado, progress, fragmentos: frags });
  if (r.coletou) repetiu++;
}
assert.equal(repetiu, 0, `o mesmo fragmento contou ${repetiu} vezes`);
console.log('Coleta: o mesmo fragmento nunca conta duas vezes.');

// O fragmento coletado sai da lista visível.
const vis = atualizarMissaoMare({ map: enseada, player, nado, progress, fragmentos: frags });
assert(!vis.fragmentos.some(f => f.id === alvo.id), 'fragmento coletado não deveria continuar visível');
assert.equal(vis.fragmentos.length, frags.length - 1, 'faltou esconder o coletado');

// --- 3. Mergulho conta na entrada, não por frame --------------------
const antes = getQuestState(progress, 'mare_profunda').objectives[0].current;
player.mareMissao = { estavaSubmerso: false };
let entradas = 0;
for (let i = 0; i < 100; i++) {
  // Fica submerso 100 frames: deve contar UMA vez.
  const r = atualizarMissaoMare({ map: enseada, player, nado, progress, fragmentos: [] });
  if (r.mergulhou) entradas++;
}
assert.equal(entradas, 1, `100 frames submerso contaram ${entradas} mergulhos`);

// Sobe (raso), desce de novo: aí conta outro.
const raso = { ativo: true, profundidade: .6 };
atualizarMissaoMare({ map: enseada, player, nado: raso, progress, fragmentos: [] });
const r2 = atualizarMissaoMare({ map: enseada, player, nado, progress, fragmentos: [] });
assert(r2.mergulhou, 'descer de novo deveria contar outro mergulho');
console.log('Mergulho: conta na entrada no fundo, não por frame.');

// --- 4. `reach` só na enseada ---------------------------------------
const progressPraia = { archetype: 'mare_astral', flags: {}, inventory: [], mastery: {} };
const playerPraia = { x: 26.5, y: 20.5, mareMissao: { estavaSubmerso: false } };
const res = atualizarMissaoMare({
  map: praia, player: playerPraia, nado: { ativo: true, profundidade: 2 },
  progress: progressPraia, fragmentos: [],
});
assert(res.mergulhou, 'mergulho deveria contar na praia também');
assert(!res.chegouAoFundo, '`reach` do fundo não deveria disparar fora da enseada');
console.log('Fundo da Enseada: só dispara dentro da enseada.');

// --- 5. Missão completa recompensa uma vez --------------------------
const q = getQuest('mare_profunda');
assert(q, 'missão mare_profunda deveria existir');
assert(q.rewards.xp > 0 && q.rewards.flags.mare_profunda_concluida, 'recompensa mal declarada');

const prog = { archetype: 'mare_astral', flags: {}, inventory: [], mastery: {}, questLog: {} };
prog.questLog.mare_profunda = { status: 'active', counters: [0, 0, 0], claimed: false };
for (let i = 0; i < 3; i++) recordQuestEvent(prog, { type: 'mergulho' });
for (let i = 0; i < 4; i++) recordQuestEvent(prog, { type: 'coleta_marinha' });
const concluidas = recordQuestEvent(prog, { type: 'reach', target: 'fundo_enseada' });
assert.equal(concluidas.length, 1, 'deveria concluir exatamente uma missão');
assert(prog.flags.mare_profunda_concluida, 'flag da missão deveria ser gravada');
assert(prog.inventory.includes('semente_de_mare'), 'item da recompensa deveria entrar');
// Repetir o evento não paga de novo.
const denovo = recordQuestEvent(prog, { type: 'reach', target: 'fundo_enseada' });
assert.equal(denovo.length, 0, 'missão concluída não pode pagar duas vezes');
console.log('Recompensa: entregue uma vez, flag e item gravados.');

// A missão não abre sozinha para outro arquétipo (só o onboarding do
// Maré chama startQuest; aqui só verificamos a declaração).
assert.equal(q.giver, 'MARÉ ASTRAL');
assert(!getQuestState({ flags: {} }, 'mare_profunda').status.includes('completed'));

console.log('\nPraia 2.0: missão do Maré fecha o ciclo mergulho → coleta → recompensa.');
