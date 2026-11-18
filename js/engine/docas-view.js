import { getSprite } from './sprites.js';
import { SIDE_DEPTH_STEP } from './camera.js';
import { CONFIG } from '../config.js';
// O cenário de referência permanece intacto; o espaço e a máscara usam a
// mesma escala da imagem. Camadas dinâmicas são desenhadas por cima.
export function renderDocas(ctx,map,state,camX,camY,w,h,zoom,dpr,now,drawPlayer) {
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#090d18';ctx.fillRect(0,0,w,h);
  ctx.setTransform(dpr*zoom,0,0,dpr*zoom,dpr*(w/2-camX*zoom),dpr*(h/2+115-camY*zoom));
  const image=getSprite('docas_referencia');if(image)ctx.drawImage(image,0,0,1568,880);
  const reduced=!!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const t=reduced?0:now/1000;
  // O farol varre de forma suave, sem alterações bruscas de luminância.
  const angle=2.8+Math.sin(t*.28)*.26;ctx.save();ctx.translate(904,55);ctx.rotate(angle);ctx.fillStyle='rgba(242,234,184,.07)';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(430,-42);ctx.lineTo(430,42);ctx.closePath();ctx.fill();ctx.restore();
  const entities=[...(state.trainingTargets??[]).filter(e=>e.health>0),...(state.cromaticaRuntime?.visao?[state.cromaticaRuntime.visao]:[]),state.player].filter(Boolean).sort((a,b)=>a.y-b.y);
  for(const e of entities){const x=e.x*CONFIG.TILE_W,y=e.y*SIDE_DEPTH_STEP;
    if(e===state.player){drawPlayer(e,x,y);continue;}
    if(e.renderType==='cromaticaVisao'){const img=getSprite('cromatica_nulo');if(img){ctx.save();ctx.globalAlpha=Math.min(.75,e.tempo/1.2);ctx.drawImage(img,x-18,y-65,36,65);ctx.restore();}continue;}
    const img=getSprite('cromatica_infectado');ctx.save();ctx.fillStyle='rgba(8,8,18,.6)';ctx.beginPath();ctx.ellipse(x,y,14,5,0,0,Math.PI*2);ctx.fill();if(e.windup>0){ctx.strokeStyle='#ffc4e2';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,20,9,0,0,Math.PI*2);ctx.stroke();}if(img){let fw=img.width/8,fr=Math.floor((e.clock??0)*5)%8;ctx.drawImage(img,fr*fw,0,fw,img.height,x-30,y-78,60,78);}ctx.restore();
  }
  // Interações são discretas, mas visíveis quando próximas.
  for(const o of state.objects??[]){if(!o.interacao)continue;const dist=Math.hypot(o.x-state.player.x,o.y-state.player.y);if(dist>1.8)continue;ctx.save();ctx.strokeStyle='rgba(188,246,231,.8)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(o.x*64,o.y*22,12,4,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
  // Névoa baixa com custo fixo, ancorada no mundo e sem cobrir a HUD.
  ctx.fillStyle='rgba(179,175,215,.045)';for(let i=0;i<7;i++){const x=((i*251+t*(4+i%3))%1900)-160,y=340+i*58;ctx.beginPath();ctx.ellipse(x,y,160,15,0,0,Math.PI*2);ctx.fill();}
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle='rgba(10,4,23,.08)';ctx.fillRect(0,0,w,h);
  ctx.fillStyle='rgba(220,202,240,.025)';for(let y=0;y<h;y+=4)ctx.fillRect(0,y,w,1);
}
