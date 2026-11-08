// Primeiro setor explorável inspirado no conceito; arte final e combate virão depois.
import { buildGround } from '../../ground.js';
const size = 72;
const rows = Array.from({length:size}, (_, y) => Array.from({length:size}, (_, x) => {
  if (x < 2 || y < 2 || x >= size - 2 || y >= size - 2) return 'X';
  // Pátios e caminhos largos, com canais que oferecem desvios nas pontes.
  if ((x === 25 || x === 26) && y > 6 && y < 65 && !(y >= 17 && y <= 22) && !(y >= 47 && y <= 52)) return 'X';
  if ((y === 39 || y === 40) && x > 30 && x < 66 && !(x >= 43 && x <= 48) && !(x >= 60 && x <= 63)) return 'X';
  return (x + y) % 5 === 0 ? 'T' : 'S';
}).join(''));
const ground = buildGround({sheet:'BEACH_FLOOR_SPRITE', rows, legend:{
  S:{tiles:[[0,0]],walk:true}, T:{tiles:[[1,0]],walk:true}, X:{tiles:[[1,1]],walk:false},
}});
const objects=[];
for (let y=5; y<68; y+=6) for (let x=5; x<68; x+=6) {
  // Manter as vias centrais e objetivos livres; árvores são decoração sem colisão.
  if ((x>7 && x<20 && y>8 && y<22) || (x>42 && x<56 && y>42 && y<57)) continue;
  objects.push({id:`estacao_planta_${x}_${y}`,tipo:'decoracao',x:x+((x*y)%5-2)*.4,y:y+((x+2*y)%5-2)*.4,sprite:'vegetacao_tropical',frame:{col:2+(x*y)%4,row:0},useCrop:true,larguraPx:65+(x*y)%35,pivotX:.5,pivotY:1,bloqueia:false});
}
for (const [id,x,y,col,row,scale] of [
  ['bio_entrada_portal',10,7,2,0,.50], ['bio_painel_chegada',14,12,0,1,.42],
  ['bio_terminal_patio',34,17,0,1,.45], ['bio_terminal_estufa',48,47,0,1,.45],
  ['bio_banco_1',31,23,1,1,.50], ['bio_banco_2',53,54,1,1,.50],
]) objects.push({id,tipo:'decoracao',x,y,sprite:'hub_props',frame:{col,row},scale,anchorY:.94,bloqueia:false});
for (const [id,x,y,label] of [['estacao_chegada',8,10,'CHEGADA'],['estacao_patio',36,20,'PÁTIO'],['estacao_estufa',50,50,'ESTUFA']]) objects.push({id,tipo:'decoracao',x,y,routeMarker:label,bloqueia:false});
export const map={
  id:'ilha_estacao_bio', meta:{nome:'ESTAÇÃO QUE RESPIRA · SETOR INICIAL',tipo:'exterior',dimensao:'arquipelago',corFundo:'#1e6384',estiloPiso:'livre',useBackgroundWalls:true,ambiente:{poeira:8,cor:'#ffd98a'},minZoom:.85},
  corChao:'#e6c280',aguaPraia:rows.map(r=>r.replaceAll('X','D')),layout:rows.map(r=>[...r].map(c=>c==='X'?1:0)),walkMask:ground.walkMask,pisos:ground.pisos,
  spawnPoints:{inicio:{x:9.5,y:10.5}},objects,
  trainingTargets:[{id:'simulador_bio_1',x:33,y:18,maxHealth:3},{id:'simulador_bio_2',x:48,y:51,maxHealth:3}],
  collectibles:[
    {id:'bio_estacao_condutor',nome:'CONDUTOR',tipo:'fragmento',x:15,y:15,label:'EXAMINAR CONDUTOR',dialogue:['UM CONDUTOR FALHOU NA ESTAÇÃO.','PROCURE O REGULADOR NO PÁTIO.']},
    {id:'bio_estacao_regulador',nome:'REGULADOR',tipo:'fragmento',x:36,y:20,requiresFlag:'collected_bio_estacao_condutor',label:'AJUSTAR REGULADOR',dialogue:['A PRESSÃO COMEÇA A ESTABILIZAR.','REATIVE A ESTUFA NO SETOR MAIS DISTANTE.']},
    {id:'bio_estacao_estufa',nome:'ESTUFA',tipo:'fragmento',x:50,y:50,requiresFlag:'collected_bio_estacao_regulador',label:'ESTABILIZAR ESTUFA',dialogue:['O PULSO DA ESTAÇÃO SE ESTABILIZA.','SETOR INICIAL CONCLUÍDO. O SISTEMA AINDA EXIGE UMA RECONSTRUÇÃO MAIS PROFUNDA.']},
  ],
  portals:[{id:'estacao_voltar',tipo:'door',x:8,y:10,label:'VOLTAR À PRAIA',interactionDistance:1.4,destino:{mapId:'ilha_praia_inicial',spawnId:'vindo_da_estacao'},transition:'fade'}],
};
