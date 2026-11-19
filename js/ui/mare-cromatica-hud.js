import { movimentoDocas, definirMovimentoDocas, tempoVisualDocas } from '../engine/docas-animation.js';
import { ativarAudioCromatico, atualizarAudioCromatico } from '../game/mare-cromatica-audio.js';
import { CROMATICA_MAPS, lerMareCromatica, objetivoCromatico } from '../game/mare-cromatica.js';
import { CONFIG } from '../config.js';
import { SIDE_DEPTH_STEP } from '../engine/camera.js';
import { plantaCais } from '../data/worlds/arquipelago-rotas-perdidas/cais-sul.js';
import { plantaCosta, COSTA_OESTE } from '../data/worlds/arquipelago-rotas-perdidas/costa-oeste-docas.js';

const FONTES_DOCAS={ondas:plantaCosta([443,388]),madeira:plantaCais([541,348]),
  sino:plantaCais([587,488]),abismo:plantaCosta(COSTA_OESTE.tentaculo.base)};
const AUDIO_DOCAS=Object.fromEntries(Object.keys(FONTES_DOCAS).map(id=>[id,{gain:0,pan:0}]));
function audioNaCosta(p,escala){
  const x=p.x*CONFIG.TILE_W/escala,y=p.y*SIDE_DEPTH_STEP/escala;
  for(const id in FONTES_DOCAS){
    const [sx,sy]=FONTES_DOCAS[id],dx=sx-x,dy=sy-y;
    // Submarine low frequencies carry up the shore; creaks stay near deck.
    const range=id==='ondas'?535:id==='abismo'?425:290;
    const gain=Math.max(0,1-Math.hypot(dx,dy*1.14)/range);
    AUDIO_DOCAS[id].gain=gain*gain;
    AUDIO_DOCAS[id].pan=Math.max(-.76,Math.min(.76,dx/260));
  }
  return AUDIO_DOCAS;
}
export function initHudCromatico() {
  const motion=document.getElementById('docasMotion');
  if(motion){
    motion.value=movimentoDocas();
    motion.addEventListener('change',()=>definirMovimentoDocas(motion.value));
  }
  const button=document.getElementById('cromaticaSound');if(!button)return;
  button.addEventListener('click',()=>{
    const on=ativarAudioCromatico();button.textContent=on?'SOM E TRILHA: LIGADO':'SOM E TRILHA: DESLIGADO';button.setAttribute('aria-pressed',String(on));
  });
}
export function atualizarHudCromatico(state, paused=false) {
  const root=document.getElementById('cromaticaHud');if(!root)return;
  const active=CROMATICA_MAPS.includes(state.world.currentMapId);root.hidden=!active;
  // Som local acompanha a fogueira persistente, nunca inicia o áudio sozinho.
  const p=state.player, noCais=state.world.currentMapId==='mare_cromatica_docas' && p;
  const fogueira=noCais && state.progress?.flags?.docas_fogueira_acesa
    ? state.objects?.find(o=>o.id==='docas_fogueira') : null;
  const pertoFogo=fogueira?Math.max(0,1-Math.hypot(p.x-fogueira.x,p.y-fogueira.y)/4):0;
  const tocando=active && !paused && !document.hidden;
  atualizarAudioCromatico(tocando, !!state.cromaticaRuntime?.perigo, pertoFogo,tocando&&noCais?audioNaCosta(p,state.world.currentMap?.geometriaDocas?.escala??2.5):null);
  const motionControl=document.getElementById('docasMotionControl');
  if(motionControl)motionControl.hidden=!noCais;
  if(!active)return;
  const d=lerMareCromatica(state.progress), sec=Math.ceil(d.restante);
  document.getElementById('cromaticaTimer').textContent=d.desfecho ? '• '+d.desfecho.toUpperCase() : `${d.iniciada?'•':'• AGUARDANDO'} ${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;
  document.getElementById('cromaticaObjective').textContent=!d.iniciada&&!d.desfecho ? 'EXPLORAÇÃO LIVRE • INICIE A INCURSÃO NO BARCO' : objetivoCromatico(state.progress);
  document.getElementById('cromaticaThreat').textContent=d.desfecho ? '' : !d.iniciada ? 'EXPLORAÇÃO LIVRE • SEM CONTAGEM' : state.cromaticaRuntime?.perigo ? 'AMEAÇA PRÓXIMA · CLIQUE PARA ATACAR' : 'NULO // SUA RESSONÂNCIA É UM ERRO DE SINTAXE.';
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
  const now=globalThis.performance?.now?.()??0;
  const docas=state.world.currentMapId==='mare_cromatica_docas';
  const visual=docas?tempoVisualDocas(state,now):null;
  const still=visual?visual.reduced:!!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const t=visual?visual.t:still?0:now/1000;
  ctx.fillStyle='rgba(185,110,171,.045)';
  for(let i=0;i<6;i++) {const x=((i*199+t*(5+i%3))%(w+260))-130, y=h*(.2+i*.13);ctx.beginPath();ctx.ellipse(x,y,w*.19,Math.max(6,h*.035),0,0,Math.PI*2);ctx.fill();}
  if (!vignette || vignetteW!==w || vignetteH!==h) {
    vignetteW=w;vignetteH=h;vignette=ctx.createRadialGradient(w/2,h*.5,Math.min(w,h)*.18,w/2,h*.5,Math.max(w,h)*.68);
    vignette.addColorStop(0,'rgba(10,9,17,0)');vignette.addColorStop(1,'rgba(10,5,17,.53)');
  }
  ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);ctx.restore();
}
