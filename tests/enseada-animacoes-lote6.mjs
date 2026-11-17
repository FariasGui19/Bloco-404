import assert from 'node:assert/strict';
import fs from 'node:fs';
import { map } from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';
import { VEGETACAO } from '../js/data/enseada-vegetacao.js';

const items = [
  ['cais_enseada_visual','cais-barco',1180,701],
  ['enseada_vegetacao_34','arvores-redondas',734,622],
  ['enseada_ne_mata_3','mata-densa',174,124],
  ['enseada_planta_margem_cascata','planta-cascata',58,49],
  ['corais_amarelos','corais-amarelos',300,361],
  ['coral_rosa','coral-rosa',300,321],
  ['portal_caminho_correntes','portal-correntes',121,155],
  ['travessia_pedras_agua','pedras-runicas',848,511],
  ['concha_praia_central_enseada','concha',484,473],
  ['tartaruga_marinha','tartaruga',300,263],
];
const main = fs.readFileSync('js/main.js', 'utf8');
for (const [id, name, w, h] of items) {
  const o = map.objects.find(o => o.id === id);
  assert(o && o.renderizar !== false && o.useCrop, `${id} visível`);
  const atualizado = { cais_enseada_visual: 'barco', portal_caminho_correntes: 'portal' };
  assert.equal(o.animacaoFolha.sprite, atualizado[id] ? `enseada_folha7_${atualizado[id]}` : `enseada_folha6_${name.replaceAll('-', '_')}`);
  assert.equal(o.animacaoFolha.quadros, 8);
  assert.equal(o.animacaoFolha.margem, atualizado[id] ? 24 : 8);
  assert(o.animacaoFolha.periodo > 0);
  const path = `assets/sprites/enseada-animacao-lote6/${name}.png`;
  if (!atualizado[id]) assert(main.includes(`src: '${path}'`));
  assert(main.includes(`id: '${o.animacaoFolha.sprite}'`));
  const png = fs.readFileSync(path);
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16), (w + 16) * 8);
  assert.equal(png.readUInt32BE(20), h);
}
for (const o of map.objects.filter(o => o.id.startsWith('enseada_vegetacao_'))) {
  const i = Number(o.id.split('_').at(-1)) - 1;
  if ('PMBJCTDF'.includes(VEGETACAO[i][0])) assert(o.animacaoFolha, `${o.id}: vento`);
}
for (const id of ['travessia_pedras_agua','concha_praia_central_enseada']) {
  assert(map.objects.find(o => o.id === id).interacao, `${id}: interação preservada`);
}
assert(map.objects.find(o => o.id === 'enseada_macico_leste').cachoeiraViva);
assert(map.objects.find(o => o.id === 'portal_caminho_correntes').vorticidadeCorrentes);
assert(map.objects.find(o => o.id === 'acampamento_vigilia_enseada').fogueiraViva);
assert(map.ondasMar.length > 0);

// QA opcional: valida conteúdo dos PNGs, e não só sua existência. A mesma
// dependência é usada pelo gerador; o teste estrutural acima não depende dela.
let canvas;
try { canvas = await import('@napi-rs/canvas'); } catch (e) {
  if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e;
}
if (canvas) {
  const { createCanvas, loadImage } = canvas;
  for (const [, name, w, h] of items) {
    const img = await loadImage(`assets/sprites/enseada-animacao-lote6/${name}.png`);
    const c = createCanvas(img.width, h), ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, img.width, h).data, fw = w + 16;
    let changed = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < fw; x++) {
      const a = (y * img.width + x) * 4, b = (y * img.width + x + 2 * fw) * 4;
      if (data[a] !== data[b] || data[a+1] !== data[b+1] || data[a+2] !== data[b+2] || data[a+3] !== data[b+3]) changed++;
      if (name === 'cais-barco' && x >= 8 && x < 700 + 8) {
        assert.deepEqual(data.subarray(a, a+4), data.subarray(b, b+4), 'píer deve ficar imóvel');
      }
    }
    assert(changed > 0, `${name}: quadros distintos`);
  }
}
console.log('Enseada lote 6: dez folhas, vento, ancoragem e interações verificadas.');
