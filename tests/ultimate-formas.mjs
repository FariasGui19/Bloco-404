// =====================================================================
// ULTIMATE DAS DUAS FORMAS DO NÚCLEO — execução desenhada
//
// O relato do criador: "faltou fazer e implementar a animação da Ultimate das
// duas formas". Aqui ficam garantidos os três elos:
//   1. a folha existe, com 4 quadros e alpha real;
//   2. está no manifesto de carregamento;
//   3. o estado da Ultimate escolhe o quadro certo (carga → 0/1, soltura →
//      2/3), com o corpo da FORMAtual, não uma arte genérica.
// =====================================================================
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { ULTIMATE_SHEETS, getUltimateFrame } from '../js/data/nucleo-ultimate-animation.js';
import { NUCLEO_BRUTA, NUCLEO_VELOZ } from '../js/data/nucleo-forms.js';
import { BRUTA_SCALE, BRUTA_FOOT_Y } from '../js/data/bruta-animation.js';

const NUCLEO = 'nucleo_dez_forma';
const manifesto = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');

for (const [forma, folha] of Object.entries(ULTIMATE_SHEETS)) {
  const caminho = `assets/sprites/player/${folha.sprite.replace(/_/g, '-')}.png`;
  assert(existsSync(caminho), `${forma}: folha da Ultimate existe (${caminho})`);
  const png = readFileSync(caminho);
  assert.equal(png.toString('ascii', 1, 4), 'PNG');
  assert.equal(png[25], 6, `${forma}: alpha real, sem fundo pintado`);
  const largura = png.readUInt32BE(16), altura = png.readUInt32BE(20);
  assert.equal(largura, folha.cell * folha.cols, `${forma}: 4 quadros de ${folha.cell} px`);
  assert.equal(altura, folha.cell);
  // A folha precisa estar carregada, senão o renderer não tem o que desenhar.
  assert(manifesto.includes(`${folha.sprite}'`), `${forma}: sprite no manifesto do jogo`);
}

// A Quebra usa a MESMA escala do corpo parado: o corpo não infla na Ultimate
// (quem cresce é o gesto: marreta erguida e fenda no chão).
assert.equal(ULTIMATE_SHEETS[NUCLEO_BRUTA].scale, BRUTA_SCALE);
assert.equal(ULTIMATE_SHEETS[NUCLEO_BRUTA].footY, BRUTA_FOOT_Y);
// A Veloz continua sendo a criatura pequena: a Ultimate dela pode crescer um
// pouco na leitura do golpe, mas não pode dobrar de tamanho em um quadro.
const alturaAndarVeloz = 192 * .5;                        // célula 256 × .5
const alturaUltVeloz = 175 * ULTIMATE_SHEETS[NUCLEO_VELOZ].scale; // arte útil 175
assert(alturaUltVeloz > alturaAndarVeloz, 'a Ultimate da Veloz tem presença');
assert(alturaUltVeloz < alturaAndarVeloz * 1.45, 'mas não vira outro bicho');

const jogador = (forma) => ({
  nucleoForm: forma,
  facing: 'down',
  ability: { cooldowns: {}, dash: null, scanning: 0 },
  ultimate: { charge: 0, chargeDuration: .42, chargeDefinition: null, effect: null },
});

// Sem forma ativa não há execução de Ultimate do Núcleo.
assert.equal(getUltimateFrame({ archetype: NUCLEO }, jogador(null)), null);
// Outro arquétipo nunca usa esta folha.
assert.equal(getUltimateFrame({ archetype: 'mare_astral' }, jogador(NUCLEO_BRUTA)), null);

for (const forma of [NUCLEO_VELOZ, NUCLEO_BRUTA]) {
  const player = jogador(forma);

  // 1) CARGA: dois quadros, do começo ao fim da preparação.
  player.ultimate.charge = .42;
  const inicio = getUltimateFrame({ archetype: NUCLEO }, player);
  assert.equal(inicio.col, 0, `${forma}: carga começa no quadro 0`);
  assert.equal(inicio.sprite, ULTIMATE_SHEETS[forma].sprite);
  assert.equal(inicio.phase, 'charge');
  player.ultimate.charge = .05;
  assert.equal(getUltimateFrame({ archetype: NUCLEO }, player).col, 1, `${forma}: carga termina no quadro 1`);

  // 2) SOLTURA: impacto e recuperação.
  player.ultimate.charge = 0;
  player.ultimate.effect = { timeLeft: .95, duration: .95 };
  assert.equal(getUltimateFrame({ archetype: NUCLEO }, player).phase, 'impact');
  assert.equal(getUltimateFrame({ archetype: NUCLEO }, player).col, 2, `${forma}: impacto no quadro 2`);
  player.ultimate.effect.timeLeft = .1;
  const fim = getUltimateFrame({ archetype: NUCLEO }, player);
  assert.equal(fim.col, 3, `${forma}: recuperação no quadro 3`);
  assert.equal(fim.phase, 'recover');

  // 3) Onda de choque/fenda acompanha a arte (raio e cor da definição).
  player.ultimate.effect = { timeLeft: .5, duration: .95, color: '#ff7a3c', radius: 5.6, form: forma };
  assert.equal(getUltimateFrame({ archetype: NUCLEO }, player).flash, '#ff7a3c');

  // 3b) Se quem soltou foi OUTRA forma, esta não veste a arte alheia.
  player.ultimate.effect.form = forma === NUCLEO_BRUTA ? NUCLEO_VELOZ : NUCLEO_BRUTA;
  assert.equal(getUltimateFrame({ archetype: NUCLEO }, player), null, `${forma}: não usa a arte da outra forma`);
  player.ultimate.effect.form = forma;

  // 4) Ação que trava o corpo desliga a pose de Ultimate.
  player.ability.dash = { timeLeft: .2 };
  assert.equal(getUltimateFrame({ archetype: NUCLEO }, player), null);
  player.ability.dash = null;
}

// O renderer precisa consultar a execução ANTES das poses de andar/atacar,
// senão a Ultimate é atropelada pela locomoção.
const renderer = readFileSync(new URL('../js/engine/renderer.js', import.meta.url), 'utf8');
const corpo = renderer.slice(renderer.indexOf('function drawPlayerSprite'));
const posUltimate = corpo.indexOf('getUltimateFrame');
const posVeloz = corpo.indexOf('getVelozAnimation');
const posBruta = corpo.indexOf('getBrutaAnimation');
assert(posUltimate > 0 && posUltimate < posVeloz && posUltimate < posBruta,
  'execução da Ultimate desenhada antes da locomoção');

console.log('Ultimate do Núcleo: folhas das duas formas no manifesto, quadros por fase e prioridade OK.');
