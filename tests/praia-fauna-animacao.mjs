// =====================================================================
// TESTE: fauna nova, clima e animação
//
// "mais fauna, vida, clima" + "melhorar as animações".
//
// Aqui ficam travadas as coisas que fazem a praia PARECER viva em vez de
// só ter mais sprites:
//   - as espécies novas existem, em habitat certo, espalhadas no mapa;
//   - o golfinho SALTA de verdade (arco, tempo no ar, volta pra água);
//   - a animação é determinística e sem alocação por frame;
//   - o clima conversa com o nado.
// =====================================================================

import assert from 'node:assert/strict';
import { map } from '../js/data/worlds/arquipelago-rotas-perdidas/praia-inicial.js';
import { habitatAllows, createCoastalFauna, ehEspecieAquatica } from '../js/game/fauna-costeira.js';
import { animarFauna, PERFIS, criarRespingos, atualizarRespingos } from '../js/game/fauna-animacao.js';
import { criarClima, atualizarClima, ressacaDoClima } from '../js/game/clima.js';
import { criarEstadoNado, atualizarNado } from '../js/game/nado.js';
import { createCoastField } from '../js/engine/coast-field.js';

// ---------------------------------------------------------------------
// 1. As espécies novas existem e estão no mapa
// ---------------------------------------------------------------------
const NOVAS = ['golfinho', 'tartaruga', 'trinta_reis', 'graxaim'];
const especies = new Set(map.fauna.map(a => a.species));
for (const sp of NOVAS) {
  assert.ok(especies.has(sp), `espécie nova ausente do mapa: ${sp}`);
}
// E a fauna antiga não foi perdida.
for (const sp of ['caranguejo', 'gaivota', 'peixes']) {
  assert.ok(especies.has(sp), `espécie antiga sumiu: ${sp}`);
}
assert.ok(map.fauna.length >= 25, `poucos animais: ${map.fauna.length}`);

// ---------------------------------------------------------------------
// 2. Cada um no habitat certo
// ---------------------------------------------------------------------
const ruins = map.fauna.filter(a => !habitatAllows(map, a.species, a.x, a.y));
assert.equal(ruins.length, 0, `animais em habitat errado: ${ruins.map(a => a.id).join(', ')}`);

// Golfinho e tartaruga só em água; trinta-réis e graxaim só em terra.
for (const a of map.fauna) {
  const ch = map.aguaPraia[Math.floor(a.y)]?.[Math.floor(a.x)];
  if (ehEspecieAquatica(a.species)) {
    assert.ok('YyDdX'.includes(ch), `${a.id} (${a.species}) está em "${ch}", deveria ser água`);
  } else {
    assert.ok('SMT'.includes(ch), `${a.id} (${a.species}) está em "${ch}", deveria ser terra`);
  }
}

// Espalhados: nenhum par de animais no mesmo tile (amontoar parece bug).
const vistos = new Set();
for (const a of map.fauna) {
  const k = `${Math.floor(a.x)},${Math.floor(a.y)}`;
  assert.ok(!vistos.has(k), `dois animais no mesmo tile: ${k}`);
  vistos.add(k);
}

// A fauna NOVA (nada de animal novo em mar aberto sem desenho). A fauna
// da praia 2.0 já tinha bichos em 'X' — é herdado e aprovado, não mexo.
for (const a of map.fauna) {
  if (!NOVAS.includes(a.species)) continue;
  assert.notEqual(map.aguaPraia[Math.floor(a.y)]?.[Math.floor(a.x)], 'X',
    `${a.id} (nova) nasceu em mar aberto sem desenho`);
}

// ---------------------------------------------------------------------
// 3. O golfinho SALTA (arco físico, não tremida)
// ---------------------------------------------------------------------
const g = { species: 'golfinho', clock: 0 };
let pico = 0, framesNoAr = 0, rotMin = 0, rotMax = 0;
const N = 60 * PERFIS.golfinho.ciclo;
for (let i = 0; i <= N; i++) {
  g.clock = i / 60;
  const r = animarFauna(g);
  pico = Math.min(pico, r.y);
  if (r.noAr) framesNoAr++;
  rotMin = Math.min(rotMin, r.rot);
  rotMax = Math.max(rotMax, r.rot);
}
const segundosNoAr = framesNoAr / 60;
assert.ok(pico < -18, `salto fraco: só ${(-pico).toFixed(1)} px`);
assert.ok(pico > -50, `salto exagerado: ${(-pico).toFixed(1)} px (parece pulo de desenho animado)`);
assert.ok(segundosNoAr > 0.7 && segundosNoAr < 1.6, `tempo no ar estranho: ${segundosNoAr.toFixed(2)} s`);
// Passa a MAIOR parte do ciclo submerso — o salto precisa valer.
assert.ok(segundosNoAr < PERFIS.golfinho.ciclo * 0.5, 'o golfinho passa tempo demais fora da água');
// Inclinação: sobe com o nariz pra cima e desce com o nariz pra baixo.
assert.ok(rotMin < -0.1 && rotMax > 0.1, 'o golfinho não inclina o corpo no arco');

// ---------------------------------------------------------------------
// 4. Animação é determinística e não aloca
// ---------------------------------------------------------------------
const a1 = { species: 'trinta_reis', clock: 3.21, fleeing: false };
const a2 = { species: 'trinta_reis', clock: 3.21, fleeing: false };
assert.deepEqual(animarFauna(a1), animarFauna(a2), 'animação não é determinística');

const antes = JSON.stringify(animarFauna(a1));
for (let i = 0; i < 1000; i++) animarFauna(a1);
assert.equal(JSON.stringify(animarFauna(a1)), antes, 'animar alterou o registro do animal');

// Cada espécie tem perfil e o ciclo rende quadros variados.
for (const sp of Object.keys(PERFIS)) {
  const quadros = new Set();
  for (let t = 0; t < PERFIS[sp].ciclo; t += 1 / 30) {
    quadros.add(animarFauna({ species: sp, clock: t, fleeing: false }).quadro);
  }
  assert.ok(quadros.size >= 2, `${sp}: sprite não anima (só ${quadros.size} quadro)`);
}

// ---------------------------------------------------------------------
// 5. Respingo tem teto e não vaza
// ---------------------------------------------------------------------
const resp = criarRespingos(8);
assert.equal(resp.length, 8);
for (let i = 0; i < 5000; i++) atualizarRespingos(resp, 1 / 60, .6);
assert.equal(resp.length, 8, 'o buffer de respingo cresceu');
for (const p of resp) {
  assert.ok(Number.isFinite(p.x) && Math.abs(p.x) < 200, 'respingo fugiu do lugar');
  assert.ok(p.vida >= 0 && p.vida <= 1, 'vida do respingo saiu de 0..1');
}

// ---------------------------------------------------------------------
// 6. Clima ↔ nado: ressaca machuca o mergulho
// ---------------------------------------------------------------------
const field = createCoastField(map.aguaPraia, 8);
const pos = { x: 39.5, y: 2.5 };  // água funda
const calmo = criarClima(1);
const bravo = criarClima(1);
for (let i = 0; i < 60 * 380; i++) atualizarClima(bravo, 1 / 60);   // vai para tempo fechado
assert.ok(bravo.mar > calmo.mar, 'o clima não ficou mais agitado');

const nadoCalmo = criarEstadoNado();
const nadoBravo = criarEstadoNado();
atualizarNado(nadoCalmo, { map, x: pos.x, y: pos.y, field, dt: 1 / 60, clima: calmo });
atualizarNado(nadoBravo, { map, x: pos.x, y: pos.y, field, dt: 1 / 60, clima: bravo });
assert.ok(nadoBravo.climaCorrenteza > nadoCalmo.climaCorrenteza, 'ressaca não aumentou a correnteza');
assert.ok(nadoBravo.climaFolego < nadoCalmo.climaFolego, 'ressaca não reduziu o fôlego');

const r = ressacaDoClima(bravo);
assert.ok(r.correnteza > 1 && r.folego < 1, 'ressacaDoClima incoerente');

// ---------------------------------------------------------------------
// 7. O mapa continua são depois de tudo
// ---------------------------------------------------------------------
const vivos = createCoastalFauna(map);
assert.ok(vivos.length >= 25, `fauna criada caiu para ${vivos.length}`);
const porEsp = {};
for (const a of vivos) porEsp[a.species] = (porEsp[a.species] ?? 0) + 1;

console.log(`Fauna: ${vivos.length} animais, ${Object.keys(porEsp).length} espécies`);
console.log('  ' + Object.entries(porEsp).map(([k, v]) => `${k}:${v}`).join('  '));
console.log(`Golfinho: salta ${(-pico).toFixed(0)} px, fica ${segundosNoAr.toFixed(2)}s no ar de ${PERFIS.golfinho.ciclo}s de ciclo (${((1 - segundosNoAr / PERFIS.golfinho.ciclo) * 100).toFixed(0)}% submerso)`);
console.log(`Clima no mar: correnteza ${r.correnteza.toFixed(2)}x, fôlego ${r.folego.toFixed(2)}x em ressaca`);
