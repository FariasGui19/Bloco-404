import assert from "node:assert/strict";
import {
  createMasterMorpher,
  MORPHER_ARCHETYPES,
} from "../js/dimension/master-morpher.js";
import { createOperatorActions } from "../js/dimension/operator-actions.js";
import { getArchetypeLevel, MAX_LEVEL } from "../js/game/rpg.js";
import { getTools } from "../js/data/archetype-tools.js";
import { isToolAvailable } from "../js/game/tools.js";
import { IMPLEMENTED_ABILITIES } from "../js/data/archetype-kits.js";
const original = {
  world: { currentMapId: "vila" },
  player: {
    x: 12,
    y: 34,
    energy: 67,
    maxEnergy: 100,
    health: 81,
    maxHealth: 120,
    ability: { cooldowns: { eco_scan: 1.5 } },
  },
  progress: {
    archetype: "nucleo_dez_forma",
    abilities: ["forma_veloz", "eco_scan"],
    archetypeProgress: { nucleo_dez_forma: { level: 1, xp: 13 } },
    inventory: [{ id: "relic", count: 2 }],
    flags: { existing: true, morfador_de_ressonancia: true },
    tools: {},
  },
};
const facade = { ...original },
  before = JSON.stringify(original);
const a = createOperatorActions(facade),
  m = createMasterMorpher(facade, () => a.reset());
assert(!m.active);
assert(!m.selectArchetype("mare_astral"));
assert(!m.setAppearance("forma_bruta"));
m.enable();
assert(m.active);
assert.notEqual(facade.player, original.player);
assert.notEqual(facade.progress, original.progress);
assert.equal(facade.world, original.world);
assert(
  IMPLEMENTED_ABILITIES.every((id) => facade.progress.abilities.includes(id)),
);
for (const archetype of Object.keys(MORPHER_ARCHETYPES)) {
  assert(m.selectArchetype(archetype));
  assert.equal(getArchetypeLevel(facade.progress), MAX_LEVEL);
  for (const tool of getTools(archetype).filter((t) => t.playable !== false)) {
    assert(isToolAvailable(facade.progress, tool));
    assert(m.selectTool(tool.id));
  }
  assert(m.selectTool(""));
  assert.equal(m.tool, "");
  if (archetype !== "nucleo_dez_forma") {
    assert.equal(m.appearance, "suit");
    assert(m.setAppearance("civilian"));
    assert(!facade.player.equippedSuit);
    assert(m.setAppearance("suit"));
  }
}
m.selectArchetype("nucleo_dez_forma");
assert.equal(a.available().length, 2);
assert(m.setAppearance("forma_bruta"));
assert.equal(facade.player.nucleoForm, "forma_bruta");
assert.equal(facade.player.nucleoFormSuit, "nucleo_bruto");
facade.player.energy = 0;
facade.player.nucleoRuntime.remaining = 1;
facade.player.nucleoRuntime.recharge = 8;
facade.player.ability.cooldowns.eco_scan = 5;
m.update();
assert.equal(facade.player.energy, 100);
assert(facade.player.nucleoRuntime.remaining > 1);
assert.equal(facade.player.ability.cooldowns.eco_scan, 0);
m.setFree(false);
facade.player.energy = 9;
m.update();
assert.equal(facade.player.energy, 9);
facade.progress.flags.dimensionalAnchorStabilized = true;
facade.progress.inventory[0].count = 999;
assert(!m.selectArchetype("invalid"));
assert(!m.setAppearance("invalid"));
assert(!m.selectTool("invalid"));
assert.equal(
  JSON.stringify(original),
  before,
  "autosaves see untouched normal state throughout creative",
);
m.disable();
assert.equal(facade.player, original.player);
assert.equal(facade.progress, original.progress);
assert.equal(a.available().length, 1);
assert.equal(JSON.stringify(original), before);
m.enable();
assert(!facade.progress.flags.dimensionalAnchorStabilized);
m.dispose();
m.dispose();
assert.equal(JSON.stringify(original), before);
assert.equal(facade.player, original.player);
console.log(
  "Master morpher: isolated level-20 kits/tools/forms, free resources optional, invalid selections, exact reference restoration, repeat/dispose and normal gating preserved OK.",
);

const normal = {
  player: {},
  progress: { archetype: "nucleo_dez_forma", flags: {} },
};
const denied = createMasterMorpher(normal);
denied.enable();
assert(!denied.active);
assert(!denied.authorized);
const lab = createMasterMorpher(normal, () => {}, { laboratory: true });
lab.enable();
assert(lab.active);
lab.dispose();
