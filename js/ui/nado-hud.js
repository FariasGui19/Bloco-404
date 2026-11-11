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
import { NADO, podeNadar } from '../game/nado.js';
import { resumoDaArvore, DEGRAUS } from '../game/nado-arvore.js';
import { pocaEm } from '../engine/pocas.js';

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

  // O teto do fôlego depende do degrau, do respeito e do módulo: quem só
  // boia tem 5 s, o Maré Astral pleno chega a 52 s.
  const arMax = nado.arMax ?? NADO.arMaximo;
  // Degrau 0 não prende o ar: sem medidor (o painel do degrau explica).
  if (!(arMax > 0)) return;
  const pct = Math.max(0, Math.min(1, nado.ar / arMax));

  // Fica no canto inferior esquerdo, acima da barra de vida.
  const cx = 74;
  const cy = h - 132;

  ctx.save();
  ctx.globalAlpha = nado.ar >= arMax - .01 ? .42 : .96;

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

  // Orientação sempre visível depois que a travessia libera o nado livre.
  if (nado.mareAstral && nado.nivel >= 3) {
    ctx.fillStyle = 'rgba(232,255,250,.9)';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(nado.mergulhoFixo ? 'Z SUBIR' : 'Z MERGULHAR', cx, cy - RAIO - 10);
  }

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
    ctx.fillText(`${Math.ceil(nado.ar)}s DE AR`, cx, cy + RAIO + 16);
    if (nado.mareAstral && nado.profundidade > 1.25) {
      ctx.fillStyle = pct < .25 ? '#ff9990' : '#c8fff3';
      ctx.fillText(pct < .25 ? 'SUBA PARA RESPIRAR' : `RESPEITO ${Math.round((nado.respeito?.valor ?? 0) * 100)}%`, cx + 35, cy - RAIO - 23);
    }
  }

  ctx.restore();
}

// =====================================================================
// DEGRAU DO NADO
//
// Painel pequeno ao lado do medidor de fôlego: os cinco degraus da
// árvore, o atual e a PROVA que abre o próximo, com barra de andamento.
//
// Mesma regra do medidor: não ocupa tela em terra firme. Aparece perto
// d'água (mar ou poça), dentro dela, ou por alguns segundos depois de
// um degrau novo / de bater no limite. Some sozinho no degrau pleno.
// =====================================================================
const DIRECOES = [[1, 0], [-1, 0], [0, 1], [0, -1], [.7, .7], [-.7, .7], [.7, -.7], [-.7, -.7]];

function pertoDaAgua(map, player) {
  if (pocaEm(map, player.x, player.y)) return true;
  for (const [dx, dy] of DIRECOES) {
    const x = player.x + dx * 1.9, y = player.y + dy * 1.9;
    if (podeNadar(map, x, y) || pocaEm(map, x, y)) return true;
  }
  return false;
}

function caixa(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

export function desenharDegrauNado(state, map) {
  const player = state?.player;
  const nado = player?.nado;
  if (!player || !nado || !map?.aguaPraia) return;
  const canvas = document.getElementById('game');
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;

  const r = resumoDaArvore(state.progress);
  const destaque = (player.nadoDestaque ?? 0) > 0;
  // Degrau pleno: o painel só volta para comemorar.
  const quer = destaque || (r.nivel < r.maximo && (nado.ativo || pertoDaAgua(map, player)));
  player._nadoHud = (player._nadoHud ?? 0) + ((quer ? 1 : 0) - (player._nadoHud ?? 0)) * .14;
  const alfa = player._nadoHud;
  if (alfa < .03) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const h = canvas.height / dpr;
  const L = 258, A = r.prova ? 64 : 46;
  const x = 122, y = h - 132 - A / 2;

  ctx.save();
  ctx.globalAlpha = alfa * .96;

  // Painel
  caixa(ctx, x, y, L, A, 7);
  ctx.fillStyle = 'rgba(6,18,24,.78)';
  ctx.fill();
  ctx.strokeStyle = destaque ? 'rgba(125,255,230,.85)' : 'rgba(53,230,211,.34)';
  ctx.lineWidth = destaque ? 1.6 : 1;
  ctx.stroke();

  // Degraus: cinco losangos em escada.
  const bx = x + 12, by = y + 15;
  for (let i = 0; i < DEGRAUS.length; i++) {
    const cx = bx + i * 13, cy = by + (DEGRAUS.length - 1 - i) * .9 - 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 5); ctx.lineTo(cx + 5, cy); ctx.lineTo(cx, cy + 5); ctx.lineTo(cx - 5, cy);
    ctx.closePath();
    if (i <= r.nivel) {
      ctx.fillStyle = i === r.nivel ? '#7dffe6' : '#2fb8a8';
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(125,255,230,.38)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 10px monospace';
  ctx.fillStyle = '#e8fffa';
  ctx.fillText(`NADO ${r.nivel}/${r.maximo} · ${r.nome}`, x + 80, y + 14);

  ctx.font = '9px monospace';
  if (r.prova) {
    ctx.fillStyle = 'rgba(232,255,250,.74)';
    ctx.fillText(r.prova.id === 'fundo' && !nado.mergulhoLivre
      ? 'FUNDO: REQUER AFINIDADE AQUÁTICA' : `PROVA › ${r.prova.curta}`, x + 12, y + 32);

    // Barra de andamento.
    const bw = L - 24 - 54, bh = 5, px = x + 12, py = y + 46;
    caixa(ctx, px, py, bw, bh, 2.5);
    ctx.fillStyle = 'rgba(232,255,250,.14)';
    ctx.fill();
    if (r.fracao > 0) {
      caixa(ctx, px, py, Math.max(3, bw * r.fracao), bh, 2.5);
      ctx.fillStyle = r.fracao >= 1 ? '#7dffe6' : '#35e6d3';
      ctx.fill();
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(232,255,250,.82)';
    const casas = r.prova.unidade === 'm' ? 0 : 1;
    ctx.fillText(`${Math.min(r.prova.meta, r.valor).toFixed(casas)}/${r.prova.meta.toFixed(casas)} ${r.prova.unidade}`, x + L - 12, py + 3);
  } else {
    ctx.fillStyle = 'rgba(232,255,250,.74)';
    ctx.fillText(nado.mareAstral ? 'Z MERGULHA/SOBE · SHIFT ARRANCA' : 'ESPAÇO MERGULHA · SHIFT ARRANCA', x + 12, y + 32);
  }
  ctx.restore();
}
