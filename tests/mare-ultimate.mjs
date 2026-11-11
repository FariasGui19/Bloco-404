// =====================================================================
// MARÉ ASTRAL — a Ultimate que a corrente instala
//
// Mesmo contrato do Bio-Forja: no Maré o `F` de nível 1 é da CORRENTE
// instalada, então cada corrente precisa da própria execução. Este teste
// amarra as pontas do mesmo jeito que tests/bio-ultimate.mjs:
//
//   1. corrente → assinatura → folha (e bônus com nome próprio);
//   2. folha no disco (4 quadros de 320, alpha real) e no manifesto;
//   3. quadro por fase real da Ultimate (carga/impacto/recuperação);
//   4. o corpo NÃO muda de tamanho no F (o Maré encolhia 13%);
//   5. Códex mostra a execução da corrente;
//   6. Q de costas tem folha própria (a lateral virava o corpo de perfil).
// =====================================================================
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { getTool, getTools } from '../js/data/archetype-tools.js';
import { getUltimate } from '../js/data/ultimates.js';
import {
  MARE_ULTIMATE_SHEETS, getMareUltimateFrame, getMareUltimatePosePath, getMareUltimateSprite,
} from '../js/data/mare-ultimate-animation.js';
import { MARE_PROPULSOR_SHEET, getMarePropulsorFrame } from '../js/data/mare-action-animation.js';
import { beginUltimate, canCastUltimate, updateUltimate, getActiveUltimate } from '../js/game/ultimate.js';

const ARQ = 'mare_astral';

function progresso(corrente) {
  return {
    archetype: ARQ,
    archetypeProgress: { [ARQ]: { level: 5, xp: 0 } },
    abilities: {},
    tools: { [ARQ]: corrente },
    flags: {},
  };
}

function jogador(extra = {}) {
  return {
    x: 10, y: 10, facing: 'down',
    health: 120, maxHealth: 120, energy: 100, maxEnergy: 100,
    equippedSuit: 'mare',
    ability: { cooldowns: {}, dash: null },
    moving: false,
    combat: null,
    ultimate: { cooldown: 0, buff: null, effect: null, casts: 0, charge: 0, shake: null, flash: null },
    ...extra,
  };
}

// ---------------------------------------------------------------
// 1. CORRENTE → ASSINATURA → FOLHA
// ---------------------------------------------------------------
const ESPERADO = {
  escudo_liquido: { signature: 'cupula_agua', sprite: 'player_mare_ult_cupula', buff: 'PRESSÃO', ultimate: 'CÚPULA DE PRESSÃO' },
  passo_abissal: { signature: 'vortice', sprite: 'player_mare_ult_vortice', buff: 'CORRENTE', ultimate: 'CORRENTE ABISSAL' },
  chicote_de_mare: { signature: 'chicote', sprite: 'player_mare_ult_chicote', buff: 'LÂMINA DE ÁGUA', ultimate: 'ONDA CORTANTE' },
  senso_de_corrente: { signature: 'sonar', sprite: 'player_mare_ult_sonar', buff: 'MARÉ CHAMADA', ultimate: 'CHAMADO DA MARÉ' },
};
const correntes = getTools(ARQ).map(t => t.id);
assert.equal(correntes.length, 4, 'o módulo tem as quatro correntes');
for (const id of correntes) assert(ESPERADO[id], `corrente inesperada: ${id}`);
for (const [id, alvo] of Object.entries(ESPERADO)) {
  const tool = getTool(ARQ, id);
  assert.equal(tool.ultimate.tier, 'tool', `${id}: a Ultimate é da corrente`);
  assert.equal(tool.ultimate.signature, alvo.signature, `${id}: assinatura ${alvo.signature}`);
  assert.equal(tool.ultimate.buff.label, alvo.buff, `${id}: bônus ${alvo.buff}`);
  assert.equal(tool.ultimate.name, alvo.ultimate);
  const sheet = MARE_ULTIMATE_SHEETS[alvo.signature];
  assert(sheet, `${alvo.signature}: folha declarada`);
  assert.equal(sheet.sprite, alvo.sprite);
  assert.equal(sheet.cols, 4);
}
// A base do módulo (sem corrente escolhida) é a sinfonia.
const base = getUltimate(ARQ);
assert.equal(base.signature, 'estuario');
assert.equal(MARE_ULTIMATE_SHEETS.estuario.sprite, 'player_mare_ult_estuario');

// ---------------------------------------------------------------
// 2. FOLHAS NO DISCO E NO MANIFESTO
// ---------------------------------------------------------------
const manifesto = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
const todasAsFolhas = [...Object.values(MARE_ULTIMATE_SHEETS), MARE_PROPULSOR_SHEET];
for (const sheet of todasAsFolhas) {
  const arquivo = `assets/sprites/player/${sheet.sprite.replaceAll('_', '-')}.png`;
  assert(existsSync(new URL(`../${arquivo}`, import.meta.url)), `${arquivo} existe`);
  const png = readFileSync(new URL(`../${arquivo}`, import.meta.url));
  assert.equal(png.toString('ascii', 1, 4), 'PNG');
  assert.equal(png[25], 6, `${arquivo}: alpha real, sem fundo magenta`);
  assert.equal(png.readUInt32BE(16), 1280, `${arquivo}: 4 quadros de 320 px`);
  assert.equal(png.readUInt32BE(20), 320, `${arquivo}: uma linha de quadros`);
  assert.match(manifesto, new RegExp(`'${sheet.sprite}'`), `${sheet.sprite} no manifesto`);
}
// As fontes e o preparador ficam no repo: a arte é reproduzível.
for (const fonte of ['mare-ult-cupula', 'mare-ult-vortice', 'mare-ult-chicote', 'mare-ult-sonar', 'mare-ult-estuario', 'mare-propulsor-costas']) {
  assert(existsSync(new URL(`../assets/source-art/mare/${fonte}.png`, import.meta.url)), `fonte ${fonte}`);
}
const preparador = readFileSync(new URL('../tools/preparar-mare-ultimate.py', import.meta.url), 'utf8');
assert.match(preparador, /load_frames/, 'preparador usa o recorte compartilhado');
assert.match(preparador, /CORPO = 249/, 'preparador fixa a altura do corpo em jogo');
assert.match(preparador, /disc_mask/, 'o túnel do vórtice é fechado em disco');

// ---------------------------------------------------------------
// 3. QUADRO POR ESTADO REAL
// ---------------------------------------------------------------
const progress = progresso('passo_abissal');
const ativo = getActiveUltimate(progress);
assert.equal(ativo.tier, 'tool');
assert.equal(ativo.definition.name, 'CORRENTE ABISSAL');
assert.equal(getMareUltimateFrame(progress, jogador()), null, 'parado, sem Ultimate: sem quadro');
// Sem o traje equipado o corpo é o operador civil.
assert.equal(getMareUltimateFrame(progress, jogador({ equippedSuit: null })), null);
// Outro arquétipo nunca usa a folha do Maré.
assert.equal(getMareUltimateFrame({ archetype: 'motor_bio_forja' }, jogador()), null);

const player = jogador();
assert(canCastUltimate(player, progress).ok, 'o F está disponível');
beginUltimate({ player, progress, targets: [] });
const carga = getMareUltimateFrame(progress, player);
assert.equal(carga.phase, 'charge');
assert.equal(carga.sprite, 'player_mare_ult_vortice', 'a carga já veste a corrente escolhida');
assert.equal(carga.col, 0);
player.ultimate.charge = player.ultimate.chargeDuration * .2;
assert.equal(getMareUltimateFrame(progress, player).col, 1, 'carga avança de quadro');

updateUltimate(player, progress, .5, { targets: [] });
const impacto = getMareUltimateFrame(progress, player);
assert(impacto, 'a soltura tem quadro');
assert.equal(impacto.phase, 'impact');
assert.equal(impacto.col, 2);
assert.equal(impacto.sprite, 'player_mare_ult_vortice');
assert.equal(player.ultimate.effect.signature, 'vortice');
assert.equal(player.ultimate.buff.label, 'CORRENTE', 'a corrente liga o próprio bônus');

const efeito = player.ultimate.effect;
player.ultimate.effect = { ...efeito, timeLeft: efeito.duration * .3 };
assert.equal(getMareUltimateFrame(progress, player).phase, 'recover');
assert.equal(getMareUltimateFrame(progress, player).col, 3);
player.ultimate.effect = null;
assert.equal(getMareUltimateFrame(progress, player), null, 'sem efeito, o corpo volta ao normal');

// BUG FECHADO: a CORRENTE ABISSAL é um dash. Enquanto o corpo avançava, o
// ramo antigo (`if player.ability.dash → null`) descartava a folha e a única
// Ultimate do Maré com dash nunca aparecia. O avanço da Ultimate não pode
// invalidar a arte; só o dash de habilidade (Q) manda no corpo.
const avancando = jogador();
beginUltimate({ player: avancando, progress, targets: [] });
updateUltimate(avancando, progress, .5, { targets: [] });
assert(avancando.ability.dash, 'a Ultimate de dash move o corpo');
assert.equal(avancando.ability.dash.mode, 'ultimate');
assert(avancando.ability.dash.source, 'o avanço sabe de qual Ultimate veio');
const duranteDash = getMareUltimateFrame(progress, avancando);
assert(duranteDash, 'a folha da Ultimate de dash ainda é desenhada');
assert.equal(duranteDash.sprite, 'player_mare_ult_vortice');
// O Q da habilidade, esse sim, tem prioridade sobre a execução.
const duranteQ = jogador({
  ability: { cooldowns: {}, dash: { mode: 'quick', timeLeft: .1 } },
  ultimate: { ...avancando.ultimate },
});
assert.equal(getMareUltimateFrame(progress, duranteQ), null, 'dash de habilidade manda no corpo');

// Varredura e dash têm prioridade sobre a execução.
const ocupado = jogador({ ultimate: { ...jogador().ultimate, charge: .2, chargeDuration: .42 } });
ocupado.ability.scanning = .4;
assert.equal(getMareUltimateFrame(progress, ocupado), null, 'varredura manda no corpo');

// ---------------------------------------------------------------
// 4. TODAS AS CINCO ASSINATURAS DESENHAM
// ---------------------------------------------------------------
for (const [assinatura, sheet] of Object.entries(MARE_ULTIMATE_SHEETS)) {
  const p = jogador();
  p.ultimate.effect = { id: assinatura, signature: assinatura, timeLeft: .9, duration: 1, color: '#53d9f4' };
  const quadro = getMareUltimateFrame(progresso(null), p);
  assert(quadro, `${assinatura}: tem quadro na soltura`);
  assert.equal(quadro.sprite, sheet.sprite);
}

// ---------------------------------------------------------------
// 5. O CORPO NÃO MUDA DE TAMANHO (o Maré encolhia no F)
// ---------------------------------------------------------------
// Caminhada aprovada: célula de 448 px em escala .37 → 383 px de corpo → 142 px.
// A Ultimate usa célula de 320 com .57: o corpo tem que fechar nos mesmos 142.
const alturaCaminhada = 383 * .37;
for (const sheet of Object.values(MARE_ULTIMATE_SHEETS)) {
  const emJogo = 249 * sheet.scale;
  assert(Math.abs(emJogo - alturaCaminhada) < 12,
    `${sheet.sprite}: ${emJogo.toFixed(0)}px em jogo contra ${alturaCaminhada.toFixed(0)}px da caminhada`);
  assert.equal(sheet.cell, 320);
  assert.equal(sheet.footY, 276);
}

// ---------------------------------------------------------------
// 6. CÓDEX — a corrente mostra a própria execução
// ---------------------------------------------------------------
for (const assinatura of Object.keys(MARE_ULTIMATE_SHEETS)) {
  const caminho = getMareUltimatePosePath(assinatura);
  assert.equal(caminho, `assets/sprites/player/${getMareUltimateSprite(assinatura).replaceAll('_', '-')}.png`);
  assert(existsSync(new URL(`../${caminho}`, import.meta.url)), `${assinatura}: miniatura existe`);
}
assert.equal(getMareUltimatePosePath('inexistente'), null);
const codex = readFileSync(new URL('../js/ui/codex.js', import.meta.url), 'utf8');
assert.match(codex, /getMareUltimatePosePath/, 'o Códex usa a arte da corrente');
assert.match(codex, /poseDaFerramenta/, 'a pose é resolvida por arquétipo');
assert.match(codex, /mare_astral: getMareUltimatePosePath/, 'Maré registrado no resolvedor');
assert.match(codex, /motor_bio_forja: getBioUltimatePosePath/, 'o Bio continua registrado');

// ---------------------------------------------------------------
// 7. Q DE COSTAS — a folha lateral não vira mais o corpo de perfil
// ---------------------------------------------------------------
function correndo(facing, fracao = .5) {
  return jogador({
    facing,
    ability: {
      cooldowns: {}, scanning: 0, active: 'passo_corrente',
      // `archetype-powers` guarda o efeito; é ele que dá o relógio do Q.
      effect: { id: 'passo_corrente', color: '#53d9f4', duration: .55, timeLeft: .55 * (1 - fracao) },
      dash: { timeLeft: .22 * (1 - fracao), duration: .22, speed: 10 },
    },
  });
}
const costas = getMarePropulsorFrame(progresso('passo_abissal'), correndo('up', .5));
assert(costas, 'o Q de costas tem folha própria');
assert.equal(costas.sprite, 'player_mare_propulsor_costas');
const fases = [.05, .3, .6, .95].map(f => getMarePropulsorFrame(progresso('passo_abissal'), correndo('up', f))?.col);
assert.deepEqual(fases, [0, 1, 2, 3], 'anel → onda → correnteza → pouso');
// As outras direções continuam com a folha lateral aprovada.
for (const facing of ['down', 'left', 'right']) {
  assert.equal(getMarePropulsorFrame(progresso('passo_abissal'), correndo(facing)), null, `${facing} usa a folha lateral`);
}
// Sem traje ou sem efeito, ninguém desenha.
assert.equal(getMarePropulsorFrame(progresso('passo_abissal'), jogador()), null);
assert.equal(getMarePropulsorFrame(progresso('passo_abissal'), jogador({ facing: 'up', equippedSuit: null })), null);
const semEfeito = correndo('up');
semEfeito.ability.effect = null;
assert.equal(getMarePropulsorFrame(progresso('passo_abissal'), semEfeito), null);

// ---------------------------------------------------------------
// 8. RENDERER E ÁGUA AMBIENTAL
// ---------------------------------------------------------------
const renderer = readFileSync(new URL('../js/engine/renderer.js', import.meta.url), 'utf8');
assert.match(renderer, /getMareUltimateFrame/, 'o renderer consulta a animação do Maré');
const posNucleo = renderer.indexOf('getUltimateFrame(state.progress, player)');
const posBio = renderer.indexOf('getBioUltimateFrame(state.progress, player)');
const posMare = renderer.indexOf('getMareUltimateFrame(state.progress, player)');
assert(posNucleo > 0 && posBio > posNucleo && posMare > posBio, 'só um módulo desenha o corpo, em ordem');
assert.match(renderer, /getMarePropulsorFrame/, 'o Q de costas entra no caminho do desenho');
assert.match(renderer, /function drawMareFx/, 'o Maré tem leitura de água própria');
for (const id of ['escudo_liquido', 'passo_abissal', 'chicote_de_mare', 'senso_de_corrente']) {
  assert(renderer.includes(`${id}: { cor:`), `${id}: cor própria na água do traje`);
}

console.log('Maré Astral: as quatro correntes executam a própria Ultimate, com arte, bônus e Q de costas OK.');
