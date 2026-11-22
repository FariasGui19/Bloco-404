import assert from 'node:assert/strict';
import {criarTravessia,atualizarTravessia,DISTANCIA_DOCAS} from '../js/game/travessia-neblina.js';
import {podeVoarLivre,atualizarVooLivre} from '../js/game/voo-livre.js';
let v=criarTravessia(true);
for(let i=0;i<20;i++)atualizarTravessia(v,{frente:true},.05);assert(v.x>0 && v.speed>0 && v.speed<13,'inércia no arranque');
let antes=v.x;atualizarTravessia(v,{},.05);assert(v.x>antes,'inércia sem motor');
atualizarTravessia(v,{trocar:true},.05);assert(v.nadando);antes=v.estamina;for(let i=0;i<20;i++)atualizarTravessia(v,{frente:true,acelerar:true},.05);assert(v.estamina<antes,'nado consome estamina');
let outro=criarTravessia(false);atualizarTravessia(outro,{trocar:true},.05);assert(!outro.nadando,'outros arquétipos não nadam nesta rota');
atualizarTravessia(outro,{sonar:true},.05);assert(outro.sonar>0 && outro.sonarRecarga>0);const cd=outro.sonarRecarga;atualizarTravessia(outro,{sonar:true},.05);assert(outro.sonarRecarga<cd,'sonar não reinicia enquanto recarrega');
v=criarTravessia(true);v.ameacas=[{x:4,y:0,tipo:'peixe',fase:'espera',timer:0}];let events=[];for(let i=0;i<65;i++)events.push(...atualizarTravessia(v,{},.05));assert(events.includes('CONTATO HOSTIL • DESVIE'));assert(events.includes('dano_casco'));assert.equal(v.casco,76);
v=criarTravessia(true);v.nadando=true;v.ameacas=[{x:4,y:0,tipo:'peixe',fase:'espera',timer:0}];events=[];for(let i=0;i<65;i++)events.push(...atualizarTravessia(v,{},.05));assert(events.includes('dano_nadador'));
v=criarTravessia(false);v.ameacas=[];for(let i=0;i<3000 && !v.chegou;i++)atualizarTravessia(v,{frente:true},.05);assert(v.chegou);assert.equal(v.x,DISTANCIA_DOCAS);assert(v.tempo>60,'travessia não é instantânea');
assert(!podeVoarLivre({capacidadeAerea:true,exigeSincronizacao:true,sincronizacao:1}));assert(podeVoarLivre({capacidadeAerea:true,exigeSincronizacao:true,sincronizacao:4}));assert(!podeVoarLivre({sincronizacao:4}));
const voo={x:0,y:0,altura:0,vx:0,vy:0,vz:0,roll:0,pitch:0};for(let i=0;i<100;i++)atualizarVooLivre(voo,{frente:true,subir:true,direita:true,propulsao:true},.05);assert(voo.altura>0&&voo.x>0&&voo.y>0&&voo.roll<0);for(let i=0;i<500;i++)atualizarVooLivre(voo,{descer:true},.05);assert.equal(voo.altura,0);
console.log('Travessia: inércia, nado, sonar, ameaças, chegada e física-base de voo OK.');
const {iniciarVooAereo}=await import('../js/game/player.js');
const hero={x:2,y:2},p={archetype:'nucleo_dez_forma',flags:{voo_livre_habilitado:true},mareCromatica:{sincronizacao:1}},m={meta:{vooLivre:true,cromatica:true}};
assert(!iniciarVooAereo(hero,p,m),'sincronização inicial bloqueia voo');p.mareCromatica.sincronizacao=4;assert(iniciarVooAereo(hero,p,m));assert.equal(hero.vooLivre.altura,0);assert(!iniciarVooAereo(hero,p,{meta:{cromatica:true}}),'mapa precisa autorizar voo');
// Luz atrai criaturas apenas dentro do cone; luz apagada não as magnetiza.
const luz=criarTravessia(false);luz.ameacas=[{x:70,y:0,tipo:'peixe',fase:'espera',timer:0}];
for(let i=0;i<20;i++)atualizarTravessia(luz,{},.05);assert(luz.ameacas[0].x<70);
const escuro=criarTravessia(false);escuro.ameacas=[{x:70,y:0,tipo:'peixe',fase:'espera',timer:0}];atualizarTravessia(escuro,{luz:true},.05);assert(!escuro.luz);for(let i=0;i<20;i++)atualizarTravessia(escuro,{},.05);assert.equal(escuro.ameacas[0].x,70);
const acordado=criarTravessia(false);acordado.ameacas=[{x:8,y:0,tipo:'peixe',fase:'espera',timer:0}];acordado.luz=false;let sinais=[];for(let i=0;i<60;i++)sinais.push(...atualizarTravessia(acordado,{},.05));assert(sinais.includes('dano_casco'),'perigo permanece mesmo no escuro');
const wake=criarTravessia(false);wake.ameacas=[];for(let i=0;i<100;i++)atualizarTravessia(wake,{frente:true,acelerar:true},.05);assert(wake.rastro.length>0&&wake.rastro.length<=24);for(let i=0;i<160;i++)atualizarTravessia(wake,{},.05);assert(wake.rastro.every(p=>p.idade<=4));
console.log('Travessia: farol atrai criaturas, sonar alternativo e rastro limitado OK.');
// Percurso seguro é possível em um tempo razoável sem desativar o risco:
// apagar a luz e buscar a borda mantém separação dos predadores centrais.
const percurso=criarTravessia(false);
for(let i=0;i<3000&&!percurso.chegou&&!percurso.perdeu;i++){
 const alvo=Math.max(-.8,Math.min(.8,(70-percurso.y)*.035));
 atualizarTravessia(percurso,{frente:true,acelerar:true,luz:i===0,direita:percurso.heading<alvo-.04,esquerda:percurso.heading>alvo+.04},.05);
}
assert(percurso.chegou && percurso.casco>0,'travessia deve ser vencível ao navegar/desviar');
