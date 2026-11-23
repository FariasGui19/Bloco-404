// Wall/floor storytelling only: no invisible obstacle is introduced.
const detail=(name,room,plane,box,extra={})=>Object.freeze({name,room,plane,box:Object.freeze(box),sprite:'docas_interior_lote4_'+name.replaceAll('-','_'),...extra});
export const SUPERFICIES_INTERIORES_LOTE4=Object.freeze([
 detail('ex-votos','pescador','left',[2.3,3.6,40,82],{lamp:[.5,.8,28]}),
 detail('peixes-secos','pescador','back',[5,6.4,40,80],{draft:true}),
 detail('mancha-sal','pescador','left',[7.2,8.8,2,38],{alpha:.3}),
 detail('sino-nevoa','pescador','back',[10.8,11.5,40,79]),
 detail('fotos-desaparecidos','vigia','left',[7.2,8.9,32,80]),
 detail('alto-falante','vigia','back',[5.1,5.8,58,86],{signal:true}),
 detail('cortina-vigia','vigia','back',[7.9,8.7,25,79],{draft:true}),
 detail('quadro-fusiveis','crt','back',[4,5.3,30,82],{signal:true}),
 detail('cabos-parede','crt','left',[5.9,7.7,12,81]),
 detail('vazamento','crt','floor',[2.5,3.4,1.5,1.1],{drip:true}),
]);
