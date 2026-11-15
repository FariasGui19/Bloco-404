import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { map as enseada } from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';
import { state } from '../js/game/state.js';
import { loadMap } from '../js/game/map-manager.js';
import { canStandAt } from '../js/game/collision.js';

const assets = {
  enseada4_torre_vigilia: 'signal-watchtower',
  enseada4_tenda: 'expedition-tent',
  enseada4_fogueira: 'stone-ring-campfire',
  enseada4_mesa_campo: 'field-table-bench',
  enseada4_caixas: 'supply-crates',
  enseada4_relogio: 'coastal-clock-post',
  enseada4_placa: 'trail-marker-sign',
  enseada4_gruta: 'shell-grotto',
  enseada4_rede: 'beach-training-net',
  enseada4_cairn: 'zen-stone-cairn',
};
const main = readFileSync('js/main.js', 'utf8');
const renderer = readFileSync('js/engine/renderer.js', 'utf8');
assert(renderer.includes("spriteId.startsWith('enseada3_')") && renderer.includes("spriteId.startsWith('enseada4_')"),
  'as artes individuais das Enseadas 3 e 4 não podem ser recortadas como atlas HUB_PROPS');
for (const [id, name] of Object.entries(assets)) {
  const source = `assets/source-art/enseada-4/${name}.png`;
  const sprite = `assets/sprites/enseada-4/${name}.png`;
  assert(existsSync(source), `arte fonte ausente: ${source}`);
  assert(existsSync(sprite), `sprite recortado ausente: ${sprite}`);
  assert(main.includes(`id: '${id}'`), `sprite não registrado: ${id}`);
  assert(statSync(sprite).size < 2_000_000, `sprite grande demais: ${sprite}`);
  const png = readFileSync(sprite);
  assert.equal(png[25], 6, `${sprite} precisa preservar RGBA com transparência`);
}

for (const [objectId, spriteId] of [
  ['torre_antena_enseada', 'enseada4_torre_vigilia'],
  ['relogio_mare_enseada', 'enseada4_relogio'],
  ['bancada_campo_enseada', 'enseada4_mesa_campo'],
  ['acampamento_vigilia_enseada', 'enseada4_fogueira'],
  ['maleta_expedicao_enseada', 'enseada4_caixas'],
  ['tenda_expedicao_enseada', 'enseada4_tenda'],
  ['placa_trilha_enseada', 'enseada4_placa'],
  ['gruta_concha_enseada', 'enseada4_gruta'],
  ['rede_treino_praia_enseada', 'enseada4_rede'],
  ['jardim_pedras_enseada', 'enseada4_cairn'],
]) {
  const item = enseada.objects.find(o => o.id === objectId);
  assert(item, `marco da referência ausente: ${objectId}`);
  assert.equal(item.sprite, spriteId);
}

const barco = enseada.objects.find(o => o.id === 'barco_expedicao_enseada');
const cais = enseada.objects.find(o => o.id === 'cais_madeira_pesca_enseada');
assert(barco && barco.renderizar === false, 'o hotspot do barco não deve duplicar o barco já desenhado no sprite do cais');
assert(renderer.includes('object.invisivel || object.renderizar === false'), 'o renderer deve respeitar renderizar=false sem ocultar interações');
assert(cais && cais.larguraPx >= 350, 'o cais com barco precisa manter a escala da referência');
assert(enseada.objects.find(o => o.id === 'piscina_mare_viva_enseada')?.larguraPx >= 240,
  'a piscina de maré precisa usar a escala do grande poço rochoso da referência');

assert.equal(enseada.layout.length, 64);
assert.equal(enseada.layout[0].length, 72);
assert(enseada.objects.filter(o => o.bloqueia).every(o => o.hitbox || o.hitboxes), 'cada cenário sólido precisa de hitbox explícita');

// Explore a máscara com colisões em passos de meio tile and verify every
// interactive prop has a reachable approach within its own use distance.
state.save.loaded = false;
state.save.activeSlot = null;
state.progress = { flags: {}, inventory: [], questLog: {}, archetypeProgress: {} };
assert(await loadMap(enseada.id, 'vindo_da_praia'));
const start = enseada.spawnPoints.vindo_da_praia;
const pending = [[Math.round(start.x * 2), Math.round(start.y * 2)]];
const seen = new Set(), reachable = [];
for (let i = 0; i < pending.length; i++) {
  const [ix, iy] = pending[i], key = `${ix},${iy}`;
  if (seen.has(key)) continue;
  seen.add(key);
  const x = ix / 2, y = iy / 2;
  if (!canStandAt(enseada, x, y, 0.22, state.player)) continue;
  reachable.push({ x, y });
  pending.push([ix + 1, iy], [ix - 1, iy], [ix, iy + 1], [ix, iy - 1]);
}
const hiddenFlags = state.progress.flags ?? {};
for (const object of state.objects.filter(o => o.interacao &&
  (!o.hideWhenFlag || !hiddenFlags[o.hideWhenFlag]) &&
  (!o.showWhenFlag || hiddenFlags[o.showWhenFlag]) &&
  !o.interacao.somenteSubmerso)) {
  const distance = object.interacao.distancia ?? 1.35;
  assert(reachable.some(p => Math.hypot(p.x - object.x, p.y - object.y) <= distance),
    `${object.id} não tem posição de interação alcançável`);
}
assert(reachable.length >= 500, `mapa caminhável conectado muito pequeno: ${reachable.length} meio-tiles`);
console.log(`Lote 4: 10 artes, colisões explícitas e ${reachable.length} posições alcançáveis; interações acessíveis.`);
