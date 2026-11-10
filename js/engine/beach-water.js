// =====================================================================
// ÁGUA DA PRAIA — textura única, assada uma vez por mapa
//
// ANTES: `drawBeachSea` montava o degradê (certo, em cache), mas
// `drawBeachRipples` desenhava ~1600 arcos e `drawBeachShore` varria os
// tiles rasos do range **a cada frame**. Medido no mapa real a 55 % de zoom:
// 1618 ondas + 586 tiles de espuma + 3249 células varridas por quadro.
// Era esse o custo que segurava a praia em 20–50 FPS.
//
// AGORA: o mar nasce inteiro assado numa textura contínua de mundo, que já
// traz o degradê, os bancos submersos, as cáusticas, a espuma da margem
// (com largura e recorte variáveis) e a linha de espuma recuada. Por frame
// sobra apenas a animação aditiva: poucos arcos na faixa visível.
//
// A textura é derivada da grade `aguaPraia` e NÃO altera colisão: quem diz
// onde se anda continua sendo `walkMask`/`layout`.
// =====================================================================
import { CONFIG } from '../config.js';
import { createCoastField, sample as sampleCoast } from './coast-field.js';

const TILE_W = CONFIG.TILE_W;
const TILE_H = CONFIG.TILE_H;

// Altura de textura por tile. 8 é suficiente para o degradê; areia e espuma
// ganham mais detalhe porque são lidas de perto, então usam a mesma escala
// para as duas texturas se encontrarem sem emenda.
export const WATER_SCALE = 12;

// Quais caracteres da grade são "terra firme" (a espuma nasce na fronteira).
const LAND = 'SMTPRBb';
// Quais são água navegável/visual.
const WATER = 'YyDdX';

export const isLandChar = c => c != null && LAND.includes(c);
export const isWaterChar = c => c != null && WATER.includes(c);
// Passarela (píer/estrado). É chão, desenhado depois: o mar não a cobre.
export const isDeckChar = c => c != null && 'Bb'.includes(c);

// Ruído determinístico: a mesma semente dá sempre a mesma costa, então a
// textura pode ser regerada sem "pular" e os testes comparam pixels.
function hash(x, y, seed = 0) {
  let h = Math.imul(x + seed * 131, 374761393) + Math.imul(y + seed * 17, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------------
// TEXTURA DO MAR — degradê + bancos + cáusticas + espuma assados
// ---------------------------------------------------------------------
export function createSeaTexture(rows, scale = WATER_SCALE) {
  const width = rows[0].length, height = rows.length;
  const w = width * scale, h = height * scale;
  const pixels = new Uint8ClampedArray(w * h * 4);
  const shallow = [122, 210, 190];
  const mid = [58, 158, 168];
  const deep = [22, 78, 112];
  const foam = [242, 255, 250];

  // O mesmo campo de costa da areia (`beach-surface.js`). Usar o MESMO campo
  // é essencial: se a água calcular a margem pela grade e a areia pelo campo,
  // as duas bordas não coincidem e a espuma aparece fora da praia.
  const field = createCoastField(rows, scale);

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const wx = (px + .5) / scale, wy = (py + .5) / scale;
      const tx = Math.floor(wx), ty = Math.floor(wy);
      const cell = rows[ty]?.[tx];
      const offset = (py * w + px) * 4;
      if (cell == null) { pixels[offset + 3] = 0; continue; }
      // Deck é passarela desenhada depois (chão): o mar não cobre.
      if (isDeckChar(cell)) { pixels[offset + 3] = 0; continue; }

      // `coast` = 0 no mar, 1 na areia, cruzando .5 na linha d'água.
      // `d` é a distância em tiles até a costa, tirada do próprio campo:
      // é contínua, então o degradê e a espuma não fazem escada.
      const coast = sampleCoast(field, wx, wy);
      const d = Math.max(0, (field.distLand[(py < field.height ? py : field.height - 1) * field.width + (px < field.width ? px : field.width - 1)]));
      void tx; void ty;
      const t = smooth(Math.min(1, Math.max(0, (d - .3) / 3.6)));
      const near = 1 - smooth(Math.min(1, Math.max(0, (d - .15) / 1.25)));

      // Cor base: raso → meio → fundo.
      let r, g, b;
      if (t < .5) {
        const k = t / .5;
        r = shallow[0] + (mid[0] - shallow[0]) * k;
        g = shallow[1] + (mid[1] - shallow[1]) * k;
        b = shallow[2] + (mid[2] - shallow[2]) * k;
      } else {
        const k = (t - .5) / .5;
        r = mid[0] + (deep[0] - mid[0]) * k;
        g = mid[1] + (deep[1] - mid[1]) * k;
        b = mid[2] + (deep[2] - mid[2]) * k;
      }

      // Bancos submersos: mancha clara onde o fundo sobe (perto da costa).
      const bank = Math.max(0, Math.sin(wx * .62 + Math.sin(wy * .47) * 1.9) - .35) * (1 - t) * 16;
      r += bank * .5; g += bank * .9; b += bank * .7;

      // Cáusticas: filetes entrelaçados só no raso (não no mar fundo).
      const a = Math.sin(wx * 3.4 + Math.sin(wy * 2.1) * 1.5);
      const c = Math.sin(wy * 3.0 + Math.sin(wx * 1.9) * 1.3);
      const caustic = Math.max(0, (a + c) * .5 - .42) * 46 * (1 - t) * (1 - t);
      r += caustic; g += caustic * .95; b += caustic * .55;

      // ESPUMA: faixa branca presa à iso-linha .5 do campo (a mesma da areia),
      // então ela encosta na praia em vez de seguir a escada dos tiles.
      const edge = smooth(1 - Math.abs(coast - .5) / .085);
      const ring = Math.max(0, (1 - Math.abs(coast - .355 - Math.sin(wx * 2.3 + wy * 1.1) * .022) / .03)) * .8;
      const holes = hash(Math.floor(wx * 5), Math.floor(wy * 5), 3);
      const foamAmt = Math.max(edge * (holes > .12 ? 1 : .45), ring * .75 * (holes > .3 ? 1 : 0));
      if (foamAmt > .02) {
        const k = Math.min(1, foamAmt) * .92;
        r += (foam[0] - r) * k; g += (foam[1] - g) * k; b += (foam[2] - b) * k;
      }

      // Borda do mapa suaviza para a cor de fundo, sem moldura reta.
      const border = Math.min(wx, wy, width - wx, height - wy);
      const fade = Math.max(0, Math.min(1, border / 1.4));
      const mist = 1 - smooth(fade);

      pixels[offset] = r;
      pixels[offset + 1] = g;
      pixels[offset + 2] = b;
      // ALPHA = silhueta da costa.
      //  - em célula de ÁGUA o mar é opaco (não há furo para o fundo vazar);
      //  - em célula de AREIA o alpha desce pelo campo, então a borda do mar
      //    ondula DENTRO da célula de areia em vez de seguir o quadrado dela.
      // É essa segunda parte que apaga a escada de 1 tile, e ela nunca muda
      // o que é andável: só decide onde a água é desenhada.
      let recorte = 1;
      // Dentro da célula de areia o alpha cai em ~1/6 de tile: é a ondulação
      // que apaga a escada, e é curta o bastante para nunca cobrir a parte
      // central da célula (onde o jogador anda de fato).
      if (isLandChar(cell)) recorte = 1 - smooth(Math.max(0, (coast - .5) / .17));
      pixels[offset + 3] = Math.round(255 * recorte * (1 - mist * .55));
    }
  }
  // `width`/`height` em PIXELS de textura (é o que o renderer usa);
  // `tilesX`/`tilesY` guardam a dimensão do mapa em tiles.
  return { width: w, height: h, tilesX: width, tilesY: height, scale, pixels };
}

// ---------------------------------------------------------------------
// CACHE — uma textura por mapa, montada no primeiro frame
// ---------------------------------------------------------------------
let seaCache = new WeakMap();

export function getSeaCanvas(map) {
  if (!map?.aguaPraia) return null;
  let entrada = seaCache.get(map);
  if (entrada) return entrada;
  const rows = map.aguaPraia;
  const data = createSeaTexture(rows);
  const canvas = document.createElement('canvas');
  canvas.width = rows[0].length * data.scale;
  canvas.height = rows.length * data.scale;
  const paint = canvas.getContext('2d');
  const image = paint.createImageData(canvas.width, canvas.height);
  image.data.set(data.pixels);
  paint.putImageData(image, 0, 0);
  entrada = { canvas, width: canvas.width, height: canvas.height };
  seaCache.set(map, entrada);
  return entrada;
}

export function clearSeaCache(map) {
  if (map) seaCache.delete(map); else seaCache = new WeakMap();
}

// ---------------------------------------------------------------------
// ESPUMA E ONDAS ANIMADAS — só a leitura viva, em quantidade fixa
// ---------------------------------------------------------------------
// A espuma estática já está assada. O que resta é movimento: alguns arcos que
// sobem e descem na borda. `limit` é o orçamento por frame (contagem, não
// pixels), então o custo não cresce quando o jogador afasta a câmera.
export function foamArcs(rows, range, time, limit = 96) {
  const arcs = [];
  const { x0, y0, x1, y1 } = range;
  const step = Math.max(1, Math.ceil(Math.sqrt((x1 - x0 + 1) * (y1 - y0 + 1)) / Math.sqrt(limit)));
  for (let y = y0; y <= y1; y += step) {
    for (let x = x0; x <= x1; x += step) {
      if (arcs.length >= limit) return arcs;
      const cell = rows[y]?.[x];
      if (!isWaterChar(cell)) continue;
      // Só onde encosta em terra, e nem toda célula: costa recortada.
      let shore = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (isLandChar(rows[y + dy]?.[x + dx])) { shore = true; break; }
      }
      if (!shore || hash(x * 5 + 3, y * 3 + 7) > .55) continue;
      const phase = (time * .55 + (x * .21 + y * .13)) % 1;
      arcs.push({ x, y, phase, seed: hash(x, y) });
    }
  }
  return arcs;
}
