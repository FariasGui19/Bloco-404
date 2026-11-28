import test from 'node:test';
import assert from 'node:assert/strict';
import { canStand, createMission, move, interact, scannerTarget, abilities, notes } from '../js/dimension/mare-mission-model.js';
import { systems, sites, anchor, circuitLegs, currentSite, siteStatus, promptFor } from '../js/dimension/mare-mission-circuit.js';
import { useLore } from '../js/dimension/mare-mission-lore.js';

const approach = (m, site) => { [m.x, m.y] = site.approach; };

test('o cabo conduz do spawn a quatro aproximações com folga de câmera e linha de visada', () => {
  const m = createMission({});
  for (const {site, walk} of circuitLegs) {
    assert.equal(canStand(site.x, site.y), false, 'não entrar na malha de '+site.label);
    for (const [x,y] of walk.slice(1)) {
      const dx = x-m.x, dy = y-m.y, n = Math.ceil(Math.hypot(dx,dy)/.10);
      for (let i=0; i<n; i++) move(m,dx/n,dy/n);
      assert.ok(Math.hypot(x-m.x,y-m.y)<1e-6, 'passarela obstruída antes de '+site.label);
    }
    assert.equal(scannerTarget(m), site);
    assert.ok(interact(m,site));
  }
  assert.equal(m.finished, true);
});

test('E só executa a etapa autorizada, uma vez; 3/3 autoriza, mas não conclui', () => {
  const progress = { archetype: 'mare_astral', inventory: ['eco'], level: 8 };
  const m = createMission(progress);
  assert.equal(Object.keys(abilities).length,4);
  assert.equal(interact(m, systems[0]),null,'fora de alcance');
  for (const locked of sites.slice(1)) {
    approach(m,locked);
    assert.equal(promptFor(m,scannerTarget(m)).kind,'locked');
    assert.equal(interact(m,locked),null);
  }
  assert.deepEqual(m.p.data,[]);
  for (const [i,s] of systems.entries()) {
    approach(m,s);
    assert.equal(currentSite(m),s);
    assert.equal(siteStatus(m,s),'ready');
    assert.equal(promptFor(m,scannerTarget(m)).line,`[E] ${s.action}`);
    assert.ok(interact(m,s).includes(s.log));
    assert.equal(siteStatus(m,s),'online');
    assert.equal(scannerTarget(m),null);
    assert.equal(interact(m,s),null);
    assert.equal(m.p.data.length,i+1);
    assert.equal(m.p.rank,i+2);
  }
  assert.equal(currentSite(m),anchor);
  assert.equal(m.p.completed,false);
  assert.equal(m.finished,false);
  approach(m,anchor);
  assert.ok(interact(m,anchor).includes('Âncora estável'));
  assert.equal(m.p.completed,true);
  assert.equal(currentSite(m),null);
  assert.equal(interact(m,anchor),null);
  assert.deepEqual(progress.inventory,['eco']); assert.equal(progress.level,8);
});

test('saves parciais em qualquer ordem retomam o primeiro sistema ausente, sem recompilação', () => {
  for (let mask=0; mask<8; mask++) {
    const data = systems.filter((_,i)=>mask & (1<<i)).reverse().map(s=>s.id);
    const saved = {version:1, data:[...data,...data,'desconhecido'], rank:1, elapsed:81, completed:false, lore:['diario'], lote5:{selo:true}};
    const m = createMission({mareMission:saved});
    assert.equal(m.p,saved); assert.deepEqual(m.p.data,data); assert.equal(m.p.elapsed,81);
    assert.deepEqual(m.p.lore,['diario']); assert.deepEqual(m.p.lote5,{selo:true});
    for (const s of systems.filter(s => !data.includes(s.id))) {
      assert.equal(currentSite(m),s); approach(m,s); assert.ok(interact(m,s));
    }
    assert.equal(currentSite(m),anchor); assert.equal(m.p.rank,4);
  }
  const invalid = createMission({mareMission:{data:[],rank:4}});
  approach(invalid,anchor); assert.equal(interact(invalid,anchor),null,'rank sozinho não abre portal');
});

test('notas são opcionais, de uso único e não avançam o circuito', () => {
  const m = createMission({}), note = notes[0];
  m.x=4.65; m.y=note.y; // atrás da parede oeste, mas a menos de 1,8 m
  assert.ok(canStand(m.x,m.y) && Math.hypot(m.x-note.x,m.y-note.y)<1.8);
  assert.equal(scannerTarget(m),null,'o scanner não lê através da parede');
  m.x=note.x+.8; m.y=note.y;
  assert.equal(scannerTarget(m),note); assert.equal(promptFor(m,note).kind,'lore');
  assert.equal(interact(m,note),null); useLore(m,note);
  assert.equal(scannerTarget(m),null); assert.deepEqual(m.p.data,[]); assert.equal(m.p.rank,1);
  assert.equal(promptFor(m,{id:'caldeira5'}),null);
});
