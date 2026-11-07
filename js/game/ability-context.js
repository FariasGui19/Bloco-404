// Contexto de uso, independente da escolha do arquétipo no save.
// T alterna trajes; as formas do 10X terão seleção própria.
export function getAbilityContext(progress, player) {
  const archetype = progress?.archetype ?? null;
  const mode = archetype === 'motor_bio_forja'
    ? (player?.equippedSuit === 'bio_forja' ? 'equipped' : 'quick')
    : 'base';
  return { archetype, mode };
}

// Chamado apenas quando não há menus, diálogo nem calibração ativos.
export function toggleArchetypeSuit(progress, player) {
  if (!player || player.ability?.dash) return false;
  const suits = { motor_bio_forja: 'bio_forja', lamina_dominio_anciao: 'dominio', mare_astral: 'mare' };
  const suit = suits[progress?.archetype];
  if (!suit) return false; // 10X usará uma interface própria.
  player.equippedSuit = player.equippedSuit === suit ? null : suit;
  return true;
}

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
