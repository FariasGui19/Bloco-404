// =====================================================================
// QUEBRA SISTEMAS EM JOGO — os quatro relatos do criador, um por um
//
// 1. a roda do T não trocava de imagem entre as formas;
// 2. a transformação mostrava a arte do Pulso Veloz;
// 3. a forma estava pequena demais para o mapa;
// 4. o Q "destransformava e transformava" sem socar, e o Ultimate não saía.
//
// Cada um virou uma asserção aqui para não voltar.
// =====================================================================
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { state } from '../js/game/state.js';
import { input } from '../js/engine/input.js';
import { toggleNucleoForm, updateNucleoForm, getActiveFormHitCost, chargeFormHit } from '../js/game/nucleo-form.js';
import { canCastUltimate, beginUltimate, getUltimateStatus, updateUltimate } from '../js/game/ultimate.js';
import { getDerivedStats } from '../js/game/rpg.js';
import { getPlayerMoveSpeed } from '../js/game/player.js';
import { BRUTA_SCALE, getBrutaAnimation } from '../js/data/bruta-animation.js';
import { NUCLEO_BRUTA, NUCLEO_FORMS, NUCLEO_VELOZ, getSelectedNucleoForm } from '../js/data/nucleo-forms.js';
import { getTools } from '../js/data/archetype-tools.js';
import { ensureArchetypeProgress } from '../js/game/progression.js';
import { getArchetypeAbilities } from '../js/game/abilities.js';

function progressoBruto() {
  const progress = {
    archetype: 'nucleo_dez_forma',
    archetypeProgress: {},
    abilities: getArchetypeAbilities('nucleo_dez_forma'),
    tools: { nucleo_dez_forma: 'nucleo_bruto' },
    flags: {},
  };
  ensureArchetypeProgress(progress, 'nucleo_dez_forma');
  progress.archetypeProgress.nucleo_dez_forma.level = 3;
  return progress;
}

function jogador() {
  return {
    x: 10, y: 10, facing: 'down',
    health: 120, maxHealth: 120,
    energy: 100, maxEnergy: 100,
    ability: { cooldowns: {}, dash: null },
    nucleoForm: null,
    moving: false,
    combat: null,
    ultimate: { cooldown: 0, buff: null, effect: null, casts: 0, charge: 0, shake: null, flash: null },
    facingUp: null,
  };
}

// ---------------------------------------------------------------
// 1. RODA — as duas formas têm miniatura própria (antes só a Veloz tinha)
// ---------------------------------------------------------------
const ICONES = {
  [NUCLEO_VELOZ]: 'assets/sprites/ui/nucleo-forma-veloz.png',
  [NUCLEO_BRUTA]: 'assets/sprites/ui/nucleo-quebra-sistemas.png',
};
for (const [id, path] of Object.entries(ICONES)) {
  assert(existsSync(path), `${id}: miniatura existe em ${path}`);
  const png = readFileSync(path);
  assert.equal(png.toString('ascii', 1, 4), 'PNG');
  assert.equal(png[25], 6, `${id}: miniatura com alpha real`);
  assert(png.length > 4000, `${id}: miniatura não é placeholder`);
}
const roda = readFileSync(new URL('../js/ui/nucleo-wheel.js', import.meta.url), 'utf8');
assert.match(roda, /nucleo-forma-veloz\.png/, 'roda aponta a miniatura da Veloz');
assert.match(roda, /nucleo-quebra-sistemas\.png/, 'roda aponta a miniatura da Quebra');
assert.doesNotMatch(roda, /hydrateSheetPreviews/, 'roda não depende mais de recorte em runtime');
assert.match(roda, /pointerdown/, 'clique/t toque nos cartões usam o mesmo caminho');

// ---------------------------------------------------------------
// 2. TRANSFORMAÇÃO — a Quebra monta com a própria arte, não com a do Veloz
// ---------------------------------------------------------------
const progress = progressoBruto();
assert.equal(getSelectedNucleoForm(progress).id, NUCLEO_BRUTA, 'a escolha decide a forma');
const player = jogador();
assert(toggleNucleoForm(progress, player));
assert.equal(player.nucleoForm, NUCLEO_BRUTA);
assert.equal(player.ability.effect.form, NUCLEO_BRUTA, 'o efeito carrega QUAL forma entrou');

const transformacao = 'assets/sprites/player/player-10x-bruta-transformacao.png';
assert(existsSync(transformacao), 'folha de transformação da Quebra existe');
const pngTransformacao = readFileSync(transformacao);
assert.equal(pngTransformacao.readUInt32BE(16), 1024, '4 quadros de 256 px');
assert.equal(pngTransformacao.readUInt32BE(20), 256, 'uma linha de quadros');

const renderer = readFileSync(new URL('../js/engine/renderer.js', import.meta.url), 'utf8');
assert.match(renderer, /player_10x_bruta_transformacao/, 'renderer desenha a transformação da Quebra');
// A folha do Pulso Veloz não pode voltar a ser usada para a Quebra: quem
// desenha `player_10x_q` na transformação precisa ser o ramo do ELSE.
const blocoTransformacao = renderer.slice(renderer.indexOf("effect?.id === 'transformacao_10x'"), renderer.indexOf('const pulseFrame'));
assert.match(blocoTransformacao, /effect\.form === NUCLEO_BRUTA/, 'a transformação decide pela forma');
assert(blocoTransformacao.indexOf('player_10x_q') > blocoTransformacao.indexOf('NUCLEO_BRUTA'), 'arte da Veloz só depois do ramo da Quebra');
assert.equal((blocoTransformacao.match(/player_10x_q/g) ?? []).length, 1, 'uma única referência à folha da Veloz');

// ---------------------------------------------------------------
// 3. TAMANHO — a forma é maior que o operador, não uma miniatura
// ---------------------------------------------------------------
// Altura útil da célula da Quebra (178 px) × escala do renderer.
const alturaBruta = 178 * BRUTA_SCALE;
// Operador civil: 457 px de folha em escala 0.31 (config PURCHASE PLAYER_SPRITE).
const alturaOperador = 457 * 0.31;
assert(alturaBruta > alturaOperador * 1.15, `Quebra (${alturaBruta.toFixed(0)}px) precisa ser claramente maior que o operador (${alturaOperador.toFixed(0)}px)`);
assert(BRUTA_SCALE > .85 && BRUTA_SCALE <= 1, 'escala dentro do crível para o mapa');
// O topo da arte dentro da célula (y=42 de 256) não pode ser cortado.
assert(220 - 178 * BRUTA_SCALE >= 40, 'a cabeça do bloco continua dentro da célula');
// E ainda é menor que a Forma Veloz em corrida, que é a forma rápida do kit.
assert(alturaBruta > 260 * .5 * .7, 'a Quebra não pode encolher abaixo da Veloz');

// ---------------------------------------------------------------
// 3b. ATAQUE DE COSTAS — folha própria nas quatro fases
// ---------------------------------------------------------------
const costas = 'assets/sprites/player/player-10x-bruta-ataque-costas.png';
assert(existsSync(costas), 'folha de ataque de costas existe');
const pngCostas = readFileSync(costas);
assert.equal(pngCostas.readUInt32BE(16), 1024, '4 quadros de 256 px');
assert.equal(pngCostas.readUInt32BE(20), 256);
assert(readFileSync(new URL('../js/main.js', import.meta.url), 'utf8').includes("player_10x_bruta_ataque_costas'"),
  'folha de costas no manifesto');
const { getBrutaAnimation: mover } = await import('../js/data/bruta-animation.js');
const subindo = jogador();
subindo.nucleoForm = NUCLEO_BRUTA;
subindo.facing = 'up';
subindo.combat = { style: 'nucleo_dez_forma', timeLeft: .4, duration: .48, dx: 1, dy: 1 };
assert.equal(mover(progressoBruto(), subindo, 0).sprite, 'player_10x_bruta_ataque_costas',
  'golpe para cima usa a arte de costas (era a pose parada)');
subindo.combat = null;
assert.equal(mover(progressoBruto(), subindo, 0).sprite, 'player_10x_bruta_parado',
  'parado de costas continua na pose de costas');

// ---------------------------------------------------------------
// 4a. Q — a pancada NÃO reaproveita o id da transformação
// ---------------------------------------------------------------
player.ability.effect = null;
assert.equal(getActiveFormHitCost(player), 3, 'cada golpe custa 3 s de barra');
player.nucleoRuntime.remaining = 20;
assert.equal(chargeFormHit(player), 3, 'o golpe desconta da barra');
assert.equal(player.nucleoRuntime.remaining, 17);

state.progress = progress;
state.player = player;
const antes = player.nucleoForm;
// Simula o loop: Q sem alvo válido ainda precisa iniciar a preparação.
const { updateAbilities } = await import('../js/game/abilities.js');
input.pressed.add('q');
updateAbilities(.016);
input.pressed.clear();
assert.equal(player.nucleoForm, antes, 'Q não destransforma');
assert.equal(player.ability.cast?.id, 'pancada_quebra', 'Q abre a preparação da marreta');
assert.equal(player.ability.effect, null, 'Q não mexe no efeito de transformação');
for (let i = 0; i < 40 && player.ability.cast; i++) updateAbilities(.02);
assert.equal(player.ability.cast, null, 'a preparação termina sozinha');

// O golpe precisa MACHUCAR: alvo à frente perde vida, é empurrado e a
// câmera sente o peso. Era o que faltava no relato "o Q não faz nada".
const alvo = { x: player.x + .9, y: player.y + .9, health: 400, maxHealth: 400 };
state.trainingTargets = [alvo];
player.ability.cast = null;
player.facing = 'down';
player.ability.cooldowns.pancada_quebra = 0;
player.nucleoRuntime.remaining = 20;
input.pressed.add('q');
updateAbilities(.016);
input.pressed.clear();
assert.equal(player.ability.cast?.id, 'pancada_quebra');
const vidaAntes = alvo.health, posAntes = alvo.x, barraAntes = player.nucleoRuntime.remaining;
for (let i = 0; i < 60 && player.ability.cast; i++) updateAbilities(.02);
assert.equal(player.ability.cast, null, 'a preparação solta a marreta');
assert(alvo.health < vidaAntes, `o alvo perde vida (${vidaAntes} → ${alvo.health})`);
assert(alvo.x > posAntes, 'o impacto arremessa o alvo para longe');
assert.equal(player.ultimate.shake?.source, 'pancada', 'a câmera sente o peso');
assert.equal(player.combat?.style, 'nucleo_dez_forma', 'a marreta anima na folha própria');
assert.equal(player.nucleoRuntime.remaining, barraAntes - 3, 'o golpe consome 3s da barra da forma');
delete state.trainingTargets;

// ---------------------------------------------------------------
// 4b. ULTIMATE — com a Quebra ativa o F solta de verdade
// ---------------------------------------------------------------
player.ability.effect = null;
player.nucleoRuntime.remaining = 20;
player.ultimate = { cooldown: 0, buff: null, effect: null, casts: 0, charge: 0, shake: null, flash: null };
assert.equal(canCastUltimate(player, progress).ok, true, 'transformado em Quebra pode soltar');
const status = getUltimateStatus(player, progress);
assert.equal(status.needsForm, false, 'HUD não pede transformação com a forma ativa');
assert.equal(status.definition.name, 'DEVORADOR DE TECTÔNICA');
const soltou = beginUltimate({ player, progress, targets: [], showMessage: () => {}, instant: true, rng: () => .5 });
assert(soltou?.kind === 'burst', 'a Ultimate da Quebra é impacto radial');
assert.equal(player.ultimate.effect.signature, 'tectonica');
assert.equal(player.ultimate.casts, 1);

// A regra continua valendo para quem não está transformado.
const parado = jogador();
assert.equal(canCastUltimate(parado, progress).ok, false);
assert.match(canCastUltimate(parado, progress).reason, /TRANSFORME-SE/);

// ---------------------------------------------------------------
// Bonus: velocidade e dano próprios da forma (checagem de identidade)
// ---------------------------------------------------------------
const veloz = jogador();
const bruto = jogador();
bruto.nucleoForm = NUCLEO_BRUTA;
veloz.nucleoForm = NUCLEO_VELOZ;
const vBruta = getPlayerMoveSpeed(progress, bruto);
const vBase = getPlayerMoveSpeed({ archetype: 'nucleo_dez_forma' }, jogador());
const vVeloz = getPlayerMoveSpeed(progress, veloz);
assert(vBruta < vBase, 'inércia extrema: mais lento que o operador');
assert(vBruta < vVeloz, 'e bem mais lento que a Veloz');
const danoBruta = getDerivedStats(progress, bruto).basicDamage;
const danoBase = getDerivedStats(progress, jogador()).basicDamage;
assert(danoBruta > danoBase * 1.5, 'marreta bate muito mais forte');
assert.equal(getBrutaAnimation({ archetype: 'nucleo_dez_forma' }, bruto, 0).sprite, 'player_10x_bruta_parado');
assert.equal(NUCLEO_FORMS[NUCLEO_BRUTA].name, 'QUEBRA SISTEMAS');
assert(getTools('nucleo_dez_forma').some(tool => tool.id === 'nucleo_bruto' && tool.playable));

console.log('Quebra Sistemas: roda, transformação própria, escala, Q e Ultimate OK.');
