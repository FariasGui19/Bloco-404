// DOM, WebAudio e manager de produção com estado isolado. A travessia física
// completa está em mare-mission.mjs; aqui os encontros podem ser posicionados.
import assert from 'node:assert/strict';
import { chromium } from '../.qa/node_modules/playwright-core/index.mjs';
import binary from '../.qa/node_modules/@sparticuz/chromium/build/index.js';
const browser = await chromium.launch({ executablePath: await binary.executablePath(), args:binary.args, headless:true });
try {
  const page = await browser.newPage({hasTouch:true,viewport:{width:1280,height:720}}), errors=[];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/baia-test',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><title>Baía</title>'}));
  await page.goto((process.env.PREVIEW_ORIGIN ?? 'http://127.0.0.1:8000')+'/baia-test');
  await page.evaluate(async()=>{
    const {initDimensionModule}=await import('/js/dimension/ui.js');
    const {sites}=await import('/js/dimension/mare-mission-circuit.js');
    window.s={player:{x:5,y:4,health:77},world:{currentMapId:'mare_cromatica_fenda'}, progress:{archetype:'mare_astral',inventory:['eco'],mareCromatica:{ancoraEstavel:true,desfecho:'parcial'}}};
    window.saves=0;
    window.manager=initDimensionModule({state:s,clearInput(){},canEnter:()=>true,save(){saves++}}).manager;
    window.tick=(n=1)=>{for(let i=0;i<n;i++) manager.tick(.05); if(manager.error)throw Error(manager.error)};
    window.enter=async()=>{if(!await manager.enter({reason:'mare-cromatica:baia-v1'}))throw Error(manager.error);tick(22)};
    window.standAt=i=>{const m=manager.runtime.mission,site=sites[i];[m.x,m.y]=site.approach;m.angle=Math.atan2(site.y-m.y,site.x-m.x);m.vx=m.vy=0;tick()};
    window.lights=()=>sites.slice(0,3).map(site=>manager.runtime.world3d.scene.getObjectByName('H03-'+site.short).getObjectByName('baliza').material.color.getHexString());
    await enter();
  });
  const read=(selector)=>page.locator('.mare-mission '+selector).textContent();
  const e=async()=>{await page.keyboard.press('e');await page.evaluate(()=>tick())};
  assert.equal(await page.evaluate(()=>manager.runtime.world3d.available),true);
  assert.equal(await read('.mare-next-count'),'0/3');
  assert.deepEqual(await page.evaluate(()=>lights()),['ffbc59','ed6959','ed6959']);
  await page.keyboard.down('w');await page.evaluate(()=>tick(29));await page.keyboard.up('w');
  assert.equal(await read('aside'),'[E] SINTONIZAR SENSOR COSTEIRO');
  await page.locator('[data-audio]').click(); assert.match(await read('[data-audio]'),/ON/);
  await e(); await e();
  assert.equal(await read('.mare-next-count'),'1/3');
  assert.deepEqual(await page.evaluate(()=>lights()),['68f3d4','ffbc59','ed6959']);
  assert.match(await read('.mare-message'),/Partida do gerador liberada/);
  await page.evaluate(()=>standAt(3)); await e();
  assert.match(await read('aside'),/^ÂNCORA SEM REDE/);
  assert.equal(await page.evaluate(()=>manager.runtime.mission.finished),false);

  // Uma nota fora do caminho e combate real não contam como sinais.
  await page.evaluate(()=>{const m=manager.runtime.mission;m.x=7.1;m.y=9.5;tick()});
  assert.match(await read('aside'),/LER DIÁRIO.*OPCIONAL/);await e();
  assert.deepEqual(await page.evaluate(()=>s.progress.mareMission.lore),['diario']);
  await page.evaluate(()=>{const m=manager.runtime.mission;m.x=16;m.y=22;m.p.elapsed=46;Object.assign(manager.runtime.enemies[0],{x:16,y:21,hp:3,phase:'hunt'});tick()});
  await page.keyboard.press('f');await page.keyboard.press('q');
  assert.ok(await page.evaluate(()=>manager.runtime.enemies[0].hp<3));
  await page.keyboard.press('Escape');await page.evaluate(()=>tick(15));
  assert.equal(await page.locator('.mare-mission').count(),0);
  assert.equal(await page.evaluate(()=>s.progress.dimensionalRupture),undefined);
  await page.evaluate(()=>enter());assert.equal(await read('.mare-next-count'),'1/3');
  assert.equal(await read('.mare-next-action'),'REATIVAR GERADOR AUXILIAR');
  await page.evaluate(()=>standAt(1));
  await page.locator('[data-map]').click();await page.evaluate(()=>tick());
  await e();assert.equal(await read('.mare-next-count'),'1/3','o mapa não aciona máquinas');
  await page.keyboard.press('m');await page.evaluate(()=>tick());
  assert.equal(await read('aside'),'[E] REATIVAR GERADOR AUXILIAR');
  await page.locator('[data-action]').tap();await page.evaluate(()=>tick());
  assert.deepEqual(await page.evaluate(()=>lights()),['68f3d4','68f3d4','ffbc59']);
  await page.evaluate(()=>standAt(2));assert.equal(await read('aside'),'[E] SINCRONIZAR PAINEL DA ÂNCORA');await e();
  assert.equal(await read('.mare-next-action'),'ESTABILIZAR ÂNCORA');assert.equal(await read('.mare-next-count'),'3/3');
  assert.deepEqual(await page.evaluate(()=>lights()),['68f3d4','68f3d4','68f3d4']);
  assert.ok(!await page.evaluate(()=>s.progress.mareMission.completed || s.progress.dimensionalRupture));
  await page.evaluate(()=>standAt(3));await e();
  assert.match(await read('.mare-message'),/Âncora estável/);
  await page.evaluate(()=>tick(100));assert.equal(await page.locator('.mare-mission').count(),0);
  assert.equal(await page.evaluate(()=>s.progress.dimensionalRupture.status),'pending');
  assert.equal(await page.evaluate(()=>s.progress.mareMission.completed),true);
  assert.deepEqual(await page.evaluate(()=>[s.player.x,s.player.y,s.player.health,s.progress.inventory]),[5,4,77,['eco']]);

  // Sem WebGL, a saída por tempo é uma retirada, não uma vitória nem softlock.
  await page.evaluate(async()=>{
    const get=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(k,...args){return k.includes('webgl') ? null : get.call(this,k,...args)};
    delete s.progress.dimensionalRupture;
    s.progress.mareMission={data:['eco','fita'],rank:1,elapsed:599.98,completed:false};
    await enter();
  });
  assert.equal(await page.evaluate(()=>manager.runtime.world3d.available),false);
  assert.match(await read('.mare-message'),/Retirada de emergência/);
  await page.evaluate(()=>tick(100));assert.equal(await page.evaluate(()=>manager.mode),'2d');
  assert.equal(await page.evaluate(()=>s.progress.dimensionalRupture),undefined);
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>enter());assert.equal(await read('.mare-next-count'),'2/3');
  assert.ok(await page.evaluate(() => {
    const rect = sel => document.querySelector('.mare-mission '+sel).getBoundingClientRect();
    return rect('.mare-move').bottom < rect('.mare-log').top && rect('.mare-look').right <= innerWidth;
  }), 'controles de toque não cobrem o log nem saem da tela');
  await page.evaluate(()=>standAt(1));await e();assert.equal(await read('.mare-next-action'),'ESTABILIZAR ÂNCORA');
  await page.evaluate(()=>standAt(3));await e();await page.keyboard.press('Escape');await page.evaluate(()=>tick(15));
  assert.equal(await page.evaluate(()=>s.progress.mareMission.completed),true,'ESC na vinheta não perde conclusão');
  assert.equal(await page.evaluate(()=>s.progress.dimensionalRupture.status),'pending');

  // Falha de arte obrigatória ainda desfaz montagem e restaura o mundo anterior.
  await page.route('**/mare-missao-lote2/radio.png',r=>r.abort());
  assert.equal(await page.evaluate(()=>manager.enter({reason:'mare-cromatica:baia-v1'})),false);
  assert.equal(await page.evaluate(()=>manager.mode),'2d');assert.equal(await page.locator('.mare-mission').count(),0);
  assert.deepEqual(errors,[]);
  console.log('Baía: circuito WebGL/Canvas, cores, E/toque, áudio, mapa, retomada, retirada e handoff OK.');
} finally {await browser.close()}
