import assert from 'node:assert/strict';
import { criarEstadoNado, dispararPropulsao, moverNaAgua } from '../js/game/nado.js';
import { iniciarVoo, atualizarVoo } from '../js/game/nado-voo.js';
import { state } from '../js/game/state.js';
import { tryArchetypePower } from '../js/game/archetype-powers.js';
function novo(profundidade, respeito=0) {
 const n=criarEstadoNado(); Object.assign(n,{ativo:true,submerso:profundidade>1.25,mareAstral:true,nivel:3,profundidade,dirX:1,dirY:0,vx:0,vy:0,recargaArrancada:0,naPoca:false,medo:false}); n.respeito.valor=respeito; return n;
}
state.progress={archetype:'mare_astral', abilities:['passo_corrente'], flags:{}, inventory:[]};
function usarQ(n) { state.player={x:2,y:2,nado:n,energy:100,ability:{cooldowns:{}}}; tryArchetypePower('passo_corrente',()=>{}); return n; }
const inicio=usarQ(novo(1.8)); assert.equal(inicio.potenciaArrancada,.78); assert.ok(inicio.vx>0);
const experiente=usarQ(novo(1.8,1)); assert.ok(experiente.potenciaArrancada>inicio.potenciaArrancada && experiente.vx>inicio.vx);
const shift=novo(1.8); dispararPropulsao(shift,true); assert.equal(shift.potenciaArrancada,1); assert.ok(shift.vx>inicio.vx);
const superficie=usarQ(novo(.8)); assert.equal(superficie.potenciaArrancada,1);
const velocidadeInicio=moverNaAgua(inicio,.1,1,0,4).dx;
const velocidadeShift=moverNaAgua(shift,.1,1,0,4).dx;
assert.ok(velocidadeInicio<velocidadeShift,'Q submerso inicial percorre menos que o impulso original');
const v=iniciarVoo(novo(1.5)); const a=v.profundidadeAlvo;
const dir=atualizarVoo(v,{descer:true},.05); assert.ok(dir.ativo && v.profundidadeAlvo-a<.03,'avanço desce gradualmente');
for(let i=0;i<100;i++) atualizarVoo(v,{subir:true},.05);
assert.ok(v.profundidadeAlvo<=1.3,'subida ainda permite recuperar ar');
console.log('Impulso submerso, progressão e controles verificados.');
