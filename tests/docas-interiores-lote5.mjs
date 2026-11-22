import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {SUPERFICIES_INTERIORES_LOTE5 as details,POSES_INFECTADO_DOCAS as poses} from '../js/data/worlds/arquipelago-rotas-perdidas/docas-interiores-lote5.js';
import {poseInfectadoDocas} from '../js/engine/docas-infectados.js';
import {docas} from '../js/data/worlds/arquipelago-rotas-perdidas/docas-neblina.js';
import {podePisarDocas} from '../js/game/docas-navigation.js';
import {createTrainingTargets} from '../js/game/combat.js';
import {atualizarAmeacasCromaticas,criarAmeacaCromatica} from '../js/game/mare-cromatica-ameacas.js';
const manifest=JSON.parse(readFileSync('assets/sprites/docas-interiores-lote5/manifest.json'));
assert.equal(manifest.count,10);assert.equal(details.length,7);assert.equal(poses.length,3);assert.equal(readdirSync('assets/source-art/docas-interiores-lote5').filter(n=>n.endsWith('.png')).length,10);
const main=readFileSync('js/main.js','utf8');
for(const r of manifest.assets){const b=readFileSync(`assets/sprites/docas-interiores-lote5/${r.id}.png`);assert.equal(b[25],6);assert(r.size.every(n=>n<=512));assert.equal(createHash('sha256').update(readFileSync(`assets/source-art/docas-interiores-lote5/${r.id}.png`)).digest('hex'),r.sourceSha256);assert(main.includes('assets/sprites/docas-interiores-lote5/'+r.id+'.png'));}
for(const s of details){const [a,b,c,d]=s.box;if(s.plane==='floor')assert(a+c<12&&b+d<9);else assert(a>=1&&b<=(s.plane==='left'?(s.room==='crt'?8:9):(s.room==='crt'?10:12))&&c>=0&&d<=92);}
assert.equal(poseInfectadoDocas({clock:3}).phase,'repouso');assert.equal(poseInfectadoDocas({clock:3,cromaticaMovendo:true}).phase,'passo');
for(const [fields,phase] of [[{windup:.4},'preparo'],[{attackVisual:.1},'golpe'],[{hitTimer:.1,windup:.2},'impacto']])assert.equal(poseInfectadoDocas(fields).phase,phase);
assert.deepEqual(poseInfectadoDocas({clock:0},true),poseInfectadoDocas({clock:9},true));
const enemies=createTrainingTargets(docas);for(const e of enemies)assert(podePisarDocas(docas.navegacaoDocas,e.x,e.y,.22),'enemy spawns on actual floor, not cliff');
const e={x:0,y:0,health:50,cromaticaEnemy:true},player={x:3,y:0},runtime=criarAmeacaCromatica(docas);
// A local obstacle blocks direct movement, tangent steering may use free floor.
atualizarAmeacasCromaticas(docas,runtime,[e],player,{},.1,(_m,x,y)=>Math.abs(y)>.01||x<=0,()=>{});assert(e.cromaticaMovendo);assert(Math.abs(e.y)>.01);
const stopped={x:0,y:0,health:50,cromaticaEnemy:true};atualizarAmeacasCromaticas(docas,runtime,[stopped],player,{},.1,()=>false,()=>{});assert(!stopped.cromaticaMovendo);assert.equal(stopped.x,0);assert.equal(stopped.y,0);
console.log('Lote 5: ten originals, seven nonblocking details, three combat poses; grounded enemy spawns, collision-checked steering and reduced motion OK.');
