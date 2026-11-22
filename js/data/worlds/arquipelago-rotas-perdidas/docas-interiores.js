import {pecaInteriorLote3} from './docas-interiores-lote3.js';
import {pecaInteriorLote2} from './docas-interiores-lote2.js';
// Accessible interiors only. The watchtower remains storm-closed and the
// lighthouse/portal are exterior landmarks, not newly invented destinations.
export const INTERIORES_DOCAS=Object.freeze({
 mare_cromatica_cabana_oeste:{key:'pescador',name:'ABRIGO DOS PESCADORES',wood:true,accent:'#c69d63',wall:'#423a36',floor:'#463d36',props:[
  ['beliche',2,4.5,1.05,1.5],['bancada',4,1.6,1.65,.75],['rede',1.2,2, .35,.8],['estante',10,2,1,.8],['barris',10,6,1,1],['mesa',8,6,1.35,1.15],['bau',2,7.5,1.1,.65]],
  sound:{cordame:{gain:.7,pan:-.4},sino:{gain:.08,pan:.5},trilha:{gain:.68},interior:{gain:.65,pan:-.12},pressagio:{gain:.25,pan:.3},ondas:{gain:.16,pan:-.45},madeira:{gain:.6,pan:.1}}},
 mare_cromatica_cabana_leste:{key:'vigia',name:'POSTO DE ESCUTA',wood:true,accent:'#8bb89a',wall:'#303e3b',floor:'#343e38',props:[
  ['beliche',2,2,1.1,1.5],['radio',10,2,1,.85],['cartas',3,6,1.45,1.2],['estante',6,1.4,1.35,.7],['bau',10,6,1.15,.8],['barris',1.8,7.4,.85,.85]],
  sound:{interferencia:{gain:.65,pan:.45},trilha:{gain:.62},interior:{gain:.8,pan:.15},pressagio:{gain:.35,pan:-.35},ondas:{gain:.11,pan:.5},madeira:{gain:.35,pan:.1}}},
 mare_cromatica_galpao:{key:'crt',name:'OFICINA DE CONTROLE CRT',wood:false,accent:'#70c8c4',wall:'#29383f',floor:'#26373b',props:[
  ['rack',2,1.5,.85,.8],['rack',8,1.5,.85,.8],['bancada',1.5,5.7,1.2,.8],['gerador',8,5.7,1.1,1.1],['ferramentas',5,1.4,1.4,.6]],
  sound:{goteira:{gain:.7,pan:-.5},abismo:{gain:.1,pan:.3},trilha:{gain:.6},interior:{gain:.9,pan:0},pressagio:{gain:.45,pan:.35},ondas:{gain:.06,pan:-.6},madeira:{gain:.18,pan:.2}}},
});
export function mobiliarInteriorDocas(map){
 const room=INTERIORES_DOCAS[map.id];if(!room)return map;
 const heroKinds={pescador:'bancada',vigia:'cartas',crt:'gerador'};
 const furniture=room.props.map(([kind,x,y,w,h],i)=>{
  const visual=pecaInteriorLote3(room.key,kind)??pecaInteriorLote2(room.key,kind),hero=heroKinds[room.key]===kind;
  return {
   id:`${map.id}_mobilia_${i}`,nome:kind,tipo:'decoracao',docasProp:kind,x,y,bloqueia:true,
   docasHero:hero,docasFlip:hero&&room.key==='pescador',docasAsset:visual?.sprite??(hero?'docas_interior_'+room.key:null),docasVisual:visual,
   hitbox:{offsetX:-w/2,offsetY:-h/2,width:w,height:h},docasSize:[w,h],
  };
 });
 return {...map,meta:{...map.meta,docasTema:room.key},objects:[...map.objects,...furniture]};
}
