import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { map } from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';
import { state } from '../js/game/state.js';
import { canStandAt, getObjectHitbox, moveWithCollision } from '../js/game/collision.js';
import { getObjectSpriteConfig } from '../js/engine/renderer.js';

const main = readFileSync('js/main.js', 'utf8');
for (const name of ['arvore-referencia-a', 'torre-radio', 'caixa', 'cesto-ferramentas', 'tenda-referencia', 'relogio', 'bancada', 'banco', 'fogueira', 'pilha-caixas']) {
  const path = `assets/sprites/enseada-camp/${name}.png`;
  assert(existsSync(path), `${path}: sprite ausente`);
  assert(main.includes(path), `${path}: sprite não registrado`);
  assert.equal(readFileSync(path)[25], 6, `${path}: deve ser RGBA`);
}
assert.equal(getObjectSpriteConfig('enseada_camp_ref_tenda_referencia').SHEET_COLS, 1);

// O carregador desloca objetos meio tile; as colisões usam essa posição real.
state.objects = map.objects.map(o => ({ ...o, x: o.x + .5, y: o.y + .5 }));
for (const id of ['bancada_campo_enseada', 'acampamento_vigilia_enseada', 'tenda_expedicao_enseada']) {
  const o = state.objects.find(item => item.id === id);
  assert(o && o.bloqueia && getObjectHitbox(o), `${id}: colisão ausente`);
  assert.equal(o.ajusteY ?? 0, 0, `${id}: pé visual não coincide com a posição lógica`);
  assert.equal(o.depthOffset ?? 0, 0, `${id}: profundidade não coincide com o pé`);
  assert(!canStandAt(map, o.x, o.y, .15, state.player), `${id}: centro deve bloquear`);
  for (const delta of [-.8, .8]) {
    assert(canStandAt(map, o.x + delta, o.y + delta, .15, state.player), `${id}: lado ${delta} deve ser acessível`);
    // O renderer ordena por x+y. Os dois lados ficam em ordens opostas.
    assert.equal((o.x + delta) + (o.y + delta) > o.x + o.y, delta > 0);
  }
}
// Confere a rota até o alcance de interação, não apenas a máscara sem objetos.
const spawn = map.spawnPoints.vindo_da_praia;
const queue = [[Math.round(spawn.x * 2), Math.round(spawn.y * 2)]];
const seen = new Set(), reachable = [];
for (let i = 0; i < queue.length; i++) {
  const [ix, iy] = queue[i], key = `${ix},${iy}`;
  if (seen.has(key)) continue;
  seen.add(key);
  const x = ix / 2, y = iy / 2;
  if (!canStandAt(map, x, y, .2, state.player)) continue;
  reachable.push([x, y]);
  queue.push([ix + 1, iy], [ix - 1, iy], [ix, iy + 1], [ix, iy - 1]);
}
for (const id of ['relogio_mare_enseada', 'torre_antena_enseada', 'bancada_campo_enseada', 'acampamento_vigilia_enseada', 'tenda_expedicao_enseada', 'maleta_expedicao_enseada']) {
  const o = state.objects.find(item => item.id === id);
  assert(reachable.some(([x, y]) => Math.hypot(x - o.x, y - o.y) <= o.interacao.distancia), `${id}: interação inacessível`);
}
console.log('Acampamento: artes, pés, colisões e passagem à frente e atrás OK.');

// A subida visual curta não pode ser apenas um desenho sobre colisões fechadas.
const jogador = {x: 16.7, y: 32.7};
for (const [x, y] of [[16.4,32.4],[16.1,32.1],[15.8,31.8],[15.5,31.5],[15.2,31.2],[14.9,30.9],[14.6,30.6]]) {
  moveWithCollision(map, jogador, x - jogador.x, y - jogador.y, .2);
  assert(Math.hypot(jogador.x - x, jogador.y - y) < .001, 'degraus devem ser acessíveis a pé');
}
assert(main.includes('assets/sprites/enseada-estacao/terraco-curto.png'));
// A costa agora é traçada da referência (`tools/tracar-enseada-chao.py`).
// Nesse ponto a arte mostra a encosta verde da montanha, não mar — a
// asserção antiga vinha do preenchimento manual de grade.
const { CHAO } = await import('../js/data/enseada-chao.js');
assert(CHAO[9][21] !== '.', 'tile 21,9 deve ser terra (encosta da estação)');
assert('SMT'.includes(map.aguaPraia[9][21]), 'tile 21,9 deve ser terra caminhável');

// Pedido atual: orientação da tenda/relógio e cesto visível no lugar do painel.
const obj = id => map.objects.find(o => o.id === id);
assert(obj('relogio_mare_enseada').espelhar);
assert(obj('tenda_expedicao_enseada').espelhar);
assert.equal(obj('terminal_frequencia_666').sprite, 'enseada_camp_ref_cesto_ferramentas');
assert.equal(obj('enseada_terraco_acampamento').sprite, 'enseada_camp_chao_completo');
assert(obj('enseada_arvore_camp_esquerda').larguraPx > 159);
assert(obj('enseada_arvore_camp_direita').larguraPx > 136);
// Comparar projeção de tela: o cesto não pode invadir a bancada, e o banco
// deve ficar acima da escada em vez de sobre os seus primeiros degraus.
const tela = o => ({ x: (o.x-o.y)*32, y: (o.x+o.y)*16 });
const bancada = obj('bancada_campo_enseada'), cesto = obj('terminal_frequencia_666');
const banco = obj('enseada_banco_tronco_camp');
assert(tela(cesto).x + cesto.larguraPx/2 <= tela(bancada).x - bancada.larguraPx/2 + 3, 'cesto ao lado da bancada');
assert(tela(banco).y < (18.19 + 37.53)*16 - 25, 'banco retirado do topo da escada');
assert(tela(bancada).y < (15.13 + 36.22)*16 - 10, 'bancada recuada');
// Translação uniforme do conjunto deixa as distâncias relativas intactas.
for (const [id, x, y] of [
  ['relogio_mare_enseada', 12.19, 38.16], ['torre_antena_enseada', 15.09, 33.13],
  ['bancada_campo_enseada', 14.75, 35.84], ['enseada_banco_tronco_camp', 16.465, 37.055],
  ['acampamento_vigilia_enseada', 18.31, 34.78], ['tenda_expedicao_enseada', 18.31, 31.41],
  ['maleta_expedicao_enseada', 21.38, 31.34], ['bandeirola_vento_enseada', 21.5, 29.75],
  ['enseada_caixa_atras_tenda', 16.4, 31.3], ['enseada_caixote_camp', 20.16, 32.94],
  ['terminal_frequencia_666', 13.8, 37.4],
]) {
  assert(Math.abs(obj(id).x - (x - .35)) < 1e-8 && Math.abs(obj(id).y - (y - .35)) < 1e-8, `${id}: translação uniforme`);
}
assert.equal(obj('bandeirola_vento_enseada').larguraPx, 130);
for (const id of ['enseada_lateral_camp_esquerda', 'enseada_lateral_camp_direita']) {
  assert.equal(obj(id).camada, 'fundo');
  assert.equal(obj(id).bloqueia, false);
}
