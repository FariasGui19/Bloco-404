import assert from 'node:assert/strict';
import fs from 'node:fs';
import { map } from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';

// Dimensões do recorte do sprite-base, determinadas pelo mesmo getFrame do renderer.
const items = [
  ['relogio_mare_enseada','relogio',64,199,true],
  ['torre_antena_enseada','antena',100,336,true],
  ['bancada_campo_enseada','bancada',116,135,true],
  ['totem_eco_enseada','monolito',56,102,true],
  ['estela_navegadores_enseada','estela',504,993,true],
  ['piscina_mare_viva_enseada','piscina',688,457,true],
  ['fonte_cristal_enseada','altar',187,314,false],
  ['espelho_arquetipos_enseada','espelho',988,570,true],
  ['cristais_corais_gruta_oeste','cristais',351,264,false],
  ['lanterna_coral_sudeste','lanterna',360,626,false],
];
const main = fs.readFileSync('js/main.js', 'utf8');
for (const [id, name, w, h, interactive] of items) {
  const o = map.objects.find(o => o.id === id);
  assert(o && o.renderizar !== false && o.useCrop, `${id}: objeto visível`);
  assert.equal(Boolean(o.interacao), interactive, `${id}: interação preservada`);
  assert.equal(o.animacaoFolha.sprite, `enseada_folha5_${name}`);
  assert.equal(o.animacaoFolha.quadros, 8);
  assert.equal(o.animacaoFolha.margem, 8);
  assert(o.animacaoFolha.periodo > 0);
  const path = `assets/sprites/enseada-animacao-lote5/${name}.png`;
  assert(main.includes(`id: 'enseada_folha5_${name}', src: '${path}'`));
  const png = fs.readFileSync(path);
  assert.equal(png.subarray(0,8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16), (w + 16) * 8, `${name}: largura`);
  assert.equal(png.readUInt32BE(20), h, `${name}: altura`);
}
console.log('Enseada lote 5: dez folhas registradas, dimensões e interações verificadas.');
