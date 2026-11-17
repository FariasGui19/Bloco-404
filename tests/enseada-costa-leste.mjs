import assert from 'node:assert/strict';
import { map } from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';
import { VEGETACAO } from '../js/data/enseada-vegetacao.js';
import { createBeachSurface } from '../js/engine/beach-surface.js';
for(const [x,y] of [[24,12],[28,16],[34,18],[39,19]]) {
 assert('YyDdX'.includes(map.aguaPraia[y][x]),`recuo leste ${x},${y}`);
 assert.equal(map.walkMask[y][x],'#');
}
assert(!VEGETACAO.some(([,x,y])=>x===44.2 && y===50.15), 'palmeira ao lado das runas removida');
const surface=createBeachSurface(map.aguaPraia,8,{celulasGrama:map.celulasGrama,
 ajusteSolo:map.ajusteSolo,ajusteSoloCentral:map.ajusteSoloCentral,
 ajusteSoloSudeste:map.ajusteSoloSudeste,areiaPraiaSul:map.areiaPraiaSul,
 areiaCostaLeste:map.areiaCostaLeste,trilhaEstacaoPortal:map.trilhaEstacaoPortal});
const i=(Math.floor(21.10*8)*surface.width+Math.floor(39.47*8))*4;
assert(surface.pixels[i]>surface.pixels[i+1] && surface.pixels[i+3]===255, 'margem leste arenosa');
console.log('Costa leste: recuo, faixa de areia e remoção da palmeira OK.');
