import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { map as enseada } from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';
import { canStandAt } from '../js/game/collision.js';

const lote7Assets = [
  'acampamento-vigilia-fogueira-b',
  'portal-caminho-correntes-b',
  'farolete-baia-enseada-b',
  'totem-eco-instavel-b',
  'carrilhao-vento-bambu-b',
  'banco-algas-douradas-b',
  'barco-expedicao-enseada-b',
  'trilha-pedras-costa',
  'cardume-orla-vivo',
  'bandeirola-vento-expedicao',
];

for (const name of lote7Assets) {
  assert(existsSync(`assets/source-art/enseada-2/${name}.png`), `faltando source-art ${name}`);
  assert(existsSync(`assets/sprites/enseada-2/${name}.png`), `faltando sprite processado ${name}`);
}

const mainJs = readFileSync('js/main.js', 'utf8');
for (const spriteId of [
  'enseada_acampamento_vigilia_b',
  'enseada_portal_correntes_b',
  'enseada_farolete_baia_b',
  'enseada_totem_eco_b',
  'enseada_carrilhao_vento_b',
  'enseada_algas_douradas_b',
  'enseada_barco_expedicao_b',
  'enseada_trilha_pedras',
  'enseada_cardume_vivo',
  'enseada_bandeirola_vento',
]) {
  assert(mainJs.includes(`id: '${spriteId}'`), `sprite ${spriteId} precisa estar registrado em js/main.js`);
}

const rendererJs = readFileSync('js/engine/renderer.js', 'utf8');
assert(rendererJs.includes('object.spriteB'), 'renderer deve suportar spriteB de animação');
assert(rendererJs.includes('object.nadoCardume'), 'renderer deve suportar nadoCardume');

// 7 objetos com quadro B de animação ativo
const animatedPairs = [
  ['acampamento_vigilia_enseada', 'enseada4_fogueira'],
  ['portal_caminho_correntes', 'enseada_portal_correntes_b'],
  ['farolete_baia_enseada', 'enseada_farolete_baia_b'],
  ['totem_eco_enseada', 'enseada3_monolito'],
  ['carrilhao_vento_enseada', 'enseada_carrilhao_vento_b'],
  ['algas_douradas_enseada', 'enseada_algas_douradas_b'],
  ['barco_expedicao_enseada', 'enseada_barco_expedicao_b'],
];
for (const [objId, spriteB] of animatedPairs) {
  const obj = enseada.objects.find(o => o.id === objId);
  assert(obj, `objeto ${objId} ausente`);
  assert.equal(obj.spriteB, spriteB, `${objId} precisa apontar para ${spriteB}`);
  assert(obj.animPeriodo > 0.2, `${objId} precisa de animPeriodo válido`);
}

// Peças vivas e trilhas de pedra conectando a ilha
const trilhas = enseada.objects.filter(o => o.id.startsWith('trilha_pedras_'));
assert(trilhas.length >= 10, 'trilhas de pedra devem conectar as zonas da ilha');
for (const t of trilhas) {
  assert.equal(t.sprite, 'enseada_trilha_pedras');
  assert(t.depthOffset < 0, `${t.id} deve ficar abaixo do jogador/objetos`);
  assert.equal(t.bloqueia, false);
  assert(canStandAt(enseada, t.x, t.y, 0.2, {}), `${t.id} precisa estar em chão caminhável`);
}

const cardumes = enseada.objects.filter(o => o.id.startsWith('cardume_orla_'));
assert(cardumes.length >= 2);
for (const c of cardumes) assert(c.nadoCardume && c.sprite === 'enseada_cardume_vivo');

const bandeirola = enseada.objects.find(o => o.id === 'bandeirola_vento_enseada');
assert(bandeirola?.oscilaBrisa && bandeirola.sprite === 'enseada_bandeirola_vento');

// Limpeza de sobreposições antigas vistas no print
assert(!enseada.objects.some(o => o.id === 'enseada_cascata'), 'enseada_cascata flutuando no mar deve ter sido removida');
assert(!enseada.objects.some(o => o.id === 'enseada_tronco'), 'enseada_tronco atravessando a praça central deve ter sido removido');
assert(!enseada.pocas.some(p => Boolean(p.fonte)), 'não deve haver cascata fantasma caindo sobre o barco');

// Auditoria espacial de todos os marcos principais (nenhum colado/sobreposto < 1.9 tiles)
const marcos = enseada.objects.filter(o =>
  o.renderizar !== false &&
  !o.id.startsWith('trilha_pedras_') &&
  !o.id.startsWith('enseada_folhas_') &&
  !o.id.startsWith('enseada_flora_') &&
  !o.id.startsWith('enseada_ilhota_') &&
  !o.id.startsWith('enseada_recife_') &&
  !o.id.startsWith('enseada_rochas') &&
  !o.id.startsWith('enseada_palmeira') &&
  !o.id.startsWith('enseada3_') &&
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
    assert(dist >= 1.9, `sobreposição espacial entre ${a.id} (${a.x},${a.y}) e ${b.id} (${b.x},${b.y}): dist=${dist.toFixed(2)}`);
  }
}

const marObjetos = new Set([
  'barco_expedicao_enseada',
  'baliza_mare_boia_1',
  'baliza_mare_boia_2',
  'lanterna_marinha_norte',
  'lanterna_marinha_sul',
  'arco_conduto_retorno_mare',
  'porta_estacao_666_visual',
  'terminal_frequencia_666',
  'portico_trilha_praia',
  'travessia_pedras_agua',
  'golfinho_saltando', 'golfinho_nadando', 'tartaruga_marinha', 'corais_amarelos',
  'boia_cone_laranja',
  'coral_rosa',
  'ourico_do_mar',
  'pedra_brilho_azul',
]);
for (const o of marcos) {
  if (marObjetos.has(o.id)) continue;
  assert(canStandAt(enseada, o.x, o.y, 0.2, {}), `marco terrestre ${o.id} (${o.x},${o.y}) precisa ser caminhável`);
}

console.log('Lote #7 Enseada 2.0 (10 animações/peças vivas + reorganização espacial sem sobreposições) OK!');
