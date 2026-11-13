// Adaptador autocontido da primeira realidade FPS. Não altera os kits nem o
// inventário do jogo principal; apenas interpreta suas ressonâncias locais.
import { ensureHealth, damagePlayer, healPlayer, updateHealth, respawnPlayer } from './health.js';
import { saveGame } from './save.js';
import { usePortal } from './portals.js';
import { grantArchetypeXp } from './rpg.js';
import { getActiveUltimate } from './ultimate.js';
import { getUnlockState } from './unlocks.js';
import { playCutscene, CITADEL_END_SCENES } from '../ui/cutscene.js';
import { CITADEL_DECOR, CITADEL_ARCHIVES } from '../data/worlds/cidadela-404/cidadela.js';

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
  if (gates[ix] && !flags[gates[ix]]) return 2;
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
    ...(flags.cidadela_estavel?[{kind:'reactor',x:30.4,y:6.5,radius:1.4}]:[])];
  return candidates.map(o=>({...o,distance:Math.hypot(p.x-o.x,p.y-o.y)}))
    .filter(o=>o.distance<o.radius && visible(map,flags,p.x,p.y,o.x,o.y))
    .sort((a,b)=>a.distance-b.distance)[0];
}
export function createCitadelRuntime(progress) {
  const flags = progress.flags ??= {};
  return { angle: 0, enemies: flags.cidadela_estavel ? [] : ENEMY_SEEDS.map(([type,x,y],i) => ({type,x,y,hp:type === 'orb'?75:55, cooldown:1.6+i*.25, slow:0})),
    boss: {type:'boss', x:28, y:6.5, hp:280, cycle:0, cooldown:1.5, dead:!!flags.cidadela_estavel},
    supplies: [{x:4.5,y:9.5},{x:13.5,y:3.5},{x:20.5,y:7.5},{x:24.5,y:9.5}],
    shots: [], impacts: [], ammo: 12, reload: 0, jam: 0, fire: 0, q: 0, scan: 0, dash: 0, shield: 0, echo: 0, echoLock: 0,
    message: 'NEXO-04: A LINHA ESTÁ ABERTA. ENCONTRE OS TRÊS REGISTROS.', messageTime: 8, time: 0, damage: 0, hit: 0, fx: 0, fxKind: '', suppressed: 0, returning: false, panel: null };
}
function notice(g, text, seconds=4) { g.message=text; g.messageTime=seconds; }
function resetAtCheckpoint(state, g) {
  const cp = checkpoints[checkpointIndex(state.progress.flags)];
  respawnPlayer(state.player, cp); g.angle=0; g.shots.length=0; g.impacts.length=0; g.jam=0; g.reload=0; g.ammo=12;
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
    addImpact(g,enemy.x,enemy.y,'cyan'); notice(g,'VIGILANTE: BLINDAGEM FECHADA. AGUARDE O NÚCLEO EXPOSTO.',2); return;
  }
  enemy.hp -= damage; enemy.hurt=.18;
  if (enemy.hp<=0) enemy.death=.7;
  addImpact(g,enemy.x,enemy.y,enemy.type==='echo'?'cyan':'red');
}
function fire(map, flags, p, g) {
  if (g.fire>0 || g.reload>0) return;
  if (g.ammo<=0) { if(g.jam<=0) { g.reload=1.5; notice(g,'RECARREGANDO...',1.5); } return; }
  g.ammo--; g.fire=.23;
  if (g.ammo===0) { g.reload=1.5; notice(g,'RECARREGANDO...',1.5); }
  const target=targetInSight(map,flags,p,g);
  if (target) { if(target.type!=='boss' || bossOpen(target)) g.hit=.25; hurtEnemy(g,target, target.type==='boss'?35:28); }
  else {
    // O disparo do jogador é instantâneo, mas deixa uma marca breve na
    // superfície visível, sem atravessar paredes nem criar física extra.
    const dx=Math.cos(g.angle),dy=Math.sin(g.angle), ray=cast(map,flags,p.x,p.y,dx,dy);
    if (ray.dist<14 && ray.dist>.2) addImpact(g,p.x+dx*(ray.dist-.08),p.y+dy*(ray.dist-.08));
  }
}
function addEcho(g, amount, state) {
  if (state.progress.flags.cidadela_estavel) return;
  g.echo=clamp(g.echo+amount,0,100);
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
function ability(map, flags, p, g, progress) {
  if (g.q>0) return;
  if ((p.energy ?? 0) < 18) { notice(g,'ENERGIA INSUFICIENTE PARA Q',2); return; }
  p.energy-=18;
  const mod=MODULES[progress.archetype] ?? MODULES.motor_bio_forja;
  g.q=6; g.fx=.8; g.fxKind='q'; addEcho(g,24,{player:p,progress,world:{currentMap:map}});
  if (mod.mode==='dominio') {
    for (const e of [...g.enemies,...(g.boss.dead?[]:[g.boss])]) {
      const d=Math.hypot(e.x-p.x,e.y-p.y), a=Math.abs(angleDiff(Math.atan2(e.y-p.y,e.x-p.x)-g.angle));
      if (e.hp>0 && d<3 && a<(e.type==='boss'?.10:.65) && visible(map,flags,p.x,p.y,e.x,e.y)) hurtEnemy(g,e,55);
    }
    notice(g,'RUPTURA • CORTE FRONTAL',1.5);
  } else {
    g.dash=mod.mode==='nucleo'?.34:.22;
    if (mod.mode==='bio') g.shield=2.5;
    if (mod.mode==='mare') for (const e of g.enemies) if (Math.hypot(e.x-p.x,e.y-p.y)<4 && visible(map,flags,p.x,p.y,e.x,e.y)) e.slow=3;
    notice(g,mod.q,1.5);
  }
}
// A sobrecarga conserva nível, custo, recarga e ferramenta selecionada.
// A projeção local é uma onda com linha de visão; o núcleo do chefe mantém
// sua regra de vulnerabilidade mesmo contra F.
function ultimate(map, flags, p, g, progress) {
  const active=getActiveUltimate(progress);
  if (!active || !getUnlockState(progress).features.ultimate) { notice(g,'ULTIMATE LIBERADA NO NÍVEL 3',3); return; }
  p.ultimate ??= {};
  if ((p.ultimate.cooldown ?? 0)>0) { notice(g,'ULTIMATE EM RECARGA',2); return; }
  const def=active.definition;
  if ((p.energy ?? 0)<def.cost) { notice(g,'ENERGIA INSUFICIENTE PARA ULTIMATE',2); return; }
  p.energy-=def.cost; g.fx=1; g.fxKind='ultimate'; p.ultimate.cooldown=def.cooldown; p.ultimate.casts=(p.ultimate.casts ?? 0)+1;
  p.health=Math.min(p.maxHealth,p.health+p.maxHealth*(def.healPct ?? .15));
  for(const e of [...g.enemies,...(g.boss.dead?[]:[g.boss])]) {
    if(e.hp>0 && Math.hypot(e.x-p.x,e.y-p.y)<(def.radius ?? def.range ?? 5) && (e.type!=='boss' || Math.abs(angleDiff(Math.atan2(e.y-p.y,e.x-p.x)-g.angle))<.10) && visible(map,flags,p.x,p.y,e.x,e.y)) hurtEnemy(g,e,def.damage ?? 30);
  }
  if(progress.archetype==='motor_bio_forja') g.shield=4;
  if(progress.archetype==='mare_astral') for(const e of g.enemies) e.slow=3;
  if(progress.archetype==='nucleo_dez_forma') g.dash=.35;
  addEcho(g,32,{player:p,progress,world:{currentMap:map}});
  notice(g,`SOBRECARGA • ${def.name}`,3);
}
function spawnShot(g, from, p, speed, damage, jam=false, counter=null) {
  const a=Math.atan2(p.y-from.y,p.x-from.x);
  g.shots.push({x:from.x,y:from.y,dx:Math.cos(a)*speed,dy:Math.sin(a)*speed,damage,jam,counter,life:5});
}
export function updateCitadel(dt, state, input) {
  const map=state.world.currentMap, p=state.player, progress=state.progress, flags=progress.flags ??= {};
  if (!game || game.map !== map || game.progress !== progress) {
    game=createCitadelRuntime(progress); game.map=map; game.progress=progress;
    Object.assign(p,checkpoints[checkpointIndex(flags)]); p.target=null; p.moving=false;
    ensureHealth(p,progress);
    if (p.health<=0) resetAtCheckpoint(state,game);
    if (flags.cidadela_estavel) showEnding(state,game);
  }
  const g=game, step=clamp(dt,0,.033);
  const pauseRequested=!!state.world.fpsPauseRequested;
  if (pauseRequested) { g.panel='pause'; state.world.fpsPauseRequested=false; }
  // Um Escape pode tanto soltar o mouse quanto chegar como tecla no mesmo
  // quadro. Não trate os dois eventos como pausa seguida de retomada.
  if (!pauseRequested && pressed(input,'p','keyp','escape')) g.panel=g.panel ? null : 'pause';
  if (!pauseRequested && pressed(input,'l','keyl')) g.panel=g.panel==='journal' ? null : 'journal';
  state.world.fpsPaused=!!g.panel;
  if (g.panel) {
    input.fpsFire=false; input.attackClick=null; input.click=null; input.mouseDeltaX=0;
    if (typeof document !== 'undefined' && document.pointerLockElement) document.exitPointerLock?.();
    return;
  }
  g.time+=step;
  for (const k of ['fire','jam','q','scan','dash','shield','echoLock','messageTime','damage','hit','fx','suppressed']) g[k]=Math.max(0,g[k]-step);
  for (const impact of g.impacts) impact.life-=step;
  g.impacts=g.impacts.filter(impact=>impact.life>0);
  if (g.jam<=0) g.reload=Math.max(0,g.reload-step);
  if (g.reload===0 && g.ammo===0) g.ammo=12;
  p.energy=Math.min(p.maxEnergy ?? 100,(p.energy ?? 100)+5*step);
  if (p.ultimate?.cooldown>0) p.ultimate.cooldown=Math.max(0,p.ultimate.cooldown-step);
  const h=updateHealth(p,progress,step,{onRespawn:()=>checkpoints[checkpointIndex(flags)]});
  if (h?.respawned) { resetAtCheckpoint(state,g); }
  if (p.health<=0 || g.returning || state.world.isLoading) return;
  const turn=(held(input,'arrowright')?1:0)-(held(input,'arrowleft')?1:0);
  g.angle+=turn*2.3*step+(input.mouseDeltaX||0)*.0025; input.mouseDeltaX=0;
  const forward=(held(input,'w','keyw','arrowup')?1:0)-(held(input,'s','keys','arrowdown')?1:0);
  const side=(held(input,'d','keyd')?1:0)-(held(input,'a','keya')?1:0);
  const norm=Math.hypot(forward,side)||1, speed=(g.dash>0?6.5:2.8)*(g.suppressed>0?.65:1)*step;
  const f=g.dash>0?1:forward/norm, s=g.dash>0?0:side/norm;
  move(map,flags,p,(Math.cos(g.angle)*f-Math.sin(g.angle)*s)*speed,(Math.sin(g.angle)*f+Math.cos(g.angle)*s)*speed);
  if (pressed(input,'q','keyq')) ability(map,flags,p,g,progress);
  if (pressed(input,'f','keyf')) ultimate(map,flags,p,g,progress);
  if (pressed(input,'r','keyr') && g.scan<=0) {
    g.scan=4; g.fx=.55; g.fxKind='scan'; addEcho(g,18,state);
    const id=progress.archetype;
    if (id==='mare_astral') for(const e of g.enemies) if(Math.hypot(e.x-p.x,e.y-p.y)<4 && visible(map,flags,p.x,p.y,e.x,e.y)) e.slow=Math.max(e.slow,2);
    if (id==='nucleo_dez_forma') g.suppressed=0;
    if (id==='motor_bio_forja') g.shield=Math.max(g.shield,1.2);
    if (id==='lamina_dominio_anciao') g.shield=Math.max(g.shield,1.8);
    const label={mare_astral:'SONAR DE CORRENTE',nucleo_dez_forma:'LEITURA DE VETORES',motor_bio_forja:'DIAGNÓSTICO VIVO',lamina_dominio_anciao:'POSTURA DE DOMÍNIO'}[id] ?? 'RADAR';
    notice(g,`${label} • REGISTROS E AMEAÇAS NO MAPA`,4);
  }
  if (pressed(input,'shift','shiftleft','shiftright') && g.q<=0) { g.dash=.18; g.q=3; g.fx=.4; g.fxKind='dash'; addEcho(g,15,state); }
  if (pressed(input,'t','keyt') && g.reload<=0 && g.jam<=0 && g.ammo<12) { g.ammo=0; g.reload=1.5; }
  if (held(input,' ','space') || pressed(input,' ','space') || input.fpsFire || input.attackClick) fire(map,flags,p,g);
  input.fpsFire=false; input.attackClick=null; input.click=null;
  if (pressed(input,'e','keye')) {
    const target=nearestInteraction(map,flags,p);
    if (target?.kind==='exit') {
      g.returning=true;
      void usePortal({id:'retorno_cidadela',label:'ESTAÇÃO 66.6',destino:{mapId:'estacao_limiar_666',spawnId:'vindo_da_cidadela'}}).then(ok=>{ if(!ok) g.returning=false; });
      return;
    }
    if (target?.kind==='key') {
      flags[target.flag]=true; saveGame(); notice(g,`${target.symbol} ${target.label}: ${target.log} ECLUSA ABERTA.`,7);
    } else if (target?.kind==='archive') {
      const fresh=!flags[target.flag]; flags[target.flag]=true;
      const complete=CITADEL_ARCHIVES.every(a=>flags[a.flag]);
      const grant=complete && !flags.cidadela_arquivo_recompensa;
      if (grant) {
        flags.cidadela_arquivo_recompensa=true;
        const reward=grantArchetypeXp(progress,30);
        notice(g,`ARQUIVO COMPLETO • +${reward.gained} XP. CONSULTE L.`,7);
      } else notice(g,`${target.label}: ${target.log}`,7);
      if (fresh || grant) saveGame();
    } else if (target?.kind==='reactor') {
      notice(g,'REATOR ESTÁVEL • A ROTA DE RETORNO CONTINUA ABERTA.',5);
    }
  }
  // Suprimentos de sessão: não são inventário e não alteram saves antigos.
  for (const supply of g.supplies) {
    if (!supply.used && p.health<p.maxHealth && Math.hypot(p.x-supply.x,p.y-supply.y)<.65 && visible(map,flags,p.x,p.y,supply.x,supply.y)) {
      const healed=healPlayer(p,progress,p.maxHealth*.3);
      if (healed>0) { supply.used=true; notice(g,`SUPRIMENTO • +${Math.round(healed)} VIDA`,2.5); }
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
    else if (sees && d>2.4) { const x=e.x,y=e.y; move(map,flags,e,(p.x-e.x)/d*step*(e.slow?.35:.8),(p.y-e.y)/d*step*(e.slow?.35:.8)); e.moving=e.x!==x || e.y!==y; }
  }
  g.enemies=g.enemies.filter(e=>e.hp>0 || e.death>0);
  const boss=g.boss;
  if (!boss.dead && flags.cidadela_chave_vermelha && p.x>22.7) {
    boss.cycle=(boss.cycle+step)%7.2; boss.cooldown-=step;
    if (boss.cycle>=2 && boss.cycle<4.2 && boss.cooldown<=0 && visible(map,flags,boss.x,boss.y,p.x,p.y)) { spawnShot(g,boss,p,3.7,13); boss.cooldown=.65; }
    if (boss.hp<=0) {
      boss.dead=true; flags.cidadela_estavel=true; g.shots.length=0; g.enemies.length=0;
      if (progress.activeQuest?.id==='embarque_dimensional' && progress.activeQuest.status !== 'completed') {
        progress.activeQuest.stage='cidadela_estavel'; progress.activeQuest.status='completed'; progress.activeQuest.description='Reator estabilizado. Volte à Estação 66.6 ou explore a Cidadela.';
        progress.completedQuests ??= []; if (!progress.completedQuests.includes('embarque_dimensional')) progress.completedQuests.push('embarque_dimensional');
      }
      if (!flags.cidadela_recompensa) { flags.cidadela_recompensa=true; grantArchetypeXp(progress,100); }
      saveGame(); notice(g,'NEXO-04: O REATOR RESPIRA. A ROTA SOBREVIVEU; AINDA HÁ ALGUÉM PARA RESPONDER.',10);
      showEnding(state,g);
    }
  }
  for (const shot of g.shots) {
    const oldX=shot.x,oldY=shot.y;
    shot.x+=shot.dx*step; shot.y+=shot.dy*step; shot.life-=step;
    if (wallAt(map,flags,shot.x,shot.y)) { shot.life=0; addImpact(g,oldX,oldY,shot.jam?'cyan':'red'); }
    else if (Math.hypot(shot.x-p.x,shot.y-p.y)<.33) {
      const hit=damagePlayer(p,progress,g.shield>0?shot.damage*.4:shot.damage,'cidadela');
      if (hit.dealt) {
        g.damage=.35;
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
let buffer, ctx, sprites;
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
  } else if (type==='shot') {
    x.fillStyle='#ff5e55'; x.fillRect(35,49,26,26); x.fillStyle='#ffe5aa'; x.fillRect(42,55,12,14);
  } else if (type==='key') {
    x.fillStyle='#1f3039'; x.fillRect(25,60,46,53); x.fillStyle='#637780'; x.fillRect(29,57,38,8); x.fillStyle='#aefeff'; x.fillRect(32,70,32,25); x.fillStyle='#10272a'; x.fillRect(38,75,20,15); x.fillStyle='#dcffff'; x.fillRect(45,78,6,9);
  } else if (type==='nulo') {
    x.fillStyle='#29444a'; x.fillRect(4,18,88,94); x.fillStyle='#091217'; x.fillRect(10,24,76,80);
    x.strokeStyle='#3c9ba4'; x.lineWidth=2; x.beginPath(); x.moveTo(48,39); x.lineTo(35,61); x.lineTo(27,88); x.moveTo(48,39); x.lineTo(60,62); x.lineTo(70,91); x.moveTo(35,61); x.lineTo(58,62); x.lineTo(53,90); x.moveTo(35,61); x.lineTo(40,90); x.stroke();
    x.fillStyle='#000'; x.fillRect(39,28,18,16); x.strokeStyle='#4ab3b2'; x.strokeRect(39,28,18,16); x.fillStyle='#97ffff'; x.fillRect(17,99,62,2);
  } else if (['generator','crate','barrel','drone','column','reactor','terminal','antenna','vent','beacon'].includes(type)) {
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
  buffer=document.createElement('canvas'); buffer.width=W; buffer.height=H; ctx=buffer.getContext('2d');
  sprites=Object.fromEntries(['imp','echo','orb','boss','shot','key','nulo','exit','supply','impact_red','impact_cyan','generator','crate','barrel','drone','column','reactor','terminal','antenna','vent','beacon'].map(k=>[k,makeSprite(k)]));
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
function drawWorld(map, flags, p, g) {
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
  const objects=[...CITADEL_DECOR.map(o=>({...o,ground:true})),
    ...CITADEL_ARCHIVES.map(a=>({...a,type:'terminal',scale:.72,ground:true})),
    {type:'exit',x:1.65,y:6.5,scale:1.2},{type:'nulo',x:6.5,y:2.3,scale:.75},
    ...KEYS.filter(k=>!flags[k.flag]).map(k=>({...k,type:'key',scale:.7})),
    ...g.supplies.filter(s=>!s.used).map(s=>({...s,type:'supply',scale:.45})),
    ...g.enemies.filter(e=>e.hp>0 || e.death>0).map(e=>({...e,scale:e.type==='orb'?.85:1})),
    ...(!g.boss.dead?[{...g.boss,scale:2.2}]:[]), ...g.shots.map(s=>({...s,type:'shot',scale:.18*(reducedMotion()?1:1+.12*Math.sin(g.time*7))})),
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
    const attack=o.type==='boss' && !bossOpen(g.boss) ?
      (g.boss.cycle>=2 && g.boss.cycle<4.2 ? (sprites.boss_attack ?? sprites.bossClosed) : sprites.bossClosed) :
      (frame==='attack' ? sprites[`${o.type}_attack`] : null);
    const sprite=attack ?? base;
    const h=Math.min(H*4,H/forward*o.scale), w=h*(base.width/base.height), left=center-w/2;
    const bob=!reducedMotion() && o.moving ? Math.sin(g.time*8+o.x)*2 : 0;
    const fall=!reducedMotion() && o.death>0 ? (1-o.death/.7)*12 : 0;
    const top=(o.ground || ['key','supply','exit'].includes(o.type) ? H/2+H/(2*forward)-h : H/2-h*.50)+bob+fall;
    ctx.save();ctx.globalAlpha=o.alpha ?? (o.death>0 && !reducedMotion() ? clamp(o.death/.7,0,1) : (frame==='hurt' && !reducedMotion() ? .7 : 1));
    for(let sx=Math.max(0,Math.floor(left));sx<Math.min(W,Math.ceil(left+w));sx+=2) {
      if(forward>=zbuffer[sx]) continue;
      const tx=clamp(Math.floor((sx-left)/w*sprite.width),0,sprite.width-1);
      ctx.drawImage(sprite,tx,0,1,sprite.height,sx,top,2,h);
    }
    ctx.restore();
    if(center>0 && center<W && forward<zbuffer[Math.floor(center)]) {
      ctx.font='bold 9px monospace';ctx.textAlign='center';
      if(o.type==='key' && forward<7) {
        ctx.fillStyle=o.color;ctx.fillText(`${o.symbol} ${o.label}`,center,top-3);
      } else if(o.windup>0 && forward<8) {
        ctx.fillStyle='#ffd89a';ctx.fillText('! PREPARANDO DISPARO',center,top-3);
      }
    }
  }
}
function drawWeapon(g, mod) {
  const recoil=g.fire>0 && !reducedMotion()?7:0, x=W/2, y=H-26+recoil;
  const weapon=sprites[`weapon_${mod.mode}`];
  if(weapon) {
    const scale=Math.min(172/weapon.width,96/weapon.height);
    const w=weapon.width*scale,h=weapon.height*scale;
    const frame=g.fire>.10 && !reducedMotion() ? (sprites[`weapon_${mod.mode}_fire`] ?? weapon) : weapon;
    ctx.drawImage(frame,x-w/2,H-20-h+recoil,w,h);
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
  if(g.fire>.14){ctx.fillStyle='#ffe9a5';ctx.fillRect(x-7,y-45,14,8);}
}
// Traços da ressonância ficam nas bordas da visão, sem depender de flashes
// ou encobrir o chefe. O módulo decide a geometria, não apenas a cor.
function drawResonance(g,mod) {
  ctx.save();ctx.strokeStyle=mod.color;ctx.lineWidth=2;
  if(g.shield>0) {
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
  if(g.hit>0){ctx.globalAlpha=.9;ctx.strokeStyle='#f4fff5';ctx.beginPath();for(const [x,y] of [[-1,-1],[1,-1],[-1,1],[1,1]]){ctx.moveTo(W/2+x*6,H/2+y*6);ctx.lineTo(W/2+x*10,H/2+y*10);}ctx.stroke();}
  ctx.restore();
}
function drawMap(map,flags,p,g) {
  const scale=3, x0=8,y0=40;
  ctx.fillStyle='rgba(0,12,17,.88)';ctx.fillRect(x0-3,y0-3,102,46);
  for(let y=0;y<map.layout.length;y++)for(let x=0;x<map.layout[y].length;x++) {
    ctx.fillStyle=wallAt(map,flags,x+.5,y+.5)?'#495a5e':'#152b30';ctx.fillRect(x0+x*scale,y0+y*scale,2,2);
  }
  for(const k of KEYS) if(!flags[k.flag]) {ctx.fillStyle=k.color;ctx.fillRect(x0+k.x*scale-1,y0+k.y*scale-1,3,3);}
  for(const s of g.supplies)if(!s.used){ctx.fillStyle='#a0ef9f';ctx.fillRect(x0+s.x*scale,y0+s.y*scale,2,2);}
  for(const a of CITADEL_ARCHIVES)if(!flags[a.flag]){ctx.strokeStyle='#80d0ea';ctx.strokeRect(x0+a.x*scale-2,y0+a.y*scale-2,4,4);}
  for(const e of g.enemies)if(e.hp>0){ctx.fillStyle='#ff6868';ctx.fillRect(x0+e.x*scale,y0+e.y*scale,2,2);}
  ctx.fillStyle='#fff';ctx.fillRect(x0+p.x*scale-2,y0+p.y*scale-2,4,4);
  ctx.strokeStyle='#fff';ctx.beginPath();ctx.moveTo(x0+p.x*scale,y0+p.y*scale);ctx.lineTo(x0+p.x*scale+Math.cos(g.angle)*5,y0+p.y*scale+Math.sin(g.angle)*5);ctx.stroke();
}
export function renderCitadel(canvas,state) {
  if (!game) return;
  setupBuffer();
  const g=game,p=state.player,flags=state.progress.flags,map=state.world.currentMap,mod=MODULES[state.progress.archetype] ?? MODULES.motor_bio_forja;
  ctx.imageSmoothingEnabled=false;drawWorld(map,flags,p,g);drawWeapon(g,mod);drawResonance(g,mod);
  ctx.fillStyle='#d8ffff';ctx.fillRect(W/2-4,H/2,9,1);ctx.fillRect(W/2,H/2-4,1,9);
  if(g.damage>0){ctx.strokeStyle='rgba(255,55,65,.5)';ctx.lineWidth=7;ctx.strokeRect(3,3,W-6,H-6);}
  ctx.fillStyle='rgba(3,12,16,.88)';ctx.fillRect(0,0,W,29);ctx.fillRect(0,H-29,W,29);
  ctx.font='bold 9px monospace';ctx.textAlign='left';ctx.fillStyle=mod.color;ctx.fillText('CIDADELA 404  //  '+mod.name,9,12);
  ctx.fillStyle='#c6d8d7';ctx.fillText('VIDA '+Math.ceil(p.health||0)+'/'+(p.maxHealth||0)+'   MUNIÇÃO '+g.ammo+'/12'+(g.jam?'  RECARGA BLOQUEADA':g.reload?'  RECARREGANDO':''),9,H-16);
  ctx.textAlign='right';ctx.fillStyle='#ff777c';ctx.fillText('ECHOVORE '+Math.floor(g.echo)+'%',W-9,12);
  ctx.fillStyle='#bce9e7';ctx.font='8px monospace';ctx.fillText('ENERGIA '+Math.floor(p.energy ?? 0)+'  Q '+(g.q?Math.ceil(g.q)+'s':'PRONTO')+'  F ULT',W-9,H-16);
  ctx.textAlign='left';ctx.fillStyle='#d9b9ae';ctx.fillText('REGISTROS '+KEYS.map(k=>flags[k.flag]?k.symbol:'□').join(' ')+'  '+(flags.cidadela_estavel?'REATOR ESTÁVEL':flags.cidadela_chave_vermelha?'ALCANCE O REATOR':'ENCONTRE OS REGISTROS'),9,24);
  ctx.textAlign='right';ctx.fillStyle='#9fbfca';ctx.fillText('ARQUIVOS '+CITADEL_ARCHIVES.filter(a=>flags[a.flag]).length+'/3',W-9,24);
  ctx.textAlign='center';ctx.fillStyle='#b7d1d0';ctx.fillText('WASD MOVE · SETAS / MOUSE MIRA · ESPAÇO / CLIQUE ATIRA · E USA · R RADAR · T RECARGA · P PAUSA · L REGISTROS',W/2,H-4,W-12);
  if(g.scan>0) { ctx.strokeStyle=mod.color;ctx.globalAlpha=.35;ctx.lineWidth=1;ctx.beginPath();ctx.arc(W/2,H/2,18,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;drawMap(map,flags,p,g); }
  let prompt='';
  const target=nearestInteraction(map,flags,p);
  if(target?.kind==='exit') prompt='[E] RETORNAR À ESTAÇÃO 66.6';
  if(target?.kind==='key') prompt=`[E] REGISTRO ${target.symbol} ${target.label}`;
  if(target?.kind==='archive') prompt=`[E] ARQUIVO ${target.label}${flags[target.flag]?' • REVER':''}`;
  if(target?.kind==='reactor') prompt='[E] EXAMINAR REATOR';
  for (const [x,k] of [[8,KEYS[0]],[15,KEYS[1]],[22,KEYS[2]]]) if (!prompt && !flags[k.flag] && Math.abs(p.x-x)<1.4 && p.y>4.2 && p.y<8.8) prompt=`ECLUSA ${k.symbol} ${k.label} • BUSQUE O REGISTRO`;
  if(prompt){ctx.fillStyle='rgba(0,0,0,.8)';ctx.fillRect(W/2-130,H/2+34,260,15);ctx.fillStyle='#e6ffff';ctx.font='bold 9px monospace';ctx.fillText(prompt,W/2,H/2+45);}
  if(!g.boss.dead && p.x>22.7) {
    const text=bossOpen(g.boss)?'NÚCLEO EXPOSTO — DISPARE':g.boss.cycle<2?'VIGILANTE — PREPARANDO RAJADA':'RAJADA — DESVIE!';
    ctx.font='bold 9px monospace';ctx.fillStyle=bossOpen(g.boss)?'#abffff':'#ff9081';ctx.fillText(text,W/2,43);
    ctx.fillStyle='#282f32';ctx.fillRect(W/2-70,48,140,4);ctx.fillStyle='#ff5c59';ctx.fillRect(W/2-70,48,140*clamp(g.boss.hp/280,0,1),4);
  }
  if(g.messageTime>0){ctx.font='bold 8px monospace';ctx.fillStyle='rgba(0,8,12,.86)';ctx.fillRect(0,H-55,W,18);ctx.fillStyle='#d1fbf6';ctx.fillText(g.message,W/2,H-43, W-12);}
  if(g.panel) {
    ctx.fillStyle='rgba(1,8,12,.94)';ctx.fillRect(45,35,W-90,H-70);
    ctx.strokeStyle=mod.color;ctx.lineWidth=1;ctx.strokeRect(45,35,W-90,H-70);
    ctx.textAlign='left';ctx.fillStyle=mod.color;ctx.font='bold 13px monospace';
    ctx.fillText(g.panel==='journal'?'ARQUIVO DE MEMÓRIA':'SINAL EM PAUSA',62,58);
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
      ctx.fillText(flags.cidadela_estavel?'REATOR ESTÁVEL • ROTA ABERTA.':'ENCONTRE OS TRÊS REGISTROS E ALCANCE O REATOR.',62,217,W-125);
    } else {
      ctx.fillText('WASD MOVE • SETAS OU MOUSE MIRAM',62,83);
      ctx.fillText('ESPAÇO / CLIQUE DISPARA • T RECARREGA • E INTERAGE',62,101,W-125);
      ctx.fillText('Q MÓDULO • R RADAR • F ULTIMATE • SHIFT IMPULSO',62,119,W-125);
      ctx.fillText('CUIDADO: ECHOVORE RESPONDE À RESSONÂNCIA.',62,147);
      ctx.fillText('VIGILANTE: DESVIE DA RAJADA E ATINJA O NÚCLEO EXPOSTO.',62,165,W-125);
      ctx.fillText('A SAÍDA PERMANECE JUNTO AO PONTO DE CHEGADA.',62,183);
    }
    ctx.fillStyle='#9cc9c7';ctx.fillText('P / ESC CONTINUA • L REGISTROS',62,g.panel==='journal'?229:220);
  }
  const out=canvas.getContext('2d');out.save();out.setTransform(1,0,0,1,0,0);out.imageSmoothingEnabled=false;out.drawImage(buffer,0,0,canvas.width,canvas.height);out.restore();
}
export function getCitadelRuntime() { return game; }
export function clearCitadelRuntime() { game=null; }
