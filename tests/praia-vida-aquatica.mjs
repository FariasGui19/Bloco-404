// =====================================================================
// PRAIA 2.0 — CONTRATO DA VIDA AQUÁTICA
//
// O mar tem recifes, cardumes, raios e bolhas. Este teste garante que:
//   1. nada nasce fora da água funda (nada de coral na areia);
//   2. o número de coisas é FIXO por mapa (não cresce com o tempo);
//   3. cardumes fogem do jogador e voltam (o mar reage ao mergulho);
//   4. bolhas respeitam teto duro e morrem fora da água;
//   5. o custo por frame continua baixo o bastante para 60 FPS.
// =====================================================================
import assert from 'node:assert/strict';
import {
  getVidaAquatica, criarRecifes, criarCardumes, atualizarCardumes,
  atualizarBolhas, VIDA, CORES_CARDUME,
} from '../js/game/vida-aquatica.js';
import { createCoastField } from '../js/engine/coast-field.js';
import { map as praia } from '../js/data/worlds/arquipelago-rotas-perdidas/praia-inicial.js';
import { map as enseada } from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';

const maps = [praia, enseada];
const campos = Object.fromEntries(maps.map(m => [m.id, createCoastField(m.aguaPraia, 8)]));
const agua = c => 'YyDdX'.includes(c ?? ' ');

// --- 1. Tudo dentro da água funda -------------------------------------
console.log('Onde a vida nasce:');
for (const map of maps) {
  const vida = getVidaAquatica(map);
  const field = campos[map.id];
  const dist = (x, y) => field.distLand[
    Math.min(field.height - 1, Math.floor(y * field.scale)) * field.width
    + Math.min(field.width - 1, Math.floor(x * field.scale))
  ];

  for (const r of vida.recifes) {
    assert(agua(map.aguaPraia[Math.floor(r.y)]?.[Math.floor(r.x)]), `${map.id}: recife fora da água em ${r.x},${r.y}`);
    assert(dist(r.x, r.y) > 1.4, `${map.id}: recife raso demais em ${r.x},${r.y}`);
  }
  for (const c of vida.cardumes) {
    assert(agua(map.aguaPraia[Math.floor(c.homeY)]?.[Math.floor(c.homeX)]), `${map.id}: cardume fora da água`);
  }
  console.log(`  ${map.id.padEnd(20)} ${vida.recifes.length} recifes, ${vida.cardumes.length} cardumes, ${vida.raios.length} raios`);
}

// --- 2. Contagem fixa -------------------------------------------------
for (const map of maps) {
  const vida = getVidaAquatica(map);
  assert(vida.recifes.length <= VIDA.recifesMax, 'recifes passaram do teto');
  assert(vida.cardumes.length <= VIDA.cardumesPorMapa, 'cardumes passaram do teto');
  assert.equal(vida.raios.length, VIDA.raios, 'raios deveriam ser fixos');
  for (const c of vida.cardumes) {
    assert.equal(c.peixes.length, VIDA.peixesPorCardume, 'cardume com número errado de peixes');
    assert(CORES_CARDUME[c.cor], 'cardume com cor inválida');
  }
  // Determinismo: pedir de novo devolve a MESMA instância (cache).
  assert.equal(getVidaAquatica(map), vida, 'a vida aquática deve ser cacheada por mapa');
}

// --- 3. Cardumes reagem ao jogador -----------------------------------
const vida = getVidaAquatica(praia);
const cardume = vida.cardumes[0];
const longe = { x: cardume.x + 30, y: cardume.y + 30 };
const perto = { x: cardume.x, y: cardume.y };

atualizarCardumes(vida.cardumes, longe, .1, false);
assert(cardume.medo < .05, 'cardume não deveria ter medo de jogador distante');

for (let i = 0; i < 20; i++) atualizarCardumes(vida.cardumes, perto, .1, true);
assert(cardume.medo > .4, `cardume deveria se assustar (medo ${cardume.medo.toFixed(2)})`);
const assustado = { x: cardume.x, y: cardume.y };

for (let i = 0; i < 120; i++) atualizarCardumes(vida.cardumes, longe, .1, false);
assert(cardume.medo < .05, 'o medo deveria decair com o tempo');
assert(Math.hypot(cardume.x - assustado.x, cardume.y - assustado.y) > .2, 'o cardume deveria se mover');
console.log(`\nCardume: foge do jogador e retorna (medo ${cardume.medo.toFixed(2)} depois de 12 s).`);

// --- 4. Bolhas: teto e limpeza ---------------------------------------
const bolhas = [];
const nadoSubmerso = { ativo: true, profundidade: 2 };
const jogadorNaAgua = { x: 26.5, y: 20.5 };
for (let i = 0; i < 300; i++) atualizarBolhas(bolhas, jogadorNaAgua, nadoSubmerso, .05, praia);
assert(bolhas.length <= VIDA.bolhasMax, `bolhas estouraram o teto: ${bolhas.length}`);

// Bolha que sai da água some.
const antes = bolhas.length;
for (let i = 0; i < 200; i++) atualizarBolhas(bolhas, { x: 5.5, y: 5.5 }, { ativo: false, profundidade: 0 }, .05, praia);
assert(bolhas.length < antes || bolhas.length === 0, 'bolhas deveriam sumir fora da água');
console.log(`Bolhas: teto de ${VIDA.bolhasMax}, somem ao sair da água.`);

// --- 5. Custo por frame ----------------------------------------------
const t0 = performance.now();
for (let i = 0; i < 60; i++) {
  atualizarCardumes(vida.cardumes, jogadorNaAgua, 1 / 60, true);
  atualizarBolhas(vida.bolhas, jogadorNaAgua, nadoSubmerso, 1 / 60, praia);
}
const msPorFrame = (performance.now() - t0) / 60;
assert(msPorFrame < 1, `simulação da vida aquática custa ${msPorFrame.toFixed(3)} ms por frame`);
console.log(`\nCusto: ${msPorFrame.toFixed(3)} ms por frame (teto 1 ms, orçamento de 60 FPS é 16,7 ms).`);

console.log('\nPraia 2.0: mar com recife, cardume e bolha, dentro do orçamento.');
