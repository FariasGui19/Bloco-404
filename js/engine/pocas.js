// =====================================================================
// POÇAS — água desenhada em cima de areia caminhável
//
// Uma poça é uma ZONA do mapa (`map.pocas`), não uma célula da grade: a
// grade aprovada da praia fica intocada e a colisão não muda. Aqui só se
// DESENHA a poça; quem decide que o jogador está "na água" ali é
// `pocaEm()`, usado pelo nado.
//
// O desenho é feito em coordenadas de MUNDO com a mesma transformação
// isométrica do mar, então um círculo no mundo vira a elipse deitada certa
// na tela e a borda acompanha o chão.
//
// Custo: uma poça = 1 preenchimento com degradê, 1 contorno, 3 anéis e uma
// dúzia de filetes. Não cresce com o mapa.
// =====================================================================

const PASSOS = 40;

// Contorno orgânico: uma elipse que "respira" de leve em três lóbulos.
function contorno(ctx, p, escala = 1) {
  const fase = (p.x * 3.1 + p.y * 1.7) % (Math.PI * 2);
  ctx.beginPath();
  for (let i = 0; i <= PASSOS; i++) {
    const a = (i / PASSOS) * Math.PI * 2;
    const r = (1 + Math.sin(a * 3 + fase) * .07 + Math.sin(a * 5 + fase * 2) * .045) * escala;
    const x = p.x + Math.cos(a) * p.rx * r;
    const y = p.y + Math.sin(a) * p.ry * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** A poça que contém o ponto (em tiles), ou null. */
export function pocaEm(map, x, y) {
  const pocas = map?.pocas;
  if (!pocas) return null;
  for (const p of pocas) {
    const dx = (x - p.x) / p.rx, dy = (y - p.y) / p.ry;
    // .9: a beirada desenhada é espuma e areia molhada, ainda não é água.
    if (dx * dx + dy * dy <= .9 * .9) return p;
  }
  return null;
}

export function desenharPocas(ctx, map, t, HW, HH) {
  const pocas = map?.pocas;
  if (!pocas?.length) return;

  ctx.save();
  ctx.transform(HW, HH, -HW, HH, 0, 0);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  for (const p of pocas) {
    // 1. Areia molhada em volta: a poça não é um adesivo colado na areia.
    contorno(ctx, p, 1.16);
    ctx.fillStyle = 'rgba(150,108,66,.30)';
    ctx.fill();
    contorno(ctx, p, 1.07);
    ctx.fillStyle = 'rgba(128,96,62,.34)';
    ctx.fill();

    // 2. A água: clara na beirada, turquesa fundo no meio.
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, Math.max(p.rx, p.ry));
    g.addColorStop(0, '#1a9aa0');
    g.addColorStop(.45, '#2fbdb0');
    g.addColorStop(.8, '#63dcc6');
    g.addColorStop(1, '#a6f0dc');
    contorno(ctx, p, 1);
    ctx.fillStyle = g;
    ctx.fill();

    // Daqui para baixo tudo fica DENTRO da poça.
    ctx.save();
    contorno(ctx, p, 1);
    ctx.clip();

    // 3. Cáusticas: filetes de luz que balançam no fundo.
    ctx.strokeStyle = 'rgba(214,255,244,.34)';
    ctx.lineWidth = .035;
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = i * 2.399 + p.x;
      const raio = .2 + ((i * .37) % 1) * .72;
      const cx = p.x + Math.cos(a) * p.rx * raio + Math.sin(t * .7 + i) * .05;
      const cy = p.y + Math.sin(a) * p.ry * raio + Math.cos(t * .6 + i * 1.3) * .04;
      const len = .16 + ((i * .61) % 1) * .2;
      const dir = a + Math.sin(t * .4 + i) * .5;
      ctx.moveTo(cx - Math.cos(dir) * len, cy - Math.sin(dir) * len);
      ctx.quadraticCurveTo(
        cx + Math.sin(dir) * len * .5, cy - Math.cos(dir) * len * .5,
        cx + Math.cos(dir) * len, cy + Math.sin(dir) * len);
    }
    ctx.stroke();

    // 4. Ondas que nascem onde a cascata bate.
    const f = p.fonte ?? p;
    ctx.strokeStyle = 'rgba(240,255,250,.62)';
    for (let i = 0; i < 3; i++) {
      const k = (t * .42 + i / 3) % 1;
      ctx.globalAlpha = (1 - k) * .7;
      ctx.lineWidth = .05 * (1 - k * .5);
      ctx.beginPath();
      ctx.arc(f.x, f.y, .2 + k * Math.max(p.rx, p.ry) * 1.15, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // 5. Espuma da beirada: contorno claro que pulsa.
    const pulso = .5 + Math.sin(t * 1.3 + p.x) * .5;
    contorno(ctx, p, 1);
    ctx.strokeStyle = `rgba(244,255,250,${(.62 + pulso * .25).toFixed(3)})`;
    ctx.lineWidth = .055;
    ctx.stroke();
    contorno(ctx, p, .9 - pulso * .02);
    ctx.strokeStyle = `rgba(232,255,246,${(.16 + pulso * .14).toFixed(3)})`;
    ctx.lineWidth = .03;
    ctx.stroke();
  }
  ctx.restore();
}
