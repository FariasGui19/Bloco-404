import assert from 'node:assert/strict';
import { map } from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';
import { VEGETACAO } from '../js/data/enseada-vegetacao.js';
import { createBeachSurface } from '../js/engine/beach-surface.js';
import { createCoastalFauna, habitatAllows } from '../js/game/fauna-costeira.js';
import { canStandAt, moveWithCollision } from '../js/game/collision.js';
import { state } from '../js/game/state.js';

const obj = id => { const o=map.objects.find(o=>o.id===id); assert(o, id); return o; };
const arc=obj('arco_conduto_retorno_mare');
assert.equal(arc.sprite, 'enseada_sudeste_portal_completo');
// O coral azul faz parte do sprite e acompanha a rocha integralmente.
assert.equal(arc.x, 53.85); assert.equal(arc.y, 27.95);
assert.equal(obj('cristais_azuis_mar').renderizar, false);
for (const [x,y] of [[48,19],[49,20],[50,20],[49,21],[50,21],[51,22],[52,22],[52,23]]) {
 assert('YyDdX'.includes(map.aguaPraia[y][x]), `língua de areia removida em ${x},${y}`);
}

assert.equal(arc.vorticidadeCorrentes.y, -139, 'vórtice deve ficar no arco');
assert.equal(obj('encosta_portal_sudeste').bloqueia, false);
assert.equal(obj('encosta_portal_sudeste').renderizar, false);
assert.equal(map.objects.filter(o => o.id.startsWith('grama_trilha_sudeste_')).length, 9);
assert(map.objects.filter(o => o.id.startsWith('grama_trilha_sudeste_')).every(o => o.oscilaBrisa && !o.bloqueia));
assert.equal(obj('ninho_tartarugas_enseada').sprite, 'enseada_sudeste_cercado');
assert.equal(obj('poleiro_aves_enseada').sprite, 'enseada_sudeste_gaivotas');
assert.equal(obj('conchas_fosseis_sudeste').sprite, 'enseada_sudeste_conchas');
for(const id of ['bau_deriva_enseada','banco_ostras_enseada','captador_ecos_enseada']) {
 const o=obj(id); assert.equal(o.renderizar,false); assert(o.interacao, `${id} mantém interação`);
}
assert(map.objects.filter(o=>o.id.startsWith('pedra_travessia_sudeste_')).every(o=>o.renderizar===false));
const palms = [[43.65,27.4],[44.9,26.78],[45.61,25.45]];
assert(palms.every(([x,y])=>VEGETACAO.some(([tipo,px,py])=>['P','M','B','J'].includes(tipo) && px===x && py===y)));
const fauna=createCoastalFauna(map);
for (const id of ['enseada_caranguejo_areia_1','enseada_caranguejo_areia_2','enseada_tartaruga_sudeste','enseada_golfinho_sudeste']) {
 const a=fauna.find(f=>f.id===id);assert(a, `${id} deve nascer em habitat válido`);assert(habitatAllows(map,a.species,a.x,a.y));
}
const light=obj('lanterna_coral_sudeste');assert('YyDdX'.includes(map.aguaPraia[Math.floor(light.y+.5)]?.[Math.floor(light.x+.5)] ?? ''), 'lanterna deve estar sobre água');
const opts={celulasGrama:map.celulasGrama,ajusteSolo:map.ajusteSolo,ajusteSoloCentral:map.ajusteSoloCentral};
const before=createBeachSurface(map.aguaPraia,4,opts),after=createBeachSurface(map.aguaPraia,4,{...opts,ajusteSoloSudeste:map.ajusteSoloSudeste});
for(let i=3;i<before.pixels.length;i+=4)assert.equal(before.pixels[i],after.pixels[i], 'máscara de terra preservada');
for(const [x,y] of [[20,50],[33,36],[15,32]]) {const i=(Math.floor(y*4)*before.width+Math.floor(x*4))*4;assert.deepEqual(after.pixels.slice(i,i+4),before.pixels.slice(i,i+4),'outros setores intactos');}
state.objects=map.objects.map(o=>({...o,x:o.x+.5,y:o.y+.5}));
const spawn=map.spawnPoints.vindo_da_praia,queue=[[Math.round(spawn.x*2),Math.round(spawn.y*2)]],seen=new Set(),reach=[];
for(let i=0;i<queue.length;i++){const [ix,iy]=queue[i],key=`${ix},${iy}`;if(seen.has(key))continue;seen.add(key);const x=ix/2,y=iy/2;if(!canStandAt(map,x,y,.2,state.player))continue;reach.push([x,y]);queue.push([ix+1,iy],[ix-1,iy],[ix,iy+1],[ix,iy-1]);}
for(const id of ['ninho_tartarugas_enseada','poleiro_aves_enseada','bau_deriva_enseada','captador_ecos_enseada','cais_madeira_pesca_enseada','barco_expedicao_enseada']) {const o=obj(id);assert(reach.some(([x,y])=>Math.hypot(x-o.x-.5,y-o.y-.5)<=o.interacao.distancia),`${id}: alcance de interação`);}
console.log('Sudeste: composição, fauna, terreno e interações OK.');
// O eixo da trilha é um único caminho contínuo, de terra firme e acessível.
assert(map.trilhaEstacaoPortal.length >= 2);
for (let i=0; i<map.trilhaEstacaoPortal.length; i++) {
 const [ax,ay,bx,by]=map.trilhaEstacaoPortal[i];
 if (i) {const prev=map.trilhaEstacaoPortal[i-1]; assert.equal(ax,prev[2]);assert.equal(ay,prev[3]);}
 for(let j=0;j<=20;j++){const t=j/20,x=ax+(bx-ax)*t,y=ay+(by-ay)*t;
  assert(canStandAt(map,x,y,.2,state.player),`trilha bloqueada em ${x},${y}`);
 }
}
const entrada=map.portals.find(p=>p.id==='acesso_estacao_666');
const [ax,ay]=map.trilhaEstacaoPortal[0];
assert(Math.hypot(ax-entrada.x-.5,ay-entrada.y-.5)<.05, 'trilha inicia na entrada da estação');

// Percorre o eixo em pequenos passos com a colisão real, não só amostras.
const jogador = {x: ax, y: ay};
for (const [x0,y0,x1,y1] of map.trilhaEstacaoPortal) {
 const n=Math.ceil(Math.hypot(x1-x0,y1-y0)/.08);
 for(let i=1;i<=n;i++) { const x=x0+(x1-x0)*i/n, y=y0+(y1-y0)*i/n;
  moveWithCollision(map,jogador,x-jogador.x,y-jogador.y,.2);
  assert(Math.hypot(jogador.x-x,jogador.y-y)<.02,'trilha deve ser caminhável');
 }
}

// Os recuos alteram água e colisão em conjunto, nos dois trechos anotados.
for (const [x,y] of [[2,40],[50,39],[49,40]]) {
 assert('YyDdX'.includes(map.aguaPraia[y][x]), `corte costeiro em ${x},${y} deve ser água`);
 assert.equal(map.walkMask[y][x], '#', 'água não pode conservar colisão de terra');
}
const solo=createBeachSurface(map.aguaPraia,8,{celulasGrama:map.celulasGrama,
 ajusteSolo:map.ajusteSolo,ajusteSoloCentral:map.ajusteSoloCentral,
 ajusteSoloSudeste:map.ajusteSoloSudeste,trilhaEstacaoPortal:map.trilhaEstacaoPortal});
const cor=(x,y)=>{const i=(Math.floor(y*8)*solo.width+Math.floor(x*8))*4;return [...solo.pixels.slice(i,i+4)];};
const areia=cor(47.44,36.81), relva=cor(47.91,31.03);
assert(areia[0]>areia[1] && areia[3]===255, 'orla do cercado deve ser areia');
assert(relva[1]>relva[0] && relva[3]===255, 'vegetação deve ter grama sob os pés');
