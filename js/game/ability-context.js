// Contexto de uso, independente da escolha do arquétipo no save.
// Por enquanto T controla o traje da Bio-Forja; não há estado paralelo que
// possa divergir do traje desenhado. Formas do 10X ainda não estão jogáveis.
export function getAbilityContext(progress, player) {
  const archetype = progress?.archetype ?? null;
  const mode = archetype === 'motor_bio_forja'
    ? (player?.equippedSuit === 'bio_forja' ? 'equipped' : 'quick')
    : 'base';
  return { archetype, mode };
}

// Chamado apenas quando não há menus, diálogo nem calibração ativos.
export function toggleBioSuit(progress, player) {
  if (progress?.archetype !== 'motor_bio_forja' || !player || player.ability?.dash) return false;
  player.equippedSuit = player.equippedSuit === 'bio_forja' ? null : 'bio_forja';
  return true;
}

// Valores provisórios de balanceamento do Q no nível 1.
// Rápido conserva exatamente os valores anteriores; equipado reduz o custo
// e aumenta um pouco o alcance, sem contornar colisões nem gates.
const BIO_DASH_PROFILES = Object.freeze({
  quick: Object.freeze({ energyCost: 28, cooldown: 1.25, duration: 0.18, distance: 2.15 }),
  equipped: Object.freeze({ energyCost: 22, cooldown: 1.25, duration: 0.18, distance: 2.8 }),
});

export function getBioDashProfile(progress, player) {
  const context = getAbilityContext(progress, player);
  if (context.archetype !== 'motor_bio_forja') return null;
  return { ...BIO_DASH_PROFILES[context.mode], mode: context.mode };
}
