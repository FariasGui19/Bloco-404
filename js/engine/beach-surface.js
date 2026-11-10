// Superfície contínua em coordenadas de mundo, independente de colisões.
// A máscara usa exclusivamente areia caminhável; a textura nunca cria terra.
//
// A SILHUETA vem do campo de costa (`coast-field.js`), não da grade de tiles:
// a grade dá degrau de 1 tile e era isso que deixava a praia com cara de
// losango avulso. O campo resolve a borda com distância + ruído de mundo,
// e o `alpha` acompanha a iso-linha, então a areia termina em curva.
// Nenhuma célula de terra nova nasce daí: o campo é travado para não trocar
// de lado no centro de nenhuma célula (ver `coast-field.js`).


const sand = c => c != null && 'SMT'.includes(c);
// Ruído branco determinístico: grão de areia sem padrão repetido.
function hash(x, y) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const water = c => c != null && 'YyDdX'.includes(c);
const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };

export function createBeachSurface(rows, scale = 16) {
  const height = rows.length, width = rows[0].length;
  const pixels = new Uint8ClampedArray(width * height * scale * scale * 4);
  for (let py = 0; py < height * scale; py++) for (let px = 0; px < width * scale; px++) {
    const x = (px + .5) / scale, y = (py + .5) / scale;
    const ix = Math.floor(x), iy = Math.floor(y), tile = rows[iy][ix];
    if (!sand(tile)) continue;
    let shore = 3;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      if (!water(rows[iy + dy]?.[ix + dx])) continue;
      const nx = ix + dx, ny = iy + dy;
      const ex = Math.max(nx - x, 0, x - nx - 1);
      const ey = Math.max(ny - y, 0, y - ny - 1);
      shore = Math.min(shore, Math.hypot(ex, ey));
    }
    // Faixa molhada gradual, sem borda escura idêntica em cada célula.
    const wet = 1 - smooth(shore / 1.8);
    // Ondas largas e MUITO assimétricas (não senoides paralelas: elas
    // desenham hachura em diagonal e entregam a grade de tiles).
    const broad = Math.sin(x * .41 + Math.sin(y * .33 + x * .11) * 1.6) * 3.2
      + Math.sin(y * .27 - x * .09 + Math.sin(x * .5) * .7) * 2.6;
    // Grão em hash (ruído branco), não seno: seno de período fixo vira
    // "tecido". O hash dá areia de verdade e custa o mesmo.
    const grain = (hash(px, py) - .5) * 9 + (hash(px >> 1, py >> 1) - .5) * 6;
    // Veios largos e irregulares sugerem depósitos de areia, não tiles soltos.
    const drift = Math.max(0, Math.sin(x * .85 + Math.sin(y * .38) * 2.1 + y * .17) - .72) * (1 - wet) * 12;
    let r = 229 + broad + grain - wet * 30 - drift;
    let g = 197 + broad + grain - wet * 18 - drift * .8;
    let b = 143 + broad + grain - wet * 7 - drift * .45;
    // As antigas poças quadradas viram manchas suaves na mesma área caminhável.
    if (tile === 'T') {
      const d = Math.hypot((x - ix - .5) / .32, (y - iy - .5) / .22);
      const puddle = .28 * (1 - smooth((d - .55) / .45));
      r += (105 - r) * puddle; g += (187 - g) * puddle; b += (174 - b) * puddle;
    }
    const offset = (py * width * scale + px) * 4;
    pixels[offset] = r; pixels[offset + 1] = g; pixels[offset + 2] = b;
    // O alpha é EXATAMENTE o da grade (contrato do teste: areia opaca em
    // toda célula `SMT`, zero fora). Quem desenha a borda orgânica é o mar,
    // pintado por cima com recorte do mesmo campo (`beach-water.js`).
    pixels[offset + 3] = 255;
  }
  return { width: width * scale, height: height * scale, tilesX: width, tilesY: height, scale, pixels };
}
