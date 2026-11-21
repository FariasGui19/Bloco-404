import { autorizado } from "../game/morfador.js";
import {
  ARCHETYPE_KITS,
  IMPLEMENTED_ABILITIES,
} from "../data/archetype-kits.js";
import { getTools } from "../data/archetype-tools.js";
import { NUCLEO_FORMS, getFormDuration } from "../data/nucleo-forms.js";
import { MAX_LEVEL, getDerivedStats } from "../game/rpg.js";
import { ensureHealth } from "../game/health.js";
import { toggleNucleoForm } from "../game/nucleo-form.js";

export const MORPHER_ARCHETYPES = Object.freeze({
  nucleo_dez_forma: "Núcleo X10",
  lamina_dominio_anciao: "Domínio Ancião",
  motor_bio_forja: "Motor Bio-Forja",
  mare_astral: "Maré Astral",
});
const SUITS = {
  lamina_dominio_anciao: "dominio",
  motor_bio_forja: "bio_forja",
  mare_astral: "mare",
};

// Receives a runtime-only facade, NEVER the application state object.
// Detaches player/progress while creative is active; autosaves still see originals.
export function createMasterMorpher(
  session,
  changed = () => {},
  { laboratory = false } = {},
) {
  let original = null,
    free = true;
  const authorized = () =>
    laboratory || autorizado(original?.progress ?? session.progress);
  const valid = (id) => Object.hasOwn(ARCHETYPE_KITS, id);
  function clearTransient() {
    Object.assign(session.player, {
      equippedSuit: null,
      nucleoForm: null,
      nucleoFormSuit: null,
      nucleoRuntime: null,
      ability: { cooldowns: {} },
      ultimate: null,
      combat: null,
    });
  }
  function refill() {
    if (!original) return;
    const p = session.player;
    ensureHealth(p, session.progress);
    p.health = p.maxHealth;
    p.energy = p.maxEnergy ?? 100;
    if (p.ability?.cooldowns)
      for (const id of Object.keys(p.ability.cooldowns))
        p.ability.cooldowns[id] = 0;
    if (p.nucleoRuntime) {
      p.nucleoRuntime.recharge = 0;
      const form = NUCLEO_FORMS[p.nucleoForm];
      if (form)
        p.nucleoRuntime.remaining = getFormDuration(
          form,
          getDerivedStats(session.progress, p)?.formDuration ?? 0,
        );
    }
  }
  function selectArchetype(id) {
    if (!original || !authorized() || !valid(id)) return false;
    clearTransient();
    session.progress.archetype = id;
    session.player.equippedSuit = SUITS[id] ?? null;
    ensureHealth(session.player, session.progress);
    refill();
    changed();
    return true;
  }
  return {
    get authorized() {
      return authorized();
    },
    get active() {
      return !!original;
    },
    get free() {
      return free;
    },
    get archetype() {
      return session.progress.archetype;
    },
    get appearance() {
      return (
        session.player.nucleoForm ??
        (session.player.equippedSuit ? "suit" : "civilian")
      );
    },
    get tool() {
      return session.progress.tools?.[session.progress.archetype] ?? "";
    },
    enable() {
      if (original || !authorized()) return false;
      // Complete both copies before changing references: clone failure is safe.
      const progress = structuredClone(session.progress),
        player = structuredClone(session.player);
      original = { progress: session.progress, player: session.player };
      session.progress = progress;
      session.player = player;
      progress.abilities = [
        ...new Set([
          ...(progress.abilities ?? []),
          ...IMPLEMENTED_ABILITIES,
          ...Object.values(ARCHETYPE_KITS).flatMap((kit) =>
            Object.values(kit).filter(Boolean),
          ),
        ]),
      ];
      progress.archetypeProgress ??= {};
      progress.tools ??= {};
      for (const id of Object.keys(ARCHETYPE_KITS))
        progress.archetypeProgress[id] = {
          ...progress.archetypeProgress[id],
          level: MAX_LEVEL,
          xp: 0,
        };
      selectArchetype(
        valid(progress.archetype) ? progress.archetype : "nucleo_dez_forma",
      );
    },
    disable() {
      if (!original) return;
      session.progress = original.progress;
      session.player = original.player;
      original = null;
      changed();
    },
    selectArchetype,
    setAppearance(value) {
      if (!original || !authorized()) return false;
      const id = session.progress.archetype;
      if (
        ![
          "civilian",
          "suit",
          ...(id === "nucleo_dez_forma" ? Object.keys(NUCLEO_FORMS) : []),
        ].includes(value)
      )
        return false;
      clearTransient();
      if (id === "nucleo_dez_forma" && NUCLEO_FORMS[value]) {
        session.progress.tools[id] = NUCLEO_FORMS[value].toolId;
        toggleNucleoForm(session.progress, session.player, value);
      } else if (value === "suit")
        session.player.equippedSuit = SUITS[id] ?? null;
      refill();
      changed();
      return true;
    },
    selectTool(id) {
      if (original && authorized() && id === "") {
        delete session.progress.tools[session.progress.archetype];
        changed();
        return true;
      }
      if (
        !original ||
        !authorized() ||
        !getTools(session.progress.archetype).some(
          (t) => t.id === id && t.playable !== false,
        )
      )
        return false;
      session.progress.tools[session.progress.archetype] = id;
      changed();
      return true;
    },
    setFree(value) {
      free = !!value;
      if (free) refill();
      changed();
    },
    refill,
    update() {
      if (original && !authorized()) this.disable();
      if (original && free) refill();
    },
    dispose() {
      this.disable();
    },
  };
}
