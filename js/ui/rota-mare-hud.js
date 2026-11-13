import { nomeDoClima } from '../game/clima.js';
import { setorOceano } from '../game/oceano-regioes.js';
import { encontroProximo, direcaoEncontro } from '../game/encontros-mare.js';

// Coordenadas físicas do mapa (não coordenadas de tela isométrica).
export function cartaMare(map, player, spawnId) {
  const largura=map.aguaPraia[0].length, altura=map.aguaPraia.length;
  const destino=spawnId === 'vindo_da_darsena' ? {nome:'ENSEADA',x:2.5,y:15.5} : {nome:'DÁRSENA',x:87.5,y:30.5};
  return { largura, altura, destino, x:Math.max(0,Math.min(1,player.x/largura)), y:Math.max(0,Math.min(1,player.y/altura)),
    distancia:Math.hypot(destino.x-player.x,destino.y-player.y) };
}
export function desenharRotaMare(canvas, map, state) {
  if (!canvas || !map?.meta?.rotaMare || !state.player) return;
  const ctx=canvas.getContext('2d'); if (!ctx) return;
  const dpr=Math.min(window.devicePixelRatio || 1,1.5), tela=canvas.width/dpr;
  const w=Math.max(0,Math.min(240,tela-20)), x=(tela-w)/2, y=12;
  const carta=cartaMare(map,state.player,state.world.currentSpawnId), n=state.player.nado;
  const encontro=encontroProximo(map,state.player,state.progress,Infinity);
  const h=encontro ? 174 : 160, mx=x+12, my=y+30, mw=w-24, mh=67;
  ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle='rgba(3,25,37,.87)';ctx.fillRect(x,y,w,h);ctx.strokeStyle='rgba(98,231,217,.7)';ctx.strokeRect(x,y,w,h);
  ctx.font='bold 10px monospace';ctx.fillStyle='#cafff3';ctx.textAlign='left';ctx.fillText('CARTA • MARÉ ASTRAL',x+10,y+16);
  ctx.fillStyle='#0a4657';ctx.fillRect(mx,my,mw,mh);ctx.strokeStyle='rgba(138,218,210,.23)';ctx.lineWidth=1;
  for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(mx+mw*i/4,my);ctx.lineTo(mx+mw*i/4,my+mh);ctx.stroke();}
  for(let i=1;i<3;i++){ctx.beginPath();ctx.moveTo(mx,my+mh*i/3);ctx.lineTo(mx+mw,my+mh*i/3);ctx.stroke();}
  const pontos=[{x:2.5,y:15.5,n:'E'},{x:87.5,y:30.5,n:'D'},...(map.pontosCorrente ?? []).map(p=>({...p,n:'·'}))];
  for(const p of pontos){const px=mx+p.x/carta.largura*mw,py=my+p.y/carta.altura*mh;ctx.fillStyle=p.n==='·'?'#70cfc5':'#f9da83';ctx.font='bold 10px monospace';ctx.fillText(p.n,px-3,py+3);}
  const px=mx+carta.x*mw,py=my+carta.y*mh, dx=n?.dirX ?? 0,dy=n?.dirY ?? 1, ang=Math.atan2(dy,dx);
  ctx.save();ctx.translate(px,py);ctx.rotate(ang);ctx.fillStyle='#f9fff0';ctx.beginPath();ctx.moveTo(7,0);ctx.lineTo(-4,-4);ctx.lineTo(-2,0);ctx.lineTo(-4,4);ctx.closePath();ctx.fill();ctx.restore();
  ctx.font='9px monospace';ctx.fillStyle='#c4f4ec';ctx.fillText(`DESTINO ${carta.destino.nome} • ${carta.distancia.toFixed(0)} T`,x+10,y+112,w-20);
  const clima=state.clima?.atual&&state.clima?.proximo?nomeDoClima(state.clima):'MAR CALMO';
  ctx.fillText(`POS ${state.player.x.toFixed(1)}, ${state.player.y.toFixed(1)} • ${n?.submerso ? 'SUBMERSO' : 'SUPERFÍCIE'}`,x+10,y+126,w-20);
  ctx.fillText(`${clima} • FUNDO ${Math.min(2,n?.fundo ?? 0).toFixed(1)} / 2`,x+10,y+140,w-20);
  ctx.fillStyle='#9eddd5';ctx.fillText(setorOceano(map,state.player.x) ?? 'MAR ABERTO',x+10,y+154,w-20);
  if(encontro){ctx.fillStyle='#f7dfad';ctx.fillText(`${direcaoEncontro(state.player,encontro.item)} ${encontro.label} • ${encontro.distancia.toFixed(0)} T`,x+10,y+168,w-20);}
  ctx.restore();
}
