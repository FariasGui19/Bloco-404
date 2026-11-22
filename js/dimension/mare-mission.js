import {
  cell,
  sites,
  createMission,
  move,
  interact,
  abilities,
} from "./mare-mission-model.js";

// Bounded software renderer: 384x216, no GPU/context requirement or global input hooks retained.
export async function createMareMission({
  state,
  mount,
  exit,
  save = () => {},
  complete = () => {},
}) {
  const m = createMission(state.progress),
    keys = new Set(),
    abort = new AbortController();
  const old = mount.dataset.mission;
  mount.dataset.mission = "true";
  const shell = document.createElement("section");
  shell.className = "mare-mission";
  shell.innerHTML = `<canvas width="384" height="216" tabindex="0" aria-label="Baía infectada em primeira pessoa"></canvas><header><small>MARÉ CROMÁTICA / BAÍA DE QUARENTENA</small><h1>A ÂNCORA NÃO RESPONDE</h1></header><aside aria-live="polite"></aside><footer><p class="mare-readout"></p><p class="mare-message">Recupere 3 memórias nas cabanas. Recompile no terminal central; alcance a âncora a sudeste. Nulo ameaça romper a contenção em 10 minutos.</p><p>WASD mover · ← → / arrastar olhar · E interagir · Q habilidade · ESC retornar sem perdas</p><button data-audio>ÁUDIO: OFF</button><button data-action>INTERAGIR</button><button data-power>HABILIDADE</button><button data-exit>RETORNAR</button></footer><nav aria-label="Movimento"><button data-key="KeyW">↑</button><button data-key="KeyA">←</button><button data-key="KeyS">↓</button><button data-key="KeyD">→</button><button data-key="ArrowLeft">↶</button><button data-key="ArrowRight">↷</button></nav>`;
  mount.append(shell);
  const canvas = shell.querySelector("canvas"),
    ctx = canvas.getContext("2d", { alpha: false }),
    readout = shell.querySelector(".mare-readout"),
    message = shell.querySelector(".mare-message");
  ctx.imageSmoothingEnabled = false;
  const names = [
    "madeira-sal",
    "concreto-mar",
    "porta-ferro",
    "piso-resina",
    "terminal",
    "gravador",
    "residuo",
    "ancora",
    "nulo",
    "infectado",
  ];
  const images = Object.fromEntries(
    await Promise.all(
      names.map(async (n) => {
        const im = new Image();
        im.src = new URL(
          `../../assets/sprites/mare-missao-base/${n}.png`,
          import.meta.url,
        ).href;
        await im.decode();
        return [n, im];
      }),
    ).catch((error) => {
      shell.remove();
      if (old === undefined) delete mount.dataset.mission;
      else mount.dataset.mission = old;
      throw error;
    }),
  );
  let disposed = false,
    t = 0,
    saveClock = 0,
    lastStep = 0,
    endClock = 0,
    drag = false,
    lastX = 0,
    audio = null,
    enabled = false,
    drone = null;
  const enemies = [
    { x: 27, y: 16 },
    { x: 4, y: 17 },
  ];
  let surf = null,
    surfGain = null,
    radioClock = 0;
  function ocean() {
    const buffer = audio.createBuffer(
        1,
        audio.sampleRate * 3,
        audio.sampleRate,
      ),
      data = buffer.getChannelData(0);
    let low = 0;
    for (let i = 0; i < data.length; i++) {
      low = (low + (Math.random() * 2 - 1) * 0.02) / 1.02;
      data[i] = low * 4;
    }
    surf = audio.createBufferSource();
    surf.buffer = buffer;
    surf.loop = true;
    const filter = audio.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 550;
    surfGain = audio.createGain();
    surfGain.gain.value = 0.045;
    surf.connect(filter);
    filter.connect(surfGain);
    surfGain.connect(audio.destination);
    surf.start();
  }
  function tone(f, d = 0.15, v = 0.025, type = "sine") {
    if (!enabled || !audio) return;
    const o = audio.createOscillator(),
      g = audio.createGain();
    o.type = type;
    o.frequency.value = f;
    g.gain.setValueAtTime(v, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + d);
    o.connect(g);
    g.connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + d);
  }
  function action() {
    const near = sites.find((s) => Math.hypot(s.x - m.x, s.y - m.y) < 1.8);
    message.textContent = interact(m, near);
    tone(near ? 180 : 70);
    save();
  }
  function power() {
    if (m.cooldown > 0) return;
    const a = state.progress.archetype;
    m.cooldown = 12 - m.p.rank * 1.5;
    m.ward = 2 + m.p.rank;
    m.stress = Math.max(0, m.stress - (a === "motor_bio_forja" ? 40 : 20));
    if (a === "nucleo_dez_forma")
      for (const e of enemies) {
        const d = Math.hypot(e.x - m.x, e.y - m.y) || 1;
        const probe = { x: e.x, y: e.y };
        move(probe, (e.x - m.x) / d, (e.y - m.y) / d);
        Object.assign(e, probe);
      }
    if (a === "mare_astral")
      shell.querySelector("aside").textContent = sites
        .filter((s) => !m.p.data.includes(s.id))
        .map(
          (s) => `${s.label}: ${Math.round(Math.hypot(s.x - m.x, s.y - m.y))}m`,
        )
        .join(" · ");
    message.textContent = `${abilities[a] ?? "Pulso de identidade"}: ${a === "mare_astral" ? "sinais revelados" : a === "nucleo_dez_forma" ? "perseguidores cegados" : a === "dominio_anciao" ? "barreira ativa" : "biomassa estabilizada"}. Potência local ${m.p.rank}/4.`;
    tone(330, 0.5);
  }
  const listen = (el, event, fn) =>
    el.addEventListener(event, fn, { signal: abort.signal });
  listen(window, "keydown", (e) => {
    if (e.repeat) return;
    if (
      [
        "KeyW",
        "KeyA",
        "KeyS",
        "KeyD",
        "ArrowLeft",
        "ArrowRight",
        "KeyE",
        "KeyQ",
        "Space",
      ].includes(e.code)
    ) {
      e.preventDefault();
      keys.add(e.code);
    }
    if (e.code === "KeyE") action();
    if (e.code === "KeyQ") power();
  });
  listen(window, "keyup", (e) => keys.delete(e.code));
  listen(window, "blur", () => keys.clear());
  listen(canvas, "pointerdown", (e) => {
    drag = true;
    lastX = e.clientX;
    canvas.setPointerCapture(e.pointerId);
    canvas.focus();
  });
  listen(canvas, "pointermove", (e) => {
    if (drag) {
      m.angle += (e.clientX - lastX) * 0.006;
      lastX = e.clientX;
    }
  });
  listen(canvas, "pointerup", () => (drag = false));
  listen(canvas, "pointercancel", () => (drag = false));
  for (const b of shell.querySelectorAll("[data-key]")) {
    listen(b, "pointerdown", (e) => {
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      keys.add(b.dataset.key);
    });
    for (const ev of ["pointerup", "pointercancel", "lostpointercapture"])
      listen(b, ev, () => keys.delete(b.dataset.key));
  }
  shell.querySelector("[data-action]").onclick = action;
  shell.querySelector("[data-power]").onclick = power;
  shell.querySelector("[data-exit]").onclick = exit;
  shell.querySelector("[data-audio]").onclick = async (e) => {
    enabled = !enabled;
    e.target.textContent = `ÁUDIO: ${enabled ? "ON" : "OFF"}`;
    if (enabled) {
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      await audio.resume();
      if (!drone) {
        drone = audio.createOscillator();
        const g = audio.createGain();
        drone.frequency.value = 47;
        g.gain.value = 0.018;
        drone.connect(g);
        g.connect(audio.destination);
        drone.start();
        ocean();
      }
    } else audio?.suspend();
  };
  const depth = new Float32Array(384);
  function render() {
    const sky = ctx.createLinearGradient(0, 0, 0, 135);
    sky.addColorStop(0, "#03070e");
    sky.addColorStop(1, "#38464b");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 384, 216);
    const indoors = [
      [5, 5, 7, 6],
      [19, 5, 7, 7],
      [6, 20, 7, 7],
      [21, 21, 6, 6],
    ].some(
      ([x, y, w, h]) =>
        m.x > x + 1 && m.x < x + w - 1 && m.y > y + 1 && m.y < y + h - 1,
    );
    if (indoors) {
      ctx.fillStyle = "#080a0c";
      ctx.fillRect(0, 0, 384, 108);
      ctx.globalAlpha = 0.12;
      ctx.drawImage(images["madeira-sal"], 0, 0, 384, 108);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = "#111b22";
    ctx.fillRect(0, 108, 384, 108);
    // Wet ground texture with bounded strips; cyan tide ripples animate without allocations.
    ctx.globalAlpha = 0.2;
    ctx.drawImage(images["piso-resina"], 0, 110, 384, 106);
    ctx.globalAlpha = 1;
    for (let y = 124; y < 216; y += 16) {
      ctx.fillStyle = `rgba(30,130,145,${0.04 + 0.02 * Math.sin(t + y)})`;
      ctx.fillRect(Math.sin(t * 0.3 + y) * 12, y, 384, 1);
    }
    for (let x = 0; x < 384; x += 2) {
      const a = m.angle + Math.atan((x / 192 - 1) * 0.72),
        dx = Math.cos(a),
        dy = Math.sin(a);
      let d = 0.02,
        hit = 0;
      let mx = Math.floor(m.x),
        my = Math.floor(m.y);
      const stepX = dx < 0 ? -1 : 1,
        stepY = dy < 0 ? -1 : 1,
        deltaX = Math.abs(1 / dx),
        deltaY = Math.abs(1 / dy);
      let sideX = (dx < 0 ? m.x - mx : mx + 1 - m.x) * deltaX,
        sideY = (dy < 0 ? m.y - my : my + 1 - m.y) * deltaY;
      for (let n = 0; n < 64; n++) {
        if (sideX < sideY) {
          d = sideX;
          sideX += deltaX;
          mx += stepX;
        } else {
          d = sideY;
          sideY += deltaY;
          my += stepY;
        }
        if (d > 26) break;
        hit = cell(mx, my);
        if (hit) break;
      }
      const corrected = d * Math.cos(a - m.angle);
      depth[x] = depth[x + 1] = corrected;
      if (!hit) continue;
      const h = Math.min(800, 190 / corrected),
        wx = m.x + dx * d,
        wy = m.y + dy * d;
      const edgeX = Math.abs(wx - Math.round(wx)),
        edgeY = Math.abs(wy - Math.round(wy));
      const u = edgeX < edgeY ? wy % 1 : wx % 1;
      const im =
        images[
          hit === 1 ? "madeira-sal" : hit === 3 ? "porta-ferro" : "concreto-mar"
        ];
      ctx.drawImage(
        im,
        Math.floor(u * im.width),
        0,
        1,
        im.height,
        x,
        108 - h / 2,
        2,
        h,
      );
      ctx.fillStyle = `rgba(3,8,17,${Math.min(0.94, 0.2 + corrected / 27 + (edgeX < edgeY ? 0.12 : 0))})`;
      ctx.fillRect(x, 108 - h / 2, 2, h);
    }
    const objects = [
      ...sites.filter((s) => !m.p.data.includes(s.id)),
      { x: 16, y: 5, art: "nulo" },
      ...enemies.map((e) => ({ ...e, art: "infectado" })),
    ].sort(
      (a, b) =>
        Math.hypot(b.x - m.x, b.y - m.y) - Math.hypot(a.x - m.x, a.y - m.y),
    );
    for (const o of objects) {
      const dx = o.x - m.x,
        dy = o.y - m.y,
        forward = dx * Math.cos(m.angle) + dy * Math.sin(m.angle),
        side = -dx * Math.sin(m.angle) + dy * Math.cos(m.angle);
      if (forward < 0.25) continue;
      const sx = 192 + (side / forward) * 267,
        h = Math.min(350, 175 / forward),
        im = images[o.art],
        w = (h * im.width) / im.height,
        top =
          108 +
          95 / forward -
          h +
          (o.art === "infectado"
            ? Math.sin(t * 7 + o.x) * Math.min(2, h * 0.025)
            : 0);
      ctx.globalAlpha = Math.max(0.1, 1 - forward / 30);
      for (
        let x = Math.max(0, Math.floor(sx - w / 2));
        x < Math.min(384, sx + w / 2);
        x++
      ) {
        if (forward > depth[x] + 0.2) continue;
        ctx.drawImage(
          im,
          Math.max(
            0,
            Math.min(
              im.width - 1,
              Math.floor(((x - (sx - w / 2)) / w) * im.width),
            ),
          ),
          0,
          1,
          im.height,
          x,
          top,
          1,
          h,
        );
      }
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = "#c0e7da";
    ctx.fillRect(190, 108, 4, 1);
    ctx.fillRect(192, 106, 1, 4);
    if (m.stress > 50) {
      ctx.fillStyle = `rgba(160,10,70,${Math.min(0.23, m.stress / 500)})`;
      ctx.fillRect(0, 0, 384, 216);
    }
    if (
      !matchMedia("(prefers-reduced-motion: reduce)").matches &&
      m.p.elapsed > 90 &&
      Math.sin(t * 2) > 0.992
    ) {
      ctx.fillStyle = "#72cabc30";
      ctx.fillRect(0, (t * 39) % 216, 384, 3);
    }
  }
  return {
    mission: m,
    frame(dt, { mode }) {
      if (disposed) return;
      dt = Math.max(0, Math.min(dt, 0.05));
      t += dt;
      if (mode === "3d" && !m.finished) {
        m.p.elapsed += dt;
        m.cooldown = Math.max(0, m.cooldown - dt);
        m.ward = Math.max(0, m.ward - dt);
        m.angle +=
          ((keys.has("ArrowRight") ? 1 : 0) - (keys.has("ArrowLeft") ? 1 : 0)) *
          dt *
          1.9;
        const f = Number(keys.has("KeyW")) - Number(keys.has("KeyS")),
          s = Number(keys.has("KeyD")) - Number(keys.has("KeyA")),
          norm = Math.max(1, Math.hypot(f, s)),
          speed = 2.2 + m.p.rank * 0.12;
        const gain = 1 - Math.exp(-dt * 7);
        m.vx +=
          (((Math.cos(m.angle) * f - Math.sin(m.angle) * s) * speed) / norm -
            m.vx) *
          gain;
        m.vy +=
          (((Math.sin(m.angle) * f + Math.cos(m.angle) * s) * speed) / norm -
            m.vy) *
          gain;
        move(m, m.vx * dt, m.vy * dt);
        m.idle = f || s ? 0 : m.idle + dt;
        if (m.p.elapsed > 60)
          for (const e of enemies) {
            const d = Math.hypot(m.x - e.x, m.y - e.y);
            if (d > 0.8 && m.ward <= 0) {
              const v = (m.idle > 12 ? 0.9 : 0.45) * dt;
              const probe = { x: e.x, y: e.y };
              move(probe, ((m.x - e.x) / d) * v, ((m.y - e.y) / d) * v);
              e.x = probe.x;
              e.y = probe.y;
            }
            if (d < 1.3 && m.ward <= 0) m.stress += dt * 12;
          }
        if (m.stress >= 100) {
          m.x = 16;
          m.y = 19;
          m.stress = 25;
          message.textContent =
            "NEXO recuperou seu eco no terminal. Nenhum dado ou item perdido.";
          tone(65, 0.7);
        }
        if (Math.hypot(m.vx, m.vy) > 0.4 && t - lastStep > 0.55) {
          lastStep = t;
          tone(55, 0.08, 0.018, "triangle");
        }
        if (m.p.elapsed >= 600) {
          m.finished = true;
          message.textContent =
            "NULO: dez minutos. A âncora foi desviada. A culpa não é o fim: encontre o Hub além do plano.";
        }
        if ((saveClock += dt) > 5) {
          saveClock = 0;
          save();
        }
      }
      if (enabled && audio) {
        if (surfGain)
          surfGain.gain.setTargetAtTime(
            0.045 + Math.sin(t * 0.5) * 0.014 + m.stress / 4000,
            audio.currentTime,
            0.3,
          );
        if (drone)
          drone.frequency.setTargetAtTime(
            47 + Math.min(30, m.p.elapsed / 20) + m.stress * 0.1,
            audio.currentTime,
            0.4,
          );
        if ((radioClock += dt) > (m.p.elapsed > 90 ? 4 : 12)) {
          radioClock = 0;
          tone(85 + m.stress * 3, 0.22, 0.012, "sawtooth");
        }
      }
      if (m.finished && mode === "3d") {
        endClock += dt;
        if (endClock > 4) {
          m.p.completed = true;
          save();
          complete();
          exit();
        }
      }
      readout.textContent = `DESCOMPASSO LOCAL ${m.p.rank}/4 · DADOS ${m.p.data.length}/3 · ${Math.max(0, 600 - Math.floor(m.p.elapsed))}s · TENSÃO ${Math.round(m.stress)} · Q ${Math.ceil(m.cooldown)}s`;
      const near = sites.find((s) => Math.hypot(s.x - m.x, s.y - m.y) < 1.8);
      shell.querySelector("aside").textContent = near
        ? `E · ${near.label}`
        : m.ward > 0
          ? state.progress.archetype === "mare_astral"
            ? sites
                .filter((s) => !m.p.data.includes(s.id))
                .map(
                  (s) =>
                    `${s.label}: ${Math.round(Math.hypot(s.x - m.x, s.y - m.y))}m`,
                )
                .join(" · ")
            : "HABILIDADE ATIVA"
          : m.idle > 12
            ? "NULO: eu sei onde você espera."
            : "";
      render();
    },
    dispose() {
      disposed = true;
      abort.abort();
      keys.clear();
      drone?.stop();
      surf?.stop();
      audio?.close().catch(() => {});
      save();
      shell.remove();
      if (old === undefined) delete mount.dataset.mission;
      else mount.dataset.mission = old;
    },
  };
}
