// Adaptador autocontido da primeira realidade FPS. Não altera os kits nem o
// inventário do jogo principal; apenas interpreta suas ressonâncias locais.
import { ensureHealth, damagePlayer, healPlayer, updateHealth, respawnPlayer } from './health.js';
import { saveGame } from './save.js';
import { usePortal } from './portals.js';
import { grantArchetypeXp } from './rpg.js';
import { getActiveUltimate } from './ultimate.js';
import { getUnlockState } from './unlocks.js';
import { playCutscene, CITADEL_END_SCENES, CITADEL_RETURN_SCENES, CITADEL_PROTOCOL_SCENES, CITADEL_MARE_EPILOGUE_SCENES } from '../ui/cutscene.js';
import { citadelAudioEnabled, toggleCitadelAudio, playCitadelSound } from './cidadela-audio.js';
import { CITADEL_DECOR, CITADEL_ARCHIVES, CITADEL_POSTGAME, CITADEL_BREACHES, CITADEL_BREACH_CONSOLE, CITADEL_NULL_MONITORS, CITADEL_ECHOES, CITADEL_ECHO_TERMINAL, CITADEL_ECHO_DECOR, CITADEL_WORKSHOP, CITADEL_ENERGY_CELLS, CITADEL_CRAFT_BENCH, CITADEL_PATROL_CONSOLE, CITADEL_DORMANT_GUARDIAN, CITADEL_BARRELS, CITADEL_SHIELD_CELLS, CITADEL_SECRET_E1M1, CITADEL_OVERDRIVE_CELL, CITADEL_REACTOR_CONSOLE, CITADEL_PROTOCOL_BEACON, sectorNameAt } from '../data/worlds/cidadela-404/cidadela.js';
import { citadelMissions, missionObjective, interactCitadelMission, interactProtocolMission, isCitadelComplete } from './cidadela-missoes.js';
import { sealedFlag, cacheFlag, breachSummary, beginBreach, cancelBreach, updateBreach, openBreachCache } from './cidadela-fendas.js';
import { inspectCitadelMonitor, crtCount, ARCHETYPE_READINGS, crtSignalFragment, archiveContext, keyContext } from './cidadela-narrativa.js';
import { getDimensionProgress, syncDimensionProgress } from './dimension-progress.js';
import { memoryEchoCount,interactMemoryEcho,useEchoTerminal } from './cidadela-ecos.js';
import { workshopPhase,workshopCount,interactWorkshop,workshopCircuitActive,toggleWorkshopTrial,interactWorkshopTrial } from './cidadela-vigilia.js';
import { CITADEL_RECIPES, ensureCitadelMaterials, grantCitadelMaterial, hasRelic, canCraftRecipe, craftCitadelRecipe, startForgeQuestIfAvailable } from './cidadela-sintese.js';

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
  ['imp', 5.5, 8.5], ['imp', 6.5, 4.5],
  ['orb', 11.5, 4.5], ['imp', 13.5, 7.5],
  ['orb', 19.5, 8.5], ['elite', 18.5, 5.5],
  ['imp', 26.5, 4.2], ['orb', 26.5, 8.8],
];
const PATROL_SEEDS = [
  ['imp', 5.5, 8.5], ['orb', 6.2, 4.5],
  ['orb', 11.5, 4.5], ['imp', 13.5, 8.5],
  ['elite', 19.5, 8.5], ['imp', 18.5, 4.5],
  ['elite', 16.5, 17.5],
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
// O radar sugere caminhos pela geometria atual, não uma seta que atravessa
// eclusas. Depois da estabilização, a saída é apenas uma sugestão opcional.
// A busca não altera estado, habilidades, flags ou a missão pós-vitória.
export function citadelNavigation(map,flags={},player={}) {
  const key=flags.cidadela_estavel?null:KEYS.find(k=>!flags[k.flag]);
  const target=flags.cidadela_estavel ? {id:'saida',x:2.5,y:6.5,label:'SAÍDA OPCIONAL'} :
    key ? {id:key.id,x:key.x,y:key.y,label:`${key.symbol} ${key.label.split(' / ')[0]}`,color:key.color} :
    {id:'reator',x:28,y:6.5,label:'REATOR'};
  const start=[Math.floor(player.x),Math.floor(player.y)],goal=[Math.floor(target.x),Math.floor(target.y)];
  if(![...start,...goal].every(Number.isFinite)) return {target,path:[],reachable:false};
  const passable=(x,y)=>canMove(map,flags,x+.5,y+.5,.2);
  if(!passable(...start) || !passable(...goal)) return {target,path:[],reachable:false};
  const keyOf=(x,y)=>`${x},${y}`;
  const queue=[start], parent=new Map([[keyOf(...start),null]]);let end=null;
  for(let i=0;i<queue.length;i++) {
    const [x,y]=queue[i];if(x===goal[0] && y===goal[1]) {end=[x,y];break;}
    for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]) {
      const nx=x+dx,ny=y+dy,k=keyOf(nx,ny);
      if(!parent.has(k) && passable(nx,ny)) {parent.set(k,[x,y]);queue.push([nx,ny]);}
    }
  }
  if(!end) return {target,path:[],reachable:false};
  const path=[];while(end){path.push({x:end[0]+.5,y:end[1]+.5});end=parent.get(keyOf(...end));}
  path.reverse();return {target,path,reachable:true};
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
    {...CITADEL_CRAFT_BENCH,radius:1.1},
    {...CITADEL_SECRET_E1M1,radius:1.1},
    ...(flags.cidadela_estavel?[
      {...CITADEL_REACTOR_CONSOLE,radius:1.15},
      {...CITADEL_PROTOCOL_BEACON,radius:1.15},
      ...CITADEL_WORKSHOP.switches.map(o=>({...o,radius:1.05})),
      {...CITADEL_WORKSHOP.terminal,radius:1.1},
      {kind:'workshop_trial',x:18.3,y:20.2,radius:1},
      {kind:'reactor',x:30.4,y:6.5,radius:1.4},
      {...CITADEL_PATROL_CONSOLE,radius:1.05},
      {...CITADEL_DORMANT_GUARDIAN,radius:1.05},
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
function enemyBaseHp(type) { return type === 'elite' ? 95 : type === 'orb' ? 75 : 55; }
export function createCitadelRuntime(progress) {
  const flags = progress.flags ??= {};
  return { angle: 0, enemies: flags.cidadela_estavel ? [] : ENEMY_SEEDS.map(([type,x,y],i) => ({type,x,y,hp:enemyBaseHp(type), maxHp:enemyBaseHp(type), cooldown:1.6+i*.25, slow:0, strafeDir:i%2?1:-1, strafeTimer:1.2+i*.3})),
    boss: {type:'boss', x:28, y:6.5, hp:280, maxHp:280, cycle:0, cooldown:1.5, dead:!!flags.cidadela_estavel, death:0, shieldFlash:0, phaseTwo:false},
    supplies: [{x:4.5,y:9.5},{x:13.5,y:3.5},{x:20.5,y:7.5},{x:24.5,y:9.5}],
    energyCells: CITADEL_ENERGY_CELLS.map(c=>({...c,used:false})),
    shieldCells: CITADEL_SHIELD_CELLS.map(c=>({...c,used:false})),
    overdriveCells: [{...CITADEL_OVERDRIVE_CELL,used:false}],
    barrels: CITADEL_BARRELS.map((b,i)=>({id:`barrel_${i}`,type:'barrel',...b,hp:20,dead:false})),
    drops: [],
    shots: [], impacts: [], ammo: 12, reload: 0, jam: 0, fire: 0, melee: 0, q: 0, boost: 0, scan: 0, dash: 0, dashAngle:0, shield: 0, guard:0, overdrive: 0, combo: 0, comboTimer: 0, ultBuff:null, echo: 0, echoLock: 0, reactorBoosted: false, killsInRun: 0, sectorSeen: new Set(), clearedSectors: new Set(),
    message: flags.cidadela_100_porcento
      ? 'NEXO-04: CIDADELA 404 100% ESTABILIZADA. TODO O SETOR RESPONDE AO SEU MÓDULO.'
      : flags.cidadela_estavel
        ? 'NEXO-04: REATOR ESTÁVEL. A SONDA AGUARDA NA ARENA; A OFICINA ABRIU AO SUL.'
        : 'NEXO-04: A LINHA ESTÁ ABERTA. ENCONTRE OS TRÊS REGISTROS.', messageTime: 8, time: 0, damage: 0, shieldHit: 0, hit: 0, fx: 0, shake: 0, ultFlash: 0, signalTime:0, signalCooldown:0, signalMonitorId:null, weaponDeploy:0, fxKind: '', suppressed: 0, returning: false, training:false, patrol:false, breach:null, radioQueue:[],stepDistance:0,walkPhase:0,walkBlend:0, echoAnchor:0, echoTerminalCooldown:0, workshopHit:0, workshopTrial:null, localProgress:null, vectorCharge:0, perkIcon:null, panel: null };
}
function notice(g, text, seconds=4) { g.message=text; g.messageTime=seconds; }
function queueRadio(g,text) { if(text && g.radioQueue.length<6) g.radioQueue.push(text); }
function saveCitadelProgress(progress,g) {
  progress.flags ??= {};
  if (!progress.flags.cidadela_100_porcento && isCitadelComplete(progress)) {
    progress.flags.cidadela_100_porcento = true;
    playCitadelSound('trophy');
    queueRadio(g, 'NEXO-04: CIDADELA 404 100% ESTABILIZADA! TROFÉU DE MAESTRIA DESBLOQUEADO NO CÓDEX.');
  }
  const result=syncDimensionProgress(progress);
  g.localProgress=result.after;
  if(result.after && result.before && result.after.rank>result.before.rank) {
    playCitadelSound('rank_up');
    queueRadio(g,`NEXO: SINTONIA LOCAL ${result.after.rank}/4. CONSULTE [K] PARA VER A ADAPTAÇÃO.`);
  }
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
  const base=o.type==='elite'?'imp':o.type;
  if(frame==='death') {
    if(o.type==='elite') return !reduce && (o.death ?? 0)>.38 ? 'elite_fall' : 'elite_death';
    return !reduce && (o.death ?? 0)>.38 ? `${base}_fall` : `${base}_death`;
  }
  if(frame==='attack') return o.type==='elite' ? 'elite_attack' : `${o.type}_attack${!reduce && Math.floor(time*2.5)%2?'_b':''}`;
  if(frame==='hurt') return o.type==='elite' ? 'elite_hurt' : ['imp','orb','echo'].includes(o.type) ? `${base}_hurt` : o.type;
  if(!reduce && o.moving && ['imp','echo','orb','elite'].includes(o.type)) return `${o.type}_walk_${enemyWalkFrame(o,time)}`;
  if(o.type==='nulo') return reduce?'nulo_a':`nulo_${Math.floor(time/3.5)%2?'b':'a'}`;
  return o.type;
}
// Os estados são ligados ao relógio real da IA, não ao tempo global de render.
// A preparação sempre prevalece se ambos os temporizadores estiverem ativos.
export function enemyAttackVisualFrame(enemy,reduce=false) {
  if(reduce || !['imp','orb','echo','elite'].includes(enemy.type) || enemy.hp<=0) return null;
  const base=enemy.type==='elite'?'imp':enemy.type;
  if((enemy.windup ?? 0)>0) return `${base}_charge`;
  if((enemy.attack ?? 0)>0) return `${base}_release`;
  return null;
}
// A mesma arte estática em movimento reduzido; o quadro extra é decorativo.
export function abilityVisualFrame(fx,reduce=false) {
  if(fx<=0) return null;
  if(reduce || fx>.55) return 'base';
  return fx<.4?'tail':'mid';
}
export function ultimateVisualFrame(mode,fx,reduce=false) {
  if(fx<=0) return null;
  if(reduce) return `ultimate_${mode}`;
  const p=clamp(1-fx,0,1);
  if(mode==='mare') return p<.34?'ultimate_mare':p<.68?'ultimate_mare_b':'ultimate_mare_c';
  return (p<.35 || p>.72)?`ultimate_${mode}`:`ultimate_${mode}_b`;
}
export function meleeVisualFrame(mode,fx,reduce=false) {
  if(fx<=0) return null;
  if(reduce || mode!=='mare') return `melee_${mode}`;
  return clamp(1-fx/.32,0,1)<.46?'melee_mare':'melee_mare_b';
}
// Mantém a pose final legível antes do desaparecimento; não muda a duração.
export function enemyDeathAlpha(death,reduce=false) { return reduce?1:clamp(death/.32,0,1); }
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
  if((boss.hp !== undefined && boss.hp<=0) || boss.dead) {
    return !reduce && (boss.death ?? 0)>.7 ? 'boss_fall' : 'boss_death';
  }
  if(bossOpen(boss)) {
    if((boss.hurt ?? 0)>0) return 'boss_hurt';
    return reduce?'boss_open_a':`boss_open_${Math.floor(time*1.4)%2?'b':'a'}`;
  }
  if(boss.cycle>=2 && boss.cycle<4.2) return boss.phaseTwo && !reduce ? 'boss_phase2_attack' : bossAttackSpriteFrame(time,reduce);
  if(boss.cycle>=1.2) return !reduce && boss.cycle>=1.6?'boss_warning_b':'boss_warning';
  if((boss.shieldFlash ?? 0)>0) return 'boss_shield';
  if(boss.phaseTwo) return 'boss_phase2';
  return 'bossClosed';
}
export function weaponVisualFrame(fire,reduce=false,reload=0,jam=0) {
  if(reduce) return 'idle';
  if(fire>0) return fire>.14?'fire':'return';
  if(jam>0 && reload>0) return 'blocked';
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
  g.workshopTrial=null; cancelBreach(g); if(g.training || g.patrol){g.training=false;g.patrol=false;g.enemies.length=0;}
  respawnPlayer(state.player, cp); g.angle=0; g.shots.length=0; g.impacts.length=0; g.jam=0; g.reload=0; g.ammo=12; g.melee=0; g.dash=0; g.shield=0; g.guard=0; g.ultBuff=null; g.vectorCharge=0; g.echoAnchor=0; g.fx=0; g.damage=0; g.hit=0; g.signalTime=0; g.signalCooldown=0; g.signalMonitorId=null; g.weaponDeploy=0; g.walkPhase=0; g.walkBlend=0; g.stepDistance=0; g.moving=false;
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
  const all = [...g.enemies, ...(g.boss.dead ? [] : [g.boss]), ...(g.barrels ?? []).filter(b=>!b.dead)];
  return all.filter(e => e.hp>0).map(e => ({e,d:Math.hypot(e.x-p.x,e.y-p.y),a:Math.abs(angleDiff(Math.atan2(e.y-p.y,e.x-p.x)-g.angle))}))
    .filter(t => t.d<range && t.a < (t.e.type==='boss' ? .055 + .12/Math.max(1,t.d) : cone + .035/Math.max(1,t.d)) && visible(map,flags,p.x,p.y,t.e.x,t.e.y))
    .sort((a,b)=>a.d-b.d)[0]?.e;
}
export function bossOpen(boss) { return boss.cycle >= 4.2 && boss.cycle < 7.2; }
function addImpact(g,x,y,color='red',life=.3) {
  if (g.impacts.length >= 16) g.impacts.shift();
  g.impacts.push({x,y,color,life});
}
export function enemyVisualFrame(enemy) {
  if (enemy.hp<=0) return 'death';
  if ((enemy.windup ?? 0)>0 || (enemy.attack ?? 0)>0) return 'attack';
  if ((enemy.hurt ?? 0)>0) return 'hurt';
  return 'idle';
}
function detonateBarrel(map, flags, p, progress, g, barrel, overcharged=false) {
  if (!barrel || barrel.dead) return;
  barrel.dead = true; barrel.hp = 0;
  playCitadelSound('explosion');
  addImpact(g, barrel.x, barrel.y, 'explosion', .48);
  notice(g, overcharged ? 'BARRIL SOBRECARREGADO POR RESSONÂNCIA!' : 'BARRIL DE ESTÁTICA DETONADO!', 2.2);
  const radius = overcharged ? 3.6 : 2.9;
  const maxDmg = overcharged ? 80 : 62;
  const slowSec = overcharged ? 3.5 : 2;
  for (const e of [...g.enemies, ...(g.boss.dead ? [] : [g.boss])]) {
    if (e.hp <= 0) continue;
    const d = Math.hypot(e.x - barrel.x, e.y - barrel.y);
    if (d < radius && visible(map, flags, barrel.x, barrel.y, e.x, e.y)) {
      if (e.type !== 'boss') e.slow = Math.max(e.slow ?? 0, slowSec);
      hurtEnemy(g, e, Math.round(maxDmg * (1 - d * 0.12)));
    }
  }
  for (const other of (g.barrels ?? [])) {
    if (!other.dead && Math.hypot(other.x - barrel.x, other.y - barrel.y) < radius && visible(map, flags, barrel.x, barrel.y, other.x, other.y)) {
      detonateBarrel(map, flags, p, progress, g, other, overcharged);
    }
  }
  const pd = Math.hypot(p.x - barrel.x, p.y - barrel.y);
  if (pd < 1.8 && visible(map, flags, barrel.x, barrel.y, p.x, p.y) && g.shield <= 0 && g.guard <= 0) {
    damagePlayer(p, progress, 8); g.damage = .32;
  }
}
function hurtEnemy(g, enemy, damage) {
  if (enemy.type === 'boss' && !bossOpen(enemy)) {
    enemy.shieldFlash=.28; playCitadelSound('shield_deflect');
    addImpact(g,enemy.x,enemy.y,'shield'); notice(g,'VIGILANTE: BLINDAGEM FECHADA. AGUARDE O NÚCLEO EXPOSTO.',2); return;
  }
  enemy.hp -= damage; enemy.hurt=.18;
  if (enemy.type==='elite') playCitadelSound('elite_hurt');
  if (enemy.hp<=0) {
    enemy.death=.7;
    g.killsInRun=(g.killsInRun ?? 0)+1;
    g.combo=(g.combo ?? 0)+1;
    g.comboTimer=6;
    if (g.combo>=3 && enemy.type!=='boss') {
      g.pendingEnergy=(g.pendingEnergy ?? 0)+4;
      playCitadelSound('combo_streak');
      notice(g,`SEQUÊNCIA x${g.combo} • +4 ENERGIA`,1.8);
    }
    if(enemy.type==='elite') g.pendingEnergy=(g.pendingEnergy ?? 0)+10;
    if(!enemy.noLoot && enemy.type!=='boss' && !enemy.dropped) {
      enemy.dropped=true;
      g.drops.push({kind:enemy.type==='imp'?'sucata_codigo':'nucleo_estatica',x:enemy.x,y:enemy.y,life:90});
    }
  }
  addImpact(g,enemy.x,enemy.y,enemy.type==='echo'?'cyan':enemy.type==='elite'?'elite':'red');
}
function beginReload(g, progress) { g.reload = progress?.archetype === 'nucleo_dez_forma' ? 1.25 : 1.5; if(g.jam<=0) playCitadelSound('reload'); }
function reloadNotice(g) { notice(g,g.jam>0?'RECARGA NA FILA • AGUARDE O BLOQUEIO.':'RECARREGANDO...',1.5); }
function fire(map, flags, p, progress, g) {
  if (g.fire>0) return;
  // Uma recarga tática pode ser cancelada para usar os projéteis restantes,
  // inclusive enquanto o Echovore bloqueia o progresso da recarga.
  if (g.reload>0) { if(g.ammo<=0) return; g.reload=0; }
  if (g.ammo<=0) { beginReload(g, progress); reloadNotice(g); return; }
  g.ammo--; g.fire=g.overdrive>0 ? .16 : .23; const vectorDamage=g.vectorCharge>0?12:0;g.vectorCharge=0;playCitadelSound('shot');
  if (g.ammo===0) { beginReload(g, progress); reloadNotice(g); }
  const target=targetInSight(map,flags,p,g);
  if (target?.type === 'barrel') { g.hit=.2; detonateBarrel(map,flags,p,progress,g,target); }
  else if (target) {
    if(target.type!=='boss' || bossOpen(target)) g.hit=.25;
    const bossPrecision = (target.type === 'boss' && progress.archetype === 'lamina_dominio_anciao') ? 8 : 0;
    hurtEnemy(g,target, Math.round((target.type==='boss'?35:28)*(1+(g.ultBuff?.basicDamagePct ?? 0)+(g.relicShotBonus ?? 0)+(g.overdrive>0?.35:0)))+vectorDamage+bossPrecision);
  }
  else {
    // O disparo do jogador é instantâneo, mas deixa uma marca breve na
    // superfície visível, sem atravessar paredes nem criar física extra.
    const dx=Math.cos(g.angle),dy=Math.sin(g.angle), ray=cast(map,flags,p.x,p.y,dx,dy);
    if (ray.dist<14 && ray.dist>.2) addImpact(g,p.x+dx*(ray.dist-.08),p.y+dy*(ray.dist-.08),'metal');
  }
}
function meleeBash(map, flags, p, progress, g) {
  if (g.melee > 0) return;
  g.melee = 1.15; g.fx = .32; g.fxKind = 'melee'; g.shake = Math.max(g.shake ?? 0, .14); playCitadelSound('melee');
  const mod = MODULES[progress.archetype] ?? MODULES.motor_bio_forja;
  let hitAny = false, parried = 0, bonusEn = 0;
  for (const shot of g.shots) {
    if (shot.life <= 0) continue;
    const d = Math.hypot(shot.x - p.x, shot.y - p.y), a = Math.abs(angleDiff(Math.atan2(shot.y - p.y, shot.x - p.x) - g.angle));
    if (d < 2.05 && a < .85 && visible(map, flags, p.x, p.y, shot.x, shot.y)) {
      shot.life = 0; parried++;
      addImpact(g, shot.x, shot.y, 'shield');
    }
  }
  if (parried > 0) {
    g.melee = Math.max(.35, g.melee - .4);
    const parryEn = (parried >= 2 ? 7 : 5) * parried;
    p.energy = Math.min(p.maxEnergy ?? 100, (p.energy ?? 0) + parryEn);
    if (parried >= 2) g.shield = Math.max(g.shield, 0.9);
    playCitadelSound(parried >= 2 ? 'parry_double' : 'shield_deflect');
  }
  for (const b of (g.barrels ?? [])) {
    if (b.dead) continue;
    const d = Math.hypot(b.x - p.x, b.y - p.y), a = Math.abs(angleDiff(Math.atan2(b.y - p.y, b.x - p.x) - g.angle));
    if (d < 2.1 && a < .75 && visible(map, flags, p.x, p.y, b.x, b.y)) { detonateBarrel(map, flags, p, progress, g, b); hitAny = true; }
  }
  for (const e of [...g.enemies, ...(g.boss.dead ? [] : [g.boss])]) {
    if (e.hp <= 0) continue;
    const d = Math.hypot(e.x - p.x, e.y - p.y), a = Math.abs(angleDiff(Math.atan2(e.y - p.y, e.x - p.x) - g.angle));
    if (d < 1.95 && a < .72 && visible(map, flags, p.x, p.y, e.x, e.y)) {
      hitAny = true; g.hit = .22;
      const baseDmg = mod.mode === 'dominio' ? 32 : 26;
      hurtEnemy(g, e, Math.round(baseDmg * (1 + (g.relicShotBonus ?? 0) + (g.relicInsignia ? .10 : 0) + (g.overdrive > 0 ? .25 : 0))));
      if (mod.mode === 'mare' && e.hp > 0) e.slow = Math.max(e.slow ?? 0, 2.0);
      if (mod.mode === 'nucleo') bonusEn += 3;
      if (mod.mode === 'bio') g.guard = Math.max(g.guard, 0.5);
      if (e.type !== 'boss' && e.hp > 0) {
        const ka = Math.atan2(e.y - p.y, e.x - p.x);
        const push = mod.mode === 'bio' ? 0.7 : 0.45;
        move(map, flags, e, Math.cos(ka) * push, Math.sin(ka) * push);
      }
    }
  }
  if (bonusEn > 0) p.energy = Math.min(p.maxEnergy ?? 100, (p.energy ?? 0) + bonusEn);
  if (mod.mode === 'bio' && g.shield > 0 && hitAny && p.health < p.maxHealth) healPlayer(p, progress, 2);
  if (parried >= 2) notice(g, `PARRY DUPLO! +${7 * parried} EN • ESCUDO`, 1.8);
  else if (parried > 0) notice(g, `PARRY CINÉTICO • +${5 * parried} EN`, 1.5);
  else if (hitAny) notice(g, mod.mode === 'dominio' ? 'RUPTURA CINÉTICA • CORTE' : mod.mode === 'mare' ? 'PULSO DA MARÉ • LENTIDÃO' : mod.mode === 'nucleo' ? `IMPACTO VETORIAL • +${bonusEn} EN` : 'ARÍETE BIO-FORJA • GUARDA', 1.3);
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
  const cost=g.relicReactor?14:18;
  if ((p.energy ?? 0) < cost) { notice(g,'ENERGIA INSUFICIENTE PARA Q',2); return; }
  p.energy-=cost; playCitadelSound('ability');
  const mod=MODULES[progress.archetype] ?? MODULES.motor_bio_forja;
  const rank=g.localProgress?.rank ?? 1;
  g.perkIcon=rank>=2 ? g.localProgress.skills[rank>=4 && mod.mode==='bio'?1:0].icon : null;
  g.q=(mod.mode==='mare' && g.overdrive>0)?4.5:6; g.fx=.8; g.fxKind='q'; addEcho(g,24,{player:p,progress,world:{currentMap:map}});
  if (mod.mode==='dominio') {
    let qParried=0;
    for (const shot of g.shots) {
      if (shot.life<=0) continue;
      const d=Math.hypot(shot.x-p.x,shot.y-p.y), a=Math.abs(angleDiff(Math.atan2(shot.y-p.y,shot.x-p.x)-g.angle));
      if (d<(rank>=2?3.6:3) && a<.65 && visible(map,flags,p.x,p.y,shot.x,shot.y)) { shot.life=0; qParried++; addImpact(g,shot.x,shot.y,'shield'); }
    }
    if (qParried>0) { p.energy=Math.min(p.maxEnergy ?? 100,(p.energy ?? 0)+5*qParried); playCitadelSound('parry_q'); }
    for (const b of (g.barrels ?? [])) {
      if (!b.dead && Math.hypot(b.x-p.x,b.y-p.y)<(rank>=2?3.6:3) && Math.abs(angleDiff(Math.atan2(b.y-p.y,b.x-p.x)-g.angle))<.65 && visible(map,flags,p.x,p.y,b.x,b.y)) detonateBarrel(map,flags,p,progress,g,b,true);
    }
    for (const e of [...g.enemies,...(g.boss.dead?[]:[g.boss])]) {
      const d=Math.hypot(e.x-p.x,e.y-p.y), a=Math.abs(angleDiff(Math.atan2(e.y-p.y,e.x-p.x)-g.angle));
      if (e.hp>0 && d<(rank>=2?3.6:3) && a<(e.type==='boss'?.10:.65) && visible(map,flags,p.x,p.y,e.x,e.y)) hurtEnemy(g,e,rank>=2?70:55);
    }
    notice(g,qParried>0?`RUPTURA • PARRY +${5*qParried} EN`:'RUPTURA • CORTE FRONTAL',1.5);
  } else {
    startDash(g,input,mod.mode==='nucleo'?(rank>=2?.44:.34):.22);
    if (mod.mode==='nucleo' && rank>=2) g.shield=Math.max(g.shield,1);
    if (mod.mode==='mare' && rank>=2) g.shield=Math.max(g.shield,1.2);
    if (mod.mode==='bio') {g.shield=rank>=2?3.5:2.5;if(rank>=4) healPlayer(p,progress,8);else if(g.shield>0 && p.health<p.maxHealth) healPlayer(p,progress,2);}
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
  p.energy-=def.cost; playCitadelSound('ultimate'); g.fx=1; g.fxKind='ultimate'; g.shake=.45; g.ultFlash=.38; p.ultimate.cooldown=def.cooldown; p.ultimate.casts=(p.ultimate.casts ?? 0)+1;
  healPlayer(p,progress,p.maxHealth*(def.healPct ?? 0));
  // A geometria e o bônus da ferramenta escolhida também são respeitados
  // nesta perspectiva. O buff é local e não atravessa a saída da dimensão.
  const kind=def.kind ?? 'burst', directional=kind==='line' || kind==='dash';
  if(def.buff?.duration>0) g.ultBuff={...def.buff,timeLeft:def.buff.duration};
  if(kind==='guard') g.guard=Math.max(g.guard,def.guard ?? 0);
  if(kind==='dash') startDash(g,input,.3);
  const mareRadius=def.radius ?? def.range ?? 5;
  for(const b of (g.barrels ?? [])) {
    const d=Math.hypot(b.x-p.x,b.y-p.y), angle=Math.abs(angleDiff(Math.atan2(b.y-p.y,b.x-p.x)-g.angle));
    const inArc=!directional || Math.cos(angle)>=(def.arc ?? .25);
    if(!b.dead && d<mareRadius && inArc && visible(map,flags,p.x,p.y,b.x,b.y)) detonateBarrel(map,flags,p,progress,g,b,true);
  }
  for(const e of [...g.enemies,...(g.boss.dead?[]:[g.boss])]) {
    const d=Math.hypot(e.x-p.x,e.y-p.y), angle=Math.abs(angleDiff(Math.atan2(e.y-p.y,e.x-p.x)-g.angle));
    const inArc=!directional || Math.cos(angle)>=(def.arc ?? .25);
    if(e.hp>0 && d<mareRadius && inArc && (e.type!=='boss' || angle<.10) && visible(map,flags,p.x,p.y,e.x,e.y)) {
      hurtEnemy(g,e,Math.round((def.damage ?? 30)*(1+(g.relicInsignia?.10:0))));
      if(progress.archetype==='mare_astral' && e.hp>0) {
        addImpact(g,e.x,e.y,'cyan');
        if(e.type!=='boss') {
          const ka=Math.atan2(e.y-p.y,e.x-p.x);
          move(map,flags,e,Math.cos(ka)*1.15,Math.sin(ka)*1.15);
        }
      }
    }
  }
  if(progress.archetype==='motor_bio_forja') g.shield=Math.max(g.shield,4);
  if(progress.archetype==='mare_astral') {
    for(const e of g.enemies) if(Math.hypot(e.x-p.x,e.y-p.y)<mareRadius && visible(map,flags,p.x,p.y,e.x,e.y)) e.slow=Math.max(e.slow,3);
    for(const shot of g.shots) {
      if(shot.life>0 && Math.hypot(shot.x-p.x,shot.y-p.y)<mareRadius && visible(map,flags,p.x,p.y,shot.x,shot.y)) {
        shot.life=0; addImpact(g,shot.x,shot.y,'shield');
      }
    }
  }
  if(progress.archetype==='nucleo_dez_forma' && kind!=='guard') startDash(g,input,.35);
  addEcho(g,32,{player:p,progress,world:{currentMap:map}});
  notice(g,`SOBRECARGA • ${def.name}`,3);
}
function spawnShot(g, from, p, speed, damage, jam=false, counter=null, angleOffset=0) {
  const a=Math.atan2(p.y-from.y,p.x-from.x)+angleOffset;
  playCitadelSound(from.type==='boss'?'boss_shot':jam?'echo':'enemy');
  const kind=from.type==='boss' && from.phaseTwo?'boss_p2':from.type;
  g.shots.push({x:from.x,y:from.y,dx:Math.cos(a)*speed,dy:Math.sin(a)*speed,damage,jam,counter,kind,breach:from.breach ?? null,life:5});
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
  g.relicShotBonus=hasRelic(progress,'selo_codigo_queimado')?.25:0;
  g.relicReactor=hasRelic(progress,'nucleo_vigilante_forjado');
  g.relicInsignia=hasRelic(progress,'insignia_vigilia_404');
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
  if (g.panel==='craft') {
    if (pressed(input,'e','keye')) {
      g.panel=null; state.world.fpsPaused=false;
      input.fpsFire=false; input.fpsFireHeld=false; input.attackClick=null; input.click=null; input.mouseDeltaX=0;
      return;
    }
    const keys=[['1','digit1'],['2','digit2'],['3','digit3'],['4','digit4'],['5','digit5']];
      for (let i=0;i<CITADEL_RECIPES.length && i<keys.length;i++) {
        if (pressed(input,...keys[i])) {
          const res=craftCitadelRecipe(progress,g,p,CITADEL_RECIPES[i].id);
          if(res.ok) {
            playCitadelSound('craft'); saveCitadelProgress(progress,g);
            if(CITADEL_RECIPES[i].id==='selo_codigo_queimado') queueRadio(g,'NEXO-04: SELO GRAVADO NO CANHÃO. A ESTÁTICA RESPONDE COM +25% DE IMPACTO.');
            if(CITADEL_RECIPES[i].id==='nucleo_vigilante_forjado') queueRadio(g,'NEXO-04: NÚCLEO DO VIGILANTE SINCRONIZADO. HABILIDADE Q CUSTA MENOS E A ENERGIA FLUI MAIS RÁPIDO.');
          }
          notice(g,res.message,5);
          break;
        }
      }
  }
  state.world.fpsPaused=!!g.panel;
  if (g.panel) {
    input.fpsFire=false; input.fpsFireHeld=false; input.attackClick=null; input.click=null; input.mouseDeltaX=0;
    if (typeof document !== 'undefined' && document.pointerLockElement) document.exitPointerLock?.();
    return;
  }
  g.time+=step;
  const jamBefore=g.jam;
  for (const k of ['fire','melee','jam','q','boost','scan','dash','shield','guard','overdrive','comboTimer','echoLock','messageTime','damage','shieldHit','hit','fx','shake','ultFlash','suppressed','vectorCharge','echoAnchor','echoTerminalCooldown','workshopHit','signalTime','signalCooldown','weaponDeploy']) g[k]=Math.max(0,(g[k] ?? 0)-step);
  if(g.comboTimer===0 && g.combo>0) g.combo=0;
  if(g.pendingEnergy>0) { p.energy=Math.min(p.maxEnergy ?? 100,(p.energy ?? 0)+g.pendingEnergy); g.pendingEnergy=0; }
  if(g.boss && g.boss.shieldFlash>0) g.boss.shieldFlash=Math.max(0,g.boss.shieldFlash-step);
  if(g.boss && g.boss.dead && (g.boss.death ?? 0)>0) g.boss.death=Math.max(0,g.boss.death-step);
  if(g.messageTime===0 && g.radioQueue.length) notice(g,g.radioQueue.shift(),6);
  for (const impact of g.impacts) impact.life-=step;
  g.impacts=g.impacts.filter(impact=>impact.life>0);
  const wasReloading=g.reload>0;
  // Se o bloqueio terminar no meio do quadro, só o tempo efetivamente livre
  // conta para a recarga. A pausa já retornou acima sem avançar os relógios.
  const reloadStep=jamBefore>0?Math.max(0,step-jamBefore):step;
  if(wasReloading && jamBefore>0 && g.jam===0 && p.health>0 && !g.returning && !state.world.isLoading) playCitadelSound('reload');
  if(wasReloading) g.reload=Math.max(0,g.reload-reloadStep);
  if (wasReloading && g.reload===0) {g.ammo=12;if(p.health>0 && !g.returning && !state.world.isLoading) playCitadelSound('ready');}
  const buff=g.ultBuff, buffStep=buff?Math.min(step,buff.timeLeft):0;
  if(buff) {
    if(buff.healPerSecond>0 && p.health>0) healPlayer(p,progress,buff.healPerSecond*buffStep);
    buff.timeLeft=Math.max(0,buff.timeLeft-step);
    if(!buff.timeLeft) g.ultBuff=null;
  }
  p.energy=Math.min(p.maxEnergy ?? 100,(p.energy ?? 100)+(5+(g.relicReactor?2:0)+(g.relicInsignia?1:0))*step+(buff?.energyRegen ?? 0)*buffStep);
  if (p.ultimate?.cooldown>0) p.ultimate.cooldown=Math.max(0,p.ultimate.cooldown-step);
  const h=updateHealth(p,progress,step,{onRespawn:()=>checkpoints[checkpointIndex(flags)]});
  if (h?.respawned) { resetAtCheckpoint(state,g); }
  if (p.health<=0 || g.returning || state.world.isLoading) return;
  const turn=(held(input,'arrowright')?1:0)-(held(input,'arrowleft')?1:0);
  g.angle+=turn*2.3*step+(input.mouseDeltaX||0)*.0025; input.mouseDeltaX=0;
  const forward=(held(input,'w','keyw','arrowup')?1:0)-(held(input,'s','keys','arrowdown')?1:0);
  const side=(held(input,'d','keyd')?1:0)-(held(input,'a','keya')?1:0);
  const norm=Math.hypot(forward,side)||1;
  const speed=(g.dash>0?6.5:2.8*(progress.archetype==='mare_astral'?1.1:1))*(1+(g.ultBuff?.moveSpeedPct ?? 0))*(g.suppressed>0?.65:1)*step;
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
    g.stepDistance+=moved;if(g.stepDistance>=.9){g.stepDistance%=.9;playCitadelSound(p.x>=23 || p.y>=12 ? 'step_reactor' : 'step');}
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
    g.scan=4; g.fx=.55; g.fxKind='scan'; playCitadelSound('radar_ping');
    addEcho(g,progress.archetype==='mare_astral' && rank>=4?12:18,state);
    const id=progress.archetype;
    g.perkIcon=rank>=4 && id!=='motor_bio_forja' ? g.localProgress.skills[1].icon : null;
    if (id==='mare_astral') for(const e of g.enemies) if(Math.hypot(e.x-p.x,e.y-p.y)<4 && visible(map,flags,p.x,p.y,e.x,e.y)) e.slow=Math.max(e.slow,rank>=4?3.5:2);
    if (id==='nucleo_dez_forma') {g.suppressed=0;if(rank>=4) g.vectorCharge=5; if((g.combo ?? 0)>=2) p.energy=Math.min(p.maxEnergy ?? 100,(p.energy ?? 0)+4);}
    if (id==='motor_bio_forja') g.shield=Math.max(g.shield,1.2);
    if (id==='lamina_dominio_anciao') {g.shield=Math.max(g.shield,1.8);if(rank>=4) g.guard=Math.max(g.guard,.8);}
    const label={mare_astral:'SONAR DE CORRENTE',nucleo_dez_forma:'LEITURA DE VETORES',motor_bio_forja:'DIAGNÓSTICO VIVO',lamina_dominio_anciao:'POSTURA DE DOMÍNIO'}[id] ?? 'RADAR';
    notice(g,`${label} • MAPA: AMEAÇAS, REGISTROS, ECOS E ${flags.cidadela_estavel?'ROTA À SAÍDA OPCIONAL':'ROTA PRINCIPAL'}.`,4);
  }
  if (pressed(input,'shift','shiftleft','shiftright') && g.boost<=0 && g.dash<=0) { startDash(g,input,progress.archetype==='nucleo_dez_forma'?.22:.18); g.boost=(g.localProgress?.rank ?? 1)>=3?2.4:3; g.fx=.4; g.fxKind='dash'; addEcho(g,15,state); }
  if (pressed(input,'t','keyt') && g.reload<=0 && g.ammo<12) { beginReload(g, progress); if(g.jam>0) reloadNotice(g); }
  if (pressed(input,'v','keyv','c','keyc')) meleeBash(map,flags,p,progress,g);
  if (held(input,' ','space') || pressed(input,' ','space') || input.fpsFire || input.fpsFireHeld || input.attackClick) fire(map,flags,p,progress,g);
  input.fpsFire=false; input.attackClick=null; input.click=null;
  if (pressed(input,'e','keye')) {
    const target=nearestInteraction(map,flags,p);
    if (target?.kind==='exit') {
      g.returning=true; input.fpsFireHeld=false;
      const canShowScenes=typeof document !== 'undefined' && document.body;
      const playReturn=flags.cidadela_estavel && !flags.cidadela_retorno_visto && canShowScenes;
      const playEpilogue=(flags.cidadela_protocolo_concluido || flags.cidadela_100_porcento) && !flags.estacao666_epilogo_visto && canShowScenes;
      void (async () => {
        if(playReturn) { flags.cidadela_retorno_visto=true; saveGame(); await playCutscene(CITADEL_RETURN_SCENES); }
        else if(playEpilogue) { flags.estacao666_epilogo_visto=true; saveGame(); await playCutscene(CITADEL_MARE_EPILOGUE_SCENES); }
        const ok=await usePortal({id:'retorno_cidadela',label:'ESTAÇÃO 66.6',destino:{mapId:'estacao_limiar_666',spawnId:'vindo_da_cidadela'}});
        if(!ok) g.returning=false;
      })();
      return;
    }
    if (target?.kind==='key') {
      flags[target.flag]=true; playCitadelSound('key');
      if (progress.activeQuest?.id==='embarque_dimensional' && progress.activeQuest.status!=='completed') {
        const keyCount=KEYS.filter(k=>flags[k.flag]).length;
        progress.activeQuest.description=keyCount>=3
          ? 'Todas as chaves obtidas! Atravesse a eclusa vermelha e enfrente o Vigilante no Reator.'
          : `Registros recuperados: ${keyCount}/3. Alcance o Reator no fundo da Cidadela 404.`;
      }
      saveCitadelProgress(progress,g); notice(g,`${target.symbol} ${target.label}: ${target.log} ECLUSA ABERTA.`,7);
      const index=KEYS.findIndex(k=>k.id===target.id);
      queueRadio(g,(ARCHETYPE_READINGS[progress.archetype] ?? ARCHETYPE_READINGS.motor_bio_forja)[index]);
      queueRadio(g,keyContext(target.id));
    } else if (target?.kind==='secret_plaque') {
      const fresh=!flags.cidadela_segredo_e1m1;
      flags.cidadela_segredo_e1m1=true;
      const archE1 = {
        mare_astral: 'MARÉ: “A ÁGUA NÃO PEDE CÓDIGO SECRETO — ELA CONTORNA O FOGO.”',
        nucleo_dez_forma: 'NÚCLEO X10: “UM ATALHO DE 1993 NÃO COMPRIME ESTES VETORES.”',
        lamina_dominio_anciao: 'DOMÍNIO: “SÓ OS QUE SUSTENTAM O CORTE ATRAVESSAM O SETOR E1M1.”',
        motor_bio_forja: 'BIO-FORJA: “ARMADURA FORJADA À MÃO VALE MAIS QUE IMUNIDADE DE CONSOLE.”',
      }[progress.archetype] ?? '';
      if (fresh) {
        p.energy=Math.min(p.maxEnergy ?? 100,(p.energy ?? 0)+15);
        const reward=grantArchetypeXp(progress,15);
        playCitadelSound('secret');
        saveCitadelProgress(progress,g);
        notice(g,`SETOR E1M1 // NULO-666: "IDDQD" REJEITADO PELO NÚCLEO — AQUI SÓ A SINTONIA SALVA. +15 EN • +${reward.gained} XP.`,8);
        if (archE1) queueRadio(g, archE1);
      } else {
        notice(g,`PLACA E1M1 // NULO-666: "ATRAVÉS DA ESTÁTICA, NENHUM FOGO QUEIMA QUEM SEGURA A MARÉ." ${archE1}`,7);
      }
    } else if (target?.kind==='protocol_beacon') {
      const pRes = interactProtocolMission(progress, target);
      if (pRes) {
        if (pRes.changed) {
          playCitadelSound(pRes.missionDone ? 'protocol_complete' : 'protocol_step');
          saveCitadelProgress(progress, g);
        }
        notice(g, pRes.message, 8);
        if (pRes.missionDone && !flags.cidadela_protocolo_cena_vista && typeof document !== 'undefined' && document.body) {
          flags.cidadela_protocolo_cena_vista = true;
          g.panel = 'pause'; state.world.fpsPaused = true;
          if (document.pointerLockElement) document.exitPointerLock?.();
          saveGame();
          void playCutscene(CITADEL_PROTOCOL_SCENES);
        }
      }
    } else if (target?.kind==='reactor_console') {
      const s=breachSummary(progress);
      const relics=['selo_codigo_queimado','nucleo_vigilante_forjado','insignia_vigilia_404'].filter(id=>progress.inventory?.includes(id)).length;
      const rondas=flags.cidadela_rondas_concluidas ?? 0;
      const done100=flags.cidadela_100_porcento;
      const pStep=interactProtocolMission(progress, target);
      if (pStep?.changed) { playCitadelSound('protocol_step'); saveCitadelProgress(progress, g); queueRadio(g, pStep.stepMessage); }
      notice(g,`TELEMETRIA DO REATOR • RELÍQUIAS ${relics}/3 • FENDAS ${s.sealed}/3 • OFICINA ${workshopCount(progress)}/3 • RONDAS ${rondas}. ${done100?'CIDADELA 100% ESTABILIZADA — NENHUM DEMÔNIO NA LINHA.':'SIGA OS MARCOS DO [J].'}`,8);
    } else if (target?.kind==='archive') {
      const fresh=!flags[target.flag]; flags[target.flag]=true;
      if(fresh) {
        playCitadelSound('pickup');
        if(progress.archetype==='mare_astral') p.energy=Math.min(p.maxEnergy ?? 100,(p.energy ?? 0)+2);
      }
      const complete=CITADEL_ARCHIVES.every(a=>flags[a.flag]);
      const grant=complete && !flags.cidadela_arquivo_recompensa;
      if (grant) {
        flags.cidadela_arquivo_recompensa=true;
        const reward=grantArchetypeXp(progress,30);
        notice(g,`ARQUIVO COMPLETO • +${reward.gained} XP. ${target.label}: ${target.log}`,7);
      } else notice(g,`${target.label}: ${target.log}`,7);
      // Contexto opcional não altera marcos ou recompensas. O último log
      // aparece no aviso principal mesmo se a fila de rádio estiver cheia.
      if (fresh) queueRadio(g,archiveContext(target.id));
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
    } else if (target?.kind==='crafting_bench') {
      g.panel='craft';
      notice(g,'BANCADA DE SÍNTESE: ESCOLHA UMA RECEITA [1–5] OU [E] PARA FECHAR.',5);
    } else if (target?.kind==='patrol_console') {
      if(g.workshopTrial) notice(g,'ENCERRE O ENSAIO DA OFICINA ANTES DA RONDA.',5);
      else if(g.breach) notice(g,'CANCELE OU CONCLUA A FENDA ANTES DA RONDA.',5);
      else if(g.training) notice(g,'ENCERRE A SIMULAÇÃO DA ARENA ANTES DA RONDA.',5);
      else if(g.patrol) {
        g.patrol=false; g.enemies.length=0; g.shots.length=0;
        notice(g,'RONDA SETORIAL ENCERRADA.',5);
      } else {
        g.patrol=true;
        g.enemies=PATROL_SEEDS.map(([type,x,y],i)=>({type,x,y,hp:enemyBaseHp(type),maxHp:enemyBaseHp(type),cooldown:1.6+i*.25,slow:0,strafeDir:i%2?1:-1,strafeTimer:1.2+i*.3}));
        playCitadelSound('ability');
        notice(g,'RONDA SETORIAL ATIVA: 7 HOSTIS NOS CORREDORES. COLETA DE SUCATA E NÚCLEOS LIBERADA.',7);
      }
    } else if (target?.kind==='dormant_guardian') {
      const archRead = {
        mare_astral: 'MARÉ: A CORRENTE DE RESFRIAMENTO DENTRO DO PEITO AINDA CORRE EM SILÊNCIO.',
        nucleo_dez_forma: 'NÚCLEO: O RELÓGIO INTERNO PAROU EXATAMENTE 3 SEGUNDOS ANTES DA RUPTURA.',
        lamina_dominio_anciao: 'DOMÍNIO: HÁ UM JURAMENTO ANTIGO RISCADO NA LÂMINA DA BLINDAGEM.',
        motor_bio_forja: 'BIO-FORJA: OS REBITES SÃO DA SÉRIE 404 — CONSTRUÍDOS PARA SEGURAR UM REATOR SOZINHOS.',
      }[progress.archetype] ?? '';
      const pStep = interactProtocolMission(progress, target);
      if (pStep?.changed) { playCitadelSound('protocol_step'); saveCitadelProgress(progress, g); queueRadio(g, pStep.stepMessage); }
      notice(g,`${target.label}: ${target.log} ${archRead}`,9);
    } else if (target?.kind==='reactor') {
      if (!g.reactorBoosted && (p.energy ?? 100) < (p.maxEnergy ?? 100)) {
        g.reactorBoosted=true; p.energy=Math.min(p.maxEnergy ?? 100,(p.energy ?? 0)+15);
        playCitadelSound('shield');
        notice(g,'REATOR ESTÁVEL • +15 ENERGIA RESTAURADA. A ROTA CONTINUA ABERTA.',6);
      } else {
        notice(g,'REATOR ESTÁVEL • A ROTA DE RETORNO CONTINUA ABERTA.',5);
      }
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
      else if(g.patrol) {notice(g,'ENCERRE A RONDA SETORIAL ANTES DA SIMULAÇÃO.',5);}
      else if(g.training) {
        g.training=false;g.enemies.length=0;g.shots.length=0;notice(g,'SIMULAÇÃO ENCERRADA. A CIDADELA CONTINUA ESTÁVEL.',5);
      } else {
        g.training=true;
        g.enemies=[{type:'imp',x:28.5,y:6.5,hp:55,maxHp:55,cooldown:2,slow:0,noLoot:true},
          {type:'orb',x:27.5,y:5.5,hp:75,maxHp:75,cooldown:2.5,slow:0,noLoot:true},
          {type:'imp',x:26.5,y:7.5,hp:55,maxHp:55,cooldown:3,slow:0,noLoot:true}];
        notice(g,'SIMULAÇÃO OPCIONAL: 3 ECOS. USE [E] NO NÚCLEO PARA ENCERRAR.',6);
      }
    } else if(target) {
      const pStep = target.kind==='probe' ? interactProtocolMission(progress, target) : null;
      if (pStep?.changed) { playCitadelSound('protocol_step'); saveCitadelProgress(progress, g); queueRadio(g, pStep.stepMessage); }
      const result=interactCitadelMission(progress,target);
      if(result) {
        if(result.changed){
          playCitadelSound(result.missionDone?'mission_complete':result.kind==='relay'?'relay_sync':result.kind==='recording'?'recording_play':'pickup');
          saveCitadelProgress(progress,g);
        }
        notice(g,result.message,7);
        if(target.kind==='recording' && result.changed && citadelMissions(progress).registros===3) {
          queueRadio(g,'NEXO-04: AS TRÊS CAIXAS CONVERGEM — O SINAL DE 3s ANTES VEIO DA RETIRADA NO REATOR E ABRIU A VIGÍLIA.');
        }
      }
    }
  }
  // Suprimentos de sessão: não são inventário e não alteram saves antigos.
  for (const supply of g.supplies) {
    if (!supply.used && p.health<p.maxHealth && Math.hypot(p.x-supply.x,p.y-supply.y)<.65 && visible(map,flags,p.x,p.y,supply.x,supply.y)) {
      const healed=healPlayer(p,progress,p.maxHealth*.3);
      if (healed>0) { supply.used=true; playCitadelSound('pickup'); notice(g,`SUPRIMENTO • +${Math.round(healed)} VIDA`,2.5); }
    }
  }
  // Células de energia e munição de campo para sustentar combates mais longos.
  for (const cell of g.energyCells ?? []) {
    if (!cell.used && ((p.energy ?? 100)<(p.maxEnergy ?? 100) || g.ammo<12) && Math.hypot(p.x-cell.x,p.y-cell.y)<.7 && visible(map,flags,p.x,p.y,cell.x,cell.y)) {
      cell.used=true;
      p.energy=Math.min(p.maxEnergy ?? 100,(p.energy ?? 0)+25);
      g.ammo=Math.min(12,g.ammo+6);
      if(g.reload>0 && g.ammo>=12) g.reload=0;
      playCitadelSound('pickup');
      notice(g,'CÉLULA DE ENERGIA • +25 EN • +6 MUN',2.5);
    }
  }
  // Módulos de blindagem de campo: concedem escudo temporário e energia.
  for (const cell of g.shieldCells ?? []) {
    if (!cell.used && (g.shield<3 || (p.energy ?? 100)<(p.maxEnergy ?? 100)) && Math.hypot(p.x-cell.x,p.y-cell.y)<.7 && visible(map,flags,p.x,p.y,cell.x,cell.y)) {
      cell.used=true;
      g.shield=Math.max(g.shield,4);
      p.energy=Math.min(p.maxEnergy ?? 100,(p.energy ?? 0)+10);
      playCitadelSound('shield');
      notice(g,'BLINDAGEM DE CAMPO • ESCUDO 4s • +10 EN',2.5);
    }
  }
  // Célula de Sobrecarga E1M1: cadência rápida e +35% de dano por 12s.
  for (const cell of g.overdriveCells ?? []) {
    if (!cell.used && Math.hypot(p.x-cell.x,p.y-cell.y)<.75 && visible(map,flags,p.x,p.y,cell.x,cell.y)) {
      cell.used=true;
      g.overdrive=12;
      p.energy=Math.min(p.maxEnergy ?? 100,(p.energy ?? 0)+20);
      playCitadelSound('overdrive');
      notice(g,'SOBRECARGA E1M1 ATIVA (12s) • CADÊNCIA RÁPIDA +35% DANO • +20 EN!',3.5);
    }
  }
  // Coleta automática de materiais caídos por hostis abatidos.
  for (const drop of g.drops ?? []) {
    drop.life-=step;
    if (drop.life>0 && Math.hypot(p.x-drop.x,p.y-drop.y)<.85 && visible(map,flags,p.x,p.y,drop.x,drop.y)) {
      drop.life=0;
      const res=grantCitadelMaterial(progress,drop.kind,1);
      playCitadelSound(drop.kind==='nucleo_estatica'?'rare_drop':'pickup');
      saveCitadelProgress(progress,g);
      notice(g,`COLETA • +1 ${res?.mat?.label ?? drop.kind.toUpperCase()}`,3);
    }
  }
  if (g.drops?.length) g.drops=g.drops.filter(d=>d.life>0);
  if (g.echoLock<=0) {
    if (g.echo>=100) addEcho(g,0,state);
    else g.echo=Math.max(0,g.echo-step*(progress.archetype==='mare_astral'?.84:.7));
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
          if(e.type==='elite' && e.meleeCharge) {
            e.meleeCharge=false;
            if(d<2.35) {
              const hit=g.guard>0?{dealt:0}:damagePlayer(p,progress,g.shield>0?5:12,'cidadela');
              if(hit.dealt) { g.damage=.35; playCitadelSound('damage'); }
              const ka=Math.atan2(p.y-e.y,p.x-e.x);
              move(map,flags,p,Math.cos(ka)*.42,Math.sin(ka)*.42);
              addImpact(g,p.x,p.y,'cyan');
              notice(g,'SENTINELA DE ELITE • ONDA DE CHOQUE!',1.6);
            }
          } else if(e.type==='elite') {
            playCitadelSound('elite_shot');
            spawnShot(g,e,p,3.2,10,false,null,.12);
            spawnShot(g,e,p,3.2,10,false,null,-.12);
          } else {
            spawnShot(g,e,p,counter==='nucleo_dez_forma'?3.8:e.type==='orb'?3.4:2.7,e.type==='orb'?12:8,e.type==='echo',counter);
          }
          e.attack=.22;
        }
        e.meleeCharge=false;
        e.cooldown=e.type==='echo'?2.4:e.type==='elite'?2.7:3;
      }
    } else if (sees && e.cooldown<=0) {
      e.meleeCharge = e.type==='elite' && d<2.2;
      e.windup = e.meleeCharge ? .65 : .75;
    }
    else if (sees && d>2.4) {
      const x=e.x,y=e.y; move(map,flags,e,(p.x-e.x)/d*step*(e.slow?.35:.8),(p.y-e.y)/d*step*(e.slow?.35:.8));
      const moved=Math.hypot(e.x-x,e.y-y); e.moving=moved>0;
      if(e.moving) e.walkPhase=((e.walkPhase ?? 0)+moved*3)%2;
    } else if (sees && d>2.05 && d<=3.7 && e.cooldown>.7) {
      e.strafeTimer=(e.strafeTimer ?? 1.2)-step;
      if(e.strafeTimer<=0){ e.strafeDir=-(e.strafeDir ?? 1); e.strafeTimer=1.3; }
      const x=e.x,y=e.y, sideDir=e.strafeDir ?? 1;
      move(map,flags,e,-(p.y-e.y)/d*sideDir*step*(e.slow?.25:.55),(p.x-e.x)/d*sideDir*step*(e.slow?.25:.55));
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
  if(g.patrol && !g.enemies.some(e=>e.hp>0)) {
    g.patrol=false;
    flags.cidadela_rondas_concluidas=(flags.cidadela_rondas_concluidas ?? 0)+1;
    let xpText='';
    if(!flags.cidadela_ronda_recompensa) {
      flags.cidadela_ronda_recompensa=true;
      const reward=grantArchetypeXp(progress,25);
      xpText=` • +${reward.gained} XP`;
    }
    g.drops.push({kind:'nucleo_estatica',x:CITADEL_PATROL_CONSOLE.x+.5,y:CITADEL_PATROL_CONSOLE.y,life:120});
    saveCitadelProgress(progress,g);
    notice(g,`RONDA SETORIAL #${flags.cidadela_rondas_concluidas} CONCLUÍDA${xpText} • NÚCLEO DE ESTÁTICA LIBERADO NO CONSOLE.`,7);
  }
  if(!flags.cidadela_estavel && !g.training && !g.patrol && !g.breach && (g.killsInRun ?? 0)>0) {
    const sec=p.y>=12?3:p.x<8?0:p.x<15?1:p.x<22?2:3;
    if(sec<3) g.sectorSeen?.add(sec);
    for(const s of [0,1,2]) {
      if(g.sectorSeen?.has(s) && !g.clearedSectors?.has(s) && !g.enemies.some(e=>e.hp>0 && (e.x<8?0:e.x<15?1:e.x<22?2:3)===s)) {
        g.clearedSectors.add(s);
        p.energy=Math.min(p.maxEnergy ?? 100,(p.energy ?? 0)+10);
        playCitadelSound('sector_clear');
        queueRadio(g,`NEXO-04: SETOR 0${s+1} ESTABILIZADO • +10 ENERGIA.`);
      }
    }
  }
  const breachResult=updateBreach(g,progress,step,p,
    (x,y)=>canMove(map,flags,x,y,.25),
    b=>Math.hypot(b.x-p.x,b.y-p.y)>=1.4 && Math.hypot(b.x-p.x,b.y-p.y)<7 && visible(map,flags,b.x,b.y,p.x,p.y),
    b=>spawnShot(g,{type:'breach_shot',x:b.x,y:b.y,breach:b.id},p,3,10));
  if(breachResult) {if(breachResult.changed){playCitadelSound('victory');saveCitadelProgress(progress,g);}notice(g,breachResult.message,6);}
  const boss=g.boss;
  if(!boss.dead) boss.hurt=Math.max(0,(boss.hurt ?? 0)-step);
  if (!boss.dead && boss.hp>0 && flags.cidadela_chave_vermelha && p.x>22.7) {
    if (!boss.phaseTwo && boss.hp<=140) {
      boss.phaseTwo=true; playCitadelSound('phase2');
      notice(g,'VIGILANTE FASE 2: SOBRETENSÃO NO NÚCLEO. DISPAROS EM LEQUE ATIVOS.',5);
      queueRadio(g,'VIGILANTE: CONTENÇÃO CRÍTICA. O REATOR AINDA RESPONDE AO CHAMADO.');
    }
    if (boss.phaseTwo && !boss.phaseTwoLow && boss.hp<=70) {
      boss.phaseTwoLow=true;
      queueRadio(g,'NEXO-04: CHASSI DO VIGILANTE NO LIMITE — ELE SUSTENTOU O REATOR SOZINHO ATÉ AGORA.');
    }
    const prevCycle=boss.cycle;
    const cycleRate=boss.phaseTwo?1.25:1;
    boss.cycle=(boss.cycle+step*cycleRate)%7.2; boss.cooldown-=step;
    if (boss.phaseTwo && prevCycle<1.2 && boss.cycle>=1.2) playCitadelSound('boss_phase2_warn');
    if (prevCycle<4.2 && boss.cycle>=4.2) playCitadelSound('core_open');
    if (boss.cycle>=2 && boss.cycle<4.2 && boss.cooldown<=0 && visible(map,flags,boss.x,boss.y,p.x,p.y)) {
      spawnShot(g,boss,p,boss.phaseTwo?4.0:3.7,13);
      if (boss.phaseTwo) {
        spawnShot(g,boss,p,3.8,11,false,null,.22);
        spawnShot(g,boss,p,3.8,11,false,null,-.22);
      }
      boss.cooldown=boss.phaseTwo?.58:.65;
    }
  }
  // Vitória é resolvida mesmo se o golpe final vier de fora da arena;
  // o último disparo não deve obrigar o jogador a atravessar a eclusa novamente.
  if (!boss.dead && boss.hp<=0) {
    boss.dead=true; boss.death=1.4; playCitadelSound('victory'); playCitadelSound('boss_death'); flags.cidadela_estavel=true; g.shots.length=0; g.enemies.length=0;
    g.drops.push({kind:'nucleo_estatica',x:boss.x-.4,y:boss.y-.3,life:180},{kind:'sucata_codigo',x:boss.x-.4,y:boss.y+.3,life:180});
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
      const bioArmor = (progress.archetype==='motor_bio_forja' && p.health > p.maxHealth*.5) ? .85 : 1;
      const hit=g.guard>0 ? {dealt:0} : damagePlayer(p,progress,(g.shield>0?shot.damage*.4:shot.damage)*bioArmor,'cidadela');
      if (hit.dealt) {
        if(g.shield>0) { g.shieldHit=.28; playCitadelSound('shield_hit'); }
        else { g.damage=.35; playCitadelSound('damage'); }
        if(shot.jam) {
          g.jam=2.5;
          if(shot.counter==='mare_astral') { const length=Math.hypot(shot.dx,shot.dy)||1; move(map,flags,p,-shot.dx/length*.55,-shot.dy/length*.55); }
          if(shot.counter==='nucleo_dez_forma') { g.dash=0; g.suppressed=2; }
          if(shot.counter==='motor_bio_forja') g.shield=0;
          if(shot.counter==='lamina_dominio_anciao') g.q=Math.max(g.q,2);
          notice(g,'ECHOVORE • RECARGA BLOQUEADA POR 2,5s',3);
        }
      } else if(g.guard>0) { g.shieldHit=.22; playCitadelSound('shield_hit'); }
      addImpact(g,oldX,oldY,shot.jam?'cyan':shot.kind==='elite'?'elite':'red'); shot.life=0;
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
  } else if (type==='shot' || type==='shot_echo' || type==='shot_orb' || type==='shot_elite' || type==='shot_boss_p2' || type==='breach_shot') {
    x.fillStyle=type==='shot_echo'?'#68e9e3':type==='shot_orb'?'#cb8fff':type==='shot_elite'?'#ff8b3d':type==='shot_boss_p2'?'#d645ff':'#ff5e55'; x.fillRect(35,49,26,26); x.fillStyle='#fff4dc'; x.fillRect(42,55,12,14);
  } else if (type==='impact_elite') {
    x.fillStyle='#ff8a33'; x.fillRect(32,48,32,32); x.fillStyle='#ffe89c'; x.fillRect(40,56,16,16);
  } else if (type==='impact_cyan') {
    x.fillStyle='#52f0f5'; x.fillRect(32,48,32,32); x.fillStyle='#e4ffff'; x.fillRect(40,56,16,16);
  } else if (type==='key') {
    x.fillStyle='#1f3039'; x.fillRect(25,60,46,53); x.fillStyle='#637780'; x.fillRect(29,57,38,8); x.fillStyle='#aefeff'; x.fillRect(32,70,32,25); x.fillStyle='#10272a'; x.fillRect(38,75,20,15); x.fillStyle='#dcffff'; x.fillRect(45,78,6,9);
  } else if (type==='nulo') {
    x.fillStyle='#29444a'; x.fillRect(4,18,88,94); x.fillStyle='#091217'; x.fillRect(10,24,76,80);
    x.strokeStyle='#3c9ba4'; x.lineWidth=2; x.beginPath(); x.moveTo(48,39); x.lineTo(35,61); x.lineTo(27,88); x.moveTo(48,39); x.lineTo(60,62); x.lineTo(70,91); x.moveTo(35,61); x.lineTo(58,62); x.lineTo(53,90); x.moveTo(35,61); x.lineTo(40,90); x.stroke();
    x.fillStyle='#000'; x.fillRect(39,28,18,16); x.strokeStyle='#4ab3b2'; x.strokeRect(39,28,18,16); x.fillStyle='#97ffff'; x.fillRect(17,99,62,2);
  } else if (type==='elite') {
    x.fillStyle='#2a1a17'; x.fillRect(24,18,48,46); x.fillRect(18,56,60,42); x.fillRect(14,62,14,42); x.fillRect(68,62,14,42); x.fillRect(26,94,16,30); x.fillRect(54,94,16,30);
    x.fillStyle='#8c5938'; x.fillRect(26,14,10,10); x.fillRect(60,14,10,10); x.fillRect(28,50,40,10);
    x.fillStyle='#ff5e3a'; x.fillRect(32,33,12,5); x.fillRect(52,33,12,5); x.fillRect(42,68,12,12);
  } else if (type==='shield_cell') {
    x.fillStyle='#1d2e38'; x.fillRect(22,42,52,52); x.fillStyle='#4f6d7d'; x.fillRect(27,47,42,42);
    x.fillStyle='#55e1ff'; x.fillRect(38,56,20,24); x.fillStyle='#d4fbff'; x.fillRect(44,62,8,12);
  } else if (type==='impact_explosion') {
    x.fillStyle='#ff6a2b'; x.beginPath(); x.arc(48,60,36,0,Math.PI*2); x.fill();
    x.fillStyle='#ffd257'; x.beginPath(); x.arc(48,60,22,0,Math.PI*2); x.fill();
    x.fillStyle='#72f6ff'; x.fillRect(24,57,48,6); x.fillRect(45,36,6,48);
  } else if (['generator','crate','barrel','drone','column','reactor','reactor_stable','terminal','antenna','vent','beacon','probe','relay_off','relay_on','transmitter','transmitter_active','recording','recording_entrada','recording_forja','training','training_active','listening_beacon','signal_fragment','breach_open','breach_sealed','cache_closed','cache_open','breach_console','memory_echo_pending','memory_echo_done','echo_terminal_off','echo_terminal_on','anchor_sleep','anchor_active','lost_recorder','signal_map','emergency_light','memory_relay','workshop_switch_off','workshop_switch_on','workshop_hazard_idle','workshop_hazard_active','workshop_terminal','workshop_core_off','workshop_core_on','workshop_pipes','workshop_bench','workshop_robot','workshop_robot_active','crafting_bench','patrol_console','dormant_guardian','energy_cell','drop_sucata','drop_nucleo','secret_plaque','overdrive_cell','reactor_console','protocol_beacon_off','protocol_beacon_on'].includes(type)) {
    // Silhueta alternativa para partidas offline ou imagens indisponíveis.
    x.fillStyle='#1b3035';x.fillRect(20,34,56,80);x.fillStyle='#557479';x.fillRect(24,38,48,72);
    x.fillStyle='#101b20';x.fillRect(29,45,38,45);x.fillStyle=type==='beacon'?'#ed5d58':type==='barrel'?'#ff8b4a':type==='overdrive_cell'?'#ff4433':type==='drop_sucata'?'#f3b15c':type==='drop_nucleo'?'#d07aff':'#68dedc';x.fillRect(38,57,20,12);
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
  sprites=Object.fromEntries(['imp','echo','orb','elite','boss','shot','shot_echo','shot_orb','shot_elite','key','nulo','exit','supply','shield_cell','impact_red','impact_cyan','impact_explosion','generator','crate','barrel','drone','column','reactor','reactor_stable','terminal','antenna','vent','beacon','probe','relay_off','relay_on','transmitter','transmitter_active','recording','recording_entrada','recording_forja','training','training_active','listening_beacon','signal_fragment','breach_open','breach_sealed','cache_closed','cache_open','breach_console','breach_shot','memory_echo_pending','memory_echo_done','echo_terminal_off','echo_terminal_on','anchor_sleep','anchor_active','lost_recorder','signal_map','emergency_light','memory_relay','workshop_switch_off','workshop_switch_on','workshop_hazard_idle','workshop_hazard_active','workshop_terminal','workshop_core_off','workshop_core_on','workshop_pipes','workshop_bench','workshop_robot','workshop_robot_active','crafting_bench','patrol_console','dormant_guardian','energy_cell','drop_sucata','drop_nucleo','secret_plaque','overdrive_cell','reactor_console'].map(k=>[k,makeSprite(k)]));
  // Fallbacks também cobrem impactos antes do carregamento ou sem imagens.
  sprites.impact_metal=sprites.impact_red; sprites.impact_shield=sprites.impact_cyan;
  // Carregamento tardio: outras dimensões não pagam pelas artes da Cidadela.
  if (typeof Image !== 'undefined') for (const [type,path] of [
    ['imp','assets/sprites/cidadela-404/imp-glitch.png'],
    ['elite','assets/sprites/cidadela-404/imp-elite.png'],
    ['elite_side','assets/sprites/cidadela-404/imp-elite-lateral.png'],
    ['elite_back','assets/sprites/cidadela-404/imp-elite-costas.png'],
    ['elite_hurt','assets/sprites/cidadela-404/imp-elite-dano.png'],
    ['elite_attack','assets/sprites/cidadela-404/imp-elite-ataque.png'],
    ['elite_death','assets/sprites/cidadela-404/imp-elite-colapso.png'],
    ['orb','assets/sprites/cidadela-404/cyber-orbe.png'],
    ['boss','assets/sprites/cidadela-404/vigilante.png'],
    ['boss_phase2','assets/sprites/cidadela-404/vigilante-sobretensao.png'],
    ['boss_core_alert','assets/sprites/cidadela-404/vigilante-nucleo-aviso.png'],
    ['boss_fall','assets/sprites/cidadela-404/vigilante-queda.png'],
    ['boss_death','assets/sprites/cidadela-404/vigilante-colapso.png'],
    ['dormant_guardian','assets/sprites/cidadela-404/vigilante-inerte-acorrentado.png'],
    ['boss_shield','assets/sprites/cidadela-404/vigilante-escudo-impacto.png'],
    ['imp_attack','assets/sprites/cidadela-404/imp-ataque.png'],
    ['orb_attack','assets/sprites/cidadela-404/orbe-ataque.png'],
    ['echo_attack','assets/sprites/cidadela-404/echovore-ataque.png'],
    ['boss_attack','assets/sprites/cidadela-404/vigilante-ataque.png'],
    ['shot','assets/sprites/cidadela-404/projetil-estatica.png'],
    ['shot_echo','assets/sprites/cidadela-404/projetil-echo.png'],
    ['shot_orb','assets/sprites/cidadela-404/projetil-orbe.png'],
    ['shot_elite','assets/sprites/cidadela-404/projetil-elite.png'],
    ['melee_wave','assets/sprites/cidadela-404/golpe-cinetico-pulso.png'],
    ...['mare','nucleo','dominio','bio'].flatMap(mode=>[
      [`melee_${mode}`,`assets/sprites/cidadela-404/melee-${mode}.png`],
      [`ultimate_${mode}`,`assets/sprites/cidadela-404/ultimate-${mode}.png`],
      [`ultimate_${mode}_b`,`assets/sprites/cidadela-404/ultimate-${mode}-b.png`],
    ]),
    ['ultimate_mare_c','assets/sprites/cidadela-404/ultimate-mare-c.png'],
    ['melee_mare_b','assets/sprites/cidadela-404/melee-mare-b.png'],
    ['weapon_mare_pulse','assets/sprites/cidadela-404/canhao-mare-pulso.png'],
    ['hud_weapon_mare_active','assets/sprites/cidadela-404/hud-arma-mare-ativa.png'],
    ['elite_walk_a','assets/sprites/cidadela-404/imp-elite-passo-a.png'],
    ['elite_walk_b','assets/sprites/cidadela-404/imp-elite-passo-b.png'],
    ['elite_side_walk_a','assets/sprites/cidadela-404/imp-elite-lateral-passo-a.png'],
    ['elite_side_walk_b','assets/sprites/cidadela-404/imp-elite-lateral-passo-b.png'],
    ['elite_side_attack','assets/sprites/cidadela-404/imp-elite-lateral-ataque.png'],
    ['elite_side_hurt','assets/sprites/cidadela-404/imp-elite-lateral-dano.png'],
    ['elite_side_death','assets/sprites/cidadela-404/imp-elite-lateral-colapso.png'],
    ['elite_back_attack','assets/sprites/cidadela-404/imp-elite-costas-ataque.png'],
    ['elite_back_hurt','assets/sprites/cidadela-404/imp-elite-costas-dano.png'],
    ['elite_back_death','assets/sprites/cidadela-404/imp-elite-costas-colapso.png'],
    ['elite_fall','assets/sprites/cidadela-404/imp-elite-queda.png'],
    ['boss_phase2_attack','assets/sprites/cidadela-404/vigilante-fase2-ataque.png'],
    ['boss_phase2_attack_b','assets/sprites/cidadela-404/vigilante-fase2-ataque-b.png'],
    ['boss_phase2_warning','assets/sprites/cidadela-404/vigilante-aviso-fase2.png'],
    ['boss_phase2_open','assets/sprites/cidadela-404/vigilante-fase2-aberto.png'],
    ['boss_phase2_hurt','assets/sprites/cidadela-404/vigilante-fase2-dano.png'],
    ['boss_meltdown','assets/sprites/cidadela-404/vigilante-morte-nucleo.png'],
    ['boss_shield_p2','assets/sprites/cidadela-404/vigilante-escudo-fase2.png'],
    ['shot_boss_p2','assets/sprites/cidadela-404/projetil-vigilante-fase2.png'],
    ['impact_elite','assets/sprites/cidadela-404/impacto-elite.png'],
    ['impact_cyan','assets/sprites/cidadela-404/impacto-eco.png'],
    ['probe_100','assets/sprites/cidadela-404/sonda-nexo-100.png'],
    ['protocol_beacon_off','assets/sprites/cidadela-404/baliza-protocolo-final.png'],
    ['protocol_beacon_on','assets/sprites/cidadela-404/sonda-nexo-protocolo.png'],
    ['relic_insignia','assets/sprites/cidadela-404/reliquia-insignia-vigilia.png'],
    ['hud_rank_max','assets/sprites/cidadela-404/hud-rank-max.png'],
    ['hud_combo','assets/sprites/cidadela-404/hud-combo-emblema.png'],
    ['hud_overdrive','assets/sprites/cidadela-404/hud-sobrecarga-icone.png'],
    ...['mare','nucleo','dominio','bio'].map(mode=>[`hud_weapon_${mode}`,`assets/sprites/cidadela-404/hud-arma-${mode}.png`]),
    ['recording_galeria','assets/sprites/cidadela-404/registro-galeria.png'],
    ['wall_gallery','assets/sprites/cidadela-404/parede-galeria.png'],
    ['wall_forge','assets/sprites/cidadela-404/parede-forja.png'],
    ['floor_office','assets/sprites/cidadela-404/piso-oficina.png'],
    ['floor_corridor','assets/sprites/cidadela-404/piso-corredor.png'],
    ['ceiling_citadel','assets/sprites/cidadela-404/teto-cidadela.png'],
    ['ceiling_gallery','assets/sprites/cidadela-404/teto-galeria.png'],
    ['ceiling_arena','assets/sprites/cidadela-404/teto-arena.png'],
    ['ceiling_workshop','assets/sprites/cidadela-404/teto-oficina.png'],
    ['wall_corridor','assets/sprites/cidadela-404/parede-corredor-entrada.png'],
    ['overdrive_cell','assets/sprites/cidadela-404/celula-sobrecarga-doom.png'],
    ['secret_plaque','assets/sprites/cidadela-404/placa-secreta-404.png'],
    ['reactor_console','assets/sprites/cidadela-404/prop-console-reator.png'],
    ['floor_arena','assets/sprites/cidadela-404/piso-arena.png'],
    ['trophy_citadel','assets/sprites/cidadela-404/trofeu-cidadela-404.png'],
    ['relic_selo','assets/sprites/cidadela-404/reliquia-selo-codigo.png'],
    ['relic_nucleo','assets/sprites/cidadela-404/reliquia-nucleo-vigilante.png'],
    ['hud_sucata','assets/sprites/cidadela-404/drop-sucata-hud.png'],
    ['hud_nucleo','assets/sprites/cidadela-404/drop-nucleo-hud.png'],
    ['recording_entrada','assets/sprites/cidadela-404/registro-entrada.png'],
    ['recording_forja','assets/sprites/cidadela-404/registro-forja.png'],
    ['wall_arena','assets/sprites/cidadela-404/parede-arena.png'],
    ...['mare','nucleo','dominio','bio'].flatMap(mode=>[
      [`muzzle_${mode}`,`assets/sprites/cidadela-404/disparo-${mode}.png`],
      [`seal_${mode}`,`assets/sprites/cidadela-404/selo-${mode}.png`],
    ]),
    ['echo','assets/sprites/cidadela-404/predador-echovore.png'],
    ['key','assets/sprites/cidadela-404/terminal-memoria.png'],
    ['exit','assets/sprites/cidadela-404/portal-retorno.png'],
    ['nulo','assets/sprites/cidadela-404/monitor-nulo.png'],
    ['crafting_bench','assets/sprites/cidadela-404/bancada-sintese.png'],
    ['patrol_console','assets/sprites/cidadela-404/terminal-ronda.png'],
    ['energy_cell','assets/sprites/cidadela-404/suprimento-energia.png'],
    ['shield_cell','assets/sprites/cidadela-404/escudo-campo.png'],
    ['barrel','assets/sprites/cidadela-404/barril-estatica.png'],
    ['impact_explosion','assets/sprites/cidadela-404/barril-explosao.png'],
    ['reactor_stable','assets/sprites/cidadela-404/prop-reator-estavel.png'],
    ['workshop_robot_active','assets/sprites/cidadela-404/vigilia-sentinela-ativo.png'],
    ['training_active','assets/sprites/cidadela-404/nucleo-treino-ativo.png'],
    ['transmitter_active','assets/sprites/cidadela-404/painel-transmissor-ativo.png'],
    ['wall_workshop','assets/sprites/cidadela-404/parede-oficina.png'],
    ['drop_sucata','assets/sprites/cidadela-404/drop-sucata-codigo.png'],
    ['drop_nucleo','assets/sprites/cidadela-404/drop-nucleo-estatica.png'],
    ['probe_b','assets/sprites/cidadela-404/sonda-nexo-pulso.png'],
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
    ...[['imp_side_death','memoria-imp-lateral-colapso'],['imp_back_death','memoria-imp-costas-colapso'],
      ['orb_side_death','memoria-orbe-lateral-colapso'],['orb_back_death','memoria-orbe-costas-colapso'],
      ['echo_side_death','memoria-echo-lateral-colapso'],['echo_back_death','memoria-echo-costas-colapso'],
      ['archive_origem','memoria-arquivo-origem'],['archive_retorno','memoria-arquivo-retorno'],
      ['archive_memoria','memoria-arquivo-memoria'],['archive_read','memoria-arquivo-lido']]
      .map(([type,name])=>[type,`assets/sprites/cidadela-404/${name}.png`]),
    ...[['imp_charge','ritmo-imp-carga'],['imp_release','ritmo-imp-disparo'],
      ['orb_charge','ritmo-orbe-carga'],['orb_release','ritmo-orbe-disparo'],
      ['echo_charge','ritmo-echo-carga'],['echo_release','ritmo-echo-disparo'],
      ...['mare','nucleo','dominio','bio'].map(mode=>[`ability_${mode}_mid`,`ritmo-habilidade-${mode}`])]
      .map(([type,name])=>[type,`assets/sprites/cidadela-404/${name}.png`]),
    ...[['imp_side_release','resposta-imp-lateral-disparo'],['imp_back_release','resposta-imp-costas-disparo'],
      ['orb_side_release','resposta-orbe-lateral-disparo'],['orb_back_release','resposta-orbe-costas-disparo'],
      ['echo_side_release','resposta-echo-lateral-disparo'],['echo_back_release','resposta-echo-costas-disparo'],
      ...['mare','nucleo','dominio','bio'].map(mode=>[`weapon_${mode}_blocked`,`resposta-recarga-${mode}`])]
      .map(([type,name])=>[type,`assets/sprites/cidadela-404/${name}.png`]),
    ...[['key_azul','rota-terminal-azul'],['key_amarela','rota-terminal-amarela'],['key_vermelha','rota-terminal-vermelha'],
      ['route_azul','rota-icone-azul'],['route_amarela','rota-icone-amarela'],['route_vermelha','rota-icone-vermelha'],
      ['route_reator','rota-icone-reator'],['route_saida','rota-icone-saida'],
      ['route_guide','rota-icone-guia'],['route_journal','rota-icone-diario']]
      .map(([type,name])=>[type,`assets/sprites/cidadela-404/${name}.png`]),
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
  const inArena = p.x >= 22 && p.y < 11, inWorkshop = p.y >= 11, inInner = p.x >= 8 && p.x < 22 && p.y < 11;
  ctx.fillStyle=inArena?'#130d12':inWorkshop?'#0d1414':'#09121a';ctx.fillRect(0,0,W,H/2);
  ctx.fillStyle=inArena?'#191315':inWorkshop?'#141c1a':'#111b1d';ctx.fillRect(0,H/2,W,H/2);
  const ceilingTex=inArena?(sprites.ceiling_arena ?? sprites.ceiling_citadel):inWorkshop?(sprites.ceiling_workshop ?? sprites.ceiling_citadel):inInner?(sprites.ceiling_gallery ?? sprites.ceiling_citadel):sprites.ceiling_citadel;
  if (ceilingTex) {
    ctx.save();ctx.globalAlpha=inArena?.20:inWorkshop?.20:.16;ctx.drawImage(ceilingTex,0,29,W,H/2-43);ctx.restore();
  }
  if (inArena && sprites.floor_arena) {
    ctx.save();ctx.globalAlpha=.22;ctx.drawImage(sprites.floor_arena,0,H/2+14,W,H/2-14);ctx.restore();
  } else if (inWorkshop && sprites.floor_office) {
    ctx.save();ctx.globalAlpha=.24;ctx.drawImage(sprites.floor_office,0,H/2+14,W,H/2-14);ctx.restore();
  } else if (sprites.floor_corridor) {
    ctx.save();ctx.globalAlpha=.20;ctx.drawImage(sprites.floor_corridor,0,H/2+14,W,H/2-14);ctx.restore();
  }
  // Placas convergentes de teto e piso são baratas (sem floor casting).
  // A cor dos trilhos diferencia o espaço industrial sem flashes.
  for(let i=0;i<8;i++) {
    const x=(i-3.5)*125;
    ctx.strokeStyle=i%3===0?(inArena?'rgba(255,95,95,.12)':inWorkshop?'rgba(232,190,115,.12)':'rgba(85,158,151,.12)'):'rgba(90,115,120,.13)';ctx.lineWidth=1;
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
    const wall=ray.tile===2 ? sprites.wall_gate : (ray.y>=11 ? (sprites.wall_workshop ?? sprites.wall_metal) : (ray.x>=23 ? (sprites.wall_arena ?? sprites.wall_brick) : (ray.x>=16 ? (sprites.wall_forge ?? sprites.wall_corridor ?? sprites.wall_metal) : (ray.x>=9 ? (sprites.wall_gallery ?? sprites.wall_brick) : (sprites.wall_corridor ?? sprites.wall_metal)))));
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
      const gateRgb=ray.x===22?'255,82,97':ray.x===15?'255,209,102':'85,240,228';
      ctx.fillStyle=`rgba(${gateRgb},${fog*.65})`;ctx.fillRect(x,top+height*scan,2,Math.max(1,height*.03));
    }
    else if ((ray.x+ray.y)%5===0 && ray.frac>.15 && ray.frac<.85) {ctx.fillStyle=`rgba(255,34,51,${fog*.7})`;ctx.fillRect(x,top+height*.14,2,Math.max(1,height*.025));}
  }
  const mission=flags.cidadela_estavel ? citadelMissions(progress) : null;
  const post=mission ? [
    ...CITADEL_WORKSHOP.decor.map(o=>({...o,type:o.type==='workshop_robot' && g.workshopTrial?'workshop_robot_active':o.type,ground:true})),
    {...CITADEL_WORKSHOP.terminal,type:'workshop_terminal',scale:.63,ground:true},
    {...CITADEL_WORKSHOP.core,type:flags.cidadela_vigilia_concluida?'workshop_core_on':'workshop_core_off',scale:.7,ground:true},
    ...CITADEL_WORKSHOP.switches.flatMap(o=>{
      const active=workshopCircuitActive(progress,g,o);
      const phase=active?workshopPhase(g.time,o.offset):'disabled';
      return [{...o,type:active?'workshop_switch_off':'workshop_switch_on',scale:.52,ground:true},
        {...o.emitter,type:phase==='active'?'workshop_hazard_active':'workshop_hazard_idle',phase,scale:.36,ground:true}];
    }),
    {...CITADEL_POSTGAME.sonda,type:(flags.cidadela_100_porcento && sprites.probe_100)?'probe_100':(!reducedMotion() && Math.floor(g.time*1.6)%2===1 && sprites.probe_b)?'probe_b':'probe'},
    {...CITADEL_POSTGAME.transmissor,type:mission.vozes.status==='completed'?'transmitter_active':'transmitter',ground:true},
    {...CITADEL_POSTGAME.treino,type:g.training?'training_active':'training',ground:true},
    {...CITADEL_PATROL_CONSOLE,type:'patrol_console',scale:.62,ground:true},
    {...CITADEL_REACTOR_CONSOLE,type:'reactor_console',scale:.64,ground:true},
    {...CITADEL_PROTOCOL_BEACON,type:flags.cidadela_protocolo_concluido?'protocol_beacon_on':'protocol_beacon_off',scale:.72,ground:true},
    {...CITADEL_DORMANT_GUARDIAN,type:'dormant_guardian',scale:1.65,ground:true},
    ...CITADEL_POSTGAME.reles.map((o,i)=>({...o,type:mission.rede.objectives[i].done?'relay_on':'relay_off',ground:true})),
    ...CITADEL_POSTGAME.registros.map(o=>({...o,type:o.id==='entrada'?'recording_entrada':o.id==='galeria'?'recording_galeria':o.id==='forja'?'recording_forja':'recording',ground:true})),
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
    ...CITADEL_DECOR.map(o=>({...o,type:o.type==='reactor' && flags.cidadela_estavel?'reactor_stable':o.type,ground:true})),
    {...CITADEL_CRAFT_BENCH,type:'crafting_bench',scale:.74,ground:true},
    {...CITADEL_SECRET_E1M1,type:'secret_plaque',scale:.62,ground:true},
    ...CITADEL_ARCHIVES.map(a=>({...a,type:'terminal',archiveId:a.id,scale:.72,ground:true})),
    {type:'exit',x:1.65,y:6.5,scale:1.2},
    ...CITADEL_NULL_MONITORS.map(m=>({...m,type:'nulo',scale:.56,signal:g.signalTime>0 && g.signalMonitorId===m.id})),
    ...KEYS.filter(k=>!flags[k.flag]).map(k=>({...k,type:'key',scale:.7})),
    ...g.supplies.filter(s=>!s.used).map(s=>({...s,type:'supply',scale:.45})),
    ...(g.energyCells ?? []).filter(c=>!c.used).map(c=>({...c,type:'energy_cell',scale:.44,ground:true})),
    ...(g.shieldCells ?? []).filter(c=>!c.used).map(c=>({...c,type:'shield_cell',scale:.42,ground:true})),
    ...(g.overdriveCells ?? []).filter(c=>!c.used).map(c=>({...c,type:'overdrive_cell',scale:.46,ground:true})),
    ...(g.barrels ?? []).filter(b=>!b.dead).map(b=>({...b,type:'barrel',scale:.62,ground:true})),
    ...(g.drops ?? []).map(d=>({...d,type:d.kind==='sucata_codigo'?'drop_sucata':'drop_nucleo',scale:.38,ground:true,alpha:d.life<6?clamp(d.life/6,0,1):1})),
    ...g.enemies.filter(e=>e.hp>0 || e.death>0).map(e=>({...e,scale:e.type==='elite'?1.12:e.type==='orb'?.85:1})),
    ...(!g.boss.dead || (g.boss.death ?? 0)>0?[{...g.boss,scale:2.2}]:[]),
    ...g.shots.flatMap(s=>{
      const type=s.kind==='echo'?'shot_echo':s.kind==='orb'?'shot_orb':s.kind==='elite'?'shot_elite':s.kind==='boss_p2'?'shot_boss_p2':s.kind==='breach_shot'?'breach_shot':'shot';
      const main={...s,type,scale:(s.kind==='boss_p2'?.24:s.kind==='elite'?.23:.18)*(reducedMotion()?1:1+.12*Math.sin(g.time*7))};
      if(reducedMotion() || wallAt(map,flags,s.x-s.dx*.08,s.y-s.dy*.08)) return [main];
      return [main,{...main,x:s.x-s.dx*.08,y:s.y-s.dy*.08,scale:.11,alpha:.3}];
    }),
    ...g.impacts.map(i=>({...i,type:`impact_${i.color}`,scale:i.color==='explosion'?.95+(0.48-i.life)*.8:.22+(0.3-i.life)*.4,alpha:clamp(i.life/(i.color==='explosion'?.48:.3),0,1)}))];
  // Ordena em profundidade de câmera (não por distância radial), para que
  // billboards fora do centro sejam encobertos corretamente por outros.
  objects.sort((a,b)=>((b.x-p.x)*dirX+(b.y-p.y)*dirY)-((a.x-p.x)*dirX+(a.y-p.y)*dirY));
  for(const o of objects) {
    const dx=o.x-p.x,dy=o.y-p.y, forward=dx*dirX+dy*dirY, lateral=-dx*dirY+dy*dirX;
    if(forward<.15) continue;
    const center=W/2+(lateral/forward)*(W/(2*plane));
    const base=sprites[o.type] ?? sprites.bossClosed ?? sprites.boss;
    const frame=enemyVisualFrame(o);
    let visual=citadelSpriteFrame(o,g.time,reducedMotion()), flip=false, directionalBase=null;
    if(['idle','attack','hurt','death'].includes(frame) && ['imp','orb','echo','elite'].includes(o.type)) {
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
        } else if(frame==='attack' || frame==='hurt' || frame==='death') {
          // Com movimento reduzido, a queda intermediária é omitida, mas o
          // colapso final conserva a direção. Fallback: a mesma ação frontal.
          const actionFrame=frame==='death' ? (!reducedMotion() && (o.death ?? 0)>.38?'fall':'death') : frame==='attack' && !reducedMotion() && (o.windup ?? 0)<=0 && (o.attack ?? 0)>0 ? 'release' : frame;
          let action=`${o.type}_${view.view}_${actionFrame}`;
          // Não substitua uma pose direcional existente pela vista frontal
          // enquanto o novo quadro de disparo estiver carregando.
          if((actionFrame==='release' || (o.type==='elite' && actionFrame==='fall')) && !sprites[action]) action=`${o.type}_${view.view}_${actionFrame==='fall'?'death':'attack'}`;
          if(sprites[action]) {visual=action;flip=view.flip;directionalBase=sprites[idle] ?? sprites[action];}
        }
      }
    }
    // Nos demais ângulos mantêm-se as poses direcionais e seu espelho.
    if(frame==='attack' && enemyView(o.facing,o.x,o.y,p.x,p.y).view==='front') {
      const stage=enemyAttackVisualFrame(o,reducedMotion());
      if(stage && sprites[stage]) visual=stage;
    }
    if(o.type==='key' && sprites[`key_${o.id}`]) visual=`key_${o.id}`;
    if(o.archiveId && sprites[`archive_${o.archiveId}`]) visual=`archive_${o.archiveId}`;
    if(o.type==='boss') {
      visual=bossVisualFrame(g.boss,g.time,reducedMotion());
      if(!reducedMotion() && g.boss.dead && (g.boss.death ?? 0)>.85 && sprites.boss_meltdown) visual='boss_meltdown';
      else if(!reducedMotion() && g.boss.phaseTwo) {
        if(visual==='boss_shield' && sprites.boss_shield_p2) visual='boss_shield_p2';
        else if((visual==='boss_warning' || visual==='boss_warning_b') && sprites.boss_phase2_warning) visual='boss_phase2_warning';
        else if(visual==='boss_phase2_attack' && Math.floor(g.time*2.5)%2===1 && sprites.boss_phase2_attack_b) visual='boss_phase2_attack_b';
        else if((visual==='boss_open_a' || visual==='boss_open_b') && sprites.boss_phase2_open) visual='boss_phase2_open';
        else if(visual==='boss_hurt' && sprites.boss_phase2_hurt) visual='boss_phase2_hurt';
      }
    }
    const chosen=sprites[visual];
    const bossFallback=o.type==='boss' ? (visual==='boss_meltdown'?(sprites.boss_fall ?? sprites.boss_death ?? sprites.bossClosed) : visual==='boss_shield_p2'?(sprites.boss_shield ?? sprites.bossClosed) : visual==='boss_phase2_warning'?(sprites.boss_warning ?? sprites.bossClosed) : visual==='boss_phase2_attack_b'?(sprites.boss_phase2_attack ?? sprites.boss_attack_b ?? sprites.boss_attack) : visual==='boss_phase2_open'?(sprites.boss_open_a ?? sprites.bossClosed) : visual==='boss_phase2_hurt'?(sprites.boss_hurt ?? sprites.bossClosed) : visual==='boss_phase2_attack'?(sprites.boss_attack_b ?? sprites.boss_attack) : visual==='boss_attack_b'?sprites.boss_attack : visual==='boss_warning_b'?sprites.boss_warning : (visual==='boss_fall'||visual==='boss_death')?(sprites.boss_death ?? sprites.bossClosed) : visual==='boss_shield'?(sprites.boss_shield ?? sprites.bossClosed) : visual==='boss_phase2'?(sprites.boss_phase2 ?? sprites.bossClosed) : bossOpen(g.boss)?sprites.boss_open_a : sprites.bossClosed) : null;
    const sprite=chosen ?? (frame==='attack'?sprites[`${o.type}_attack`]:null) ?? bossFallback ?? base;
    const aspect=directionalBase ?? (visual.includes('_walk_') ? sprite : base);
    const h=Math.min(H*4,H/forward*o.scale), w=h*(aspect.width/aspect.height), left=center-w/2;
    // Aviso da fenda também existe em movimento reduzido; os demais brilhos
    // são decorativos e não substituem as legendas de combate.
    const pulse=sprites[citadelPulseFrame(o.type,o.windup,g.scan,g.time,reducedMotion())];
    const alpha=o.alpha ?? (o.death>0 ? enemyDeathAlpha(o.death,reducedMotion()) : 1);
    const bob=reducedMotion()?0:o.moving?Math.sin(g.time*8+o.x)*2:
      (['memory_echo_pending','memory_relay','drop_sucata','drop_nucleo','energy_cell','shield_cell','probe','probe_b','probe_100','protocol_beacon_on'].includes(o.type)?Math.sin(g.time*2.1+o.x)*1.5:0);
    // Os frames gerados são próximos entre si. Um pequeno deslocamento das
    // pernas realça a passada sem girar o cenário ou modificar colisões.
    const stride=!directionalBase && !reducedMotion() && o.moving && (o.type==='imp'||o.type==='echo') ? Math.round(Math.sin(g.time*8+o.x)*2) : 0;
    const fall=!reducedMotion() && o.death>0 && o.type!=='boss' ? (1-o.death/.7)*12 : 0;
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
        ctx.fillStyle='#ffd89a';ctx.fillText(o.type==='breach_open'?'! PULSO: DESVIE':o.meleeCharge?'! INVESTIDA DE CHOQUE':'! PREPARANDO DISPARO',center,top-3);
      } else if(o.type==='boss' && !g.boss.dead && (g.boss.cycle>=3.3 || bossOpen(g.boss)) && sprites.boss_core_alert && forward<13) {
        const rs=clamp(w*.45,22,48);
        ctx.save();ctx.globalAlpha=reducedMotion()?.75:bossOpen(g.boss)?.85:.45+.35*Math.sin(g.time*12);
        ctx.drawImage(sprites.boss_core_alert,center-rs/2,top+h*.34-rs/2,rs,rs);
        ctx.restore();
      } else if(o.maxHp && o.hp>0 && o.hp<o.maxHp && o.type!=='boss' && forward<9) {
        const bw=clamp(w*.6,18,34);
        ctx.fillStyle='#10181c';ctx.fillRect(center-bw/2,top-6,bw,3);
        ctx.fillStyle=o.type==='echo'?'#68e9e3':'#ff5e55';ctx.fillRect(center-bw/2,top-6,bw*clamp(o.hp/o.maxHp,0,1),3);
      }
    }
  }
}
function drawWeapon(g, mod) {
  const animated=!reducedMotion(), recoil=g.fire>0 && animated?7*Math.sin(Math.PI*(.23-g.fire)/.23):0;
  const reloadDip=g.reload>0 && animated && g.jam<=0?14*Math.sin(Math.PI*(1.5-g.reload)/1.5):0;
  const bob=animated ? Math.sin(g.walkPhase)*g.walkBlend : 0;
  const idleBreath=animated && !g.moving ? Math.sin(g.time*2.8)*1.1 : 0;
  const meleeActive=animated && (g.melee ?? 0)>.83;
  const meleePhase=meleeActive ? Math.sin(Math.PI*clamp((1.15-g.melee)/.32,0,1)) : 0;
  const deployDip=animated && g.fire<=0 && g.reload<=0 ? 16*clamp(g.weaponDeploy/.45,0,1) : 0;
  const x=W/2+bob*2-meleePhase*16, y=H-26+recoil+reloadDip+deployDip+Math.abs(bob)*2+idleBreath-meleePhase*9;
  const weapon=sprites[`weapon_${mod.mode}`];
  if(weapon) {
    const stage=weaponVisualFrame(g.fire,!animated,g.reload,g.jam);
    const marePulse=animated && mod.mode==='mare' && stage==='idle' && (g.ultBuff || g.overdrive>0 || g.q>5 || (g.fx>0 && ['q','ultimate'].includes(g.fxKind))) && sprites.weapon_mare_pulse;
    const frame=stage==='idle'?(marePulse ? sprites.weapon_mare_pulse : weapon):(sprites[`weapon_${mod.mode}_${stage}`] ?? weapon);
    // A pose de recarga pode ter outra silhueta: preserve sua proporção.
    const sizing=stage==='reload' || stage==='blocked'?frame:weapon;
    const scale=Math.min(172/sizing.width,96/sizing.height);
    const w=sizing.width*scale,h=sizing.height*scale;
    const wy=H-20-h+recoil+reloadDip+deployDip+Math.abs(bob)*2+idleBreath-meleePhase*10;
    if(meleePhase>0) {
      ctx.save();
      ctx.translate(x,wy+h*.7);
      ctx.rotate(-meleePhase*.16);
      ctx.drawImage(frame,-w/2,-h*.7,w,h);
      ctx.restore();
    } else {
      ctx.drawImage(frame,x-w/2,wy,w,h);
    }
    const flash=muzzleVisualFrame(g.fire,!animated);
    if(flash) {
      const flare=flash==='tail'?(sprites[`muzzle_${mod.mode}_tail`] ?? sprites[`muzzle_${mod.mode}`]):sprites[`muzzle_${mod.mode}`];
      const size=flash==='tail'?22:28;
      if(flare) { ctx.save();ctx.globalAlpha=flash==='tail'?.45:.72;ctx.drawImage(flare,x-size/2,wy-12,size,size);ctx.restore(); }
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
  if(g.overdrive>0) {
    ctx.save();
    ctx.strokeStyle='#ff4c3b';ctx.lineWidth=2;
    ctx.globalAlpha=reducedMotion()?.28:.24+.14*Math.sin(g.time*6);
    ctx.strokeRect(4,31,W-8,H-75);
    ctx.restore();
  }
  if(g.fx>0 && g.fxKind==='ultimate') {
    const ultKey=ultimateVisualFrame(mod.mode,g.fx,reducedMotion());
    const ult=sprites[ultKey] ?? sprites[`ultimate_${mod.mode}`];
    if(ult) {
      const p=reducedMotion()?.5:clamp(1-g.fx,0,1);
      const waveSweep=!reducedMotion() && mod.mode==='mare' ? (p<.34 ? (1-p/.34)*34 : p<.68 ? ((p-.34)/.34-.5)*28 : 0) : 0;
      const liftY=!reducedMotion() && mod.mode==='mare' ? (p<.34 ? (1-p/.34)*22 : p>=.68 ? -((p-.68)/.32)*10 : -4) : 0;
      const zoom=reducedMotion()?1:(mod.mode==='mare' && p>=.68 ? 1.15+(p-.68)*.55 : .92+p*.36);
      const uw=(216*zoom)*(ult.width/Math.max(1,ult.height)*0.58), uh=126*zoom;
      const drawW=clamp(uw,190,340), drawH=clamp(uh,108,198);
      if(!reducedMotion() && (g.ultFlash ?? 0)>0) {
        const grad=ctx.createRadialGradient(W/2,H/2,12,W/2,H/2,W*.6);
        grad.addColorStop(0,mod.mode==='mare'?'rgba(120,248,255,.22)':'rgba(255,240,180,.18)');
        grad.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
      }
      ctx.globalAlpha=reducedMotion()?.48:Math.min(.84,g.fx*.9+.1);
      ctx.drawImage(ult,W/2-drawW/2+waveSweep,H/2-drawH/2-6+liftY,drawW,drawH);
      if(!reducedMotion() && mod.mode==='mare') {
        ctx.strokeStyle='#a8fbff';ctx.lineWidth=1.5;ctx.globalAlpha=Math.min(.55,g.fx*.6);
        const arcR=68+p*95;
        ctx.beginPath();ctx.arc(W/2,H/2+12,arcR,Math.PI*1.08,Math.PI*1.92);ctx.stroke();
      }
    }
  }
  if(g.fx>0 && g.fxKind==='melee') {
    const meleeKey=meleeVisualFrame(mod.mode,g.fx,reducedMotion());
    const meleeSprite=sprites[meleeKey] ?? sprites[`melee_${mod.mode}`] ?? sprites.melee_wave;
    if(meleeSprite) {
      const p=reducedMotion()?.5:clamp(1-g.fx/.32,0,1);
      const waveW=138+p*52, waveH=82+p*18;
      const sweepX=reducedMotion()?0:(.5-p)*28;
      ctx.globalAlpha=reducedMotion()?.55:Math.min(.84,g.fx*2.6);
      ctx.drawImage(meleeSprite,W/2-waveW/2+sweepX,H-54-waveH*.74-p*6,waveW,waveH);
    }
  }
  if(g.fx>0 && ['q','ultimate'].includes(g.fxKind)) {
    const stage=abilityVisualFrame(g.fx,reducedMotion());
    const effect=stage==='base' ? sprites[`ability_${mod.mode}`] : (sprites[`ability_${mod.mode}_${stage}`] ?? sprites[`ability_${mod.mode}`]);
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
  ctx.fillStyle='rgba(0,12,17,.88)';ctx.fillRect(x0-3,y0-3,116,66);
  for(let y=0;y<map.layout.length;y++)for(let x=0;x<map.layout[y].length;x++) {
    ctx.fillStyle=wallAt(map,flags,x+.5,y+.5)?'#495a5e':'#152b30';ctx.fillRect(x0+x*scale,y0+y*scale,2,2);
  }
  const nav=citadelNavigation(map,flags,p);
  if(nav.reachable && nav.path.length) {
    ctx.strokeStyle='#fff0a8';ctx.lineWidth=.8;ctx.beginPath();
    ctx.moveTo(x0+p.x*scale,y0+p.y*scale);
    for(const point of nav.path)ctx.lineTo(x0+point.x*scale,y0+point.y*scale);
    ctx.stroke();
    const icon=sprites[`route_${nav.target.id}`], x=x0+nav.target.x*scale,y=y0+nav.target.y*scale;
    if(icon)ctx.drawImage(icon,x-3,y-3,6,6);
    else {ctx.fillStyle=nav.target.color ?? '#fff0a8';ctx.fillRect(x-2,y-2,4,4);ctx.strokeStyle='#fff';ctx.strokeRect(x-2,y-2,4,4);}
  }
  // O texto identifica a rota mesmo sem a imagem e não depende de cor.
  if(sprites.route_guide)ctx.drawImage(sprites.route_guide,x0,y0+54,7,7);
  ctx.fillStyle='#f7efcc';ctx.font='bold 6px monospace';ctx.textAlign='left';
  ctx.fillText(nav.reachable?`R: ${nav.target.label}`:'ROTA INDISPONÍVEL',x0+9,y0+60);
  for(const k of KEYS) if(!flags[k.flag]) {ctx.fillStyle=k.color;ctx.fillRect(x0+k.x*scale-1,y0+k.y*scale-1,3,3);}
  for(const s of g.supplies)if(!s.used){ctx.fillStyle='#a0ef9f';ctx.fillRect(x0+s.x*scale,y0+s.y*scale,2,2);}
  for(const c of g.energyCells ?? [])if(!c.used){ctx.fillStyle='#72fff2';ctx.fillRect(x0+c.x*scale,y0+c.y*scale,2,2);}
  for(const c of g.shieldCells ?? [])if(!c.used){ctx.fillStyle='#63c8ff';ctx.fillRect(x0+c.x*scale,y0+c.y*scale,2,2);}
  for(const c of g.overdriveCells ?? [])if(!c.used){ctx.fillStyle='#ff4c3b';ctx.fillRect(x0+c.x*scale,y0+c.y*scale,2,2);}
  for(const b of g.barrels ?? [])if(!b.dead){ctx.fillStyle='#ff8b4a';ctx.fillRect(x0+b.x*scale,y0+b.y*scale,2,2);}
  for(const d of g.drops ?? []){ctx.fillStyle=d.kind==='sucata_codigo'?'#f3b15c':'#d07aff';ctx.fillRect(x0+d.x*scale,y0+d.y*scale,2,2);}
  {ctx.fillStyle='#6ef5d2';ctx.fillRect(x0+CITADEL_CRAFT_BENCH.x*scale-1,y0+CITADEL_CRAFT_BENCH.y*scale-1,3,3);}
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
    ctx.fillStyle='#9ff0d9';ctx.fillRect(x0+CITADEL_PATROL_CONSOLE.x*scale-1,y0+CITADEL_PATROL_CONSOLE.y*scale-1,3,3);
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
  ctx=worldCtx;ctx.imageSmoothingEnabled=false;
  const shakePower=!reducedMotion() && (g.shake ?? 0)>0 ? g.shake*8 : 0;
  if(shakePower>0) {
    ctx.fillStyle='#050a0d';ctx.fillRect(0,0,W,H);
    ctx.save();ctx.translate(Math.sin(g.time*62)*shakePower,Math.cos(g.time*48)*shakePower*.7);
    drawWorld(map,flags,p,g,state.progress);drawWeapon(g,mod);drawResonance(g,mod);
    ctx.restore();
  } else {
    drawWorld(map,flags,p,g,state.progress);drawWeapon(g,mod);drawResonance(g,mod);
  }
  // UI independente evita ampliar pixels serrilhados do framebuffer do mundo.
  ctx=uiCtx;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,W*2,H*2);ctx.setTransform(2,0,0,2,0,0);ctx.imageSmoothingEnabled=true;
  ctx.fillStyle='#d8ffff';ctx.fillRect(W/2-4,H/2,9,1);ctx.fillRect(W/2,H/2-4,1,9);
  if(g.shieldHit>0){
    ctx.save();ctx.strokeStyle='rgba(85,225,255,.46)';ctx.lineWidth=6;
    ctx.globalAlpha=reducedMotion()?.45:.55*clamp(g.shieldHit/.28,0,1);
    ctx.strokeRect(3,3,W-6,H-6);ctx.restore();
  }
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
  ctx.font='bold 9px monospace';ctx.textAlign='left';ctx.fillStyle=mod.color;
  const titleText='CIDADELA 404  //  '+mod.name+'  //  S'+(g.localProgress?.rank ?? 1)+(flags.cidadela_100_porcento?'  ★ 100%':'');
  ctx.fillText(titleText,9,12);
  const titleW=ctx.measureText(titleText)?.width ?? titleText.length*5.4;
  if((g.localProgress?.rank ?? 1)>=4 && sprites.hud_rank_max) ctx.drawImage(sprites.hud_rank_max,12+titleW,2,11,11);
  if(flags.cidadela_100_porcento && sprites.trophy_citadel) ctx.drawImage(sprites.trophy_citadel,26+titleW,2,12,12);
  // Ícones acompanham rótulos em texto: nenhuma informação depende de cor ou arte.
  if(sprites.hud_health)ctx.drawImage(sprites.hud_health,9,H-39,10,10);
  ctx.fillStyle='#e2f4f0';ctx.fillText('VIDA '+Math.ceil(p.health||0)+'/'+(p.maxHealth||0),22,H-30);
  const mareHudActive=!reducedMotion() && mod.mode==='mare' && (g.ultBuff || g.overdrive>0 || g.q>5 || (g.fx>0 && ['q','ultimate'].includes(g.fxKind))) && sprites.hud_weapon_mare_active;
  const hudWeapon=mareHudActive ? sprites.hud_weapon_mare_active : sprites[`hud_weapon_${mod.mode}`];
  if(hudWeapon)ctx.drawImage(hudWeapon,104,H-39,18,10);
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
  if(g.guard>0 || g.shield>0 || g.overdrive>0 || g.combo>=2 || g.vectorCharge>0 || g.echoAnchor>0 || g.relicShotBonus>0 || g.relicReactor || g.relicInsignia) {ctx.textAlign='center';ctx.fillStyle=mod.color;
    const guard=g.guard>0?'GUARDA '+Math.ceil(g.guard)+'s':'';
    const shield=g.shield>0?'ESCUDO '+Math.ceil(g.shield)+'s':'';
    const over=g.overdrive>0?'SOBRECARGA E1M1 '+Math.ceil(g.overdrive)+'s':'';
    const combo=g.combo>=2?'SEQ x'+g.combo:'';
    const vector=g.vectorCharge>0?'VETOR +12 '+Math.ceil(g.vectorCharge)+'s':'';
    const status=[guard,shield,over,combo,vector,g.echoAnchor>0?'SINAL -30% ECO '+Math.ceil(g.echoAnchor)+'s':'',g.relicShotBonus>0?'SELO +25% DANO':'',g.relicReactor?'NÚCLEO -Q/+EN':'',g.relicInsignia?'INSÍGNIA +10% V/F':''].filter(Boolean).join(' • ');
    const width=ctx.measureText(status)?.width ?? status.length*4.8;
    const badgeX=Math.max(3,W/2-width/2-12);
    if((guard || shield) && sprites.hud_shield) ctx.drawImage(sprites.hud_shield,badgeX,55,9,9);
    else if(g.combo>=2 && sprites.hud_combo) ctx.drawImage(sprites.hud_combo,badgeX,55,9,9);
    else if(g.overdrive>0 && sprites.hud_overdrive) ctx.drawImage(sprites.hud_overdrive,badgeX,55,9,9);
    ctx.fillText(status,W/2,65);}
  ctx.textAlign='left';ctx.fillStyle='#d9b9ae';ctx.fillText('REGISTROS '+KEYS.map(k=>flags[k.flag]?k.symbol:'□').join(' ')+'  '+(flags.cidadela_estavel?missionObjective(state.progress):KEYS.every(k=>flags[k.flag])?'ALCANCE O REATOR':'ENCONTRE OS REGISTROS'),9,24,W-105);
  ctx.textAlign='right';ctx.fillStyle='#9fbfca';ctx.fillText('ARQUIVOS '+CITADEL_ARCHIVES.filter(a=>flags[a.flag]).length+'/3',W-9,24);
  ctx.textAlign='left';ctx.fillStyle='#89c5ca';ctx.font='bold 7px monospace';
  ctx.fillText(sectorNameAt(p.x,p.y),128,37);
  const mats=state.progress?.citadelMaterials ?? {sucata_codigo:0,nucleo_estatica:0};
  if((mats.sucata_codigo ?? 0)>0 || (mats.nucleo_estatica ?? 0)>0) {
    if(sprites.hud_sucata) ctx.drawImage(sprites.hud_sucata,W-98,30,10,10);
    if(sprites.hud_nucleo) ctx.drawImage(sprites.hud_nucleo,W-52,30,10,10);
    ctx.textAlign='right';ctx.fillStyle='#e8d49c';ctx.font='bold 7px monospace';
    ctx.fillText(`SUC ${mats.sucata_codigo ?? 0}`,W-56,38);
    ctx.fillText(`NÚC ${mats.nucleo_estatica ?? 0}`,W-9,38);
  }
  ctx.textAlign='center';ctx.fillStyle='#d4eeee';ctx.font='bold 9px monospace';
  ctx.fillText('WASD MOVE · MOUSE/SETAS MIRA · CLIQUE/ESPAÇO ATIRA · E USA',W/2,H-17);
  ctx.fillText('Q MÓD · R RADAR · T REC · SHIFT IMP · F ULT · P PAUSA · L/J/K · M SOM',W/2,H-5);
  if(g.scan>0) { ctx.strokeStyle=mod.color;ctx.globalAlpha=.35;ctx.lineWidth=1;ctx.beginPath();ctx.arc(W/2,H/2,18,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;drawMap(map,flags,p,g,state.progress); }
  let prompt='';
  const target=nearestInteraction(map,flags,p);
  if(target?.kind==='exit') prompt='[E] RETORNAR À ESTAÇÃO 66.6';
  if(target?.kind==='key') prompt=`[E] REGISTRO ${target.symbol} ${target.label}`;
  if(target?.kind==='archive') prompt=`[E] ARQUIVO ${target.label}${flags[target.flag]?' • REVER':''}`;
  if(target?.kind==='crafting_bench') prompt='[E] BANCADA DE SÍNTESE • CRIAR ITENS';
  if(target?.kind==='secret_plaque') prompt=`[E] PLACA SETOR E1M1${flags.cidadela_segredo_e1m1?' • REVER':' • SEGREDOS'}`;
  if(target?.kind==='reactor_console') prompt='[E] TELEMETRIA DO REATOR';
  if(target?.kind==='protocol_beacon') prompt=flags.cidadela_protocolo_concluido?'[E] BALIZA DO PROTOCOLO • CONCLUÍDA':'[E] BALIZA DO PROTOCOLO • VIGÍLIA 66.6';
  if(target?.kind==='patrol_console') prompt=g.patrol?'[E] ENCERRAR RONDA SETORIAL':'[E] INICIAR RONDA SETORIAL (7 HOSTIS)';
  if(target?.kind==='dormant_guardian') prompt='[E] EXAMINAR CARCAÇA DO VIGILANTE';
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
  if(!prompt) {
    const nearBarrel=(g.barrels ?? []).find(b=>!b.dead && Math.hypot(p.x-b.x,p.y-b.y)<1.75 && visible(map,flags,p.x,p.y,b.x,b.y));
    const nearShield=(g.shieldCells ?? []).find(c=>!c.used && Math.hypot(p.x-c.x,p.y-c.y)<1.4 && visible(map,flags,p.x,p.y,c.x,c.y));
    if(nearBarrel) prompt='BARRIL DE ESTÁTICA • ATIRE OU [V] PARA DETONAR (Q/F SOBRECARREGA)';
    else if(nearShield && g.shield>=3) prompt='BLINDAGEM DE CAMPO • ESCUDO JÁ ATIVO';
  }
  for (const [x,k] of [[8,KEYS[0]],[15,KEYS[1]],[22,KEYS[2]]]) if (!prompt && !flags[k.flag] && Math.abs(p.x-x)<1.4 && p.y>4.2 && p.y<8.8) prompt=`ECLUSA ${k.symbol} ${k.label} • BUSQUE O REGISTRO`;
  if(prompt){
    const lines=wrapCitadelText(prompt,46), actionable=/^\[(E|R)\]/.test(prompt);
    ctx.fillStyle='rgba(0,0,0,.86)';ctx.fillRect(W/2-145,H/2+34,290,lines.length*12+4);
    const promptIcon=target?.kind==='archive' && flags[target.flag] ? (sprites.archive_read ?? sprites.hud_interact) : sprites.hud_interact;
    if(actionable && promptIcon)ctx.drawImage(promptIcon,W/2-139,H/2+36,10,10);
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
  if(g.patrol) {
    ctx.font='bold 9px monospace';ctx.fillStyle='#8ef2da';
    ctx.fillText(`RONDA SETORIAL • HOSTIS ${g.enemies.filter(e=>e.hp>0).length}`,W/2,43);
  }
  if(!g.boss.dead && p.x>22.7) {
    const rate=g.boss.phaseTwo?1.25:1;
    const coreEta=bossOpen(g.boss)?Math.ceil((7.2-g.boss.cycle)/rate):Math.ceil((4.2-g.boss.cycle)/rate);
    const text=bossOpen(g.boss)?`NÚCLEO EXPOSTO (${coreEta}s) — DISPARE`:g.boss.cycle<2?(g.boss.phaseTwo?`VIGILANTE FASE 2 • NÚCLEO EM ${coreEta}s`:`VIGILANTE • NÚCLEO EM ${coreEta}s`):(g.boss.phaseTwo?`RAJADA TRIPLA • NÚCLEO EM ${coreEta}s`:`RAJADA — DESVIE • NÚCLEO EM ${coreEta}s`);
    ctx.font='bold 9px monospace';ctx.fillStyle=bossOpen(g.boss)?'#abffff':g.boss.phaseTwo?'#ff7171':'#ff9081';ctx.fillText(text,W/2,43);
    ctx.fillStyle='#282f32';ctx.fillRect(W/2-70,48,140,4);ctx.fillStyle=g.boss.phaseTwo?'#ff3e55':'#ff5c59';ctx.fillRect(W/2-70,48,140*clamp(g.boss.hp/280,0,1),4);
    ctx.fillStyle='rgba(255,255,255,.35)';ctx.fillRect(W/2-35,48,1,4);ctx.fillRect(W/2,48,1,4);ctx.fillRect(W/2+35,48,1,4);
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
    ctx.fillText(g.panel==='journal'?'ARQUIVO DE MEMÓRIA':g.panel==='missions'?'MISSÕES DA CIDADELA':g.panel==='dimension'?'SINTONIA LOCAL // CIDADELA':g.panel==='craft'?'BANCADA DE SÍNTESE // FORJA':'SINAL EM PAUSA',62,58);
    if(g.panel==='journal' && sprites.route_journal)ctx.drawImage(sprites.route_journal,W-83,44,12,12);
    if(g.panel==='journal' && flags.cidadela_100_porcento && sprites.trophy_citadel)ctx.drawImage(sprites.trophy_citadel,W-102,42,16,16);
    if(g.panel==='journal' && hasRelic(state.progress,'insignia_vigilia_404') && sprites.relic_insignia)ctx.drawImage(sprites.relic_insignia,W-121,42,16,16);
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
      const relicCount=['selo_codigo_queimado','nucleo_vigilante_forjado','insignia_vigilia_404'].filter(id=>state.progress.inventory?.includes(id)).length;
      ctx.fillText(`CRTs ${crtCount(state.progress)}/3 • ECOS ${memoryEchoCount(state.progress)}/3 • RELÍQUIAS ${relicCount}/3`,62,213,W-125);
      if(flags.cidadela_estavel) ctx.fillText(`GRAVAÇÕES ${citadelMissions(state.progress).registros}/3 • FENDAS ${breachSummary(state.progress).sealed}/3 • OFICINA ${workshopCount(state.progress)}/3 • RONDAS ${flags.cidadela_rondas_concluidas ?? 0}${flags.cidadela_protocolo_concluido?' • PROTOCOLO OK':''}${flags.cidadela_100_porcento?' ★ 100%':''}`,62,223,W-125);
    } else if(g.panel==='missions') {
      if(!flags.cidadela_estavel) {
        ctx.fillText(`FORJA DO CÓDIGO QUEIMADO • SUC ${mats.sucata_codigo} • NÚC ${mats.nucleo_estatica}`,62,80,W-125);
        ctx.fillStyle='#9fbfca';ctx.fillText('MISSÕES DE EXPLORAÇÃO ADICIONAIS LIBERAM APÓS O REATOR.',62,98,W-125);
      } else {
        const {rede,vozes,protocolo}=citadelMissions(state.progress);
        ctx.fillStyle=mod.color;ctx.fillText('REDE DE ESCUTA • '+(rede.status==='completed'?'CONCLUÍDA':rede.status==='active'?'EM ANDAMENTO':'FALE COM NEXO-04'),62,74,W-125);
        ctx.fillStyle='#d2eeee';rede.objectives.forEach((o,i)=>ctx.fillText(`${o.done?'[X]':'[ ]'} ${o.label}`,62,85+i*10,W-125));
        ctx.fillStyle=mod.color;ctx.fillText('VOZES NA ESTÁTICA • '+(vozes.status==='completed'?'CONCLUÍDA':vozes.status==='active'?'EM ANDAMENTO':'CONSULTE O TRANSMISSOR'),62,128,W-125);
        ctx.fillStyle='#d2eeee';vozes.objectives.forEach((o,i)=>ctx.fillText(`${o.done?'[X]':'[ ]'} ${o.label}`,62,139+i*10,W-125));
        ctx.fillStyle=mod.color;ctx.fillText('PROTOCOLO DA VIGÍLIA • '+(protocolo.status==='completed'?'CONCLUÍDA':protocolo.status==='active'?'EM ANDAMENTO':'BALIZA NA ARENA'),62,182,W-125);
        ctx.fillStyle='#d2eeee';ctx.fillText(protocolo.objectives.map(o=>`${o.done?'[X]':'[ ]'} ${o.target.toUpperCase()}`).join('  '),62,194,W-125);
        const summary=breachSummary(state.progress);ctx.fillStyle=mod.color;
        ctx.fillText(`FORJA ${flags.cidadela_forja_concluida?'CONCLUÍDA':`SUC ${mats.sucata_codigo}/2`} • FENDAS ${summary.sealed}/3 • COFRES ${summary.caches}/3 • ${g.workshopTrial?'ENSAIO '+g.workshopTrial.done.length+'/3':'OFICINA '+workshopCount(state.progress)+'/3'}`,62,216,W-125);
      }
    } else if(g.panel==='craft') {
      const bag=state.progress?.citadelMaterials ?? {sucata_codigo:0,nucleo_estatica:0};
      if(sprites.hud_sucata) ctx.drawImage(sprites.hud_sucata,62,64,12,12);
      if(sprites.hud_nucleo) ctx.drawImage(sprites.hud_nucleo,182,64,12,12);
      ctx.fillStyle='#ffe8a3';ctx.fillText(`SUCATA: ${bag.sucata_codigo ?? 0}`,77,74,100);
      ctx.fillText(`NÚCLEO: ${bag.nucleo_estatica ?? 0}`,197,74,100);
      for(const [i,recipe] of CITADEL_RECIPES.entries()) {
        const y=91+i*25, owned=recipe.itemId && hasRelic(state.progress,recipe.itemId);
        const can=canCraftRecipe(state.progress,recipe,g,p).ok && !owned;
        const costText=Object.entries(recipe.cost).map(([k,v])=>`${k==='sucata_codigo'?'SUC':'NÚC'} ${v}`).join(' + ');
        const relicSprite=recipe.id==='selo_codigo_queimado'?sprites.relic_selo:recipe.id==='nucleo_vigilante_forjado'?sprites.relic_nucleo:null;
        if(relicSprite) ctx.drawImage(relicSprite,W-82,y-8,18,18);
        ctx.fillStyle=owned?'#7bd8b8':can?mod.color:'#8fa1a3';
        ctx.fillText(`[${i+1}] ${recipe.name} (${costText})${owned?' • FORJADO':''}`,62,y,W-145);
        ctx.fillStyle='#cfe8e6';ctx.font='8px monospace';
        ctx.fillText(recipe.description,74,y+10,W-156);
        ctx.font='9px monospace';
      }
    } else if(g.panel==='dimension') {
      const local=g.localProgress ?? getDimensionProgress(state.progress);
      if(!local) ctx.fillText('SINTONIA LOCAL INDISPONÍVEL PARA ESTE OPERADOR.',62,83,W-125);
      else {
        const badge=sprites.perk_emblema, drone=sprites.perk_nexo;
        if(badge) ctx.drawImage(badge,W-96,44,22,22);
        if(drone) ctx.drawImage(drone,W-70,44,24,18);
        if(local.rank>=4 && sprites.hud_rank_max) ctx.drawImage(sprites.hud_rank_max,W-118,46,18,18);
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
      ctx.fillText('SEGURE ESPAÇO / CLIQUE PARA ATIRAR • V GOLPE/PARRY • T RECARGA',62,101,W-125);
      ctx.fillText('E USA (BANCADA 1–5) • Q MÓD · R RADAR · F ULT · SHIFT IMP',62,119,W-125);
      ctx.fillText('CUIDADO: ECHOVORE RESPONDE À RESSONÂNCIA.',62,147);
      ctx.fillText('VIGILANTE: DESVIE DA RAJADA E ATINJA O NÚCLEO EXPOSTO.',62,165,W-125);
      ctx.fillText('SAÍDA JUNTO À CHEGADA • K: SINTONIA LOCAL.',62,183);
      ctx.fillText(`M SOM ${citadelAudioEnabled()?'LIGADO':'DESLIGADO'} • EFEITOS OPCIONAIS`,62,201);
    }
    ctx.fillStyle='#9cc9c7';ctx.fillText(g.panel==='craft'?'[1–5] SINTETIZAR • [E] / [P] / [ESC] FECHAR':'P / ESC CONTINUA • L REGISTROS • J MISSÕES • K SINTONIA',62,g.panel==='journal'||g.panel==='missions'||g.panel==='dimension'||g.panel==='craft'?229:220);
  }
  const out=canvas.getContext('2d');out.save();out.setTransform(1,0,0,1,0,0);out.imageSmoothingEnabled=false;out.drawImage(buffer,0,0,canvas.width,canvas.height);out.imageSmoothingEnabled=true;out.drawImage(uiBuffer,0,0,canvas.width,canvas.height);out.restore();
}
export function getCitadelRuntime() { return game; }
export function clearCitadelRuntime() { game=null; }
