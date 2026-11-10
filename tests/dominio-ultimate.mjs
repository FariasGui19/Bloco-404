// =====================================================================
// DOMÍNIO ANCIÃO — a Ultimate que a arma/postura instala
//
// Mesmo contrato de Bio e Maré: no Domínio o `F` de nível 1 é da FERRAMENTA
// instalada, então cada arma precisa da própria execução. Este teste amarra
// as pontas do mesmo jeito que tests/bio-ultimate.mjs e tests/mare-ultimate.mjs:
//
//   1. ferramenta → assinatura → folha;
//   2. folha no disco (4 quadros de 320, alpha real) e no manifesto;
//   3. quadro por fase real da Ultimate (carga/impacto/recuperação);
//   4. o corpo NÃO muda de tamanho entre os arquétipos;
//   5. Códex mostra a execução da ferramenta;
//   6. a INVESTIDA (dash) não perde a arte no meio do avanço;
//   7. nenhuma célula estoura a vizinha nem sangra no fundo.
// =====================================================================
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { getTool, getTools } from '../js/data/archetype-tools.js';
import { getUltimate } from '../js/data/ultimates.js';
import {
  DOMINIO_ULTIMATE_SHEETS, getDominioUltimateFrame, getDominioUltimatePosePath, getDominioUltimateSprite,
} from '../js/data/dominio-ultimate-animation.js';
import { beginUltimate, canCastUltimate, updateUltimate, getActiveUltimate } from '../js/game/ultimate.js';

const ARQ = 'lamina_dominio_anciao';

function progresso(ferramenta) {
  return {
    archetype: ARQ,
    archetypeProgress: { [ARQ]: { level: 5, xp: 0 } },
    abilities: {},
    tools: { [ARQ]: ferramenta },
    flags: {},
  };
}

function jogador(extra = {}) {
  return {
    x: 10, y: 10, facing: 'down',
    health: 120, maxHealth: 120, energy: 100, maxEnergy: 100,
    equippedSuit: 'dominio',
    ability: { cooldowns: {}, dash: null },
    moving: false,
    combat: null,
    ultimate: { cooldown: 0, buff: null, effect: null, casts: 0, charge: 0, shake: null, flash: null },
    ...extra,
  };
}

// ---------------------------------------------------------------
// 1. FERRAMENTA → ASSINATURA → FOLHA
// ---------------------------------------------------------------
const ESPERADO = {
  espada_de_dominio: { signature: 'lamina_vertical', sprite: 'player_dominio_ult_lamina', ultimate: 'CORTE DE RUPTURA' },
  escudo_de_dominio: { signature: 'muralha_hex', sprite: 'player_dominio_ult_muralha', ultimate: 'MURALHA DE FREQUÊNCIA' },
  postura_de_dominio: { signature: 'tita', sprite: 'player_dominio_ult_tita', ultimate: 'CORPO DE TITÂNIO' },
  investida_de_dominio: { signature: 'trono', sprite: 'player_dominio_ult_trono', ultimate: 'IMPACTO DO TRONO ANTIGO' },
};
const ferramentas = getTools(ARQ).map(t => t.id);
assert.equal(ferramentas.length, 4, 'o módulo tem as quatro ferramentas');
for (const id of ferramentas) assert(ESPERADO[id], `ferramenta inesperada: ${id}`);
for (const [id, alvo] of Object.entries(ESPERADO)) {
  const tool = getTool(ARQ, id);
  assert.equal(tool.ultimate.tier, 'tool', `${id}: a Ultimate é da ferramenta`);
  assert.equal(tool.ultimate.signature, alvo.signature, `${id}: assinatura ${alvo.signature}`);
  assert.equal(tool.ultimate.name, alvo.ultimate);
  const sheet = DOMINIO_ULTIMATE_SHEETS[alvo.signature];
  assert(sheet, `${alvo.signature}: folha declarada`);
  assert.equal(sheet.sprite, alvo.sprite);
  assert.equal(sheet.cols, 4);
}
// A base do módulo (sem ferramenta escolhida) é a coroa da falha.
const base = getUltimate(ARQ);
assert.equal(base.signature, 'coroa');
assert.equal(DOMINIO_ULTIMATE_SHEETS.coroa.sprite, 'player_dominio_ult_coroa');

// ---------------------------------------------------------------
// 2. FOLHAS NO DISCO E NO MANIFESTO
// ---------------------------------------------------------------
const manifesto = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
for (const sheet of Object.values(DOMINIO_ULTIMATE_SHEETS)) {
  const arquivo = `assets/sprites/player/${sheet.sprite.replaceAll('_', '-')}.png`;
  const caminho = new URL(`../${arquivo}`, import.meta.url);
  assert(existsSync(caminho), `${arquivo} existe`);
  const png = readFileSync(caminho);
  assert.equal(png.toString('ascii', 1, 4), 'PNG');
  assert.equal(png[25], 6, `${arquivo}: alpha real, sem fundo magenta`);
  assert.equal(png.readUInt32BE(16), 1280, `${arquivo}: 4 quadros de 320 px`);
  assert.equal(png.readUInt32BE(20), 320, `${arquivo}: uma linha de quadros`);
  assert.match(manifesto, new RegExp(`'${sheet.sprite}'`), `${sheet.sprite} no manifesto`);
}
// As fontes e o preparador ficam no repo: a arte é reproduzível.
for (const fonte of ['coroa', 'lamina', 'muralha', 'tita', 'trono']) {
  assert(existsSync(new URL(`../assets/source-art/dominio/dominio-ult-${fonte}.png`, import.meta.url)), `fonte ${fonte}`);
}
const preparador = readFileSync(new URL('../tools/preparar-dominio-ultimate.py', import.meta.url), 'utf8');
assert.match(preparador, /dominio_arte/, 'o preparador usa o recorte do Domínio');
assert.match(preparador, /CORPO = 247/, 'o preparador fixa a altura do corpo em jogo');
assert.match(preparador, /compose_body/, 'a composição é a do Domínio');
const helper = readFileSync(new URL('../tools/dominio_arte.py', import.meta.url), 'utf8');
assert.match(helper, /hair_top_cx/, 'o corpo é medido pelo cabelo, não pelo efeito');
assert.match(helper, /np\.median/, 'a escala é uma só por folha (mediana dos quatro quadros)');

// ---------------------------------------------------------------
// 3. QUADRO POR ESTADO REAL
// ---------------------------------------------------------------
const progress = progresso('investida_de_dominio');
const ativo = getActiveUltimate(progress);
assert.equal(ativo.tier, 'tool');
assert.equal(ativo.definition.name, 'IMPACTO DO TRONO ANTIGO');
assert.equal(getDominioUltimateFrame(progress, jogador()), null, 'parado, sem Ultimate: sem quadro');
// Sem o traje equipado o corpo é o operador civil.
assert.equal(getDominioUltimateFrame(progress, jogador({ equippedSuit: null })), null);
// Outro arquétipo nunca usa a folha do Domínio.
assert.equal(getDominioUltimateFrame({ archetype: 'mare_astral' }, jogador()), null);

const player = jogador();
assert(canCastUltimate(player, progress).ok, 'o F está disponível');
beginUltimate({ player, progress, targets: [] });
const carga = getDominioUltimateFrame(progress, player);
assert.equal(carga.phase, 'charge');
assert.equal(carga.sprite, 'player_dominio_ult_trono', 'a carga já veste a ferramenta escolhida');
assert.equal(carga.col, 0);
player.ultimate.charge = player.ultimate.chargeDuration * .2;
assert.equal(getDominioUltimateFrame(progress, player).col, 1, 'carga avança de quadro');

updateUltimate(player, progress, .5, { targets: [] });
const impacto = getDominioUltimateFrame(progress, player);
assert(impacto, 'a soltura tem quadro');
assert.equal(impacto.phase, 'impact');
assert.equal(impacto.col, 2);
assert.equal(impacto.sprite, 'player_dominio_ult_trono');
assert.equal(player.ultimate.effect.signature, 'trono');
assert.equal(player.ultimate.buff.label, 'TRONO', 'a ferramenta liga o próprio bônus');

const efeito = player.ultimate.effect;
player.ultimate.effect = { ...efeito, timeLeft: efeito.duration * .3 };
assert.equal(getDominioUltimateFrame(progress, player).phase, 'recover');
assert.equal(getDominioUltimateFrame(progress, player).col, 3);
player.ultimate.effect = null;
assert.equal(getDominioUltimateFrame(progress, player), null, 'sem efeito, o corpo volta ao normal');

// ---------------------------------------------------------------
// 4. TODAS AS CINCO ASSINATURAS DESENHAM
// ---------------------------------------------------------------
for (const [assinatura, sheet] of Object.entries(DOMINIO_ULTIMATE_SHEETS)) {
  const p = jogador();
  p.ultimate.effect = { id: assinatura, signature: assinatura, timeLeft: .9, duration: 1, color: '#ffd465' };
  const quadro = getDominioUltimateFrame(progresso(null), p);
  assert(quadro, `${assinatura}: tem quadro na soltura`);
  assert.equal(quadro.sprite, sheet.sprite);
}

// ---------------------------------------------------------------
// 5. A INVESTIDA (dash) NÃO PERDE A ARTE
// ---------------------------------------------------------------
// O mesmo bug que matou a CORRENTE ABISSAL do Maré: o avanço da Ultimate é
// um dash, e a checagem antiga descartava a folha justo durante o gesto.
const avancando = jogador();
beginUltimate({ player: avancando, progress, targets: [] });
updateUltimate(avancando, progress, .5, { targets: [] });
assert(avancando.ability.dash, 'a Ultimate de investida move o corpo');
assert.equal(avancando.ability.dash.mode, 'ultimate');
const duranteDash = getDominioUltimateFrame(progress, avancando);
assert(duranteDash, 'a folha da investida ainda é desenhada');
assert.equal(duranteDash.sprite, 'player_dominio_ult_trono');
// O dash de habilidade (Q), esse sim, manda no corpo.
const duranteQ = jogador({
  ability: { cooldowns: {}, dash: { mode: 'quick', timeLeft: .1 } },
  ultimate: { ...avancando.ultimate },
});
assert.equal(getDominioUltimateFrame(progress, duranteQ), null, 'dash de habilidade manda no corpo');
// Varredura também.
const ocupado = jogador({ ultimate: { ...jogador().ultimate, charge: .2, chargeDuration: .42 } });
ocupado.ability.scanning = .4;
assert.equal(getDominioUltimateFrame(progress, ocupado), null, 'varredura manda no corpo');

// ---------------------------------------------------------------
// 6. O CORPO NÃO MUDA DE TAMANHO
// ---------------------------------------------------------------
// Caminhada lateral aprovada: figura de ~574 px de arte (célula de 440×700)
// desenhada com escala .245 → ~141 px em jogo. A Ultimate usa célula de 320
// com .57 e o corpo de 247 px de arte: 141 px também. Nenhum arquétipo pode
// "parecer melhor" que outro.
const alturaCaminhada = 574 * .245;
for (const sheet of Object.values(DOMINIO_ULTIMATE_SHEETS)) {
  const emJogo = 247 * sheet.scale;
  assert(Math.abs(emJogo - alturaCaminhada) < 12,
    `${sheet.sprite}: ${emJogo.toFixed(0)}px em jogo contra ${alturaCaminhada.toFixed(0)}px da caminhada`);
  assert.equal(sheet.cell, 320);
  assert.equal(sheet.footY, 276);
}

// ---------------------------------------------------------------
// 7. CÓDEX — a ferramenta mostra a própria execução
// ---------------------------------------------------------------
for (const assinatura of Object.keys(DOMINIO_ULTIMATE_SHEETS)) {
  const caminho = getDominioUltimatePosePath(assinatura);
  assert.equal(caminho, `assets/sprites/player/${getDominioUltimateSprite(assinatura).replaceAll('_', '-')}.png`);
  assert(existsSync(new URL(`../${caminho}`, import.meta.url)), `${assinatura}: miniatura existe`);
}
assert.equal(getDominioUltimatePosePath('inexistente'), null);
const codex = readFileSync(new URL('../js/ui/codex.js', import.meta.url), 'utf8');
assert.match(codex, /getDominioUltimatePosePath/, 'o Códex usa a arte do Domínio');
assert.match(codex, /lamina_dominio_anciao: getDominioUltimatePosePath/, 'Domínio registrado no resolvedor');

// ---------------------------------------------------------------
// 8. RENDERER E FREQUÊNCIA AMBIENTAL
// ---------------------------------------------------------------
const renderer = readFileSync(new URL('../js/engine/renderer.js', import.meta.url), 'utf8');
assert.match(renderer, /getDominioUltimateFrame/, 'o renderer consulta a animação do Domínio');
const posNucleo = renderer.indexOf('getUltimateFrame(state.progress, player)');
const posBio = renderer.indexOf('getBioUltimateFrame(state.progress, player)');
const posMare = renderer.indexOf('getMareUltimateFrame(state.progress, player)');
const posDominio = renderer.indexOf('getDominioUltimateFrame(state.progress, player)');
assert(posNucleo > 0 && posBio > posNucleo && posMare > posBio && posDominio > posMare,
  'os quatro módulos entram em ordem na cadeia de ??');
assert.match(renderer, /function drawDominioFx/, 'o Domínio tem leitura de frequência própria');
assert.match(renderer, /if \(suit === 'dominio'\) drawDominioFx/, 'a frequência entra no desenho do traje');
for (const id of ['espada_de_dominio', 'escudo_de_dominio', 'postura_de_dominio', 'investida_de_dominio']) {
  assert(renderer.includes(`${id}: { cor:`), `${id}: cor própria na frequência do traje`);
}

console.log('Domínio Ancião: as quatro armas executam a própria Ultimate, com arte, bônus e leitura de frequência.');
