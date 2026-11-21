// Adapter to existing archetype IDs and form rules. No map gates, damage to 2D
// enemies or new progression: Limiar remains an exploration sandbox.
import { ARCHETYPE_KITS } from "../data/archetype-kits.js";
import { NUCLEO_FORMS, getSelectedNucleoForm } from "../data/nucleo-forms.js";
import {
  toggleNucleoForm,
  updateNucleoForm,
  chargeFormHit,
} from "../game/nucleo-form.js";
import { isToolAvailable } from "../game/tools.js";
import { getTool } from "../data/archetype-tools.js";
import {
  getBioDashProfile,
  toggleArchetypeSuit,
} from "../game/ability-context.js";
const PROFILES = {
  bio_dash: {
    name: "PROPULSOR DE IMPULSO",
    cost: 28,
    cooldown: 1.25,
    duration: 0.55,
    boost: true,
  },
  bio_diagnostic: {
    name: "LINK DE DIAGNÓSTICO",
    cost: 8,
    cooldown: 2,
    duration: 0.8,
  },
  forma_veloz: {
    name: "PULSO VELOZ",
    cost: 26,
    cooldown: 1.4,
    duration: 0.5,
    boost: true,
  },
  pancada_quebra: {
    name: "PANCADA DE PESO",
    cost: 24,
    cooldown: 1.4,
    duration: 0.7,
  },
  eco_scan: { name: "LEITURA DE ECO", cost: 8, cooldown: 2, duration: 0.8 },
  golpe_ruptura: {
    name: "GOLPE DE RUPTURA",
    cost: 24,
    cooldown: 1.4,
    duration: 0.55,
  },
  postura_dominio: {
    name: "LEITURA DE FREQUÊNCIA",
    cost: 8,
    cooldown: 2,
    duration: 0.8,
  },
  passo_corrente: {
    name: "PASSO DE CORRENTE",
    cost: 24,
    cooldown: 1.3,
    duration: 0.55,
    boost: true,
  },
  senso_corrente: {
    name: "SENSO DE CORRENTE",
    cost: 8,
    cooldown: 2,
    duration: 0.8,
  },
};
export function createOperatorActions(state, notify = () => {}) {
  let selected = null,
    sequence = 0;
  const action = { remaining: 0, duration: 1, id: null };
  const available = () =>
    Object.values(NUCLEO_FORMS).filter((f) =>
      isToolAvailable(
        state.progress,
        getTool("nucleo_dez_forma", f.toolId),
        "nucleo_dez_forma",
      ),
    );
  function select() {
    if (state.progress.archetype !== "nucleo_dez_forma") {
      notify("R · SELETOR DO BRACELETE X10");
      return;
    }
    const forms = available();
    selected =
      forms[(forms.findIndex((f) => f.id === selected) + 1) % forms.length]
        ?.id ?? null;
    if (action.remaining <= 0 || action.id === "select")
      Object.assign(action, {
        id: "select",
        duration: 0.55,
        remaining: 0.55,
        selected,
      });
    notify(
      `BRACELETE · ${NUCLEO_FORMS[selected]?.name ?? "SEM FORMA"} · T ATIVAR/RETORNAR`,
    );
  }
  function transform() {
    const { progress, player } = state;
    const previous = player.nucleoForm ?? null;
    const returning = !!(previous || player.equippedSuit);
    const ok =
      progress.archetype === "nucleo_dez_forma"
        ? toggleNucleoForm(progress, player, selected)
        : toggleArchetypeSuit(progress, player);
    if (ok)
      Object.assign(action, {
        id: "transform",
        returning,
        from: previous,
        to: player.nucleoForm ?? null,
        duration: 1.05,
        remaining: 1.05,
      });
    notify(
      ok
        ? "SISTEMA DE TRAJE / TRANSFORMAÇÃO ACIONADO"
        : "TRANSFORMAÇÃO INDISPONÍVEL · CONFIRA HABILIDADE, NÍVEL OU RECARGA",
    );
    return ok;
  }
  function trigger(slot, c) {
    const { progress, player } = state,
      kit = ARCHETYPE_KITS[progress.archetype];
    if (!kit) return false;
    const id =
      slot !== "secondary"
        ? progress.archetype === "nucleo_dez_forma" &&
          player.nucleoForm === "forma_bruta"
          ? "pancada_quebra"
          : kit.q
        : kit.r;
    if (
      !progress.abilities?.includes(id) &&
      !(id === "pancada_quebra" && progress.abilities?.includes("forma_veloz"))
    ) {
      notify("HABILIDADE AINDA NÃO DISPONÍVEL NO SEU KIT");
      return false;
    }
    player.ability ??= { cooldowns: {} };
    player.ability.cooldowns ??= {};
    const p =
      id === "bio_dash"
        ? {
            ...PROFILES[id],
            cost: getBioDashProfile(progress, player).energyCost,
          }
        : PROFILES[id];
    if (
      (action.remaining > 0 && action.id !== "select") ||
      (player.ability.cooldowns[id] ?? 0) > 0
    ) {
      notify("HABILIDADE RECARREGANDO");
      return false;
    }
    if ((player.energy ?? 0) < p.cost) {
      notify("ENERGIA INSUFICIENTE");
      return false;
    }
    player.energy -= p.cost;
    player.ability.cooldowns[id] = p.cooldown;
    const variant =
      slot === "signature" ? 2 : slot === "primary" ? sequence++ % 2 : 0;
    Object.assign(action, {
      id,
      variant,
      duration: p.duration,
      remaining: p.duration,
    });
    if (p.boost && !c.boating) c.actionBoost = 0.22;
    if (id === "pancada_quebra") chargeFormHit(player);
    notify(`${p.name} · ${p.boost ? "IMPULSO" : "RESPOSTA VISUAL"} 3D`);
    return true;
  }
  return {
    action,
    reset() {
      selected = null;
      sequence = 0;
      for (const key of Object.keys(action)) delete action[key];
      Object.assign(action, { remaining: 0, duration: 1, id: null });
    },
    available,
    select,
    transform,
    trigger,
    get selected() {
      return selected;
    },
    update(dt) {
      const p = state.player;
      action.remaining = Math.max(0, action.remaining - dt);
      if (p.ability?.cooldowns)
        for (const id of Object.keys(p.ability.cooldowns))
          p.ability.cooldowns[id] = Math.max(0, p.ability.cooldowns[id] - dt);
      // The normal 2D ability updater is paused by DimensionManager. Advance its
      // existing transform effect here so the shared native form timer can run.
      if (p.ability?.effect) {
        p.ability.effect.timeLeft = Math.max(0, p.ability.effect.timeLeft - dt);
        if (p.ability.effect.timeLeft <= 0) p.ability.effect = null;
      }
      const before = p.nucleoForm;
      updateNucleoForm(state.progress, p, dt, true);
      if (before !== p.nucleoForm)
        Object.assign(action, {
          id: "transform",
          duration: 1.05,
          remaining: 1.05,
          returning: true,
          from: before,
          to: p.nucleoForm ?? null,
        });
    },
    label() {
      const p = state.player;
      if (state.progress.archetype !== "nucleo_dez_forma")
        return `J COMBO · K LEITURA · L ESPECIAL · T ${p.equippedSuit ? "RECOLHER" : "ACIONAR"} TRAJE`;
      return `${NUCLEO_FORMS[p.nucleoForm]?.name ?? "OPERADOR BASE"} · SELEÇÃO ${NUCLEO_FORMS[selected]?.name ?? getSelectedNucleoForm(state.progress)?.name ?? "CÓDEX"} · J COMBO / K LEITURA / L ESPECIAL · R SELECIONAR · T ${p.nucleoForm ? "RETORNAR" : "TRANSFORMAR"}`;
    },
  };
}
