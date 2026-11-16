import assert from 'node:assert/strict';
import { map } from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';
import { createCoastalFauna, updateCoastalFauna, habitatAllows } from '../js/game/fauna-costeira.js';
import { animarFauna } from '../js/game/fauna-animacao.js';

const get = id => map.objects.find(o => o.id === id);
assert(get('enseada_macico_leste').cachoeiraViva, 'cachoeira deve ter animação');
for (const id of ['portal_caminho_correntes', 'arco_conduto_retorno_mare']) {
  assert(get(id).vorticidadeCorrentes, `${id} deve ter vórtice animado`);
}
assert(get('acampamento_vigilia_enseada').fogueiraViva);
const animals = createCoastalFauna(map);
for (const id of ['enseada_golfinho_oeste', 'enseada_golfinho_leste']) {
  const dolphin = animals.find(a => a.id === id);
  assert(dolphin && habitatAllows(map, dolphin.species, dolphin.x, dolphin.y));
  const previous = dolphin.clock;
  const y = animarFauna(dolphin).y;
  for (let i=0;i<30;i++) updateCoastalFauna(map, [dolphin], {x: 35,y: 35}, .1);
  assert(dolphin.clock > previous && animarFauna(dolphin).y !== y, 'salto deve avançar no tempo');
  assert(habitatAllows(map, dolphin.species, dolphin.x, dolphin.y), 'golfinho permanece no mar');
}
assert.equal(get('golfinho_saltando').renderizar, false, 'não duplicar a fauna animada');
assert.equal(get('golfinho_nadando').renderizar, false, 'não duplicar a fauna animada');
console.log('Animações da Enseada: cascata, portais e golfinhos configurados.');
