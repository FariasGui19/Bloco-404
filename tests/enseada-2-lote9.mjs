import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { map as enseada } from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';
import { canStandAt } from '../js/game/collision.js';

const lote9Assets = [
  'portico-trilha-praia-b',
  'relogio-mare-solar-b',
  'torre-antena-escuta-b',
  'bancada-campo-arquetipos-b',
  'santuario-lumeo-pedra-b',
  'estela-navegadores-b',
  'gruta-concha-mar-b',
  'banco-ostras-perola-b',
  'bau-deriva-naufragio-b',
  'caixa-suprimentos-mar-b',
];

for (const name of lote9Assets) {
  assert(existsSync(`assets/source-art/enseada-2/${name}.png`), `faltando source-art ${name}`);
  assert(existsSync(`assets/sprites/enseada-2/${name}.png`), `faltando sprite processado ${name}`);
}

const mainJs = readFileSync('js/main.js', 'utf8');
for (const spriteId of [
  'enseada_portico_praia_b',
  'enseada_relogio_mare_b',
  'enseada_torre_antena_b',
  'enseada_bancada_campo_b',
  'enseada_santuario_lumeo_b',
  'enseada_estela_navegadores_b',
  'enseada_gruta_concha_b',
  'enseada_banco_ostras_b',
  'enseada_bau_deriva_b',
  'enseada_caixa_suprimentos_b',
]) {
  assert(mainJs.includes(`id: '${spriteId}'`), `sprite ${spriteId} precisa estar registrado em js/main.js`);
}

// Todos os 10 marcos do Lote #9 estão animados com quadro B
for (const [objId, spriteB] of [
  ['portico_trilha_praia', 'enseada_portico_praia_b'],
  ['relogio_mare_enseada', 'enseada_relogio_mare_b'],
  ['torre_antena_enseada', 'enseada_torre_antena_b'],
  ['bancada_campo_enseada', 'enseada_bancada_campo_b'],
  ['santuario_lumeo_enseada', 'enseada_santuario_lumeo_b'],
  ['estela_navegadores_enseada', 'enseada_estela_navegadores_b'],
  ['gruta_concha_enseada', 'enseada_gruta_concha_b'],
  ['banco_ostras_enseada', 'enseada_banco_ostras_b'],
  ['bau_deriva_enseada', 'enseada_bau_deriva_b'],
  ['maleta_expedicao_enseada', 'enseada_caixa_suprimentos_b'],
]) {
  const obj = enseada.objects.find(o => o.id === objId);
  assert(obj, `${objId} ausente`);
  assert.equal(obj.spriteB, spriteB, `${objId} deve usar ${spriteB}`);
}

// Falésias e maciço norte encaixados na costa (y >= 7.0, não flutuando longe no mar)
for (const id of ['enseada_falesia_norte', 'enseada_macico_leste', 'enseada_pilar_noroeste']) {
  const rel = enseada.objects.find(o => o.id === id);
  assert(rel, `${id} ausente`);
  assert(rel.y >= 7.0, `${id} deve encostar na costa norte (y=${rel.y})`);
}

// Conduto Abissal ancorado em recife rochoso (não flutuando no vazio)
assert(enseada.objects.some(o => o.id === 'enseada_recife_conduto_a'));
assert(enseada.objects.some(o => o.id === 'enseada_recife_conduto_b'));

// Calçadas contínuas (larguraPx <= 48, >= 28 peças em terra caminhável)
const trilhas = enseada.objects.filter(o => o.id.startsWith('trilha_pedras_'));
assert(trilhas.length >= 28);
for (const t of trilhas) {
  assert(t.larguraPx <= 48);
  assert(canStandAt(enseada, t.x, t.y, 0.2, {}), `${t.id} em chão caminhável`);
}

// Cardumes em água profunda (aguaPraia D/d/X, fora da areia)
for (const c of enseada.objects.filter(o => o.id.startsWith('cardume_orla_'))) {
  const tile = enseada.aguaPraia[Math.floor(c.y)]?.[Math.floor(c.x)];
  assert('DdX'.includes(tile ?? ''), `${c.id} precisa estar em água profunda (veio '${tile}')`);
}

console.log('Lote #9 Enseada 2.0 (+10 animações B, encaixe visual, trilhas contínuas e relevos costeiros) OK!');
