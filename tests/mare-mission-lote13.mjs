import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createMission, canStand, sceneryProps } from '../js/dimension/mare-mission-model.js';
import { sites, systems, anchor, circuitLegs, promptFor, nextObjective, relativeBearing, statusColor, cableColor } from '../js/dimension/mare-mission-circuit.js';
import { lote13Names, drawServiceMap, drawBayReport } from '../js/dimension/mare-mission-lote13.js';

test('os guias PSX usam arte publicada e a faixa de caminhada não cruza cenário', () => {
  for (const name of lote13Names) assert.ok(fs.existsSync(`assets/sprites/mare-missao-lote13/${name}.png`),name);
  for (const name of ['trilha-tabua','cabo-guia']) assert.ok(fs.existsSync(`assets/textures/mare-missao-lote13/${name}.png`));
  for (const {walk,cable,site} of circuitLegs) {
    assert.deepEqual(cable.at(-1),[site.x,site.y]);
    for (let i=1;i<walk.length;i++) {
      const [ax,ay]=walk[i-1], [bx,by]=walk[i];
      for(let j=0;j<=25;j++) {
        const x=ax+(bx-ax)*j/25, y=ay+(by-ay)*j/25;
        assert.ok(canStand(x,y));
        assert.ok(sceneryProps.every(p=>Math.hypot(p.x-x,p.y-y)>1.2),'adereço dentro da passagem');
      }
    }
  }
});

test('rumo e contador do scanner seguem o circuito, não a memória mais próxima', () => {
  const m = createMission({});
  for (const [i,site] of sites.entries()) {
    const next=nextObjective(m); assert.equal(next.target,site); assert.equal(next.have,i); assert.equal(next.need,3);
    assert.equal(promptFor(m,site).line,'[E] '+next.action);
    m.angle=Math.atan2(site.y-m.y,site.x-m.x); assert.ok(Math.abs(relativeBearing(m,site))<1e-6);
    m.angle+=Math.PI/2; assert.equal(Math.round(relativeBearing(m,site)),-90);
    if (site!==anchor) m.p.data.push(site.id);
  }
  m.finished=true; assert.equal(nextObjective(m),null);
});

test('mapa e relatório distinguem energia, etapa atual, retirada e retorno confirmado', () => {
  const wire = i => cableColor(m,circuitLegs[i]);
  const text=[];
  const g=new Proxy({fillText(s){text.push(s)}},{get:(o,k)=>o[k]??(()=>{})});
  const m=createMission({mareMission:{data:['fita','sal']}});
  assert.equal(wire(0),wire(2),'sinal do gerador já chega ao painel');
  assert.notEqual(wire(2),wire(3),'a derivação ao portal ainda está fria');
  drawServiceMap(g,m);
  assert.ok(text.includes('01 / SENSOR   ONLINE'));
  assert.ok(text.includes('02 / GERADOR   ONLINE'));
  assert.ok(text.includes('03 / PAINEL   PRONTO'));
  assert.ok(text.some(s=>s.includes('Painel da estação alimentado')));
  assert.ok(text.includes('A / ÂNCORA   SEM REDE'));
  assert.equal(new Set(Object.values(statusColor)).size,3);
  text.length=0; m.finished=m.timedOut=true; drawBayReport(g,m);
  assert.ok(text.includes('JANELA ENCERRADA')); assert.ok(!text.includes('ÂNCORA ESTABILIZADA'));
  text.length=0; m.timedOut=false; m.p.completed=true; m.p.data=systems.map(s=>s.id); drawBayReport(g,m);
  assert.ok(text.includes('ÂNCORA ESTABILIZADA')); assert.ok(text.some(s=>s.includes('3/3')));
});
