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
assert.equal(object('portal_caminho_correntes').sprite, 'enseada_correntes_portal_ref');
assert.equal(arco.sprite, 'enseada_sudeste_portal_completo', 'portal usa o promontório completo');
assert.equal(object('enseada_base_rochosa_portal_leste').espelhar, true, 'a subida deve acompanhar a inversão');
const cais = object('cais_madeira_pesca_enseada');
const visualCais = object('cais_enseada_visual');
assert.equal(visualCais.skewY, undefined, 'a perspectiva vem da nova arte, sem cisalhamento');
assert.equal(cais.renderizar, false, 'a interação do cais não deve desenhar um segundo píer');
assert.equal(visualCais.sprite, 'enseada_cais_barco', 'cais deve descer para a direita com veleiro à direita');
const tileCais = map.aguaPraia[Math.floor(visualCais.y + .5)]?.[Math.floor(visualCais.x + .5)];
assert(tileCais && 'YyDdX'.includes(tileCais), 'o cais visual deve estar no mar');
assert.equal(map.walkMask[Math.floor(cais.y + .5)]?.[Math.floor(cais.x + .5)], '.', 'interação do cais deve ficar acessível na costa');
const barco = object('barco_expedicao_enseada');
assert.equal(barco.renderizar, false, 'o veleiro do cais não deve ser duplicado');
assert.equal(map.walkMask[Math.floor(barco.y + .5)]?.[Math.floor(barco.x + .5)], '.', 'a interação do barco deve estar acessível na costa');
for (const id of ['enseada_banco_tronco_camp', 'enseada_palmeira_camp_oeste', 'enseada_palmeira_camp_norte']) assert(object(id));

// Posições projetadas em pixels isométricos, incluindo o ajuste do sprite.
// A ordem e a profundidade são comparadas à composição da referência, não
// apenas às coordenadas x/y que não correspondem aos eixos da imagem.
const camp = id => {
  const o = object(id);
  return { x: (o.x - o.y) * 32 + (o.ajusteX ?? 0), y: (o.x + o.y) * 16 + (o.ajusteY ?? 0) };
};
const clock = camp('relogio_mare_enseada');
const table = camp('bancada_campo_enseada');
const tower = camp('torre_antena_enseada');
const fire = camp('acampamento_vigilia_enseada');
const tent = camp('tenda_expedicao_enseada');
const crates = camp('maleta_expedicao_enseada');
const bench = camp('enseada_banco_tronco_camp');
// Ordem lida da arte de referência, medida em `referencia-mestre.png`:
// relógio (327) < bancada (400) < torre (450) < fogueira (474) < tenda (528)
// < pilha de caixas (577). A versão anterior deste teste exigia a fogueira à
// DIREITA da barraca, o que contradiz o pôster e forçava a fogueira para
// cima do paredão.
assert(clock.x < table.x && table.x < tower.x && tower.x < fire.x && fire.x < tent.x, 'ordem horizontal do acampamento');
assert(crates.x > tent.x, 'pilha de caixas à direita da barraca');
// Na arte a torre sobe ao fundo (acima da bancada e da fogueira) e a tenda
// fica um pouco atrás da fogueira, mas não acima dela.
assert(tower.y < table.y && tower.y < fire.y, 'torre ao fundo do acampamento');
assert(tent.y < fire.y, 'tenda ligeiramente atrás da fogueira');
assert(table.x < bench.x && bench.x < fire.x && bench.y > fire.y, 'banco à frente e à esquerda da fogueira');
assert.equal(object('enseada_banco_tronco_camp').sprite, 'enseada_camp_ref_tronco');
for (const id of ['enseada_arvore_camp_esquerda', 'enseada_arvore_camp_direita', 'enseada_cesto_ferramentas_camp', 'enseada_caixa_atras_tenda', 'enseada_caixote_camp']) assert(object(id));
assert(camp('enseada_caixa_atras_tenda').x < tent.x && camp('enseada_caixa_atras_tenda').y < tent.y && tent.y - camp('enseada_caixa_atras_tenda').y < 40, 'caixa atrás à esquerda da tenda');
// O caixote solto fica à direita da fogueira, aproximadamente alinhado
// com ela em profundidade, conforme as âncoras medidas no pôster.
const caixote = camp('enseada_caixote_camp');
assert(caixote.x > fire.x && caixote.x >= tent.x, 'caixote à direita da fogueira');
assert(Math.abs(caixote.y - fire.y) < 1, 'caixote alinhado à fogueira');
assert(camp('bandeirola_vento_enseada').x > tent.x);
// Os pés visuais e os pontos lógicos coincidem: a ordenação por x+y
// e as hitboxes devem acompanhar o mesmo ponto, sem ajuste de tela.
for (const id of ['acampamento_vigilia_enseada', 'bancada_campo_enseada', 'tenda_expedicao_enseada']) {
  const o = object(id);
  assert.equal(o.ajusteY ?? 0, 0, `${id}: âncora visual deslocada da colisão`);
  assert.equal(o.depthOffset ?? 0, 0, `${id}: ordenação deslocada do pé`);
  assert(o.bloqueia && o.hitbox, `${id}: precisa de colisão`);
}


// A trilha clareia o miolo sem alterar a máscara ou a areia fora do mapa.
const rows = Array.from({length: 13}, (_, y) => Array.from({length: 13}, (_, x) => x === 0 || y === 0 || x === 12 || y === 12 ? 'Y' : 'S').join(''));
const verde = createBeachSurface(rows, 2, {gramaInterior: true});
const trilha = createBeachSurface(rows, 2, {gramaInterior: true, caminhos: [[2, 6.5, 10, 6.5]]});
const pixel = (surface, x, y) => Array.from(surface.pixels.slice((y * surface.width + x) * 4, (y * surface.width + x) * 4 + 4));
assert(pixel(trilha, 13, 13)[0] > pixel(verde, 13, 13)[0], 'caminho deve revelar areia');
for (let i = 3; i < verde.pixels.length; i += 4) assert.equal(verde.pixels[i], trilha.pixels[i]);
console.log('Enseada: trilhas, fauna marinha, terraço e portal leste OK.');
