import { MORPHER_ARCHETYPES } from "./master-morpher.js";
import { getTools } from "../data/archetype-tools.js";
import { NUCLEO_FORMS } from "../data/nucleo-forms.js";

export function createMasterMorpherPanel(mount, morpher) {
  const panel = document.createElement("details");
  panel.className = "dimension-morpher";
  panel.dataset.dimensionDev = "";
  panel.innerHTML = `<summary>DEV · MORFADOR MESTRE <b>OFF</b></summary><div class="morpher-body"><label><input type="checkbox" data-morph-enable> Ativar modo criativo (temporário)</label><p class="morpher-warning">SEM SAVE · desbloqueios somente nesta sessão 3D.</p><label>Arquétipo<select data-morph-archetype></select></label><label>Corpo / traje<select data-morph-appearance></select></label><label>Ferramenta / forma selecionada<select data-morph-tool></select></label><label><input type="checkbox" data-morph-free> Energia, recarga e duração livres</label><button type="button" data-morph-refill>REABASTECER / ZERAR RECARGAS</button><small>Nível 20 e habilidades desbloqueadas no estado de teste. J/K/L/T/R continuam sendo as ações implementadas no 3D; isto não cria habilidades ainda ausentes. Desativar ou voltar ao 2D descarta o teste.</small></div>`;
  mount.append(panel);
  const el = (s) => panel.querySelector(s),
    events = new AbortController();
  const on = (selector, type, callback) =>
    el(selector).addEventListener(type, callback, { signal: events.signal });
  const options = (select, items, value) => {
    select.replaceChildren(...items.map(([id, name]) => new Option(name, id)));
    select.value = value;
  };
  options(
    el("[data-morph-archetype]"),
    Object.entries(MORPHER_ARCHETYPES),
    morpher.archetype,
  );
  on("[data-morph-enable]", "change", (e) =>
    e.target.checked ? morpher.enable() : morpher.disable(),
  );
  on("[data-morph-archetype]", "change", (e) =>
    morpher.selectArchetype(e.target.value),
  );
  on("[data-morph-appearance]", "change", (e) =>
    morpher.setAppearance(e.target.value),
  );
  on("[data-morph-tool]", "change", (e) => morpher.selectTool(e.target.value));
  on("[data-morph-free]", "change", (e) => morpher.setFree(e.target.checked));
  on("[data-morph-refill]", "click", () => morpher.refill());
  let lastState = "";
  function update() {
    const current = [
      morpher.authorized,
      morpher.active,
      morpher.archetype,
      morpher.appearance,
      morpher.tool,
      morpher.free,
    ].join(":");
    if (current === lastState) return;
    lastState = current;
    panel.hidden = !morpher.authorized;
    panel.classList.toggle("creative", morpher.active);
    panel.querySelector("summary b").textContent = morpher.active
      ? "CRIATIVO · SEM SAVE"
      : "OFF";
    el("[data-morph-enable]").checked = morpher.active;
    for (const control of panel.querySelectorAll(
      "select,button,[data-morph-free]",
    ))
      control.disabled = !morpher.active;
    el("[data-morph-archetype]").value = morpher.archetype;
    const forms = morpher.archetype === "nucleo_dez_forma";
    options(
      el("[data-morph-appearance]"),
      forms
        ? [
            ["civilian", "Operador civil"],
            ...Object.values(NUCLEO_FORMS).map((f) => [f.id, f.name]),
          ]
        : [
            ["civilian", "Roupa civil"],
            ["suit", "Traje equipado"],
          ],
      morpher.appearance,
    );
    options(
      el("[data-morph-tool]"),
      [
        ["", "Padrão do arquétipo"],
        ...getTools(morpher.archetype)
          .filter((t) => t.playable !== false)
          .map((t) => [t.id, t.name]),
      ],
      morpher.tool,
    );
    el("[data-morph-free]").checked = morpher.free;
  }
  update();
  return {
    update,
    toggle() {
      if (morpher.authorized) panel.open = !panel.open;
    },
    dispose() {
      events.abort();
      panel.remove();
    },
  };
}
