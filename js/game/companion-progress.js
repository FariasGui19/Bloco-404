// Dados aditivos: nunca apaga a antiga flag nem transforma Bolt em recompensa automática.
export function ensureCompanionProgress(progress) {
  progress.companions ??= { active: null, pets: {} };
  const data = progress.companions;
  data.pets ??= {};
  if (progress.flags?.companheiro_lumeo && !data.pets.lumeo) data.pets.lumeo = { level: 1, xp: 0, inventory: [], skills: {} };
  if (!data.active && progress.flags?.companheiro_lumeo) data.active = 'lumeo';
  return data;
}
export function activateCompanion(progress, id) {
  if (!['bolt', 'lumeo'].includes(id)) return false;
  if (id === 'lumeo' && !progress.flags?.companheiro_lumeo) return false;
  const data = ensureCompanionProgress(progress);
  // Bolt é uma prévia opt-in neste save local, não uma autorização por conta.
  data.pets[id] ??= { level: 1, xp: 0, inventory: [], skills: {} };
  data.active = id;
  return true;
}
