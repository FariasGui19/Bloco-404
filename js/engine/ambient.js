// js/engine/ambient.js
// =====================================================================
//  AMBIENTE: brilho no chão dos objetos + poeira holográfica
// =====================================================================
const poeira = [];
let mapaDaPoeira = null;
let ultimo = performance.now();

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

// ---------------------------------------------------------------------
//  BRILHO (desenhado no chão, antes dos objetos)
//  No objeto: brilho: { cor: '#35E6D3', raio: 1.2, forca: 0.3, pulso: true }
// ---------------------------------------------------------------------
export function drawAmbientBack(ctx, state, HW, HH) {
  const t = performance.now() / 1000;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  for (const o of state.objects ?? []) {
    const b = o.brilho;
    if (!b) continue;

    const cor = b.cor ?? '#35E6D3';
    const r = (b.raio ?? 1) * HW * 1.4;
    const pulso = b.pulso === false ? 1 : 0.8 + Math.sin(t * 2.4 + o.x * 1.3) * 0.2;
    const ix = (o.x - o.y) * HW;
    const iy = (o.x + o.y) * HH;

    ctx.save();
    ctx.translate(ix, iy);
    ctx.scale(1, 0.5);   // círculo vira elipse "deitada" no chão

    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, rgba(cor, (b.forca ?? 0.3) * pulso));
    g.addColorStop(1, rgba(cor, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

// ---------------------------------------------------------------------
//  POEIRA (desenhada por cima de tudo)
//  No mapa: meta.ambiente = { poeira: 30, cor: '#35E6D3' }
// ---------------------------------------------------------------------
function nova(w, h, z) {
  return {
    x: 1 + Math.random() * (w - 2),
    y: 1 + Math.random() * (h - 2),
    z,
    vz: 5 + Math.random() * 9,
    fase: Math.random() * 6.28,
    tam: Math.random() < 0.25 ? 2 : 1,
  };
}

function semear(map) {
  poeira.length = 0;
  mapaDaPoeira = map;

  const n = map.meta?.ambiente?.poeira ?? 0;
  const w = map.layout[0].length;
  const h = map.layout.length;
  for (let i = 0; i < n; i++) poeira.push(nova(w, h, Math.random() * 70));
}

export function drawAmbientFront(ctx, map, HW, HH) {
  const agora = performance.now();
  const dt = Math.min(0.05, (agora - ultimo) / 1000);
  ultimo = agora;

  if (map !== mapaDaPoeira) semear(map);
  if (!poeira.length) return;

  const t = agora / 1000;
  const cor = map.meta?.ambiente?.cor ?? '#35E6D3';
  const w = map.layout[0].length;
  const h = map.layout.length;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  for (let i = 0; i < poeira.length; i++) {
    let p = poeira[i];
    p.z += p.vz * dt;
    if (p.z > 70) poeira[i] = p = nova(w, h, 0);

    const ix = (p.x - p.y) * HW + Math.sin(t * 0.8 + p.fase) * 5;
    const iy = (p.x + p.y) * HH - p.z;
    const a = Math.sin((p.z / 70) * Math.PI) * 0.55 * (0.7 + 0.3 * Math.sin(t * 3 + p.fase));

    ctx.fillStyle = rgba(cor, a);
    ctx.fillRect(ix, iy, p.tam, p.tam);
  }

  ctx.restore();
}