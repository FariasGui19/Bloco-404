// Adaptador autocontido da primeira realidade FPS. Não altera os kits nem o
// inventário do jogo principal; apenas interpreta suas ressonâncias locais.
import { ensureHealth, damagePlayer, healPlayer, updateHealth, respawnPlayer } from './health.js';
import { saveGame } from './save.js';
import { usePortal } from './portals.js';
import { grantArchetypeXp } from './rpg.js';
import { getActiveUltimate } from './ultimate.js';
import { getUnlockState } from './unlocks.js';
import { playCutscene, CITADEL_END_SCENES } from '../ui/cutscene.js';
import { citadelAudioEnabled, toggleCitadelAudio, playCitadelSound } from './cidadela-audio.js';
import { CITADEL_DECOR, CITADEL_ARCHIVES, CITADEL_POSTGAME, CITADEL_BREACHES, CITADEL_BREACH_CONSOLE, CITADEL_NULL_MONITORS, CITADEL_ECHOES, CITADEL_ECHO_TERMINAL, CITADEL_ECHO_DECOR, CITADEL_WORKSHOP } from '../data/worlds/cidadela-404/cidadela.js';
import { citadelMissions, missionObjective, interactCitadelMission } from './cidadela-missoes.js';
import { sealedFlag, cacheFlag, breachSummary, beginBreach, cancelBreach, updateBreach, openBreachCache } from './cidadela-fendas.js';
import { inspectCitadelMonitor, crtCount, ARCHETYPE_READINGS, crtSignalFragment } from './cidadela-narrativa.js';
import { getDimensionProgress, syncDimensionProgress } from './dimension-progress.js';
import { memoryEchoCount,interactMemoryEcho,useEchoTerminal } from './cidadela-ecos.js';
import { workshopPhase,workshopCount,interactWorkshop,workshopCircuitActive,toggleWorkshopTrial,interactWorkshopTrial } from './cidadela-vigilia.js';

export const KEYS = [
  { id: 'azul', flag: 'cidadela_chave_azul', x: 5.5, y: 3.5, color: '#57e6f0', symbol: '◆', label: 'AZUL / LOSANGO', log: 'PEDIDO DE SOCORRO INICIADO.' },
  { id: 'amarela', flag: 'cidadela_chave_amarela', x: 12.5, y: 9.0, color: '#ffd166', symbol: '▲', label: 'AMARELA / TRIÂNGULO', log: 'RESPOSTA RECEBIDA TRÊS SEGUNDOS ANTES DO ENVIO.' },
  { id: 'vermelha', flag: 'cidadela_chave_vermelha', x: 19.5, y: 3.5, color: '#ff5261', symbol: '■', label: 'VERMELHA / QUADRADO', log: 'O GUARDIÃO MANTEVE O REATOR VIVO. ALGUÉM MANDOU QUE ELE PARASSE.' },
];
export const MODULES = {
  mare_astral: { name: 'MARÉ ASTRAL', color: '#62e9ef', q: 'CORRENTE: IMPULSO + LENTIDÃO', mode: 'mare' },
  nucleo_dez_forma: { name: 'NÚCLEO X10', color: '#8efb76', q: 'VETOR: IMPULSO VELOZ', mode: 'nucleo' },
  lamina_dominio_anciao: { name: 'DOMÍNIO ANCIÃO', color: '#dfb3ff', q: 'RUPTURA: CORTE FRONTAL', mode: 'dominio' },
  motor_bio_forja: { name: 'BIO-FORJA', color: '#ffb166', q: 'FORJA: ESCUDO + IMPULSO', mode: 'bio' },
};
const ENEMY_SEEDS = [
  ['imp', 5.5, 8.5], ['imp', 6.5, 4.5], ['orb', 11.5, 4.5],
  ['imp', 13.5, 7.5], ['orb', 19.5, 8.5], ['imp', 18.5, 5.5],
];
const checkpoints = [{x: 2.5,y: 6.5}, {x: 9.7,y: 6.5}, {x: 16.7,y: 6.5}, {x: 23.7,y: 6.5}];
let game = null;
const clamp = (v,a,b) => Math.max(a, Math.min(b,v));
const angleDiff = a => Math.atan2(Math.sin(a), Math.cos(a));
const held = (i,...names) => names.some(n => i.keys[n]);
const pressed = (i,...names) => names.some(n => i.pressed.has(n));
export function checkpointIndex(flags = {}) { return flags.cidadela_chave_vermelha ? 3 : flags.cidadela_chave_amarela ? 2 : flags.cidadela_chave_azul ? 1 : 0; }
export function wallAt(map, flags, x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  if (!map.layout[iy] || map.layout[iy][ix] === undefined || map.layout[iy][ix] === 1) return 1;
  const gates = { 8: 'cidadela_chave_azul', 15: 'cidadela_chave_amarela', 22: 'cidadela_chave_vermelha' };
  if (iy<=10 && gates[ix] && !flags[gates[ix]]) return 2;
  if (iy===11 && [4,5,19,20].includes(ix) && !flags.cidadela_estavel) return 2;
  return 0;
}
export function canMove(map, flags, x, y, radius = .2) {
  return ![[radius,radius],[-radius,radius],[radius,-radius],[-radius,-radius]].some(([dx,dy]) => wallAt(map,flags,x+dx,y+dy));
}
// Linha de visão também usada para evitar tiros e perseguição através de paredes.
export function visible(map, flags, x, y, tx, ty) {
  const dx=tx-x, dy=ty-y, n=Math.ceil(Math.hypot(dx,dy)*8);
  for (let i=1;i<n;i++) if (wallAt(map,flags,x+dx*i/n,y+dy*i/n)) return false;
  return true;
}
// A indicação na HUD e a ação E compartilham a mesma escolha: o alvo
// alcançável mais próximo. Evita que dois terminais vizinhos acionem ambos.
export function nearestInteraction(map,flags,p) {
  const candidates=[{kind:'exit',x:2.5,y:6.5,radius:1.3},
    ...KEYS.filter(k=>!flags[k.flag]).map(k=>({...k,kind:'key',radius:1.35})),
    ...CITADEL_ARCHIVES.map(a=>({...a,kind:'archive',radius:1.2})),
    ...CITADEL_NULL_MONITORS.map(m=>({...m,kind:'crt',radius:1.0})),
    ...CITADEL_ECHOES.map(o=>({...o,radius:1.0})),
    {...CITADEL_ECHO_TERMINAL,radius:1.0},
    ...(flags.cidadela_estavel?[
      ...CITADEL_WORKSHOP.switches.map(o=>({...o,radius:1.05})),
      {...CITADEL_WORKSHOP.terminal,radius:1.1},
      {kind:'workshop_trial',x:18.3,y:20.2,radius:1},
      {kind:'reactor',x:30.4,y:6.5,radius:1.4},
      {...CITADEL_BREACH_CONSOLE,radius:1},
      ...CITADEL_BREACHES.flatMap(b=>[
        {...b,kind:'breach',radius:1},
        {...b,...b.cache,kind:'breach_cache',radius:.85},
      ]),
      ...[CITADEL_POSTGAME.sonda,CITADEL_POSTGAME.transmissor,CITADEL_POSTGAME.treino,...CITADEL_POSTGAME.reles,...CITADEL_POSTGAME.registros].map(o=>({...o,radius:1.2}))
    ]:[])];
  return candidates.map(o=>({...o,distance:Math.hypot(p.x-o.x,p.y-o.y)}))
    .filter(o=>o.distance<o.radius && visible(map,flags,p.x,p.y,o.x,o.y))
    .sort((a,b)=>a.distance-b.distance)[0];
}
export function createCitadelRuntime(progress) {
  const flags = progress.flags ??= {};
  return { angle: 0, enemies: flags.cidadela_estavel ? [] : ENEMY_SEEDS.map(([type,x,y],i) => ({type,x,y,hp:type === 'orb'?75:55, cooldown:1.6+i*.25, slow:0})),
    boss: {type:'boss', x:28, y:6.5, hp:280, cycle:0, cooldown:1.5, dead:!!flags.cidadela_estavel},
    supplies: [{x:4.5,y:9.5},{x:13.5,y:3.5},{x:20.5,y:7.5},{x:24.5,y:9.5}],
    shots: [], impacts: [], ammo: 12, reload: 0, jam: 0, fire: 0, q: 0, boost: 0, scan: 0, dash: 0, dashAngle:0, shield: 0, guard:0, ultBuff:null, echo: 0, echoLock: 0,
    message: flags.cidadela_estavel ? 'NEXO-04: REATOR ESTÁVEL. A SONDA AGUARDA NA ARENA; A OFICINA ABRIU AO SUL.' : 'NEXO-04: A LINHA ESTÁ ABERTA. ENCONTRE OS TRÊS REGISTROS.', messageTime: 8, time: 0, damage: 0, hit: 0, fx: 0, signalTime:0, signalCooldown:0, signalMonitorId:null, weaponDeploy:0, fxKind: '', suppressed: 0, returning: false, training:false, breach:null, radioQueue:[],stepDistance:0,walkPhase:0,walkBlend:0, echoAnchor:0, echoTerminalCooldown:0, workshopHit:0, workshopTrial:null, localProgress:null, vectorCharge:0, perkIcon:null, panel: null };
}
function notice(g, text, seconds=4) { g.message=text; g.messageTime=seconds; }
function queueRadio(g,text) { if(text && g.radioQueue.length<6) g.radioQueue.push(text); }
function saveCitadelProgress(progress,g) {
  const result=syncDimensionProgress(progress);
  g.localProgress=result.after;
  if(result.after && result.before && result.after.rank>result.before.rank)
    queueRadio(g,`NEXO: SINTONIA LOCAL ${result.after.rank}/4. CONSULTE [K] PARA VER A ADAPTAÇÃO.`);
  saveGame();
}
// Uma linha legível em monospace em vez de comprimir avisos longos.
export function wrapCitadelText(text,limit=66) {
  const lines=[];let line='';
  limit=Math.max(1,Math.floor(limit));
  for(let word of String(text ?? '').split(/\s+/).filter(Boolean)) {
    if(line && (line.length+word.length+1)>limit) {lines.push(line);line='';}
    while(word.length>limit) {lines.push(word.slice(0,limit));word=word.slice(limit);}
    if(word) line+=(line?' ':'')+word;
  }
  if(line) lines.push(line);
  return lines;
}
// A fase acompanha deslocamento real. O relógio é fallback para entidades
// antigas ou chamadas de teste que ainda não tenham uma fase de passada.
export function enemyWalkFrame(o,time) {
  const phase=Number.isFinite(o.walkPhase)?o.walkPhase:time*2.4;
  return Math.floor(phase)%2?'b':'a';
}
// Quadros de ação têm prioridade sobre a locomoção; em movimento reduzido a
// silhueta permanece parada sem remover as poses de aviso de ataque.
export function citadelSpriteFrame(o,time,reduce=false) {
  const frame=enemyVisualFrame(o);
  if(frame==='death') return !reduce && (o.death ?? 0)>.38 ? `${o.type}_fall` : `${o.type}_death`;
  if(frame==='attack') return `${o.type}_attack${!reduce && Math.floor(time*2.5)%2?'_b':''}`;
  if(frame==='hurt') return ['imp','orb','echo'].includes(o.type) ? `${o.type}_hurt` : o.type;
  if(!reduce && o.moving && ['imp','echo','orb'].includes(o.type)) return `${o.type}_walk_${enemyWalkFrame(o,time)}`;
  if(o.type==='nulo') return reduce?'nulo_a':`nulo_${Math.floor(time/3.5)%2?'b':'a'}`;
  return o.type;
}
// Orientação é apenas visual: perseguição, linha de visão e mira continuam
// usando as posições reais. Sem orientação conhecida, mantenha a vista frontal.
export function enemyView(facing,x,y,viewerX,viewerY) {
  if(![facing,x,y,viewerX,viewerY].every(Number.isFinite)) return {view:'front',flip:false};
  const delta=angleDiff(facing-Math.atan2(viewerY-y,viewerX-x));
  if(Math.abs(delta)<Math.PI/4) return {view:'front',flip:false};
  if(Math.abs(delta)>=3*Math.PI/4) return {view:'back',flip:false};
  // A arte lateral olha para a direita; a outra lateral usa o mesmo quadro espelhado.
  return {view:'side',flip:delta>0};
}
export function bossVisualFrame(boss,time,reduce=false) {
  if(bossOpen(boss)) {
    if((boss.hurt ?? 0)>0) return 'boss_hurt';
    return reduce?'boss_open_a':`boss_open_${Math.floor(time*1.4)%2?'b':'a'}`;
  }
  if(boss.cycle>=2 && boss.cycle<4.2) return bossAttackSpriteFrame(time,reduce);
  if(boss.cycle>=1.2) return !reduce && boss.cycle>=1.6?'boss_warning_b':'boss_warning';
  return 'bossClosed';
}
export function weaponVisualFrame(fire,reduce=false,reload=0,jam=0) {
  if(reduce) return 'idle';
  if(fire>0) return fire>.14?'fire':'return';
  if(jam<=0 && reload>0 && reload<=.3) return 'return';
  if(reload>.3 && reload<1.3 && jam<=0) return 'reload';
  return 'idle';
}
export function muzzleVisualFrame(fire,reduce=false) {
  if(reduce || fire<=.06) return null;
  return fire>.14?'burst':'tail';
}
// O aviso é informativo: não altera os limiares ou as regras de síntese.
export function citadelEchoAlert(echo,flags={}) { return !flags.cidadela_estavel && echo>=75; }
export function bossAttackSpriteFrame(time,reduce=false) { return !reduce && Math.floor(time*2.5)%2?'boss_attack_b':'boss_attack'; }
// Só o aviso da fenda é essencial; nenhum efeito decorativo deve animar
// quando o operador pede movimento reduzido.
export function citadelPulseFrame(type,windup,scan,time,reduce=false) {
  if(type==='breach_open' && windup>0) return 'breach_warning';
  if(reduce) return null;
  const phase=Math.floor(time*.9)%2?'b':'a';
  if(type==='generator'||type==='reactor') return `${type}_pulse`;
  if(type==='echo_terminal_on') return `echo_terminal_pulse_${phase}`;
  if(type==='exit') return `exit_pulse_${phase}`;
  if(type==='memory_echo_pending' && scan>0) return 'memory_pulse';
  return null;
}
function resetAtCheckpoint(state, g) {
  const cp = checkpoints[checkpointIndex(state.progress.flags)];
  g.workshopTrial=null; cancelBreach(g); if(g.training){g.training=false;g.enemies.length=0;}
  respawnPlayer(state.player, cp); g.angle=0; g.shots.length=0; g.impacts.length=0; g.jam=0; g.reload=0; g.ammo=12; g.dash=0; g.shield=0; g.guard=0; g.ultBuff=null; g.vectorCharge=0; g.echoAnchor=0; g.fx=0; g.damage=0; g.hit=0; g.signalTime=0; g.signalCooldown=0; g.signalMonitorId=null; g.weaponDeploy=0; g.walkPhase=0; g.walkBlend=0; g.stepDistance=0; g.moving=false;
  notice(g,'NEXO-04: SINAL RECUPERADO NO ÚLTIMO MARCO. A LINHA DE RETORNO CONTINUA ABERTA.',6);
}
function showEnding(state, g) {
  const progress=state.progress, flags=progress.flags;
  if (g.endingQueued || flags.cidadela_final_visto || typeof document === 'undefined' || !document.body) return;
  g.endingQueued=true; g.panel='pause'; state.world.fpsPaused=true;
  if (document.pointerLockElement) document.exitPointerLock?.();
  void playCutscene(CITADEL_END_SCENES).then(() => {
    // Uma troca de perfil não deve salvar o fim da cena em outro operador.
    if (state.progress!==progress) return;
    flags.cidadela_final_visto=true; saveGame();
  });
}
function move(map, flags, p, dx, dy) {
  if (canMove(map,flags,p.x+dx,p.y)) p.x+=dx;
  if (canMove(map,flags,p.x,p.y+dy)) p.y+=dy;
}
function targetInSight(map, flags, p, g, range=14, cone=.16) {
  const all = [...g.enemies, ...(g.boss.dead ? [] : [g.boss])];
  return all.filter(e => e.hp>0).map(e => ({e,d:Math.hypot(e.x-p.x,e.y-p.y),a:Math.abs(angleDiff(Math.atan2(e.y-p.y,e.x-p.x)-g.angle))}))
    .filter(t => t.d<range && t.a < (t.e.type==='boss' ? .055 + .12/Math.max(1,t.d) : cone + .035/Math.max(1,t.d)) && visible(map,flags,p.x,p.y,t.e.x,t.e.y))
    .sort((a,b)=>a.d-b.d)[0]?.e;
}
export function bossOpen(boss) { return boss.cycle >= 4.2 && boss.cycle < 7.2; }
function addImpact(g,x,y,color='red') {
  if (g.impacts.length >= 16) g.impacts.shift();
  g.impacts.push({x,y,color,life:.3});
}
export function enemyVisualFrame(enemy) {
  if (enemy.hp<=0) return 'death';
  if ((enemy.windup ?? 0)>0 || (enemy.attack ?? 0)>0) return 'attack';
  if ((enemy.hurt ?? 0)>0) return 'hurt';
  return 'idle';
}
function hurtEnemy(g, enemy, damage) {
  if (enemy.type === 'boss' && !bossOpen(enemy)) {
    addImpact(g,enemy.x,enemy.y,'shield'); notice(g,'VIGILANTE: BLINDAGEM FECHADA. AGUARDE O NÚCLEO EXPOSTO.',2); return;
  }
  enemy.hp -= damage; enemy.hurt=.18;
  if (enemy.hp<=0) enemy.death=.7;
  addImpact(g,enemy.x,enemy.y,enemy.type==='echo'?'cyan':'red');
}
function beginReload(g) { g.reload=1.5; playCitadelSound('reload'); }
function fire(map, flags, p, g) {
  if (g.fire>0) return;
  // Uma recarga tática pode ser cancelada para usar os projéteis restantes,
  // inclusive enquanto o Echovore bloqueia o progresso da recarga.
  if (g.reload>0) { if(g.ammo<=0) return; g.reload=0; }
  if (g.ammo<=0) { if(g.jam<=0) { beginReload(g); notice(g,'RECARREGANDO...',1.5); } return; }
  g.ammo--; g.fire=.23; const vectorDamage=g.vectorCharge>0?12:0;g.vectorCharge=0;playCitadelSound('shot');
  if (g.ammo===0) { beginReload(g); notice(g,'RECARREGANDO...',1.5); }
  const target=targetInSight(map,flags,p,g);
  if (target) { if(target.type!=='boss' || bossOpen(target)) g.hit=.25; hurtEnemy(g,target, Math.round((target.type==='boss'?35:28)*(1+(g.ultBuff?.basicDamagePct ?? 0)))+vectorDamage); }
  else {
    // O disparo do jogador é instantâneo, mas deixa uma marca breve na
    // superfície visível, sem atravessar paredes nem criar física extra.
    const dx=Math.cos(g.angle),dy=Math.sin(g.angle), ray=cast(map,flags,p.x,p.y,dx,dy);
    if (ray.dist<14 && ray.dist>.2) addImpact(g,p.x+dx*(ray.dist-.08),p.y+dy*(ray.dist-.08),'metal');
  }
}
function addEcho(g, amount, state) {
  if (state.progress.flags.cidadela_estavel) return;
  g.echo=clamp(g.echo+amount*(g.echoAnchor>0?.7:1),0,100);
  if (g.echo>=100 && g.echoLock<=0) {
    // O predador não nasce através de paredes, nem além do limite de
    // entidades. Se não houver espaço, mantém a carga e tenta novamente.
    let spawned=false;
    if (g.enemies.filter(e=>e.hp>0).length < 9) {
      const p=state.player, map=state.world.currentMap, flags=state.progress.flags;
      for (const [dx,dy] of [[2,0],[-2,0],[0,2],[0,-2]]) {
        const x=p.x+dx,y=p.y+dy;
        if (canMove(map,flags,x,y,.25) && visible(map,flags,p.x,p.y,x,y)) {
          g.enemies.push({type:'echo',x,y,hp:42,cooldown:1.8,slow:0}); spawned=true; break;
        }
      }
    }
    if (!spawned) { g.echoLock=3; return; }
    g.echo=0; g.echoLock=14;
    const counter = { mare_astral:'ATRAÇÃO SÔNICA', nucleo_dez_forma:'SUPRESSÃO DE VELOCIDADE', motor_bio_forja:'RUPTURA DE ESCUDO', lamina_dominio_anciao:'INTERFERÊNCIA DE RUPTURA' }[state.progress.archetype] ?? 'INTERFERÊNCIA';
    notice(g,`ECHOVORE: ${counter} + BLOQUEIO DE RECARGA.`,5);
  }
}
function startDash(g,input,duration) {
  const forward=(held(input,'w','keyw','arrowup')?1:0)-(held(input,'s','keys','arrowdown')?1:0);
  const side=(held(input,'d','keyd')?1:0)-(held(input,'a','keya')?1:0);
  g.dashAngle=g.angle+(forward || side ? Math.atan2(side,forward) : 0);
  g.dash=duration;
}
function ability(map, flags, p, g, progress, input) {
  if (g.q>0) return;
  if ((p.energy ?? 0) < 18) { notice(g,'ENERGIA INSUFICIENTE PARA Q',2); return; }
  p.energy-=18; playCitadelSound('ability');
  const mod=MODULES[progress.archetype] ?? MODULES.motor_bio_forja;
  const rank=g.localProgress?.rank ?? 1;
  g.perkIcon=rank>=2 ? g.localProgress.skills[rank>=4 && mod.mode==='bio'?1:0].icon : null;
  g.q=6; g.fx=.8; g.fxKind='q'; addEcho(g,24,{player:p,progress,world:{currentMap:map}});
  if (mod.mode==='dominio') {
    for (const e of [...g.enemies,...(g.boss.dead?[]:[g.boss])]) {
      const d=Math.hypot(e.x-p.x,e.y-p.y), a=Math.abs(angleDiff(Math.atan2(e.y-p.y,e.x-p.x)-g.angle));
      if (e.hp>0 && d<(rank>=2?3.6:3) && a<(e.type==='boss'?.10:.65) && visible(map,flags,p.x,p.y,e.x,e.y)) hurtEnemy(g,e,rank>=2?70:55);
    }
    notice(g,'RUPTURA • CORTE FRONTAL',1.5);
  } else {
    startDash(g,input,mod.mode==='nucleo'?(rank>=2?.44:.34):.22);
    if (mod.mode==='nucleo' && rank>=2) g.shield=Math.max(g.shield,1);
    if (mod.mode==='mare' && rank>=2) g.shield=Math.max(g.shield,1.2);
    if (mod.mode==='bio') {g.shield=rank>=2?3.5:2.5;if(rank>=4) healPlayer(p,progress,8);}
    if (mod.mode==='mare') for (const e of g.enemies) if (Math.hypot(e.x-p.x,e.y-p.y)<4 && visible(map,flags,p.x,p.y,e.x,e.y)) e.slow=3;
    notice(g,mod.q,1.5);
  }
}
// A sobrecarga conserva nível, custo, recarga e ferramenta selecionada.
// A projeção local usa área ou cone com linha de visão; o núcleo do chefe
// mantém sua regra de vulnerabilidade mesmo contra F.
function ultimate(map, flags, p, g, progress, input) {
  const active=getActiveUltimate(progress);
  if (!active || !getUnlockState(progress).features.ultimate) { notice(g,'ULTIMATE LIBERADA NO NÍVEL 3',3); return; }
  p.ultimate ??= {};
  if ((p.ultimate.cooldown ?? 0)>0) { notice(g,'ULTIMATE EM RECARGA',2); return; }
  const def=active.definition;
  if ((p.energy ?? 0)<def.cost) { notice(g,'ENERGIA INSUFICIENTE PARA ULTIMATE',2); return; }
  p.energy-=def.cost; playCitadelSound('ultimate'); g.fx=1; g.fxKind='ultimate'; p.ultimate.cooldown=def.cooldown; p.ultimate.casts=(p.ultimate.casts ?? 0)+1;
  healPlayer(p,progress,p.maxHealth*(def.healPct ?? 0));
  // A geometria e o bônus da ferramenta escolhida também são respeitados
  // nesta perspectiva. O buff é local e não atravessa a saída da dimensão.
  const kind=def.kind ?? 'burst', directional=kind==='line' || kind==='dash';
  if(def.buff?.duration>0) g.ultBuff={...def.buff,timeLeft:def.buff.duration};
  if(kind==='guard') g.guard=Math.max(g.guard,def.guard ?? 0);
  if(kind==='dash') startDash(g,input,.3);
  for(const e of [...g.enemies,...(g.boss.dead?[]:[g.boss])]) {
    const d=Math.hypot(e.x-p.x,e.y-p.y), angle=Math.abs(angleDiff(Math.atan2(e.y-p.y,e.x-p.x)-g.angle));
    const inArc=!directional || Math.cos(angle)>=(def.arc ?? .25);
    if(e.hp>0 && d<(def.radius ?? def.range ?? 5) && inArc && (e.type!=='boss' || angle<.10) && visible(map,flags,p.x,p.y,e.x,e.y)) hurtEnemy(g,e,def.damage ?? 30);
  }
  if(progress.archetype==='motor_bio_forja') g.shield=Math.max(g.shield,4);
  if(progress.archetype==='mare_astral') for(const e of g.enemies) if(Math.hypot(e.x-p.x,e.y-p.y)<(def.radius ?? def.range ?? 5) && visible(map,flags,p.x,p.y,e.x,e.y)) e.slow=Math.max(e.slow,3);
  if(progress.archetype==='nucleo_dez_forma' && kind!=='guard') startDash(g,input,.35);
  addEcho(g,32,{player:p,progress,world:{currentMap:map}});
  notice(g,`SOBRECARGA • ${def.name}`,3);
}
function spawnShot(g, from, p, speed, damage, jam=false, counter=null) {
  const a=Math.atan2(p.y-from.y,p.x-from.x);
  playCitadelSound(jam?'echo':'enemy');
  g.shots.push({x:from.x,y:from.y,dx:Math.cos(a)*speed,dy:Math.sin(a)*speed,damage,jam,counter,kind:from.type,breach:from.breach ?? null,life:5});
}
export function updateCitadel(dt, state, input) {
  const map=state.world.currentMap, p=state.player, progress=state.progress, flags=progress.flags ??= {};
  if (!game || game.map !== map || game.progress !== progress) {
    game=createCitadelRuntime(progress); game.map=map; game.progress=progress;
    // Migra marcos de saves anteriores sem refazer missões ou pagar XP.
    const migrated=syncDimensionProgress(progress);game.localProgress=migrated.after;game.localArchetype=progress.archetype;
    if(migrated.changed) saveGame();
    Object.assign(p,checkpoints[checkpointIndex(flags)]); p.target=null; p.moving=false;
    ensureHealth(p,progress);
    if (p.health<=0) resetAtCheckpoint(state,game);
    if (flags.cidadela_estavel) showEnding(state,game);
  }
  const g=game, step=clamp(dt,0,.033);
  if(g.localArchetype!==progress.archetype) {
    const migrated=syncDimensionProgress(progress);g.localProgress=migrated.after;g.localArchetype=progress.archetype;g.vectorCharge=0;g.weaponDeploy=.45;
    if(migrated.changed) saveGame();
  }
  if (pressed(input,'m','keym')) {
    const on=toggleCitadelAudio();
    notice(g,on?'EFEITOS SONOROS LIGADOS':'EFEITOS SONOROS DESLIGADOS OU INDISPONÍVEIS',2.5);
  }
  const pauseRequested=!!state.world.fpsPauseRequested;
  if (pauseRequested) { g.panel='pause'; state.world.fpsPauseRequested=false; }
  // Um Escape pode tanto soltar o mouse quanto chegar como tecla no mesmo
  // quadro. Não trate os dois eventos como pausa seguida de retomada.
  if (!pauseRequested && pressed(input,'p','keyp','escape')) g.panel=g.panel ? null : 'pause';
  if (!pauseRequested && pressed(input,'l','keyl')) g.panel=g.panel==='journal' ? null : 'journal';
  if (!pauseRequested && pressed(input,'j','keyj')) g.panel=g.panel==='missions' ? null : 'missions';
  if (!pauseRequested && pressed(input,'k','keyk')) g.panel=g.panel==='dimension' ? null : 'dimension';
  state.world.fpsPaused=!!g.panel;
  if (g.panel) {
    input.fpsFire=false; input.fpsFireHeld=false; input.attackClick=null; input.click=null; input.mouseDeltaX=0;
    if (typeof document !== 'undefined' && document.pointerLockElement) document.exitPointerLock?.();
    return;
  }
  g.time+=step;
  for (const k of ['fire','jam','q','boost','scan','dash','shield','guard','echoLock','messageTime','damage','hit','fx','suppressed','vectorCharge','echoAnchor','echoTerminalCooldown','workshopHit','signalTime','signalCooldown','weaponDeploy']) g[k]=Math.max(0,g[k]-step);
  if(g.messageTime===0 && g.radioQueue.length) notice(g,g.radioQueue.shift(),6);
  for (const impact of g.impacts) impact.life-=step;
  g.impacts=g.impacts.filter(impact=>impact.life>0);
  const wasReloading=g.reload>0;
  if (g.jam<=0) g.reload=Math.max(0,g.reload-step);
  if (wasReloading && g.reload===0) {g.ammo=12;if(p.health>0 && !g.returning && !state.world.isLoading) playCitadelSound('ready');}
  const buff=g.ultBuff, buffStep=buff?Math.min(step,buff.timeLeft):0;
  if(buff) {
    if(buff.healPerSecond>0 && p.health>0) healPlayer(p,progress,buff.healPerSecond*buffStep);
    buff.timeLeft=Math.max(0,buff.timeLeft-step);
    if(!buff.timeLeft) g.ultBuff=null;
  }
  p.energy=Math.min(p.maxEnergy ?? 100,(p.energy ?? 100)+5*step+(buff?.energyRegen ?? 0)*buffStep);
  if (p.ultimate?.cooldown>0) p.ultimate.cooldown=Math.max(0,p.ultimate.cooldown-step);
  const h=updateHealth(p,progress,step,{onRespawn:()=>checkpoints[checkpointIndex(flags)]});
  if (h?.respawned) { resetAtCheckpoint(state,g); }
  if (p.health<=0 || g.returning || state.world.isLoading) return;
  const turn=(held(input,'arrowright')?1:0)-(held(input,'arrowleft')?1:0);
  g.angle+=turn*2.3*step+(input.mouseDeltaX||0)*.0025; input.mouseDeltaX=0;
  const forward=(held(input,'w','keyw','arrowup')?1:0)-(held(input,'s','keys','arrowdown')?1:0);
  const side=(held(input,'d','keyd')?1:0)-(held(input,'a','keya')?1:0);
  const norm=Math.hypot(forward,side)||1;
  const speed=(g.dash>0?6.5:2.8)*(1+(g.ultBuff?.moveSpeedPct ?? 0))*(g.suppressed>0?.65:1)*step;
  const f=forward/norm, s=side/norm;
  const dx=g.dash>0?Math.cos(g.dashAngle):Math.cos(g.angle)*f-Math.sin(g.angle)*s;
  const dy=g.dash>0?Math.sin(g.dashAngle):Math.sin(g.angle)*f+Math.cos(g.angle)*s;
  const beforeX=p.x,beforeY=p.y;
  move(map,flags,p,dx*speed,dy*speed);
  const moved=Math.hypot(p.x-beforeX,p.y-beforeY);
  g.moving=moved>.0001;
  // Movimento visual acompanha deslocamento real, não o tempo de tecla;
  // a arma assenta suavemente ao parar ou encostar numa parede.
  if(g.moving) {
    g.walkPhase=(g.walkPhase+moved*(Math.PI*2/1.8))%(Math.PI*2);
    g.stepDistance+=moved;if(g.stepDistance>=.9){g.stepDistance%=.9;playCitadelSound('step');}
  }
  g.walkBlend=clamp(g.walkBlend+(g.moving?1:-1)*step*7,0,1);
  // O pulso tem um segundo de aviso e respeita cobertura, invulnerabilidade,
  // guarda e escudo; não empurra nem bloqueia nenhuma saída.
  if(flags.cidadela_estavel && g.workshopHit<=0 && g.guard<=0) for(const control of CITADEL_WORKSHOP.switches) {
    const e=control.emitter;
    if(workshopCircuitActive(progress,g,control) && workshopPhase(g.time,control.offset)==='active' && Math.hypot(p.x-e.x,p.y-e.y)<1.4 && visible(map,flags,p.x,p.y,e.x,e.y)) {
      const hit=damagePlayer(p,progress,g.shield>0?4:10,'pulso_oficina');
      if(hit.dealt) {g.workshopHit=1.2;g.damage=.35;playCitadelSound('damage');notice(g,'PULSO DA OFICINA • AFASTE-SE E AGUARDE A JANELA SEGURA.',3);}
      break;
    }
  }
  if(p.health<=0) return;
  if (pressed(input,'q','keyq')) ability(map,flags,p,g,progress,input);
  if (pressed(input,'f','keyf')) ultimate(map,flags,p,g,progress,input);
  if (pressed(input,'r','keyr') && g.scan<=0) {
    const rank=g.localProgress?.rank ?? 1;
    g.scan=4; g.fx=.55; g.fxKind='scan';
    addEcho(g,progress.archetype==='mare_astral' && rank>=4?12:18,state);
    const id=progress.archetype;
    g.perkIcon=rank>=4 && id!=='motor_bio_forja' ? g.localProgress.skills[1].icon : null;
    if (id==='mare_astral') for(const e of g.enemies) if(Math.hypot(e.x-p.x,e.y-p.y)<4 && visible(map,flags,p.x,p.y,e.x,e.y)) e.slow=Math.max(e.slow,rank>=4?3.5:2);
    if (id==='nucleo_dez_forma') {g.suppressed=0;if(rank>=4) g.vectorCharge=5;}
    if (id==='motor_bio_forja') g.shield=Math.max(g.shield,1.2);
    if (id==='lamina_dominio_anciao') {g.shield=Math.max(g.shield,1.8);if(rank>=4) g.guard=Math.max(g.guard,.8);}
    const label={mare_astral:'SONAR DE CORRENTE',nucleo_dez_forma:'LEITURA DE VETORES',motor_bio_forja:'DIAGNÓSTICO VIVO',lamina_dominio_anciao:'POSTURA DE DOMÍNIO'}[id] ?? 'RADAR';
    notice(g,`${label} • MAPA: AMEAÇAS, REGISTROS E ECOS (CÍRCULO).`,4);
  }
  if (pressed(input,'shift','shiftleft','shiftright') && g.boost<=0 && g.dash<=0) { startDash(g,input,.18); g.boost=(g.localProgress?.rank ?? 1)>=3?2.4:3; g.fx=.4; g.fxKind='dash'; addEcho(g,15,state); }
  if (pressed(input,'t','keyt') && g.reload<=0 && g.jam<=0 && g.ammo<12) { beginReload(g); }
  if (held(input,' ','space') || pressed(input,' ','space') || input.fpsFire || input.fpsFireHeld || input.attackClick) fire(map,flags,p,g);
  input.fpsFire=false; input.attackClick=null; input.click=null;
  if (pressed(input,'e','keye')) {
    const target=nearestInteraction(map,flags,p);
    if (target?.kind==='exit') {
      g.returning=true; input.fpsFireHeld=false;
      void usePortal({id:'retorno_cidadela',label:'ESTAÇÃO 66.6',destino:{mapId:'estacao_limiar_666',spawnId:'vindo_da_cidadela'}}).then(ok=>{ if(!ok) g.returning=false; });
      return;
    }
    if (target?.kind==='key') {
      flags[target.flag]=true; playCitadelSound('pickup'); saveCitadelProgress(progress,g); notice(g,`${target.symbol} ${target.label}: ${target.log} ECLUSA ABERTA.`,7);
      const index=KEYS.findIndex(k=>k.id===target.id);
      queueRadio(g,(ARCHETYPE_READINGS[progress.archetype] ?? ARCHETYPE_READINGS.motor_bio_forja)[index]);
    } else if (target?.kind==='archive') {
      const fresh=!flags[target.flag]; flags[target.flag]=true;
      if(fresh) playCitadelSound('pickup');
      const complete=CITADEL_ARCHIVES.every(a=>flags[a.flag]);
      const grant=complete && !flags.cidadela_arquivo_recompensa;
      if (grant) {
        flags.cidadela_arquivo_recompensa=true;
        const reward=grantArchetypeXp(progress,30);
        notice(g,`ARQUIVO COMPLETO • +${reward.gained} XP. CONSULTE L.`,7);
      } else notice(g,`${target.label}: ${target.log}`,7);
      if (fresh || grant) saveCitadelProgress(progress,g);
    } else if (target?.kind==='crt') {
      const result=inspectCitadelMonitor(progress,target);
      if(result.changed){playCitadelSound('pickup');saveCitadelProgress(progress,g);}
      notice(g,result.message,7);
      // A leitura continua opcional e sem confirmar a origem do sinal. O efeito
      // local tem intervalo para não piscar repetidamente ao apertar E.
      if(g.signalCooldown<=0) {g.signalMonitorId=target.id;g.signalTime=1.5;g.signalCooldown=6;}
      const fragment=crtSignalFragment(target.id);
      queueRadio(g,[result.followup,fragment].filter(Boolean).join(' '));
    } else if (target?.kind==='reactor') {
      notice(g,'REATOR ESTÁVEL • A ROTA DE RETORNO CONTINUA ABERTA.',5);
    } else if (target?.kind==='workshop_trial') {
      const result=toggleWorkshopTrial(progress,g);notice(g,result.message,7);
    } else if (target?.kind==='workshop_switch' || target?.kind==='workshop_terminal') {
      const result=target.kind==='workshop_switch' && g.workshopTrial ? interactWorkshopTrial(g,target,g.time) : interactWorkshop(progress,target,g.time);
      if(result?.changed){playCitadelSound('pickup');saveCitadelProgress(progress,g);}
      if(result){notice(g,result.message,7);queueRadio(g,result.followup);}
    } else if (target?.kind==='memory_echo') {
      const result=interactMemoryEcho(progress,target,g.scan>0);
      if(result.changed) {
        g.echoAnchor=12;p.energy=Math.min(p.maxEnergy ?? 100,(p.energy ?? 0)+8);
        playCitadelSound('pickup');saveCitadelProgress(progress,g);
      }
      notice(g,result.message,7);
      if(result.changed) queueRadio(g,'NEXO: SINAL ANCORADO 12s • ATÉ +8 ENERGIA E 30% MENOS ECO GERADO.');
      queueRadio(g,result.followup);queueRadio(g,result.reading);
    } else if (target?.kind==='echo_terminal') {
      const result=useEchoTerminal(progress,g,p);notice(g,result.message,6);
    } else if (target?.kind==='breach') {
      const result=g.workshopTrial?{message:'ENCERRE O ENSAIO DA OFICINA ANTES DA FENDA.'}:beginBreach(g,progress,target);
      if(result.changed) saveCitadelProgress(progress,g); notice(g,result.message,6);
    } else if (target?.kind==='breach_cache') {
      const result=openBreachCache(progress,target);
      if(result.changed) {playCitadelSound('pickup');saveCitadelProgress(progress,g);} notice(g,result.message,7);
    } else if (target?.kind==='breach_console') {
      const summary=breachSummary(progress);
      notice(g,`FENDAS SELADAS ${summary.sealed}/3 • COFRES ${summary.caches}/3. RADAR [R]; FENDA [E].`,7);
    } else if (target?.kind==='training') {
      if(g.workshopTrial) {notice(g,'ENCERRE O ENSAIO DA OFICINA ANTES DA SIMULAÇÃO.',5);}
      else if(g.breach) {notice(g,'CANCELE OU CONCLUA A FENDA ANTES DA SIMULAÇÃO.',5);}
      else if(g.training) {
        g.training=false;g.enemies.length=0;g.shots.length=0;notice(g,'SIMULAÇÃO ENCERRADA. A CIDADELA CONTINUA ESTÁVEL.',5);
      } else {
        g.training=true;
        g.enemies=[{type:'imp',x:28.5,y:6.5,hp:55,cooldown:2,slow:0},
          {type:'orb',x:27.5,y:5.5,hp:75,cooldown:2.5,slow:0},
          {type:'imp',x:26.5,y:7.5,hp:55,cooldown:3,slow:0}];
        notice(g,'SIMULAÇÃO OPCIONAL: 3 ECOS. USE [E] NO NÚCLEO PARA ENCERRAR.',6);
      }
    } else if(target) {
      const result=interactCitadelMission(progress,target);
      if(result) {if(result.changed){playCitadelSound('pickup');saveCitadelProgress(progress,g);} notice(g,result.message,7);}
    }
  }
  // Suprimentos de sessão: não são inventário e não alteram saves antigos.
  for (const supply of g.supplies) {
    if (!supply.used && p.health<p.maxHealth && Math.hypot(p.x-supply.x,p.y-supply.y)<.65 && visible(map,flags,p.x,p.y,supply.x,supply.y)) {
      const healed=healPlayer(p,progress,p.maxHealth*.3);
      if (healed>0) { supply.used=true; playCitadelSound('pickup'); notice(g,`SUPRIMENTO • +${Math.round(healed)} VIDA`,2.5); }
    }
  }
  if (g.echoLock<=0) {
    if (g.echo>=100) addEcho(g,0,state);
    else g.echo=Math.max(0,g.echo-step*.7);
  }
  for (const e of g.enemies) {
    if (e.hp<=0) { e.death=Math.max(0,(e.death ?? 0)-step); continue; }
    e.hurt=Math.max(0,(e.hurt ?? 0)-step); e.attack=Math.max(0,(e.attack ?? 0)-step); e.moving=false;
    e.cooldown-=step; e.slow=Math.max(0,e.slow-step);
    const d=Math.hypot(e.x-p.x,e.y-p.y), sees=d<8 && visible(map,flags,e.x,e.y,p.x,p.y);
    if(sees) {
      const targetAngle=Math.atan2(p.y-e.y,p.x-e.x);
      e.facing=Number.isFinite(e.facing) ? angleDiff(e.facing+clamp(angleDiff(targetAngle-e.facing),-2.6*step,2.6*step)) : targetAngle;
    }
    // O ataque sempre tem preparação visível; ao perder a linha de visão o
    // disparo é cancelado, sem projétil que atravesse uma parede.
    if ((e.windup ?? 0)>0) {
      e.windup=Math.max(0,e.windup-step);
      if(e.windup===0) {
        if(sees) {
          const counter=e.type==='echo'?progress.archetype:null;
          spawnShot(g,e,p,counter==='nucleo_dez_forma'?3.8:e.type==='orb'?3.4:2.7,e.type==='orb'?12:8,e.type==='echo',counter); e.attack=.22;
        }
        e.cooldown=e.type==='echo'?2.4:3;
      }
    } else if (sees && e.cooldown<=0) e.windup=.75;
    else if (sees && d>2.4) {
      const x=e.x,y=e.y; move(map,flags,e,(p.x-e.x)/d*step*(e.slow?.35:.8),(p.y-e.y)/d*step*(e.slow?.35:.8));
      const moved=Math.hypot(e.x-x,e.y-y); e.moving=moved>0;
      if(e.moving) e.walkPhase=((e.walkPhase ?? 0)+moved*3)%2;
    }
  }
  g.enemies=g.enemies.filter(e=>e.hp>0 || e.death>0);
  if(g.training && !g.enemies.some(e=>e.hp>0)) {
    g.training=false;
    const first=!flags.cidadela_treino_concluido;flags.cidadela_treino_concluido=true;
    if(first) saveCitadelProgress(progress,g);
    notice(g,first?'SIMULAÇÃO CONCLUÍDA • MARCO LOCAL REGISTRADO.':'SIMULAÇÃO CONCLUÍDA • REPETÍVEL, SEM NOVO MARCO.',5);
  }
  const breachResult=updateBreach(g,progress,step,p,
    (x,y)=>canMove(map,flags,x,y,.25),
    b=>Math.hypot(b.x-p.x,b.y-p.y)>=1.4 && Math.hypot(b.x-p.x,b.y-p.y)<7 && visible(map,flags,b.x,b.y,p.x,p.y),
    b=>spawnShot(g,{type:'breach_shot',x:b.x,y:b.y,breach:b.id},p,3,10));
  if(breachResult) {if(breachResult.changed){playCitadelSound('victory');saveCitadelProgress(progress,g);}notice(g,breachResult.message,6);}
  const boss=g.boss;
  if(!boss.dead) boss.hurt=Math.max(0,(boss.hurt ?? 0)-step);
  if (!boss.dead && boss.hp>0 && flags.cidadela_chave_vermelha && p.x>22.7) {
    boss.cycle=(boss.cycle+step)%7.2; boss.cooldown-=step;
    if (boss.cycle>=2 && boss.cycle<4.2 && boss.cooldown<=0 && visible(map,flags,boss.x,boss.y,p.x,p.y)) { spawnShot(g,boss,p,3.7,13); boss.cooldown=.65; }
  }
  // Vitória é resolvida mesmo se o golpe final vier de fora da arena;
  // o último disparo não deve obrigar o jogador a atravessar a eclusa novamente.
  if (!boss.dead && boss.hp<=0) {
    boss.dead=true; playCitadelSound('victory'); flags.cidadela_estavel=true; g.shots.length=0; g.enemies.length=0;
    if (progress.activeQuest?.id==='embarque_dimensional' && progress.activeQuest.status !== 'completed') {
      progress.activeQuest.stage='cidadela_estavel'; progress.activeQuest.status='completed'; progress.activeQuest.description='Reator estabilizado. Volte à Estação 66.6 ou explore a Cidadela.';
      progress.completedQuests ??= []; if (!progress.completedQuests.includes('embarque_dimensional')) progress.completedQuests.push('embarque_dimensional');
    }
    if (!flags.cidadela_recompensa) { flags.cidadela_recompensa=true; grantArchetypeXp(progress,100); }
    saveCitadelProgress(progress,g); notice(g,'NEXO-04: O REATOR RESPIRA. A ROTA SOBREVIVEU; AINDA HÁ ALGUÉM PARA RESPONDER.',10);
    queueRadio(g,'NEXO: AS COMPORTAS DA OFICINA AO SUL ABRIRAM. NÃO HÁ PRESSA PARA PARTIR.');
    showEnding(state,g);
  }
  for (const shot of g.shots) {
    const oldX=shot.x,oldY=shot.y;
    shot.x+=shot.dx*step; shot.y+=shot.dy*step; shot.life-=step;
    if (wallAt(map,flags,shot.x,shot.y)) { shot.life=0; addImpact(g,oldX,oldY,'metal'); }
    else if (Math.hypot(shot.x-p.x,shot.y-p.y)<.33) {
      const hit=g.guard>0 ? {dealt:0} : damagePlayer(p,progress,g.shield>0?shot.damage*.4:shot.damage,'cidadela');
      if (hit.dealt) {
        g.damage=.35; playCitadelSound('damage');
        if(shot.jam) {
          g.jam=2.5;
          if(shot.counter==='mare_astral') { const length=Math.hypot(shot.dx,shot.dy)||1; move(map,flags,p,-shot.dx/length*.55,-shot.dy/length*.55); }
          if(shot.counter==='nucleo_dez_forma') { g.dash=0; g.suppressed=2; }
          if(shot.counter==='motor_bio_forja') g.shield=0;
          if(shot.counter==='lamina_dominio_anciao') g.q=Math.max(g.q,2);
          notice(g,'ECHOVORE • RECARGA BLOQUEADA POR 2,5s',3);
        }
      }
      addImpact(g,oldX,oldY,shot.jam?'cyan':'red'); shot.life=0;
    }
  }
  g.shots=g.shots.filter(s=>s.life>0);
}

// Framebuffer fixo: custo independente do tamanho da janela e sem alocação de
// texturas por quadro. As silhuetas são arte procedural original da dimensão.
let buffer, worldCtx, uiBuffer, uiCtx, ctx, sprites;
const W=480, H=270, FOV=Math.PI/3, zbuffer=new Float32Array(W);
let motionPreference;
function reducedMotion() {
  if (motionPreference === undefined) motionPreference=typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  return !!motionPreference?.matches;
}
function makeSprite(type) {
  const c=document.createElement('canvas'); c.width=96; c.height=128;
  const x=c.getContext('2d'); x.imageSmoothingEnabled=false;
  if (type==='imp' || type==='echo') {
    const glow=type==='echo'?'#79e5ef':'#f2434e';
    x.fillStyle='#101b23'; x.fillRect(28,22,39,42); x.fillRect(23,58,50,39); x.fillRect(17,63,12,41); x.fillRect(67,62,12,41); x.fillRect(27,93,15,30); x.fillRect(54,93,15,30);
    x.fillStyle='#43505a'; x.fillRect(32,20,31,10); x.fillRect(29,52,37,10); x.fillRect(22,69,8,22); x.fillRect(65,69,8,22);
    x.fillStyle=glow; x.fillRect(33,35,10,5); x.fillRect(52,35,10,5); x.fillRect(42,70,14,12); x.fillRect(14,90,13,4); x.fillRect(68,86,14,4);
    x.fillStyle='#17272d'; x.fillRect(38,44,20,5); x.fillRect(35,101,7,21); x.fillRect(54,101,7,21);
  } else if (type==='orb') {
    x.fillStyle='#182831'; x.beginPath(); x.arc(48,59,34,0,Math.PI*2); x.fill();
    x.fillStyle='#536873'; x.fillRect(23,35,50,8); x.fillRect(16,54,64,10); x.fillRect(25,82,45,8);
    x.fillStyle='#0a1218'; x.beginPath(); x.arc(48,59,19,0,Math.PI*2); x.fill(); x.fillStyle='#f34b55'; x.beginPath(); x.arc(48,59,11,0,Math.PI*2); x.fill(); x.fillStyle='#ffc6a2'; x.fillRect(45,52,5,8);
    x.fillStyle='#8aa3a0'; x.fillRect(10,53,7,12); x.fillRect(79,53,7,12); x.fillRect(37,24,22,5);
  } else if (type==='boss') {
    x.fillStyle='#32312e'; x.fillRect(9,16,78,76); x.fillRect(0,28,17,74); x.fillRect(79,28,17,74); x.fillRect(16,88,25,33); x.fillRect(55,88,25,33);
    x.fillStyle='#79574a'; x.fillRect(15,18,66,9); x.fillRect(5,34,8,52); x.fillRect(83,34,8,52); x.fillRect(22,95,15,6); x.fillRect(59,95,15,6);
    x.fillStyle='#11191e'; x.fillRect(26,35,44,43); x.fillStyle='#83e9e5'; x.fillRect(35,44,26,25); x.fillStyle='#dbffff'; x.fillRect(42,48,12,17);
    x.fillStyle='#fc5353'; x.fillRect(17,30,8,5); x.fillRect(71,30,8,5);
  } else if (type==='shot' || type==='shot_echo' || type==='shot_orb' || type==='breach_shot') {
    x.fillStyle=type==='shot_echo'?'#68e9e3':type==='shot_orb'?'#cb8fff':'#ff5e55'; x.fillRect(35,49,26,26); x.fillStyle='#fff4dc'; x.fillRect(42,55,12,14);
  } else if (type==='key') {
    x.fillStyle='#1f3039'; x.fillRect(25,60,46,53); x.fillStyle='#637780'; x.fillRect(29,57,38,8); x.fillStyle='#aefeff'; x.fillRect(32,70,32,25); x.fillStyle='#10272a'; x.fillRect(38,75,20,15); x.fillStyle='#dcffff'; x.fillRect(45,78,6,9);
  } else if (type==='nulo') {
    x.fillStyle='#29444a'; x.fillRect(4,18,88,94); x.fillStyle='#091217'; x.fillRect(10,24,76,80);
    x.strokeStyle='#3c9ba4'; x.lineWidth=2; x.beginPath(); x.moveTo(48,39); x.lineTo(35,61); x.lineTo(27,88); x.moveTo(48,39); x.lineTo(60,62); x.lineTo(70,91); x.moveTo(35,61); x.lineTo(58,62); x.lineTo(53,90); x.moveTo(35,61); x.lineTo(40,90); x.stroke();
    x.fillStyle='#000'; x.fillRect(39,28,18,16); x.strokeStyle='#4ab3b2'; x.strokeRect(39,28,18,16); x.fillStyle='#97ffff'; x.fillRect(17,99,62,2);
  } else if (['generator','crate','barrel','drone','column','reactor','terminal','antenna','vent','beacon','probe','relay_off','relay_on','transmitter','recording','training','listening_beacon','signal_fragment','breach_open','breach_sealed','cache_closed','cache_open','breach_console','memory_echo_pending','memory_echo_done','echo_terminal_off','echo_terminal_on','anchor_sleep','anchor_active','lost_recorder','signal_map','emergency_light','memory_relay','workshop_switch_off','workshop_switch_on','workshop_hazard_idle','workshop_hazard_active','workshop_terminal','workshop_core_off','workshop_core_on','workshop_pipes','workshop_bench','workshop_robot'].includes(type)) {
    // Silhueta alternativa para partidas offline ou imagens indisponíveis.
    x.fillStyle='#1b3035';x.fillRect(20,34,56,80);x.fillStyle='#557479';x.fillRect(24,38,48,72);
    x.fillStyle='#101b20';x.fillRect(29,45,38,45);x.fillStyle=type==='beacon'?'#ed5d58':'#68dedc';x.fillRect(38,57,20,12);
  } else if (type==='impact_red' || type==='impact_cyan') {
    x.fillStyle=type==='impact_red'?'#ff6057':'#6be7ea';
    x.fillRect(43,34,10,52);x.fillRect(22,55,52,10);x.fillRect(31,44,34,31);
    x.fillStyle='#fff6d6';x.fillRect(40,52,16,16);
  } else if (type==='supply') {
    x.fillStyle='#1a3135';x.fillRect(22,50,52,45);x.fillStyle='#65c4b3';x.fillRect(25,53,46,39);
    x.fillStyle='#dffcf1';x.fillRect(43,59,10,27);x.fillRect(34,68,28,9);x.fillStyle='#243f43';x.fillRect(22,88,52,7);
  } else if (type==='exit') {
    x.fillStyle='#182e34'; x.fillRect(20,8,56,112); x.strokeStyle='#5de5e3'; x.lineWidth=5; x.strokeRect(23,12,50,104); x.fillStyle='#27565b'; x.fillRect(31,24,34,81); x.fillStyle='#bffff3'; x.fillRect(36,58,25,3);
  }
  return c;
}
function setupBuffer() {
  if (buffer) return;
  buffer=document.createElement('canvas'); buffer.width=W; buffer.height=H; worldCtx=buffer.getContext('2d'); ctx=worldCtx;
  // Mundo em baixa resolução, letras desenhadas separadamente em 2x.
  uiBuffer=document.createElement('canvas'); uiBuffer.width=W*2; uiBuffer.height=H*2; uiCtx=uiBuffer.getContext('2d');
  sprites=Object.fromEntries(['imp','echo','orb','boss','shot','shot_echo','shot_orb','key','nulo','exit','supply','impact_red','impact_cyan','generator','crate','barrel','drone','column','reactor','terminal','antenna','vent','beacon','probe','relay_off','relay_on','transmitter','recording','training','listening_beacon','signal_fragment','breach_open','breach_sealed','cache_closed','cache_open','breach_console','breach_shot','memory_echo_pending','memory_echo_done','echo_terminal_off','echo_terminal_on','anchor_sleep','anchor_active','lost_recorder','signal_map','emergency_light','memory_relay','workshop_switch_off','workshop_switch_on','workshop_hazard_idle','workshop_hazard_active','workshop_terminal','workshop_core_off','workshop_core_on','workshop_pipes','workshop_bench','workshop_robot'].map(k=>[k,makeSprite(k)]));
  // Fallbacks também cobrem impactos antes do carregamento ou sem imagens.
  sprites.impact_metal=sprites.impact_red; sprites.impact_shield=sprites.impact_cyan;
  // Carregamento tardio: outras dimensões não pagam pelas artes da Cidadela.
  if (typeof Image !== 'undefined') for (const [type,path] of [
    ['imp','assets/sprites/cidadela-404/imp-glitch.png'],
    ['orb','assets/sprites/cidadela-404/cyber-orbe.png'],
    ['boss','assets/sprites/cidadela-404/vigilante.png'],
    ['imp_attack','assets/sprites/cidadela-404/imp-ataque.png'],
    ['orb_attack','assets/sprites/cidadela-404/orbe-ataque.png'],
    ['echo_attack','assets/sprites/cidadela-404/echovore-ataque.png'],
    ['boss_attack','assets/sprites/cidadela-404/vigilante-ataque.png'],
    ['shot','assets/sprites/cidadela-404/projetil-estatica.png'],
    ['shot_echo','assets/sprites/cidadela-404/projetil-echo.png'],
    ['shot_orb','assets/sprites/cidadela-404/projetil-orbe.png'],
    ...['mare','nucleo','dominio','bio'].flatMap(mode=>[
      [`muzzle_${mode}`,`assets/sprites/cidadela-404/disparo-${mode}.png`],
      [`seal_${mode}`,`assets/sprites/cidadela-404/selo-${mode}.png`],
    ]),
    ['echo','assets/sprites/cidadela-404/predador-echovore.png'],
    ['key','assets/sprites/cidadela-404/terminal-memoria.png'],
    ['exit','assets/sprites/cidadela-404/portal-retorno.png'],
    ['nulo','assets/sprites/cidadela-404/monitor-nulo.png'],
    ['weapon_mare','assets/sprites/cidadela-404/canhao-mare.png'],
    ['weapon_nucleo','assets/sprites/cidadela-404/canhao-nucleo.png'],
    ['weapon_dominio','assets/sprites/cidadela-404/canhao-dominio.png'],
    ['weapon_bio','assets/sprites/cidadela-404/canhao-bio.png'],
    ['weapon_mare_fire','assets/sprites/cidadela-404/canhao-mare-recuo.png'],
    ['weapon_nucleo_fire','assets/sprites/cidadela-404/canhao-nucleo-recuo.png'],
    ['weapon_dominio_fire','assets/sprites/cidadela-404/canhao-dominio-recuo.png'],
    ['weapon_bio_fire','assets/sprites/cidadela-404/canhao-bio-recuo.png'],
    ...[['generator','gerador'],['crate','caixa'],['barrel','barril'],['drone','drone'],['column','coluna'],
      ['reactor','reator'],['terminal','terminal'],['antenna','antena'],['vent','ventilacao'],['beacon','sinalizador']]
      .map(([type,name])=>[type,`assets/sprites/cidadela-404/prop-${name}.png`]),
    ...[['probe','nexo-sonda'],['relay_off','rele-emergencia'],['relay_on','rele-ativo'],
      ['transmitter','painel-transmissao'],['recording','registro-sobrevivente'],['training','nucleo-estavel'],
      ['listening_beacon','baliza-escuta'],['signal_fragment','fragmento-sinal']]
      .map(([type,name])=>[type,`assets/sprites/cidadela-404/${name}.png`]),
    ...[['breach_open','fenda-instavel'],['breach_sealed','fenda-selada'],['cache_closed','cofre-fechado'],['cache_open','cofre-aberto'],
      ['breach_console','terminal-estabilizacao'],['imp_death','imp-colapso'],['orb_death','orbe-colapso'],['echo_death','echovore-colapso'],
      ['impact_red','impacto-disparo'],['breach_shot','onda-fenda']].map(([type,name])=>[type,`assets/sprites/cidadela-404/${name}.png`]),
    ...[['imp_walk_a','imp-passo-a'],['imp_walk_b','imp-passo-b'],
      ['echo_walk_a','echovore-passo-a'],['echo_walk_b','echovore-passo-b'],
      ['orb_walk_a','orbe-movimento-a'],['orb_walk_b','orbe-movimento-b'],
      ['nulo_a','nulo-transmissao-a'],['nulo_b','nulo-transmissao-b'],
      ['reactor_pulse','reator-pulso'],['generator_pulse','gerador-pulso']]
      .map(([type,name])=>[type,`assets/sprites/cidadela-404/${name}.png`]),
    ...['mare-corrente','mare-sonar','nucleo-vetor','nucleo-carga','dominio-corte','dominio-guarda','bio-blindagem','bio-reparo','emblema','nexo']
      .map(name=>[`perk_${name}`,`assets/sprites/cidadela-404/progressao-${name}.png`]),
    ...[['memory_echo_pending','eco-ressonante'],['memory_echo_done','eco-liberado'],
      ['anchor_sleep','ancora-silencio'],['anchor_active','ancora-ativa'],['lost_recorder','gravador-perdido'],
      ['signal_map','mapa-sinal'],['echo_terminal_off','terminal-ecos'],['echo_terminal_on','terminal-ecos-ativo'],
      ['emergency_light','luz-emergencia'],['memory_relay','rele-memoria']]
      .map(([type,name])=>[type,`assets/sprites/cidadela-404/${name}.png`]),
    ...[['imp_attack_b','imp-ataque-b'],['orb_attack_b','orbe-ataque-b'],
      ['echo_attack_b','echovore-ataque-b'],['boss_attack_b','vigilante-ataque-b'],
      ['breach_warning','fenda-aviso'],['echo_terminal_pulse_a','terminal-escuta-pulso-a'],
      ['echo_terminal_pulse_b','terminal-escuta-pulso-b'],['exit_pulse_a','portal-pulso-a'],
      ['exit_pulse_b','portal-pulso-b'],['memory_pulse','eco-ressonante-pulso']]
      .map(([type,name])=>[type,`assets/sprites/cidadela-404/${name}.png`]),
    ...[['workshop_switch_off','vigilia-controle-off'],['workshop_switch_on','vigilia-controle-on'],
      ['workshop_hazard_idle','vigilia-pulso-aviso'],['workshop_hazard_active','vigilia-pulso-ativo'],
      ['workshop_terminal','vigilia-terminal'],['workshop_core_off','vigilia-nucleo-apagado'],['workshop_core_on','vigilia-nucleo-vivo'],
      ['workshop_pipes','vigilia-tubos'],['workshop_bench','vigilia-bancada'],['workshop_robot','vigilia-sentinela']]
      .map(([type,name])=>[type,`assets/sprites/cidadela-404/${name}.png`]),
    ...['mare','nucleo','dominio','bio'].flatMap(mode=>[
      [`weapon_${mode}_return`,`assets/sprites/cidadela-404/base-canhao-${mode}-retorno.png`],
      [`ability_${mode}`,`assets/sprites/cidadela-404/base-habilidade-${mode}.png`],
    ]),
    ...[['imp_side','passada-imp-lateral'],
      ['imp_side_walk_a','passada-imp-lateral-a'],['imp_side_walk_b','passada-imp-lateral-b'],['imp_back_walk','passada-imp-costas'],
      ['orb_side_walk_a','passada-orbe-lateral-a'],['orb_side_walk_b','passada-orbe-lateral-b'],['orb_back_walk','passada-orbe-costas'],
      ['echo_side_walk_a','passada-echo-lateral-a'],['echo_side_walk_b','passada-echo-lateral-b'],['echo_back_walk','passada-echo-costas']]
      .map(([type,name])=>[type,`assets/sprites/cidadela-404/${name}.png`]),
    ...['mare','nucleo','dominio','bio'].flatMap(mode=>[
      [`muzzle_${mode}_tail`,`assets/sprites/cidadela-404/polimento-disparo-${mode}.png`],
      [`ability_${mode}_tail`,`assets/sprites/cidadela-404/polimento-habilidade-${mode}.png`],
    ]),
    ['crt_signal_a','assets/sprites/cidadela-404/polimento-crt-escuta.png'],
    ['crt_signal_b','assets/sprites/cidadela-404/polimento-crt-eco.png'],
    ...[['imp_side_attack','combate-imp-lateral-aviso'],['imp_back_attack','combate-imp-costas-aviso'],['imp_side_hurt','combate-imp-lateral-dano'],
      ['orb_side_attack','combate-orbe-lateral-aviso'],['orb_back_attack','combate-orbe-costas-aviso'],['orb_side_hurt','combate-orbe-lateral-dano'],
      ['echo_side_attack','combate-echo-lateral-aviso'],['echo_back_attack','combate-echo-costas-aviso'],['echo_side_hurt','combate-echo-lateral-dano'],
      ['hud_echo_alert','combate-eco-alerta']].map(([type,name])=>[type,`assets/sprites/cidadela-404/${name}.png`]),
    ...[['imp_back_hurt','fecho-imp-costas-dano'],['imp_side_fall','fecho-imp-lateral-queda'],['imp_back_fall','fecho-imp-costas-queda'],
      ['orb_back_hurt','fecho-orbe-costas-dano'],['orb_side_fall','fecho-orbe-lateral-queda'],['orb_back_fall','fecho-orbe-costas-queda'],
      ['echo_back_hurt','fecho-echo-costas-dano'],['echo_side_fall','fecho-echo-lateral-queda'],['echo_back_fall','fecho-echo-costas-queda'],
      ['boss_warning_b','fecho-vigilante-aviso']].map(([type,name])=>[type,`assets/sprites/cidadela-404/${name}.png`]),
    ['damage_visor','assets/sprites/cidadela-404/base-dano-visor.png'],
    ...[['imp_side_legacy','vida-imp-lateral'],['imp_back','vida-imp-costas'],
      ['orb_side','vida-orbe-lateral'],['orb_back','vida-orbe-costas'],
      ['echo_side','vida-echo-lateral'],['echo_back','vida-echo-costas'],
      ['boss_warning','vida-vigilante-aviso'],['boss_open_a','vida-vigilante-aberto-a'],
      ['boss_open_b','vida-vigilante-aberto-b'],['boss_hurt','vida-vigilante-dano']]
      .map(([type,name])=>[type,`assets/sprites/cidadela-404/${name}.png`]),
    ...['mare','nucleo','dominio','bio'].map(mode=>[`weapon_${mode}_reload`,`assets/sprites/cidadela-404/acabamento-recarga-${mode}.png`]),
    ...[['supply','acabamento-suprimento'],['hud_shield','acabamento-escudo'],
      ['hud_jam','acabamento-bloqueio'],['hud_interact','acabamento-interacao'],
      ['impact_metal','acabamento-impacto-metal'],['impact_shield','acabamento-impacto-escudo']]
      .map(([type,name])=>[type,`assets/sprites/cidadela-404/${name}.png`]),
    ...[['imp_hurt','refino-imp-dano'],['orb_hurt','refino-orbe-dano'],['echo_hurt','refino-echo-dano'],
      ['imp_fall','refino-imp-queda'],['orb_fall','refino-orbe-queda'],['echo_fall','refino-echo-queda'],
      ['hud_health','refino-hud-vida'],['hud_ammo','refino-hud-municao'],
      ['hud_energy','refino-hud-energia'],['hud_echo','refino-hud-eco']]
      .map(([type,name])=>[type,`assets/sprites/cidadela-404/${name}.png`]),
    ['wall_gate','assets/sprites/cidadela-404/parede-eclusa.png'],
    ['wall_metal','assets/sprites/cidadela-404/parede-metal.png'],
    ['wall_brick','assets/sprites/cidadela-404/parede-tijolo.png'],
  ]) {
    const image=new Image();
    image.onload=()=>{
      sprites[type]=image;
      if(type==='nulo') {
        const monitor=document.createElement('canvas'); monitor.width=image.width; monitor.height=image.height;
        const c=monitor.getContext('2d'); c.drawImage(image,0,0);
        c.fillStyle='#000';c.fillRect(image.width*.474,image.height*.245,image.width*.052,image.height*.10);
        c.strokeStyle='#4ab3b2';c.lineWidth=1;c.strokeRect(image.width*.474,image.height*.245,image.width*.052,image.height*.10);
        sprites.nulo=monitor;
      }
      if(type==='nulo_a' || type==='nulo_b') {
        // As linhas são desenhadas sobre a figura no CRT, nunca no espaço
        // da sala. Mantemos o vazio retangular e não imprimimos identidade.
        const monitor=document.createElement('canvas');monitor.width=image.width;monitor.height=image.height;
        const c=monitor.getContext('2d');c.drawImage(image,0,0);
        const w=image.width,h=image.height;
        c.fillStyle='#02090b';c.fillRect(w*.47,h*.254,w*.06,h*.065);
        c.strokeStyle='rgba(71,162,167,.65)';c.lineWidth=Math.max(.65,w/300);
        c.beginPath();
        for(const [x1,y1,x2,y2] of [
          [.47,.34,.53,.34],[.47,.34,.45,.51],[.53,.34,.55,.51],
          [.47,.34,.50,.51],[.53,.34,.50,.51],[.45,.51,.55,.51],
          [.45,.51,.48,.76],[.55,.51,.52,.76],[.50,.51,.48,.76],[.50,.51,.52,.76],
          [.47,.35,.43,.58],[.53,.35,.57,.58]]) {
          c.moveTo(x1*w,y1*h);c.lineTo(x2*w,y2*h);
        }
        c.stroke();sprites[type]=monitor;
      }
      if(type==='boss') {
        const closed=document.createElement('canvas'); closed.width=image.width; closed.height=image.height;
        const c=closed.getContext('2d'); c.drawImage(image,0,0);
        c.fillStyle='#1b282b';c.fillRect(image.width*.39,image.height*.32,image.width*.22,image.height*.24);
        c.strokeStyle='#9c5b51';c.lineWidth=3;c.strokeRect(image.width*.39,image.height*.32,image.width*.22,image.height*.24);
        c.fillStyle='#fa5d55';c.fillRect(image.width*.46,image.height*.43,image.width*.08,image.height*.018);
        sprites.bossClosed=closed;
      }
    };
    image.src=path;
  }
}
function cast(map, flags, px, py, dx, dy) {
  let x=Math.floor(px),y=Math.floor(py), side=0;
  const ddx=Math.abs(1/(dx||1e-9)), ddy=Math.abs(1/(dy||1e-9));
  const sx=dx<0?-1:1, sy=dy<0?-1:1;
  let tx=(dx<0?px-x:x+1-px)*ddx, ty=(dy<0?py-y:y+1-py)*ddy, tile=0;
  for (let i=0;i<64;i++) { if(tx<ty){x+=sx;tx+=ddx;side=0;}else{y+=sy;ty+=ddy;side=1;} tile=wallAt(map,flags,x,y); if(tile) break; }
  const dist=Math.max(.04,side===0?tx-ddx:ty-ddy);
  const hit=side===0?py+dist*dy:px+dist*dx;
  return {dist,side,tile,frac:hit-Math.floor(hit),x,y};
}
function drawWorld(map, flags, p, g, progress) {
  ctx.fillStyle='#09121a';ctx.fillRect(0,0,W,H/2);
  ctx.fillStyle='#111b1d';ctx.fillRect(0,H/2,W,H/2);
  // Placas convergentes de teto e piso são baratas (sem floor casting).
  // A cor dos trilhos diferencia o espaço industrial sem flashes.
  for(let i=0;i<8;i++) {
    const x=(i-3.5)*125;
    ctx.strokeStyle=i%3===0?'rgba(85,158,151,.12)':'rgba(90,115,120,.13)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(W/2,H/2);ctx.lineTo(W/2+x,0);ctx.moveTo(W/2,H/2);ctx.lineTo(W/2+x,H);ctx.stroke();
  }
  const offset=(p.x+p.y)%1;
  for(let i=1;i<13;i++) {
    const d=i+offset, delta=H/(2*d);
    ctx.fillStyle='rgba(122,151,151,.13)';ctx.fillRect(0,H/2+delta,W,1);
    ctx.fillStyle='rgba(103,137,139,.10)';ctx.fillRect(0,H/2-delta,W,1);
  }
  ctx.fillStyle='rgba(85,188,181,.16)';ctx.fillRect(0,20,W,2);
  ctx.fillStyle='rgba(255,47,57,.13)';ctx.fillRect(0,34,W,1);
  const dirX=Math.cos(g.angle),dirY=Math.sin(g.angle), plane=Math.tan(FOV/2);
  for(let x=0;x<W;x+=2) {
    const camera=(2*x/W-1)*plane;
    const ray=cast(map,flags,p.x,p.y,dirX-dirY*camera,dirY+dirX*camera);
    zbuffer[x]=zbuffer[x+1]=ray.dist;
    const height=Math.min(H*4,H/ray.dist), top=(H-height)/2;
    const fog=clamp(1-ray.dist/17,.12,1)*(ray.side?.72:1);
    const seam=ray.frac<.035 || ray.frac>.965;
    const base=ray.tile===2?[35,105,104]:[72,67,65];
    const wall=ray.tile===2 ? sprites.wall_gate : (ray.x>=9 && ray.x<16 || ray.x>=23 ? sprites.wall_brick : sprites.wall_metal);
    if(wall) {
      const u=clamp(Math.floor(ray.frac*wall.width),0,wall.width-1);
      ctx.drawImage(wall,u,0,1,wall.height,x,top,2,height);
      ctx.fillStyle=`rgba(2,8,12,${1-fog*.92})`;ctx.fillRect(x,top,2,height);
    } else {
      ctx.fillStyle=`rgb(${Math.floor(base[0]*fog)},${Math.floor(base[1]*fog)},${Math.floor(base[2]*fog)})`;ctx.fillRect(x,top,2,height);
    }
    if(seam){ctx.fillStyle='rgba(0,0,0,.48)';ctx.fillRect(x,top,2,height);}
    // Junções de placas e luzes indicam a escala e a orientação do corredor.
    ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(x,top+height*.23,2,Math.max(1,height*.012));ctx.fillRect(x,top+height*.76,2,Math.max(1,height*.012));
    if(ray.tile===2 && ray.frac>.27 && ray.frac<.73) {
      // Varredura lenta na eclusa, imóvel quando movimento reduzido é pedido.
      const scan=reducedMotion() ? .48 : .48+Math.sin(g.time*1.1)*.10;
      ctx.fillStyle=`rgba(85,240,228,${fog*.65})`;ctx.fillRect(x,top+height*scan,2,Math.max(1,height*.03));
    }
    else if ((ray.x+ray.y)%5===0 && ray.frac>.15 && ray.frac<.85) {ctx.fillStyle=`rgba(255,34,51,${fog*.7})`;ctx.fillRect(x,top+height*.14,2,Math.max(1,height*.025));}
  }
  const mission=flags.cidadela_estavel ? citadelMissions(progress) : null;
  const post=mission ? [
    ...CITADEL_WORKSHOP.decor.map(o=>({...o,ground:true})),
    {...CITADEL_WORKSHOP.terminal,type:'workshop_terminal',scale:.63,ground:true},
    {...CITADEL_WORKSHOP.core,type:flags.cidadela_vigilia_concluida?'workshop_core_on':'workshop_core_off',scale:.7,ground:true},
    ...CITADEL_WORKSHOP.switches.flatMap(o=>{
      const active=workshopCircuitActive(progress,g,o);
      const phase=active?workshopPhase(g.time,o.offset):'disabled';
      return [{...o,type:active?'workshop_switch_off':'workshop_switch_on',scale:.52,ground:true},
        {...o.emitter,type:phase==='active'?'workshop_hazard_active':'workshop_hazard_idle',phase,scale:.36,ground:true}];
    }),
    {...CITADEL_POSTGAME.sonda,type:'probe'},
    {...CITADEL_POSTGAME.transmissor,type:'transmitter',ground:true},
    {...CITADEL_POSTGAME.treino,type:'training',ground:true},
    ...CITADEL_POSTGAME.reles.map((o,i)=>({...o,type:mission.rede.objectives[i].done?'relay_on':'relay_off',ground:true})),
    ...CITADEL_POSTGAME.registros.map(o=>({...o,type:'recording',ground:true})),
    ...CITADEL_POSTGAME.decor.map(o=>({...o,ground:true})),
    {...CITADEL_BREACH_CONSOLE,type:'breach_console',scale:.62,ground:true},
    ...CITADEL_BREACHES.flatMap(b=>[
      {...b,type:flags[sealedFlag(b.id)]?'breach_sealed':'breach_open',scale:.5*(flags[sealedFlag(b.id)] || reducedMotion()?1:1+.035*Math.sin(g.time*2)),ground:true,windup:g.breach?.id===b.id?g.breach.windup:0},
      {...b.cache,type:flags[cacheFlag(b.id)]?'cache_open':'cache_closed',scale:.4,ground:true},
    ]),
  ] : [];
  const echoesReady=memoryEchoCount(progress)===CITADEL_ECHOES.length;
  const objects=[...post,
    ...CITADEL_ECHO_DECOR.map(o=>({...o,type:o.type==='anchor_sleep' && echoesReady?'anchor_active':o.type})),
    {...CITADEL_ECHO_TERMINAL,type:echoesReady?'echo_terminal_on':'echo_terminal_off',scale:.52,ground:true},
    ...CITADEL_ECHOES.map(e=>({...e,type:flags[e.flag]?'memory_echo_done':'memory_echo_pending',scale:.33})),
    ...CITADEL_DECOR.map(o=>({...o,ground:true})),
    ...CITADEL_ARCHIVES.map(a=>({...a,type:'terminal',scale:.72,ground:true})),
    {type:'exit',x:1.65,y:6.5,scale:1.2},
    ...CITADEL_NULL_MONITORS.map(m=>({...m,type:'nulo',scale:.56,signal:g.signalTime>0 && g.signalMonitorId===m.id})),
    ...KEYS.filter(k=>!flags[k.flag]).map(k=>({...k,type:'key',scale:.7})),
    ...g.supplies.filter(s=>!s.used).map(s=>({...s,type:'supply',scale:.45})),
    ...g.enemies.filter(e=>e.hp>0 || e.death>0).map(e=>({...e,scale:e.type==='orb'?.85:1})),
    ...(!g.boss.dead?[{...g.boss,scale:2.2}]:[]),
    ...g.shots.flatMap(s=>{
      const type=s.kind==='echo'?'shot_echo':s.kind==='orb'?'shot_orb':s.kind==='breach_shot'?'breach_shot':'shot';
      const main={...s,type,scale:.18*(reducedMotion()?1:1+.12*Math.sin(g.time*7))};
      if(reducedMotion() || wallAt(map,flags,s.x-s.dx*.08,s.y-s.dy*.08)) return [main];
      return [main,{...main,x:s.x-s.dx*.08,y:s.y-s.dy*.08,scale:.11,alpha:.3}];
    }),
    ...g.impacts.map(i=>({...i,type:`impact_${i.color}`,scale:.22+(0.3-i.life)*.4,alpha:clamp(i.life/.3,0,1)}))];
  // Ordena em profundidade de câmera (não por distância radial), para que
  // billboards fora do centro sejam encobertos corretamente por outros.
  objects.sort((a,b)=>((b.x-p.x)*dirX+(b.y-p.y)*dirY)-((a.x-p.x)*dirX+(a.y-p.y)*dirY));
  for(const o of objects) {
    const dx=o.x-p.x,dy=o.y-p.y, forward=dx*dirX+dy*dirY, lateral=-dx*dirY+dy*dirX;
    if(forward<.15) continue;
    const center=W/2+(lateral/forward)*(W/(2*plane));
    const base=sprites[o.type];
    const frame=enemyVisualFrame(o);
    let visual=citadelSpriteFrame(o,g.time,reducedMotion()), flip=false, directionalBase=null;
    if(['idle','attack','hurt','death'].includes(frame) && ['imp','orb','echo'].includes(o.type)) {
      const view=enemyView(o.facing,o.x,o.y,p.x,p.y);
      if(view.view!=='front') {
        let idle=`${o.type}_${view.view}`;
        if(!sprites[idle] && idle==='imp_side' && sprites.imp_side_legacy) idle='imp_side_legacy';
        if(frame==='idle' && sprites[idle]) {
          directionalBase=sprites[idle]; visual=idle; flip=view.flip;
          if(o.moving && !reducedMotion()) {
            const phase=enemyWalkFrame(o,g.time);
            const walking=view.view==='side'?`${o.type}_side_walk_${phase}`:phase==='b'?`${o.type}_back_walk`:idle;
            if(sprites[walking]) visual=walking;
          }
        } else if(frame==='attack' || frame==='hurt' || (frame==='death' && !reducedMotion() && (o.death ?? 0)>.38)) {
          // Só a queda intermediária é direcional: o colapso final e a
          // preferência por movimento reduzido mantêm a pose existente.
          // Quadros indisponíveis retornam à pose frontal da mesma ação.
          const action=`${o.type}_${view.view}_${frame==='death'?'fall':frame}`;
          if(sprites[action]) {visual=action;flip=view.flip;directionalBase=sprites[idle] ?? sprites[action];}
        }
      }
    }
    if(o.type==='boss') visual=bossVisualFrame(g.boss,g.time,reducedMotion());
    const chosen=sprites[visual];
    const bossFallback=o.type==='boss' ? (visual==='boss_attack_b'?sprites.boss_attack : visual==='boss_warning_b'?sprites.boss_warning : bossOpen(g.boss)?sprites.boss_open_a : sprites.bossClosed) : null;
    const sprite=chosen ?? (frame==='attack'?sprites[`${o.type}_attack`]:null) ?? bossFallback ?? base;
    const aspect=directionalBase ?? (visual.includes('_walk_') ? sprite : base);
    const h=Math.min(H*4,H/forward*o.scale), w=h*(aspect.width/aspect.height), left=center-w/2;
    // Aviso da fenda também existe em movimento reduzido; os demais brilhos
    // são decorativos e não substituem as legendas de combate.
    const pulse=sprites[citadelPulseFrame(o.type,o.windup,g.scan,g.time,reducedMotion())];
    const alpha=o.alpha ?? (o.death>0 && !reducedMotion() ? clamp(o.death/.7,0,1) : 1);
    const bob=reducedMotion()?0:o.moving?Math.sin(g.time*8+o.x)*2:
      (o.type==='memory_echo_pending'||o.type==='memory_relay'?Math.sin(g.time*1.5+o.x)*1.4:0);
    // Os frames gerados são próximos entre si. Um pequeno deslocamento das
    // pernas realça a passada sem girar o cenário ou modificar colisões.
    const stride=!directionalBase && !reducedMotion() && o.moving && (o.type==='imp'||o.type==='echo') ? Math.round(Math.sin(g.time*8+o.x)*2) : 0;
    const fall=!reducedMotion() && o.death>0 ? (1-o.death/.7)*12 : 0;
    const top=(o.ground || ['key','supply','exit'].includes(o.type) ? H/2+H/(2*forward)-h : H/2-h*.50)+bob+fall;
    ctx.save();ctx.globalAlpha=alpha;
    for(let sx=Math.max(0,Math.floor(left));sx<Math.min(W,Math.ceil(left+w));sx+=2) {
      if(forward>=zbuffer[sx]) continue;
      const sourceX=clamp(Math.floor((sx-left)/w*sprite.width),0,sprite.width-1);
      const tx=flip?sprite.width-1-sourceX:sourceX;
      if(stride) {
        const cut=sprite.height*.62;
        ctx.drawImage(sprite,tx,0,1,cut,sx,top,2,h*.62);
        const legX=sx+stride;
        if(legX>=0 && legX<W && forward<zbuffer[legX]) ctx.drawImage(sprite,tx,cut,1,sprite.height-cut,legX,top+h*.62,2,h*.38);
      } else ctx.drawImage(sprite,tx,0,1,sprite.height,sx,top,2,h);
      if(pulse) {
        ctx.globalAlpha=alpha*(o.type==='breach_open'?(reducedMotion()?.55:.48+.12*(.5+.5*Math.sin(g.time*2))):.14+.22*(.5+.5*Math.sin(g.time*.8)));
        const ux=clamp(Math.floor((sx-left)/w*pulse.width),0,pulse.width-1);
        ctx.drawImage(pulse,ux,0,1,pulse.height,sx,top,2,h);ctx.globalAlpha=alpha;
      }
      // Interferência cabe apenas na tela do CRT, respeita a profundidade e
      // não cobre a mira ou os avisos. Movimento reduzido usa quadro estático.
      if(o.signal) {
        const signal=sprites[reducedMotion() || g.signalTime>.75?'crt_signal_a':'crt_signal_b'];
        const u=(sx-left)/w;
        if(signal && u>=.20 && u<=.80) {
          const ux=clamp(Math.floor((u-.20)/.60*signal.width),0,signal.width-1);
          ctx.globalAlpha=alpha*(reducedMotion()?.16:.20);
          ctx.drawImage(signal,ux,0,1,signal.height,sx,top+h*.22,2,h*.57);ctx.globalAlpha=alpha;
        }
      }
    }
    ctx.restore();
    if(center>0 && center<W && forward<zbuffer[Math.floor(center)]) {
      ctx.font='bold 9px monospace';ctx.textAlign='center';
      if(o.type==='key' && forward<7) {
        ctx.fillStyle=o.color;ctx.fillText(`${o.symbol} ${o.label}`,center,top-3);
      } else if(o.phase && o.phase!=='disabled' && forward<8) {
        ctx.fillStyle='#ffe2a6';ctx.fillText(o.phase==='safe'?'JANELA SEGURA':o.phase==='warning'?'! PULSO EM BREVE':'! PULSO ATIVO',center,top-3);
      } else if(o.windup>0 && forward<8) {
        ctx.fillStyle='#ffd89a';ctx.fillText(o.type==='breach_open'?'! PULSO: DESVIE':'! PREPARANDO DISPARO',center,top-3);
      }
    }
  }
}
function drawWeapon(g, mod) {
  const animated=!reducedMotion(), recoil=g.fire>0 && animated?7*Math.sin(Math.PI*(.23-g.fire)/.23):0;
  const reloadDip=g.reload>0 && animated && g.jam<=0?14*Math.sin(Math.PI*(1.5-g.reload)/1.5):0;
  const bob=animated ? Math.sin(g.walkPhase)*g.walkBlend : 0;
  const deployDip=animated && g.fire<=0 && g.reload<=0 ? 16*clamp(g.weaponDeploy/.45,0,1) : 0;
  const x=W/2+bob*2, y=H-26+recoil+reloadDip+deployDip+Math.abs(bob)*2;
  const weapon=sprites[`weapon_${mod.mode}`];
  if(weapon) {
    const stage=weaponVisualFrame(g.fire,!animated,g.reload,g.jam);
    const frame=stage==='idle'?weapon:(sprites[`weapon_${mod.mode}_${stage}`] ?? weapon);
    // A pose de recarga pode ter outra silhueta: preserve sua proporção.
    const sizing=stage==='reload'?frame:weapon;
    const scale=Math.min(172/sizing.width,96/sizing.height);
    const w=sizing.width*scale,h=sizing.height*scale;
    ctx.drawImage(frame,x-w/2,H-20-h+recoil+reloadDip+deployDip+Math.abs(bob)*2,w,h);
    const flash=muzzleVisualFrame(g.fire,!animated);
    if(flash) {
      const flare=flash==='tail'?(sprites[`muzzle_${mod.mode}_tail`] ?? sprites[`muzzle_${mod.mode}`]):sprites[`muzzle_${mod.mode}`];
      const size=flash==='tail'?22:28;
      if(flare) { ctx.save();ctx.globalAlpha=flash==='tail'?.45:.72;ctx.drawImage(flare,x-size/2,H-20-h+recoil+reloadDip+Math.abs(bob)*2-12,size,size);ctx.restore(); }
    }
    return;
  }
  ctx.fillStyle='#080e11'; ctx.fillRect(x-47,y-27,94,58);
  ctx.fillStyle='#31434a'; ctx.fillRect(x-39,y-22,78,40);ctx.fillStyle='#50636a';ctx.fillRect(x-30,y-29,60,34);
  ctx.fillStyle='#17252b';ctx.fillRect(x-22,y-36,44,30);ctx.fillStyle='#0a1114';ctx.fillRect(x-15,y-34,30,19);
  ctx.fillStyle=mod.color;ctx.fillRect(x-36,y-14,7,23);ctx.fillRect(x+29,y-14,7,23);ctx.fillRect(x-12,y-8,24,3);
  if(mod.mode==='bio'){ for(let i=0;i<3;i++){ctx.fillRect(x-25+i*8,y+3,4,4);ctx.fillRect(x+7+i*8,y+3,4,4);} }
  if(mod.mode==='mare'){ctx.fillRect(x-27,y-18,54,2);ctx.fillRect(x-20,y-13,40,2);}
  if(mod.mode==='dominio'){ctx.fillRect(x-6,y-24,12,3);ctx.fillRect(x-2,y-28,4,11);}
  if(mod.mode==='nucleo'){ctx.fillRect(x-26,y-20,9,3);ctx.fillRect(x+17,y-20,9,3);}
  if(g.fire>.14 && !reducedMotion()){ctx.fillStyle='#ffe9a5';ctx.fillRect(x-7,y-45,14,8);}
}
// Traços da ressonância ficam nas bordas da visão, sem depender de flashes
// ou encobrir o chefe. O módulo decide a geometria, não apenas a cor.
function drawResonance(g,mod) {
  ctx.save();ctx.strokeStyle=mod.color;ctx.lineWidth=2;
  if(g.shield>0 || g.guard>0) {
    ctx.globalAlpha=.35;ctx.beginPath();ctx.moveTo(8,65);ctx.lineTo(8,33);ctx.lineTo(42,33);
    ctx.moveTo(W-8,65);ctx.lineTo(W-8,33);ctx.lineTo(W-42,33);ctx.stroke();
  }
  if(g.fx>0) {
    ctx.globalAlpha=Math.min(.58,g.fx*.8+.12);ctx.beginPath();
    if(g.fxKind==='ultimate' || g.fxKind==='scan') {
      const r=g.fxKind==='ultimate'?62:35;
      ctx.arc(W/2,H/2,r,0,Math.PI*2);ctx.moveTo(W/2+r+11,H/2);ctx.arc(W/2,H/2,r+11,0,Math.PI*2);
    } else if(mod.mode==='mare') {
      ctx.arc(W/2,H+30,115,Math.PI*1.08,Math.PI*1.92);ctx.moveTo(W/2-144,H+30);ctx.arc(W/2,H+30,144,Math.PI*1.08,Math.PI*1.92);
    } else if(mod.mode==='dominio') {
      ctx.moveTo(65,H-53);ctx.lineTo(W-64,36);ctx.moveTo(81,H-47);ctx.lineTo(W-48,43);
    } else if(mod.mode==='bio') {
      ctx.moveTo(15,95);ctx.lineTo(15,60);ctx.lineTo(40,42);ctx.moveTo(W-15,95);ctx.lineTo(W-15,60);ctx.lineTo(W-40,42);
    } else {
      for(let i=0;i<4;i++){ctx.moveTo(15+i*15,73+i*8);ctx.lineTo(40+i*15,82+i*8);ctx.moveTo(W-15-i*15,73+i*8);ctx.lineTo(W-40-i*15,82+i*8);}
    }
    ctx.stroke();
  }
  if(g.fx>0 && ['q','ultimate'].includes(g.fxKind)) {
    const effect=!reducedMotion() && g.fx<.4 ? (sprites[`ability_${mod.mode}_tail`] ?? sprites[`ability_${mod.mode}`]) : sprites[`ability_${mod.mode}`];
    if(effect) {
      const size=reducedMotion()?30:30+3*(1-clamp(g.fx,0,1));
      ctx.globalAlpha=reducedMotion()?.55:Math.min(.65,.2+g.fx*.5);
      ctx.drawImage(effect,10,H-146,size,size);
    }
    const seal=sprites[`seal_${mod.mode}`];
    if(seal) { ctx.globalAlpha=.75; ctx.drawImage(seal,14,H-105,30,30); }
    else {ctx.globalAlpha=.6;ctx.strokeRect(18,H-101,22,22);}
  }
  if(g.fx>0 && g.perkIcon && (g.fxKind==='q'||g.fxKind==='scan')) {
    const icon=sprites[`perk_${g.perkIcon}`];
    if(icon) {ctx.globalAlpha=.85;ctx.drawImage(icon,W-47,H-105,30,30);}
  }
  if(g.fire>.06 && !reducedMotion()) {
    // Traço de visor, curto e fora da mira; não é um projétil físico.
    const phase=(.23-g.fire)/.17;
    const y=H-60-phase*45;
    ctx.globalAlpha=.55;ctx.strokeStyle=mod.color;ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(W/2,y);ctx.lineTo(W/2,y+9);ctx.stroke();
  }
  if(g.hit>0){ctx.globalAlpha=.9;ctx.strokeStyle='#f4fff5';ctx.beginPath();for(const [x,y] of [[-1,-1],[1,-1],[-1,1],[1,1]]){ctx.moveTo(W/2+x*6,H/2+y*6);ctx.lineTo(W/2+x*10,H/2+y*10);}ctx.stroke();}
  ctx.restore();
}
function drawMap(map,flags,p,g,progress) {
  ctx.save();
  const scale=2, x0=8,y0=40;
  ctx.fillStyle='rgba(0,12,17,.88)';ctx.fillRect(x0-3,y0-3,70,55);
  for(let y=0;y<map.layout.length;y++)for(let x=0;x<map.layout[y].length;x++) {
    ctx.fillStyle=wallAt(map,flags,x+.5,y+.5)?'#495a5e':'#152b30';ctx.fillRect(x0+x*scale,y0+y*scale,2,2);
  }
  for(const k of KEYS) if(!flags[k.flag]) {ctx.fillStyle=k.color;ctx.fillRect(x0+k.x*scale-1,y0+k.y*scale-1,3,3);}
  for(const s of g.supplies)if(!s.used){ctx.fillStyle='#a0ef9f';ctx.fillRect(x0+s.x*scale,y0+s.y*scale,2,2);}
  for(const a of CITADEL_ARCHIVES)if(!flags[a.flag]){ctx.strokeStyle='#80d0ea';ctx.strokeRect(x0+a.x*scale-2,y0+a.y*scale-2,4,4);}
  for(const e of CITADEL_ECHOES)if(!flags[e.flag]){ctx.strokeStyle='#62ffd8';ctx.beginPath();ctx.arc(x0+e.x*scale,y0+e.y*scale,2,0,Math.PI*2);ctx.stroke();}
  for(const m of CITADEL_NULL_MONITORS)if(!flags[m.flag]){ctx.strokeStyle='#c6adff';ctx.strokeRect(x0+m.x*scale-2,y0+m.y*scale-2,4,4);}
  if(flags.cidadela_estavel) {
    const {rede,vozes}=citadelMissions(progress);
    let marks=[];
    if(rede.status==='available' || (rede.status==='active' && rede.objectives.slice(0,3).every(o=>o.done))) marks=[CITADEL_POSTGAME.sonda];
    else if(rede.status==='active') marks=CITADEL_POSTGAME.reles.filter((_,i)=>!rede.objectives[i].done);
    else if(vozes.status==='available' || (vozes.status==='active' && vozes.objectives.slice(0,3).every(o=>o.done))) marks=[CITADEL_POSTGAME.transmissor];
    else if(vozes.status==='active') marks=CITADEL_POSTGAME.registros.filter((_,i)=>!vozes.objectives[i].done);
    for(const o of marks) {ctx.fillStyle='#ffe68c';ctx.fillRect(x0+o.x*scale-1,y0+o.y*scale-1,3,3);}
    const work=workshopCount(progress);
    const workMarks=g.workshopTrial?CITADEL_WORKSHOP.switches.filter(o=>workshopCircuitActive(progress,g,o)):work<3?CITADEL_WORKSHOP.switches.filter(o=>!flags[o.flag]):flags.cidadela_vigilia_concluida?[]:[CITADEL_WORKSHOP.terminal];
    for(const o of workMarks){
      const x=x0+o.x*scale,y=y0+o.y*scale;
      ctx.strokeStyle='#ffb97c';ctx.beginPath();ctx.moveTo(x,y-3);ctx.lineTo(x-3,y+2);ctx.lineTo(x+3,y+2);ctx.closePath();ctx.stroke();
    }
    ctx.fillStyle='#d1d9cd';ctx.font='6px monospace';ctx.textAlign='left';ctx.fillText('FENDA □ / OFICINA △',x0,y0+50);
    for(const b of CITADEL_BREACHES) {
      if(!flags[sealedFlag(b.id)]) {ctx.strokeStyle='#ff8989';ctx.strokeRect(x0+b.x*scale-2,y0+b.y*scale-2,4,4);}
      else if(!flags[cacheFlag(b.id)]) {ctx.strokeStyle='#8bffff';ctx.strokeRect(x0+b.cache.x*scale-2,y0+b.cache.y*scale-2,4,4);}
    }
  }
  for(const e of g.enemies)if(e.hp>0){ctx.fillStyle='#ff6868';ctx.fillRect(x0+e.x*scale,y0+e.y*scale,2,2);}
  ctx.fillStyle='#fff';ctx.fillRect(x0+p.x*scale-2,y0+p.y*scale-2,4,4);
  ctx.strokeStyle='#fff';ctx.beginPath();ctx.moveTo(x0+p.x*scale,y0+p.y*scale);ctx.lineTo(x0+p.x*scale+Math.cos(g.angle)*5,y0+p.y*scale+Math.sin(g.angle)*5);ctx.stroke();
  ctx.restore();
}
export function renderCitadel(canvas,state) {
  if (!game) return;
  setupBuffer();
  const g=game,p=state.player,flags=state.progress.flags,map=state.world.currentMap,mod=MODULES[state.progress.archetype] ?? MODULES.motor_bio_forja;
  ctx=worldCtx;ctx.imageSmoothingEnabled=false;drawWorld(map,flags,p,g,state.progress);drawWeapon(g,mod);drawResonance(g,mod);
  // UI independente evita ampliar pixels serrilhados do framebuffer do mundo.
  ctx=uiCtx;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,W*2,H*2);ctx.setTransform(2,0,0,2,0,0);ctx.imageSmoothingEnabled=true;
  ctx.fillStyle='#d8ffff';ctx.fillRect(W/2-4,H/2,9,1);ctx.fillRect(W/2,H/2-4,1,9);
  if(g.damage>0){
    // Bordas e sinais pequenos deixam a mira e os avisos livres. A borda
    // continua visível sem depender da imagem ou de movimento.
    ctx.save();ctx.strokeStyle='rgba(255,55,65,.5)';ctx.lineWidth=7;ctx.strokeRect(3,3,W-6,H-6);
    const damage=sprites.damage_visor;
    if(damage) {
      ctx.globalAlpha=reducedMotion()?.5:.5*clamp(g.damage/.35,0,1);
      ctx.drawImage(damage,8,37,35,35);
      ctx.translate(W,0);ctx.scale(-1,1);ctx.drawImage(damage,8,37,35,35);
    }
    ctx.restore();
  }
  ctx.fillStyle='rgba(3,12,16,.94)';ctx.fillRect(0,0,W,29);ctx.fillRect(0,H-42,W,42);
  ctx.font='bold 9px monospace';ctx.textAlign='left';ctx.fillStyle=mod.color;ctx.fillText('CIDADELA 404  //  '+mod.name+'  //  S'+(g.localProgress?.rank ?? 1),9,12);
  // Ícones acompanham rótulos em texto: nenhuma informação depende de cor ou arte.
  if(sprites.hud_health)ctx.drawImage(sprites.hud_health,9,H-39,10,10);
  ctx.fillStyle='#e2f4f0';ctx.fillText('VIDA '+Math.ceil(p.health||0)+'/'+(p.maxHealth||0),22,H-30);
  const ammoIcon=g.jam>0?(sprites.hud_jam ?? sprites.hud_ammo):sprites.hud_ammo;
  if(ammoIcon)ctx.drawImage(ammoIcon,126,H-39,10,10);
  ctx.fillStyle=g.jam>0?'#ffb4a0':'#e2f4f0';
  ctx.fillText('MUN '+g.ammo+'/12'+(g.jam?' REC BLOQUEADA':g.reload?' RECARGA':''),139,H-30);
  if(g.reload>0) {
    ctx.fillStyle='#213438';ctx.fillRect(139,H-26,80,2);
    ctx.fillStyle=g.jam>0?'#ff997a':'#83e4d7';ctx.fillRect(139,H-26,80*clamp(1-g.reload/1.5,0,1),2);
  }
  const echoHigh=citadelEchoAlert(g.echo,flags), echoText='ECHOVORE '+Math.floor(g.echo)+'%'+(echoHigh?' • ALTO':'');
  const echoIcon=echoHigh?(sprites.hud_echo_alert ?? sprites.hud_echo):sprites.hud_echo;
  const echoWidth=ctx.measureText(echoText)?.width ?? echoText.length*5.4;
  if(echoIcon)ctx.drawImage(echoIcon,W-9-echoWidth-13,3,10,10);
  ctx.textAlign='right';ctx.fillStyle=echoHigh?'#ffcfad':'#ff9a9e';ctx.fillText(echoText,W-9,12);
  const ultUnlocked=getUnlockState(state.progress).features.ultimate;
  const ultStatus=!ultUnlocked?'NV3':p.ultimate?.cooldown>0?Math.ceil(p.ultimate.cooldown)+'s':'OK';
  if(sprites.hud_energy)ctx.drawImage(sprites.hud_energy,W-160,H-39,10,10);
  ctx.fillStyle='#c9f2ee';ctx.font='8px monospace';ctx.fillText('EN '+Math.floor(p.energy ?? 0)+'  Q '+(g.q?Math.ceil(g.q)+'s':'OK')+'  SH '+(g.boost?Math.ceil(g.boost)+'s':'OK')+'  F '+ultStatus,W-9,H-30);
  if(g.guard>0 || g.shield>0 || g.vectorCharge>0 || g.echoAnchor>0) {ctx.textAlign='center';ctx.fillStyle=mod.color;
    const guard=g.guard>0?'GUARDA '+Math.ceil(g.guard)+'s':'';
    const shield=g.shield>0?'ESCUDO '+Math.ceil(g.shield)+'s':'';
    const vector=g.vectorCharge>0?'VETOR +12 '+Math.ceil(g.vectorCharge)+'s':'';
    const status=[guard,shield,vector,g.echoAnchor>0?'SINAL -30% ECO '+Math.ceil(g.echoAnchor)+'s':''].filter(Boolean).join(' • ');
    if((guard || shield) && sprites.hud_shield) {
      const width=ctx.measureText(status)?.width ?? status.length*4.8;
      ctx.drawImage(sprites.hud_shield,Math.max(3,W/2-width/2-12),55,9,9);
    }
    ctx.fillText(status,W/2,65);}
  ctx.textAlign='left';ctx.fillStyle='#d9b9ae';ctx.fillText('REGISTROS '+KEYS.map(k=>flags[k.flag]?k.symbol:'□').join(' ')+'  '+(flags.cidadela_estavel?missionObjective(state.progress):flags.cidadela_chave_vermelha?'ALCANCE O REATOR':'ENCONTRE OS REGISTROS'),9,24,W-105);
  ctx.textAlign='right';ctx.fillStyle='#9fbfca';ctx.fillText('ARQUIVOS '+CITADEL_ARCHIVES.filter(a=>flags[a.flag]).length+'/3',W-9,24);
  ctx.textAlign='center';ctx.fillStyle='#d4eeee';ctx.font='bold 9px monospace';
  ctx.fillText('WASD MOVE · MOUSE/SETAS MIRA · CLIQUE/ESPAÇO ATIRA · E USA',W/2,H-17);
  ctx.fillText('Q MÓD · R RADAR · T REC · SHIFT IMP · F ULT · P PAUSA · L/J/K · M SOM',W/2,H-5);
  if(g.scan>0) { ctx.strokeStyle=mod.color;ctx.globalAlpha=.35;ctx.lineWidth=1;ctx.beginPath();ctx.arc(W/2,H/2,18,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;drawMap(map,flags,p,g,state.progress); }
  let prompt='';
  const target=nearestInteraction(map,flags,p);
  if(target?.kind==='exit') prompt='[E] RETORNAR À ESTAÇÃO 66.6';
  if(target?.kind==='key') prompt=`[E] REGISTRO ${target.symbol} ${target.label}`;
  if(target?.kind==='archive') prompt=`[E] ARQUIVO ${target.label}${flags[target.flag]?' • REVER':''}`;
  if(target?.kind==='workshop_switch') prompt=!workshopCircuitActive(state.progress,g,target)?'[E] CIRCUITO • REVER':workshopPhase(g.time,target.offset)==='safe'?'[E] REGULAR CIRCUITO • JANELA SEGURA':'CIRCUITO ENERGIZADO • AGUARDE';
  if(target?.kind==='workshop_terminal') prompt='[E] TERMINAL DA OFICINA';
  if(target?.kind==='workshop_trial') prompt=flags.cidadela_vigilia_concluida?(g.workshopTrial?'[E] SENTINELA • CANCELAR ENSAIO':'[E] SENTINELA • INICIAR ENSAIO'):'[E] SENTINELA EM ESPERA';
  if(target?.kind==='memory_echo') prompt=flags[target.flag]?'[E] ECO • REVER':g.scan>0?'[E] ECO • SINTONIZAR':'[R] RADAR → [E] SINTONIZAR ECO';
  if(target?.kind==='echo_terminal') prompt='[E] TERMINAL DE ESCUTA';
  if(target?.kind==='crt') prompt=`[E] CRT ${target.label}${flags[target.flag]?' • REVER':' • EXAMINAR'}`;
  if(target?.kind==='reactor') prompt='[E] EXAMINAR REATOR';
  if(target?.kind==='probe') prompt='[E] CONVERSAR COM NEXO-04';
  if(target?.kind==='relay') prompt=`[E] RELÉ ${target.label}`;
  if(target?.kind==='transmitter') prompt='[E] CONSULTAR TRANSMISSOR';
  if(target?.kind==='recording') prompt=`[E] CAIXA DE REGISTRO • ${target.label}`;
  if(target?.kind==='training') prompt=g.training?'[E] ENCERRAR SIMULAÇÃO':'[E] INICIAR SIMULAÇÃO OPCIONAL';
  if(target?.kind==='breach') prompt=flags[sealedFlag(target.id)]?'[E] FENDA SELADA':g.breach?.id===target.id?'[E] CANCELAR FENDA':'[E] DESAFIAR FENDA • 2 ONDAS';
  if(target?.kind==='breach_cache') prompt=flags[cacheFlag(target.id)]?'[E] COFRE ABERTO':'[E] EXAMINAR COFRE';
  if(target?.kind==='breach_console') prompt='[E] STATUS DAS FENDAS';
  if(!prompt && p.y>9.8 && p.y<12 && ((p.x>3.5&&p.x<6.5)||(p.x>18.5&&p.x<21.5))) prompt=flags.cidadela_estavel?'OFICINA DA VIGÍLIA • ACESSO LIVRE':'OFICINA • AGUARDA REATOR ESTÁVEL';
  for (const [x,k] of [[8,KEYS[0]],[15,KEYS[1]],[22,KEYS[2]]]) if (!prompt && !flags[k.flag] && Math.abs(p.x-x)<1.4 && p.y>4.2 && p.y<8.8) prompt=`ECLUSA ${k.symbol} ${k.label} • BUSQUE O REGISTRO`;
  if(prompt){
    const lines=wrapCitadelText(prompt,46), actionable=/^\[(E|R)\]/.test(prompt);
    ctx.fillStyle='rgba(0,0,0,.86)';ctx.fillRect(W/2-145,H/2+34,290,lines.length*12+4);
    if(actionable && sprites.hud_interact)ctx.drawImage(sprites.hud_interact,W/2-139,H/2+36,10,10);
    ctx.fillStyle='#e6ffff';ctx.font='bold 9px monospace';
    lines.forEach((line,i)=>ctx.fillText(line,W/2+(actionable?6:0),H/2+45+i*12));
  }
  if(flags.cidadela_estavel) {
    const nearby=CITADEL_WORKSHOP.switches.filter(o=>workshopCircuitActive(state.progress,g,o) && Math.hypot(p.x-o.emitter.x,p.y-o.emitter.y)<2.8 && visible(map,flags,p.x,p.y,o.emitter.x,o.emitter.y)).sort((a,b)=>Math.hypot(p.x-a.emitter.x,p.y-a.emitter.y)-Math.hypot(p.x-b.emitter.x,p.y-b.emitter.y))[0];
    if(nearby) {
      const phase=workshopPhase(g.time,nearby.offset);
      ctx.font='bold 9px monospace';ctx.fillStyle=phase==='safe'?'#c9f1df':'#ffbe94';
      ctx.fillText(phase==='safe'?'OFICINA • JANELA SEGURA':phase==='warning'?'OFICINA • PULSO EM BREVE':'OFICINA • PULSO ATIVO: AFASTE-SE',W/2,g.breach?58:43);
    }
  }
  if(g.breach) {
    ctx.font='bold 9px monospace';ctx.fillStyle='#ffb5a0';
    const remaining=g.enemies.filter(e=>e.breach===g.breach.id && e.hp>0).length;
    ctx.fillText(`FENDA • ONDA ${g.breach.wave}/2 • ${g.breach.prep>0?'PREPARANDO':`ECOS ${remaining}`}${g.breach.windup>0?' • PULSO: DESVIE':''}`,W/2,43);
  }
  if(!g.boss.dead && p.x>22.7) {
    const text=bossOpen(g.boss)?'NÚCLEO EXPOSTO — DISPARE':g.boss.cycle<2?'VIGILANTE — PREPARANDO RAJADA':'RAJADA — DESVIE!';
    ctx.font='bold 9px monospace';ctx.fillStyle=bossOpen(g.boss)?'#abffff':'#ff9081';ctx.fillText(text,W/2,43);
    ctx.fillStyle='#282f32';ctx.fillRect(W/2-70,48,140,4);ctx.fillStyle='#ff5c59';ctx.fillRect(W/2-70,48,140*clamp(g.boss.hp/280,0,1),4);
  }
  if(g.messageTime>0){
    const lines=wrapCitadelText(g.message), height=lines.length*12+6, top=H-42-height;
    ctx.font='bold 10px monospace';ctx.fillStyle='rgba(0,8,12,.94)';ctx.fillRect(0,top,W,height);
    ctx.fillStyle='#e0fffa';lines.forEach((line,i)=>ctx.fillText(line,W/2,top+12+i*12));
  }
  if(g.panel) {
    ctx.fillStyle='rgba(1,8,12,.94)';ctx.fillRect(45,35,W-90,H-70);
    ctx.strokeStyle=mod.color;ctx.lineWidth=1;ctx.strokeRect(45,35,W-90,H-70);
    ctx.textAlign='left';ctx.fillStyle=mod.color;ctx.font='bold 13px monospace';
    ctx.fillText(g.panel==='journal'?'ARQUIVO DE MEMÓRIA':g.panel==='missions'?'MISSÕES DA CIDADELA':g.panel==='dimension'?'SINTONIA LOCAL // CIDADELA':'SINAL EM PAUSA',62,58);
    ctx.font='9px monospace';ctx.fillStyle='#d2eeee';
    if(g.panel==='journal') {
      let y=77;
      for(const k of KEYS) {
        ctx.fillStyle=k.color;ctx.fillText(`${k.symbol} ${k.label}`,62,y);
        ctx.fillStyle='#d2eeee';ctx.fillText(flags[k.flag]?k.log:'REGISTRO AINDA NÃO ENCONTRADO.',62,y+11,W-125);y+=28;
      }
      ctx.fillStyle=mod.color;ctx.fillText('FRAGMENTOS OPCIONAIS',62,166);
      ctx.fillStyle='#d2eeee';ctx.font='8px monospace';
      for(const [i,a] of CITADEL_ARCHIVES.entries()) ctx.fillText(`${a.label}: ${flags[a.flag]?a.log:'NÃO ENCONTRADO.'}`,62,180+i*12,W-125);
      ctx.fillStyle=flags.cidadela_estavel?'#b4fff1':'#d9b9ae';
      ctx.fillText(`CRTs ${crtCount(state.progress)}/3 • ECOS ${memoryEchoCount(state.progress)}/3 • REVEJA NOS PONTOS.`,62,217,W-125);
    } else if(g.panel==='missions') {
      if(!flags.cidadela_estavel) ctx.fillText('MISSÕES DE EXPLORAÇÃO DISPONÍVEIS APÓS A ESTABILIZAÇÃO.',62,83,W-125);
      else {
        const {rede,vozes}=citadelMissions(state.progress);
        ctx.fillStyle=mod.color;ctx.fillText('REDE DE ESCUTA • '+(rede.status==='completed'?'CONCLUÍDA':rede.status==='active'?'EM ANDAMENTO':'FALE COM NEXO-04'),62,78,W-125);
        ctx.fillStyle='#d2eeee';rede.objectives.forEach((o,i)=>ctx.fillText(`${o.done?'[X]':'[ ]'} ${o.label}`,62,92+i*12,W-125));
        ctx.fillStyle=mod.color;ctx.fillText('VOZES NA ESTÁTICA • '+(vozes.status==='completed'?'CONCLUÍDA':vozes.status==='active'?'EM ANDAMENTO':'CONSULTE O TRANSMISSOR'),62,153,W-125);
        ctx.fillStyle='#d2eeee';vozes.objectives.forEach((o,i)=>ctx.fillText(`${o.done?'[X]':'[ ]'} ${o.label}`,62,167+i*12,W-125));
        const summary=breachSummary(state.progress);ctx.fillStyle=mod.color;
        ctx.fillText(`FENDAS ${summary.sealed}/3 • COFRES ${summary.caches}/3 • ${g.workshopTrial?'ENSAIO '+g.workshopTrial.done.length+'/3':'OFICINA '+workshopCount(state.progress)+'/3'}`,62,216,W-125);
      }
    } else if(g.panel==='dimension') {
      const local=g.localProgress ?? getDimensionProgress(state.progress);
      if(!local) ctx.fillText('SINTONIA LOCAL INDISPONÍVEL PARA ESTE OPERADOR.',62,83,W-125);
      else {
        const badge=sprites.perk_emblema, drone=sprites.perk_nexo;
        if(badge) ctx.drawImage(badge,W-96,44,22,22);
        if(drone) ctx.drawImage(drone,W-70,44,24,18);
        ctx.fillStyle='#e4fffa';ctx.fillText(`SINTONIA ${local.rank}/4 • MARCOS ${local.score}/${local.max}`+(local.next===null?' • MÁXIMO':` • PRÓXIMO ${local.next}`),62,76,W-125);
        for(const [i,skill] of local.skills.entries()) {
          const y=89+i*38, icon=sprites[`perk_${skill.icon}`], unlocked=local.rank>=skill.rank;
          ctx.save();ctx.globalAlpha=unlocked?1:.35;
          if(icon) ctx.drawImage(icon,62,y,29,29);else {ctx.strokeStyle=mod.color;ctx.strokeRect(62,y,29,29);}
          ctx.restore();ctx.fillStyle=unlocked?mod.color:'#9da8a7';
          ctx.fillText(`S${skill.rank} ${skill.name} • ${unlocked?'ATIVO':'BLOQUEADO'}`,101,y+10,W-165);
          ctx.fillStyle='#d2eeee';ctx.fillText(skill.description,101,y+23,W-165);
        }
        ctx.fillStyle=local.rank>=3?mod.color:'#9da8a7';ctx.fillText(`S3 IMPULSO RÁPIDO • ${local.rank>=3?'ATIVO':'BLOQUEADO'}`,62,175);
        ctx.fillStyle='#d2eeee';ctx.fillText('SHIFT: RECARGA DE 3s PARA 2,4s.',62,187);
        ctx.fillStyle='#a7c8c6';ctx.font='8px monospace';
        ctx.fillText('MARCOS ÚNICOS: REGISTROS, ARQUIVOS, CRTs, REATOR,',62,204,W-125);
        ctx.fillText('ECOS, OFICINA, MISSÕES, FENDAS, COFRES E TREINO.',62,216,W-125);
      }
    } else {
      ctx.fillText('WASD MOVE • SETAS OU MOUSE MIRAM',62,83);
      ctx.fillText('SEGURE ESPAÇO / CLIQUE PARA ATIRAR • T RECARGA • E USA',62,101,W-125);
      ctx.fillText('Q MÓDULO • R RADAR • F ULTIMATE • SHIFT DIRECIONAL',62,119,W-125);
      ctx.fillText('CUIDADO: ECHOVORE RESPONDE À RESSONÂNCIA.',62,147);
      ctx.fillText('VIGILANTE: DESVIE DA RAJADA E ATINJA O NÚCLEO EXPOSTO.',62,165,W-125);
      ctx.fillText('SAÍDA JUNTO À CHEGADA • K: SINTONIA LOCAL.',62,183);
      ctx.fillText(`M SOM ${citadelAudioEnabled()?'LIGADO':'DESLIGADO'} • EFEITOS OPCIONAIS`,62,201);
    }
    ctx.fillStyle='#9cc9c7';ctx.fillText('P / ESC CONTINUA • L REGISTROS • J MISSÕES • K SINTONIA',62,g.panel==='journal'||g.panel==='missions'||g.panel==='dimension'?229:220);
  }
  const out=canvas.getContext('2d');out.save();out.setTransform(1,0,0,1,0,0);out.imageSmoothingEnabled=false;out.drawImage(buffer,0,0,canvas.width,canvas.height);out.imageSmoothingEnabled=true;out.drawImage(uiBuffer,0,0,canvas.width,canvas.height);out.restore();
}
export function getCitadelRuntime() { return game; }
export function clearCitadelRuntime() { game=null; }
