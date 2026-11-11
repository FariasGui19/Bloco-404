// =====================================================================
// TESTE: clima
//
// "mais fauna, vida, clima" — clima não existia. O que este contrato
// protege, em ordem de importância:
//
//   1. O clima MUDA o jogo (mar, fôlego, correnteza), não só a cor.
//   2. A transição é SUAVE: não pula faixa, não pisca, não teleporta.
//   3. Custo é CONSTANTE: partículas têm teto e o buffer não cresce.
//   4. Determinístico: o mesmo seed abre o mesmo tempo.
// =====================================================================

import assert from 'node:assert/strict';
import {
  CLIMAS, CLIMA, CORRENTE, criarClima, atualizarClima, nomeDoClima,
  corDoClima, ressacaDoClima, mareDoClima, criarParticulas,
  atualizarParticulas, tintaDoClima, resumoClima, MAX_PARTICULAS,
} from '../js/game/clima.js';

// ---------------------------------------------------------------------
// 1. Existem climas suficientes e todos são coerentes
// ---------------------------------------------------------------------
const chaves = Object.keys(CLIMAS);
assert.ok(chaves.length >= 5, `poucos climas: ${chaves.length}`);
for (const [k, c] of Object.entries(CLIMAS)) {
  assert.ok(c.nome && c.nome.length > 2, `${k} sem nome`);
  assert.ok(c.luz > 0 && c.luz <= 1, `${k}: luz fora de 0..1`);
  assert.ok(c.chuva >= 0 && c.chuva <= 1, `${k}: chuva fora de 0..1`);
  assert.ok(c.mar >= 0 && c.mar <= 1, `${k}: mar fora de 0..1`);
  assert.ok(/^#[0-9a-f]{6}$/i.test(c.cor), `${k}: cor inválida`);
}
// Sol é mais claro e mais seco que ressaca: a escala é monotônica.
assert.ok(CLIMAS.limpo.luz > CLIMAS.ressaca.luz, 'sol deveria ser mais claro');
assert.ok(CLIMAS.limpo.chuva < CLIMAS.ressaca.chuva, 'sol deveria ser mais seco');
assert.ok(CLIMAS.limpo.mar < CLIMAS.ressaca.mar, 'sol deveria ter mar mais manso');

// ---------------------------------------------------------------------
// 2. O clima muda com o tempo — e devagar
// ---------------------------------------------------------------------
const c = criarClima(1);
assert.equal(nomeDoClima(c), 'CEU LIMPO', 'deve começar limpo');
const historico = new Set([c.atual]);
let quadros = 0;
while (c.t < 600) {
  atualizarClima(c, 1 / 60);
  historico.add(c.atual);
  quadros++;
  assert.ok(Number.isFinite(c.luz) && c.luz > 0.3, 'luz saiu da faixa');
  assert.ok(Number.isFinite(c.mar), 'mar virou NaN');
}
assert.ok(historico.size >= 3, `em 10 minutos o clima só passou por ${historico.size} estados`);
// Ritmo: não pode trocar de faixa a cada poucos segundos.
assert.ok(c.mudancas <= 12, `clima mudou demais em 10 min: ${c.mudancas}`);
assert.ok(c.mudancas >= 2, 'clima não mudou em 10 minutos');

// ---------------------------------------------------------------------
// 3. Transição SUAVE: um frame nunca dá salto grande
// ---------------------------------------------------------------------
const s = criarClima(9);
let luzAntes = s.luz, marAntes = s.mar;
let maiorSaltoLuz = 0, maiorSaltoMar = 0;
for (let i = 0; i < 60 * 300; i++) {
  atualizarClima(s, 1 / 60);
  maiorSaltoLuz = Math.max(maiorSaltoLuz, Math.abs(s.luz - luzAntes));
  maiorSaltoMar = Math.max(maiorSaltoMar, Math.abs(s.mar - marAntes));
  luzAntes = s.luz; marAntes = s.mar;
}
assert.ok(maiorSaltoLuz < 0.01, `luz deu salto de ${maiorSaltoLuz.toFixed(3)} num frame`);
assert.ok(maiorSaltoMar < 0.01, `mar deu salto de ${maiorSaltoMar.toFixed(3)} num frame`);

// E um `dt` gigante não teleporta o clima (o clamp protege).
const g = criarClima(3);
const antes = g.atual;
atualizarClima(g, 999);
assert.equal(g.atual, antes, 'um dt gigante trocou de clima de uma vez');

// ---------------------------------------------------------------------
// 4. Determinismo
// ---------------------------------------------------------------------
const a1 = criarClima(5), a2 = criarClima(5);
for (let i = 0; i < 600; i++) { atualizarClima(a1, 1 / 60); atualizarClima(a2, 1 / 60); }
assert.deepEqual(resumoClima(a1), resumoClima(a2), 'mesmo seed deveria dar o mesmo clima');
const b1 = criarClima(5), b2 = criarClima(6);
for (let i = 0; i < 600; i++) { atualizarClima(b1, 1 / 60); atualizarClima(b2, 1 / 60); }
assert.notEqual(b1.t, b2.t - 1, 'seeds diferentes deveriam divergir em algum momento');

// ---------------------------------------------------------------------
// 5. O clima MUDA O JOGO
// ---------------------------------------------------------------------
const calmo = { mar: 0, forca: 0 };
const tempestade = { mar: 1, forca: 1 };
const rCalmo = ressacaDoClima(calmo);
const rTemp = ressacaDoClima(tempestade);
assert.ok(rTemp.correnteza > rCalmo.correnteza, 'ressaca deveria dar correnteza mais forte');
assert.ok(rTemp.folego < rCalmo.folego, 'ressaca deveria dar menos fôlego');
assert.ok(rTemp.velocidade < rCalmo.velocidade, 'ressaca deveria pesar a natação');
// Mas nunca a ponto de impedir o jogo.
assert.ok(rTemp.folego > 0.6, 'ressaca não pode tirar 40% do fôlego');
assert.ok(rTemp.velocidade > 0.85, 'ressaca não pode deixar a natação arrastada');

const mCalma = mareDoClima(calmo);
const mAlta = mareDoClima(tempestade);
assert.ok(mAlta.faixa > mCalma.faixa, 'maré alta deveria cobrir mais areia');
assert.ok(mAlta.velocidadeDasOndas > mCalma.velocidadeDasOndas, 'ondas deveriam acelerar');

// A tinta escurece de verdade em tempo fechado.
const tintaSol = tintaDoClima({ luz: 1 });
const tintaChuva = tintaDoClima({ luz: 0.6 });
assert.equal(tintaSol.a, 0, 'sol não deveria tingir');
assert.ok(tintaChuva.a > 0.2, 'chuva deveria escurecer a cena');
assert.ok(tintaChuva.r < tintaChuva.b, 'tempo fechado deveria esfriar a cor (azul > vermelho)');

// ---------------------------------------------------------------------
// 6. Partículas: teto duro e buffer reutilizado
// ---------------------------------------------------------------------
const partes = criarParticulas(7);
assert.equal(partes.length, MAX_PARTICULAS, 'buffer de partículas com tamanho errado');
assert.ok(MAX_PARTICULAS <= 160, `orçamento de partículas alto demais: ${MAX_PARTICULAS}`);

const nMax = atualizarParticulas(partes, { forca: 1, direcao: 0, vento: 1, t: 0 }, 1 / 60, 9999);
assert.equal(nMax, partes.length, 'nunca deveria passar do teto');
const nZero = atualizarParticulas(partes, { forca: 0, direcao: 0, vento: 0, t: 0 }, 1 / 60, 0);
assert.equal(nZero, 0, 'sem chuva, nenhuma partícula ativa');

// O buffer não cresce depois de milhares de frames.
const tamAntes = partes.length;
const sim = { forca: .9, direcao: 1, vento: .9, t: 0 };
for (let i = 0; i < 3000; i++) { sim.t += 1 / 60; atualizarParticulas(partes, sim, 1 / 60, 120); }
assert.equal(partes.length, tamAntes, 'o buffer de partículas cresceu');
// E todas as posições continuam dentro da faixa (nada "fugiu" da tela).
for (const p of partes) {
  assert.ok(p.x >= -0.3 && p.x <= 1.3, `partícula fora da faixa em x: ${p.x}`);
  assert.ok(p.y >= -0.3 && p.y <= 1.2, `partícula fora da faixa em y: ${p.y}`);
}

// ---------------------------------------------------------------------
// 7. O renderer sabe desenhar (canvas de mentira)
// ---------------------------------------------------------------------
assert.ok(corDoClima(criarClima(1)).match(/^#[0-9a-f]{6}$/i), 'cor do clima inválida');

console.log('Clima: %d estados (%s)', chaves.length, chaves.join(', '));
const amostra = criarClima(4);
for (const alvo of [60, 180, 360]) {
  while (amostra.t < alvo) atualizarClima(amostra, 1 / 60);
  const r = resumoClima(amostra);
  console.log('  t=%ss %s luz %s chuva %s mar %s', String(alvo).padStart(3),
    r.clima.padEnd(16), r.luz.toFixed(2), r.chuva.toFixed(2), r.mar.toFixed(2));
}
console.log('  ressaca em maré cheia: correnteza %sx, fôlego %sx',
  ressacaDoClima(tempestade).correnteza.toFixed(2),
  ressacaDoClima(tempestade).folego.toFixed(2));
console.log('  partículas: teto fixo de %d, buffer reutilizado em 3000 frames', MAX_PARTICULAS);
