import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { map as enseada } from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';

const lote10Assets = [
  'bandeirola-vento-expedicao-b',
  'jardim-pedras-equilibrio-b',
  'borboletas-costa-vivas-b',
  'banco-areia-conchas-b',
  'poleiro-aves-costeiro-b',
  'ninho-tartarugas-praia-b',
  'embarcadouro-mare-astral-b',
  'cardume-orla-vivo-b',
  'arco-conduto-mare-b',
];

for (const name of lote10Assets) {
  assert(existsSync(`assets/source-art/enseada-2/${name}.png`), `faltando source-art ${name}`);
  assert(existsSync(`assets/sprites/enseada-2/${name}.png`), `faltando sprite processado ${name}`);
}

assert(existsSync('assets/source-art/enseada-2/enseada-dos-ecos-referencia.png'), 'faltando imagem de referência');

const mainJs = readFileSync('js/main.js', 'utf8');
for (const spriteId of [
  'enseada_bandeirola_vento_b',
  'enseada_jardim_pedras_b',
  'enseada_borboletas_vivas_b',
  'enseada_banco_conchas_b',
  'enseada_poleiro_aves_b',
  'enseada_ninho_tartarugas_b',
  'enseada_embarcadouro_mare_b',
  'enseada_cardume_vivo_b',
  'enseada_arco_conduto_b',
]) {
  assert(mainJs.includes(`id: '${spriteId}'`), `sprite ${spriteId} precisa estar registrado em js/main.js`);
}

for (const [objId, spriteB] of [
  ['bandeirola_vento_enseada', 'enseada_bandeirola_vento_b'],
  ['jardim_pedras_enseada', 'enseada4_cairn'],
  ['borboletas_fonte_enseada', 'enseada_borboletas_vivas_b'],
  ['borboletas_jardim_enseada', 'enseada_borboletas_vivas_b'],
  ['banco_conchas_enseada', 'enseada_banco_conchas_b'],
  ['poleiro_aves_enseada', 'enseada_poleiro_aves_b'],
  ['ninho_tartarugas_enseada', 'enseada_ninho_tartarugas_b'],
  ['embarcadouro_mare_astral', 'enseada_embarcadouro_mare_b'],
  ['cardume_orla_norte', 'enseada_cardume_vivo_b'],
  ['cardume_orla_sul', 'enseada_cardume_vivo_b'],
  ['arco_conduto_retorno_mare', 'enseada3_portal_recife'],
]) {
  const obj = enseada.objects.find(o => o.id === objId);
  assert(obj, `${objId} ausente`);
  assert.equal(obj.spriteB, spriteB, `${objId} deve usar ${spriteB}`);
  assert(obj.animPeriodo > 0, `${objId} deve ter animPeriodo`);
}

console.log('Lote #10 Enseada 2.0 (+9 animações B + imagem master de referência) OK!');
