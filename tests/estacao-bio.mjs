import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { map } from '../js/data/worlds/arquipelago-rotas-perdidas/estacao-bio.js';
import { map as praia } from '../js/data/worlds/arquipelago-rotas-perdidas/praia-inicial.js';
import { state } from '../js/game/state.js';
import { loadMap } from '../js/game/map-manager.js';
import { canStandAt } from '../js/game/collision.js';
import { setZoom, camera } from '../js/engine/camera.js';
import { depthLayerOffsets, fatiaObjeto } from '../js/engine/renderer.js';

assert.equal(map.layout.length, 72);
assert(map.layout.every(row => row.length === 72));

// Conectividade pela máscara e, depois, pela colisão real em runtime.
const seen = new Set(), q = [[9, 13]];
for (let i = 0; i < q.length; i++) {
  const [x, y] = q[i], k = `${x},${y}`;
  if (seen.has(k) || map.walkMask[y]?.[x] !== '.') continue;
  seen.add(k); q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
}
for (const item of map.collectibles) assert(seen.has(`${item.x},${item.y}`), `objetivo ${item.id} acessível`);
assert(seen.has('8,13'));
assert.equal(praia.portals.find(p => p.id === 'trilha_estacao_bio').requiresFlag, 'gate_teleferico_quebrado');
assert(praia.spawnPoints.vindo_da_estacao);

state.save.loaded = false; state.save.activeSlot = null;
state.progress = { flags: {}, inventory: [], archetype: 'motor_bio_forja' };
assert(await loadMap(map.id));
setZoom(.3); assert.equal(camera.targetZoom, .85);

const runtimeSeen = new Set(), queue = [[9, 13]];
for (let i = 0; i < queue.length; i++) {
  const [x, y] = queue[i], key = `${x},${y}`;
  if (runtimeSeen.has(key) || !canStandAt(map, x + .5, y + .5, .28, state.player)) continue;
  runtimeSeen.add(key); queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
}
const perto = (x, y, raio = 1.3) => [...runtimeSeen].some(k => {
  const [a, b] = k.split(',').map(Number);
  return Math.hypot(a - x, b - y) <= raio;
});
for (const item of map.collectibles) assert(perto(item.x, item.y), `${item.id}: acesso real à interação`);
for (const id of ['bio_reparo_condutor', 'bio_reparo_regulador', 'bio_valvula_estufa']) {
  const obj = state.objects.find(o => o.id === id);
  assert(perto(obj.x - .5, obj.y - .5, obj.interacao?.distancia ?? 2.2), `${id}: interação alcançável`);
}
assert(runtimeSeen.has('8,13'), 'retorno acessível mesmo com as estruturas');
assert(runtimeSeen.has('9,13'), 'spawn preservado');

// Terminal: hitbox medida, aproximação por vários lados e camadas reais de profundidade.
const terminal = state.objects.find(o => o.id === 'bio_terminal_principal');
assert(terminal.bloqueia);
assert.equal(terminal.hitbox.width, 8.1);
for (const [x, y] of [[16, 8], [15.5, 7], [12, 12.5], [5, 6], [3, 5], [16, 3], [15.5, 10]]) {
  assert(canStandAt(map, x, y, .28, state.player), `aproximação livre em ${x},${y}`);
}
for (const [x, y] of [[9, 5], [12, 8], [7, 7], [8, 6], [14.6, 11.6]]) {
  assert(!canStandAt(map, x, y, .28, state.player), `base sólida em ${x},${y}`);
}
// O terminal é uma peça única: não corta o jogador com faixas horizontais.
assert.equal(terminal.larguraPx, 520);
assert(!terminal.depthLayers);
assert(terminal.x + terminal.y + terminal.depthOffset < 15.7 + 10.2, 'jogador na frente não é recortado pela fachada');
assert.equal(fatiaObjeto({}, 532).sh, 532);
for (const id of ['bio_estufa_principal', 'bio_reator_patio']) {
  assert(state.objects.find(o => o.id === id).depthLayers?.count >= 4, `${id}: camadas reais`);
}

// Pontes: deck caminhável sobre água, água bloqueada, guarda-corpos com profundidade própria.
assert.equal(map.bioBridges.length, 2);
assert(!state.objects.some(o => o.id === 'bio_ponte_patio' || o.id === 'bio_ponte_estufa'),
  'a ponte imagem única ao fundo foi substituída por geometria');
for (const ponte of map.bioBridges) {
  for (let x = ponte.x0; x <= ponte.x1; x++) for (let y = ponte.y0; y <= ponte.y1; y++) {
    assert.equal(map.walkMask[y][x], '.', `deck ${ponte.id} em ${x},${y} é caminhável`);
    assert('Bb'.includes(map.aguaPraia[y][x]), `deck ${ponte.id} em ${x},${y} sobre água`);
    assert(canStandAt(map, x + .5, y + .5, .28, state.player), `pisa no deck ${ponte.id}`);
  }
  const centro = (ponte.x0 + ponte.x1 + 1) / 2 + (ponte.y0 + ponte.y1 + 1) / 2;
  const trilhos = map.bioBridgeRails.filter(r => r.bridgeId === ponte.id);
  assert(trilhos.length >= 8, `${ponte.id}: guarda-corpos por trecho`);
  assert(trilhos.some(r => r.side === 'longe' && r.x + r.y < centro), `${ponte.id}: lado distante atrás`);
  assert(trilhos.some(r => r.side === 'perto' && r.x + r.y > centro), `${ponte.id}: lado próximo à frente`);
}
for (const [x, y] of [[25, 30], [26, 30], [45, 35], [50, 39], [25, 19 - 1], [24, 21]]) {
  if (map.walkMask[y]?.[x] === '#') assert.equal(map.aguaPraia[y][x], 'Y', `canal em ${x},${y} é água`);
}
assert(!canStandAt(map, 25.5, 30.5, .28, state.player), 'água do canal não é caminhável');

// Rede de pressão: todos os pontos ficam sobre piso ou deck, nunca na água.
for (const path of map.bioNetwork.paths) for (const [x, y] of path) {
  assert.equal(map.walkMask[y]?.[x], '.', `conduíte em ${x},${y} apoiado no piso`);
}
assert.equal(map.bioNetwork.nodes.length, 3);

// Quatro imagens estáticas já implementadas (duas por rodada), todas registradas.
for (const arquivo of [
  'assets/sprites/estacao-bio/bio-cabeceira.png',
  'assets/sprites/estacao-bio/bio-distribuidor.png',
  'assets/sprites/estacao-bio/bio-margem-baixa.png',
  'assets/sprites/estacao-bio/bio-fundacao.png',
]) {
  assert(existsSync(new URL('../' + arquivo, import.meta.url)), `arquivo ${arquivo} presente`);
}
const main = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
for (const id of ['bio_cabeceira', 'bio_distribuidor', 'bio_margem_baixa', 'bio_fundacao']) {
  assert(main.includes(`id: '${id}'`), `${id} registrado no carregamento`);
  assert(main.includes(`'${id}'`), `${id} conferido no aviso de arte ausente`);
}
const cabeceiras = state.objects.filter(o => o.sprite === 'bio_cabeceira');
const distribuidores = state.objects.filter(o => o.sprite === 'bio_distribuidor');
assert.equal(cabeceiras.length, 2, 'cabeceiras altas saíram das pontes');
assert.equal(distribuidores.length, 3);
for (const obj of [...cabeceiras, ...distribuidores]) {
  assert(obj.useCrop && obj.larguraPx && obj.sombra, `${obj.id}: escala e apoio declarados`);
  assert(obj.bloqueia && obj.hitbox, `${obj.id}: colisão declarada`);
  assert(!canStandAt(map, obj.x, obj.y, .28, state.player), `${obj.id}: centro bloqueado`);
}
const dentroDeDeck = (o) => map.bioBridges.some(b =>
  o.x - .5 >= b.x0 && o.x - .5 <= b.x1 && o.y - .5 >= b.y0 && o.y - .5 <= b.y1);
for (const obj of cabeceiras) {
  assert(!dentroDeDeck(obj), `${obj.id}: nenhuma lápide sobre o tabuleiro`);
  assert(obj.larguraPx <= 60, `${obj.id}: escala reduzida`);
}

// 0.3.6: margens baixas rente ao solo e fundações proporcionais sob as máquinas.
const margens = state.objects.filter(o => o.sprite === 'bio_margem_baixa');
const fundacoes = state.objects.filter(o => o.sprite === 'bio_fundacao');
assert.equal(margens.length, 32);
assert.equal(fundacoes.length, 9);
for (const obj of [...margens, ...fundacoes]) {
  assert(obj.useCrop && obj.larguraPx && obj.pivotY === 1, `${obj.id}: escala e apoio no chão`);
  assert.equal(obj.bloqueia, false, `${obj.id}: peça rente ao solo não obstrui a rota`);
  assert(obj.depthOffset < 0, `${obj.id}: desenhada atrás da estrutura`);
}
for (const obj of margens) assert(!dentroDeDeck(obj), `${obj.id}: margem fora do tabuleiro`);
for (const obj of fundacoes) {
  const alvo = state.objects.find(o => o.id === obj.id.replace('bio_fundacao_', ''));
  assert(alvo, `${obj.id}: máquina correspondente existe`);
  assert.equal(obj.x, alvo.x, `${obj.id}: mesma posição da máquina`);
  assert.equal(obj.y, alvo.y, `${obj.id}: mesma posição da máquina`);
  assert(obj.larguraPx >= 80 && obj.larguraPx <= 380, `${obj.id}: placa em escala de cenário`);
  if (alvo.larguraPx) {
    assert(obj.larguraPx <= alvo.larguraPx * 1.3,
      `${obj.id}: fundação proporcional à máquina`);
  }
}

// Rota e fechamento explícito da primeira missão do setor.
assert(map.bioRoute.path.length >= 12);
assert.equal(map.bioRoute.stages.length, 4);
for (const [x, y] of map.bioRoute.path) {
  assert.equal(map.walkMask[y]?.[x], '.', `rota em ${x},${y} apoiada no piso`);
}
const journal = readFileSync(new URL('../js/ui/quest-journal.js', import.meta.url), 'utf8');
assert(journal.includes('ESTAÇÃO BIO · PRIMEIRA MISSÃO'), 'diário mostra as etapas da missão');
assert(journal.includes('gate_bio_valvula_estufa'), 'diário lê a flag final');
const portal = map.portals.find(p => p.id === 'estacao_voltar');
assert.equal(portal.missaoFlag, 'gate_bio_valvula_estufa');
assert(portal.labelConcluido);
const valvula = state.objects.find(o => o.id === 'bio_valvula_estufa');
assert.equal(valvula.moduleSystem.requiresFlag, 'gate_bio_reparo_regulador');
assert.equal(valvula.gate.prerequisiteFlag, 'gate_bio_reparo_regulador');
const sucesso = valvula.gate.sucesso.join(' ');
assert(sucesso.includes('PRIMEIRA MISSÃO DO SETOR INICIAL: CONCLUÍDA'), 'fecha a primeira missão');
assert(sucesso.includes('NÚCLEO PROFUNDO') && sucesso.includes('SEM RECOMPENSA'), 'não declara o sistema geral completo');
assert(!valvula.gate.spriteAberto, 'sem recompensa ou novo item disfarçado de sprite');

assert(state.objects.find(o => o.id === 'bio_reator_patio').bloqueia);
assert(state.objects.find(o => o.id === 'bio_estufa_principal').bloqueia);
assert.equal(state.objects.filter(o => o.sprite === 'bio_reator').length, 1);
for (const id of ['bio_plataforma_tecnica', 'bio_margem_canto_entrada', 'bio_margem_cano_patio', 'bio_margem_ruina_trilha', 'bio_margem_mureta_estufa']) {
  const obj = state.objects.find(o => o.id === id);
  assert(obj?.bloqueia && obj.hitbox, `${id}: peça sólida e ancorada`);
  assert(!canStandAt(map, obj.x, obj.y, .28, state.player), `${id}: centro bloqueado`);
}
const modulos = state.objects.filter(o => o.id.startsWith('bio_modulo_'));
assert.equal(modulos.length, 8);
assert.deepEqual(new Set(modulos.map(o => o.sprite)), new Set(['bio_floreira', 'bio_tubos', 'bio_caixa', 'bio_luminaria']));
for (const obj of modulos) {
  assert(obj.bloqueia && obj.hitbox, `${obj.id}: colisão declarada`);
  assert(!canStandAt(map, obj.x, obj.y, .28, state.player), `${obj.id}: centro da peça bloqueado`);
}
assert(!state.objects.some(o => o.id === 'bio_entrada_portal'), 'portal genérico antigo não deve voltar');
assert(await loadMap('hub_saguao'));
setZoom(.3); assert.equal(camera.targetZoom, .3);
console.log('Estação Bio: canais, decks, camadas, colisões, rede, arte e zoom OK.');
