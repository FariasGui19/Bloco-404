import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadSprites} from '../js/engine/sprites.js';
import {FOLHAS_TENTACULO_02,SPRITES_TENTACULO_02,poseTentaculo02,desenharTentaculo02} from '../js/engine/docas-tentaculo-02.js';
import {desenharTentaculoRessaca} from '../js/engine/docas-ressaca.js';
import {desenharEmbarquePesqueiro} from '../js/engine/docas-cascos.js';
import {map} from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';
assert.equal(SPRITES_TENTACULO_02.length,10);
let total=0;
for(const {id,src} of SPRITES_TENTACULO_02){
 const info=FOLHAS_TENTACULO_02[id.replace('docas_t02_','')];
 const bytes=readFileSync(src);assert.equal(bytes.toString('ascii',8,16),'WEBPVP8L');
 const flags=bytes.readUInt32LE(21);assert(flags&(1<<28));
 assert.equal((flags&0x3fff)+1,info.w*info.columns);
 assert.equal(((flags>>>14)&0x3fff)+1,info.h*Math.ceil(info.frames/info.columns));total+=info.frames;
}
assert.equal(total,156);
assert.deepEqual(poseTentaculo02(0),{id:'tentaculo-emerge',frame:0});
assert.deepEqual(poseTentaculo02(.25),{id:'tentaculo-dobra',frame:0});
assert.deepEqual(poseTentaculo02(.5),{id:'tentaculo-alcance',frame:0});
assert.deepEqual(poseTentaculo02(1),{id:'tentaculo-recolhe',frame:14});
const draws=[];
const ctx={globalAlpha:1,save(){},restore(){this.globalAlpha=1;},drawImage(img,...args){draws.push([img.url,...args]);}};
assert.equal(desenharTentaculo02(ctx,100,200,1,0),false,'old art can be used before loading');
globalThis.Image=class{set src(src){this.url=src;this.width=1180;this.height=702;this.onload();}};
await loadSprites(SPRITES_TENTACULO_02);
for(const p of [0,.2499,.25,.5,.75,1]){
 const start=draws.length;assert(desenharTentaculoRessaca(ctx,100,200,1,p));
 const items=draws.slice(start);assert.equal(items.length,7);
 const body=items.find(a=>a[0].includes('/tentaculo-'));
 assert.deepEqual(body.slice(-4),[28,59,192,160],'2x paint keeps the same world footprint and root');
}
const before=draws.length;assert(desenharTentaculo02(ctx,0,0,1,0,0));assert.equal(draws.length,before);
const cais=map.objects.find(o=>o.id==='cais_enseada_visual');
assert.equal(cais.animacaoFolha.sprite,'enseada_cais_pesqueiro_folha');
assert.equal(cais.larguraPx,370);
const embarque=map.objects.find(o=>o.id==='barco_expedicao_enseada');
assert.equal(embarque.x,44.8);assert.equal(embarque.y,42.6);assert.equal(embarque.renderizar,false,'do not duplicate interaction art');
await loadSprites([{id:'enseada_cais_barco',src:'assets/sprites/docas-cascos/enseada-cais-pesqueiro.png'},{id:'enseada_cais_pesqueiro_folha',src:'assets/sprites/docas-cascos/enseada-cais-pesqueiro-folha.png'}]);
assert(desenharEmbarquePesqueiro(ctx,cais,400,500,null));assert.equal(draws.at(-1)[1],0);
assert(desenharEmbarquePesqueiro(ctx,cais,400,500,.81));assert.equal(draws.at(-1)[1],1180);
const ui=readFileSync('js/ui/travessia-neblina.js','utf8');
assert(ui.includes("imagemBarco.src='assets/sprites/docas-cascos/pesqueiro-repouso.png'"));
assert(ui.includes('h:112*568/610'),'navigation keeps the mast aspect ratio');
console.log('Lote 02: 10 folhas / 156 poses; raiz, escala 2x, água, fallback, embarque e navio de travessia OK.');
