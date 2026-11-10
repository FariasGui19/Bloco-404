// =====================================================================
// VISUAL DAS ULTIMATES — cada assinatura desenha sem quebrar e sem NaN
//
// Não há navegador no ambiente de teste, então em vez de olhar o pixel a gente
// inspeciona a lista de comandos de desenho: nenhum número pode virar NaN e
// nenhuma assinatura pode repetir a mesma sequência de outra (era a queixa
// "algumas animações meio parecidas").
// =====================================================================
import assert from 'node:assert/strict';

import { ULTIMATE_SIGNATURES, drawUltimateSignature } from '../js/engine/ultimate-visuals.js';
import { ULTIMATES } from '../js/data/ultimates.js';
import { ARCHETYPE_TOOLS, TOOL_ULTIMATES } from '../js/data/archetype-tools.js';

const ARQUETIPOS = ['motor_bio_forja', 'lamina_dominio_anciao', 'mare_astral', 'nucleo_dez_forma'];

// Contexto falso: registra o comando e os números, como o canvas faria.
function contextoFalso() {
  const log = [];
  const ctx = {
    log,
    globalAlpha: 1, lineWidth: 1, shadowBlur: 0, shadowColor: '', strokeStyle: '', fillStyle: '',
    save() { log.push(['save']); },
    restore() { log.push(['restore']); },
    beginPath() { log.push(['beginPath']); },
    closePath() { log.push(['closePath']); },
    moveTo(...a) { log.push(['moveTo', ...a]); },
    lineTo(...a) { log.push(['lineTo', ...a]); },
    arc(...a) { log.push(['arc', ...a]); },
    ellipse(...a) { log.push(['ellipse', ...a]); },
    quadraticCurveTo(...a) { log.push(['quadraticCurveTo', ...a]); },
    bezierCurveTo(...a) { log.push(['bezierCurveTo', ...a]); },
    fill() { log.push(['fill']); },
    stroke() { log.push(['stroke']); },
    fillRect(...a) { log.push(['fillRect', ...a]); },
    strokeRect(...a) { log.push(['strokeRect', ...a]); },
    // Placas da tectônica giram: o contexto falso precisa das duas.
    translate(...a) { log.push(['translate', ...a]); },
    rotate(...a) { log.push(['rotate', ...a]); },
  };
  return ctx;
}

// Cor de cada assinatura. `TOOL_ULTIMATES` (exportado pelas ferramentas
// jogáveis) deixou de listar as formas em projeto; por isso a cor vem direto
// do catálogo de cada arquétipo — arte desenhada existe, transformação não.
const CORES = {};
for (const tools of Object.values(ARCHETYPE_TOOLS)) {
  for (const tool of tools.tools) CORES[tool.ultimate.signature] = tool.ultimate.color;
}
for (const ultimate of [...Object.values(ULTIMATES), ...TOOL_ULTIMATES]) {
  CORES[ultimate.signature] ??= ultimate.color;
}

// Vinte assinaturas: quatro ferramentas + base de cada arquétipo. A
// `punho_eco` (Impacto de Eco) saiu do catálogo com a chegada da Quebra
// Sistemas — duas formas do Núcleo não podem desenhar o mesmo soco. A
// `tectonica` é a Ultimate da segunda forma jogável e tem desenho próprio.
assert.equal(ULTIMATE_SIGNATURES.length, 20, 'quatro arquétipos × (4 ferramentas + 1 base)');
assert.equal(new Set(ULTIMATE_SIGNATURES).size, ULTIMATE_SIGNATURES.length, 'nomes de assinatura únicos');

// ---------------------------------------------------------------
// Toda assinatura realmente desenha, em todas as fases do efeito
// ---------------------------------------------------------------
const impressoes = new Map();
for (const signature of ULTIMATE_SIGNATURES) {
  const cor = CORES[signature];
  assert(cor, `${signature}: precisa de uma Ultimate usando essa assinatura`);
  for (const t of [0, .35, .7, 1]) {
    const ctx = contextoFalso();
    const desenhou = drawUltimateSignature(ctx, {
      signature, kind: 'line', color: cor,
      x: 320, y: 210, t,
      dir: { x: .7, y: .7 }, radius: 6, range: 6,
    });
    assert.equal(desenhou, true, `${signature} em t=${t} desenha`);
    assert(ctx.log.length > 6, `${signature} em t=${t} não é um traço só`);
    for (const [metodo, ...args] of ctx.log) {
      for (const valor of args) {
        assert(Number.isFinite(valor), `${signature}.${metodo} gerou número inválido (${valor})`);
      }
    }
    if (t === .35) {
      impressoes.set(signature, ctx.log.map(([metodo, ...args]) => `${metodo}:${args.map(v => Math.round(v * 10) / 10).join(',')}`).join('|'));
    }
  }
}

// Sem assinatura (ou assinatura desconhecida) o renderer antigo assume.
for (const vazio of [undefined, null, 'nao_existe']) {
  const ctx = contextoFalso();
  assert.equal(drawUltimateSignature(ctx, { signature: vazio, kind: 'burst', color: '#fff', x: 0, y: 0, t: .5, dir: { x: 1, y: 1 } }), false, 'cai no desenho genérico');
  assert.equal(ctx.log.length, 0, 'não desenha nada quando devolve false');
}

// ---------------------------------------------------------------
// Identidade: nenhuma assinatura repete outra
// ---------------------------------------------------------------
const usadas = new Map();
for (const [signature, impressao] of impressoes) {
  assert(!usadas.has(impressao), `${signature} desenha igual a ${usadas.get(impressao)}`);
  usadas.set(impressao, signature);
}

// ---------------------------------------------------------------
// Catálogo: toda Ultimate tem assinatura, e ela é conhecida
// ---------------------------------------------------------------
for (const id of ARQUETIPOS) {
  const ultimate = ULTIMATES[id];
  assert(ultimate.signature, `${id}: Ultimate base sem assinatura`);
  assert(ULTIMATE_SIGNATURES.includes(ultimate.signature), `${id}: assinatura desconhecida`);
}
for (const ultimate of TOOL_ULTIMATES) {
  assert(ultimate.signature, `${ultimate.id}: sobrecarga sem assinatura`);
  assert(ULTIMATE_SIGNATURES.includes(ultimate.signature), `${ultimate.id}: assinatura desconhecida`);
}

// Cada arquétipo tem uma família visual própria: nada de assinatura cruzada.
const familia = {};
for (const archetype of ARQUETIPOS) {
  familia[archetype] = [
    ULTIMATES[archetype].signature,
    ...ARCHETYPE_TOOLS[archetype].tools.map(tool => tool.ultimate.signature),
  ];
  // Cinco por arquétipo (base + quatro ferramentas). O Núcleo trocou o
  // punho de eco pela tectônica: continua com cinco, todas distintas.
  const esperado = 5;
  assert.equal(familia[archetype].length, esperado, `${archetype} tem ${esperado} assinaturas`);
  assert.equal(new Set(familia[archetype]).size, esperado, `${archetype}: assinaturas distintas`);
}
// A segunda forma do Núcleo tem Ultimate própria: não é o mesmo desenho da
// Sobreposição 10X nem da Velocidade Temporal.
assert(familia.nucleo_dez_forma.includes('tectonica'), 'Quebra Sistemas tem assinatura própria');
assert(!familia.nucleo_dez_forma.includes('punho_eco'), 'o soco antigo saiu do catálogo');
const todas = Object.values(familia).flat();
assert.equal(new Set(todas).size, todas.length, 'assinaturas não se repetem entre arquétipos');

console.log('Visual das Ultimates: 20 assinaturas desenham sem NaN e todas são distintas OK.');
