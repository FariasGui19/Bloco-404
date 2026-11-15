import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { map as enseada } from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';
import { canStandAt } from '../js/game/collision.js';

const lote8Assets = [
  'piscina-mare-viva-b',
  'fonte-termal-enseada-b',
  'espelho-eco-arquetipo-b',
  'coral-luminescente-azul-b',
  'rede-cristal-ecos-b',
  'lanterna-marinha-flutuante-b',
  'baliza-mare-boia-b',
  'cais-madeira-pesca-b',
  'ondulacao-mar-crista',
  'borboletas-costa-vivas',
];

for (const name of lote8Assets) {
  assert(existsSync(`assets/source-art/enseada-2/${name}.png`), `faltando source-art ${name}`);
  assert(existsSync(`assets/sprites/enseada-2/${name}.png`), `faltando sprite processado ${name}`);
}

const mainJs = readFileSync('js/main.js', 'utf8');
for (const spriteId of [
  'enseada_piscina_mare_b',
  'enseada_fonte_termal_b',
  'enseada_espelho_arquetipo_b',
  'enseada_coral_azul_b',
  'enseada_rede_cristal_b',
  'enseada_lanterna_marinha_b',
  'enseada_baliza_boia_b',
  'enseada_cais_pesca_b',
  'enseada_ondulacao_mar',
  'enseada_borboletas_vivas',
]) {
  assert(mainJs.includes(`id: '${spriteId}'`), `sprite ${spriteId} precisa estar registrado em js/main.js`);
}

// Expansão da ilha (52x46, >= 600 tiles de terra caminháveis)
assert.equal(enseada.layout.length, 46);
assert.equal(enseada.layout[0].length, 52);
let terra = 0;
for (const row of enseada.walkMask) for (const c of row) if (c === '.') terra++;
assert(terra >= 600, `esperava >= 600 tiles caminháveis na ilha ampliada, veio ${terra}`);

// Novos pares animados A/B do Lote #8
const paresB = [
  ['piscina_mare_viva_enseada', 'enseada_piscina_mare_b'],
  ['fonte_termal_enseada', 'enseada_fonte_termal_b'],
  ['espelho_arquetipos_enseada', 'enseada_espelho_arquetipo_b'],
  ['coral_luminescente_enseada', 'enseada_coral_azul_b'],
  ['captador_ecos_enseada', 'enseada_rede_cristal_b'],
  ['lanterna_marinha_norte', 'enseada_lanterna_marinha_b'],
  ['lanterna_marinha_sul', 'enseada_lanterna_marinha_b'],
  ['baliza_mare_boia_1', 'enseada_baliza_boia_b'],
  ['baliza_mare_boia_2', 'enseada_baliza_boia_b'],
  ['cais_madeira_pesca_enseada', 'enseada_cais_pesca_b'],
];
for (const [objId, spriteB] of paresB) {
  const obj = enseada.objects.find(o => o.id === objId);
  assert(obj, `${objId} ausente`);
  assert.equal(obj.spriteB, spriteB, `${objId} deve animar com ${spriteB}`);
}

// Borboletas vivas presentes e zero adesivo PNG de onda parado na beira da areia
const borboletas = enseada.objects.filter(o => o.id.startsWith('borboletas_'));
assert(borboletas.length >= 2);
assert.equal(enseada.objects.filter(o => o.id.startsWith('ondulacao_mar_')).length, 0);

// Cardumes nunca encostam no barco de expedição nem caem sobre a areia
const barco = enseada.objects.find(o => o.id === 'barco_expedicao_enseada');
for (const cardume of enseada.objects.filter(o => o.id.startsWith('cardume_orla_'))) {
  const d = Math.hypot(cardume.x - barco.x, cardume.y - barco.y);
  assert(d >= 6, `${cardume.id} deve nadar em água livre longe do barco (dist=${d.toFixed(2)})`);
  assert.equal(enseada.walkMask[Math.floor(cardume.y)]?.[Math.floor(cardume.x)], '#');
}

// Todos os 36 marcos principais têm folga mínima >= 2.35 tiles
const marcos = enseada.objects.filter(o =>
  !o.id.startsWith('trilha_pedras_') &&
  !o.id.startsWith('enseada_folhas_') &&
  !o.id.startsWith('enseada_flora_') &&
  !o.id.startsWith('enseada_ilhota_') &&
  !o.id.startsWith('enseada_recife_') &&
  !o.id.startsWith('enseada_rochas') &&
  !o.id.startsWith('enseada_palmeira') &&
  !o.id.startsWith('enseada_arbusto') &&
  !o.id.startsWith('enseada_concha') &&
  !o.id.startsWith('enseada_pedra_') &&
  !o.id.startsWith('enseada_falesia') &&
  !o.id.startsWith('enseada_macico') &&
  !o.id.startsWith('enseada_pilar') &&
  !o.id.startsWith('enseada_vegetacao') &&
  !o.id.startsWith('baliza_666') &&
  !o.id.startsWith('cardume_') &&
  !o.id.startsWith('ondulacao_') &&
  !o.id.startsWith('borboletas_') &&
  o.id !== 'enseada_ruinas'
);
for (let i = 0; i < marcos.length; i++) {
  for (let j = i + 1; j < marcos.length; j++) {
    const a = marcos[i], b = marcos[j];
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    assert(dist >= 2.35, `espaçamento insuficiente entre ${a.id} e ${b.id}: ${dist.toFixed(2)}`);
  }
}

const agua = new Set([
  'barco_expedicao_enseada', 'baliza_mare_boia_1', 'baliza_mare_boia_2',
  'lanterna_marinha_norte', 'lanterna_marinha_sul', 'arco_conduto_retorno_mare',
  'porta_estacao_666_visual', 'terminal_frequencia_666', 'portico_trilha_praia',
]);
for (const o of marcos) {
  if (agua.has(o.id)) continue;
  assert(canStandAt(enseada, o.x, o.y, 0.2, {}), `marco ${o.id} precisa estar em terra caminhável`);
}

console.log(`Lote #8 Enseada 2.0 (ilha 52x46 com ${terra} tiles, 10 animações/vida e folga >= 2.35 tiles) OK!`);
