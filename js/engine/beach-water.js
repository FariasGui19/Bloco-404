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
// PALETA — tirada da referência (`ilha-panorama.png`), não inventada
//
// A praia antiga ia de turquesa a AZUL-MARINHO em 3,6 tiles: de perto a
// água parecia tinta escura. A referência é verde-água quase até a borda;
// só o mar aberto azula. Aqui a profundidade (em tiles até a costa) vira
// cor por uma rampa de quatro paradas, medidas na própria imagem.
// ---------------------------------------------------------------------
export const PALETA_MAR = Object.freeze({
  //            tiles até a costa, [r, g, b]
  rampa: Object.freeze([
    [0.0, [150, 240, 204]],   // lâmina na beira (quase areia molhada)
    [0.55, [98, 228, 176]],   // raso turquesa
    [1.7, [34, 190, 152]],    // verde-água
    [3.3, [10, 140, 148]],    // meia-água
    [5.4, [3, 104, 136]],     // fundo
    [8.0, [2, 80, 116]],      // mar aberto
  ]),
  espuma: Object.freeze([246, 255, 251]),
  caustica: Object.freeze([226, 255, 240]),
  recife: Object.freeze([58, 146, 104]),
  // Cor de fundo do mapa que emenda com o mar aberto (use em `corFundo`).
  fundo: '#025074',
});

// Rampa pré-calculada: 256 degraus cobrindo 0..8 tiles. Um índice por pixel
// em vez de três interpolações — é isso que paga o resto dos efeitos.
const RAMPA_MAX = 8;
const RAMPA = (() => {
  const lut = new Uint8ClampedArray(256 * 3);
  const paradas = PALETA_MAR.rampa;
  for (let i = 0; i < 256; i++) {
    const d = (i / 255) * RAMPA_MAX;
    let k = 0;
    while (k < paradas.length - 2 && d > paradas[k + 1][0]) k++;
    const [d0, c0] = paradas[k], [d1, c1] = paradas[k + 1];
    const t = smooth((d - d0) / (d1 - d0));
    lut[i * 3] = c0[0] + (c1[0] - c0[0]) * t;
    lut[i * 3 + 1] = c0[1] + (c1[1] - c0[1]) * t;
    lut[i * 3 + 2] = c0[2] + (c1[2] - c0[2]) * t;
  }
  return lut;
})();

// ---------------------------------------------------------------------
// TEXTURA DO MAR — degradê + bancos + recife + espuma, assados
//
// A REDE DE CÁUSTICAS (a malha de luz no fundo, marca da referência) já
// sai assada aqui: custo zero por quadro. Devolve também `luz`, quanto de
// cáustica cada ponto recebe (0..255) — forte no raso, apagando no fundo e
// sumindo antes da borda. `getSeaCanvas` usa `luz` para montar a camada
// opcional que balança por cima quando a máquina tem folga.
//
// `origem`: tiles de moldura de mar que a grade recebeu em volta (ver
// `getSeaCanvas`). Só serve para a costa coincidir com a da areia.
// ---------------------------------------------------------------------
export function createSeaTexture(rows, scale = WATER_SCALE, { origem = 0 } = {}) {
  const width = rows[0].length, height = rows.length;
  const w = width * scale, h = height * scale;
  const pixels = new Uint8ClampedArray(w * h * 4);
  const luz = new Uint8ClampedArray(w * h);
  const [fr, fg, fb] = PALETA_MAR.espuma;
  const [rr, rg, rb] = PALETA_MAR.recife;
  const [cr, cg, cb] = PALETA_MAR.caustica;
  const rede = ladrilhoCaustico(scale);
  const lado = rede.tamanho, malha = rede.alpha;

  // O mesmo campo de costa da areia (`beach-surface.js`). Usar o MESMO campo
  // é essencial: se a água calcular a margem pela grade e a areia pelo campo,
  // as duas bordas não coincidem e a espuma aparece fora da praia.
  const field = createCoastField(rows, scale, origem);
  const campo = field.data, dist = field.distLand;

  // Tipo de cada célula, uma vez: 0 água, 1 terra, 2 deck.
  const tipo = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const linha = rows[y];
    for (let x = 0; x < width; x++) {
      const c = linha[x];
      tipo[y * width + x] = isDeckChar(c) ? 2 : isLandChar(c) ? 1 : 0;
    }
  }

  // Ondas largas em tabelas (seno por coluna/linha/diagonal, não por pixel).
  const ondaX = new Float32Array(w), ondaY = new Float32Array(h);
  const diagA = new Float32Array(w + h), diagB = new Float32Array(w + h);
  for (let px = 0; px < w; px++) ondaX[px] = Math.sin((px + .5) / scale * .62);
  for (let py = 0; py < h; py++) ondaY[py] = Math.sin((py + .5) / scale * .47 + 1.3);
  for (let i = 0; i < w + h; i++) {
    diagA[i] = Math.sin(i / scale * .37 + .8);
    diagB[i] = Math.sin(i / scale * .83 + 2.1);
  }
  // Furos da espuma: um sorteio por bloco de 1/5 de tile.
  const fw = width * 5, fh = height * 5;
  const furos = new Uint8Array(fw * fh);
  for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) furos[y * fw + x] = hash(x, y, 3) * 255;
  const passoFuro = 5 / scale;

  const bordaW = width, bordaH = height;
  for (let py = 0; py < h; py++) {
    const ty = (py / scale) | 0;
    const wy = (py + .5) / scale;
    const fy = (py * passoFuro) | 0;
    const oy = ondaY[py];
    for (let px = 0; px < w; px++) {
      const i = py * w + px;
      const t = tipo[ty * width + ((px / scale) | 0)];
      // Deck é passarela desenhada depois (chão): o mar não cobre.
      if (t === 2) continue;
      // `coast` = 0 no mar, 1 na areia, cruzando .5 na linha d'água.
      const coast = campo[i];
      // Em célula de AREIA o alpha desce pelo campo em ~1/6 de tile: a borda
      // do mar ondula DENTRO da célula em vez de seguir o quadrado dela.
      // Acima de .67 o mar já é invisível: nem calcula a cor.
      let recorte = 1;
      if (t === 1) {
        if (coast >= .67) continue;
        recorte = 1 - smooth(Math.max(0, (coast - .5) / .17));
      }

      const wx = (px + .5) / scale;
      // `d` é a distância em tiles até a costa, tirada do próprio campo:
      // é contínua, então o degradê e a espuma não fazem escada.
      const d = dist[i];
      // Bancos de areia e correntes: a profundidade "respira" ±0,35 tile
      // antes de virar cor — é o que tira a cara de anel concêntrico.
      const relevo = ondaX[px] * oy * .22 + diagA[px + py] * .16 + diagB[px - py + h] * .1;
      const dc = d + relevo * Math.min(1, d * .8);
      const k = dc <= 0 ? 0 : dc >= RAMPA_MAX ? 765 : ((dc * (255 / RAMPA_MAX)) | 0) * 3;
      let r = RAMPA[k], g = RAMPA[k + 1], b = RAMPA[k + 2];

      // RECIFE submerso: manchas verde-escuras na meia-água, como na
      // referência. Só onde as duas ondas diagonais concordam.
      if (d > 1.25 && d < 4.2) {
        const mancha = diagB[px + py] * diagA[px - py + h] + ondaX[px] * .35;
        if (mancha > .52) {
          const m = Math.min(1, (mancha - .52) * 4) * Math.min(1, (d - 1.25) * 2) * Math.min(1, (4.2 - d) * 1.5) * .55;
          r += (rr - r) * m; g += (rg - g) * m; b += (rb - b) * m;
        }
      }

      // ESPUMA 1: faixa branca presa à iso-linha .5 do campo (a da areia),
      // então ela encosta na praia em vez de seguir a escada dos tiles.
      const furo = furos[fy * fw + ((px * passoFuro) | 0)];
      let espuma = 0;
      const e1 = 1 - Math.abs(coast - .5) / .095;
      if (e1 > 0) espuma = smooth(e1) * (furo > 28 ? 1 : .5);
      // ESPUMA 2 e 3: linhas finas recuadas, quebradas — a onda que já
      // passou. Ficam na água (coast < .5), a ~0,45 e ~0,95 tile da beira.
      if (coast < .46) {
        const ondula = diagA[px + py] * .05 + oy * .04;
        const e2 = 1 - Math.abs(d - .98 - ondula) / .075;
        if (e2 > 0 && furo > 70) espuma = Math.max(espuma, e2 * .78);
        const e3 = 1 - Math.abs(d - 1.5 - ondula * 1.6) / .06;
        if (e3 > 0 && furo > 132) espuma = Math.max(espuma, e3 * .5);
      }
      if (espuma > .02) {
        const m = Math.min(1, espuma) * .94;
        r += (fr - r) * m; g += (fg - g) * m; b += (fb - b) * m;
      }

      // Borda da textura some por completo na cor de fundo do mapa (que é
      // a mesma do mar aberto): não existe moldura reta no horizonte.
      const borda = Math.min(wx, wy, bordaW - wx, bordaH - wy);
      const visivel = borda >= 2.4 ? 1 : smooth(borda / 2.4);

      // LUZ (máscara das cáusticas): cheia entre a espuma e ~2 tiles, cai
      // até ~6 tiles e some perto da borda e em cima da espuma.
      if (t === 0) {
        const perto = d < .7 ? Math.max(0, (d - .3) / .4) : 1;
        const fundo = d < 1.8 ? 1 : d > 6 ? .1 : 1 - (d - 1.8) * .214;
        const l = perto * fundo * (borda >= 3 ? 1 : borda / 3) * (1 - Math.min(1, espuma));
        luz[i] = 255 * l;
        // Rede de luz assada: o ladrilho repete a cada 8 tiles, sem emenda.
        const c = malha[(py % lado) * lado + (px % lado)] * l * (.52 / 255);
        if (c > .01) { r += (cr - r) * c; g += (cg - g) * c; b += (cb - b) * c; }
      }

      const o = i * 4;
      pixels[o] = r;
      pixels[o + 1] = g;
      pixels[o + 2] = b;
      pixels[o + 3] = 255 * recorte * visivel;
    }
  }
  // `width`/`height` em PIXELS de textura (é o que o renderer usa);
  // `tilesX`/`tilesY` guardam a dimensão do mapa em tiles.
  return { width: w, height: h, tilesX: width, tilesY: height, scale, pixels, luz };
}

// ---------------------------------------------------------------------
// REDE DE CÁUSTICAS — o desenho de luz no fundo do mar
//
// A referência tem uma malha de filetes claros por toda a água rasa. Ela é
// um ruído celular (Worley): a distância ao 2º ponto mais próximo menos a
// do 1º; onde as duas empatam nasce a linha. O ladrilho cobre 8x8 tiles,
// repete sem emenda e é gerado UMA vez por sessão (~2 ms).
// ---------------------------------------------------------------------
const LADRILHO_TILES = 8;
const CELULAS = 11;   // ~0,73 tile por célula, como na referência

export function criarLadrilhoCaustico(tamanho, celulas = CELULAS, seed = 7) {
  const pontos = new Float32Array(celulas * celulas * 2);
  for (let cy = 0; cy < celulas; cy++) {
    for (let cx = 0; cx < celulas; cx++) {
      const i = (cy * celulas + cx) * 2;
      pontos[i] = (cx + .12 + hash(cx, cy, seed) * .76) / celulas;
      pontos[i + 1] = (cy + .12 + hash(cx, cy, seed + 5) * .76) / celulas;
    }
  }
  const alpha = new Uint8ClampedArray(tamanho * tamanho);
  for (let py = 0; py < tamanho; py++) {
    const v = (py + .5) / tamanho;
    const cy0 = Math.floor(v * celulas);
    for (let px = 0; px < tamanho; px++) {
      const u = (px + .5) / tamanho;
      const cx0 = Math.floor(u * celulas);
      let d1 = 9, d2 = 9;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const cx = cx0 + dx, cy = cy0 + dy;
          // Envolve: o ponto do outro lado do ladrilho conta, deslocado.
          const wx = ((cx % celulas) + celulas) % celulas, wy = ((cy % celulas) + celulas) % celulas;
          const i = (wy * celulas + wx) * 2;
          const ox = pontos[i] + (cx - wx) / celulas - u;
          const oy = pontos[i + 1] + (cy - wy) / celulas - v;
          const dd = ox * ox + oy * oy;
          if (dd < d1) { d2 = d1; d1 = dd; } else if (dd < d2) d2 = dd;
        }
      }
      // Borda da célula: as duas distâncias quase iguais.
      const borda = (Math.sqrt(d2) - Math.sqrt(d1)) * celulas;
      const linha = 1 - smooth(borda / .2);
      // Brilho largo e fraco em volta da linha: a luz "vaza".
      const halo = (1 - smooth(borda / .62)) * .3;
      alpha[py * tamanho + px] = 255 * Math.min(1, linha * .95 + halo);
    }
  }
  return { tamanho, alpha };
}

const ladrilhos = new Map();
function ladrilhoCaustico(scale) {
  let l = ladrilhos.get(scale);
  if (!l) { l = criarLadrilhoCaustico(LADRILHO_TILES * scale); ladrilhos.set(scale, l); }
  return l;
}

// ---------------------------------------------------------------------
// CACHE — uma textura por mapa, montada no primeiro frame
//
// MOLDURA: o mar é assado com alguns tiles de água ALÉM da grade. Sem isso
// a água rasa de uma ilha encostada na borda do mapa (a ilha de chegada
// fica a 1 tile dela) terminava num corte reto. A moldura é só imagem:
// colisão, nado e campo de costa do jogo continuam do tamanho do mapa.
// ---------------------------------------------------------------------
export const MARGEM_MAR = 5;

function comMoldura(rows, m) {
  const largura = rows[0].length + m * 2;
  const mar = 'D'.repeat(largura), lado = 'D'.repeat(m);
  return [
    ...Array.from({ length: m }, () => mar),
    ...rows.map(r => lado + r + lado),
    ...Array.from({ length: m }, () => mar),
  ];
}

/** Textura do mar como o jogo usa: com a moldura. (Sem DOM: serve a testes.) */
export function createSeaTextureForMap(map, scale = WATER_SCALE) {
  const m = map.meta?.margemMar ?? MARGEM_MAR;
  const data = createSeaTexture(m ? comMoldura(map.aguaPraia, m) : map.aguaPraia, scale, { origem: m });
  data.margem = m;
  return data;
}

let seaCache = new WeakMap();

export function getSeaCanvas(map) {
  if (!map?.aguaPraia) return null;
  let entrada = seaCache.get(map);
  if (entrada) return entrada;
  // Mar aberto sem faixa de areia pode usar textura menor sem afetar
  // colisão ou o campo de profundidade. Outros mapas preservam a escala.
  const escala = Number.isFinite(map.meta?.escalaTexturaMar)
    ? Math.max(6, Math.min(WATER_SCALE, Math.round(map.meta.escalaTexturaMar))) : WATER_SCALE;
  const data = createSeaTextureForMap(map, escala);
  const canvas = document.createElement('canvas');
  canvas.width = data.width;
  canvas.height = data.height;
  const paint = canvas.getContext('2d');
  const image = paint.createImageData(canvas.width, canvas.height);
  image.data.set(data.pixels);
  paint.putImageData(image, 0, 0);

  // Camada de luz que BALANÇA (opcional, ver `drawBeachSea`): o mesmo
  // ladrilho, repetido e recortado pela máscara `luz`. Montagem nativa
  // (um padrão e um drawImage), sem laço de cor por pixel.
  let causticas = null;
  try {
    const rede = ladrilhoCaustico(data.scale);
    const ladrilho = document.createElement('canvas');
    ladrilho.width = ladrilho.height = rede.tamanho;
    const gl = ladrilho.getContext('2d');
    const il = gl.createImageData(rede.tamanho, rede.tamanho);
    const [cr, cg, cb] = PALETA_MAR.caustica;
    for (let i = 0, n = rede.alpha.length; i < n; i++) {
      il.data[i * 4] = cr; il.data[i * 4 + 1] = cg; il.data[i * 4 + 2] = cb;
      il.data[i * 4 + 3] = rede.alpha[i];
    }
    gl.putImageData(il, 0, 0);

    const mascara = document.createElement('canvas');
    mascara.width = canvas.width; mascara.height = canvas.height;
    const gm = mascara.getContext('2d');
    const im = gm.createImageData(canvas.width, canvas.height);
    for (let i = 0, n = data.luz.length; i < n; i++) im.data[i * 4 + 3] = data.luz[i];
    gm.putImageData(im, 0, 0);

    causticas = document.createElement('canvas');
    causticas.width = canvas.width; causticas.height = canvas.height;
    const gc = causticas.getContext('2d');
    gc.fillStyle = gc.createPattern(ladrilho, 'repeat');
    gc.fillRect(0, 0, causticas.width, causticas.height);
    gc.globalCompositeOperation = 'destination-in';
    gc.drawImage(mascara, 0, 0);
  } catch { causticas = null; }

  entrada = { canvas, width: canvas.width, height: canvas.height, causticas, margem: data.margem };
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
