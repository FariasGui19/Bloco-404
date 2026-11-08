// Primeiro setor explorável inspirado no conceito; arte final e combate virão depois.
import { buildGround } from '../../ground.js';
const size = 72;
const rows = Array.from({length:size}, (_, y) => Array.from({length:size}, (_, x) => {
  if (x < 2 || y < 2 || x >= size - 2 || y >= size - 2) return 'X';
  // Pátios e caminhos largos, com canais que oferecem desvios nas pontes.
  if ((x === 25 || x === 26) && y > 6 && y < 65 && !(y >= 17 && y <= 22) && !(y >= 47 && y <= 52)) return 'X';
  if ((y === 39 || y === 40) && x > 30 && x < 66 && !(x >= 43 && x <= 48) && !(x >= 60 && x <= 63)) return 'X';
  return (x + y) % 5 === 0 ? 'T' : 'S';
}).join(''));
const ground = buildGround({sheet:'BEACH_FLOOR_SPRITE', rows, legend:{
  S:{tiles:[[0,0]],walk:true}, T:{tiles:[[1,0]],walk:true}, X:{tiles:[[1,1]],walk:false},
}});
const objects = [
  // A base sólida não ocupa o spawn nem os espaços de interação.
  {id:'bio_terminal_principal',tipo:'decoracao',x:12,y:8,sprite:'bio_terminal',useCrop:true,larguraPx:460,pivotX:.5,pivotY:1,depthOffset:-3.5,bloqueia:true,hitbox:{offsetX:-6,offsetY:-6,width:6,height:6}},
  {id:'bio_reator_patio',tipo:'decoracao',x:38,y:17,sprite:'bio_reator',useCrop:true,larguraPx:130,pivotX:.5,pivotY:1,bloqueia:true,hitbox:{offsetX:-1.25,offsetY:-1.25,width:1.25,height:1.25}},
  {id:'bio_estufa_principal',tipo:'decoracao',x:58,y:47,sprite:'bio_estufa',useCrop:true,larguraPx:400,pivotX:.5,pivotY:1,depthOffset:-2,bloqueia:true,hitbox:{offsetX:-5,offsetY:-5,width:5,height:5}},
  // As pontes ficam na camada de fundo, sob os pés, sobre os vãos já existentes.
  {id:'bio_ponte_patio',tipo:'decoracao',x:25.5,y:19.5,sprite:'bio_ponte',useCrop:true,larguraPx:240,pivotX:.5,pivotY:.50,espelhar:true,camada:'fundo',bloqueia:false},
  {id:'bio_ponte_estufa',tipo:'decoracao',x:45.5,y:39.5,sprite:'bio_ponte',useCrop:true,larguraPx:240,pivotX:.5,pivotY:.50,camada:'fundo',bloqueia:false},
];
// Reparo opcional em sequência, independente dos coletáveis antigos e do save.
for (const cfg of [
  {id:'bio_reparo_condutor',x:18,y:14,nome:'CONDUTOR DA ESTAÇÃO',broken:'bio_condutor_quebrado',fixed:'bio_condutor_ativo',diagnosis:'bio_reparo_condutor_diagnostico',label:'CONDUTOR',
   dialogue:['CONDUTOR INTERROMPIDO. PRESSIONE E PARA RECONSTRUIR.', 'DEPOIS, PROCURE O REGULADOR NO PÁTIO.'], success:['CONDUTOR RESTAURADO. O REGULADOR DO PÁTIO AGORA PODE SER DIAGNOSTICADO.']},
  {id:'bio_reparo_regulador',x:39,y:21,nome:'REGULADOR DO PÁTIO',broken:'bio_regulador_quebrado',fixed:'bio_regulador_ativo',diagnosis:'bio_reparo_regulador_diagnostico',prerequisite:'gate_bio_reparo_condutor',label:'REGULADOR',
   dialogue:['PRESSÃO INSTÁVEL. USE E PARA RECONSTRUIR A VÁLVULA.'], success:['REGULADOR RECONSTRUÍDO. A LINHA DE PRESSÃO FOI RESTABELECIDA.']},
]) objects.push({id:cfg.id,tipo:'obstaculo',nome:cfg.nome,x:cfg.x,y:cfg.y,sprite:cfg.broken,scale:.27,bloqueia:true,hitbox:{offsetX:-.35,offsetY:-.35,width:.7,height:.7},
  moduleSystem:{id:cfg.id,diagnosisFlag:cfg.diagnosis,requiresFlag:cfg.prerequisite,allowedArchetypes:['motor_bio_forja'],distance:2.2,label:`DIAGNOSTICAR ${cfg.label}`,speaker:'LINK BIO-FORJA',dialogue:cfg.dialogue},
  interacao:{label:`RECONSTRUIR ${cfg.label}`,distancia:1.65},
  gate:{anyOf:[{arquetipo:'motor_bio_forja'}],requiresFlag:cfg.diagnosis,prerequisiteFlag:cfg.prerequisite,diagnosisArchetype:'motor_bio_forja',
    falhaDiagnostico:['USE R PARA DIAGNOSTICAR ESTE SISTEMA ANTES DE RECONSTRUIR.'],
    falhaPrerequisito:['A LINHA ESTÁ SEM ENERGIA. REPARE O CONDUTOR DA CHEGADA PRIMEIRO.'],promptPrerequisito:'REPARE O CONDUTOR PRIMEIRO',
    falha:['ESTE SISTEMA EXIGE BIO-FORJA.'],sucesso:cfg.success,manterVisivel:true,manterColisao:true,spriteAberto:cfg.fixed}});
// Vegetação industrial de baixa altura, distribuída junto aos caminhos.
for (const [id,x,y,sprite,scale] of [
 ['bio_vida_cano_entrada',20,13,'bio_mato_cano',.23],
 ['bio_vida_ventilacao_patio',34,16,'bio_mato_ventilacao',.21],
 ['bio_vida_barris_patio',40,25,'bio_mato_barris',.22],
 ['bio_vida_fissura_trilha',43,32,'bio_mato_fissura',.20],
 ['bio_vida_cano_estufa',52,44,'bio_mato_cano',.23],
 ['bio_vida_barris_estufa',57,52,'bio_mato_barris',.22],
]) objects.push({id,tipo:'decoracao',x,y,sprite,scale,bloqueia:true,hitbox:{offsetX:-.3,offsetY:-.3,width:.6,height:.6}});
// As novas peças têm apoio no solo e pequenas áreas sólidas próprias.
objects.push({id:'bio_plataforma_tecnica',tipo:'decoracao',x:33,y:26,sprite:'bio_plataforma',scale:.28,depthOffset:-.6,bloqueia:true,hitbox:{offsetX:-2,offsetY:-2,width:2,height:2}});
for (const [id,x,y,sprite,scale] of [
  ['bio_margem_canto_entrada',8,17,'bio_margem_canto',.19],
  ['bio_margem_cano_patio',29,22,'bio_margem_cano',.18],
  ['bio_margem_ruina_trilha',50,29,'bio_margem_ruina',.16],
  ['bio_margem_mureta_estufa',48,54,'bio_margem_mureta',.18],
]) objects.push({id,tipo:'decoracao',x,y,sprite,scale,depthOffset:-.4,bloqueia:true,hitbox:{offsetX:-.4,offsetY:-.4,width:.8,height:.8}});
// Detalhes estáticos nas bordas dos pátios, sem interferir nos pontos de missão.
// A folha foi recortada em quatro imagens para preservar a bobina separada da caixa.
for (const [id,x,y,sprite,scale] of [
  ['bio_modulo_floreira_entrada',18,11,'bio_floreira',.22],
  ['bio_modulo_luz_entrada',19,18,'bio_luminaria',.22],
  ['bio_modulo_tubos_patio',33,15,'bio_tubos',.22],
  ['bio_modulo_caixa_patio',38,25,'bio_caixa',.20],
  ['bio_modulo_floreira_patio',42,23,'bio_floreira',.21],
  ['bio_modulo_luz_trilha',49,32,'bio_luminaria',.22],
  ['bio_modulo_caixa_estufa',53,52,'bio_caixa',.20],
  ['bio_modulo_floreira_estufa',56,50,'bio_floreira',.22],
]) objects.push({id,tipo:'decoracao',x,y,sprite,scale,bloqueia:true,
  hitbox:{offsetX:-.35,offsetY:-.35,width:.7,height:.7}});
// Vegetação agrupada ao redor das instalações em vez de uma grade regular.
for (let y=5; y<68; y+=6) for (let x=5; x<68; x+=6) {
  const n = (x * 97 + y * 131 + x * y * 17) % 11;
  if (n > 5 || (x>20 && x<32 && y>12 && y<28) || (x>39 && x<53 && y>33 && y<46) || (x<20 && y<22) || (x>29 && x<42 && y>12 && y<25) || (x>42 && x<58 && y>42 && y<57)) continue;
  objects.push({id:`estacao_planta_${x}_${y}`,tipo:'decoracao',x:x+((x*y)%5-2)*.4,y:y+((x+2*y)%5-2)*.4,sprite:'vegetacao_tropical',frame:{col:n%2?2:3,row:0},useCrop:true,larguraPx:65+(x*y)%35,pivotX:.5,pivotY:1,bloqueia:false});
}
for (const [id,x,y,col,row,w] of [
  ['bio_destroc_1',14,10,3,1,62], ['bio_destroc_2',17,18,2,1,55],
  ['bio_destroc_4',48,52,2,1,64],
  ['bio_destroc_5',54,53,3,1,58], ['bio_destroc_6',41,25,3,0,48],
]) objects.push({id,tipo:'decoracao',x,y,sprite:'beach_props',frame:{col,row},useCrop:true,larguraPx:w,pivotX:.5,pivotY:1,bloqueia:false});
for (const [id,x,y,label] of [['estacao_chegada',8,10,'CHEGADA'],['estacao_patio',36,20,'PÁTIO'],['estacao_estufa',50,50,'ESTUFA']]) objects.push({id,tipo:'decoracao',x,y,routeMarker:label,bloqueia:false});
export const map={
  id:'ilha_estacao_bio', meta:{nome:'ESTAÇÃO QUE RESPIRA · SETOR INICIAL',tipo:'exterior',dimensao:'arquipelago',corFundo:'#1e6384',estiloPiso:'livre',useBackgroundWalls:true,ambiente:{poeira:8,cor:'#ffd98a'},minZoom:.85},
  corChao:'#e6c280',aguaPraia:rows.map(r=>r.replaceAll('X','D')),layout:rows.map(r=>[...r].map(c=>c==='X'?1:0)),walkMask:ground.walkMask,pisos:ground.pisos,
  spawnPoints:{inicio:{x:9.5,y:10.5}},objects,
  trainingTargets:[{id:'simulador_bio_1',x:33,y:18,maxHealth:3},{id:'simulador_bio_2',x:48,y:51,maxHealth:3}],
  collectibles:[
    {id:'bio_estacao_condutor',nome:'CONDUTOR',tipo:'fragmento',x:15,y:15,label:'EXAMINAR CONDUTOR',dialogue:['UM CONDUTOR FALHOU NA ESTAÇÃO.','PROCURE O REGULADOR NO PÁTIO.']},
    {id:'bio_estacao_regulador',nome:'REGULADOR',tipo:'fragmento',x:36,y:20,requiresFlag:'collected_bio_estacao_condutor',label:'AJUSTAR REGULADOR',dialogue:['A PRESSÃO COMEÇA A ESTABILIZAR.','REATIVE A ESTUFA NO SETOR MAIS DISTANTE.']},
    {id:'bio_estacao_estufa',nome:'ESTUFA',tipo:'fragmento',x:50,y:50,requiresFlag:'collected_bio_estacao_regulador',label:'ESTABILIZAR ESTUFA',dialogue:['O PULSO DA ESTAÇÃO SE ESTABILIZA.','SETOR INICIAL CONCLUÍDO. O SISTEMA AINDA EXIGE UMA RECONSTRUÇÃO MAIS PROFUNDA.']},
  ],
  portals:[{id:'estacao_voltar',tipo:'door',x:8,y:10,label:'VOLTAR À PRAIA',interactionDistance:1.4,destino:{mapId:'ilha_praia_inicial',spawnId:'vindo_da_estacao'},transition:'fade'}],
};
