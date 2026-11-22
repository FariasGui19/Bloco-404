import assert from "node:assert/strict";
import { docas } from "../js/data/worlds/arquipelago-rotas-perdidas/docas-neblina.js";
import { lerMareCromatica, concluirIncursaoLegado } from "../js/game/mare-cromatica.js";
import { getSave, loadSaveIntoState } from "../js/game/save.js";
import { state } from "../js/game/state.js";

const records = new Map();
globalThis.localStorage = {
  getItem: (key) => records.get(key) ?? null,
  setItem: (key, value) => records.set(key, value),
};
const make = (version, archetype, mapId, flags = { docas_neblina_alcancada: true }) => ({
  version,
  meta: { profileName: "OPERADOR MARÉ", createdAt: "2026-01-01T00:00:00.000Z" },
  player: { facing: "left" },
  progress: {
    archetype,
    abilities: ["passo_corrente", "eco_scan"],
    inventory: ["fragmento", "chave_docas"],
    health: 77,
    flags: { ...flags },
  },
  world: { lastMapId: mapId, lastSpawnId: "inicio" },
});

// Save v1 do Maré parado nas Docas: incursão concluída uma única vez.
const legacy = make(1, "mare_astral", "mare_cromatica_docas");
records.set("BLOCO404_SAVE_SLOT_1", JSON.stringify(legacy));
const migrated = getSave(1);
const data = lerMareCromatica(migrated.progress);
assert.equal(migrated.version, 2);
assert.equal(data.iniciada, true);
assert.equal(data.desfecho, "total");
assert.equal(data.ancoraEstavel, true);
assert.equal(data.estacaoAberta, true);
assert.equal(data.sincronizacao, 4);
assert.deepEqual(data.fragmentos, ["costa", "acampamento", "estacao"]);
assert.deepEqual(data.fitas, ["casa", "vigilia"]);
assert.deepEqual(data.paineis, ["origem", "retorno", "memoria"]);
assert.equal(migrated.progress.flags.docas_chave, true);
assert.equal(migrated.progress.flags.docas_fusivel, true);
assert.equal(migrated.progress.flags.cromatica_ancora_estavel, true);
assert.equal(migrated.progress.flags.docas_incursao_concluida_v2, true);
assert.deepEqual(migrated.progress.inventory, legacy.progress.inventory);
assert.equal(migrated.progress.archetype, "mare_astral");
assert.deepEqual(JSON.parse(records.get("BLOCO404_SAVE_SLOT_1")), legacy, "read must not overwrite the legacy save");
// Idempotente e preserva identidade/vida/inventário no estado.
assert.equal(getSave(1).progress.flags.docas_incursao_concluida_v2, true);
loadSaveIntoState(1);
assert.equal(state.progress.archetype, "mare_astral");
assert.deepEqual(state.progress.inventory, ["fragmento", "chave_docas"]);
assert.equal(state.progress.health, 77);
assert.equal(state.world.currentMapId, "mare_cromatica_docas");
// O portal de eco está nas Docas e já aceita a bandeira recém-gravada.
const portal = docas.portals.find((p) => p.id === "docas_portal_fenda");
assert.ok(portal, "portal de eco exists");
assert.equal(portal.destino.mapId, "mare_cromatica_fenda");
assert.equal(portal.requiresFlag, "cromatica_ancora_estavel");
assert.equal(state.progress.flags[portal.requiresFlag], true);
assert.equal(docas.portals.length, 4);

// Save v2 (novo) não recebe o atalho e continua a incursão normal.
records.set("BLOCO404_SAVE_SLOT_2", JSON.stringify(make(2, "mare_astral", "mare_cromatica_docas")));
const fresh = getSave(2);
assert.equal(lerMareCromatica(fresh.progress).desfecho, null);
assert.equal(fresh.progress.flags.docas_incursao_concluida_v2, undefined);
assert.equal(fresh.version, 2);
// Outros mapas/arquétipos também não são afetados.
records.set("BLOCO404_SAVE_SLOT_3", JSON.stringify(make(1, "mare_astral", "mare_cromatica_cabana_oeste")));
assert.equal(lerMareCromatica(getSave(3).progress).desfecho, null, "only the Docas exterior is retrofitted");
records.set("BLOCO404_SAVE_SLOT_4", JSON.stringify(make(1, "nucleo_dez_forma", "mare_cromatica_docas")));
assert.equal(lerMareCromatica(getSave(4).progress).desfecho, null);
assert.equal(concluirIncursaoLegado({ archetype: "mare_astral", flags: {} }), false);
console.log("Legado Docas: v1 Maré migra para incursão total, preserva identidade/inventário e libera o portal de eco; v2/outros mapas intactos.");
