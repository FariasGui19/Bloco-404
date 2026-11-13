import assert from 'node:assert/strict';
import { CITADEL_BREACHES as breaches } from '../js/data/worlds/cidadela-404/cidadela.js';
import { createCitadelRuntime } from '../js/game/cidadela-fps.js';
import { beginBreach,updateBreach,openBreachCache,breachSummary,cacheFlag } from '../js/game/cidadela-fendas.js';
for(const archetype of ['mare_astral','nucleo_dez_forma','lamina_dominio_anciao','motor_bio_forja']) {
  const progress={archetype,inventory:['preservado'],flags:{cidadela_estavel:true}};
  const g=createCitadelRuntime(progress);const player={x:1,y:1};
  const tick=dt=>updateBreach(g,progress,dt,player,()=>true,()=>false,()=>{throw Error('pulso sem visão');});
  g.training=true;assert.match(beginBreach(g,progress,breaches[0]).message,/SIMULAÇÃO/);assert.equal(g.breach,null);g.training=false;
  for(const b of breaches) {
    beginBreach(g,progress,b);tick(2);assert.equal(g.enemies.filter(e=>e.hp>0).length,2);
    g.enemies.forEach(e=>e.hp=0);tick(.03);assert.equal(g.breach.wave,2);tick(2);
    assert.equal(g.enemies.filter(e=>e.hp>0).length,3);
    g.enemies.forEach(e=>e.hp=0);assert(tick(.03).changed);assert.equal(g.breach,null);
    assert(openBreachCache(progress,b).changed);assert(progress.flags[cacheFlag(b.id)]);
  }
  assert.equal(breachSummary(progress).quest.status,'completed');assert.deepEqual(progress.inventory,['preservado']);
  const xp=JSON.stringify(progress.archetypeProgress);assert(!openBreachCache(progress,breaches[0]).changed);assert.equal(JSON.stringify(progress.archetypeProgress),xp);
}
console.log('Fendas: compatibilidade, recompensas únicas e conflito com treino nos quatro arquétipos OK.');
