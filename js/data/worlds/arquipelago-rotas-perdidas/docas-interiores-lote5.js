const detail=(name,room,plane,box,extra={})=>Object.freeze({name,room,plane,box:Object.freeze(box),sprite:'docas_interior_lote5_'+name.replaceAll('-','_'),...extra});
// Seven nonblocking story details; the other three originals are combat poses.
export const SUPERFICIES_INTERIORES_LOTE5=Object.freeze([
 detail('boias-antigas','pescador','left',[4.1,5.1,43,78],{draft:true}),
 detail('calendario-mar','pescador','back',[1.6,2.8,45,78]),
 detail('osciloscopio-parede','vigia','left',[2,3.3,28,72],{scope:true}),
 detail('anotacoes-sinal','vigia','back',[9.1,10.5,38,72]),
 detail('ventilador-parede','crt','back',[6.2,7.4,49,86],{fan:true}),
 detail('medidor-pressao','crt','left',[4.4,5.2,37,75],{signal:true}),
 detail('rastro-molhado','pescador','floor',[3.3,6.3,1,1.6],{alpha:.35}),
]);
export const POSES_INFECTADO_DOCAS=Object.freeze(['infectado-preparo','infectado-golpe','infectado-impacto']);
