import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPRITES_DOCAS_VIVAS, faseDocas, poseNavio } from '../js/engine/docas-vivas.js';
import { CAIS_SUL } from '../js/data/worlds/arquipelago-rotas-perdidas/cais-sul.js';
import { DOCAS_FOLEY, sintetizarPartitura, sintetizarFoley, criarPaisagemDocas, atualizarPaisagemDocas } from '../js/game/docas-paisagem-sonora.js';

assert.equal(SPRITES_DOCAS_VIVAS.length,10);
assert.equal(new Set(SPRITES_DOCAS_VIVAS.map(s=>s.id)).size,10);
for (const {src} of SPRITES_DOCAS_VIVAS){
  const file=readFileSync(src);
  assert.equal(file.toString('ascii',0,4),'RIFF');
  assert.equal(file.toString('ascii',8,16),'WEBPVP8L');
  assert.equal(file[20],0x2f);
  const flags=file.readUInt32LE(21);
  assert(flags&1<<28,'atlas tem transparência');
  assert.equal((flags&0x3fff)+1,640,'4 colunas de 160 px');
  assert.equal(((flags>>>14)&0x3fff)+1,384,'4 linhas de 96 px');
}
assert.equal(faseDocas(null,4,.6),0);
assert.equal(faseDocas(4,4),0);
assert.equal(faseDocas(6,4),.5);
const boat=CAIS_SUL.pecas.find(p=>p.id==='pesqueiro');
assert.deepEqual(poseNavio(boat,null),{bob:0,lean:0,drift:0});
assert.notDeepEqual(poseNavio(boat,0),poseNavio(boat,1.3));
assert.deepEqual(poseNavio(CAIS_SUL.pecas.find(p=>p.id==='deck'),1.3),{bob:0,lean:0,drift:0});

const partitura=sintetizarPartitura(2000);
assert.equal(partitura.length,64000);
assert.deepEqual(partitura,sintetizarPartitura(2000));
for (const pcm of [partitura,...DOCAS_FOLEY.map(id=>sintetizarFoley(id,2000))]){
  assert(pcm.some(sample=>Math.abs(sample)>.02),'cada camada tem sinal');
  assert(pcm.every(sample=>Number.isFinite(sample)&&Math.abs(sample)<1),'nenhuma camada clipa');
  assert(Math.abs(pcm[0]-pcm.at(-1))<.12,'fronteira não dá um salto brusco');
}
const param=()=>({value:0,setTargetAtTime(v){this.value=v;}});
const nodo=()=>({gain:param(),pan:param(),connect(){},start(){}});
const ctx={createGain:nodo,createStereoPanner:nodo,createBufferSource:nodo,createBuffer(_c,n){const data=new Float32Array(n);return {getChannelData:()=>data};}};
const channels=criarPaisagemDocas(ctx,nodo());
atualizarPaisagemDocas(channels,0,{ondas:{gain:1,pan:-.6},sino:{gain:.5,pan:.2}},false);
assert.equal(channels[0].gain.gain.value,.32);
assert.equal(channels[1].gain.gain.value,.38);
assert.equal(channels[1].pan.pan.value,-.6);
assert.equal(channels[2].gain.gain.value,0);
assert.equal(channels[3].gain.gain.value,.1);
atualizarPaisagemDocas(channels,1,{ondas:{gain:.5}},true);
assert(channels[0].gain.gain.value<.32,'trilha recua no perigo');
atualizarPaisagemDocas(channels,2,null,false);
assert(channels.every(c=>c.gain.gain.value===0),'sair do cais ou pausar cala as camadas locais');
console.log('Docas vivas: 10 atlas RGBA, ciclos visualmente ancorados, trilha e 4 fontes locais sem clipping.');
