import assert from 'node:assert/strict';
import { map } from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';
import { VEGETACAO } from '../js/data/enseada-vegetacao.js';

const get = id => { const obj = map.objects.find(o => o.id === id); assert(obj, id); return obj; };
const shell = get('gruta_concha_enseada'), mirror = get('espelho_arquetipos_enseada');
// No isométrico, x-y determina a posição horizontal e x+y a vertical.
assert(Math.abs((shell.x-shell.y)-(mirror.x-mirror.y)) < 1, 'gruta alinhada com espelho');
assert(shell.x+shell.y < mirror.x+mirror.y-5, 'gruta acima do espelho');
assert(shell.larguraPx < mirror.larguraPx, 'gruta proporcional à praça do espelho');
assert.equal(get('santuario_lumeo_enseada').renderizar, false);
assert.notEqual(get('terminal_frequencia_666').x, 24, 'terminal não está mais na areia da estação');
assert.notEqual(get('poste_lanterna_madeira').renderizar, false);
for (const [tipo, x, y] of VEGETACAO) {
  if (!['P', 'M', 'B', 'J', 'T', 'C', 'G'].includes(tipo)) continue;
  const px = x-y, py = x+y;
  assert(!(px > -5 && px < 10 && py > 82 && py < 94), 'vegetação não invade o cais');
}
console.log('Revisão visual: gruta, acessos ao cais e props OK.');
