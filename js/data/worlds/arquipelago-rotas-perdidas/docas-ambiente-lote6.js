// Small ground dressing, intentionally nonsolid. Coordinates in approved plant.
const piece=(name,x,y,w)=>Object.freeze({name,x,y,w,sprite:'docas_ambiente_lote6_'+name.replaceAll('-','_')});
export const AMBIENTE_DOCAS_LOTE6=Object.freeze([
 piece('algas-encalhadas',680,505,29),piece('conchas-partidas',700,480,20),
 piece('garrafa-recado',1150,555,23),piece('argola-cais',625,625,24),
 piece('rede-rasgada',740,580,33),piece('penas-negras',1030,530,22),
 piece('velas-votivas',1000,195,21),piece('bussola-quebrada',895,520,18),
 piece('caranguejo',1200,570,14),piece('bandeira-rasgada',1030,505,29),
]);
