// Superfície contínua em coordenadas de mundo, independente de colisões.
// A máscara usa exclusivamente areia caminhável; a textura nunca cria terra.
//
// A SILHUETA vem do campo de costa (`coast-field.js`), não da grade de tiles:
// a grade dá degrau de 1 tile e era isso que deixava a praia com cara de
// losango avulso. O campo resolve a borda com distância + ruído de mundo,
// e o `alpha` acompanha a iso-linha, então a areia termina em curva.
// Nenhuma célula de terra nova nasce daí: o campo é travado para não trocar
// de lado no centro de nenhuma célula (ver `coast-field.js`).
//
// AREIA + GRAMA (referência da Enseada): a orla é areia e o interior é
// grama. A cor muda pela MESMA distância à água (`shore`): até 2,2 tiles
// é areia, depois vira grama com transição suave. Nenhuma letra nova na
// grade, nenhuma mudança de colisão — só a cor da textura.


const sand = c => c != null && 'SMT'.includes(c);
// Ruído branco determinístico: grão de areia sem padrão repetido.
function hash(x, y) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const water = c => c != null && 'YyDdX'.includes(c);
const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };

// Distância a segmentos em coordenadas da grade; os caminhos só alteram cor.
function distanciaAoCaminho(x, y, caminhos) {
  let menor = Infinity;
  for (const [ax, ay, bx, by] of caminhos) {
    const dx = bx - ax, dy = by - ay;
    const comprimento2 = dx * dx + dy * dy;
    const t = comprimento2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / comprimento2)) : 0;
    menor = Math.min(menor, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return menor;
}

export function createBeachSurface(rows, scale = 16, { gramaInterior = false, caminhos = [] } = {}) {
  const height = rows.length, width = rows[0].length;
  const pixels = new Uint8ClampedArray(width * height * scale * scale * 4);
  for (let py = 0; py < height * scale; py++) for (let px = 0; px < width * scale; px++) {
    const x = (px + .5) / scale, y = (py + .5) / scale;
    const ix = Math.floor(x), iy = Math.floor(y), tile = rows[iy][ix];
    if (!sand(tile)) continue;
    const alcance = gramaInterior ? 5 : 2;
    let shore = gramaInterior ? 5 : 3;
    for (let dy = -alcance; dy <= alcance; dy++) for (let dx = -alcance; dx <= alcance; dx++) {
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
    // Areia da orla (referência): dourada, molhada na beira.
    let r = 229 + broad + grain - wet * 30 - drift;
    let g = 197 + broad + grain - wet * 18 - drift * .8;
    let b = 143 + broad + grain - wet * 7 - drift * .45;
    // Grama do interior: verde-amarelado da referência, com o mesmo grão.
    // `grama` é 0 na orla e 1 no miolo; a mistura é suave (sem linha dura).
    // Deslocamento suave quebra linhas retas sem introduzir ruído por tile.
    const tx = x + .45 * Math.sin(y * .42) + .16 * Math.sin(y * 1.05);
    const ty = y + .45 * Math.sin(x * .38) + .16 * Math.sin(x * .93);
    const distancia = caminhos.length ? distanciaAoCaminho(tx, ty, caminhos) : Infinity;
    // Bordas levemente irregulares sem mudar a faixa navegável.
    const ruidoTrilha = Math.sin(x * .71 + Math.sin(y * .48)) * .16;
    const foraDaTrilha = smooth((distancia + ruidoTrilha - .8) / .6);
    const grama = gramaInterior ? smooth((shore - 2.2) / 2.4) * foraDaTrilha : 0;
    if (grama > 0) {
      const gr = 126 + broad * .6 + grain * .7 - wet * 8;
      const gg = 186 + broad * .6 + grain * .7 - wet * 6;
      const gb = 78 + broad * .5 + grain * .6;
      r += (gr - r) * grama;
      g += (gg - g) * grama;
      b += (gb - b) * grama;
    }
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
