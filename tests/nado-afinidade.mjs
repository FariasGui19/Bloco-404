// node --experimental-default-type=module tests/nado-afinidade.mjs
import assert from 'node:assert/strict';
import { criarEstadoNado, atualizarNado, moverNaAgua, dispararArrancada } from '../js/game/nado.js';
import { criarArvore, SUPERFICIE } from '../js/game/nado-arvore.js';
import { atualizarCardumes } from '../js/game/vida-aquatica.js';

const map = { aguaPraia: ['DDD','DDD','DDD'] };
function mergulhar(livre, mare) {
  const n = criarEstadoNado();
  for (let i = 0; i < 100; i++) atualizarNado(n, { map, x: 1.5, y: 1.5, dt: .02, arvore: criarArvore(3), mergulhar: true, mergulhoLivre: livre, mareAstral: mare });
  return n;
}
const superficie = mergulhar(false, false), mare = mergulhar(true, true), futuro = mergulhar(true, false);
assert.ok(superficie.profundidade <= SUPERFICIE && superficie.submerso, 'outros podem pôr a cabeça na água, mas não chegar ao fundo');
assert.ok(mare.profundidade > 1.8 && futuro.profundidade > 1.8, 'afinidade ou capacidade futura permite o fundo');
assert.ok(mare.respeito.valor > 0 && superficie.respeito.valor === 0);
function impulso(mareAstral, respeito) {
  const n = criarEstadoNado(); n.ativo = true; n.nivel = 3; n.mareAstral = mareAstral; n.respeito.valor = respeito;
  assert.ok(dispararArrancada(n, mareAstral));
  // Arrancada também continua ao soltar a direção.
  moverNaAgua(n, .1, 0, 0, 4);
  return Math.hypot(n.vx, n.vy);
}
assert.ok(impulso(true, 1) > impulso(true, 0));
assert.ok(impulso(true, 0) > impulso(false, 0));
function medo(respeito, dash = 0) {
  const cardume = { x: 1, y: 1, homeX: 1, homeY: 1, fase: 0, vel: 0, raio: 0, medo: 0 };
  atualizarCardumes([cardume], { x: 1.5, y: 1, nado: { mareAstral: true, respeito: { valor: respeito }, arrancada: dash } }, .1, true);
  return cardume.medo;
}
assert.ok(medo(1) < medo(0));
assert.equal(medo(1, 1), medo(0));
console.log('Afinidade, progressão, impulso e resposta da fauna conferidos.');
