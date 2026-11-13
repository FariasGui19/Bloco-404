// Pequenos encontros de mar aberto: sem depender do renderer, sem inventar
// colisões e com IDs estáveis para saves e missões futuras.
import { startQuest, recordQuestEvent } from './quests.js';
import { ganharRespeito } from './nado.js';

const MISSOES = ['jardim_de_retorno', 'testemunhas_do_azul'];
const INFO = Object.freeze({
  rede: { label:'RECOLHER REDE PERDIDA', mensagem:'REDE RECOLHIDA • O CAMINHO DA TARTARUGA ESTÁ LIVRE' },
  tartaruga: { label:'LIBERTAR TARTARUGA', mensagem:'TARTARUGA LIVRE • ELA RETOMA A TRAVESSIA' },
  coral: { label:'CUIDAR DO CORAL', mensagem:'CORAL RESTAURADO • O JARDIM VOLTA A BRILHAR' },
  arraia: { label:'OBSERVAR ARRAIA', mensagem:'ARRAIA OBSERVADA • ELA DESLIZA SEM SE ASSUSTAR' },
  peixe: { label:'OBSERVAR PEIXE-GUIA', mensagem:'PEIXE-GUIA OBSERVADO • ELE RESPONDE COM UM BRILHO' },
  perola: { label:'REGISTRAR PÉROLA DE ECO', mensagem:'PÉROLA REGISTRADA • O ECO PERMANECE NO MAR' },
});
export const flagEncontro = id => `encontro_mare_${id}`;
export function encontroConcluido(progress, id) { return progress?.flags?.[flagEncontro(id)] === true; }
// O mesmo percurso curto é visto de cima e debaixo d'água; a tartaruga
// só se desloca após libertada. Movimento reduzido fixa a pose.
export function posicaoEncontro(item, progress, tempo, reduzirMovimento=false) {
  const t=reduzirMovimento ? 0 : tempo;
  const animal=['tartaruga','arraia','peixe'].includes(item.id);
  const feito=encontroConcluido(progress,item.id);
  const raio=!animal || (item.id === 'tartaruga' && !feito) ? 0 : feito ? .62 : .22;
  const fase=item.x*.7+item.y*.4;
  return {x:item.x+Math.sin(t*.33+fase)*raio, y:item.y+Math.cos(t*.29+fase)*raio*.6,
    altura:animal ? Math.sin(t*1.2+fase)*.08 : 0};
}
export function iniciarMissoesEncontros(map, player, progress) {
  if (!map?.encontrosMare?.length || !player?.nado?.ativo || !player.nado.submerso || player.nado.profundidade <= 1.25 || progress?.archetype !== 'mare_astral') return false;
  const novos = MISSOES.filter(id => !progress.questLog?.[id]);
  for (const id of novos) startQuest(progress,id);
  return novos.length > 0;
}
export function encontroProximo(map, player, progress, alcance = 1.35) {
  if (!map?.encontrosMare || !player?.nado?.ativo || !player.nado.submerso || player.nado.profundidade <= 1.25 || progress?.archetype !== 'mare_astral') return null;
  let melhor=null, distancia=alcance;
  for (const item of map.encontrosMare) {
    if (!INFO[item.id] || encontroConcluido(progress,item.id)) continue;
    const d=Math.hypot(player.x-item.x,player.y-item.y);
    if (d < distancia) { melhor=item; distancia=d; }
  }
  return melhor ? {item:melhor, label:INFO[melhor.id].label, distancia} : null;
}
// Na perspectiva 3D aponta em relação ao rumo da câmera; no mapa usa a
// projeção isométrica. Não depende do sistema de colisão nem altera destino.
export function direcaoEncontro(player, item) {
  const dx=item.x-player.x, dy=item.y-player.y;
  if (Math.hypot(dx,dy)<.15) return '•';
  let ang;
  if (player.nado?.perspectiva3d && Number.isFinite(player.nado.voo?.heading)) {
    const relativo=Math.atan2(dy,dx)-player.nado.voo.heading;
    ang=Math.atan2(Math.sin(relativo),Math.cos(relativo)) - Math.PI/2;
  } else ang=Math.atan2((dx+dy)*.5,dx-dy);
  const setas=['→','↘','↓','↙','←','↖','↑','↗'];
  return setas[(Math.round(ang/(Math.PI/4))+8)%8];
}
export function realizarEncontro(map, player, progress) {
  const candidato=encontroProximo(map,player,progress);
  if (!candidato) return null;
  const {item}=candidato;
  if (item.id === 'tartaruga' && !encontroConcluido(progress,'rede')) {
    return {ok:false,mensagem:'A TARTARUGA ESTÁ PRESA • RECOLHA A REDE PRÓXIMA PRIMEIRO'};
  }
  // Segurança: mesmo chamadas diretas criam as missões antes do evento.
  iniciarMissoesEncontros(map,player,progress);
  progress.flags ??= {};
  progress.flags[flagEncontro(item.id)] = true;
  const concluidas=recordQuestEvent(progress,{type:'encontro_mare',target:item.id});
  if (item.id === 'tartaruga') {
    progress.faunaTratada ??= {};
    progress.faunaTratada[`${map.id}:encontro_tartaruga`] = {tipo:'tartaruga',completo:true};
    progress.faunaCurada = (progress.faunaCurada ?? 0) + 1;
    concluidas.push(...recordQuestEvent(progress,{type:'socorro'}));
    if (player.nado?.respeito) {
      ganharRespeito(player.nado.respeito,.12);
      if (progress.nado) progress.nado.respeito=Math.max(progress.nado.respeito ?? 0,player.nado.respeito.valor);
    }
  }
  player.mareAcao={tipo:item.id,timeLeft:1.1,duration:1.1};
  return {ok:true,id:item.id,mensagem:INFO[item.id].mensagem,concluidas};
}
