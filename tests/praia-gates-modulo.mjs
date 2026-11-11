// =====================================================================
// TESTE: cada arquétipo tem sua própria cara
//
// O criador: "os gates de cada arquétipo... todos parecem só uma
// barreira pequena e padrão". Este contrato trava a DISTINÇÃO:
// nenhum par de gates de módulos diferentes pode compartilhar a mesma
// identidade visual. Se alguém simplificar o desenho no futuro e dois
// módulos voltarem a parecer iguais, o teste falha.
// =====================================================================

import assert from 'node:assert/strict';
import { map } from '../js/data/worlds/arquipelago-rotas-perdidas/praia-inicial.js';
import { identidadeDoGate, MODULOS, desenharSeloDeModulo } from '../js/engine/selos-modulo.js';

const gates = map.objects.filter(o => o.gate);
assert.ok(gates.length >= 6, `esperava 6 gates, achei ${gates.length}`);

const identidades = gates.map(g => ({ gate: g.id, id: identidadeDoGate(g) }));

// 1. Nenhum gate fica sem identidade (cair no neutro = visual padrão).
for (const { gate, id } of identidades) {
  assert.notEqual(id.id, 'neutro', `gate "${gate}" caiu no visual neutro`);
  assert.ok(id.arquétipos.length >= 1, `gate "${gate}" sem arquétipo mapeado`);
}

// 2. Cada arquétipo tem cor E símbolo próprios — nada de paleta repetida.
const usados = new Set();
for (const [, m] of Object.entries(MODULOS)) {
  if (m === MODULOS.neutro) continue;
  assert.ok(!usados.has(m.cor), `cor ${m.cor} repetida entre módulos`);
  assert.ok(!usados.has(`s:${m.simbolo}`), `símbolo ${m.simbolo} repetido entre módulos`);
  usados.add(m.cor);
  usados.add(`s:${m.simbolo}`);
}
assert.equal(Object.keys(MODULOS).length - 1, 4, 'devem existir exatamente 4 módulos');

// 3. Um gate por arquétipo existe de fato no mapa — a distinção é visível
//    no jogo, não só no código.
const cobertos = new Set(identidades.flatMap(({ id }) => id.arquétipos));
for (const arq of ['mare_astral', 'nucleo_dez_forma', 'lamina_dominio_anciao', 'motor_bio_forja']) {
  assert.ok(cobertos.has(arq), `nenhum gate do mapa usa ${arq}`);
}

// 4. Gate duplo é desenhado como duplo (o segundo módulo aparece).
const duplo = identidades.find(({ id }) => id.arquétipos.length > 1);
assert.ok(duplo, 'a travessia Maré/10X deveria aceitar dois módulos');
assert.equal(duplo.id.id, 'combinado');

// 5. O desenho roda em canvas de mentira sem estourar e produz traços.
function ctxFalso() {
  const tracos = { total: 0, cores: new Set() };
  const anotar = (cor) => { tracos.total++; tracos.cores.add(cor); };
  return {
    tracos,
    save() {}, restore() {}, translate() {}, beginPath() {}, closePath() {}, fill() {},
    stroke() { anotar(this.strokeStyle); },
    fillRect() { anotar(this.fillStyle); },
    strokeRect() {},
    moveTo() {}, lineTo() {}, arc() {}, ellipse() {}, quadraticCurveTo() {},
    createRadialGradient() { return { addColorStop() {} }; },
    set fillStyle(v) { this._f = v; }, get fillStyle() { return this._f; },
    set strokeStyle(v) { this._s = v; }, get strokeStyle() { return this._s; },
    lineWidth: 1, globalAlpha: 1, lineCap: 'round', lineJoin: 'round',
  };
}

for (const { gate, id } of identidades) {
  const ctx = ctxFalso();
  // Sem geometria real de deck: usa a forma mínima que o renderer passa.
  desenharSeloDeModulo(ctx, id, { halfWidth: 1.4, axis: 'x' }, 1.7, false);
  assert.ok(ctx.tracos.total > 3, `gate "${gate}" desenhou quase nada (${ctx.tracos.total} traços)`);
  assert.ok(ctx.tracos.cores.has(id.cor), `gate "${gate}" não usou a cor ${id.cor}`);
}

// 6. Gate vencido desenha apagado — não é um portal aceso a esmo.
const aceso = { n: 0 };
const apagado = { n: 0 };
const contar = (alvo) => {
  const c = ctxFalso();
  const orig = c.stroke.bind(c);
  c.stroke = function () { alvo.n += this.globalAlpha ?? 1; orig(); };
  return c;
};
for (const { id } of identidades.slice(0, 1)) {
  desenharSeloDeModulo(contar(aceso), id, { halfWidth: 1.4, axis: 'x' }, 1.7, false);
  desenharSeloDeModulo(contar(apagado), id, { halfWidth: 1.4, axis: 'x' }, 1.7, true);
}
assert.ok(aceso.n > apagado.n * 2, `gate vencido deveria apagar (${aceso.n.toFixed(1)} vs ${apagado.n.toFixed(1)})`);

console.log('Gates: 4 módulos com cor e símbolo próprios, 6 gates cobertos, 1 duplo.');
console.log(identidades.map(({ gate, id }) => `  ${gate.padEnd(20)} ${id.nome}`).join('\n'));
console.log('Gate vencido apaga o portal.');
