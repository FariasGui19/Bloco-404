import { createRuptureBridge, RUPTURE_ID, requestRupture, canRequestRupture } from "./rupture.js";
import { MARE_MISSION } from './mare-mission-model.js';
import { DimensionManager } from "./dimension-manager.js";
import { ensureHealth } from "../game/health.js";

export function initDimensionModule({
  state,
  clearInput,
  canEnter,
  save,
  canvas,
  developerTools = false,
}) {
  const style = document.createElement("link");
  style.rel = "stylesheet";
  style.href = new URL("../../css/dimension.css", import.meta.url).href;
  document.head.append(style);
  const entry = document.createElement("button");
  entry.id = "dimension-entry";
  entry.type = "button";
  entry.hidden = true;
  entry.textContent = "◇ 3D // SETOR LIMIAR";
  entry.title = "Sandbox dimensional opcional. Não substitui o mapa 2D.";
  document.body.append(entry);
  const root = document.createElement("section");
  root.id = "dimension-root";
  root.hidden = true;
  root.setAttribute("aria-label", "Setor Limiar — evolução dimensional");
  root.innerHTML = `<div class="dimension-viewport"></div><div class="dimension-scanlines" aria-hidden="true"></div>
 <header class="dimension-header"><div class="dimension-brand">BLOCO <b>404</b> <span>EVOLUÇÃO DIMENSIONAL / 01</span></div><div class="dimension-heading">N · 000° · S</div><button class="dimension-exit" type="button">ESC · VOLTAR AO 2D</button></header>
 <div class="dimension-title"><span>ARQUIPÉLAGO DAS ROTAS PERDIDAS</span><h1>SETOR LIMIAR</h1><p>Além do plano. A mesma consciência.</p></div>
 <aside class="dimension-status"><img class="dimension-portrait" alt="Retrato do operador" width="66" height="66" src="/assets/sprites/operador/operador-neutro.png"><div class="dimension-status-text"><span class="dimension-label">OPERADOR / ECO ATIVO</span><strong class="dimension-suit"></strong><span class="dimension-level"></span><div class="dimension-rule"></div><span class="dimension-vitals"></span><span class="dimension-flight"></span><small class="dimension-performance"></small></div></aside>
 <aside class="dimension-navigation"><canvas class="dimension-map" width="144" height="144" aria-label="Minimapa: A âncora, F farol, R ruínas, P píer, O anel; operador branco"></canvas><div class="dimension-landmark-list" aria-label="Marcos do setor"></div></aside>
 <div class="dimension-rupture" role="status"><small>FREQUÊNCIA 66.6 // DESCOMPRESSÃO</small><strong>CONTENÇÃO DIMENSIONAL ROMPIDA</strong><span>ESPAÇO TRIDIMENSIONAL DESBLOQUEADO</span></div>
 <div class="dimension-objective"><span>OBJETIVO EXPERIMENTAL</span><p class="dimension-notice" aria-live="polite">Alcance o Núcleo de Âncora no cume. O plano isométrico era uma contenção para estabilizar a consciência do operador.</p></div>
 <div class="dimension-prompt"></div>
 <footer class="dimension-footer"><div><b>WASD</b> mover &nbsp; <b>ARRASTAR MOUSE</b> orbitar &nbsp; <b>RODA</b> zoom &nbsp; <b>ESPAÇO</b> pular &nbsp; <b>SHIFT</b> impulso/turbo &nbsp; <b>Q</b> mirar âncora<br><span class="dimension-capability"></span><br><span class="dimension-actions"></span></div><div class="dimension-settings"><button class="dimension-sound" type="button" aria-pressed="false">ÁUDIO: OFF</button><label>RESOLUÇÃO <select class="dimension-quality"><option value="0.6">RETRÔ 60%</option><option value="0.85" selected>EQUILÍBRIO 85%</option><option value="1">NATIVA</option></select></label></div></footer>
 <nav class="dimension-touch" aria-label="Controles de toque"><div><button data-spatial-key="KeyW">↑</button><button data-spatial-key="KeyA">←</button><button data-spatial-key="KeyS">↓</button><button data-spatial-key="KeyD">→</button></div><div><button data-spatial-key="Space">SUBIR</button><button data-spatial-key="ControlLeft">DESCER</button><button data-spatial-key="KeyF">VOO</button><button data-spatial-key="ShiftLeft">TURBO</button><button data-spatial-key="KeyE">AÇÃO</button></div></nav><nav class="dimension-combat-touch" aria-label="Habilidades e transformação"><button data-spatial-key="KeyJ">J · AÇÃO</button><button data-spatial-key="KeyK">K · LEITURA</button><button data-spatial-key="KeyL">L · ESPECIAL</button><button data-spatial-key="KeyT">T · ATIVAR</button><button data-spatial-key="KeyR">R · FORMA</button></nav>`;
  document.body.append(root);
  const error = document.createElement("p");
  error.id = "dimension-error";
  error.hidden = true;
  error.setAttribute("role", "alert");
  document.body.append(error);
  let audio = null,
    audioEnabled = false,
    focusBefore = null;
  function sound(kind) {
    if (!audioEnabled) return;
    try {
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      audio.resume().catch(() => {});
      const now = audio.currentTime;
      for (let i = 0; i < 3; i++) {
        const oscillator = audio.createOscillator(),
          gain = audio.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(
          (kind === "rupture" ? 110 : 220) * [1, 1.5, 2][i],
          now,
        );
        oscillator.frequency.exponentialRampToValueAtTime(
          (kind === "rupture" ? 440 : 660) * [1, 1.25, 1.5][i],
          now + 1,
        );
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.035, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start(now);
        oscillator.stop(now + 1.5);
      }
    } catch {
      /* Silent mode is always a valid fallback. */
    }
  }
  root.querySelector(".dimension-sound").onclick = (e) => {
    audioEnabled = !audioEnabled;
    e.currentTarget.setAttribute("aria-pressed", String(audioEnabled));
    e.currentTarget.textContent = audioEnabled ? "ÁUDIO: ON" : "ÁUDIO: OFF";
    if (audioEnabled) sound("rupture");
    else audio?.suspend().catch(() => {});
  };
  const manager = new DimensionManager({
    state,
    clearInput,
    canEnter,
    createWorld: async (options) => {
      if (options.reason === MARE_MISSION) {
        const { createMareMission } = await import('./mare-mission.js');
        return createMareMission({ ...options, mount: root, save,
          complete: () => { requestRupture(state); save(); },
        });
      }
      const { createSpatialWorld } = await import("./runtime.js");
      ensureHealth(state.player, state.progress);
      root.dataset.narrative = String(options.reason === RUPTURE_ID);
      root.querySelector(".dimension-rupture span").textContent =
        options.reason === RUPTURE_ID
          ? "INTERFERÊNCIA DO OPERADOR NULO · MEMÓRIA E RETORNO PRESERVADOS"
          : "ESPAÇO TRIDIMENSIONAL DESBLOQUEADO";
      return createSpatialWorld({
        ...options,
        mount: root,
        sourceCanvas: canvas,
        sound,
        developerTools,
        onAnchor: () => save(),
      });
    },
    changed: (m) => {
      root.hidden = !m.active;
      entry.disabled = m.active;
      root.dataset.mode = m.mode;
      document.body.classList.toggle("dimension-active", m.active);
      document.body.classList.toggle(
        "dimension-entering",
        m.mode === "entering",
      );
      if (m.mode === "loading") {
        focusBefore = document.activeElement;
        error.hidden = true;
        root.querySelector(".dimension-rupture strong").textContent =
          "DESCOMPRIMINDO O SETOR LIMIAR";
      }
      if (m.mode === "entering") {
        root.querySelector(".dimension-rupture strong").textContent =
          "CONTENÇÃO DIMENSIONAL ROMPIDA";
        sound("rupture");
      }
      if (m.mode === "3d") {
        root
          .querySelector(".dimension-viewport canvas")
          ?.focus({ preventScroll: true });
      }
      if (m.mode === "2d") {
        if (m.error) {
          error.textContent = m.error;
          error.hidden = false;
        }
        focusBefore?.focus?.({ preventScroll: true });
        audio?.suspend().catch(() => {});
      }
    },
  });
  const rupture = createRuptureBridge({
    state,
    manager,
    save,
    emit: (detail) =>
      window.dispatchEvent(
        new CustomEvent("bloco404:rupture-phase", { detail }),
      ),
  });
  entry.onclick = () => manager.enter({ reason: "sandbox" });
  root.querySelector(".dimension-exit").onclick = () => manager.exit();
  // Public debug/event entry point: eligibility and transactional guards still apply.
  window.addEventListener("bloco404:rupture", () =>
    manager.enter({ reason: "rupture-event" }),
  );
  window.addEventListener(
    "keydown",
    (e) => {
      if (manager.active && e.code === "Escape") {
        e.preventDefault();
        manager.exit();
      }
    },
    { capture: true },
  );
  window.__dimension404 = manager;
  return {
    manager,
    tickRupture: () => {
      if (state.progress.mareMissionRequested && !manager.active && manager.canEnter() && canRequestRupture(state)) {
        state.progress.mareMissionRequested = false;
        save();
        manager.enter({ reason: MARE_MISSION });
      }
      rupture.tick();
    },
    setAvailable(available) {
      entry.hidden = !available;
    },
  };
}
