import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {map} from '../js/data/worlds/cidadela-404/cidadela.js';
import {KEYS,canMove,citadelNavigation,updateCitadel,renderCitadel,clearCitadelRuntime,getCitadelRuntime} from '../js/game/cidadela-fps.js';
import {keyContext} from '../js/game/cidadela-narrativa.js';
import {state} from '../js/game/state.js';

const names=['terminal-amarela','terminal-vermelha','icone-azul','icone-amarela','icone-reator','icone-saida','icone-guia','icone-diario'];
for(const name of names) {
  for(const dir of ['source-art','sprites']) assert(existsSync(`assets/${dir}/cidadela-404/rota-${name}.png`));
  assert.equal(readFileSync(`assets/sprites/cidadela-404/rota-${name}.png`)[25],6,`${name}: RGBA`);
}
for(const key of KEYS) assert(keyContext(key.id).startsWith('NEXO:'));
assert.equal(keyContext('inexistente'),'');
function checkRoute(flags,player,id) {
  const original=JSON.stringify(flags), nav=citadelNavigation(map,flags,player);
  assert.equal(JSON.stringify(flags),original,'busca não altera o save');
  assert.equal(nav.target.id,id);assert(nav.reachable,`rota para ${id}`);
  assert.equal(Math.floor(nav.path[0].x),Math.floor(player.x));
  assert.equal(Math.floor(nav.path[0].y),Math.floor(player.y));
  assert.equal(Math.floor(nav.path.at(-1).x),Math.floor(nav.target.x));
  assert.equal(Math.floor(nav.path.at(-1).y),Math.floor(nav.target.y));
  for(const [i,point] of nav.path.entries()) {
    assert(canMove(map,flags,point.x,point.y),'caminho respeita paredes e eclusas');
    if(i) assert.equal(Math.abs(point.x-nav.path[i-1].x)+Math.abs(point.y-nav.path[i-1].y),1,'sem diagonais através de cantos');
  }
  return nav;
}
checkRoute({}, {x:2.5,y:6.5},'azul');
checkRoute({cidadela_chave_azul:true}, {x:6.5,y:5.5},'amarela');
checkRoute({cidadela_chave_azul:true,cidadela_chave_amarela:true}, {x:12.5,y:9.5},'vermelha');
checkRoute({cidadela_chave_azul:true,cidadela_chave_amarela:true,cidadela_chave_vermelha:true}, {x:19.5,y:3.5},'reator');
const stable={cidadela_estavel:true,cidadela_chave_azul:true,cidadela_chave_amarela:true,cidadela_chave_vermelha:true};
assert.match(checkRoute(stable,{x:27.5,y:20.5},'saida').target.label,/OPCIONAL/);
// Saves incomuns não são corrigidos silenciosamente e não recebem linha falsa.
const partial=citadelNavigation(map,{cidadela_chave_vermelha:true},{x:19.5,y:3.5});
assert.equal(partial.target.id,'azul');assert.equal(partial.reachable,false);assert.deepEqual(partial.path,[]);
assert.equal(citadelNavigation(map,{}, {x:0.5,y:0.5}).reachable,false);
assert.equal(citadelNavigation(map,{}, {}).reachable,false);

const draws=[],texts=[],noop=()=>{};
const ctx=new Proxy({}, {get(_t,k){if(k==='drawImage')return (...a)=>draws.push(a);if(k==='fillText')return (...a)=>texts.push(a);if(k==='measureText')return text=>({width:text.length*5});return noop;},set(){return true;}});
globalThis.document={createElement:()=>({width:128,height:128,getContext:()=>ctx})};
globalThis.window={matchMedia:()=>({matches:true})};
const waiting=[];globalThis.Image=class {constructor(){this.width=128;this.height=128;}set src(v){this._src=v;if(v.endsWith('rota-terminal-amarela.png')||v.endsWith('rota-icone-amarela.png')) waiting.push(this);else this.onload?.();}get src(){return this._src;}};
state.save.loaded=false;state.progress={archetype:'mare_astral',flags:{cidadela_chave_azul:true},inventory:['preservado']};state.world.currentMap=map;state.world.isLoading=false;state.world.fpsPauseRequested=false;
Object.assign(state.player,{health:null,maxHealth:null,energy:100,invulnerable:999,ultimate:{cooldown:0},x:11.5,y:9.5});clearCitadelRuntime();
const input={keys:{},pressed:new Set(),mouseDeltaX:0};updateCitadel(.033,state,input);const g=getCitadelRuntime();g.enemies=[];g.angle=0;g.scan=3;Object.assign(state.player,{x:11.5,y:9.5});
const render=()=>{draws.length=0;texts.length=0;renderCitadel({width:960,height:540,getContext:()=>ctx},state);};
const drawn=name=>draws.some(a=>a[0]?.src?.endsWith(name));
render();assert(drawn('terminal-memoria.png'),'terminal anterior enquanto a arte carrega');assert(!drawn('rota-terminal-amarela.png'));
assert(texts.some(t=>String(t[0]).includes('▲ AMARELA')),'orientação textual independente da imagem');
for(const img of waiting) img.onload();render();assert(drawn('rota-terminal-amarela.png'));assert(drawn('rota-icone-amarela.png'));assert(drawn('rota-icone-guia.png'));
input.pressed.add('e');updateCitadel(.033,state,input);input.pressed.clear();assert(state.progress.flags.cidadela_chave_amarela);assert(g.radioQueue.includes(keyContext('amarela')));assert.deepEqual(state.progress.inventory,['preservado']);
render();assert(texts.some(t=>String(t[0]).includes('■ VERMELHA')),'ícone vermelho ausente não impede orientação');
g.panel='journal';render();assert(drawn('rota-icone-diario.png'));
g.panel=null;state.progress.flags={...stable};Object.assign(state.player,{x:27.5,y:20.5});render();assert(texts.some(t=>String(t[0]).includes('SAÍDA OPCIONAL')));assert(drawn('rota-icone-saida.png'));
console.log('Cidadela: orientação por geometria, saves parciais, fallbacks e contexto dos registros OK.');
