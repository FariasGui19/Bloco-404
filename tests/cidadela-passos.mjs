import assert from 'node:assert/strict';
import { map } from '../js/data/worlds/cidadela-404/cidadela.js';
import { state } from '../js/game/state.js';
import { updateCitadel,clearCitadelRuntime,getCitadelRuntime } from '../js/game/cidadela-fps.js';
const store=new Map();globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
let contexts=0;const frequencies=[],oscillators=[];
class Context {constructor(){contexts++;this.state='running';this.currentTime=0;this.destination={};}resume(){return Promise.resolve();}createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}createOscillator(){const o={frequency:{setValueAtTime(v){frequencies.push(v)},exponentialRampToValueAtTime(){}},connect(){},disconnect(){},start(){},stop(){}};oscillators.push(o);return o;}}
globalThis.AudioContext=Context;
state.progress={archetype:'mare_astral',flags:{},inventory:[]};state.world.currentMap=map;state.world.isLoading=false;state.world.fpsPauseRequested=false;
Object.assign(state.player,{health:null,maxHealth:null,energy:100,ultimate:{cooldown:0}});clearCitadelRuntime();
const input={keys:{},pressed:new Set(),mouseDeltaX:0};const step=()=>{updateCitadel(.033,state,input);input.pressed.clear();};step();const g=getCitadelRuntime();g.enemies=[];
input.keys.w=true;for(let i=0;i<20;i++)step();assert.equal(contexts,0,'passos não iniciam áudio sem consentimento');
input.pressed.add('m');step();assert.equal(contexts,1);for(let i=0;i<15;i++)step();assert(frequencies.includes(95),'passos usam timbre dedicado ao andar');
input.pressed.add('p');step();const count=oscillators.length;for(let i=0;i<30;i++)step();assert.equal(oscillators.length,count,'pausa impede passos');
input.pressed.add('p');input.keys.w=false;step();Object.assign(state.player,{x:7.79,y:5.5});g.angle=0;g.stepDistance=0;input.keys.w=true;
for(let i=0;i<25;i++)step();assert(!g.moving);assert.equal(oscillators.length,count,'empurrar parede não gera passo');
console.log('Cidadela: passos somente com movimento, áudio opt-in e pausa OK.');
