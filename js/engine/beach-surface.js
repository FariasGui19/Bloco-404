// Superfície contínua em coordenadas de mundo, independente de colisões.
// A máscara usa exclusivamente areia caminhável; a textura nunca cria terra.
const sand = c => c != null && 'SMT'.includes(c);
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
    const broad = Math.sin(x * .55 + Math.sin(y * .43) * .85) * 3.6 + Math.sin(y * .62 - x * .18) * 2.4;
    const fine = Math.sin(x * 5.7 + Math.sin(y * 1.7) * 1.5) * 3.3 + Math.sin(y * 6.1 + x * 1.2) * 1.5;
    const grain = (Math.sin(x * 31.7 + y * 17.1) + Math.sin(x * 19.3 - y * 28.4)) * 1.3;
    // Veios largos e irregulares sugerem depósitos de areia, não tiles soltos.
    const drift = Math.max(0, Math.sin(x * .85 + Math.sin(y * .38) * 2.1 + y * .17) - .72) * (1 - wet) * 12;
    let r = 229 + broad + fine + grain - wet * 30 - drift;
    let g = 197 + broad + fine + grain - wet * 18 - drift * .8;
    let b = 143 + broad + fine + grain - wet * 7 - drift * .45;
    // As antigas poças quadradas viram manchas suaves na mesma área caminhável.
    if (tile === 'T') {
      const d = Math.hypot((x - ix - .5) / .32, (y - iy - .5) / .22);
      const puddle = .28 * (1 - smooth((d - .55) / .45));
      r += (105 - r) * puddle; g += (187 - g) * puddle; b += (174 - b) * puddle;
    }
    const offset = (py * width * scale + px) * 4;
    pixels[offset] = r; pixels[offset + 1] = g; pixels[offset + 2] = b;
    // Transição fina somente do lado caminhável, sem pintar terra sobre o mar.
    pixels[offset + 3] = 255 * (.56 + .44 * smooth(shore / .25));
  }
  return { width: width * scale, height: height * scale, pixels };
}
