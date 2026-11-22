// Registro extensível: cada realidade define seus próprios marcos e degraus.
// Leitura é pura; sincronização é idempotente e só copia marcos já alcançados.
import { CITADEL_MILESTONES,CITADEL_THRESHOLDS,CITADEL_LOCAL_KITS } from '../data/cidadela-progressao.js';
const DEFINITIONS=Object.freeze({cidadela_404:{milestones:CITADEL_MILESTONES,thresholds:CITADEL_THRESHOLDS,kits:CITADEL_LOCAL_KITS}});
const validObject=o=>o && typeof o==='object' && !Array.isArray(o);
export function getDimensionProgress(progress,worldId='cidadela_404') {
  const definition=DEFINITIONS[worldId], archetype=progress?.archetype;
  if(!definition || !definition.kits[archetype]) return null;
  const saved=progress?.dimensionProgress?.[worldId]?.[archetype]?.milestones;
  const known=new Set(Array.isArray(saved)?saved:[]);
  const achieved=definition.milestones.filter(flag=>known.has(flag));
  const score=achieved.length;
  const rank=definition.thresholds.reduce((r,threshold,i)=>score>=threshold?i+1:r,1);
  return {worldId,archetype,score,rank,next:definition.thresholds[rank] ?? null,
    max:definition.milestones.length,achieved,skills:definition.kits[archetype]};
}
export function syncDimensionProgress(progress,worldId='cidadela_404') {
  const before=getDimensionProgress(progress,worldId);
  const definition=DEFINITIONS[worldId];
  if(!before || !definition) return {changed:false,before,after:before};
  const achieved=new Set(before.achieved);
  for(const flag of definition.milestones) if(progress.flags?.[flag]===true) achieved.add(flag);
  // Os saves atuais também gravam flags de recompensa; aceita o estado do
  // diário em saves antigos sem refazer eventos nem conceder recompensas.
  if(worldId==='cidadela_404') for(const [quest, milestone] of [
    ['cidadela_rede_escuta','cidadela_rede_concluida'],
    ['cidadela_vozes_estatica','cidadela_vozes_concluida'],
    ['cidadela_oficina_vigilia','cidadela_vigilia_concluida'],
  ]) if(progress.questLog?.[quest]?.status==='completed') achieved.add(milestone);
  const milestones=definition.milestones.filter(flag=>achieved.has(flag));
  if(milestones.length===before.score) return {changed:false,before,after:before};
  if(!validObject(progress.dimensionProgress)) progress.dimensionProgress={};
  if(!validObject(progress.dimensionProgress[worldId])) progress.dimensionProgress[worldId]={};
  const previous=progress.dimensionProgress[worldId][progress.archetype];
  progress.dimensionProgress[worldId][progress.archetype]={...(validObject(previous)?previous:{}),milestones};
  return {changed:true,before,after:getDimensionProgress(progress,worldId)};
}
