import assert from 'node:assert/strict';
import { map } from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';
import { CHAO } from '../js/data/enseada-chao.js';
import { pocaEm } from '../js/engine/pocas.js';
import { canStandAt } from '../js/game/collision.js';

const objeto = id => {
  const o = map.objects.find(o => o.id === id);
  assert(o, `${id} ausente`);
  return o;
};
// O chão deve formar uma única ilha, inclusive com conexões diagonais.
const terra = new Set();
for (let y = 0; y < CHAO.length; y++) for (let x = 0; x < CHAO[y].length; x++) {
  if (CHAO[y][x] !== '.') terra.add(`${x},${y}`);
}
const pendentes = [terra.values().next().value];
terra.delete(pendentes[0]);
for (let i = 0; i < pendentes.length; i++) {
  const [x, y] = pendentes[i].split(',').map(Number);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const vizinho = `${x + dx},${y + dy}`;
    if (terra.delete(vizinho)) pendentes.push(vizinho);
  }
}
assert.equal(terra.size, 0, 'não deve haver tiras ou ilhotas de areia soltas');
assert.equal(map.meta.ocultarCordaoBoias, true);
assert(!map.objects.some(o => o.id.startsWith('pedra_correntes_')), 'portal NE sem trilha de pedras');
assert.equal(objeto('portal_submarino_sul').renderizar, false);
assert.equal(objeto('portal_submarino_fundo').renderizar, false);
assert.equal(objeto('capivara_piscina_enseada').renderizar, false);
assert.equal(map.fauna.filter(f => f.species === 'capivara').length, 1);
assert.equal(map.fauna.filter(f => f.species === 'caranguejo').length, 2);
const poca = map.pocas.find(p => p.treino);
assert.equal(poca.renderizar, false);
assert.equal(pocaEm(map, poca.x, poca.y), poca, 'poça continua funcional para treino');
for (const id of ['terminal_frequencia_666', 'santuario_lumeo_enseada', 'ninho_tartarugas_enseada']) {
  const o = objeto(id);
  assert(canStandAt(map, o.x, o.y, 0.2, {}), `${id} deve permanecer acessível`);
  assert(o.interacao || o.moduleSystem, `${id} deve preservar a interação`);
}
console.log('Enseada: limpeza costeira, poça e interações preservadas OK.');
