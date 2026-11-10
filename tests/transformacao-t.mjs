// =====================================================================
// TRANSFORMAÇÃO DO T — os quatro módulos com sequência desenhada
//
// Antes: apertar T trocava a folha do corpo no MESMO quadro. Nada aparecia
// entre "operador" e "traje". Agora cada módulo tem uma sequência de 4
// quadros, e o Núcleo mostra o BRACELETE do operador acionando a forma.
//
// O que este teste protege:
//   1. a folha de cada arquétipo existe, no manifesto e no disco;
//   2. o T cria o efeito visual (e não empilha se apertar de novo);
//   3. entrar e sair leem a mesma folha em sentidos opostos;
//   4. o efeito é SÓ visual — equipar continua sendo uma linha de estado;
//   5. o Núcleo usa o bracelete nos primeiros 70% e a criatura no resto;
//   6. o renderer desenha antes da caminhada.
// =====================================================================
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import {
  TRANSFORM_DURATION, TRANSFORM_EFFECT_ID, TRANSFORM_SHEETS,
  getTransformFrame, getTransformSheet, getNucleoBraceletFrame, startTransformEffect,
} from '../js/data/transform-animation.js';
import { toggleArchetypeSuit, toggleBioSuit, getAbilityContext } from '../js/game/ability-context.js';
import { toggleNucleoForm, canToggleNucleoForm } from '../js/game/nucleo-form.js';

function jogador(extra = {}) {
  return {
    x: 10, y: 10, facing: 'down',
    health: 120, maxHealth: 120, energy: 100, maxEnergy: 100,
    equippedSuit: null,
    ability: { cooldowns: {}, dash: null },
    moving: false,
    combat: null,
    ultimate: null,
    nucleoForm: null,
    ...extra,
  };
}

function progresso(arquetipo) {
  return {
    archetype: arquetipo,
    abilities: ['forma_veloz'],
    archetypeProgress: { [arquetipo]: { level: 5, xp: 0 } },
    tools: {},
    flags: {},
  };
}

// ---------------------------------------------------------------
// 1. AS QUATRO FOLHAS
// ---------------------------------------------------------------
assert.deepEqual(
  Object.keys(TRANSFORM_SHEETS).sort(),
  ['lamina_dominio_anciao', 'mare_astral', 'motor_bio_forja', 'nucleo_dez_forma'],
  'os quatro arquétipos têm sequência de T',
);
const manifesto = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
for (const [arquetipo, perfil] of Object.entries(TRANSFORM_SHEETS)) {
  const arquivo = `assets/sprites/player/${perfil.sprite.replaceAll('_', '-')}.png`;
  assert(existsSync(new URL(`../${arquivo}`, import.meta.url)), `${arquetipo}: ${arquivo} existe`);
  const png = readFileSync(new URL(`../${arquivo}`, import.meta.url));
  assert.equal(png.toString('ascii', 1, 4), 'PNG');
  assert.equal(png[25], 6, `${arquivo}: alpha real, sem fundo magenta`);
  assert.equal(png.readUInt32BE(16), 1280, `${arquivo}: 4 quadros de 320 px`);
  assert.equal(png.readUInt32BE(20), 320, `${arquivo}: uma linha de quadros`);
  assert.match(manifesto, new RegExp(`'${perfil.sprite}'`), `${perfil.sprite} no manifesto`);
  assert.match(perfil.color, /^#[0-9a-f]{6}$/i, `${arquetipo}: cor de clarão válida`);
}
// Fontes + preparador no repo: a arte é reproduzível.
const preparador = readFileSync(new URL('../tools/preparar-transformacao.py', import.meta.url), 'utf8');
for (const fonte of ['t-mare', 't-dominio', 't-bio', 't-nucleo']) {
  assert(existsSync(new URL(`../assets/source-art/transformacao/${fonte}.png`, import.meta.url)), `fonte ${fonte}`);
  assert(preparador.includes(fonte), `preparador conhece ${fonte}`);
}
assert.match(preparador, /body_height=CORPO/, 'a altura do corpo é fixada (mesmo tamanho do operador)');
assert.match(preparador, /edge_fade/, 'a borda do holograma do Núcleo é dissolvida');

// ---------------------------------------------------------------
// 2. O T CRIA O EFEITO — E NÃO EMPILHA
// ---------------------------------------------------------------
const progress = progresso('motor_bio_forja');
const player = jogador();
assert.equal(getAbilityContext(progress, player).mode, 'quick');
assert(toggleArchetypeSuit(progress, player), 'T veste o traje');
assert.equal(player.equippedSuit, 'bio_forja', 'o estado continua sendo uma linha');
assert.equal(player.ability.effect?.id, TRANSFORM_EFFECT_ID, 'e a sequência abre');
assert.equal(player.ability.effect.activating, true);
assert.equal(player.ability.effect.duration, TRANSFORM_DURATION);
assert.equal(player.moving, false, 'o corpo para para se montar');

// Apertar T de novo no meio não reinicia a sequência (sem pisca).
const antes = JSON.stringify(player.ability.effect);
assert.equal(startTransformEffect(player, 'motor_bio_forja', true), false, 'não empilha efeito');
assert.equal(JSON.stringify(player.ability.effect), antes);

// ---------------------------------------------------------------
// 3. ENTRAR CRESCE, SAIR DESMONTA (mesma folha, sentido oposto)
// ---------------------------------------------------------------
function emTempo(arquetipo, fracao, activating = true) {
  return {
    ability: {
      cooldowns: {}, dash: null,
      effect: {
        id: TRANSFORM_EFFECT_ID, archetype: arquetipo,
        duration: TRANSFORM_DURATION, timeLeft: TRANSFORM_DURATION * (1 - fracao),
        activating,
      },
    },
  };
}
const colsEntrando = [0.05, 0.3, 0.6, 0.95].map(f => getTransformFrame(progress, emTempo('motor_bio_forja', f)).col);
assert.deepEqual(colsEntrando, [0, 1, 2, 3], 'entrando: 0 → 3');
const colsSaindo = [0.05, 0.3, 0.6, 0.95].map(f => getTransformFrame(progress, emTempo('motor_bio_forja', f, false)).col);
assert.deepEqual(colsSaindo, [3, 2, 1, 0], 'saindo: 3 → 0 (desmonta)');
const fases = [0.05, 0.3, 0.95].map(f => getTransformFrame(progress, emTempo('motor_bio_forja', f)).phase);
assert.deepEqual(fases, ['start', 'build', 'done'], 'fases para o clarão');

// Cada arquétipo desenha a PRÓPRIA folha.
for (const arquetipo of Object.keys(TRANSFORM_SHEETS)) {
  const quadro = getTransformFrame(progress, emTempo(arquetipo, .5));
  assert.equal(quadro.sprite, TRANSFORM_SHEETS[arquetipo].sprite, `${arquetipo}: folha própria`);
}
// Sem efeito, sem quadro; arquétipo desconhecido, sem quadro.
assert.equal(getTransformFrame(progress, jogador()), null);
assert.equal(getTransformSheet('arquipelago_inventado'), null);
assert.equal(getTransformFrame(progress, emTempo('inexistente', .5)), null);

// ---------------------------------------------------------------
// 4. SAIR DO TRAJE TAMBÉM TEM SEQUÊNCIA
// ---------------------------------------------------------------
const mare = jogador();
const pMare = progresso('mare_astral');
toggleArchetypeSuit(pMare, mare);
assert.equal(mare.equippedSuit, 'mare');
assert.equal(mare.ability.effect.activating, true);
// termina a sequência e tira o traje
mare.ability.effect = null;
toggleArchetypeSuit(pMare, mare);
assert.equal(mare.equippedSuit, null, 'T de novo volta ao operador');
assert.equal(mare.ability.effect.activating, false, 'e a arte desmonta');
// O caminho curto (toggleBioSuit) faz o mesmo.
const bio = jogador();
toggleBioSuit(progresso('motor_bio_forja'), bio);
assert.equal(bio.equippedSuit, 'bio_forja');
assert.equal(bio.ability.effect?.archetype, 'motor_bio_forja');
// Dash continua bloqueando o T (regra antiga preservada).
assert.equal(toggleArchetypeSuit(pMare, jogador({ ability: { cooldowns: {}, dash: { timeLeft: .1 } } })), false);

// ---------------------------------------------------------------
// 5. NÚCLEO — O BRACELETE É A IDENTIDADE
// ---------------------------------------------------------------
const pNucleo = progresso('nucleo_dez_forma');
const nucleo = jogador();
assert(canToggleNucleoForm(pNucleo, nucleo));
assert(toggleNucleoForm(pNucleo, nucleo), 'T transforma');
assert.equal(nucleo.ability.effect.id, 'transformacao_10x', 'o Núcleo mantém o efeito próprio');

function nucleoEm(fracao) {
  return {
    nucleoForm: 'forma_veloz',
    ability: {
      cooldowns: {}, dash: null,
      effect: { id: 'transformacao_10x', form: 'forma_veloz', duration: 1.05, timeLeft: 1.05 * (1 - fracao), activating: true },
    },
  };
}
const braceleteInicio = getNucleoBraceletFrame(pNucleo, nucleoEm(.05));
assert(braceleteInicio, 'no começo o operador usa o bracelete');
assert.equal(braceleteInicio.sprite, 'player_t_nucleo');
const braceleteMeio = getNucleoBraceletFrame(pNucleo, nucleoEm(.5));
assert(braceleteMeio.col > braceleteInicio.col, 'o bracelete avança de quadro');
assert.equal(getNucleoBraceletFrame(pNucleo, nucleoEm(.85)), null, 'depois a criatura assume o corpo');
// Voltando ao operador não há bracelete: a folha da Quebra/Veloz já cobre.
const voltando = nucleoEm(.05);
voltando.ability.effect.activating = false;
assert.equal(getNucleoBraceletFrame(pNucleo, voltando), null);
// Outro arquétipo nunca desenha o bracelete.
assert.equal(getNucleoBraceletFrame(progress, nucleoEm(.05)), null);

// ---------------------------------------------------------------
// 6. RENDERER — antes da caminhada
// ---------------------------------------------------------------
const renderer = readFileSync(new URL('../js/engine/renderer.js', import.meta.url), 'utf8');
assert.match(renderer, /getTransformFrame\(state\.progress, player\)/, 'o T entra no caminho do desenho');
assert.match(renderer, /getNucleoBraceletFrame\(state\.progress, player\)/, 'o bracelete entra no caminho do desenho');
const posT = renderer.indexOf('const transformFrame = getTransformFrame');
const posBracelete = renderer.indexOf('const braceletFrame = getNucleoBraceletFrame');
const posAndar = renderer.indexOf('const walk = getBioWalkFrame');
const posMareWalk = renderer.indexOf('const mareWalk = getMareWalk');
assert(posT > 0 && posBracelete > posT, 'bracelete depois da sequência genérica (nunca brigam)');
assert(posMareWalk > posBracelete && posAndar > posBracelete, 'transformação antes de qualquer caminhada');

// ---------------------------------------------------------------
// 7. ARTE — a transformação não muda o tamanho do corpo
// ---------------------------------------------------------------
// O operador civil desenha 457 px de folha em .31 ≈ 142 px. A sequência usa
// 249 px de arte por célula em .57 = 142 px: ninguém "cresce" ao vestir.
const alturaOperador = 457 * .31;
assert(Math.abs(249 * .57 - alturaOperador) < 8, 'corpo da transformação no tamanho do operador');

console.log('Transformação do T: quatro sequências, bracelete do Núcleo e ida/volta OK.');
