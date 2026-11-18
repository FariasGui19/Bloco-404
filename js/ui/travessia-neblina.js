import { SPRITES_TRAVESSIA, MARCOS_TRAVESSIA } from '../data/travessia-lote1.js';
import { usePortal } from '../game/portals.js';
import { criarTravessia, atualizarTravessia, DISTANCIA_DOCAS } from '../game/travessia-neblina.js';
import { iniciarMareCromatica } from '../game/mare-cromatica.js';
import { startQuest } from '../game/quests.js';
import { damagePlayer, ensureHealth, respawnPlayer } from '../game/health.js';
import { saveGame } from '../game/save.js';
import { resetInput } from '../engine/input.js';

let jogo, viagem=null, mapaAberto=false, camada='maritimo', mensagem='', tempoMensagem=0, avisoTempo=0, radioTexto='', radioSomPendente=false;
let canvas, ctx, tela, mapa, radio, sinal, btnMapa, toque={}, audio=null;
let texturaMar, imagemBarco, entrandoDocas=false;
const folhasMar=new Map();
function carregarFolhasMar(){for(const id of SPRITES_TRAVESSIA)if(!folhasMar.has(id)){const imagem=new Image();imagem.src=`assets/sprites/travessia-lote1/${id}-folha.png`;folhasMar.set(id,imagem);}}
function folhaMar(id,x,y,size,t,still,alpha=1,angle=0){const img=folhasMar.get(id);if(!img?.complete||!img.naturalWidth)return false;const frame=still?0:Math.floor(t*5)%8;ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(angle);ctx.imageSmoothingEnabled=false;ctx.drawImage(img,frame*160,0,160,160,-size/2,-size/2,size,size);ctx.restore();return true;}
const chamada='MAYDAY... AQUI DOCAS DA NEBLINA. ÂNCORA DO HUB À DERIVA. SIGAM PELO CAMINHO DAS CORRENTES. COORDENADAS REGISTRADAS NA CARTA NÁUTICA.';
const $=id=>document.getElementById(id);
function somRadio() {
  if(!radioSomPendente)return;
  try {
    const A=globalThis.AudioContext||globalThis.webkitAudioContext;if(!A){radioSomPendente=false;return;}
    audio ??= new A();
    if(audio.state==='suspended' && !globalThis.navigator?.userActivation?.isActive) return;
    radioSomPendente=false;audio.resume().catch(()=>{});
    const now=audio.currentTime,gain=audio.createGain();gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.035,now+.12);gain.gain.exponentialRampToValueAtTime(.0001,now+2.2);gain.connect(audio.destination);
    const n=audio.createBuffer(1,Math.floor(audio.sampleRate*2.2),audio.sampleRate),data=n.getChannelData(0);let seed=404;for(let i=0;i<data.length;i++){seed=(1664525*seed+1013904223)>>>0;data[i]=(seed/2147483648-1)*.35;}
    const src=audio.createBufferSource();src.buffer=n;src.connect(gain);src.start(now);src.stop(now+2.2);
    const horn=audio.createOscillator(),h=audio.createGain();horn.type='sine';horn.frequency.setValueAtTime(170,now);horn.frequency.linearRampToValueAtTime(125,now+1.5);h.gain.setValueAtTime(.0001,now);h.gain.exponentialRampToValueAtTime(.018,now+.35);h.gain.exponentialRampToValueAtTime(.0001,now+2);horn.connect(h);h.connect(audio.destination);horn.start(now);horn.stop(now+2.1);
  } catch { /* texto é a alternativa quando áudio não está disponível */ }
}
export function initTravessiaNeblina(state) {
  texturaMar=new Image();texturaMar.src='assets/sprites/travessia-neblina/mar.png';imagemBarco=new Image();imagemBarco.src='assets/sprites/travessia-neblina/barco.png';
  jogo=state;tela=$('travessiaNeblina');canvas=$('travessiaCanvas');ctx=canvas.getContext('2d');mapa=$('mapaTatico');radio=$('radioNeblina');sinal=$('radioTexto');btnMapa=$('abrirMapaTatico');
  btnMapa.addEventListener('click',()=>alternarMapa());$('fecharMapaTatico').addEventListener('click',()=>alternarMapa(false));
  document.querySelectorAll('[data-camada-tatica]').forEach(b=>b.addEventListener('click',()=>{camada=b.dataset.camadaTatica;desenharMapa();}));
  $('voltarTravessia').addEventListener('click',()=>encerrar());
  $('retornarDocas').addEventListener('click',()=>encerrar());
  document.querySelectorAll('[data-viagem]').forEach(b=>{
    const key=b.dataset.viagem;
    b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);if(key==='sonar'||key==='trocar'||key==='luz') toque[key+'Pulso']=true;else toque[key]=true;});
    for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>{toque[key]=false;});
  });
  document.addEventListener('pointerdown',somRadio);document.addEventListener('keydown',somRadio);
  window.addEventListener('blur',()=>{toque={};});
}
export function iniciarTravessiaNeblina(state) {
  if(!state.progress?.archetype || state.world.currentMapId!=='ilha_enseada_ecos' || !state.progress.flags?.docas_sinal_interceptado)return false;
  carregarFolhasMar();
  jogo=state;viagem=criarTravessia(state.progress.archetype==='mare_astral');toque={};mapaAberto=false;mapa.hidden=true;tela.hidden=false;
  $('chegadaDocas').hidden=true;$('comandosTravessia').hidden=false;$('trocarNado').hidden=!viagem.mare;
  mensagem='SIGA PARA LESTE • W PARA AVANÇAR';tempoMensagem=5;resetInput();return true;
}
function encerrar() {
  if(!viagem)return;
  viagem=null;toque={};tela.hidden=true;$('chegadaDocas').hidden=true;mapa.hidden=true;mapaAberto=false;resetInput();
  // A posição real continua no píer da Enseada durante a travessia.
  saveGame();btnMapa.focus();
}
export function travessiaAtiva(){return !!viagem;}
export function mapaTaticoAberto(){return mapaAberto;}
export function alternarMapa(valor=!mapaAberto){mapaAberto=valor;mapa.hidden=!valor;resetInput();if(valor){desenharMapa();$('fecharMapaTatico').focus();}else btnMapa?.focus();}
function desenharMapa(){
  document.querySelectorAll('[data-camada-tatica]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.camadaTatica===camada)));
  $('cartaRota').hidden=camada!=='maritimo';$('cartaDocas').hidden=!jogo.progress.flags?.docas_sinal_interceptado;$('cartaPosicao').style.left=`${Math.max(5,Math.min(95,viagem?viagem.x/DISTANCIA_DOCAS*90+5:5))}%`;
  $('mapaTaticoConteudo').textContent=camada==='terrestre'?'ENSEADA DOS ECOS • PÍER SUL\nO barco de expedição aguarda junto à costa.':camada==='aereo'?'CARTA AÉREA • SEM CORREDORES HOMOLOGADOS\nVoo livre ainda não autorizado nesta área.':jogo.progress.flags?.docas_sinal_interceptado?'ENSEADA DOS ECOS  ───── CAMINHO DAS CORRENTES ─────  DOCAS DA NEBLINA\nCOORDENADAS DO SOCORRO: SETOR LESTE X 900 / Y 0\n'+(viagem?`POSIÇÃO ATUAL: ${Math.round(viagem.x/DISTANCIA_DOCAS*100)}% DA ROTA`: 'EMBARQUE NO PÍER SUL PARA SEGUIR O SINAL.'):'ENSEADA DOS ECOS ───── CAMINHO DAS CORRENTES\nDESTINO ORIENTAL: SINAL NÃO IDENTIFICADO';
}
export function atualizarRadioNeblina(dt,pausado=false){
  btnMapa.hidden=!jogo?.save?.loaded;
  if(!jogo?.save?.loaded)return;
  if(!pausado && !viagem && jogo.world.currentMapId==='ilha_enseada_ecos' && !jogo.progress.flags?.docas_sinal_interceptado){
    const barco=jogo.objects?.find(o=>o.id==='barco_expedicao_enseada');const p=jogo.player;
    if(barco && Math.hypot(p.x-barco.x,p.y-barco.y)<4.5){
      jogo.progress.flags ??= {};jogo.progress.flags.docas_sinal_interceptado=true;saveGame();avisoTempo=9;radioTexto='';radioSomPendente=true;somRadio();radio.hidden=false;$('radioLeitor').textContent=chamada;document.body.classList.add('radio-interferencia');
    }
  }
  if(avisoTempo>0&&!pausado){avisoTempo-=dt;const tamanho=Math.min(chamada.length,Math.floor((9-avisoTempo)*27));if(tamanho!==radioTexto.length){radioTexto=chamada.slice(0,tamanho);sinal.textContent=radioTexto;}if(avisoTempo<=0){radio.hidden=true;radioSomPendente=false;document.body.classList.remove('radio-interferencia');}}
}
export function atualizarViagemNeblina(dt,input){
  if(!viagem || mapaAberto || document.hidden)return;
  if(viagem.chegou) {
    viagem.atracacao=(viagem.atracacao??0)+Math.min(dt,.05);
    if(viagem.atracacao>=3 && !viagem.atracado) {
      viagem.atracado=true;
      if(!entrandoDocas) {
        entrandoDocas=true;
        void usePortal({id:'chegada_docas',label:'DOCAS DA NEBLINA • PÍER SUL',destino:{mapId:'mare_cromatica_docas',spawnId:'inicio'}}).then(ok=>{
          if(ok) {jogo.progress.flags ??= {};jogo.progress.flags.docas_neblina_alcancada=true;iniciarMareCromatica(jogo.progress);startQuest(jogo.progress,'mare_cromatica_ancora');encerrar();}
          else if(viagem) {viagem.atracado=false;viagem.atracacao=2;mensagem='NÃO FOI POSSÍVEL ATRACAR • TENTANDO NOVAMENTE';}
        }).finally(()=>{entrandoDocas=false;});
      }
    }
    $('travessiaMensagem').textContent='NEBLINA DENSA • ATRACAÇÃO AUTOMÁTICA';return;
  }
  const k=input.keys,p=input.pressed;
  if(p.has('escape')){encerrar();return;}
  const comando={frente:k.w||k.arrowup||toque.frente,tras:k.s||k.arrowdown||toque.tras,esquerda:k.a||k.arrowleft||toque.esquerda,direita:k.d||k.arrowright||toque.direita,acelerar:k.shift||k.shiftleft||toque.acelerar,sonar:p.has('r')||p.has('keyr')||toque.sonarPulso,luz:p.has('l')||p.has('keyl')||toque.luzPulso,trocar:p.has('e')||p.has('keye')||toque.trocarPulso};toque.sonarPulso=false;toque.trocarPulso=false;toque.luzPulso=false;
  const eventos=atualizarTravessia(viagem,comando,dt);tempoMensagem=Math.max(0,tempoMensagem-dt);
  jogo.player.invulnerable=Math.max(0,(jogo.player.invulnerable??0)-dt);
  for(const e of eventos){
    if(e==='dano_nadador'){const hit=damagePlayer(jogo.player,jogo.progress,18,'criatura_marinha');mensagem='ATAQUE NO NADO • VIDA -'+hit.dealt;tempoMensagem=3;if(hit.dead){ensureHealth(jogo.player,jogo.progress);respawnPlayer(jogo.player,{x:jogo.player.x,y:jogo.player.y});viagem.perdeu=true;eventos.push('resgate');}}
    else if(e==='dano_casco'){mensagem='CASCO ATINGIDO • DESVIE!';tempoMensagem=3;}
    else if(e==='resgate'){jogo.player.ability ??= {};jogo.player.ability.lastMessage='RESGATE • VOCÊ RETORNOU AO PÍER DA ENSEADA';jogo.player.ability.messageTimer=5;encerrar();return;}
    else if(e==='chegada'){viagem.atracacao=0;mensagem='NEBLINA DENSA • ATRACAÇÃO AUTOMÁTICA';tempoMensagem=3;
    } else {mensagem=e;tempoMensagem=3;}
  }
  $('travessiaEstado').textContent=`${viagem.nadando?'NADO':'BARCO'} · ROTA ${Math.round(viagem.x/DISTANCIA_DOCAS*100)}% · CASCO ${Math.ceil(viagem.casco)}% · ESTAMINA ${Math.ceil(viagem.estamina)}% · FAROL ${viagem.luz?'ON':'OFF'} · SONAR ${viagem.sonarRecarga>0?Math.ceil(viagem.sonarRecarga)+'s':'PRONTO'}`;
  const aviso=tempoMensagem>0?mensagem:'RUMO ÀS DOCAS DA NEBLINA →';if($('travessiaMensagem').textContent!==aviso)$('travessiaMensagem').textContent=aviso;
}
export function desenharViagemNeblina(){
  if(!viagem||!ctx)return;const v=viagem,w=canvas.width,h=canvas.height;
  const g=ctx.createLinearGradient(0,0,w,0);g.addColorStop(0,'#113d4b');g.addColorStop(1,'#321c38');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  if(texturaMar?.complete && texturaMar.naturalWidth) {ctx.save();ctx.globalAlpha=.85;const desloca=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches?0:Math.sin(v.tempo*.09)*12;ctx.drawImage(texturaMar,-20+desloca,-15,w+40,h+30);ctx.restore();}
  ctx.fillStyle=`rgba(97,24,76,${Math.min(.2,v.x/DISTANCIA_DOCAS*.2)})`;ctx.fillRect(0,0,w,h);
  const proj=(x,y)=>({x:w*.26+(x-v.x)*2.2,y:h*.5+(y-v.y)*2.2});
  const still=!!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  for(const o of MARCOS_TRAVESSIA){const p=proj(o.x,o.y);if(p.x< -130||p.x>w+130||p.y< -130||p.y>h+130)continue;folhaMar(o.tipo,p.x,p.y,o.tamanho,v.tempo,still,o.tipo==='oleo'?.6:.9);if(o.tipo==='boia'){ctx.fillStyle=`rgba(255,220,140,${still?.4:.25+.15*Math.sin(v.tempo*1.3)})`;ctx.beginPath();ctx.arc(p.x,p.y-3,3,0,Math.PI*2);ctx.fill();}}
  ctx.strokeStyle='rgba(168,196,194,.13)';ctx.lineWidth=1;
  for(let i=0;i<55;i++){const x=((i*151-v.x*2.2)% (w+100)+w+100)%(w+100)-50,y=((i*89-v.y*2.2)%h+h)%h;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+22,y-2);ctx.stroke();}
  for(const r of v.rastro){const q=proj(r.x,r.y),a=(1-r.idade/4)*r.intensidade;folhaMar('espuma',q.x,q.y,16+r.idade*5,v.tempo+r.idade,still,a*.38);ctx.strokeStyle=`rgba(204,236,229,${a*.36})`;ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(q.x,q.y,4+r.idade*5,2+r.idade*2,0,0,Math.PI*2);ctx.stroke();}
  const end=proj(DISTANCIA_DOCAS,0);if(end.x<w+100){ctx.fillStyle='rgba(198,210,214,.22)';ctx.fillRect(end.x-20,0,80,h);ctx.fillStyle='#d4d7cc';ctx.fillRect(end.x+15,h*.5-65,25,130);}
  for(const a of v.ameacas){
    if(a.fase==='esgotado')continue;const p=proj(a.x,a.y);if(p.x< -90||p.x>w+90||p.y< -90||p.y>h+90)continue;
    const alerta=a.fase==='aviso'||a.fase==='ataque';
    if(a.tipo==='redemoinho'){
      folhaMar('redemoinho',p.x,p.y,76,v.tempo,still,.65);
      if(alerta)folhaMar('tentaculo',p.x,p.y-5,70,v.tempo,still,a.fase==='ataque'?.9:.55);
    } else {
      folhaMar('sombra',p.x,p.y,64,v.tempo,still,.62);
      if(alerta||v.sonar>0)folhaMar('olhos',p.x,p.y,34,v.tempo,still,.75);
    }
    if(alerta||v.sonar>0){ctx.strokeStyle=a.fase==='ataque'?'#ffb0c8':'#dd94c2';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y,a.tipo==='redemoinho'?29:20,14,0,0,Math.PI*2);ctx.stroke();}
  }
  for(const a of v.ameacas) if(a.fase==='ataque' && a.tipo!=='redemoinho') {
    const t=1-Math.max(0,a.timer)/1.2, origem=proj(a.x,a.y), destino=proj(a.tx,a.ty);
    const x=origem.x+(destino.x-origem.x)*t,y=origem.y+(destino.y-origem.y)*t;
    folhaMar('peixe',x,y,48,v.tempo,still,.95,Math.atan2(destino.y-origem.y,destino.x-origem.x));
  }
  for(const a of v.ameacas) if(a.fase==='aviso'||a.fase==='ataque') {const mark=proj(a.tx,a.ty);ctx.strokeStyle=a.fase==='ataque'?'#ffc7d5':'#f8b4dc';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(mark.x,mark.y,a.tipo==='redemoinho'?30:20,14,0,0,Math.PI*2);ctx.stroke();}
  const p=proj(v.x,v.y);if(v.chegou)p.x+=Math.min(1,(v.atracacao??0)/3)*22;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(v.heading*(v.chegou?Math.max(0,1-(v.atracacao??0)/3):1));
  if(!v.nadando){if(v.luz){const light=ctx.createLinearGradient(12,0,170,0);light.addColorStop(0,'rgba(223,243,210,.27)');light.addColorStop(1,'rgba(210,238,226,0)');ctx.fillStyle=light;ctx.beginPath();ctx.moveTo(10,-4);ctx.lineTo(170,-65);ctx.lineTo(170,65);ctx.lineTo(10,4);ctx.fill();}if(imagemBarco?.complete && imagemBarco.naturalWidth){ctx.imageSmoothingEnabled=true;ctx.drawImage(imagemBarco,-39,-17,78,34);}else{ctx.fillStyle='#b4a695';ctx.beginPath();ctx.moveTo(24,0);ctx.lineTo(4,12);ctx.lineTo(-25,9);ctx.lineTo(-29,0);ctx.lineTo(-25,-9);ctx.lineTo(4,-12);ctx.closePath();ctx.fill();}}else{ctx.fillStyle='#b4eae3';ctx.beginPath();ctx.arc(0,0,7,0,Math.PI*2);ctx.fill();ctx.fillStyle='#b4a695';ctx.fillRect(-38,-8,24,16);}
  ctx.restore();if(v.sonar>0){ctx.strokeStyle='rgba(129,244,220,.65)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,(3-v.sonar)*42,0,Math.PI*2);ctx.stroke();}
  for(let i=0;i<7;i++){let x=((i*227+(still?0:v.tempo*(4+i%3)))%(w+500))-250;ctx.fillStyle=`rgba(181,193,210,${.025+i%2*.012})`;ctx.beginPath();ctx.ellipse(x,(i*83)%h,200,18+i%3*5,0,0,Math.PI*2);ctx.fill();}
  const fog=ctx.createLinearGradient(w*.55,0,w,0);fog.addColorStop(0,'rgba(172,183,193,0)');fog.addColorStop(1,'rgba(175,180,199,.35)');ctx.fillStyle=fog;ctx.fillRect(0,0,w,h);if(v.chegou){ctx.fillStyle=`rgba(205,211,220,${Math.sin(Math.min(1,(v.atracacao??0)/3)*Math.PI)*.4})`;ctx.fillRect(0,0,w,h);}
}
