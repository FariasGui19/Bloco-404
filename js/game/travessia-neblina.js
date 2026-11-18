// Simulação determinística e independente do renderizador. Distâncias são
// unidades náuticas abstratas; o barco não é um teleporte para o destino.
export const DISTANCIA_DOCAS=900;
const limite=(n,a,b)=>Math.max(a,Math.min(b,n));
export function criarTravessia(mare=false) {
  return {x:0,y:0,heading:0,speed:0,casco:100,estamina:100,nadando:false,mare,tempo:0,luz:true,rastro:[],rastroClock:0,sonar:0,sonarRecarga:0,invulneravel:0,chegou:false,perdeu:false,
    ameacas:Array.from({length:12},(_,i)=>({x:100+i*65,y:Math.sin(i*2.4)*44,tipo:i%3===0?'redemoinho':i%3===1?'peixe':'sombra',fase:'espera',timer:0,tx:0,ty:0}))};
}
export function atualizarTravessia(v,comandos,dt) {
  if(!v || v.chegou || v.perdeu || !Number.isFinite(dt)) return [];
  dt=limite(dt,0,.05);v.tempo+=dt;v.invulneravel=Math.max(0,v.invulneravel-dt);v.sonar=Math.max(0,v.sonar-dt);v.sonarRecarga=Math.max(0,v.sonarRecarga-dt);
  const eventos=[];
  if(comandos.trocar && v.mare) {v.nadando=!v.nadando;v.speed*=.3;eventos.push(v.nadando?'NADO • CASCO SOB REBOQUE':'A BORDO');}
  if(comandos.luz){v.luz=!v.luz;eventos.push(v.luz?'FAROL LIGADO':'FAROL APAGADO • USE O SONAR');}
  if(comandos.sonar && v.sonarRecarga===0) {v.sonar=3;v.sonarRecarga=7;eventos.push('SONAR ATIVO');}
  const direcao=(comandos.direita?1:0)-(comandos.esquerda?1:0);
  v.heading=limite(v.heading+direcao*1.2*dt,-1.15,1.15);
  const impulso=!!comandos.acelerar && v.estamina>0;
  if(v.nadando) v.estamina=limite(v.estamina-(impulso?9:3.3)*dt,0,100);
  else v.estamina=limite(v.estamina+(impulso?-4:8)*dt,0,100);
  const motor=comandos.frente ? (v.nadando?(v.estamina>0?(impulso?12:7):3):(impulso?19:13)) : comandos.tras?-4:0;
  v.speed+=(motor-v.speed)*(1-Math.exp(-(v.nadando?2:0.8)*dt));
  v.x=limite(v.x+Math.cos(v.heading)*v.speed*dt,0,DISTANCIA_DOCAS);
  v.y=limite(v.y+Math.sin(v.heading)*v.speed*dt,-95,95);
  if(Math.abs(v.y)>=95) v.speed*=.97;
  for(const r of v.rastro)r.idade+=dt;
  while(v.rastro.length && v.rastro[0].idade>4)v.rastro.shift();
  v.rastroClock-=dt;
  if(!v.nadando && v.speed>2 && v.rastroClock<=0){v.rastroClock=.18;v.rastro.push({x:v.x-Math.cos(v.heading)*4,y:v.y-Math.sin(v.heading)*4,idade:0,intensidade:limite(v.speed/19,.2,1)});if(v.rastro.length>24)v.rastro.shift();}
  for(const a of v.ameacas) {
    let dx=a.x-v.x,dy=a.y-v.y,dist=Math.hypot(dx,dy);
    // Peixes e sombras seguem o cone aceso, mas ainda atacam por proximidade
    // com a luz apagada; redemoinhos são riscos fixos, não predadores.
    if(a.fase==='espera' && a.tipo!=='redemoinho' && v.luz && !v.nadando && dist>24 && dist<85 && (dx*Math.cos(v.heading)+dy*Math.sin(v.heading))/dist>.78) {
      a.x-=dx/dist*7*dt;a.y-=dy/dist*7*dt;dx=a.x-v.x;dy=a.y-v.y;dist=Math.hypot(dx,dy);
    }
    if(a.fase==='espera' && dist<24){a.fase='aviso';a.timer=a.tipo==='redemoinho'?2:1.8;a.tx=a.tipo==='redemoinho'?a.x:v.x;a.ty=a.tipo==='redemoinho'?a.y:v.y;eventos.push('CONTATO HOSTIL • DESVIE');}
    else if(a.fase==='aviso') {a.timer-=dt;if(a.timer<=0){a.fase='ataque';a.timer=a.tipo==='redemoinho'?1:1.2;}}
    else if(a.fase==='ataque') {
      a.timer-=dt;
      const alcance=a.tipo==='redemoinho'?14:9;
      if(Math.hypot(v.x-a.tx,v.y-a.ty)<alcance && v.invulneravel<=0){v.invulneravel=2.4;if(v.nadando) eventos.push('dano_nadador');else {v.casco=Math.max(0,v.casco-24);eventos.push('dano_casco');}}
      if(a.timer<=0)a.fase='esgotado';
    }
  }
  if(v.casco<=0){v.perdeu=true;eventos.push('resgate');}
  if(v.x>=DISTANCIA_DOCAS){v.chegou=true;eventos.push('chegada');}
  return eventos;
}
