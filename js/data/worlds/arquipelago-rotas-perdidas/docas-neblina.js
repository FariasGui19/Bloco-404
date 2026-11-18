// Coordenadas dos marcos derivadas da referência original (1568 × 880).
// A máscara é deliberadamente conservadora: água, telhados e rochedos não
// são transitáveis; conexões estreitas são expressas como polígonos de piso.
const polys=[
  [[470,605],[700,575],[760,660],[565,716],[470,690]], // píer
  [[255,405],[465,350],[710,390],[860,420],[1110,400],[1310,455],[1355,575],[1120,620],[830,650],[580,620],[380,555],[270,500]],
  [[950,415],[1010,385],[1080,305],[1125,270],[1170,270],[1140,325],[1085,405],[1035,450]],
  [[1050,165],[1310,130],[1370,230],[1270,285],[1135,290],[1050,245]],
  [[1240,445],[1380,425],[1400,540],[1280,555]],
];
function inside(x,y,p){let yes=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const [xi,yi]=p[i],[xj,yj]=p[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)yes=!yes;}return yes;}
// Pisos sob construções e obstáculos não são atravessáveis, mesmo que a
// arte seja uma única referência achatada. As portas ficam nas bordas.
const bloqueios=[
 [[490,418],[610,410],[690,455],[675,488],[520,480]],
 [[590,333],[695,312],[745,350],[715,380],[610,392]],
 [[800,390],[905,375],[960,415],[930,460],[830,460]],
 [[1100,460],[1210,440],[1300,475],[1280,510],[1130,510]],
 [[1328,465],[1360,465],[1368,489],[1330,489]],
 [[900,190],[925,190],[930,215],[900,215]],
 [[1220,205],[1270,200],[1280,230],[1220,230]],
];
// Ampliação em espaço de jogo, preservando a planta e os IDs de progresso.
export const ESCALA_DOCAS=2.5;
const W=Math.ceil(25*ESCALA_DOCAS),H=Math.ceil(40*ESCALA_DOCAS);
const layout=Array.from({length:H},(_,y)=>Array.from({length:W},(_,x)=>{
 const px=(x+.5)*64/ESCALA_DOCAS,py=(y+.5)*22/ESCALA_DOCAS;
 return polys.some(p=>inside(px,py,p)) && !bloqueios.some(p=>inside(px,py,p)) ? 0 : 1;
}));
const marker=(id,px,py,label)=>({id,nome:label,tipo:'painel',x:px*ESCALA_DOCAS/64-.5,y:py*ESCALA_DOCAS/22-.5,renderizar:false,bloqueia:false,interacao:{label,distancia:1.6}});
const portal=(id,px,py,label,mapId,spawn='inicio',extra={})=>({id,tipo:'door',x:px*ESCALA_DOCAS/64-.5,y:py*ESCALA_DOCAS/22-.5,label,interactionDistance:1.5,destino:{mapId,spawnId:spawn},transition:'fade',...extra});
const ponto=(x,y)=>({x:x*ESCALA_DOCAS/64,y:y*ESCALA_DOCAS/22});
// Pés/âncoras ordenados em profundidade, independentes da imagem de referência.
const estrutura=(id,x,y,largura,camada='objeto')=>({id,x:x*ESCALA_DOCAS,y:y*ESCALA_DOCAS,largura:largura*ESCALA_DOCAS,camada});
export const docas={id:'mare_cromatica_docas',meta:{nome:'DOCAS DA NEBLINA',tipo:'exterior',dimensao:'mare_cromatica',sideView:true,docasCamadas:true,cromatica:true,initialZoom:.9,corFundo:'#090f20'},layout,
 geometriaDocas:{polys,bloqueios,escala:ESCALA_DOCAS},
 marDocas:[
  {id:'tentaculo',x:170,y:550,tamanho:70},{id:'redemoinho',x:165,y:550,tamanho:92},
  {id:'tentaculo',x:1400,y:600,tamanho:65},{id:'redemoinho',x:1400,y:600,tamanho:82},
  {id:'boia',x:1450,y:600,tamanho:35},{id:'boia',x:1430,y:700,tamanho:35},
  {id:'oleo',x:200,y:350,tamanho:72},{id:'olhos',x:1470,y:500,tamanho:30},
  {id:'rocha',x:1500,y:730,tamanho:58},
 ],
 estruturasDocas:[
  estrutura('pier',600,690,210,'chao'),estrutura('barco',360,735,160),
  estrutura('cabana-oeste',585,478,150),estrutura('cabana-leste',1200,510,160),estrutura('galpao',875,468,145),
  estrutura('escada',1080,403,100,'chao'),estrutura('torre',1350,500,75),estrutura('farol',915,220,80),
  estrutura('camara',1250,240,135),estrutura('porta',975,225,35),
  // Flora reutilizada em volta da vila; não é o novo lote de fauna.
  ...[[310,475,65],[375,420,75],[455,365,68],[730,400,70],[770,355,58],[1030,410,72],[1300,445,65],[1350,535,62],[395,525,50],[520,565,55],[950,500,45],[1090,555,58],[1150,405,58]].map(([x,y,w])=>estrutura('palmeira',x,y,w)),
  ...[[690,585,23],[820,535,20],[980,545,22],[1150,555,22]].map(([x,y,w])=>estrutura('caixas',x,y,w)),
  ...[[340,440,95],[745,395,100],[1020,365,90],[1320,475,100]].map(([x,y,w])=>estrutura('mata',x,y,w)),
 ],
 spawnPoints:{inicio:ponto(620,650),cabana_esq:ponto(610,535),cabana_dir:ponto(1190,535),galpao:ponto(875,490),torre:ponto(1320,510)},actors:[],fauna:[],collectibles:[],hazards:[],
 objects:[marker('docas_barco',630,660,'DESCANSAR / SALVAR NO BARCO'),
 marker('cromatica_fragmento_estacao',1050,365,'RECOLHER FRAGMENTO • TRILHA'),marker('cromatica_selo',1110,275,'ESTABILIZAR O ACESSO AO NÚCLEO'),
 marker('cromatica_painel_origem',1190,220,'ALINHAR ORIGEM'),marker('cromatica_painel_retorno',1240,250,'ALINHAR RETORNO'),marker('cromatica_painel_memoria',1300,210,'ALINHAR MEMÓRIA'),marker('cromatica_ancora',1250,185,'ESTABILIZAR ÂNCORA'),
 marker('docas_torre',1330,500,'SUBIR À TORRE DE VIGIA'),marker('docas_resina',720,565,'RASTREAR RESINA • MARÉ ASTRAL'),marker('docas_eletrico',910,545,'PAINEL ELÉTRICO • NÚCLEO X10'),marker('docas_selo',1020,420,'SELO DE NÉVOA • DOMÍNIO ANCIÃO'),marker('docas_biomassa',1120,565,'BIOMASSA • BIO-FORJA')],
 trainingTargets:[{id:'docas_infectado_1',x:Math.floor(18*ESCALA_DOCAS),y:Math.floor(12*ESCALA_DOCAS),maxHealth:65,cromaticaEnemy:true},{id:'docas_infectado_2',x:Math.floor(19*ESCALA_DOCAS),y:Math.floor(10*ESCALA_DOCAS),maxHealth:65,cromaticaEnemy:true}],
 portals:[portal('docas_galpao',865,490,'ENTRAR NO GALPÃO CRT','mare_cromatica_galpao'),portal('docas_cabana_esq',575,500,'ENTRAR NA CABANA OESTE','mare_cromatica_cabana_oeste'),portal('docas_cabana_dir',1190,525,'ENTRAR NA CABANA LESTE','mare_cromatica_cabana_leste')],
};

function sala(id,nome,fragmento,fita,volta,spawn) {
 const w=13,h=10,layout=Array.from({length:h},(_,y)=>Array.from({length:w},(_,x)=>x===0||y===0||x===w-1||y===h-1?1:0));
 const obj=(id,x,y,label,sprite)=>({id,nome:label,tipo:'painel',x,y,sprite,useCrop:true,larguraPx:48,pivotX:.5,pivotY:.95,bloqueia:false,interacao:{label,distancia:1.4}});
 return {id,meta:{nome,tipo:'interior',dimensao:'mare_cromatica',cromatica:true,docasInterior:true,estiloSala:'frequencia_limiar',corFundo:'#100e1d',useBackgroundWalls:true,initialZoom:1.1},corChao:'#25212c',layout,spawnPoints:{inicio:{x:6.5,y:8.2}},actors:[],fauna:[],collectibles:[],hazards:[],
 objects:[obj('cromatica_fragmento_'+fragmento,4,3,'RECOLHER FRAGMENTO MNEMÔNICO','freq666_memoria'),obj('cromatica_fita_'+fita,8,3,'OUVIR FITA CASSETE','freq666_receptor'),obj(fragmento==='costa'?'docas_chave':'docas_fusivel',fragmento==='costa'?2:10,6,fragmento==='costa'?'RECOLHER CHAVE DA TRILHA':'RECOLHER FUSÍVEL DO NÚCLEO','freq666_origem')],
 trainingTargets:[{id:id+'_infectado',x:6,y:4,maxHealth:55,cromaticaEnemy:true}],
 portals:[{id:volta,tipo:'door',x:6,y:8,label:'SAIR PARA AS DOCAS',interactionDistance:1.1,destino:{mapId:'mare_cromatica_docas',spawnId:spawn}}]};
}
export const cabanaOeste=sala('mare_cromatica_cabana_oeste','CABANA OESTE • DOCAS','costa','casa','docas_saida_oeste','cabana_esq');
export const cabanaLeste=sala('mare_cromatica_cabana_leste','CABANA LESTE • DOCAS','acampamento','vigilia','docas_saida_leste','cabana_dir');

const gLayout=Array.from({length:9},(_,y)=>Array.from({length:11},(_,x)=>x===0||y===0||x===10||y===8?1:0));
export const galpao={id:'mare_cromatica_galpao',meta:{nome:'GALPÃO CRT • DOCAS',tipo:'interior',dimensao:'mare_cromatica',cromatica:true,docasInterior:true,estiloSala:'frequencia_limiar',corFundo:'#0b1118',useBackgroundWalls:true,initialZoom:1.25},layout:gLayout,corChao:'#1d2c30',spawnPoints:{inicio:{x:5.5,y:7.2}},actors:[],fauna:[],collectibles:[],hazards:[],
objects:[{id:'cromatica_terminal',nome:'TERMINAL CRT',tipo:'painel',x:5,y:3,sprite:'freq666_console',useCrop:true,larguraPx:65,pivotY:.95,bloqueia:false,interacao:{label:'RECOMPILAR TRAJE',distancia:1.5}},
{id:'cromatica_fita_casa',tipo:'painel',nome:'GRAVADOR OESTE',x:2,y:4,sprite:'freq666_receptor',useCrop:true,larguraPx:42,bloqueia:false,interacao:{label:'OUVIR FITA DA CABANA OESTE',distancia:1.3}},
{id:'cromatica_fita_vigilia',tipo:'painel',nome:'GRAVADOR LESTE',x:8,y:4,sprite:'freq666_receptor',useCrop:true,larguraPx:42,bloqueia:false,interacao:{label:'OUVIR FITA DA CABANA LESTE',distancia:1.3}}],
portals:[{id:'docas_sair_galpao',tipo:'door',x:5,y:7,label:'SAIR DO GALPÃO',interactionDistance:1.1,destino:{mapId:'mare_cromatica_docas',spawnId:'galpao'}}]};
