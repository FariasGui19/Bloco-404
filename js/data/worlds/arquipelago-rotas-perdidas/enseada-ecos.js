// Primeira expansão jogável: exploração livre, sem exigir troca de arquétipo.
import { buildGround } from '../../ground.js';
const size = 32;
const land = (x, y) => ((x - 15) / 12.5) ** 2 + ((y - 15) / 11.5) ** 2 < 1;
const rows = Array.from({ length: size }, (_, y) => Array.from({ length: size }, (_, x) => {
  if (land(x, y)) {
    const edge = [[-1,0],[1,0],[0,-1],[0,1]].some(([dx,dy]) => !land(x + dx, y + dy));
    return edge ? 'M' : 'S';
  }
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    if (land(x + dx, y + dy)) return 'Y';
  }
  return 'D';
}).join(''));
const ground = buildGround({ sheet: 'BEACH_FLOOR_SPRITE', rows, legend: {
  S: { tiles: [[0,0]], walk: true }, M: { tiles: [[1,0]], walk: true },
  Y: { tiles: [[2,2]], walk: false }, D: { tiles: [[1,1]], walk: false },
} });
const layout = rows.map(row => [...row].map(c => 'SM'.includes(c) ? 0 : 1));
const prop = (id, x, y, col, row, larguraPx) => ({ id, tipo: 'decoracao', x, y,
  sprite: 'beach_props', frame: { col, row }, useCrop: true, larguraPx,
  pivotX: 0.5, pivotY: 1, bloqueia: false });
export const map = {
  id: 'ilha_enseada_ecos',
  meta: { nome: 'ENSEADA DOS ECOS', tipo: 'exterior', dimensao: 'arquipelago', corFundo: '#1e6384',
    estiloPiso: 'livre', useBackgroundWalls: true, sandSprite: 'beach_novas_artes', ambiente: { poeira: 12, cor: '#ffd98a' } },
  corChao: '#e6c280', layout, walkMask: ground.walkMask, pisos: ground.pisos, aguaPraia: rows,
  spawnPoints: { inicio: { x: 6.5, y: 15.5 }, vindo_da_praia: { x: 6.5, y: 15.5 } },
  objects: [
    { id: 'marco_praia', tipo: 'decoracao', x: 5, y: 15, routeMarker: 'PRAIA', bloqueia: false },
    prop('enseada_palmeira_1', 9, 10, 0, 0, 84), prop('enseada_palmeira_2', 21, 9, 1, 0, 85),
    prop('enseada_palmeira_3', 22, 21, 2, 0, 98), prop('enseada_arbusto_1', 11, 21, 3, 0, 48),
    prop('enseada_arbusto_2', 24, 15, 3, 0, 50), prop('enseada_tronco', 16, 18, 3, 1, 62),
    prop('enseada_pedras', 19, 13, 2, 1, 57), prop('enseada_concha', 14, 9, 1, 3, 40),
  ],
  collectibles: [
    { id: 'enseada_rastro_mar', nome: 'RASTRO DA MARÉ', tipo: 'fragmento', x: 10, y: 14, label: 'INVESTIGAR RASTRO DA MARÉ', dialogue: ['UM ECO SE MOVE COM A MARÉ.', 'ALGUÉM MARCOU UMA ROTA ANTES DE VOCÊ.'] },
    { id: 'enseada_rastro_pedra', nome: 'MARCA NO BASALTO', tipo: 'fragmento', x: 19, y: 12, label: 'EXAMINAR MARCA NA PEDRA', dialogue: ['UM SÍMBOLO DESCONHECIDO FOI GRAVADO NA PEDRA.', 'ELE APONTA PARA ALÉM DA ENSEADA.'] },
    { id: 'enseada_rastro_mata', nome: 'VESTÍGIO DA MATA', tipo: 'fragmento', x: 21, y: 20, label: 'EXAMINAR VESTÍGIO DA MATA', dialogue: ['FOLHAS E PEGADAS INDICAM UMA TRILHA PARA O INTERIOR.', 'O CAMINHO PARA O MANGUE AINDA PRECISA SER EXPLORADO.'] },
  ],
  portals: [{ id: 'enseada_retorno', tipo: 'door', x: 5, y: 15, label: 'VOLTAR À PRAIA INICIAL', interactionDistance: 1.4,
    destino: { mapId: 'ilha_praia_inicial', spawnId: 'vindo_da_enseada' }, transition: 'fade' }],
};
