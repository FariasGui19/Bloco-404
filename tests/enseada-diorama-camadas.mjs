import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createDioramaRenderer } from '../js/ui/enseada-diorama-renderer.js';

// Contexto espião: verifica camadas, quadros, efeitos e recortes sem depender
// de GPU; o passeio completo deve também ser verificado em navegador real.
let calls=[];
const ctx = new Proxy({}, { get(target, key) {
  if (key in target) return target[key];
  return (...args) => { calls.push([key,...args]); };
}, set(target,key,value) { target[key]=value; return true; } });
class FakeImage {
  constructor() { this.complete=true; this.naturalWidth=256; this.naturalHeight=32; }
  set src(value) { this.path=value; if(value.includes('fauna-costeira')) {this.naturalWidth=1536;this.naturalHeight=1024;} }
}
globalThis.Image = FakeImage;
const draw=createDioramaRenderer({getContext:()=>ctx});
const manager={state:{clima:{luz:.7,chuva:1}},petTime:1,relaxing:true};
draw('fonte',manager,1,false,.5,-.5);
const used = calls.filter(c=>c[0]==='drawImage').map(c=>c[1].path);
for (const name of ['fauna-costeira','piscina.png','palmeira-baixa','ondulacao','vapor','bolhas','mao','chuva','cascata'])
  assert(used.some(p=>p.includes(name)),`Fonte deve usar ${name}`);
assert(calls.some(c=>c[0]==='clip'), 'Capivara submersa precisa de recorte');
const fauna=calls.find(c=>c[0]==='drawImage' && c[1].path.includes('fauna-costeira'));
assert.equal(fauna[3],768,'usa a linha da capivara da folha da fauna');
const depths = calls.filter(c=>c[0]==='translate').map(c=>c[1]);
assert(new Set(depths).size >= 3,'parallax deve deslocar camadas em intensidades distintas');
calls=[];draw('gruta',manager,2,false,-.7,.6);
const cave=calls.filter(c=>c[0]==='drawImage').map(c=>c[1].path);
for (const name of ['gruta-oeste-compacta','mar.png','onda.png','respingo','chuva','rochas-borda'])
  assert(cave.some(p=>p.includes(name)),`Gruta deve usar ${name}`);
assert(calls.some(c=>c[0]==='clip' && c[1]==='evenodd'), 'moldura deve deixar abertura para a paisagem');
const names=['mar','onda','ondulacao','vapor','bolhas','chuva','respingo','mao','brilho','cascata'];
for (const n of names) {
 const path=`assets/sprites/enseada-fpv-lote1/${n}.png`;
 assert(existsSync(path),path);const png=readFileSync(path);assert.equal(png.readUInt32BE(16),256);assert.equal(png.readUInt32BE(20),32);
}
const html=readFileSync('index.html','utf8');assert(!html.includes('enseada-imersiva/capivara.png'));
console.log('Diorama: 10 folhas, fauna do mapa, recortes, clima e planos parallax OK.');
