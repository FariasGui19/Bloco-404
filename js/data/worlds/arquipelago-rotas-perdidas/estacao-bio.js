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
const objects = [
  // A base sólida não ocupa o spawn nem os espaços de interação.
  {id:'bio_terminal_principal',tipo:'decoracao',x:12,y:8,sprite:'bio_terminal',useCrop:true,larguraPx:420,pivotX:.5,pivotY:1,bloqueia:true,hitbox:{offsetX:-5.4,offsetY:-5.4,width:5.4,height:5.4}},
  {id:'bio_reator_patio',tipo:'decoracao',x:38,y:17,sprite:'bio_reator',useCrop:true,larguraPx:130,pivotX:.5,pivotY:1,bloqueia:true,hitbox:{offsetX:-1.25,offsetY:-1.25,width:1.25,height:1.25}},
  {id:'bio_estufa_principal',tipo:'decoracao',x:58,y:47,sprite:'bio_estufa',useCrop:true,larguraPx:340,pivotX:.5,pivotY:1,bloqueia:true,hitbox:{offsetX:-4.3,offsetY:-4.3,width:4.3,height:4.3}},
  // As pontes ficam na camada de fundo, sob os pés, sobre os vãos já existentes.
  {id:'bio_ponte_patio',tipo:'decoracao',x:25.5,y:19.5,sprite:'bio_ponte',useCrop:true,larguraPx:240,pivotX:.5,pivotY:.50,espelhar:true,camada:'fundo',bloqueia:false},
  {id:'bio_ponte_estufa',tipo:'decoracao',x:45.5,y:39.5,sprite:'bio_ponte',useCrop:true,larguraPx:240,pivotX:.5,pivotY:.50,camada:'fundo',bloqueia:false},
];
// Vegetação agrupada ao redor das instalações em vez de uma grade regular.
for (let y=5; y<68; y+=6) for (let x=5; x<68; x+=6) {
  const n = (x * 97 + y * 131 + x * y * 17) % 11;
  if (n > 5 || (x>20 && x<32 && y>12 && y<28) || (x>39 && x<53 && y>33 && y<46) || (x<20 && y<22) || (x>29 && x<42 && y>12 && y<25) || (x>42 && x<58 && y>42 && y<57)) continue;
  objects.push({id:`estacao_planta_${x}_${y}`,tipo:'decoracao',x:x+((x*y)%5-2)*.4,y:y+((x+2*y)%5-2)*.4,sprite:'vegetacao_tropical',frame:{col:n%2?2:3,row:0},useCrop:true,larguraPx:65+(x*y)%35,pivotX:.5,pivotY:1,bloqueia:false});
}
for (const [id,x,y,col,row,w] of [
  ['bio_destroc_1',14,10,3,1,62], ['bio_destroc_2',17,18,2,1,55],
  ['bio_destroc_3',33,23,3,0,54], ['bio_destroc_4',48,52,2,1,64],
  ['bio_destroc_5',54,53,3,1,58], ['bio_destroc_6',41,25,3,0,48],
]) objects.push({id,tipo:'decoracao',x,y,sprite:'beach_props',frame:{col,row},useCrop:true,larguraPx:w,pivotX:.5,pivotY:1,bloqueia:false});
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
