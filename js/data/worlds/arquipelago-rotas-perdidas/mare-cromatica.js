import { map as enseada } from './enseada-ecos.js';
const machine=(id,x,y,label,sprite='freq666_receptor')=>({id,nome:label,tipo:'painel',x,y,sprite,useCrop:true,larguraPx:44,pivotX:.5,pivotY:.95,bloqueia:false,brilho:{cor:'#e46de1',raio:.75,forca:.18},interacao:{label,distancia:1.4}});
// Réplica isolada: nenhuma interação, coleta, portal ou fauna da Enseada
// original é alterada ou reexecutada durante a incursão.
export const superficie = {
  ...enseada,id:'mare_cromatica_superficie',meta:{...enseada.meta,nome:'MARÉ CROMÁTICA — SUPERFÍCIE',dimensao:'mare_cromatica', cromatica:true},
  spawnPoints:{inicio:{x:19.9,y:51.7},retorno:{x:19.9,y:51.7},vindo_da_estacao:{x:19.3,y:19.3}},
  objects:[...enseada.objects.map(o=>{const {interacao,moduleSystem,gate,...decor}=o;return decor;}),
    machine('cromatica_fragmento_costa',21,49,'RECOLHER FRAGMENTO • COSTA','freq666_origem'),
    machine('cromatica_fita_casa',24,45,'OUVIR FITA • CASA','freq666_receptor'),
    machine('cromatica_fragmento_acampamento',19,38,'RECOLHER FRAGMENTO • ACAMPAMENTO','freq666_memoria'),
    machine('cromatica_fita_vigilia',20,35,'OUVIR FITA • VIGÍLIA','freq666_receptor'),
    machine('cromatica_terminal',19,32,'RECOMPILAR O TRAJE','freq666_console'),
    machine('cromatica_fragmento_estacao',19,23,'RECOLHER FRAGMENTO • ESTAÇÃO','freq666_memoria'),
    machine('cromatica_selo',19,18,'DECIFRAR SELO DA ESTAÇÃO','freq666_console'),
  ],
  actors:[],fauna:[],collectibles:[],hazards:[],
  portals:[
    {id:'cromatica_retorno_limiar',tipo:'door',x:18,y:52,label:'RETORNAR AO LIMIAR 66.6',interactionDistance:1.2,destino:{mapId:'estacao_limiar_666',spawnId:'vindo_da_enseada'}},
    {id:'cromatica_descer',tipo:'door',x:17,y:18,label:'DESCER À CONTENÇÃO',requiresFlag:'cromatica_estacao_aberta',lockedLabel:'SELO CROMÁTICO • RECOMPILE E DECIFRE',interactionDistance:1.2,destino:{mapId:'mare_cromatica_contencao',spawnId:'inicio'}},
  ],
};
const layout=Array.from({length:15},(_,y)=>Array.from({length:21},(_,x)=>x===0||y===0||x===20||y===14?1:0));
for(let y=1;y<14;y++) if(y<6||y>8) layout[y][10]=1;
export const contencao={id:'mare_cromatica_contencao',meta:{nome:'ESTAÇÃO 66.6 — CONTENÇÃO',tipo:'interior',dimensao:'mare_cromatica',estiloSala:'frequencia_limiar',corFundo:'#100e1d',corTema:'#e06ed0',useBackgroundWalls:true,cromatica:true},
  corChao:'#25212c',layout,spawnPoints:{inicio:{x:2.5,y:7.5},retorno:{x:17.5,y:7.5}},actors:[],fauna:[],collectibles:[],
  objects:[machine('cromatica_painel_origem',4,4,'ALINHAR ORIGEM','freq666_origem'),machine('cromatica_painel_retorno',7,10,'ALINHAR RETORNO','freq666_retorno'),machine('cromatica_painel_memoria',14,4,'ALINHAR MEMÓRIA','freq666_memoria'),{ ...machine('cromatica_ancora',17,7,'ESTABILIZAR NÚCLEO DE ÂNCORA','cromatica_ancora'), larguraPx:150 }],
  trainingTargets:[{id:'cromatica_infectado_1',x:7,y:4,maxHealth:65,cromaticaEnemy:true}, {id:'cromatica_infectado_2',x:15,y:10,maxHealth:65,cromaticaEnemy:true}],
  hazards:[{id:'cromatica_resina_1',x:6,y:6,radius:.65,damage:6,interval:1.2},{id:'cromatica_resina_2',x:13,y:9,radius:.65,damage:6,interval:1.2}],
  portals:[{id:'cromatica_subir',tipo:'door',x:1,y:7,label:'VOLTAR À SUPERFÍCIE',interactionDistance:1.1,destino:{mapId:'mare_cromatica_superficie',spawnId:'vindo_da_estacao'}},
    {id:'cromatica_portal',tipo:'door',x:18,y:7,label:'ATRAVESSAR A FENDA',requiresFlag:'cromatica_ancora_estavel',lockedLabel:'FENDA INSTÁVEL • ESTABILIZE A ÂNCORA',interactionDistance:1.1,destino:{mapId:'mare_cromatica_fenda',spawnId:'inicio'}}],
};
const fendaLayout=Array.from({length:9},(_,y)=>Array.from({length:11},(_,x)=>x===0||y===0||x===10||y===8?1:0));
export const fenda={id:'mare_cromatica_fenda',meta:{nome:'FENDA CROMÁTICA — LIMIAR',tipo:'interior',dimensao:'mare_cromatica',corFundo:'#190c25',corTema:'#df79e0',cromatica:true},corChao:'#281b30',layout:fendaLayout,spawnPoints:{inicio:{x:5.5,y:6.5}},actors:[],fauna:[],collectibles:[],hazards:[],
 objects:[machine('cromatica_limiar_final',5,3,'EXAMINAR O OUTRO LADO','freq666_portal')],
 portals:[{id:'cromatica_voltar_contencao',tipo:'door',x:5,y:7,label:'RETORNAR À CONTENÇÃO',interactionDistance:1.1,destino:{mapId:'mare_cromatica_contencao',spawnId:'retorno'}}]};
