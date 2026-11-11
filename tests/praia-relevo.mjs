// Execute: node --experimental-default-type=module tests/praia-relevo.mjs
//
// PRAIA 11 — relevo, flora, poças e mar da referência.
//
// O que este teste protege (e por quê):
//   1. Pedra alta nunca prende ninguém: com as pontes abertas, TODO ponto
//      onde dá para ficar em pé é alcançável a pé a partir do spawn, e
//      nenhum portal, gate ou spawn ficou atrás de pedra.
//   2. As peças existem de verdade: sprite registrado, medidas geradas.
//   3. Paredões são desenhados em tiras com a profundidade do próprio pé.
//   4. Poças ficam sobre areia caminhável; pedras do mar ficam na água.
//   5. O costão deixou de ser "jangada de tábuas".
//   6. A flora espalhada respeita pontes, portais, relevo e poças.
//   7. O mar tem a paleta da referência, cáusticas, moldura e cabe no
//      orçamento de montagem.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { map } from '../js/data/worlds/arquipelago-rotas-perdidas/praia-inicial.js';
import { state } from '../js/game/state.js';
import { canStandAt } from '../js/game/collision.js';
import { loadMap } from '../js/game/map-manager.js';
import { RELEVO_MEDIDAS } from '../js/data/relevo-praia-medidas.js';
import { relevo, spriteDoRelevo } from '../js/data/relevo-praia.js';
import { pocaEm } from '../js/engine/pocas.js';
import {
  createSeaTexture, createSeaTextureForMap, criarLadrilhoCaustico, MARGEM_MAR, PALETA_MAR, WATER_SCALE,
} from '../js/engine/beach-water.js';
import { createCoastField } from '../js/engine/coast-field.js';

const elements = Object.fromEntries(['dialogueBox', 'dialogueSpeaker', 'dialogueText', 'dialogueHint', 'dialogueChoices'].map(id => [id, {
  dataset: {}, classList: { add() {}, remove() {} }, addEventListener() {}, textContent: '', innerHTML: '',
}]));
globalThis.document = { getElementById: id => elements[id] };
globalThis.window = { addEventListener() {} };
const storage = new Map();
globalThis.localStorage = { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) };

const grade = map.aguaPraia;
const LINHAS = grade.length, COLUNAS = grade[0].length;
const pecas = map.objects.filter(o => o.tipo === 'relevo');

// ---------------------------------------------------------------------
// 1. As peças existem
// ---------------------------------------------------------------------
const mainJs = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
assert.ok(pecas.length >= 30, `relevo ralo demais (${pecas.length} peças)`);
for (const o of pecas) {
  assert.ok(RELEVO_MEDIDAS[o.relevo], `${o.id}: peça sem medidas (${o.relevo})`);
  assert.ok(mainJs.includes(`'${o.sprite}'`), `${o.id}: sprite ${o.sprite} não registrado em main.js`);
  assert.ok(o.larguraPx > 0 && !('scale' in o), `${o.id}: cenário se dimensiona com larguraPx, nunca com scale`);
  if (o.cascata) assert.ok(mainJs.includes(`'${o.cascata}'`), `${o.id}: máscara da cascata não registrada`);
}
for (const peca of ['macico-cascata', 'arco-pedra', 'falesia-alta', 'falesia-selva', 'falesia-muro', 'ilhota-palmeiras', 'rochas-mar', 'pilar-cascata']) {
  assert.ok(pecas.some(o => o.relevo === peca), `a peça ${peca} não foi usada no mapa`);
}
// Toda ilha tem pedra alta (a praia não é mais chapada).
const ILHAS = { A: [1, 0, 15, 14], B: [22, 2, 44, 16], C: [1, 22, 17, 39], D: [20, 23, 39, 39], F: [24, 42, 38, 46], enseada: [48, 12, 58, 45], cabo: [0, 48, 44, 63] };
for (const [nome, [x0, y0, x1, y1]] of Object.entries(ILHAS)) {
  const altas = pecas.filter(o => o.alturaPx >= 90 && o.x + .5 >= x0 && o.x + .5 <= x1 + 1 && o.y + .5 >= y0 && o.y + .5 <= y1 + 1);
  assert.ok(altas.length >= 1, `ilha ${nome} sem nenhuma pedra alta`);
}

// ---------------------------------------------------------------------
// 2. Caixas: em MUNDO, espelhadas ou não, e nunca em cima de acesso
// ---------------------------------------------------------------------
{
  const a = relevo('t1', 'falesia-selva', 10, 20, 200, { caixa: [9, 18, 10, 22] });
  assert.deepEqual(a.hitbox, { offsetX: -1, offsetY: -2, width: 1, height: 4 });
  // Espelhado: `collision.js` troca X<->Y, então a caixa é guardada trocada.
  const b = relevo('t2', 'falesia-selva', 10, 20, 200, { espelhar: true, caixa: [8, 19, 12, 20] });
  assert.deepEqual(b.hitbox, { offsetX: -1, offsetY: -2, width: 1, height: 4 });
  const c = relevo('t3', 'macico-cascata', 10, 20, 200, { caixas: [[9, 19, 10, 20], [10, 18, 11, 19]] });
  assert.equal(c.hitboxes.length, 2);
  assert.equal(c.cascata, `${spriteDoRelevo('macico-cascata')}_agua`);
  assert.ok(c.respingo.largura > 10);
}

const acessos = [
  ...Object.entries(map.spawnPoints).map(([id, p]) => ({ id: `spawn ${id}`, x: p.x, y: p.y })),
  ...map.portals.map(p => ({ id: `portal ${p.id}`, x: p.x + .5, y: p.y + .5 })),
  ...map.objects.filter(o => o.gate).map(o => ({ id: `gate ${o.id}`, x: o.x + .5, y: o.y + .5 })),
];
const caixas = pecas.flatMap(o => (o.caixasMundo ?? []).map(c => ({ id: o.id, c })));
for (const { id, c: [x0, y0, x1, y1] } of caixas) {
  for (const a of acessos) {
    const dx = Math.max(x0 - a.x, 0, a.x - x1), dy = Math.max(y0 - a.y, 0, a.y - y1);
    assert.ok(Math.hypot(dx, dy) > 1.2, `${id}: pedra a menos de 1,2 tile de ${a.id}`);
  }
  // Nenhuma pedra sólida em cima de ponte.
  for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
    for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
      assert.ok(!'Bb'.includes(grade[y]?.[x] ?? ' '), `${id}: caixa em cima da ponte em ${x},${y}`);
    }
  }
}

// ---------------------------------------------------------------------
// 3. Paredões em tiras
// ---------------------------------------------------------------------
for (const o of pecas) {
  const m = RELEVO_MEDIDAS[o.relevo];
  if (m.inclinacao == null || o.camada === 'fundo') continue;
  assert.ok(o.colunas?.count >= 2, `${o.id}: parede sem tiras de profundidade`);
  // A arte sem espelho que sobe para a direita ("/") tem o lado ESQUERDO
  // mais perto da câmera: profundidade cai da esquerda para a direita.
  if (m.inclinacao < 0) assert.ok(o.colunas.esq > o.colunas.dir, `${o.id}: tiras invertidas`);
  else assert.ok(o.colunas.esq < o.colunas.dir, `${o.id}: tiras invertidas`);
  // O comprimento coberto pelas tiras é o comprimento da parede em tiles.
  assert.ok(Math.abs(Math.abs(o.colunas.esq - o.colunas.dir) - o.larguraPx / 32) < .01);
}

// ---------------------------------------------------------------------
// 4. Ninguém fica preso: tudo que se pisa é alcançável
// ---------------------------------------------------------------------
state.save.activeSlot = null;
state.progress.flags = {};
for (const o of map.objects) if (o.gate) state.progress.flags[`gate_${o.id}`] = true;
assert.equal(await loadMap('ilha_praia_inicial'), true);

const Q = 4;   // quartos de tile, como em praia.mjs
const visto = new Set([`${8 * Q},${7.5 * Q}`]);
const fila = [[8 * Q, 7.5 * Q]];
for (let i = 0; i < fila.length; i++) {
  const [x, y] = fila[i];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const a = x + dx, b = y + dy, k = `${a},${b}`;
    if (a < 0 || b < 0 || a >= COLUNAS * Q || b >= LINHAS * Q || visto.has(k)) continue;
    if (!canStandAt(map, a / Q, b / Q, .25, state.player)) continue;
    visto.add(k);
    fila.push([a, b]);
  }
}
const presos = [];
let pisaveis = 0;
for (let y = 1; y < LINHAS * Q; y++) {
  for (let x = 1; x < COLUNAS * Q; x++) {
    if (!canStandAt(map, x / Q, y / Q, .25, state.player)) continue;
    pisaveis++;
    if (!visto.has(`${x},${y}`)) presos.push(`${x / Q},${y / Q}`);
  }
}
assert.equal(presos.length, 0, `${presos.length} pontos pisáveis ficaram presos atrás de pedra/flora (ex.: ${presos.slice(0, 8).join(' ')})`);
const perto = (px, py, d) => fila.some(([x, y]) => Math.hypot(x / Q - px, y / Q - py) <= d);
for (const a of acessos) assert.ok(perto(a.x, a.y, 1.6), `${a.id} ficou inalcançável`);
for (const [x, y] of [[30, 9], [9, 31], [30, 31], [30, 44], [53, 30], [25, 55], [61.5, 33.5]]) {
  assert.ok(perto(x, y, 2), `miolo da ilha em ${x},${y} inalcançável`);
}

// ---------------------------------------------------------------------
// 5. Poças sobre areia; pedras do mar na água
// ---------------------------------------------------------------------
assert.ok(map.pocas?.length >= 1, 'a praia precisa de pelo menos uma poça de treino');
const treino = map.pocas.find(p => p.treino);
assert.ok(treino, 'falta a poça de treino (onde se aprende a boiar)');
for (const p of map.pocas) {
  assert.ok(p.profundidade > 0 && p.profundidade < .7, `${p.id}: poça de treino tem que ser RASA`);
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * Math.PI * 2;
    const x = p.x + Math.cos(a) * p.rx * .9, y = p.y + Math.sin(a) * p.ry * .9;
    const c = grade[Math.floor(y)]?.[Math.floor(x)];
    assert.ok('SM'.includes(c), `${p.id}: a poça sai da areia em ${x.toFixed(1)},${y.toFixed(1)} (${c})`);
  }
  // Dá para entrar nela a pé: o centro e pelo menos metade da borda são pisáveis.
  assert.ok(perto(p.x + p.rx * .55, p.y + p.ry * .3, .6), `${p.id}: não dá para chegar na poça`);
  assert.equal(pocaEm(map, p.x, p.y), p);
  assert.equal(pocaEm(map, p.x + p.rx * 1.2, p.y), null);
}
assert.ok(perto(treino.x + .4, treino.y + .2, .5), 'o miolo da poça de treino precisa ser pisável');
assert.equal(pocaEm({}, 1, 1), null);

for (const o of map.objects) {
  const mar = o.relevo === 'rochas-mar' && /^rochas_do_mar_/.test(o.id) || o.flora === 'costa/ilhota_musgo' || o.flora === 'costa/rochas_espuma';
  if (!mar || !/^(rochas_do_mar_|flora_mar_)/.test(o.id)) continue;
  const c = grade[Math.floor(o.y + .5)]?.[Math.floor(o.x + .5)];
  assert.ok('YyDdX'.includes(c), `${o.id}: pedra de mar fora da água (${c})`);
  assert.ok(o.espuma > 0, `${o.id}: pedra de mar sem anel de espuma`);
}

// ---------------------------------------------------------------------
// 6. Costão
// ---------------------------------------------------------------------
const costao = Object.keys(map.costao ?? {});
assert.ok(costao.length > 60, 'o costão do Cabo do Eco sumiu');
for (const k of costao) {
  const [x, y] = k.split(',').map(Number);
  assert.equal(grade[y][x], 'R', `costão em célula que não é rocha (${k})`);
  assert.ok(y >= map.nucleo.tamanho, 'costão não entra no núcleo aprovado');
}
for (let y = map.nucleo.tamanho; y < LINHAS; y++) {
  for (let x = 0; x < COLUNAS; x++) {
    if (grade[y][x] === 'R') assert.ok(map.costao[`${x},${y}`], `rocha em ${x},${y} sairia com o ladrilho da plataforma do trem`);
  }
}
const renderer = readFileSync(new URL('../js/engine/renderer.js', import.meta.url), 'utf8');
assert.match(renderer, /map\.costao\?\.\[/, 'o renderer precisa desenhar o costão como pedra');

// ---------------------------------------------------------------------
// 7. Flora espalhada
// ---------------------------------------------------------------------
const espalhada = map.objects.filter(o => /^flora_/.test(o.id));
assert.ok(espalhada.length >= 70, `flora espalhada rala (${espalhada.length})`);
assert.ok(map.objects.length >= 320 && map.objects.length <= 440, `total de objetos fora da faixa (${map.objects.length})`);
const ids = new Set();
for (const o of map.objects) { assert.ok(!ids.has(o.id), `id repetido: ${o.id}`); ids.add(o.id); }
for (const o of espalhada) {
  const wx = o.x + .5, wy = o.y + .5, cx = Math.floor(wx), cy = Math.floor(wy);
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    assert.ok(!'Bb'.includes(grade[cy + dy]?.[cx + dx] ?? ' '), `${o.id}: flora a menos de 2 tiles de ponte`);
  }
  for (const a of acessos) assert.ok(Math.hypot(a.x - wx, a.y - wy) >= 2, `${o.id}: flora em cima de ${a.id}`);
  for (const { id, c: [x0, y0, x1, y1] } of caixas) {
    assert.ok(!(wx > x0 && wx < x1 && wy > y0 && wy < y1), `${o.id}: flora dentro da pedra ${id}`);
  }
  assert.equal(pocaEm(map, wx, wy), null, `${o.id}: flora dentro de poça`);
  assert.ok(!(cx < 16 && cy < 15), `${o.id}: a ilha de chegada é desenhada à mão`);
}
// Nenhum prop do sorteio antigo ficou dentro de pedra.
for (const o of map.objects) {
  if (o.tipo === 'relevo' || !/_\d+_\d+$/.test(o.id)) continue;
  for (const { id, c: [x0, y0, x1, y1] } of caixas) {
    assert.ok(!(o.x + .5 > x0 && o.x + .5 < x1 && o.y + .5 > y0 && o.y + .5 < y1), `${o.id}: prop dentro da pedra ${id}`);
  }
}

// ---------------------------------------------------------------------
// 8. O mar da referência
// ---------------------------------------------------------------------
// Paleta: raso claro e esverdeado, fundo escuro e azulado.
const [, raso] = PALETA_MAR.rampa[1], [, fundo] = PALETA_MAR.rampa.at(-1);
assert.ok(raso[1] > raso[2] && raso[1] > 200, 'raso deve ser turquesa (verde > azul)');
assert.ok(fundo[2] > fundo[1] && fundo[0] < 20, 'mar aberto deve ser azul escuro');
assert.equal(map.meta.corFundo, PALETA_MAR.fundo, 'a cor de fundo do mapa emenda com o mar aberto');

const t0 = performance.now();
const mar = createSeaTextureForMap(map);
const msMar = performance.now() - t0;
const t1 = performance.now();
createCoastField(grade, WATER_SCALE);
const msCampo = performance.now() - t1;
assert.ok(msMar + msCampo < 350, `montagem do mar com moldura lenta (${(msMar + msCampo).toFixed(0)} ms)`);
assert.equal(mar.margem, MARGEM_MAR);
assert.equal(mar.width, (COLUNAS + MARGEM_MAR * 2) * WATER_SCALE);

const px = (wx, wy) => {
  const x = Math.floor((wx + mar.margem) * mar.scale), y = Math.floor((wy + mar.margem) * mar.scale);
  const i = (y * mar.width + x) * 4;
  return { r: mar.pixels[i], g: mar.pixels[i + 1], b: mar.pixels[i + 2], a: mar.pixels[i + 3], luz: mar.luz[y * mar.width + x] };
};
// A moldura some na borda (sem corte reto) e existe água além do mapa.
assert.equal(px(-MARGEM_MAR + .02, 10).a, 0, 'a borda da textura deve sumir por completo');
assert.ok(px(-1.5, 9).a > 200, 'a oeste da ilha de chegada o mar continua além do mapa');
// Areia não recebe mar; água rasa é clara; mar aberto é escuro.
assert.equal(px(8.5, 9.5).a, 0, 'miolo de areia não é pintado pelo mar');
const lagoa = px(17.5, 9.5), aberto = px(60.5, 55.5);
assert.ok(lagoa.g > 150 && lagoa.g > lagoa.b, `água rasa deveria ser verde-água (${JSON.stringify(lagoa)})`);
assert.ok(aberto.g < 120 && aberto.b > aberto.g, `mar aberto deveria ser azul escuro (${JSON.stringify(aberto)})`);
// Cáusticas: máscara de luz forte no raso, quase nada no fundo, zero em terra.
let luzRaso = 0, luzFundo = 0, nRaso = 0, nFundo = 0;
for (let y = 0; y < LINHAS; y++) for (let x = 0; x < COLUNAS; x++) {
  const c = grade[y][x], p = px(x + .5, y + .5);
  if (c === 'Y' || c === 'y') { luzRaso += p.luz; nRaso++; }
  if (c === 'X') { luzFundo += p.luz; nFundo++; }
  if (c === 'S') assert.equal(p.luz, 0, 'areia não tem cáustica');
}
assert.ok(luzRaso / nRaso > 120, 'o raso deveria estar cheio de luz');
assert.ok(luzFundo / nFundo < luzRaso / nRaso * .6, 'a luz deveria apagar no fundo');
// O ladrilho da rede repete sem emenda e é mesmo uma rede (parte clara, parte vazia).
const lad = criarLadrilhoCaustico(96);
let claros = 0;
for (const v of lad.alpha) if (v > 128) claros++;
const fracao = claros / lad.alpha.length;
assert.ok(fracao > .08 && fracao < .5, `rede de cáusticas degenerada (${(fracao * 100).toFixed(0)} % claro)`);
// Determinismo e costa idêntica à do jogo (a moldura não desloca a espuma).
assert.deepEqual(createSeaTextureForMap(map).pixels, mar.pixels);
const semMoldura = createSeaTexture(grade);
let iguais = 0, total = 0;
// (fora dos 3 tiles da borda, onde a textura sem moldura já está sumindo)
for (let y = 3 * WATER_SCALE; y < (LINHAS - 3) * WATER_SCALE; y += 3) {
  for (let x = 3 * WATER_SCALE; x < (COLUNAS - 3) * WATER_SCALE; x += 3) {
    const a = semMoldura.pixels[(y * semMoldura.width + x) * 4 + 3];
    const b = mar.pixels[((y + mar.margem * WATER_SCALE) * mar.width + x + mar.margem * WATER_SCALE) * 4 + 3];
    total++;
    if (Math.abs(a - b) <= 2) iguais++;
  }
}
assert.ok(iguais / total > .999, `a moldura mexeu no recorte da costa (${(iguais / total * 100).toFixed(2)} % igual)`);

console.log(`Praia 11: ${pecas.length} peças de relevo, ${espalhada.length} floras espalhadas, ${map.objects.length} objetos, ` +
  `${pisaveis} pontos pisáveis todos alcançáveis, ${costao.length} lajes de costão, mar em ${(msMar + msCampo).toFixed(0)} ms.`);
