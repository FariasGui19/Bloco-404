// =====================================================================
// PRAIA 2.0 — CONTRATO DO NADO
//
// O mergulho é o pedido central do criador ("livre e fluido"). Este teste
// trava as regras que fazem ele ser livre sem quebrar o que já existia:
//
//   1. em TERRA quem manda continua sendo `walkMask` (nada de andar no mar
//      por engano nem de perder chão aprovado);
//   2. em ÁGUA dá para nadar, e a profundidade varia (raso → fundo);
//   3. ar acaba se você ficar submerso e volta ao subir;
//   4. o Maré Astral alinhado dá propulsão melhor que o normal;
//   5. a velocidade nadando NUNCA passa da velocidade andando (leveza e
//      equilíbrio: a água não pode virar atalho).
// =====================================================================
import assert from 'node:assert/strict';
import {
  NADO, isAgua, podeNadar, profundidadeEm, estaNaSuperficie,
  criarEstadoNado, atualizarNado, dispararArrancada,
  multiplicadorVelocidade, destinoValido, esforcoDeNado,
  moverNaAgua, correnteEm, fatorCorrente, ganharRespeito, derivadosDoRespeito,
} from '../js/game/nado.js';
import { createCoastField } from '../js/engine/coast-field.js';
import { map as praia } from '../js/data/worlds/arquipelago-rotas-perdidas/praia-inicial.js';
import { map as enseada } from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';

const maps = [praia, enseada];
const campo = Object.fromEntries(maps.map(m => [m.id, createCoastField(m.aguaPraia, 12)]));

// --- 1. Terra continua mandada pela walkMask ---------------------------
console.log('Terra continua sendo walkMask:');
for (const map of maps) {
  let andavel = 0, bloqueado = 0, erros = 0;
  const linhas = map.walkMask ?? map.aguaPraia.map(() => '.'.repeat(map.aguaPraia[0].length));
  for (let y = 0; y < linhas.length; y++) {
    for (let x = 0; x < linhas[y].length; x++) {
      const mascara = linhas[y][x] === '.';
      const ok = destinoValido(map, x + .5, y + .5);
      // Na água o destino é válido mesmo com máscara fechada (é nado).
      const agua = podeNadar(map, x + .5, y + .5);
      if (mascara) { andavel++; if (!ok) erros++; }
      else if (!agua) { bloqueado++; if (ok) erros++; }
    }
  }
  assert.equal(erros, 0, `${map.id}: ${erros} células com destino errado`);
  // A checagem "máscara tem chão e parede" só vale para quem declara
  // walkMask. A praia declara; a enseada resolve tudo pelo layout.
  if (map.walkMask) {
    const fechadas = map.walkMask.join('').split('').filter(c => c !== '.').length;
    assert(andavel > 0, `${map.id}: máscara sem chão`);
    assert(fechadas > 0, `${map.id}: máscara sem bloqueio`);
  }
  console.log(`  ${map.id.padEnd(20)} ${andavel} células de chão, ${bloqueado} bloqueadas, ${erros} erros`);
}

// --- 2. Água é nadável, com raso e fundo de verdade --------------------
console.log('\nProfundidade da água:');
for (const map of maps) {
  const field = campo[map.id];
  let rasa = 0, funda = 0;
  for (let y = 0; y < map.aguaPraia.length; y++) {
    for (let x = 0; x < map.aguaPraia[y].length; x++) {
      if (!isAgua(map.aguaPraia[y][x])) continue;
      assert(podeNadar(map, x + .5, y + .5), `${map.id}: água ${x},${y} não nadável`);
      const p = profundidadeEm(map, x + .5, y + .5, field);
      assert(p >= 0 && p <= 2, `${map.id}: profundidade fora da faixa em ${x},${y}: ${p}`);
      if (p < 1.25) rasa++; else funda++;
    }
  }
  assert(rasa > 0, `${map.id}: nenhuma água rasa`);
  assert(funda > 0, `${map.id}: nenhuma água funda`);
  console.log(`  ${map.id.padEnd(20)} ${rasa} células rasas (dá pé), ${funda} células de mergulho`);
}

// --- 3. Ar: acaba submerso, volta na superfície -----------------------
const nado = criarEstadoNado();
const ctxFundo = { map: praia, x: 26.5, y: 20.5, field: campo[praia.id], dt: .05 };
// Um quadro só já liga o nado; a profundidade VISUAL suaviza em alguns
// quadros (ela é a suavização do renderer, não a regra de jogo).
atualizarNado(nado, ctxFundo);
assert(nado.ativo, 'um quadro em água já deveria ligar o nado');
for (let i = 0; i < 40; i++) atualizarNado(nado, ctxFundo);
assert(nado.ativo, 'deveria estar nadando em água funda');
assert(nado.submerso, 'água funda deveria ser submerso');
assert(!estaNaSuperficie(nado.profundidade), 'profundidade deveria ser de mergulho');

for (let i = 0; i < 10; i++) atualizarNado(nado, { ...ctxFundo, dt: .1 });
const arDepois = nado.ar;
for (let i = 0; i < 300; i++) atualizarNado(nado, { ...ctxFundo, dt: .1 });
assert(nado.ar < arDepois, 'o ar não está caindo submerso');
assert(nado.afogando, 'ar zerado deveria marcar afogamento');
const efeito = atualizarNado(nado, { ...ctxFundo, dt: .5 });
assert(efeito.dano > 0 && efeito.semAr, 'afogamento deveria causar dano');

// Voltar para a areia recupera o ar.
const ctxTerra = { map: praia, x: 5.5, y: 5.5, field: campo[praia.id], dt: .5 };
for (let i = 0; i < 12; i++) atualizarNado(nado, ctxTerra);
assert(!nado.ativo, 'na areia não deveria estar nadando');
assert(!nado.afogando && nado.ar > 0, 'o ar deveria recuperar fora da água');
console.log(`\nAr: ${NADO.arMaximo}s submerso, recupera a ${NADO.recuperacao}/s.`);

// --- 4. Arrancada do Maré ---------------------------------------------
const p1 = criarEstadoNado();
p1.ativo = true;
assert(dispararArrancada(p1, true), 'deveria arrancar com Maré alinhado');
assert(!dispararArrancada(p1, true), 'não deveria arrancar em recarga');
assert(p1.arrancada > 0 && p1.recargaArrancada > 0);

const p2 = criarEstadoNado();
p2.ativo = true;
dispararArrancada(p2, false);
assert(p1.arrancada > p2.arrancada, 'Maré Astral deve dar arrancada mais longa');
assert(p1.recargaArrancada < p2.recargaArrancada, 'Maré Astral deve recarregar mais rápido');
assert(!dispararArrancada(criarEstadoNado(), true), 'não deveria arrancar em terra');
console.log('Arrancada: Maré Astral dá impulso mais longo e recarga menor.');

// --- 4b. Correnteza existe e muda com o lugar -------------------------
const c1 = correnteEm(5, 5, 0);
const c2 = correnteEm(30, 18, 0);
assert(c1.forca >= 0 && c1.forca <= 1, 'força da corrente fora de 0..1');
assert(Math.abs(c1.x - c2.x) > .001 || Math.abs(c1.y - c2.y) > .001,
  'a corrente deveria variar de lugar para lugar');
const aFavor = fatorCorrente({ x: .5, y: 0, forca: 1 }, 1, 0);
const contra = fatorCorrente({ x: -.5, y: 0, forca: 1 }, 1, 0);
assert(aFavor > contra, 'nadar a favor deveria ser mais rápido que contra');
console.log(`Correnteza: a favor ${aFavor.toFixed(2)}x, contra ${contra.toFixed(2)}x.`);

// --- 4c. Inércia e planeio (a sensação de natação) -------------------
const nav = criarEstadoNado();
const campoNado = createCoastField(praia.aguaPraia, 8);
let px = 26.5;
for (let i = 0; i < 120; i++) {
  atualizarNado(nav, { map: praia, x: px, y: 20.5, field: campoNado, dt: 1 / 60, tempo: i / 60 });
  px += moverNaAgua(nav, 1 / 60, 1, 0, 4.0).dx;
}
const velNadando = nav.vx;
assert(velNadando > 2.5 && velNadando < 4.0,
  `velocidade nadando fora da faixa: ${velNadando.toFixed(2)} tiles/s`);

const antesPlaneio = px;
for (let i = 0; i < 90; i++) {
  atualizarNado(nav, { map: praia, x: px, y: 20.5, field: campoNado, dt: 1 / 60, tempo: i / 60 });
  px += moverNaAgua(nav, 1 / 60, 0, 0, 4.0).dx;
}
const planeio = px - antesPlaneio;
assert(planeio > 1.0, `planeio curto demais: ${planeio.toFixed(2)} tiles em 1,5 s`);
console.log(`Inércia: ${velNadando.toFixed(2)} tiles/s nadando, ${planeio.toFixed(2)} tiles de planeio.`);

// --- 4d. Respeito do mar: progride e nunca cai -----------------------
const resp = criarEstadoNado().respeito;
const d0 = derivadosDoRespeito(resp);
ganharRespeito(resp, .5);
const d1 = derivadosDoRespeito(resp);
assert(d1.velocidade > d0.velocidade, 'respeito deveria acelerar o nado');
assert(d1.ar > d0.ar, 'respeito deveria aumentar o fôlego');
ganharRespeito(resp, -1);
assert(derivadosDoRespeito(resp).valor === d1.valor, 'respeito não pode cair com valor negativo');
ganharRespeito(resp, 99);
assert(derivadosDoRespeito(resp).valor <= 1, 'respeito deveria saturar em 1');
console.log(`Respeito: 0 -> ${d1.valor.toFixed(2)} dá ${d1.velocidade.toFixed(2)}x de velocidade e ${d1.ar.toFixed(2)}x de ar.`);

// --- 5. Nadar nunca é atalho -----------------------------------------
const base = 100;
const terra = criarEstadoNado();
const raso = criarEstadoNado(); raso.ativo = true; raso.profundidade = .6;
const fundo = criarEstadoNado(); fundo.ativo = true; fundo.profundidade = 2; fundo.submerso = true;
assert.equal(multiplicadorVelocidade(terra, base), base);
assert(multiplicadorVelocidade(raso, base) < base, 'nadar no raso deveria ser mais lento que andar');
assert(multiplicadorVelocidade(fundo, base) < base, 'nadar fundo deveria ser mais lento que andar');
assert.equal(esforcoDeNado(0), 0);
assert(esforcoDeNado(2) > esforcoDeNado(.6), 'mergulho deveria custar mais esforço');
console.log(`Velocidade: andar ${base} | raso ${multiplicadorVelocidade(raso, base).toFixed(0)} | fundo ${multiplicadorVelocidade(fundo, base).toFixed(0)}`);

console.log('\nPraia 2.0: mergulho livre, profundo e sem virar atalho.');
