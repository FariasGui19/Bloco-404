// =====================================================================
// HUD — a Ultimate do Núcleo espera a transformação
//
// A HUD foi aprovada pelo jogador e não pode regredir: com o Núcleo
// destransformado ela precisa dizer "TRANSFORME-SE · T", não "F · custo".
// =====================================================================
import assert from 'node:assert/strict';

// Stub de DOM suficiente para initHud/updateHud (ver histórico de armadilhas:
// sem style.setProperty, classList e createElement a HUD explode).
const nodes = new Map();
const makeElement = () => ({
  textContent: '', innerHTML: '', src: '',
  dataset: {},
  style: { width: '', setProperty() {}, removeProperty() {} },
  classList: {
    list: new Set(),
    add(nome) { this.list.add(nome); },
    remove(nome) { this.list.delete(nome); },
    toggle(nome, on) { if (on === undefined) { this.list.has(nome) ? this.list.delete(nome) : this.list.add(nome); } else if (on) this.list.add(nome); else this.list.delete(nome); return this.list.has(nome); },
    contains(nome) { return this.list.has(nome); },
  },
  addEventListener() {}, setAttribute() {}, focus() {},
  querySelector: () => null, querySelectorAll: () => [],
  appendChild() {}, remove() {},
});

globalThis.document = {
  getElementById(id) {
    if (!nodes.has(id)) nodes.set(id, makeElement());
    return nodes.get(id);
  },
  createElement: () => makeElement(),
  body: { appendChild() {} },
};
globalThis.performance ??= { now: () => 0 };

const { initHud, updateHud } = await import('../js/ui/hud.js');
const { ensureArchetypeProgress } = await import('../js/game/progression.js');
const { getArchetypeAbilities } = await import('../js/game/abilities.js');
const { toggleNucleoForm } = await import('../js/game/nucleo-form.js');

initHud();

const progress = {
  archetype: 'nucleo_dez_forma',
  archetypeProgress: {},
  abilities: getArchetypeAbilities('nucleo_dez_forma'),
  tools: { nucleo_dez_forma: 'nucleo_veloz' },
  flags: {},
  inventory: [],
};
ensureArchetypeProgress(progress, 'nucleo_dez_forma');
progress.archetypeProgress.nucleo_dez_forma.level = 3;

const player = {
  x: 0, y: 0, facing: 'down',
  health: 100, maxHealth: 100,
  energy: 100, maxEnergy: 100,
  ability: { cooldowns: {} },
  nucleoForm: null,
  ultimate: undefined,
};

const map = { id: 'ilha_enseada_ecos', meta: { nome: 'ENSEADA' } };
const state = { player, progress, actors: [], objects: [], interaction: { active: null }, fps: 60 };

updateHud(map, state);
const card = nodes.get('abilityUltimate');
assert(card.classList.contains('visible'), 'cartão da Ultimate aparece no nível 3');
assert.equal(nodes.get('ultimateState').textContent, 'TRANSFORME-SE · T', 'HUD pede a transformação');
assert(card.classList.contains('needs-form'), 'estado visual próprio');
assert(!card.classList.contains('ready'), 'não anuncia pronta');
assert.equal(nodes.get('ultimateName').textContent.length > 3, true, 'nome da Ultimate continua visível');

// Transformado: volta ao estado normal de custo/energia.
assert(toggleNucleoForm(progress, player));
updateHud(map, state);
assert(!card.classList.contains('needs-form'), 'transformado dispensa o aviso');
assert(card.classList.contains('ready'), 'pronta com forma ativa');
assert.match(nodes.get('ultimateState').textContent, /F · 48 ENERGIA|RECARREGANDO/);

// Custo alto: com energia baixa a HUD avisa quanto falta, sem quebrar.
player.energy = 10;
player.nucleoForm = 'forma_veloz';
updateHud(map, state);
assert.match(nodes.get('ultimateState').textContent, /FALTA \d+ ENERGIA/);

// Outro arquétipo não herda o aviso de forma.
const bio = { ...progress, archetype: 'motor_bio_forja', archetypeProgress: {}, abilities: getArchetypeAbilities('motor_bio_forja'), tools: {} };
ensureArchetypeProgress(bio, 'motor_bio_forja');
bio.archetypeProgress.motor_bio_forja.level = 3;
const bioPlayer = { ...player, energy: 100, nucleoForm: null, ultimate: undefined, ability: { cooldowns: {} } };
updateHud(map, { ...state, progress: bio, player: bioPlayer });
assert(!card.classList.contains('needs-form'), 'Bio-Forja não pede forma');
assert(!/TRANSFORME-SE/.test(nodes.get('ultimateState').textContent));

console.log('HUD: Ultimate do Núcleo espera a forma e não regride no restante OK.');
