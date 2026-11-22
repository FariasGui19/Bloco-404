// Exactly ten authored elements: four furniture replacements, six surfaces.
// Surfaces never add collision objects or intercept mission interactions.
const id=name=>'docas_interior_lote3_'+name.replaceAll('-','_');
const prop=(name,room,kind,width,maxHeight)=>Object.freeze({name,room,kind,width,maxHeight,sprite:id(name)});
export const PECAS_INTERIORES_LOTE3=Object.freeze([
 prop('rede-secagem','pescador','rede',46,66),
 prop('mesa-refeicao','pescador','mesa',86,65),
 prop('bau-suprimentos','vigia','bau',71,48),
 prop('reserva-agua','vigia','barris',47,45),
]);
export function pecaInteriorLote3(room,kind){return PECAS_INTERIORES_LOTE3.find(p=>p.room===room&&p.kind===kind)??null;}
const surface=(name,room,plane,box,extra={})=>Object.freeze({name,room,plane,box:Object.freeze(box),sprite:id(name),...extra});
// floor: x,y,w,h in world tiles; walls: along-wall start/end, bottom/top Z.
export const SUPERFICIES_INTERIORES_LOTE3=Object.freeze([
 surface('esteira-sisal','pescador','floor',[5.3,4.9,1.8,3]),
 surface('carta-parede','vigia','left',[4.4,6.3,34,77]),
 surface('grelha-piso','crt','floor',[4.2,4.3,1.8,.8]),
 surface('capa-parede','pescador','left',[5.8,6.7,18,77],{draft:true}),
 surface('lanterna-parede','vigia','back',[10.5,11.05,38,80],{lamp:Object.freeze([.52,.6,20])}),
 surface('tubo-valvula','crt','left',[2.6,3.55,16,78]),
]);
