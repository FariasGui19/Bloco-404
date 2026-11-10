import assert from 'node:assert/strict';
import { ARCHETYPE_KITS, IMPLEMENTED_ABILITIES, KIT_SLOTS } from '../js/data/archetype-kits.js';
import { MODULE_ULTIMATE_IDS, ULTIMATES, ULTIMATE_IDS, getUltimate, getUltimateById } from '../js/data/ultimates.js';
import { TOOL_ULTIMATES, TOOL_ULTIMATE_IDS } from '../js/data/archetype-tools.js';
import {
  canCastUltimate, ensureUltimate, getUltimateBuff, getUltimateStatus, tryUltimate, updateUltimate,
} from '../js/game/ultimate.js';
import { getDerivedStats } from '../js/game/rpg.js';
import { existsSync } from 'node:fs';
import { ensureArchetypeProgress } from '../js/game/progression.js';

const ARCHETIPOS = ['motor_bio_forja', 'lamina_dominio_anciao', 'mare_astral', 'nucleo_dez_forma'];

// ---------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------
assert.deepEqual(Object.keys(ULTIMATES).sort(), [...ARCHETIPOS].sort());
assert.equal(MODULE_ULTIMATE_IDS.length, 4, 'quatro Ultimates de arquétipo');
assert.equal(TOOL_ULTIMATE_IDS.length, TOOL_ULTIMATES.length, 'toda sobrecarga tem id');
assert.equal(new Set(ULTIMATE_IDS).size, ULTIMATE_IDS.length, 'IDs de Ultimate únicos');
assert.equal(ULTIMATE_IDS.length, 4 + TOOL_ULTIMATES.length, 'catálogo = base + sobrecargas');
assert.equal(getUltimateById('corte_de_reconfiguracao')?.tier, 'tool', 'sobrecarga encontrada por id');
for (const id of ARCHETIPOS) {
  const ultimate = getUltimate(id);
  assert(ultimate, `${id} precisa de Ultimate`);
  assert.equal(getUltimateById(ultimate.id).name, ultimate.name);
  assert.equal(ARCHETYPE_KITS[id].ultimate, ultimate.id, 'o kit aponta para a Ultimate do arquétipo');
  assert(IMPLEMENTED_ABILITIES.includes(ultimate.id), 'Ultimate conta como habilidade implementada');
  for (const campo of ['name', 'description', 'effectText']) assert(ultimate[campo].length > 5, `${id}.${campo}`);
  assert(ultimate.cost >= 40 && ultimate.cost <= 80, 'custo alto, mas pagável com a barra cheia');
  assert(ultimate.cooldown >= 15, 'recarga longa');
  assert(ultimate.radius >= 5 && ultimate.damage > 0, 'onda radial com dano');
  assert(ultimate.healPct > 0 && ultimate.healPct <= .6, 'cura proporcional, não instantânea cheia');
  assert(ultimate.buff.duration >= 5 && ultimate.buff.id, 'bônus temporário identificado');
  assert(KIT_SLOTS.includes('ultimate'));
}
assert.equal(getUltimate('arquétipo inexistente'), null);

// Cada Ultimate tem sigilo próprio em disco (HUD e Códex usam esse caminho).
for (const id of ARCHETIPOS) {
  const arquivo = new URL(`../assets/sprites/ui/codex/ultimate-${id}.png`, import.meta.url);
  assert(existsSync(arquivo), `sigilo de ${id} presente`);
}

// ---------------------------------------------------------------
// Uso: custo, recarga, cura, dano radial e bônus
// ---------------------------------------------------------------
const progress = { archetype: 'lamina_dominio_anciao', archetypeProgress: {} };
ensureArchetypeProgress(progress);
// A Ultimate abre no nível 3 do caminho.
progress.archetypeProgress.lamina_dominio_anciao.level = 3;
const ultimate = getUltimate('lamina_dominio_anciao');

const player = {
  x: 10, y: 10, facing: 'down',
  health: 40, maxHealth: 100,
  energy: 100, maxEnergy: 100,
  ability: { cooldowns: {}, lastMessage: null, messageTimer: 0 },
  ultimate: undefined,
};

// Sem arquétipo não existe Ultimate.
assert.equal(canCastUltimate(player, { archetype: null }).ok, false);
assert.equal(tryUltimate({ player, progress: { archetype: null }, targets: [] }), null);

// Alvos: dentro do raio (2 tiles e 6 tiles) e fora (12 tiles).
const perto = { id: 'perto', x: 12, y: 10, health: 60, maxHealth: 60 };
const medio = { id: 'medio', x: 16, y: 10, health: 60, maxHealth: 60 };
const longe = { id: 'longe', x: 22, y: 10, health: 60, maxHealth: 60 };
const mensagens = [];
const resultado = tryUltimate({ player, progress, targets: [perto, medio, longe], showMessage: texto => mensagens.push(texto), rng: () => .5 });

assert(resultado, 'Ultimate dispara com energia cheia');
assert.equal(player.energy, 100 - ultimate.cost, 'energia cobrada');
assert.equal(player.ultimate.cooldown, ultimate.cooldown, 'recarga iniciada');
assert.equal(player.ultimate.casts, 1);
assert.equal(player.ultimate.buff.id, ultimate.buff.id);
assert.equal(player.ultimate.buff.timeLeft, ultimate.buff.duration);
assert.equal(player.ultimate.effect.id, ultimate.id, 'efeito visual disparado');
assert.equal(mensagens.length, 1);
assert.match(mensagens[0], new RegExp(ultimate.name));

// Dano radial: só quem está dentro do raio.
assert.equal(resultado.damage.hits.length, 2, 'dois alvos dentro do raio');
assert(perto.health < 60 && medio.health < 60, 'alvos próximos levaram dano');
assert.equal(longe.health, 60, 'alvo fora do raio não é atingido');

// Cura proporcional à vida máxima, limitada ao máximo.
assert.equal(resultado.healed, Math.round(getDerivedStats(progress, player).maxHealth * ultimate.healPct));
assert.equal(player.health, 40 + resultado.healed);

// Bônus entra nas estatísticas derivadas (dano básico) e sai quando expira.
const buffed = getDerivedStats(progress, player);
const limpo = getDerivedStats(progress, { ultimate: { buff: null } });
assert(buffed.basicDamage > limpo.basicDamage, 'bônus de dano aplicado');

// Segunda tentativa imediata: bloqueada pela recarga, sem gastar energia.
const energiaAntes = player.energy;
assert.equal(canCastUltimate(player, progress).ok, false);
assert.equal(tryUltimate({ player, progress, targets: [perto] }), null);
assert.equal(player.energy, energiaAntes, 'bloqueio não cobra energia');

// Bônus também soma velocidade quando a Ultimate é do Núcleo.
const nucleoPlayer = { x: 0, y: 0, health: 100, maxHealth: 100, energy: 100, maxEnergy: 100, ability: {} };
const nucleoProgress = { archetype: 'nucleo_dez_forma', archetypeProgress: {} };
ensureArchetypeProgress(nucleoProgress);
nucleoProgress.archetypeProgress.nucleo_dez_forma.level = 3;
tryUltimate({ player: nucleoPlayer, progress: nucleoProgress, targets: [], rng: () => .5 });
const nucleoSem = getDerivedStats(nucleoProgress, { ultimate: { buff: null } });
const nucleoCom = getDerivedStats(nucleoProgress, nucleoPlayer);
assert(nucleoCom.moveSpeedPct > nucleoSem.moveSpeedPct, 'Horizonte acelera o Núcleo');

// ---------------------------------------------------------------
// Tempo: recarga, regeneração do bônus e expiração
// ---------------------------------------------------------------
assert.equal(getUltimateBuff(nucleoPlayer)?.id, 'horizonte');
const energiaBaixa = nucleoPlayer.energy = 10;
updateUltimate(nucleoPlayer, nucleoProgress, 1);
assert(nucleoPlayer.energy > energiaBaixa, 'bônus do Núcleo devolve energia');
assert(nucleoPlayer.ultimate.buff.timeLeft < getUltimate('nucleo_dez_forma').buff.duration);

const bioPlayer = { x: 0, y: 0, health: 10, maxHealth: 100, energy: 100, maxEnergy: 100, ability: {} };
const bioProgress = { archetype: 'motor_bio_forja', archetypeProgress: {} };
ensureArchetypeProgress(bioProgress);
bioProgress.archetypeProgress.motor_bio_forja.level = 3;
tryUltimate({ player: bioPlayer, progress: bioProgress, targets: [], rng: () => .5 });
const vidaAposCura = bioPlayer.health;
updateUltimate(bioPlayer, bioProgress, 2);
assert(bioPlayer.health > vidaAposCura, 'Forja Viva cura por segundo');

// O bônus expira e o efeito visual some.
updateUltimate(nucleoPlayer, nucleoProgress, 60);
assert.equal(getUltimateBuff(nucleoPlayer), null);
assert.equal(nucleoPlayer.ultimate.effect, null);
assert.equal(nucleoPlayer.ultimate.cooldown, 0, 'recarga terminou');

// ---------------------------------------------
// Energia insuficiente e jogador caído bloqueiam
// ---------------------------------------------
const fraco = { x: 0, y: 0, health: 100, maxHealth: 100, energy: 5, maxEnergy: 100, ability: {} };
assert.equal(canCastUltimate(fraco, progress).ok, false);
assert.equal(tryUltimate({ player: fraco, progress, targets: [] }), null);
assert.equal(fraco.energy, 5, 'sem energia a Ultimate não cobra nada');

const caido = { x: 0, y: 0, health: 0, maxHealth: 100, energy: 100, maxEnergy: 100, ability: {} };
assert.equal(canCastUltimate(caido, progress).ok, false);

// Estado para HUD/Códex.
const status = getUltimateStatus(player, progress);
assert.equal(status.definition.id, ultimate.id);
assert(status.charge >= 0 && status.charge <= 1);
assert.equal(status.casts, 1);
assert.equal(ensureUltimate({}).cooldown, 0, 'runtime nasce limpo');

// Maestria de fluxo registrada pelo uso.
const fluxo = progress.archetypeProgress.lamina_dominio_anciao.mastery.fluxo;
assert(fluxo >= 2, 'usar a Ultimate treina fluxo');

console.log('Ultimate: catálogo, custo, recarga, dano radial, cura, bônus e bloqueios OK.');
