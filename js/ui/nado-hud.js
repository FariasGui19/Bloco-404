// js/ui/nado-hud.js
// =====================================================================
// MEDIDOR DE FÔLEGO
//
// Só aparece quando o jogador está na água (em terra não ocupa nada da
// tela). Desenha no canvas do jogo, sem DOM novo: um arco fino acima da
// barra de vida, no mesmo vocabulário visual do resto do HUD.
//
// Regra de design: o medidor NUNCA some de repente. Ele fica esmaecendo
// enquanto o ar está cheio (nadando na superfície) e fica sólido quando o
// ar cai — é o aviso de que dá para mergulhar.
// =====================================================================
import { NADO } from '../game/nado.js';

const RAIO = 34;
const ESPESSURA = 5;

// Cores: turquesa cheio, âmbar no meio, coral no fim (mesma paleta de vida).
function corDoAr(pct) {
  if (pct > .55) return '#35E6D3';
  if (pct > .25) return '#E9C46A';
  return '#EF6C6C';
}

export function desenharMedidorAr(nado) {
  const canvas = document.getElementById('game');
  if (!canvas || !nado) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;

  const pct = Math.max(0, Math.min(1, nado.ar / NADO.arMaximo));

  // Fica no canto inferior esquerdo, acima da barra de vida.
  const cx = 74;
  const cy = h - 132;

  ctx.save();
  ctx.globalAlpha = nado.ar >= NADO.arMaximo - .01 ? .42 : .96;

  // Fundo do arco.
  ctx.beginPath();
  ctx.arc(cx, cy, RAIO, Math.PI * .78, Math.PI * 2.22);
  ctx.strokeStyle = 'rgba(8,16,22,.55)';
  ctx.lineWidth = ESPESSURA;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Arco do fôlego.
  if (pct > 0) {
    const inicio = Math.PI * .78;
    const fim = inicio + Math.PI * 1.44 * pct;
    ctx.beginPath();
    ctx.arc(cx, cy, RAIO, inicio, fim);
    ctx.strokeStyle = corDoAr(pct);
    ctx.lineWidth = ESPESSURA;
    ctx.stroke();
  }

  // Bolha central: cheia quando dá pé, vazia quando é mergulho.
  ctx.beginPath();
  ctx.arc(cx, cy, 12, 0, Math.PI * 2);
  ctx.fillStyle = nado.submerso ? 'rgba(53,230,211,.16)' : 'rgba(53,230,211,.34)';
  ctx.fill();
  ctx.strokeStyle = corDoAr(pct);
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Seta para cima enquanto há ar: "suba para respirar".
  if (nado.afogando) {
    ctx.fillStyle = '#EF6C6C';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('!', cx, cy + 5);
  } else if (nado.submerso) {
    ctx.fillStyle = 'rgba(232,255,250,.72)';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('↑', cx, cy + 4);
  }

  // Segundos restantes, só quando o ar está de fato baixando.
  if (nado.submerso) {
    ctx.fillStyle = 'rgba(232,255,250,.62)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(nado.ar)}s`, cx, cy + RAIO + 16);
  }

  ctx.restore();
}
