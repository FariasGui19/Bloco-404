import assert from 'node:assert/strict';
import { criarAmeacaCromatica, atualizarAmeacasCromaticas } from '../js/game/mare-cromatica-ameacas.js';
import { createTrainingTargets, updateBasicCombat, applyAttackDamage } from '../js/game/combat.js';
import { contencao } from '../js/data/worlds/arquipelago-rotas-perdidas/mare-cromatica.js';
const progress={mareCromatica:{}}, runtime=criarAmeacaCromatica(contencao), player={x:6,y:5,health:100};
const enemies=createTrainingTargets(contencao);assert.equal(enemies.length,2);
const e=enemies[0];player.x=e.x-1;player.y=e.y;
let hits=0;const hit=()=>hits++,stand=()=>true;
atualizarAmeacasCromaticas(contencao,runtime,enemies,player,progress,.1,stand,hit);assert(e.windup>0);assert.equal(hits,0,'ataque deve ser anunciado');
for(let i=0;i<8;i++) atualizarAmeacasCromaticas(contencao,runtime,enemies,player,progress,.1,stand,hit);
assert.equal(hits,1);assert(e.cooldown>0);for(let i=0;i<5;i++) atualizarAmeacasCromaticas(contencao,runtime,enemies,player,progress,.1,stand,hit);assert.equal(hits,1,'não pode causar dano todo quadro');
e.cooldown=0;e.windup=.05;atualizarAmeacasCromaticas(contencao,runtime,[e],player,progress,.1,()=>false,hit);assert.equal(hits,1,'ataque não atravessa parede');
player.x=2.5;player.y=7.5;e.x=3;e.y=7.5;e.windup=.05;atualizarAmeacasCromaticas(contencao,runtime,enemies,player,progress,.1,stand,hit);assert.equal(hits,1,'entrada segura');assert.equal(e.windup,0);
applyAttackDamage(e,{total:999});assert.equal(e.health,0);for(let i=0;i<50;i++)updateBasicCombat({},enemies,.1);assert.equal(e.health,0,'não renasce como alvo de treino');
const n=criarAmeacaCromatica(contencao),pl={x:11,y:3.5};atualizarAmeacasCromaticas(contencao,n,[],pl,progress,.1,stand,hit);assert(n.visao);for(let i=0;i<40;i++)atualizarAmeacasCromaticas(contencao,n,[],pl,progress,.1,stand,hit);assert.equal(n.visao,null);assert(n.visto);
const end=createTrainingTargets(contencao),endRuntime=criarAmeacaCromatica(contencao);atualizarAmeacasCromaticas(contencao,endRuntime,end,pl,{mareCromatica:{desfecho:'total'}},.1,stand,hit);assert(end.every(x=>x.health===0));
console.log('Maré Cromática: ameaça, aviso, dano, entrada segura, aparição e purificação OK.');
// O combate real aceita o infectado, mas não contabiliza missão/XP de treino.
const { state }=await import('../js/game/state.js');const { tryBasicAttack }=await import('../js/game/combat.js');
state.world.currentMapId='mare_cromatica_contencao';state.world.currentMap=contencao;state.objects=[];state.actors=[];
const hero={x:4.5,y:4.5,facing:'down',ability:{cooldowns:{}},energy:100};state.player=hero;
const prog={archetype:'mare_astral',abilities:['passo_corrente','senso_corrente'],inventory:[],flags:{},questLog:{}};
const target=createTrainingTargets(contencao)[0];target.x=5.5;target.y=4.5;
for(let i=0;i<20 && target.health>0;i++){hero.combat=null;assert(tryBasicAttack({player:hero,progress:prog,map:contencao,targets:[target],point:{x:target.x,y:target.y},rng:()=>.5}));}
assert.equal(target.health,0);assert(!prog.questLog.calibracao_de_campo);console.log('Maré Cromática: combate real derrota infectado sem XP de treino.');
