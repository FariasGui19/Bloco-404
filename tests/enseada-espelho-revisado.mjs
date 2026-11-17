import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { map } from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';

const obj = id => map.objects.find(o => o.id === id);
const espelho = obj('espelho_arquetipos_enseada');
assert.equal(espelho.sprite, 'enseada_espelho_revisado');
assert.equal(espelho.interacao.label, 'SINTONIZAR ARQUÉTIPO');
assert.deepEqual([espelho.x, espelho.y], [36.35, 50.25]);
assert.equal(obj('enseada3_praca_espelho').renderizar, false, 'não duplicar a praça');
const altar = obj('fonte_cristal_enseada');
assert.equal(altar.sprite, 'enseada_altar_revisado');
assert(altar.bloqueia && altar.brilho, 'altar mantém colisão e brilho');
assert.equal(obj('pedras_fonte_cristal_enseada').sprite, 'enseada_pedras_revisadas');
assert.equal(obj('orla_rochas_sul').renderizar, false);
assert.equal(obj('enseada_arbusto_1').renderizar, false);
assert(!map.objects.some(o => o.id.startsWith('enseada_vegetacao_') && o.x === 38.28 && o.y === 49.94));
const main = readFileSync('js/main.js', 'utf8');
for (const nome of ['espelho', 'altar', 'pedras']) {
  const path = `assets/sprites/enseada-espelho-revisado/${nome}.png`;
  assert(existsSync(path) && main.includes(path), `sprite ${nome} registrado`);
}
assert(obj('rede_treino_praia_enseada').interacao);
assert(obj('gruta_concha_enseada').interacao);
console.log('Espelho, altar e pedras revisados; remoções e interações preservadas.');
