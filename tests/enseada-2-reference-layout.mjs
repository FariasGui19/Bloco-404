import assert from 'node:assert/strict';
import { map as enseada } from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';

const objects = enseada.objects;
const byId = id => {
  const object = objects.find(item => item.id === id);
  assert(object, `elemento visual ${id} ausente`);
  return object;
};

// Marcos que compõem a leitura espacial da referência (entrada oeste,
// Estação 66.6 no paredão, santuário central, refúgio sul e baía leste).
assert.equal(byId('portico_trilha_praia').x, 5);
assert.equal(byId('porta_estacao_666_visual').x, 18);
assert.equal(byId('santuario_lumeo_enseada').x, 23.2);
assert.equal(byId('fonte_termal_enseada').y, 26.8);
assert.equal(byId('portal_caminho_correntes').x, 25);
assert.equal(byId('barco_expedicao_enseada').y, 18.6);
assert(byId('porta_estacao_666_visual').larguraPx <= 250, 'a estação deve aparecer embutida no relevo, sem dominar a ilha');
assert.equal(byId('enseada_falesia_selva_norte').relevo, 'falesia-selva');
assert(byId('enseada_macico_leste').larguraPx >= 330, 'o platô com cascata precisa ter escala de marco principal');

// A composição tropical foi reforçada usando o kit costeiro existente, sem
// transformar as novas peças em bloqueios nem quebrar trilhas/portais.
const foliage = objects.filter(item => item.id.startsWith('enseada_palmeiral_') ||
  item.id.startsWith('enseada_monstera_') || item.id.startsWith('enseada_bromelias_') ||
  item.id.startsWith('enseada_flores_') || item.id.startsWith('enseada_samambaias_') ||
  item.id.startsWith('enseada_rochedo_') || item.id === 'enseada_rochas_jardim');
assert(foliage.length >= 18, `mata tropical insuficientemente preenchida: ${foliage.length} peças`);
assert(foliage.every(item => !item.bloqueia), 'flora adicionada não pode fechar a circulação');
assert.equal(new Set(objects.map(item => item.id)).size, objects.length, 'IDs de objetos duplicados');

for (const object of objects) {
  assert(Number.isFinite(object.x) && Number.isFinite(object.y), `${object.id}: posição inválida`);
}

console.log('Enseada: layout de referência, escala da Estação e mata costeira OK.');
