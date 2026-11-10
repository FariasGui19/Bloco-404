import assert from 'node:assert/strict';
import { getMasteryTracks, getTrack, TRACK_IDS } from '../js/data/mastery.js';
import {
  ensureMastery, getMasteryBonuses, getMasteryState, getMasterySummary, recordMastery,
} from '../js/game/mastery.js';
import { getDerivedStats } from '../js/game/rpg.js';
import { ensureArchetypeProgress } from '../js/game/progression.js';

const progress = { archetype: 'nucleo_dez_forma', archetypeProgress: {} };
ensureArchetypeProgress(progress);

// Quatro trilhas por arquétipo, com nome próprio e limiares crescentes.
const tracks = getMasteryTracks('nucleo_dez_forma');
assert.deepEqual(tracks.map(track => track.id), TRACK_IDS);
for (const track of tracks) {
  assert(track.thresholds.length === track.maxRank);
  assert(track.thresholds.every((value, i, list) => i === 0 || value > list[i - 1]));
  assert(track.name.length > 3);
}
assert.equal(getTrack('nucleo_dez_forma', 'locomocao').name, 'CINÉTICA');
assert.equal(getTrack('lamina_dominio_anciao', 'locomocao').name, 'PESO E IMPULSO');
assert.deepEqual(getMasteryTracks('arquétipo inexistente'), []);

// Leitura não cria contadores no save.
assert.deepEqual(progress.archetypeProgress.nucleo_dez_forma.mastery, {});
const readOnly = getMasteryState(progress);
assert.equal(readOnly[0].rank, 0);
assert.deepEqual(progress.archetypeProgress.nucleo_dez_forma.mastery, {}, 'consultar não muta contadores');

// Uso soma no contador certo e sobe rank exatamente no limiar.
const hitTrack = getTrack('nucleo_dez_forma', 'ataque');
const firstRank = recordMastery(progress, 'basic_hit', hitTrack.thresholds[0] - 1);
assert.equal(firstRank.length, 0);
let state = getMasteryState(progress).find(track => track.id === 'ataque');
assert.equal(state.rank, 0);
assert(Math.abs(state.progress - (hitTrack.thresholds[0] - 1) / hitTrack.thresholds[0]) < 1e-9);

const rankUp = recordMastery(progress, 'basic_hit', 1);
assert.equal(rankUp.length, 1);
assert.equal(rankUp[0].id, 'ataque');
assert.equal(rankUp[0].rank, 1);
assert.equal(rankUp[0].label, `${hitTrack.name} I`);
state = getMasteryState(progress).find(track => track.id === 'ataque');
assert.equal(state.rank, 1);
assert.equal(state.nextAt, hitTrack.thresholds[1]);

// Efeitos entram nas estatísticas derivadas.
const base = getDerivedStats({ archetype: 'nucleo_dez_forma', archetypeProgress: {} });
const withAttack = getDerivedStats(progress);
assert(withAttack.basicDamage > base.basicDamage);
assert(withAttack.critChance > base.critChance);

// Fluxo: menos recarga e mais regeneração de energia.
recordMastery(progress, 'ability_use', 10);
const fluxo = getMasteryState(progress).find(track => track.id === 'fluxo');
assert.equal(fluxo.rank, 1);
assert(getDerivedStats(progress).cooldown < base.cooldown);
assert(getDerivedStats(progress).energyRegen > 0);

// Eco: XP e dano de habilidade.
recordMastery(progress, 'resonance', 4);
const withEco = getDerivedStats(progress);
assert(withEco.xpBonusPct > 0);
assert(withEco.abilityDamagePct > 0);

// Locomoção do Núcleo: a Forma Veloz fica mais rápida e dura mais.
recordMastery(progress, 'distance', 150);
const loco = getDerivedStats(progress);
assert(loco.moveSpeedPct > 0);
assert(loco.formSpeedPct > 0);
assert(loco.formDuration > 0);
const before = getDerivedStats({ archetype: 'nucleo_dez_forma', archetypeProgress: {} });
assert.equal(before.formDuration, 0);
assert.equal(before.formSpeedPct, 0);

// Resumo para a HUD mostra a trilha mais avançada.
const summary = getMasterySummary(progress);
assert(summary.total >= 4);
assert.match(summary.label, /[IVX]+$/);

// Outros arquétipos têm trilhas próprias e não herdam a maestria do Núcleo.
const other = { archetype: 'mare_astral', archetypeProgress: {} };
assert.equal(getMasteryState(other)[0].rank, 0);
assert.equal(getMasteryBonuses(other).basicDamagePct, 0);

// Contadores inválidos são saneados.
const dirty = ensureMastery({ archetype: 'motor_bio_forja', archetypeProgress: { motor_bio_forja: { mastery: { ataque: -5, fluxo: 'x' } } } });
assert.equal(dirty.ataque, 0);
assert.equal(dirty.fluxo, 0);

console.log('Maestria: trilhas, limiares, ranks por uso, efeitos e isolamento por arquétipo OK.');
