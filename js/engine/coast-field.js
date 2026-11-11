// =====================================================================
// CAMPO DE COSTA — a borda suave que a grade de tiles não consegue dar
//
// O mapa guarda areia célula a célula (`aguaPraia`), então toda margem nasce
// em DEGRAU de 1 tile: a costa vira escada e a espuma acompanha a escada.
// Foi isso que o criador chamou de "feio" ao lado da referência
// (`assets/source-art/coastal/ilha-panorama.png`).
//
// A técnica usada aqui é a padrão para isto: **campo de distância assinada**
// (signed distance field) sobre a grade, amostrado com interpolação bilinear
// e deformado por ruído contínuo em coordenadas de mundo.
//
//   sd = +d  dentro da terra (d tiles até a água)
//   sd = -d  dentro da água  (d tiles até a terra)
//   sd =  0  na linha de costa
//
//   campo(x, y) = smoothstep(-MEIA_LARGURA, +MEIA_LARGURA, sd(x,y) + ruído)
//
// Por que isso funciona e a rampa por célula não funcionava: a distância é
// contínua ATRAVÉS das bordas das células, então não nasce xadrez. O ruído é
// avaliado em coordenadas de mundo (não de célula) e é multiplicado por um
// peso que ZERA no centro de cada célula, então o centro de toda célula
// mantém o valor da grade: nada de terra nova, nada de colisão mentindo.
// A ondulação só acontece nas bordas das células — que é justamente onde a
// escada de 1 tile aparecia.
// =====================================================================

const LAND = 'SMTPRBb';
const WATER = 'YyDdX';
const DECK = 'Bb';

export const isLand = c => c != null && LAND.includes(c);
export const isWater = c => c != null && WATER.includes(c);
export const isDeck = c => c != null && DECK.includes(c);

// A largura da faixa de transição, em tiles. 0.9 dá uma costa de ~1 tile de
// espuma, que é o que a referência mostra.
const HALF_WIDTH = .85;
// Amplitude do ruído que deforma a costa, em tiles. Precisa ficar abaixo de
// .5 para nunca virar o sinal dentro de uma célula (colisão honesta).
const NOISE = .30;

// Ruído determinístico em coordenadas de mundo. Duas oitavas: uma larga
// (enseadas e pontas) e uma fina (serrilha de areia).
function shadeNoise(x, y, seed) {
  let h = Math.imul(x * 731 + seed, 374761393) + Math.imul(y * 467, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296 - .5;
}

function smooth(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }

// Ruído de valor com interpolação suave: contínuo, sem depender da grade.
function valueNoise(x, y, scale, seed) {
  const gx = x * scale, gy = y * scale;
  const x0 = Math.floor(gx), y0 = Math.floor(gy);
  const fx = smooth(gx - x0), fy = smooth(gy - y0);
  const a = shadeNoise(x0, y0, seed), b = shadeNoise(x0 + 1, y0, seed);
  const c = shadeNoise(x0, y0 + 1, seed), d = shadeNoise(x0 + 1, y0 + 1, seed);
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
}

// Transformada de distância euclidiana exata (Felzenszwalb & Huttenlocher).
// A versão por BFS de 4 vizinhos dá distância Manhattan, que desenha a costa
// em "diamante" e deixa serrilha de 1 tile; esta dá círculos de verdade.
function dt1d(f, n, d, v, z) {
  let k = 0;
  v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++; v[k] = q; z[k] = s; z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const dq = q - v[k];
    d[q] = dq * dq + f[v[k]];
  }
}

// Distância (em tiles) de cada célula até a membrana mais próxima.
function edt(isSeed, cols, lines) {
  const INF = 1e12;
  const g = new Float64Array(cols * lines);
  for (let i = 0; i < g.length; i++) g[i] = isSeed[i] ? 0 : INF;
  const maxN = Math.max(cols, lines);
  const f = new Float64Array(maxN), d = new Float64Array(maxN);
  const v = new Int32Array(maxN), z = new Float64Array(maxN + 1);

  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < lines; y++) f[y] = g[y * cols + x];
    dt1d(f, lines, d, v, z);
    for (let y = 0; y < lines; y++) g[y * cols + x] = d[y];
  }
  for (let y = 0; y < lines; y++) {
    for (let x = 0; x < cols; x++) f[x] = g[y * cols + x];
    dt1d(f, cols, d, v, z);
    for (let x = 0; x < cols; x++) g[y * cols + x] = d[x];
  }
  for (let i = 0; i < g.length; i++) g[i] = Math.sqrt(g[i]);
  return g;
}

function signedDistance(rows) {
  const cols = rows[0].length, lines = rows.length;
  const n = cols * lines;
  const landSeed = new Uint8Array(n), waterSeed = new Uint8Array(n);
  // Só a terra de verdade: o deck é passarela e não pode "elevar" o fundo,
  // senão o píer fica com um anel de água rasa em volta.
  for (let y = 0; y < lines; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      const c = rows[y][x];
      // Deck é passarela: entra nos DOIS conjuntos, então nunca é a membrana
      // de ninguém e o píer não vira uma cerca de espuma no meio do mar.
      const terra = isLand(c) && !isDeck(c);
      landSeed[i] = terra ? 1 : 0;
      waterSeed[i] = terra ? 0 : 1;
      if (isDeck(c)) { landSeed[i] = 1; waterSeed[i] = 1; }
    }
  }
  const toWater = edt(waterSeed, cols, lines); // de cada célula até a água mais próxima
  const toLand = edt(landSeed, cols, lines);   // de cada célula até a terra mais próxima

  const sd = new Float32Array(n);
  for (let y = 0; y < lines; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      const cell = rows[y][x];
      // -.5 porque o centro de uma célula de borda está meio tile dentro dela:
      // areia encostada na água vale +.5, água encostada na areia vale -.5.
      sd[i] = isLand(cell) ? toWater[i] - .5 : -(toLand[i] - .5);
    }
  }
  return { sd, toLand, cols, lines };
}

/**
 * @param {string[]} rows grade `aguaPraia`
 * @param {number} scale amostras por tile (8 = bom para textura de 64 px/tile)
 * @param {number} origem quantos tiles de MOLDURA a grade recebeu em volta.
 *   O ruído da costa é avaliado em coordenadas de mundo; quem monta o campo
 *   numa grade acolchoada (o mar, que precisa de água além da borda do mapa)
 *   informa a moldura para a costa sair IDÊNTICA à do campo sem moldura.
 */
export function createCoastField(rows, scale = 8, origem = 0) {
  const { sd, toLand, cols, lines } = signedDistance(rows);
  const w = cols * scale, h = lines * scale;
  const data = new Float32Array(w * h);
  // Distância de cada amostra até o centro da célula de TERRA mais próxima.
  // Serve para nunca deixar areia brotar no meio do mar aberto.
  const distLand = new Float32Array(w * h);

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const wx = (px + .5) / scale, wy = (py + .5) / scale;
      // Distância assinada interpolada bilinearmente entre centros de célula.
      const gx = Math.max(0, Math.min(cols - 1.001, wx - .5));
      const gy = Math.max(0, Math.min(lines - 1.001, wy - .5));
      const x0 = Math.floor(gx), y0 = Math.floor(gy);
      const bx = gx - x0, by = gy - y0;
      const s00 = sd[y0 * cols + x0];
      const s10 = sd[y0 * cols + Math.min(cols - 1, x0 + 1)];
      const s01 = sd[Math.min(lines - 1, y0 + 1) * cols + x0];
      const s11 = sd[Math.min(lines - 1, y0 + 1) * cols + Math.min(cols - 1, x0 + 1)];
      const base = (s00 * (1 - bx) + s10 * bx) * (1 - by) + (s01 * (1 - bx) + s11 * bx) * by;

      // PESO que zera no CENTRO da célula e cresce até as bordas dela.
      // Assim o centro de cada célula mantém exatamente o valor da grade
      // (0 violações de sinal, colisão idêntica ao que se vê) enquanto as
      // bordas ficam soltas para ondular — é o que apaga a escada de 1 tile.
      const fx = (px % scale) / (scale - 1) * 2 - 1;
      const fy = (py % scale) / (scale - 1) * 2 - 1;
      const peso = smooth(Math.min(1, Math.max(Math.abs(fx), Math.abs(fy)) * 1.75));

      // O ruído só age PERTO da costa: longe dela o campo fica exato.
      const perto = Math.max(0, 1 - Math.abs(base) / (HALF_WIDTH * 2.4));
      const n = (valueNoise(wx - origem, wy - origem, .55, 17) * NOISE
        + valueNoise(wx - origem, wy - origem, 1.9, 43) * NOISE * .38) * perto * perto * peso;
      const v = base + n;
      const val = smooth((v + HALF_WIDTH) / (2 * HALF_WIDTH));
      data[py * w + px] = val;

      const i = py * w + px;
      // Distância ao CENTRO da célula de terra (o campo cru cruza 0 na
      // membrana; para sombrear água o que importa é a quebra do raso).
      distLand[i] = Math.max(0, -base + .5);
    }
  }
  return { width: w, height: h, rows: lines, cols, scale, data, distLand };
}

/** Lê o campo em coordenadas de mundo (tiles, aceitando fração). */
export function sample(field, wx, wy) {
  if (!field) return 0;
  const x = Math.max(0, Math.min(field.width - 1.001, wx * field.scale));
  const y = Math.max(0, Math.min(field.height - 1.001, wy * field.scale));
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = x - x0, fy = y - y0;
  const i00 = y0 * field.width + x0;
  const i10 = i00 + 1, i01 = i00 + field.width, i11 = i01 + 1;
  const a = field.data[i00], b = field.data[i10];
  const c = field.data[i01], d = field.data[i11];
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
}

/** Gradiente do campo (aponta para dentro da terra). */
export function gradient(field, wx, wy) {
  const e = 1 / (field.scale * 2);
  return {
    x: sample(field, wx + e, wy) - sample(field, wx - e, wy),
    y: sample(field, wx, wy + e) - sample(field, wx, wy - e),
  };
}

const cache = new WeakMap();
export function getCoastFieldForMap(map) {
  if (!map?.aguaPraia) return null;
  let field = cache.get(map);
  if (!field) { field = createCoastField(map.aguaPraia); cache.set(map, field); }
  return field;
}

export function clearCoastFieldCache(map) {
  if (map) cache.delete(map);
}

export { HALF_WIDTH, NOISE };
