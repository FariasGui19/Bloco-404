import { ativarAudioCromatico, atualizarAudioCromatico } from '../game/mare-cromatica-audio.js';
import { CROMATICA_MAPS, lerMareCromatica, objetivoCromatico } from '../game/mare-cromatica.js';
export function initHudCromatico() {
  const button=document.getElementById('cromaticaSound');if(!button)return;
  button.addEventListener('click',()=>{
    const on=ativarAudioCromatico();button.textContent=on?'SOM AMBIENTE: LIGADO':'SOM AMBIENTE: DESLIGADO';button.setAttribute('aria-pressed',String(on));
  });
}
export function atualizarHudCromatico(state, paused=false) {
  const root=document.getElementById('cromaticaHud');if(!root)return;
  const active=CROMATICA_MAPS.includes(state.world.currentMapId);root.hidden=!active;
  atualizarAudioCromatico(active && !paused && !document.hidden, !!state.cromaticaRuntime?.perigo);
  if(!active)return;
  const d=lerMareCromatica(state.progress), sec=Math.ceil(d.restante);
  document.getElementById('cromaticaTimer').textContent=d.desfecho ? '• '+d.desfecho.toUpperCase() : `• ${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;
  document.getElementById('cromaticaObjective').textContent=objetivoCromatico(state.progress);
  document.getElementById('cromaticaThreat').textContent=d.desfecho ? '' : state.cromaticaRuntime?.perigo ? 'AMEAÇA PRÓXIMA · CLIQUE PARA ATACAR' : 'NULO // SUA RESSONÂNCIA É UM ERRO DE SINTAXE.';
  document.getElementById('cromaticaSync').textContent=`SINCRONIZAÇÃO ${d.sincronizacao}/4 · FITAS ${d.fitas.length}/2`;
}
let vignette=null, vignetteW=0, vignetteH=0;
export function desenharAtmosferaCromatica(canvas,state) {
  if(!CROMATICA_MAPS.includes(state.world.currentMapId))return;
  const d=lerMareCromatica(state.progress);if(d.desfecho==='total')return;
  const ctx=canvas.getContext('2d');if(!ctx)return;
  ctx.save();ctx.setTransform(1,0,0,1,0,0);
  const w=canvas.width,h=canvas.height;
  ctx.fillStyle=d.desfecho==='colapso'?'rgba(86,15,78,.24)':'rgba(53,19,64,.17)';ctx.fillRect(0,0,w,h);
  // Névoa leve com quantidade fixa de elementos; movimento reduzido para
  // usuários que o solicitam, sem flash nem efeito estroboscópico.
  const still=!!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const t=still?0:(globalThis.performance?.now?.()??0)/1000;
  ctx.fillStyle='rgba(185,110,171,.045)';
  for(let i=0;i<6;i++) {const x=((i*199+t*(5+i%3))%(w+260))-130, y=h*(.2+i*.13);ctx.beginPath();ctx.ellipse(x,y,w*.19,Math.max(6,h*.035),0,0,Math.PI*2);ctx.fill();}
  if (!vignette || vignetteW!==w || vignetteH!==h) {
    vignetteW=w;vignetteH=h;vignette=ctx.createRadialGradient(w/2,h*.5,Math.min(w,h)*.18,w/2,h*.5,Math.max(w,h)*.68);
    vignette.addColorStop(0,'rgba(10,9,17,0)');vignette.addColorStop(1,'rgba(10,5,17,.53)');
  }
  ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);ctx.restore();
}
