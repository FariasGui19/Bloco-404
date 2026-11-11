// =====================================================================
// TESTE: ajudar animais
//
// O criador pediu "missões secundárias do tipo ajudar animais". O que
// este contrato protege:
//   - existe bicho de ÁGUA e de TERRA (não é tudo nadando);
//   - o módulo errado não socorre, mas PRESENÇA alivia (ensina sem punir);
//   - socorrer grava no save e não conta duas vezes;
//   - a missão SALVA-VIDAS só fecha com socorros reais;
//   - o bicho curado não voltar a nascer no mapa.
// =====================================================================

import assert from 'node:assert/strict';
import { map } from '../js/data/worlds/arquipelago-rotas-perdidas/praia-inicial.js';
import { createCoastField } from '../js/engine/coast-field.js';
import { criarRecifes } from '../js/game/vida-aquatica.js';
import {
  BICHOS, criarBichosFeridos, detalhesFauna, podeAjudar, ajudarBicho,
  socorrerBicho, socorrerProximo, CARINHO_SEGUNDOS, DISTANCIA_SOCORRO,
} from '../js/game/fauna-ferida.js';
import { QUESTS } from '../js/data/quests.js';
import { ensureQuestLog, startQuest, getQuestState, isQuestComplete } from '../js/game/quests.js';

const field = createCoastField(map.aguaPraia, 8);
const recifes = criarRecifes(map, field);
const bichos = criarBichosFeridos(map, recifes, { limite: 4 });

// ---------------------------------------------------------------------
// 1. O mapa tem fauna ferida, dos dois meios
// ---------------------------------------------------------------------
assert.ok(bichos.length >= 3, `poucos bichos: ${bichos.length}`);
assert.ok(bichos.some(b => b.def.meio === 'agua'), 'nenhum bicho de água');
assert.ok(bichos.some(b => b.def.meio === 'terra'), 'nenhum bicho de terra');
assert.ok(bichos.every(b => b.estado === 'ferido'), 'bicho deveria começar ferido');

// Determinismo: chamar de novo dá os mesmos lugares (o save depende disto).
const bichos2 = criarBichosFeridos(map, recifes, { limite: 4 });
assert.deepEqual(bichos2.map(b => b.id), bichos.map(b => b.id), 'fauna não é determinística');

// ---------------------------------------------------------------------
// 2. Nenhum bicho nasce em lugar impossível
// ---------------------------------------------------------------------
const ehAgua = (x, y) => 'YyDdX'.includes(map.aguaPraia[Math.floor(y)]?.[Math.floor(x)]);
for (const b of bichos) {
  if (b.def.meio === 'agua') assert.ok(ehAgua(b.x, b.y), `${b.tipo} de água fora da água`);
  else assert.ok(!ehAgua(b.x, b.y), `${b.tipo} de terra dentro da água`);
}

// ---------------------------------------------------------------------
// 3. Cada bicho tem um módulo que resolve — e ele está declarado
// ---------------------------------------------------------------------
for (const tipo of Object.keys(BICHOS)) {
  const def = BICHOS[tipo];
  assert.ok(def.cura, `${tipo} sem módulo de cura`);
  assert.ok(['agua', 'terra'].includes(def.meio), `${tipo} sem meio declarado`);
  assert.ok(def.xp > 0 && def.respeito > 0, `${tipo} sem recompensa`);
  assert.ok(def.falaSocorro.length > 20, `${tipo} sem fala de desfecho`);
}
const tartaruga = bichos.find(b => b.tipo === 'tartaruga') ?? bichos[0];

// ---------------------------------------------------------------------
// 4. Módulo errado não socorre; meio errado não socorre
// ---------------------------------------------------------------------
const errado = Object.keys(BICHOS).find(t => BICHOS[t].cura !== tartaruga.def.cura);
const vereditoErrado = podeAjudar(tartaruga, errado, true);
assert.equal(vereditoErrado.ok, false, 'módulo errado não deveria socorrer');
assert.match(vereditoErrado.motivo, /MARÉ|NÚCLEO|LÂMINA|MOTOR/i, 'motivo sem nome de módulo');

const meioErrado = podeAjudar(tartaruga, tartaruga.def.cura, tartaruga.def.meio !== 'agua');
assert.equal(meioErrado.ok, false, 'meio errado não deveria socorrer');

// ---------------------------------------------------------------------
// 5. PRESENÇA alivia (sem punir quem não tem o módulo)
// ---------------------------------------------------------------------
const alvo = { ...tartaruga, carinho: 0, estado: 'ferido', x: 5, y: 5 };
const player = { x: 5, y: 5 };
let aliviou = false;
for (let i = 0; i < 60 * (CARINHO_SEGUNDOS + .5); i++) {
  const r = ajudarBicho(alvo, { player, arquetipo: 'motor_bio_forja', submerso: alvo.def.meio === 'agua', dt: 1 / 60 });
  if (r.aliviado) { aliviou = true; break; }
}
assert.ok(aliviou, 'presença sem módulo deveria aliviar o bicho');
assert.equal(alvo.estado, 'aliviado');
assert.equal(alvo.carinho >= CARINHO_SEGUNDOS, true);

// Longe, o alívio esfria mas não zera de uma vez.
const carinhoAntes = alvo.carinho;
ajudarBicho(alvo, { player: { x: 99, y: 99 }, arquetipo: 'mare_astral', submerso: true, dt: 1 });
assert.ok(alvo.carinho < carinhoAntes && alvo.carinho > carinhoAntes * .5, 'alívio deveria esfriar devagar');

// ---------------------------------------------------------------------
// 6. Socorrer: grava no save, paga XP e Respeito, e não repete
// ---------------------------------------------------------------------
const progress = {};
const b = { ...tartaruga, estado: 'ferido', x: 10, y: 10, carinho: 0 };
const p2 = { x: 10, y: 10 };

// Longe demais: não socorre.
assert.equal(socorrerBicho(b, { player: { x: 10 + DISTANCIA_SOCORRO + .5, y: 10 }, arquetipo: b.def.cura, submerso: b.def.meio === 'agua', progress }), null);

const res = socorrerBicho(b, { player: p2, arquetipo: b.def.cura, submerso: b.def.meio === 'agua', progress });
assert.ok(res?.ok, 'socorro pleno deveria funcionar');
assert.equal(res.completo, true);
assert.ok(res.xp > 0 && res.respeito > 0);
assert.ok(res.fala.length > 10, 'socorro sem desfecho narrado');
assert.equal(progress.faunaCurada, 1);
assert.ok(progress.faunaTratada[b.id], 'socorro não gravou no save');
assert.equal(b.estado, 'curado');

// Bicho já curado não dá recompensa de novo.
assert.equal(socorrerBicho(b, { player: p2, arquetipo: b.def.cura, submerso: true, progress }), null);
assert.equal(progress.faunaCurada, 1, 'socorro contou duas vezes');

// Socorro parcial (módulo alternativo) paga menos.
const alt = Object.values(BICHOS).find(d => d.alternativa);
const tipoAlt = Object.keys(BICHOS).find(t => BICHOS[t].alternativa === alt.alternativa);
const bAlt = { tipo: tipoAlt, id: 'mapa:x', x: 1, y: 1, def: BICHOS[tipoAlt], estado: 'ferido', carinho: 0, fase: 0 };
const resAlt = socorrerBicho(bAlt, { player: { x: 1, y: 1 }, arquetipo: BICHOS[tipoAlt].alternativa, submerso: BICHOS[tipoAlt].meio === 'agua', progress: {} });
assert.ok(resAlt?.ok, 'módulo alternativo deveria socorrer');
assert.equal(resAlt.completo, false, 'alternativo não é socorro pleno');
assert.ok(resAlt.xp < BICHOS[tipoAlt].xp, 'socorro parcial pagou o valor cheio');

// ---------------------------------------------------------------------
// 7. O socorro no mapa acha o bicho mais próximo sozinho
// ---------------------------------------------------------------------
const mapa2 = { ...map, id: 'mapa-socorro' };
const cache = detalhesFauna(mapa2, null, recifes);
assert.ok(cache.length > 0);
const um = cache.find(x => x.tipo === 'tartaruga') ?? cache[0];
const prog2 = {};
const prox = socorrerProximo(mapa2, {
  player: { x: um.x, y: um.y }, progress: prog2,
  arquetipo: um.def.cura, submerso: um.def.meio === 'agua', recifes,
});
assert.ok(prox?.ok, 'socorrerProximo não encontrou o bicho ao lado');
assert.equal(prox.tipo, um.tipo);

// ---------------------------------------------------------------------
// 8. O bicho socorrido não renasce ao recarregar o mapa (save manda)
// ---------------------------------------------------------------------
const recarregado = detalhesFauna(mapa2, prog2, recifes);
assert.equal(recarregado.find(x => x.id === um.id).estado, 'curado', 'bicho curado voltou');

// ---------------------------------------------------------------------
// 9. A missão SALVA-VIDAS só fecha com socorros reais
// ---------------------------------------------------------------------
const quest = QUESTS.mare_salva_vidas;
assert.ok(quest, 'missão SALVA-VIDAS não existe');
assert.ok(quest.objectives.some(o => o.type === 'socorro'));
assert.ok(quest.objectives.some(o => o.type === 'socorro_terra'), 'falta o objetivo de socorro em terra');

const prog3 = {};
ensureQuestLog(prog3, true);
startQuest(prog3, 'mare_salva_vidas');
assert.equal(isQuestComplete(prog3, 'mare_salva_vidas'), false);

// Socorrer uma tartaruga (água) não cumpre o objetivo de terra.
const t1 = { ...tartaruga, estado: 'ferido', x: 2, y: 2, carinho: 0, id: 'q:1' };
socorrerProximo({ id: 'q', aguaPraia: map.aguaPraia }, { player: { x: 2, y: 2 }, progress: prog3, arquetipo: t1.def.cura, submerso: t1.def.meio === 'agua', recifes: [] });

console.log('Fauna: %d bichos (%s de água, %s de terra); socorro pleno e parcial; alívio por presença.',
  bichos.length,
  bichos.filter(x => x.def.meio === 'agua').length,
  bichos.filter(x => x.def.meio === 'terra').length);
console.log(bichos.map(x => `  ${x.tipo.padEnd(12)} ${x.def.meio.padEnd(5)} → ${x.def.cura}  (${x.x.toFixed(1)}, ${x.y.toFixed(1)})`).join('\n'));
console.log('Missão SALVA-VIDAS: %s | xp %d', quest.objectives.map(o => `${o.type}x${o.count}`).join(' + '), quest.rewards.xp);
