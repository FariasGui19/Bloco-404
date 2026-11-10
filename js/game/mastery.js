// =====================================================================
// MAESTRIA — MOTOR
//
// Contadores brutos ficam em progress.archetypeProgress[arch].mastery.
// Rank nunca é salvo: é derivado dos limiares, então mudar os números no
// futuro recalcula tudo sem migração.
// =====================================================================
import { TRACK_IDS, getMasteryTracks } from '../data/mastery.js';
import { ensureArchetypeProgress } from './progression.js';

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];

export function ensureMastery(progress, archetype = progress?.archetype) {
  if (!progress || !archetype) return null;
  ensureArchetypeProgress(progress, archetype);
  const kit = progress.archetypeProgress?.[archetype];
  if (!kit) return null;
  kit.mastery ??= {};
  for (const id of TRACK_IDS) {
    if (!Number.isFinite(kit.mastery[id]) || kit.mastery[id] < 0) kit.mastery[id] = 0;
  }
  return kit.mastery;
}

function rankFor(track, counter) {
  let rank = 0;
  for (const threshold of track.thresholds) {
    if (counter >= threshold) rank += 1;
  }
  return rank;
}

// Devolve as trilhas já resolvidas para HUD, Códex e testes.
export function getMasteryState(progress, archetype = progress?.archetype) {
  const counters = progress?.archetypeProgress?.[archetype]?.mastery ?? {};
  return getMasteryTracks(archetype).map(track => {
    const counter = Number.isFinite(counters[track.id]) ? counters[track.id] : 0;
    const rank = rankFor(track, counter);
    const nextAt = rank < track.maxRank ? track.thresholds[rank] : null;
    const previousAt = rank > 0 ? track.thresholds[rank - 1] : 0;
    const span = nextAt === null ? 1 : Math.max(1, nextAt - previousAt);
    return {
      ...track,
      counter,
      rank,
      nextAt,
      progress: nextAt === null ? 1 : Math.max(0, Math.min(1, (counter - previousAt) / span)),
      rankLabel: rank > 0 ? ROMAN[rank] : '—',
    };
  });
}

// Registra uso. `source` é o evento bruto; cada trilha escuta o seu.
// Retorna as subidas de rank desta chamada para a HUD comemorar.
export function recordMastery(progress, source, amount = 1, archetype = progress?.archetype) {
  const rankUps = [];
  if (!progress || !archetype || !Number.isFinite(amount) || amount <= 0) return rankUps;
  const counters = ensureMastery(progress, archetype);
  if (!counters) return rankUps;
  const tracks = getMasteryTracks(archetype);
  for (const track of tracks) {
    if (track.source !== source) continue;
    const before = rankFor(track, counters[track.id]);
    counters[track.id] += amount;
    const after = rankFor(track, counters[track.id]);
    if (after > before) rankUps.push({ id: track.id, name: track.name, rank: after, label: `${track.name} ${ROMAN[after]}` });
  }
  return rankUps;
}

export function getMasteryBonuses(progress, archetype = progress?.archetype) {
  const bonuses = {
    basicDamagePct: 0, critChance: 0, cooldownPct: 0, energyRegen: 0,
    abilityDamagePct: 0, xpBonusPct: 0, moveSpeedPct: 0, formSpeedPct: 0, formDuration: 0,
  };
  for (const track of getMasteryState(progress, archetype)) {
    if (track.rank <= 0) continue;
    for (const [key, value] of Object.entries(track.effects)) {
      if (key in bonuses) bonuses[key] += value * track.rank;
    }
  }
  return bonuses;
}

// Resumo curto para a HUD: a trilha mais avançada e o total de ranks.
export function getMasterySummary(progress, archetype = progress?.archetype) {
  const tracks = getMasteryState(progress, archetype);
  const total = tracks.reduce((sum, track) => sum + track.rank, 0);
  const top = [...tracks].sort((a, b) => b.rank - a.rank || b.progress - a.progress)[0] ?? null;
  return {
    total,
    label: top && top.rank > 0 ? `${top.name} ${top.rankLabel}` : 'EM CALIBRAÇÃO',
    topId: top?.id ?? null,
  };
}
