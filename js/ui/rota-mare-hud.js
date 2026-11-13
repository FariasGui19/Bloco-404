import { nomeDoClima } from '../game/clima.js';
import { encontroProximo, direcaoEncontro } from '../game/encontros-mare.js';
// Orientação simples também legível sob a câmera submersa; não cria missão.
export function desenharRotaMare(canvas, map, state) {
  if (!canvas || !map?.meta?.rotaMare || !state.player) return;
  const ctx=canvas.getContext('2d'); if (!ctx) return;
  const dpr=Math.min(window.devicePixelRatio || 1,1.5), w=canvas.width/dpr;
  const rumoDarsena = state.world.currentSpawnId !== 'vindo_da_darsena';
  const destino = rumoDarsena ? 'DÁRSENA' : 'ENSEADA';
  const progresso = Math.max(0,Math.min(1,(state.player.x-4.5)/39));
  const x=w/2, y=18;
  const encontro=encontroProximo(map,state.player,state.progress,Infinity);
  const altura=encontro ? 88 : 73;
  ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='rgba(4,24,33,.82)';ctx.fillRect(x-170,y,340,altura);
  ctx.strokeStyle='rgba(98,231,217,.6)';ctx.strokeRect(x-170,y,340,altura);
  ctx.fillStyle='#cafff3';ctx.textAlign='center';ctx.font='bold 10px monospace';
  ctx.fillText(`ROTA DAS MARÉS • DESTINO: ${destino}`,x,y+16);
  ctx.strokeStyle='#79cfc3';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-125,y+32);ctx.lineTo(x+125,y+32);ctx.stroke();
  ctx.fillStyle='#fbdf95';ctx.beginPath();ctx.arc(x-125+250*progresso,y+32,4,0,Math.PI*2);ctx.fill();
  ctx.font='9px monospace';ctx.fillStyle='#b1e0d9';ctx.textAlign='left';ctx.fillText('ENSEADA',x-159,y+50);
  ctx.textAlign='right';ctx.fillText('DÁRSENA',x+159,y+50);
  const clima = state.clima;
  const climaTexto = clima?.atual && clima?.proximo ? nomeDoClima(clima) : 'MAR CALMO';
  const corrente = state.player.nado?.corrente;
  const nivel = Math.min(100, Math.round((corrente?.forca ?? 0) * 100));
  ctx.textAlign='center';ctx.fillStyle='#c4f4ec';
  ctx.fillText(`${climaTexto} • CORRENTE ${nivel}%`,x,y+65);
  if (encontro) {ctx.fillStyle='#f7dfad';ctx.fillText(`${direcaoEncontro(state.player,encontro.item)} ${encontro.label} • ${encontro.distancia.toFixed(1)} TILES`,x,y+81,320);}
  // Seta usa a projeção isométrica do vetor físico, não um vento decorativo.
  if (corrente && Math.hypot(corrente.x, corrente.y) > .03) {
    const dx=corrente.x-corrente.y, dy=(corrente.x+corrente.y)*.5;
    const ang=Math.atan2(dy,dx); ctx.save();ctx.translate(x+145,y+62);ctx.rotate(ang);
    ctx.strokeStyle='#a8fff0';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-7,0);ctx.lineTo(7,0);
    ctx.lineTo(3,-3);ctx.moveTo(7,0);ctx.lineTo(3,3);ctx.stroke();ctx.restore();
  }
  ctx.restore();
}
