// One batch of ten distinct paintings. Re-skin existing furniture only:
// no extra solids, no changes to quest props, room density or navigation.
const piece=(name,room,kind,width,maxHeight,extra={})=>Object.freeze({name,room,kind,width,maxHeight,sprite:'docas_interior_lote2_'+name.replaceAll('-','_'),...extra});
export const PECAS_INTERIORES_LOTE2=Object.freeze([
 piece('cama-pescador','pescador','beliche',104,72),
 piece('estante-pesca','pescador','estante',65,83),
 piece('barris-salmoura','pescador','barris',58,49),
 piece('bau-marinheiro','pescador','bau',66,43),
 piece('cama-vigia','vigia','beliche',106,69,{flip:true}),
 piece('radio-vigia','vigia','radio',50,78,{screen:Object.freeze([[.638,.279],[.862,.216],[.862,.295],[.638,.355]].map(Object.freeze)),light:Object.freeze([.75,.287,13,'#a8e6e6'])}),
 piece('arquivo-vigia','vigia','estante',51,81),
 piece('rack-crt','crt','rack',49,90,{screen:Object.freeze([[.15,.207],[.33,.239],[.33,.324],[.15,.291]].map(Object.freeze)),light:Object.freeze([.24,.265,12,'#a3e2e8']),leds:Object.freeze([[.16,.326],[.21,.337],[.265,.349]].map(Object.freeze))}),
 piece('bancada-eletrica','crt','bancada',83,61),
 piece('carrinho-ferramentas','crt','ferramentas',69,59),
]);
export function pecaInteriorLote2(room,kind){return PECAS_INTERIORES_LOTE2.find(p=>p.room===room&&p.kind===kind)??null;}
