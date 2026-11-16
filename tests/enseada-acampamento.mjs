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
assert('YyDdX'.includes(map.aguaPraia[9][21]), 'mar deve chegar à lateral da estação');
