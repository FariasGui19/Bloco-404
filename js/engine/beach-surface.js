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

// `zonasRocha` apaga a grama onde o relevo desenhado (montanha da Estação
// 66.6, maciços de pedra) já é o chão visível. Sem isso a mancha de grama do
// interior sobe por cima da base do penhasco e fatia a cachoeira ao meio —
// era o defeito de camada do setor norte.
// Campos manuais limitados a um setor, em coordenadas da arte de referência.
function intensidadePoligono(px, py, pontos, suavidade = 10) {
  let dentro = false, menor = Infinity;
  for (let i = 0, j = pontos.length - 1; i < pontos.length; j = i++) {
    const [ax, ay] = pontos[j], [bx, by] = pontos[i];
    if ((ay > py) !== (by > py) && px < (bx - ax) * (py - ay) / (by - ay) + ax) dentro = !dentro;
    const dx = bx - ax, dy = by - ay, len = dx*dx + dy*dy;
    const t = len ? Math.max(0, Math.min(1, ((px-ax)*dx + (py-ay)*dy)/len)) : 0;
    menor = Math.min(menor, Math.hypot(px-ax-t*dx, py-ay-t*dy));
  }
  return smooth(.5 + (dentro ? menor : -menor) / suavidade);
}

export function createBeachSurface(rows, scale = 16, { gramaInterior = false, caminhos = [], zonasGrama = [], zonasRocha = [], celulasGrama = null, ajusteSolo = null } = {}) {
  const height = rows.length, width = rows[0].length;
  const margemAjuste = 55;
  const limitesAjuste = ajusteSolo && {
    minX: Math.min(...ajusteSolo.area.map(p => p[0])) - margemAjuste,
    maxX: Math.max(...ajusteSolo.area.map(p => p[0])) + margemAjuste,
    minY: Math.min(...ajusteSolo.area.map(p => p[1])) - margemAjuste,
    maxY: Math.max(...ajusteSolo.area.map(p => p[1])) + margemAjuste,
  };
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
    let grama = gramaInterior ? smooth((shore - 2.2) / 2.4) * foraDaTrilha : 0;
    // Grama lida da arte de referência (`celulasGrama`). `x`/`y` aqui são
    // PIXELS de textura (0.0625 de tile), não células: a interpolação bilinear
    // do campo acontece dentro do tile e a borda sai curva, não em xadrez.
    if (celulasGrama) {
      const gx = x - .5, gy = y - .5;
      const x0 = Math.floor(gx), y0 = Math.floor(gy);
      const fx = smooth(gx - x0), fy = smooth(gy - y0);
      const amostra = (ax, ay) => celulasGrama[ay]?.[ax] ?? 0;
      const topo = amostra(x0, y0) * (1 - fx) + amostra(x0 + 1, y0) * fx;
      const base = amostra(x0, y0 + 1) * (1 - fx) + amostra(x0 + 1, y0 + 1) * fx;
      const campo = topo * (1 - fy) + base * fy;
      // Borda irregular: ruído de mundo modula o limiar, como na arte.
      const ondulacao = Math.sin(x * .9 + Math.sin(y * .7) * 1.4) * .10
        + Math.sin(y * 1.13 + Math.sin(x * .53) * 1.1) * .08;
      grama = Math.max(grama, smooth((campo - .5 + ondulacao) / .22));
    }
    // Faixas internas de vegetação não mudam a máscara nem cobrem água.
    for (const zona of zonasGrama) {
      const dx = (x - zona.x) / zona.rx, dy = (y - zona.y) / zona.ry;
      if (Math.abs(dx) >= 1 || Math.abs(dy) >= 1) continue;
      const borda = Math.sqrt(dx * dx + dy * dy);
      grama = Math.max(grama, smooth((1 - borda) / .35) * foraDaTrilha);
    }
    // Relevo desenhado manda no próprio chão: onde o penhasco já ocupa a
    // célula, a grama do interior sai de cena e a pedra fica exposta.
    for (const zona of zonasRocha) {
      const dx = (x - zona.x) / zona.rx, dy = (y - zona.y) / zona.ry;
      const borda = Math.sqrt(dx * dx + dy * dy);
      if (borda < 1) grama *= smooth(borda / .35) * (zona.manter ?? 0);
    }
    // O ajuste é estritamente visual e só existe no polígono deste setor;
    // não altera a costa, a grade de colisão nem a paleta de outros mapas.
    if (ajusteSolo) {
      const sx = ajusteSolo.cx + ajusteSolo.sx * (x - y);
      const sy = ajusteSolo.cy + ajusteSolo.sy * (x + y);
      const area = sx < limitesAjuste.minX || sx > limitesAjuste.maxX || sy < limitesAjuste.minY || sy > limitesAjuste.maxY
        ? 0 : intensidadePoligono(sx, sy, ajusteSolo.area, 110);
      // A estreita orla oeste fica arenosa até o limite da água.
      const faixaOeste = smooth((260 - sx) / 35) * smooth((sy - 160) / 35) * smooth((650 - sy) / 35);
      grama *= 1 - faixaOeste * (1 - smooth((shore - .8) / 1.2));
      if (area > 0) {
        const verde = Math.max(...ajusteSolo.grama.map(p => intensidadePoligono(sx, sy, p, 10)));
        grama += (verde - grama) * area;
        grama *= 1 - faixaOeste * (1 - smooth((shore - .8) / 1.2));
        r += 16 * area; g += 9 * area; b -= 12 * area;
      }
    }
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
