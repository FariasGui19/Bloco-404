import assert from 'node:assert/strict';
import { map } from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';
import { createBeachSurface } from '../js/engine/beach-surface.js';

const object = id => {
  const item = map.objects.find(o => o.id === id);
  assert(item, `${id} ausente`);
  return item;
};
// O carregador soma meio tile à posição dos objetos; testar onde são desenhados.
for (const id of ['golfinho_saltando', 'golfinho_nadando', 'tartaruga_marinha', 'corais_amarelos', 'coral_rosa', 'cristais_azuis_mar']) {
  const o = object(id);
  const tile = map.aguaPraia[Math.floor(o.y + .5)]?.[Math.floor(o.x + .5)];
  assert('YyDdX'.includes(tile ?? ''), `${id} deve estar no mar, não em ${tile}`);
}
for (const id of ['enseada_terraco_acampamento', 'enseada_base_rochosa_portal_leste']) {
  const o = object(id);
  assert.equal(o.camada, 'fundo');
  assert.equal(o.bloqueia, false);
  assert.equal(o.useCrop, true);
}
const portal = map.portals.find(p => p.id === 'retorno_darsena_mare');
const arco = object('arco_conduto_retorno_mare');
assert(Math.hypot(portal.x - arco.x, portal.y - arco.y) <= 2, 'o portal deve ficar junto à passagem');
assert('YyDdX'.includes(map.aguaPraia[Math.floor(portal.y + .5)][Math.floor(portal.x + .5)]), 'a passagem automática precisa estar na água');
assert.equal(object('portal_caminho_correntes').sprite, 'enseada8_portal_ne');
assert.equal(arco.espelhar, true, 'portal leste deve olhar para a ilha');
const cais = object('cais_madeira_pesca_enseada');
assert.equal(cais.sprite, 'enseada8_cais_barco_ref', 'cais deve descer para a direita com veleiro à direita');
// O centro da interação fica na orla; a extremidade inferior direita
// (cerca de dois tiles à frente) estende-se sobre a água.
const tileCais = map.aguaPraia[Math.floor(cais.y + 1.5)]?.[Math.floor(cais.x + 2.5)];
assert(tileCais && 'YyDdX'.includes(tileCais), 'a ponta do cais deve estar no mar');
const barco = object('barco_expedicao_enseada');
assert.equal(barco.renderizar, false, 'o veleiro do cais não deve ser duplicado');
assert.equal(map.walkMask[Math.floor(barco.y + .5)]?.[Math.floor(barco.x + .5)], '.', 'a interação do barco deve estar acessível na costa');
for (const id of ['enseada_banco_tronco_camp', 'enseada_palmeira_camp_oeste', 'enseada_palmeira_camp_norte']) assert(object(id));

// A trilha clareia o miolo sem alterar a máscara ou a areia fora do mapa.
const rows = Array.from({length: 13}, (_, y) => Array.from({length: 13}, (_, x) => x === 0 || y === 0 || x === 12 || y === 12 ? 'Y' : 'S').join(''));
const verde = createBeachSurface(rows, 2, {gramaInterior: true});
const trilha = createBeachSurface(rows, 2, {gramaInterior: true, caminhos: [[2, 6.5, 10, 6.5]]});
const pixel = (surface, x, y) => Array.from(surface.pixels.slice((y * surface.width + x) * 4, (y * surface.width + x) * 4 + 4));
assert(pixel(trilha, 13, 13)[0] > pixel(verde, 13, 13)[0], 'caminho deve revelar areia');
for (let i = 3; i < verde.pixels.length; i += 4) assert.equal(verde.pixels[i], trilha.pixels[i]);
console.log('Enseada: trilhas, fauna marinha, terraço e portal leste OK.');
