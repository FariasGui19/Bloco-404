// =====================================================================
// PRAIA 2.0 — CONTRATO DE PERFORMANCE
//
// A praia antiga desenhava ~1600 arcos de onda + ~586 tiles de espuma e
// varria ~3249 células por quadro, e o resultado ainda ficava em degrau.
// A regra nova é: o trabalho pesado acontece UMA vez por mapa (textura de
// mar assada + superfície de areia), e por frame sobra só um orçamento fixo.
//
// Este teste protege essa regra. Ele não mede FPS (não há browser aqui):
// mede o que escala com o zoom, que era exatamente o que afundava o quadro.
// =====================================================================
import assert from 'node:assert/strict';
import { createSeaTexture, getSeaCanvas, foamArcs, WATER_SCALE } from '../js/engine/beach-water.js';
import { createCoastField } from '../js/engine/coast-field.js';
import { map as praia } from '../js/data/worlds/arquipelago-rotas-perdidas/praia-inicial.js';
import { map as enseada } from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';

const maps = [praia, enseada];

// --- 1. O mar é assado: uma textura por mapa, e nada por frame ----------
console.log('Custo de montagem (uma vez por mapa, não por frame):');
for (const map of maps) {
  const t0 = performance.now();
  const textura = createSeaTexture(map.aguaPraia);
  const msMar = performance.now() - t0;

  const t1 = performance.now();
  createCoastField(map.aguaPraia, WATER_SCALE);
  const msCampo = performance.now() - t1;

  const area = map.aguaPraia.length * map.aguaPraia[0].length;
  assert.equal(textura.width, map.aguaPraia[0].length * textura.scale);
  assert.equal(textura.height, map.aguaPraia.length * textura.scale);

  // Uma única folha de mapa não pode custar mais que ~1/4 de segundo, senão
  // a primeira entrada no mapa engasga de forma visível.
  const total = msMar + msCampo;
  assert(total < 350, `${map.id}: montagem lenta (${total.toFixed(0)} ms)`);

  console.log(`  ${map.id.padEnd(20)} ${msMar.toFixed(0)} ms mar + ${msCampo.toFixed(0)} ms campo  (${textura.width}x${textura.height} px, ${area} tiles)`);
}

// --- 2. A animação tem teto FIXO, independente do zoom ------------------
// O orçamento é a defesa central: afastar a câmera antes multiplicava as
// ondas; agora o número de arcos é o mesmo em qualquer enquadramento.
const enorme = { x0: 0, y0: 0, x1: praia.aguaPraia[0].length - 1, y1: praia.aguaPraia.length - 1 };
const pequeno = { x0: 0, y0: 0, x1: 9, y1: 9 };

// Melhor de 5: uma medida só pegava a pausa do coletor de lixo deixada pela
// montagem do mar logo acima (a textura com moldura aloca alguns MB) e o
// teste oscilava entre 0,4 ms e 5 ms sem o código mudar. O contrato é o
// custo da FUNÇÃO, não o do GC.
let arcosCheio = null, msCheio = Infinity;
for (let i = 0; i < 5; i++) {
  const t2 = performance.now();
  arcosCheio = foamArcs(praia.aguaPraia, enorme, 1.7, 96);
  msCheio = Math.min(msCheio, performance.now() - t2);
}
const arcosPerto = foamArcs(praia.aguaPraia, pequeno, 1.7, 96);

assert(arcosCheio.length <= 96, `orçamento de ondas estourado: ${arcosCheio.length}`);
assert(arcosPerto.length <= 96, 'orçamento de ondas estourado no zoom de perto');
assert(arcosCheio.length >= arcosPerto.length, 'o mapa inteiro deveria gerar pelo menos tantos arcos quanto um canto');

// Regenerar as ondas do mapa inteiro tem que ser barato o bastante para
// rodar a 60 FPS (16,7 ms por quadro) com folga.
assert(msCheio < 4, `foamArcs caro demais (${msCheio.toFixed(2)} ms)`);
console.log(`\nOndas por frame: ${arcosCheio.length} no mapa inteiro / ${arcosPerto.length} de perto (teto 96, ${msCheio.toFixed(2)} ms)`);

// --- 3. Determinismo: a textura é estável entre chamadas -----------------
const a = createSeaTexture(praia.aguaPraia);
const b = createSeaTexture(praia.aguaPraia);
assert.deepEqual(a.pixels, b.pixels, 'textura do mar deve ser determinística');

// --- 4. Cache de canvas: duas leituras devolvem o MESMO objeto -----------
// (no browser; em Node `getSeaCanvas` não tem `document`, então só roda se
//  houver DOM — o teste não falha, apenas pula a checagem)
if (typeof document !== 'undefined') {
  const c1 = getSeaCanvas(praia), c2 = getSeaCanvas(praia);
  assert.equal(c1, c2, 'a textura do mar deve ser cacheada por mapa');
} else {
  console.log('Cache de canvas: pulado (sem DOM neste ambiente).');
}

// --- 5. Orçamento de memória --------------------------------------------
// Duas texturas grandes por mapa (~16 MB na praia) seriam pesadas em mobile.
// O teto aqui é generoso de propósito: avisa se alguém dobrar a escala.
for (const map of maps) {
  const t = createSeaTexture(map.aguaPraia);
  const mb = t.pixels.byteLength / 1024 / 1024;
  assert(mb < 8, `${map.id}: textura do mar com ${mb.toFixed(1)} MB`);
  console.log(`Memória ${map.id.padEnd(20)} ${mb.toFixed(1)} MB de textura`);
}

console.log('\nPraia 2.0: mar assado, orçamento de ondas fixo e memória sob controle.');
