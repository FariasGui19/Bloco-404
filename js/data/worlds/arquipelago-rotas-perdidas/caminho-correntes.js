// Uma área própria: pequenos refúgios e mar navegável entre eles.
import { buildGround } from '../../ground.js';
const size = 48;
const terra = (x, y) => ((x - 5) / 4.2) ** 2 + ((y - 24) / 5.5) ** 2 < 1
  || ((x - 41) / 3.8) ** 2 + ((y - 24) / 4.8) ** 2 < 1;
const rows = Array.from({length:size}, (_, y) => Array.from({length:size}, (_, x) => {
  if (terra(x,y)) return [[-1,0],[1,0],[0,-1],[0,1]].some(([dx,dy]) => !terra(x+dx,y+dy)) ? 'M' : 'S';
  for (let dy=-2;dy<=2;dy++) for (let dx=-2;dx<=2;dx++) if (terra(x+dx,y+dy)) return 'Y';
  return 'D';
}).join(''));
const ground = buildGround({sheet:'BEACH_FLOOR_SPRITE', rows, legend:{
  S:{tiles:[[0,0]],walk:true}, M:{tiles:[[1,0]],walk:true},
  Y:{tiles:[[2,2]],walk:false}, D:{tiles:[[1,1]],walk:false},
}});
export const map = {
  id:'mar_caminho_das_correntes',
  meta:{nome:'CAMINHO DAS CORRENTES', tipo:'exterior', dimensao:'arquipelago', corFundo:'#025074', estiloPiso:'livre', useBackgroundWalls:true, sandSprite:'beach_novas_artes', ambiente:{poeira:6,cor:'#a6e8df'}},
  corChao:'#e6c280', layout:rows.map(r => [...r].map(c => 'SM'.includes(c) ? 0 : 1)), walkMask:ground.walkMask, pisos:ground.pisos, aguaPraia:rows,
  spawnPoints:{inicio:{x:5.5,y:24.5}, vindo_da_enseada:{x:5.5,y:24.5}},
  // Marcos legíveis na superfície; os mesmos pontos têm balizas 3D no fundo.
  pontosCorrente:[
    {id:'primeira', nome:'RECIFE DA ESCUTA', x:14.5,y:24.5},
    {id:'segunda', nome:'JARDIM DAS MARÉS', x:24.5,y:19.5},
    {id:'terceira', nome:'FAROL SUBMERSO', x:34.5,y:24.5},
  ],
  objects:[
    {id:'marco_retorno',tipo:'decoracao',x:5,y:24,routeMarker:'ENSEADA',bloqueia:false},
    ...[[14,24,'RECIFE'],[24,19,'JARDIM'],[34,24,'FAROL']].map(([x,y,nome],i)=>({id:`marco_corrente_${i}`,tipo:'decoracao',x,y,routeMarker:nome,bloqueia:false})),
    ...[[4,22],[6,26],[40,22],[42,26]].map(([x,y],i)=>({id:`palmeira_corrente_${i}`,tipo:'decoracao',x,y,sprite:'vegetacao_tropical',frame:{col:2,row:0},useCrop:true,larguraPx:80,pivotY:1,bloqueia:false})),
  ],
  fauna:[{id:'corrente_peixes',species:'peixes',x:16.5,y:24.5},{id:'corrente_gaivota',species:'gaivota',x:40.5,y:24.5}],
  portals:[{id:'correntes_enseada',tipo:'door',x:5,y:24,label:'VOLTAR À ENSEADA DOS ECOS',interactionDistance:1.4,destino:{mapId:'ilha_enseada_ecos',spawnId:'vindo_do_mar'},transition:'fade'}],
};
