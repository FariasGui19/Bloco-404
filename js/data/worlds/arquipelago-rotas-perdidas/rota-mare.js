// Travessia jogável entre os condutos. A água é real: o nado, o fôlego e
// a colisão continuam sendo os mesmos sistemas usados no restante do jogo.
import { buildGround } from '../../ground.js';
const width = 48, height = 30;
const terra = (x, y) => ((x - 4) / 4.2) ** 2 + ((y - 15) / 4.6) ** 2 < 1 ||
  ((x - 43) / 4.2) ** 2 + ((y - 15) / 4.6) ** 2 < 1;
const rows = Array.from({length: height}, (_, y) => Array.from({length: width}, (_, x) => {
  if (terra(x,y)) return [[-1,0],[1,0],[0,-1],[0,1]].some(([dx,dy]) => !terra(x+dx,y+dy)) ? 'M' : 'S';
  for (let dy=-2;dy<=2;dy++) for (let dx=-2;dx<=2;dx++) if (terra(x+dx,y+dy)) return 'Y';
  return 'D';
}).join(''));
const ground = buildGround({sheet:'BEACH_FLOOR_SPRITE', rows, legend:{
  S:{tiles:[[0,0]],walk:true}, M:{tiles:[[1,0]],walk:true},
  Y:{tiles:[[2,2]],walk:false}, D:{tiles:[[1,1]],walk:false},
}});
export const map = {
  id:'mar_rota_mare_astral',
  meta:{nome:'ROTA DAS MARÉS — ENSEADA / DÁRSENA',tipo:'exterior',dimensao:'arquipelago',
    corFundo:'#025074',estiloPiso:'livre',useBackgroundWalls:true,sandSprite:'beach_novas_artes',
    ambiente:{poeira:4,cor:'#a6e8df'}, rotaMare:true},
  corChao:'#e6c280',layout:rows.map(r=>[...r].map(c=>'SM'.includes(c)?0:1)),
  walkMask:ground.walkMask,pisos:ground.pisos,aguaPraia:rows,
  spawnPoints:{inicio:{x:6.5,y:15.5},vindo_da_enseada:{x:6.5,y:15.5},vindo_da_darsena:{x:41.5,y:15.5}},
  // Pontos visíveis de longe também aparecem como balizas no fundo em 3D.
  pontosCorrente:[{id:'rota_recife',nome:'RECIFE DA TRAVESSIA',x:14.5,y:15.5},
    {id:'rota_jardim',nome:'JARDIM DAS MARÉS',x:24.5,y:15.5},
    {id:'rota_darsena',nome:'FAROL DA DÁRSENA',x:34.5,y:15.5}],
  vidaRota:[
    {tipo:'tartaruga',x:12,y:12,tamanho:1.1}, {tipo:'arraia',x:19,y:17,tamanho:1.25},
    {tipo:'golfinho',x:29,y:11,tamanho:1.25}, {tipo:'cardume',x:15,y:19,tamanho:.9},
    {tipo:'cardume',x:35,y:18,tamanho:.9}, {tipo:'agua-viva',x:23,y:12,tamanho:.7},
    {tipo:'cavalo-marinho',x:26,y:18,tamanho:.55}, {tipo:'peixe-lanterna',x:33,y:13,tamanho:.8},
    {tipo:'alga',x:21,y:20,tamanho:.8}, {tipo:'alga',x:27,y:20,tamanho:.8},
  ],
  // Posições são do mundo, não da câmera. Tudo é cenográfico e não bloqueia
  // o nadador; barcos ancorados ainda não são veículos pilotáveis.
  ondasMar: [
    [10,10,0],[13,20,1],[17,9,1],[20,22,0],[23,7,0],[27,22,1],
    [30,9,1],[32,21,0],[36,8,0],[38,20,1],[17,14,0],[31,16,1],
  ].map(([x,y,tipo])=>({x,y,tipo})),
  // Interações persistentes. Coordenadas são de mundo e não bloqueiam o
  // trajeto; uma rota futura pode oferecer outra lista de encontros.
  encontrosMare: [
    {id:'rede',x:17.2,y:13.7,sprite:'rede-perdida',tamanho:1.0},
    {id:'tartaruga',x:19.1,y:14.0,sprite:'tartaruga-resgate',tamanho:1.15},
    {id:'coral',x:24.0,y:17.7,sprite:'coral-ferido',spriteConcluido:'coral-restaurado',tamanho:1.0},
    {id:'perola',x:27.0,y:12.2,sprite:'eco-perola',tamanho:.9},
    {id:'arraia',x:30.3,y:13.6,sprite:'arraia-curiosa',tamanho:1.2},
    {id:'peixe',x:34.5,y:17.3,sprite:'peixe-guia',tamanho:.8},
  ],
  fundoMar: [
    {tipo:'coral-leque',x:17,y:11,tamanho:.85}, {tipo:'coral-leque',x:25,y:21,tamanho:.7},
    {tipo:'ruina-submersa',x:29,y:19,tamanho:1.4}, {tipo:'medusa-luz',x:21,y:13,tamanho:.7},
    {tipo:'peixes-luz',x:33,y:14,tamanho:.8},
  ],
  objects:[
    {id:'barco_eco_pesca',tipo:'decoracao',x:11,y:9,flutuanteMar:'barco-pescador',larguraPx:160,bloqueia:false,
      interacao:{label:'OBSERVAR BARCO ANCORADO',distancia:1.8,speaker:'BARCO DE PESCA',dialogue:['UM BARCO DE PESCA AUTÔNOMO DESCANSA NA ROTA. AS LUZES CONFIRMAM QUE A BALIZA ESTÁ ATIVA.', 'A EMBARCAÇÃO AINDA NÃO É PILOTÁVEL. A TRAVESSIA CONTINUA SENDO FEITA A NADO.']}},
    {id:'barco_eco_carga',tipo:'decoracao',x:36,y:20,flutuanteMar:'barco-carga',larguraPx:175,bloqueia:false,
      interacao:{label:'OBSERVAR BARCO DE CARGA',distancia:1.8,speaker:'BARCO DE CARGA',dialogue:['MÓDULOS DE CARGA ESTÃO PRESOS AO CONVÉS; O MOTOR AGUARDA UMA TRIPULAÇÃO.', 'POR ENQUANTO, ESTE BARCO É CENOGRÁFICO E NÃO TRANSPORTA O OPERADOR.']}},
    {id:'boia_rota_mar',tipo:'decoracao',x:24,y:12,flutuanteMar:'boia-sinal',larguraPx:48,bloqueia:false,
      interacao:{label:'LER BOIA DE SINAL',distancia:1.5,speaker:'BALIZA MARÍTIMA',dialogue:['A LUZ DA BOIA PULSA EM DIREÇÃO ÀS DUAS MARGENS.', 'NA SUPERFÍCIE, RECUPERE O AR ANTES DE MERGULHAR DE NOVO.']}},
    {id:'marco_rota_enseada',tipo:'decoracao',x:3,y:15,routeMarker:'ENSEADA',bloqueia:false},
    {id:'marco_rota_darsena',tipo:'decoracao',x:44,y:15,routeMarker:'DÁRSENA',bloqueia:false},
    ...[[14,15,'RECIFE'],[24,15,'JARDIM'],[34,15,'FAROL']].map(([x,y,nome],i)=>({id:`marco_mare_${i}`,tipo:'decoracao',x,y,routeMarker:nome,bloqueia:false})),
  ],
  fauna:[], collectibles:[],
  portals:[
    {id:'rota_mare_para_enseada',tipo:'door',x:3,y:15,label:'RETORNAR À ENSEADA DOS ECOS',interactionDistance:1.35,destino:{mapId:'ilha_enseada_ecos',spawnId:'vindo_da_darsena_mare'},transition:'fade'},
    {id:'rota_mare_para_darsena',tipo:'door',x:44,y:15,label:'ENTRAR NA DÁRSENA ABISSAL',interactionDistance:1.35,destino:{mapId:'sala_mare',spawnId:'vindo_da_enseada'},transition:'fade'},
  ],
};
