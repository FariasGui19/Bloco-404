// =====================================================================
// AÇÕES DO MOTOR BIO-FORJA — ataque nas quatro direções e propulsor (Q)
//
// Os dois buracos que sobravam no exo:
//
//   1. o soco só tinha arte de FRENTE — de costas e de lado o dano saía e o
//      corpo continuava andando;
//   2. o Q (PROPULSOR DE IMPULSO) reaproveitava a célula de caminhada, então
//      o avanço parecia deslize.
//
// Aqui as duas coisas viram asserção: folha no disco, no manifesto, quadro
// por direção/fase e prioridade sobre a caminhada.
// =====================================================================
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import {
  BIO_ATTACK_SHEETS, BIO_PROPULSOR_SHEET, getBioAttackFrame, getBioPropulsorFrame,
} from '../js/data/bio-action-animation.js';

const ARQ = 'motor_bio_forja';

function progresso() {
  return { archetype: ARQ, tools: {}, flags: {}, archetypeProgress: {} };
}

function jogador(extra = {}) {
  return {
    x: 10, y: 10, facing: 'down',
    health: 120, maxHealth: 120, energy: 100, maxEnergy: 100,
    equippedSuit: 'bio_forja',
    ability: { cooldowns: {}, dash: null },
    moving: false,
    combat: null,
    ultimate: null,
    ...extra,
  };
}

// ataque em andamento, com a fração pedida
function atacando(facing, fracao = .5) {
  return jogador({
    facing,
    combat: { style: 'motor_bio_forja', timeLeft: 1 - fracao, duration: 1 },
  });
}

// ------------------------------------------------
// 1. AS FOLHAS EXISTEM, NO MANIFESTO E NO DISCO
// ------------------------------------------------
const manifesto = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
const arquivos = new Set([
  ...Object.values(BIO_ATTACK_SHEETS).map(s => s.sprite),
  BIO_PROPULSOR_SHEET.sprite,
]);
assert.equal(arquivos.size, 4, 'frontal, costas, lateral e propulsor — sem duplicar sprite');

for (const sprite of arquivos) {
  const caminho = `assets/sprites/player/${sprite.replaceAll('_', '-')}.png`;
  assert(existsSync(new URL(`../${caminho}`, import.meta.url)), `${caminho} existe`);
  const png = readFileSync(new URL(`../${caminho}`, import.meta.url));
  assert.equal(png.toString('ascii', 1, 4), 'PNG');
  assert.equal(png[25], 6, `${caminho}: alpha real, sem fundo magenta`);
  assert.match(manifesto, new RegExp(`'${sprite}'`), `${sprite} no manifesto`);
}

// As três folhas novas seguem o padrão do preparador: 4 quadros de 320 px.
for (const sprite of ['player_bio_ataque_costas', 'player_bio_ataque_lateral', 'player_bio_propulsor']) {
  const png = readFileSync(new URL(`../assets/sprites/player/${sprite.replaceAll('_', '-')}.png`, import.meta.url));
  assert.equal(png.readUInt32BE(16), 1280, `${sprite}: 4 quadros de 320 px`);
  assert.equal(png.readUInt32BE(20), 320, `${sprite}: uma linha de quadros`);
}
// A frontal aprovada é preservada exatamente como estava: 9 quadros de 355.
const frontal = readFileSync(new URL('../assets/sprites/player/player-bio-ataque-frontal.png', import.meta.url));
assert.equal(frontal.readUInt32BE(16), 3200, 'a folha frontal tem 9 quadros (3200 px de largura)');
assert.equal(frontal.readUInt32BE(20), 800);

// ------------------------------------------------
// 2. QUADRO POR DIREÇÃO — nada cai sempre na arte da frente
// ------------------------------------------------
for (const [facing, sheet] of Object.entries(BIO_ATTACK_SHEETS)) {
  const quadro = getBioAttackFrame(progresso(), atacando(facing, .5));
  assert(quadro, `${facing}: soco tem quadro`);
  assert.equal(quadro.sprite, sheet.sprite, `${facing}: folha própria`);
  assert.equal(quadro.flip, facing === 'left', `${facing}: só a lateral esquerda é espelhada`);
  assert(quadro.col >= 0 && quadro.col < sheet.frames, `${facing}: quadro dentro da folha`);
}

// costas NÃO é a folha frontal nem um espelho dela: é vista de trás.
const costas = getBioAttackFrame(progresso(), atacando('up', .5));
assert.equal(costas.sprite, 'player_bio_ataque_costas');
assert.equal(costas.flip, false);
assert.notEqual(costas.sprite, BIO_ATTACK_SHEETS.down.sprite);

// A fase avança com o relógio do combate (o mesmo que governa o dano).
const inicio = getBioAttackFrame(progresso(), atacando('right', .1));
const meio = getBioAttackFrame(progresso(), atacando('right', .5));
const fim = getBioAttackFrame(progresso(), atacando('right', .95));
assert(inicio.col < meio.col && meio.col < fim.col, 'o soco percorre a folha');
assert.equal(inicio.phase, 'windup');
assert.equal(fim.phase, 'hit');

// Sem ataque, sem arte — e outro arquétipo nunca usa estas folhas.
assert.equal(getBioAttackFrame(progresso(), jogador()), null);
assert.equal(getBioAttackFrame(progresso(), jogador({ combat: { style: 'lamina_dominio_anciao', timeLeft: .3, duration: 1 } })), null);
assert.equal(getBioAttackFrame({ archetype: 'mare_astral' }, atacando('up')), null);
// Sem o traje equipado o corpo é o operador civil.
assert.equal(getBioAttackFrame(progresso(), atacando('up', .5) && jogador({ equippedSuit: null, combat: { style: 'motor_bio_forja', timeLeft: .5, duration: 1 } })), null);
// Varredura tem prioridade sobre o soco.
const varrendo = atacando('up', .5);
varrendo.ability.scanning = .4;
assert.equal(getBioAttackFrame(progresso(), varrendo), null);

// ------------------------------------------------
// 3. PROPULSOR — quatro fases presas ao tempo real do dash
// ------------------------------------------------
function avancando(fracao) {
  return jogador({
    ability: { cooldowns: {}, scanning: 0, active: 'bio_dash', dash: { timeLeft: .18 * (1 - fracao), duration: .18, speed: 12 } },
  });
}
const fases = [.05, .3, .6, .95].map(f => getBioPropulsorFrame(progresso(), avancando(f))?.col);
assert.deepEqual(fases, [0, 1, 2, 3], 'agachar → acender → avanço → pouso, em ordem');
assert.equal(getBioPropulsorFrame(progresso(), jogador()), null, 'parado não usa a folha do Q');
const outroTraje = avancando(.5);
outroTraje.equippedSuit = null;
assert.equal(getBioPropulsorFrame(progresso(), outroTraje), null, 'sem traje, sem propulsor');
const outroArquetipo = avancando(.5);
assert.equal(getBioPropulsorFrame({ archetype: 'nucleo_dez_forma' }, outroArquetipo), null);

// ------------------------------------------------
// 4. RENDERER — as ações entram antes da caminhada
// ------------------------------------------------
const renderer = readFileSync(new URL('../js/engine/renderer.js', import.meta.url), 'utf8');
assert.match(renderer, /getBioAttackFrame\(state\.progress, player\)/, 'o ataque consulta a animação');
assert.match(renderer, /getBioPropulsorFrame\(state\.progress, player\)/, 'o Q consulta a animação');
const posAtaque = renderer.indexOf('const attackFrame = getBioAttackFrame');
const posAndar = renderer.indexOf('const walk = getBioWalkFrame');
const posDash = renderer.indexOf('const propulsor = getBioPropulsorFrame');
assert(posAtaque > 0 && posAndar > posAtaque, 'o soco vem antes do andar');
assert(posDash > 0 && posDash < posAndar, 'o propulsor vem antes do andar');
// O ramo antigo do soco só-frontal não pode voltar.
assert.doesNotMatch(renderer, /player\.facing === 'down' && attack\?\.style === 'motor_bio_forja'/,
  'o soco não é mais exclusivo da vista frontal');
// Nem o Q com alpha .8 na célula de caminhada (o fallback existe, mas depois).
const blocoNovo = renderer.slice(posDash, renderer.indexOf('const mareWalk'));
assert.match(blocoNovo, /player_bio_propulsor|propulsor\.sprite/, 'o Q usa a folha do propulsor');

// ------------------------------------------------
// 5. O SCRIPT DE ARTE COBRE AS TRÊS FOLHAS
// ------------------------------------------------
const preparador = readFileSync(new URL('../tools/preparar-bio-acoes.py', import.meta.url), 'utf8');
for (const fonte of ['bio-ataque-costas', 'bio-ataque-lateral', 'bio-propulsor']) {
  assert(existsSync(new URL(`../assets/source-art/bio/${fonte}.png`, import.meta.url)), `fonte ${fonte}`);
  assert(preparador.includes(fonte), `preparador conhece ${fonte}`);
}
const helper = readFileSync(new URL('../tools/bio_arte.py', import.meta.url), 'utf8');
assert.match(helper, /def remove_magenta/, 'recorte de magenta compartilhado');
assert.match(helper, /def compose/, 'células iguais compartilhadas');

console.log('Bio-Forja: soco nas quatro direções e propulsor com arte própria OK.');
