import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {map,CITADEL_NULL_MONITORS} from '../js/data/worlds/cidadela-404/cidadela.js';
import {state} from '../js/game/state.js';
import {crtSignalFragment} from '../js/game/cidadela-narrativa.js';
import {updateCitadel,renderCitadel,clearCitadelRuntime,getCitadelRuntime,weaponVisualFrame,muzzleVisualFrame} from '../js/game/cidadela-fps.js';
const names=['polimento-disparo-mare','polimento-disparo-nucleo','polimento-disparo-dominio','polimento-disparo-bio','polimento-habilidade-mare','polimento-habilidade-nucleo','polimento-habilidade-dominio','polimento-habilidade-bio','polimento-crt-escuta','polimento-crt-eco'];
for(const n of names){const p=`assets/sprites/cidadela-404/${n}.png`;assert(existsSync(p));assert.equal(readFileSync(p)[25],6,`${n}: alfa`);}
assert.equal(muzzleVisualFrame(.23),'burst');assert.equal(muzzleVisualFrame(.14),'tail');assert.equal(muzzleVisualFrame(.06),null);assert.equal(muzzleVisualFrame(.2,true),null);
assert.equal(weaponVisualFrame(.2,false,.2),'fire');assert.equal(weaponVisualFrame(0,false,.2),'return');assert.equal(weaponVisualFrame(0,false,.2,1),'idle');assert.equal(weaponVisualFrame(0,true,.2),'idle');
for(const m of CITADEL_NULL_MONITORS)assert.match(crtSignalFragment(m.id),/^SINAL SEM ORIGEM:/);assert.equal(crtSignalFragment('inexistente'),'');
const draws=[];const noop=()=>{};const ctx=new Proxy({}, {get(_t,k){if(k==='drawImage')return (...a)=>draws.push(a);return noop;},set(){return true;}});
globalThis.document={createElement:()=>({width:128,height:128,getContext:()=>ctx})};const motion={matches:false};globalThis.window={matchMedia:()=>motion};
globalThis.Image=class{constructor(){this.width=128;this.height=128;}set src(v){this._src=v;this.onload?.();}get src(){return this._src;}};
state.save.loaded=false;state.progress={archetype:'mare_astral',flags:{},inventory:['preservado']};state.world.currentMap=map;state.world.isLoading=false;state.world.fpsPauseRequested=false;
Object.assign(state.player,{health:null,maxHealth:null,energy:100,invulnerable:999,ultimate:{cooldown:0}});clearCitadelRuntime();
const input={keys:{},pressed:new Set(),mouseDeltaX:0};const step=(n=1)=>{for(let i=0;i<n;i++){updateCitadel(.033,state,input);input.pressed.clear();}};const press=k=>{input.pressed.add(k);step();};step();const g=getCitadelRuntime(),p=state.player;g.enemies=[];g.boss.dead=true;
const render=()=>{draws.length=0;renderCitadel({width:960,height:540,getContext:()=>ctx},state);};const drawn=n=>draws.filter(a=>a[0]?.src?.endsWith(n));
Object.assign(p,{x:4.5,y:5.5});g.angle=0;
for(const [id,mode] of [['mare_astral','mare'],['nucleo_dez_forma','nucleo'],['lamina_dominio_anciao','dominio'],['motor_bio_forja','bio']]) {
 state.progress.archetype=id;g.fire=.1;g.reload=0;g.fx=.2;g.fxKind='q';render();assert(drawn(`polimento-disparo-${mode}.png`).length,`${mode}: rastro final`);assert(drawn(`polimento-habilidade-${mode}.png`).length,`${mode}: fim de Q`);
 g.fx=.7;render();assert(drawn(`base-habilidade-${mode}.png`).length,`${mode}: efeito inicial`);
 motion.matches=true;g.fx=.2;render();assert(!drawn(`polimento-disparo-${mode}.png`).length);assert(!drawn(`polimento-habilidade-${mode}.png`).length);assert(drawn(`base-habilidade-${mode}.png`).length,'sinal estático');motion.matches=false;
}
// Retorno de recarga usa o quadro existente, sem antecipar a munição.
state.progress.archetype='mare_astral';g.fire=0;g.reload=.2;g.jam=0;g.ammo=4;render();assert(drawn('base-canhao-mare-retorno.png').length);assert.equal(g.ammo,4);
// Troca externa do arquétipo inicia apenas apresentação; não altera munição
// nem impede um tiro, e congela durante pausa. Não adiciona seleção de arma.
g.reload=0;g.fire=0;state.progress.archetype='nucleo_dez_forma';step();assert(g.weaponDeploy>0);assert.equal(g.ammo,4);
press('p');const deploy=g.weaponDeploy;step(15);assert.equal(g.weaponDeploy,deploy);press('p');g.fire=0;press('space');assert.equal(g.ammo,3,'transição visual não bloqueia tiro');
// Interação real apenas no CRT alcançável: efeito local, sem novo dano,
// recompensa extra ou afirmação de identidade. Repetição durante intervalo não
// reinicia a interferência; pausa congela o tempo e morte o cancela.
state.progress.archetype='mare_astral';Object.assign(p,{x:6.5,y:3.1,health:p.maxHealth,invulnerable:999});g.angle=-Math.PI/2;g.enemies=[];g.fire=0;g.fx=0;g.ammo=7;g.reload=0;g.signalTime=0;g.signalCooldown=0;press('e');
assert(state.progress.flags.cidadela_crt_entrada);assert.equal(g.signalMonitorId,'entrada');assert.equal(g.signalTime,1.5);assert.equal(g.signalCooldown,6);assert.equal(g.ammo,7);assert.equal(p.health,p.maxHealth);assert(g.radioQueue.some(s=>s.includes(crtSignalFragment('entrada'))));
render();assert(drawn('polimento-crt-escuta.png').length,'sinal aparece no monitor selecionado');const first=g.signalTime;const xp=JSON.stringify(state.progress.archetypeProgress);press('e');assert(g.signalTime<first,'não reinicia durante intervalo');assert.equal(JSON.stringify(state.progress.archetypeProgress),xp,'releitura sem XP');
g.signalTime=.4;render();assert(drawn('polimento-crt-eco.png').length,'fase final da interferência');motion.matches=true;render();assert(drawn('polimento-crt-escuta.png').length);assert(!drawn('polimento-crt-eco.png').length,'estático com movimento reduzido');motion.matches=false;
press('p');const snapshot=[g.signalTime,g.signalCooldown];step(30);assert.deepEqual([g.signalTime,g.signalCooldown],snapshot);press('p');
p.health=0;p.deathTimer=.01;step();assert.equal(g.signalTime,0);assert.equal(g.signalCooldown,0);assert.equal(g.signalMonitorId,null);assert(state.progress.flags.cidadela_crt_entrada);assert.deepEqual(state.progress.inventory,['preservado']);
console.log('Cidadela: disparo, habilidades, troca visual, recarga e sinal dos CRTs OK.');
