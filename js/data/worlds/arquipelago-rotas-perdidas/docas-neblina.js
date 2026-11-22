import { NAVEGACAO_DOCAS } from './docas-navegacao.js';
import { CAIS_SUL, plantaCais } from './cais-sul.js';
import { COSTA_OESTE, plantaCosta } from './costa-oeste-docas.js';

// Coordenadas dos marcos derivadas da referência original (1568 × 880).
// A máscara é deliberadamente conservadora: água, telhados e rochedos não
// são transitáveis; conexões estreitas são expressas como polígonos de piso.
const contornosBase=[
  CAIS_SUL.deck.map(plantaCais), // deck sobre água
  [[242,315],[343,320],[465,350],[710,390],[860,420],[1110,400],[1310,455],
   [1355,575],[1120,620],[1012,601],[983,593],[958,603],[932,615],[904,620],[882,614],
   [863,586],[847,559],[819,543],[779,528],[748,537],[720,546],[685,548],
   ...COSTA_OESTE.margem.map(plantaCosta).reverse(),[211,327],[221,320]],
  [[950,415],[1010,385],[1080,305],[1125,270],[1170,270],[1140,325],[1085,405],[1035,450]],
  [[865,160],[1075,155],[1100,230],[1055,270],[950,265],[865,245]], // base contínua do farol e da porta
  [[1050,165],[1310,130],[1370,230],[1270,285],[1135,290],[1050,245]],
  [[1240,445],[1380,425],[1400,540],[1280,555]],
];
// Subdivide as arestas com pequenas irregularidades determinísticas. O mesmo
// contorno alimenta o piso visível e a máscara de colisão; não há margem falsa.
function costaIrregular(poly,indice){
 const out=[];for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),n=Math.max(1,Math.ceil(len/38));
  for(let j=0;j<n;j++){const f=j/n,offset=j===0?0:((indice*19+i*13+j*17)%13-6);out.push([a[0]+dx*f-dy/len*offset,a[1]+dy*f+dx/len*offset]);}
 }
 return out;
}
const terraPolys=contornosBase.slice(1).map(costaIrregular);
const deckPoly=contornosBase[0],escadaPoly=CAIS_SUL.escada.map(plantaCais);
const polys=[deckPoly,...terraPolys,escadaPoly];
function inside(x,y,p){let yes=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const [xi,yi]=p[i],[xj,yj]=p[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)yes=!yes;}return yes;}
// Pisos sob construções e obstáculos não são atravessáveis, mesmo que a
// arte seja uma única referência achatada. As portas ficam nas bordas.
const bloqueios=[
 ...COSTA_OESTE.blocos.map(p=>p.map(plantaCosta)),
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
export const docas={id:'mare_cromatica_docas',meta:{nome:'DOCAS DA NEBLINA',tipo:'exterior',dimensao:'mare_cromatica',sideView:true,docasCamadas:true,docasEncaixe:true,cromatica:true,initialZoom:.8,corFundo:'#090f20'},layout,
 // O primeiro polígono é o deck caminhável, não terra sob o píer.
 navegacaoDocas:NAVEGACAO_DOCAS,
 geometriaDocas:{polys,terraPolys,deckPoly,escadaPoly,bloqueios,escala:ESCALA_DOCAS},
 caisSul:CAIS_SUL,costaOeste:COSTA_OESTE,
 // Peças do terreno em coordenadas da planta. As peças não criam piso novo:
 // a máscara geométrica continua sendo a fonte de verdade para colisão.
 relevoDocas:[
  {id:'falesia-frente',x:1190,y:292,w:260,h:85,camada:'base'},
  {id:'falesia-lateral',x:1055,y:340,w:95,h:140,camada:'base'},
  {id:'plato',x:1260,y:270,w:180,h:75,camada:'base'},
  {id:'borda',x:550,y:715,w:140,h:38,camada:'reserva'},
  {id:'rampa-rocha',x:1060,y:375,w:110,h:135,camada:'piso'},
  {id:'escada-rocha',x:1090,y:330,w:67,h:110,camada:'piso'},
  {id:'cascalho',x:1015,y:475,w:60,h:28,camada:'piso'},
  {id:'muro',x:1030,y:405,w:66,h:28,camada:'piso'},
  {id:'pilar',x:1195,y:515,w:60,h:30,camada:'piso'},
  {id:'margem-rochas',sprite:'lote7_margem-rochas',x:1070,y:650,w:90,h:38,camada:'base'},
  {id:'talude',sprite:'lote7_talude',x:1215,y:293,w:135,h:48,camada:'base'},
  {id:'lajotas',sprite:'lote7_lajotas',x:800,y:570,w:75,h:36,camada:'piso'},
 ],
 marDocas:[
  {id:'tentaculo',x:1400,y:590,tamanho:60},
  {id:'boia',x:1450,y:600,tamanho:35},{id:'boia',x:1430,y:700,tamanho:35},
  {id:'olhos',x:1450,y:515,tamanho:22},
  {id:'rocha',x:1500,y:730,tamanho:58},
 ],
 estruturasDocas:[
  estrutura('cabana-oeste',585,478,150),estrutura('cabana-leste',1200,510,160),
  {...estrutura('galpao',875,468,145),sprite:'central_console'},
  {...estrutura('central_fundos',665,385,152),sprite:'galpao'},
  ...[[715,403,45],[550,487,48],[1220,523,46]].map(([x,y,w])=>estrutura('lote6_cerca',x,y,w)),
  ...[[750,536,30],[958,591,30]].map(([x,y,w])=>({...estrutura('central_carga',x,y,w),sprite:'vila04_carga'})),
  ...[[805,575,24],[1110,511,22]].map(([x,y,w])=>estrutura('lote3_barris',x,y,w)),
  ...[[1020,596,36],[1330,532,33],[1060,420,27]].map(([x,y,w])=>estrutura('lote6_cristal-violeta',x,y,w)),
  ...[[1090,603,30],[1310,552,25]].map(([x,y,w])=>estrutura('lote6_corais',x,y,w)),
  estrutura('escada',1080,403,100,'chao'),estrutura('torre',1350,500,75),estrutura('farol',915,220,80),
  estrutura('camara',1250,240,135),estrutura('porta',975,225,35),
  // Decoração sem colisão: não altera a malha nem cobre marcadores de missão.
  ...[[770,410,90],[1030,380,90],[1300,445,95],[1350,540,88]].map(([x,y,w])=>estrutura('lote3_palmeira',x,y,w)),
  ...[[730,400,105],[1160,455,90]].map(([x,y,w])=>estrutura('lote3_arvore',x,y,w)),
  // Peças únicas com alfa: não passam pelo recorte de oito frames do lote 3.
  ...[[700,525,35],[820,516,30],[1150,565,35]].map(([x,y,w])=>estrutura('vila04_carga',x,y,w)),
  ...[[675,530,30],[970,560,32],[1210,565,30]].map(([x,y,w])=>estrutura('lote3_barris',x,y,w)),
  ...[[1070,335,35],[1260,150,42],[1325,240,38]].map(([x,y,w])=>estrutura('lote3_cristal',x,y,w)),
  ...[[1300,570,30]].map(([x,y,w])=>estrutura('lote3_resina',x,y,w)),
  ...[[805,505,22],[1200,540,22]].map(([x,y,w])=>estrutura('lote3_fitas',x,y,w)),
  ...[[1335,570,40]].map(([x,y,w])=>estrutura('lote3_tentaculo',x,y,w)),
  ...[[500,410,32],[1060,390,30],[1285,260,30]].map(([x,y,w])=>estrutura('lote3_esporos',x,y,w)),
  ...[[1230,555,42]].map(([x,y,w])=>estrutura('lote3_rede',x,y,w)),
  ...[[745,420,100],[1020,415,90],[1320,475,100]].map(([x,y,w])=>estrutura('mata',x,y,w)),
  ...[[1270,570,20]].map(([x,y,w])=>estrutura('lote5_conchas',x,y,w)),
  ...[[450,520,38],[1010,570,36]].map(([x,y,w])=>estrutura('lote5_destrocos',x,y,w)),
  ...[[1090,540,24]].map(([x,y,w])=>estrutura('lote5_cordas',x,y,w)),
  ...[[980,520,28],[1160,270,28]].map(([x,y,w])=>estrutura('lote5_poste',x,y,w)),
  ...[[480,410,35],[1010,470,35],[1280,545,35]].map(([x,y,w])=>estrutura('lote5_capim',x,y,w)),
  // Pequenos vestígios inspirados na referência, sem alterar portas/missão.
  ...[[520,500,44],[675,495,44],[1150,535,44]].map(([x,y,w])=>estrutura('lote6_cerca',x,y,w)),
  estrutura('lote6_arvore-seca',575,408,95),
  ...[[1300,560,32],[1065,405,32]].map(([x,y,w])=>estrutura('lote6_cristal-violeta',x,y,w)),
  ...[[1125,590,28],[1280,560,28]].map(([x,y,w])=>estrutura('lote6_corais',x,y,w)),
  ...[[1110,555,25]].map(([x,y,w])=>estrutura('lote6_empilhado',x,y,w)),
  estrutura('lote6_runa',952,553,28),
  ...[[1250,540,24]].map(([x,y,w])=>estrutura('lote6_armadilha',x,y,w)),
  ...[[1290,580,34]].map(([x,y,w])=>estrutura('lote6_rochedos',x,y,w)),
  ...[[570,535,22],[1030,515,22],[1130,320,22]].map(([x,y,w])=>estrutura('lote6_luminaria',x,y,w)),
  ...[[1270,550,36]].map(([x,y,w])=>estrutura('lote7_raiz-costa',x,y,w)),
  ...[[1290,560,28]].map(([x,y,w])=>estrutura('lote7_coral-pedra',x,y,w)),
  ...[[1310,550,40]].map(([x,y,w])=>estrutura('lote7_rocha-alta',x,y,w)),
  // Detalhes junto à costa e aos depósitos existentes, sem criar piso novo.
  estrutura('lote12_raizes',432,438,33),
  estrutura('lote12_flora',470,410,31),estrutura('lote12_corais',1290,555,24),
  estrutura('lote12_residuos',329,449,28),
  estrutura('lote12_vasilhame',1230,540,22),estrutura('lote12_lampiao',535,545,7),
  // Lote 11: reforços costeiros e sinais de navegação, próximos dos conjuntos existentes.
  estrutura('lote11_arbusto-costeiro',460,400,43),
  estrutura('lote11_gramineas',1130,440,34),estrutura('lote11_cogumelos',1275,560,26),
  estrutura('lote11_sucata',1080,555,31),estrutura('lote11_bandeirola',1340,505,20),
  estrutura('lote11_lanterna-chao',750,500,14),estrutura('lote11_totem',960,465,24),
  // Vestígios próximos a pontos de uso: cais, abrigo, vigia e margem.
  estrutura('lote10_bau',645,520,26),
  estrutura('lote10_barricada',760,465,42),estrutura('lote10_placa-lore',780,490,28),
  estrutura('lote10_fogueira',464,497,35),estrutura('lote10_farolete',1300,505,20),
  estrutura('lote10_coral',1250,580,33),
  // Lote 9: agrupamentos junto às atividades, não espalhados pelo caminho.
  estrutura('lote9_banco',513,522,32),estrutura('lote9_vasos',540,492,25),
  estrutura('lote9_flores',485,510,33),estrutura('lote9_tronco',390,469,39),
  estrutura('lote9_anfora',1180,535,24),
  estrutura('lote9_engrenagem',910,490,30),estrutura('lote9_placa',1010,465,22),
  // Vestígios discretos, ancorados no piso e fora dos corredores centrais.
  estrutura('lote8_mastro',490,460,25),
  estrutura('lote8_madeiras',1115,550,25),estrutura('lote8_ampola',940,510,14),
  ...[[435,480,26],[1250,540,26]].map(([x,y,w])=>estrutura('lote8_arbusto',x,y,w)),
  ...[[1280,575,24]].map(([x,y,w])=>estrutura('lote8_corais',x,y,w)),
 ],
 spawnPoints:{inicio:ponto(620,650),cabana_esq:ponto(610,535),cabana_dir:ponto(1190,535),galpao:ponto(875,490),torre:ponto(1320,510)},actors:[],fauna:[],collectibles:[],hazards:[],
 objects:[marker('docas_barco',586,656,'BARCO • INICIAR / DESCANSAR'),
 marker('cromatica_fragmento_estacao',1050,365,'RECOLHER FRAGMENTO • TRILHA'),marker('cromatica_selo',1110,275,'ESTABILIZAR O ACESSO AO NÚCLEO'),
 marker('cromatica_painel_origem',1185,193,'ALINHAR ORIGEM'),marker('cromatica_painel_retorno',1240,206,'ALINHAR RETORNO'),marker('cromatica_painel_memoria',1300,187,'ALINHAR MEMÓRIA'),marker('cromatica_ancora',1250,185,'ESTABILIZAR ÂNCORA'),
 marker('docas_poca_mare',329,449,'EXAMINAR POÇA DE MARÉ'),
 marker('docas_totem_mares',960,465,'EXAMINAR MARCA DAS MARÉS'),
 marker('docas_mural_vigia',780,490,'LER MURAL DOS VIGIAS'),marker('docas_fogueira',464,497,'EXAMINAR FOGUEIRA DOS VIGIAS'),
 marker('docas_marca_navegantes',952,553,'EXAMINAR MARCA DOS NAVEGANTES'),marker('docas_diario_pier',710,605,'LER DIÁRIO DO PÍER'),marker('docas_diario_trilha',980,520,'LER AVISO DOS VIGIAS'),
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
