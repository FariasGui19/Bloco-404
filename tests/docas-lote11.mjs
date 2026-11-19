import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {docas,ESCALA_DOCAS} from '../js/data/worlds/arquipelago-rotas-perdidas/docas-neblina.js';
import {criarAmeacaCromatica,atualizarAmeacasCromaticas} from '../js/game/mare-cromatica-ameacas.js';
const names=['arbusto-costeiro','bandeirola','cais-lateral','cogumelos','correntes','gramineas','lanterna-chao','rocha-costeira','sucata','totem'];
const main=readFileSync('js/main.js','utf8');
function inside(x,y,p){let v=false;for(let i=0,j=p.length-1;i<p.length;j=i++){let [a,b]=p[i],[c,d]=p[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)v=!v;}return v;}
for(const name of names){
 const b=readFileSync(`assets/sprites/docas-lote11/${name}.png`);assert.equal(b.readUInt32BE(0),0x89504e47);assert.equal(b[25],6,`${name} RGBA`);
 const st=docas.estruturasDocas.find(s=>s.id==='lote11_'+name);assert(st,`${name} presente`);assert(main.includes(`docas_lote11_${name}`));
 assert(docas.geometriaDocas.polys.some(p=>inside(st.x/ESCALA_DOCAS,st.y/ESCALA_DOCAS,p)),`${name} tem pé sobre piso/deck`);
}
assert(docas.objects.some(o=>o.id==='docas_totem_mares'&&o.interacao));
const runtime=criarAmeacaCromatica(docas),e={x:10,y:10,health:50},player={x:12,y:10};e.cromaticaEnemy=true;
atualizarAmeacasCromaticas(docas,runtime,[e],player,{mareCromatica:{}},.1,()=>true,()=>{});assert(e.cromaticaMovendo);assert(e.cromaticaFaceDireita);
player.x=8;atualizarAmeacasCromaticas(docas,runtime,[e],player,{mareCromatica:{}},.1,()=>true,()=>{});assert(e.cromaticaMovendo);assert.equal(e.cromaticaFaceDireita,false);
atualizarAmeacasCromaticas(docas,runtime,[e],player,{mareCromatica:{}},.1,()=>false,()=>{});assert.equal(e.cromaticaMovendo,false,'inimigo bloqueado não caminha no lugar');
player.x=e.x-.5;atualizarAmeacasCromaticas(docas,runtime,[e],player,{mareCromatica:{}},.1,()=>true,()=>{});assert(e.windup>0);assert.equal(e.cromaticaMovendo,false,'preparação de ataque é estacionária');
console.log('Docas lote 11: dez artes ancoradas, marca narrativa e estados visuais do inimigo OK.');
