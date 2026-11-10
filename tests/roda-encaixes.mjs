// =====================================================================
// TESTE — Roda do T: cada forma DENTRO do seu hexágono
//
// O relato: "a forma veloz não tá encaixada no espaço dela".
// A causa: as âncoras apontavam para o miolo do anel (31%/53%) e os cartões
// tinham 30%×36% — a arte transbordava por cima do núcleo. Agora a posição e
// o TAMANHO do encaixe vêm de dado e casam com a arte do anel (3:2).
// =====================================================================
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { __wheelInternals } from '../js/ui/nucleo-wheel.js';

const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../js/ui/nucleo-wheel.js', import.meta.url), 'utf8');

// 1) Cada slot tem posição E caixa próprias.
assert.match(js, /--slot-box/, 'o cartão recebe o tamanho do encaixe');
const ancoras = [...js.matchAll(/left: '([\d.]+)%', top: '([\d.]+)%',\s*box: '([\d.]+)%'/g)];
assert.equal(ancoras.length, 4, 'quatro encaixes declarados');
const posicoes = new Set(ancoras.map(m => `${m[1]}/${m[2]}`));
assert.equal(posicoes.size, 4, 'nenhum encaixe repete posição');

// 2) As alturas batem com os hexágonos da arte (grade de 10% da imagem):
//    topo ~15%, lados ~45%, base ~77%.
const tops = ancoras.map(m => Number(m[2])).sort((a, b) => a - b);
assert(tops[0] > 10 && tops[0] < 20, 'hexágono do topo fica na faixa de 15%');
assert(tops[1] > 38 && tops[1] < 52, 'hexágonos laterais na faixa de 45%');
assert(tops[1] === tops[2], 'os dois lados estão na MESMA altura');
assert(tops[3] > 70 && tops[3] < 84, 'hexágono da base fica na faixa de 77%');
// Meio do anel (31%) era o erro antigo: nenhum cartão pode cair lá.
assert(!tops.some(t => t > 25 && t < 35), 'nada de cartão no miolo do anel');

// 3) Larguras: topo/base no eixo vertical (50%), lados espelhados.
const lefts = ancoras.map(m => Number(m[1]));
assert.equal(lefts[0], 50, 'topo centralizado');
assert.equal(lefts[2], 50, 'base centralizada');
assert(Math.abs(lefts[1] - 75) < 2 && Math.abs(lefts[3] - 25) < 2, 'lados em 75% e 25%');
assert(Math.abs(lefts[1] + lefts[3] - 100) < 1, 'lados simétricos em torno do centro');

// 4) A caixa é pequena o bastante para caber no hexágono (e não cobrir o miolo).
for (const m of ancoras) {
  const box = Number(m[3]);
  assert(box >= 11 && box <= 17, `encaixe de ${box}% cabe na moldura`);
}

// 5) O CSS mantém o slot quadrado em PIXELS: o anel é 3:2, então a altura em %
//    precisa ser 1,5× a largura em %.
assert.match(css, /height: calc\(var\(--slot-box, 14%\) \* 1\.5\)/, 'slot quadrado em pixels');
assert.match(css, /width: 86%; height: 86%/, 'a arte cabe dentro do hexágono');

// 6) E não existe mais a regra antiga que esticava todos os cartões.
assert.doesNotMatch(css, /\.nucleo-art-ready \.nucleo-orbit \.nucleo-form \{ width: 30%; height: 36%; \}/,
  'a regra que transbordava foi removida');
assert.ok(__wheelInternals.playableCards({ archetype: 'nucleo_dez_forma' }).length >= 2);

console.log('Roda do T: quatro encaixes medidos na arte, slot quadrado e arte contida OK.');
