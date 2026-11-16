import assert from 'node:assert/strict';
import { getObjectSpriteConfig } from '../js/engine/renderer.js';
import { map } from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';
import { CONFIG } from '../js/config.js';

// Cada arte da Enseada é um PNG individual, não uma célula do atlas do hub.
for (const id of ['enseada_espelho_arquetipo', ...Array.from({ length: 8 }, (_, i) => `enseada${i + 1}_teste`)]) {
  const sheet = getObjectSpriteConfig(id);
  assert.equal(sheet.SHEET_COLS, 1, `${id}: não deve ser recortado como atlas`);
  assert.equal(sheet.SHEET_ROWS, 1, `${id}: não deve ser recortado como atlas`);
}
assert.equal(getObjectSpriteConfig('hub_props'), CONFIG.HUB_PROPS_SPRITE, 'outros atlas não devem mudar');
for (const object of map.objects) {
  if (object.larguraPx != null && object.renderizar !== false) {
    assert.equal(object.useCrop, true, `${object.id}: larguraPx precisa do desenho com recorte`);
  }
  for (const id of [object.sprite, object.spriteB]) {
    if (!/^enseada(?:\d+)?_/.test(id ?? '')) continue;
    const sheet = getObjectSpriteConfig(id);
    assert.equal(sheet.SHEET_COLS, 1, `${object.id}: ${id}`);
    assert.equal(sheet.SHEET_ROWS, 1, `${object.id}: ${id}`);
  }
}
console.log('Enseada: sprites individuais e escala de objetos configurados corretamente.');
