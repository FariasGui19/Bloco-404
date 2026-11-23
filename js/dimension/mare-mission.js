import {details,nearestSignal,useDetail,terrain,createPursuit,enemyArt,hurtEnemy,visible} from './mare-mission-life.js';
import {lore as loreProps,useLore} from './mare-mission-lore.js';
import {combatProps,isInteractiveCombat,useCombatProp} from './mare-mission-combat.js';
import {lote5Props,isInteractiveLote5,lote5Complete,lote5Readout,useLote5} from './mare-mission-lote5.js';
import {lote6Props,isInteractiveLote6,lote6Readout,nuloEntity,nuloReportLine,objectiveLine,useLote6,useNulo,fendaOpen} from './mare-mission-lote6.js';
import {lote7Decor,lote7Props,isInteractiveLote7,lampOn,lote7Readout,useLote7} from './mare-mission-lote7.js';
import {createMareWorld3D} from './mare-mission-world3d.js';
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
  shell.innerHTML = `<canvas width="384" height="216" tabindex="0" aria-label="Baía de quarentena em primeira pessoa"></canvas><div class="mare-frame" aria-hidden="true"></div>
<header class="mare-hud">
  <div class="mare-brand"><span class="mare-rec" aria-hidden="true"></span><div><small>MARÉ CROMÁTICA <i>// BAÍA DE QUARENTENA</i></small><h1>A ÂNCORA NÃO RESPONDE</h1></div></div>
  <div class="mare-compass" aria-label="Bússola"><span class="mare-heading">N</span><div class="mare-compass-track"><i></i><b></b><i></i></div><span class="mare-bearing">000°</span></div>
  <div class="mare-signal"><small>SINAL</small><div class="mare-signal-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></div><b class="mare-signal-text">FRACO</b></div>
</header>
<aside aria-live="polite"></aside>
<nav class="mare-move" aria-label="Movimento"><button data-key="KeyW" aria-label="Frente">W</button><button data-key="KeyA" aria-label="Esquerda">A</button><button data-key="KeyS" aria-label="Trás">S</button><button data-key="KeyD" aria-label="Direita">D</button><button data-key="ShiftLeft">CORRER</button><button data-key="KeyC">AGACHAR</button></nav>
<nav class="mare-look" aria-label="Câmera"><button data-key="ArrowUp" aria-label="Olhar para cima">▲</button><button data-key="ArrowLeft" aria-label="Olhar à esquerda">◀</button><button data-key="ArrowDown" aria-label="Olhar para baixo">▼</button><button data-key="ArrowRight" aria-label="Olhar à direita">▶</button></nav>
<footer class="mare-hud-foot">
  <div class="mare-objective-row"><span>OBJETIVO</span><p class="mare-objective"></p></div>
  <div class="mare-vitals">
    <div class="mare-vital"><small>TENSÃO</small><div class="mare-meter"><i class="mare-tension"></i></div><b class="mare-tension-value">0</b></div>
    <div class="mare-vital"><small>FÔLEGO</small><div class="mare-meter"><i class="mare-stamina"></i></div></div>
    <div class="mare-vital"><small>LANTERNA</small><b class="mare-torch">ON</b></div>
    <div class="mare-vital"><small>TEMPO</small><b class="mare-clock">10:00</b></div>
    <div class="mare-vital"><small>RUÍDO</small><b class="mare-noise">QUIETO</b></div>
  </div>
  <p class="mare-message">Recupere 3 memórias nas cabanas. Recompile no terminal central e alcance a âncora a sudeste.</p>
  <div class="mare-controls">
    <button data-audio>ÁUDIO: OFF</button><button data-action><b>E</b> INTERAGIR</button><button data-power><b>Q</b> PULSO</button><button data-attack><b>F</b> GOLPE</button><button data-map><b>M</b> MAPA</button><button data-exit>SAIR</button>
    <label class="mare-volume">VOL <input data-volume type="range" min="0" max="100" value="55" aria-label="Volume da missão"></label>
  </div>
  <p class="mare-readout"></p>
  <p class="mare-keys">WASD mover · mouse/arrastar olhar · E interagir · F golpe · Q pulso · SHIFT correr · C agachar · M mapa · ESC sair</p>
</footer>`;
  mount.append(shell);
  const canvas = shell.querySelector("canvas"),
    ctx = canvas.getContext("2d", { alpha: false }),
    readout = shell.querySelector(".mare-readout"),
    objective = shell.querySelector(".mare-objective"),
    message = shell.querySelector(".mare-message");
  ctx.imageSmoothingEnabled = false;
  const extraNames = ["retrato","radio","gerador","boia","armario","rede","sino","valvula","infectado-preparo","infectado-golpe"];
  const lote3Names = ["diario-faroleiro","lente-farol","mapa-evacuacao","maca-quarentena","prontuario-quarentena","caixa-sinal","infectado-busca","infectado-escuta","infectado-atordoado","infectado-erguendo"];
  const lote4Names = ["infectado-golpe-baixo","infectado-golpe-alto","infectado-dano","infectado-dissolvido","casulo-mare","eco-operador","painel-contencao","cabo-energia","lanterna-sinal","porta-fenda"];
  const lote5Names = ["caldeira-sala","tubo-vapor","cristal-mare","valvula-pressao","painel-recompilacao","selo-recompilado","guardiao-mare","guardiao-dano","porta-recompilacao","piso-metal"];
  const lote6Names = ["nulo-operador","nulo-operador-voz","cacador-mare","cacador-dano","parede-azulejo","parede-ferrugem","chao-grade","turbina-sala","escada-servico","transicao-fenda"];
  const lote7Names = ["parede-concreto-umido","parede-azulejo-quebrado","chao-concreto-umido","chao-agua-rasa","teto-metal-escuro","portal-mare","porta-pesada","lampada-industrial","afogado-mare","afogado-dano"];
  const upgradeNames = ["terminal-baia","cristal-magenta","farol-lanterna"];
  const artDir = (n) => upgradeNames.includes(n) ? "mare-upgrade" : lote7Names.includes(n) ? "mare-missao-lote7" : lote6Names.includes(n) ? "mare-missao-lote6" : lote5Names.includes(n) ? "mare-missao-lote5" : lote4Names.includes(n) ? "mare-missao-lote4" : lote3Names.includes(n) ? "mare-missao-lote3" : extraNames.includes(n) ? "mare-missao-lote2" : "mare-missao-base";
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
      [...names,...extraNames,...lote3Names,...lote4Names,...lote5Names,...lote6Names,...lote7Names,...upgradeNames].map(async (n) => {
        const im = new Image();
        im.src = new URL(
          `../../assets/sprites/${artDir(n)}/${n}.png`,
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
  // Two opaque 64x64 tiles are sampled into a 192x108 floor layer. The
  // half-resolution buffer keeps the perspective cast cheap and reads as
  // deliberately chunky next to the 384x216 walls.
  const floorLayer = document.createElement("canvas");
  floorLayer.width = 192;
  floorLayer.height = 108;
  const floorCtx = floorLayer.getContext("2d");
  const floorImage = floorCtx.createImageData(192, 108);
  function tileData(name) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d");
    g.drawImage(images[name], 0, 0, 64, 64);
    return g.getImageData(0, 0, 64, 64).data;
  }
  const floorTiles = { base: tileData("chao-concreto-umido"), water: tileData("chao-agua-rasa") };
  const hud = {
    heading: shell.querySelector(".mare-heading"),
    bearing: shell.querySelector(".mare-bearing"),
    signalText: shell.querySelector(".mare-signal-text"),
    signalBars: [...shell.querySelectorAll(".mare-signal-bars i")],
    tension: shell.querySelector(".mare-tension"),
    tensionValue: shell.querySelector(".mare-tension-value"),
    stamina: shell.querySelector(".mare-stamina"),
    torch: shell.querySelector(".mare-torch"),
    clock: shell.querySelector(".mare-clock"),
    noise: shell.querySelector(".mare-noise"),
    rec: shell.querySelector(".mare-rec"),
  };
  // A cena 3D é construída uma vez. Se o WebGL falhar, o raycaster legado
  // continua como plano B e a missão nunca fica sem imagem.
  const worldProps = [
    ...sites,
    ...details,
    ...loreProps,
    ...combatProps,
    ...lote5Props,
    ...lote6Props,
    ...lote7Props,
    ...lote7Decor.map((d) => ({ ...d, decor: true })),
  ];
  const world3d = await createMareWorld3D({
    images,
    props: worldProps,
    onFear: ({ kind, x, z }) => {
      if (!enabled) return;
      const dx = x - m.x, dy = z - m.y, dist = Math.hypot(dx, dy) || 1;
      const pan = Math.max(-1, Math.min(1, (-dx * Math.sin(m.angle) + dy * Math.cos(m.angle)) / dist));
      if (kind === "silhouette") {
        tone(58, 1.6, 0.018, "sine");
        noiseBurst(0.45, 0.008, 900, pan);
        tone(176, 0.5, 0.007, "triangle");
      } else {
        tone(92, 0.8, 0.02, "sawtooth");
        noiseBurst(0.22, 0.012, 2400, -pan);
      }
    },
  }).catch(() => ({ available: false }));
  m.pitch ??= 0;
  m.lookVel = 0;
  let disposed = false,
    t = 0,
    saveClock = 0,
    lastStep = 0,
    lastRank = m.p.rank,
    endClock = 0,
    drag = false,
    lastX = 0,
    lastY = 0,
    lookVel = 0,
    pitchVel = 0,
    mapOpen = false,
    audio = null,
    enabled = false,
    drone = null, master=null, activeFrame=false, beatClock=0, beat=0, breathClock=0, shake=0, intro=2.0, pulse=0, hurtFlash=0, hazardClock=0, attackClock=0, swing=0, frameDt=1/60;
  const pursuit=createPursuit(), motion=matchMedia("(prefers-reduced-motion: reduce)"), aside=shell.querySelector("aside");
  const hazardProp=combatProps.find(p=>p.kind==="hazard"), lightProp=combatProps.find(p=>p.kind==="light");
  const enemies = [
    { x: 27, y: 16, hunter: true },
    { x: 4, y: 17, guardian: true },
  ];
  let surf = null,
    surfGain = null,
    hiss = null,
    noiseBuffer = null,
    radioClock = 0,
    enemyClock = 0,
    lampClock = 0,
    portalClock = 0,
    dripClock = 0,
    creakClock = 0,
    staticClock = 0;
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
    surfGain.connect(master);
    surf.start();
  }
  function tone(f, d = 0.15, v = 0.025, type = "sine") {
    if (!enabled || !audio || !master) return;
    const o = audio.createOscillator(),
      g = audio.createGain();
    o.type = type;
    o.frequency.value = f;
    g.gain.setValueAtTime(v, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + d);
    o.connect(g);
    g.connect(master);
    o.start();
    o.stop(audio.currentTime + d);
  }
  function ensureNoise() {
    if (!noiseBuffer && audio) {
      noiseBuffer = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
      const d = noiseBuffer.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
  }
  function noiseBurst(duration = 0.1, volume = 0.01, cutoff = 700, pan = 0) {
    if (!enabled || !audio || !master) return;
    const buffer = ensureNoise();
    if (!buffer) return;
    const src = audio.createBufferSource(), gain = audio.createGain(), filter = audio.createBiquadFilter(), panner = audio.createStereoPanner();
    src.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
    src.connect(filter); filter.connect(gain); gain.connect(panner); panner.connect(master);
    src.start(); src.stop(audio.currentTime + duration);
  }
  const signals = () => [
    ...sites.filter((s) => !m.p.data.includes(s.id)),
    ...details.filter((d) => !m.p.details[d.id] || d.id === "radio" || d.id === "sino"),
    ...loreProps.filter((d) => !m.p.lore.includes(d.id)),
    ...combatProps.filter(isInteractiveCombat),
    ...lote5Props.filter(isInteractiveLote5),
    ...lote6Props.filter(isInteractiveLote6),
    ...lote7Props.filter(isInteractiveLote7),
    nuloEntity(m, t),
  ];
  function action() {
    if(m.finished)return;
    const near = nearestSignal(m,signals());
    const beforeLore = m.p.lore.length;
    const machine = isInteractiveLote5(near) ? useLote5(m, near)
      : isInteractiveLote6(near) ? useLote6(m, near)
      : isInteractiveLote7(near) ? useLote7(m, near)
      : near?.kind === 'nulo' ? useNulo(m, near) : null;
    message.textContent = machine ?? (near && loreProps.includes(near)
      ? useLore(m, near)
      : near && details.includes(near) ? useDetail(m, near)
      : isInteractiveCombat(near) ? useCombatProp(m, near, enemies)
      : interact(m, near));
    if (loreProps.includes(near) && m.p.lore.length > beforeLore) {
      if (m.p.lore.length === 4) message.textContent += ' NULO: “O farol reconhece você.”';
      if (m.p.lore.length === 6) message.textContent += ' NULO: “Agora você também ouve o sino.”';
    }
    if(near?.id==="sino") {tone(440,2,.045);tone(659,1.4,.015);}
    if(near?.id==="valvula")tone(110,.8,.03,"sawtooth");
    if(near?.id==="gerador")tone(45,1,.04,"triangle");
    if(loreProps.includes(near))tone(near.id==="lente"?740:520,.5,.02,"sine");
    if(near?.kind==="hazard")tone(90,1.1,.04,"sawtooth");
    if(near?.kind==="light")tone(660,.25,.025,"square");
    if(near?.kind==="mirror")tone(240,.8,.02,"sine");
    if(near?.kind==="panel")tone(420,.18,.02,"square");
    if(near?.kind==="lote5-valve"){tone(52,.9,.045,"sawtooth");tone(190,.22,.025,"square");}
    if(near?.art==="tubo-vapor")tone(118,.45,.016,"sine");
    if(near?.kind==="lote5-seal"){tone(440,.8,.03,"sine");tone(660,.55,.018,"triangle");}
    if(near?.kind==="lote5-panel")tone(360,.16,.02,"square");
    if(near?.kind==="lote5-lore")tone(720,.4,.015,"sine");
    if(near?.kind==="lote6-turbine"){tone(64,.8,.035,"sawtooth");tone(310,.5,.018,"triangle");}
    if(near?.kind==="lote6-rift"){tone(660,.9,.025,"sine");tone(110,.6,.02,"sawtooth");}
    if(near?.kind==="lote6-stairs")tone(150,.22,.014,"triangle");
    if(near?.kind==="nulo"){tone(95,.45,.02,"sine");tone(190,.2,.01,"square");}
    if(near?.kind==="lote7-lamp"){tone(140,.16,.018,"square");tone(280,.08,.008,"sawtooth");}
    tone(near ? 180 : 70);
    save();
  }
  function attack() {
    if (m.finished || attackClock > 0) return;
    attackClock = .55;
    swing = .18;
    let hits = 0;
    for (const e of enemies) {
      if (e.dead || e.phase === "dissolve") continue;
      if (Math.hypot(e.x - m.x, e.y - m.y) > 2.0 || !visible(e, m)) continue;
      if (hurtEnemy(e, 1)) hits++;
    }
    if (hits) {
      tone(340, .16, .03, "square");
      tone(180, .22, .02, "triangle");
      shake = Math.max(shake, .14);
      message.textContent = "GOLPE CURTO — a resina cede. O casulo ainda vai reformá-la em 30s.";
    } else {
      tone(150, .1, .015, "triangle");
      message.textContent = "O golpe corta apenas a névoa. Aproxime-se ou use o pulso Q.";
    }
  }
  function power() {
    if (m.finished || m.cooldown > 0) return;
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
    const radius=3.2+m.p.rank*.35, hits=[];
    for(const e of enemies){
      if(e.dead||e.phase==="dissolve")continue;
      if(Math.hypot(e.x-m.x,e.y-m.y)>radius||!visible(e,m))continue;
      const result=hurtEnemy(e,a==="motor_bio_forja"?2:1);
      if(result)hits.push(result);
    }
    m.pulse=.6;
    if(hits.length){tone(520,.35,.03,"square");tone(260,.5,.02,"triangle");shake=.18;}
    message.textContent = `${abilities[a] ?? "Pulso de identidade"}: ${a === "mare_astral" ? "sinais revelados" : a === "nucleo_dez_forma" ? "perseguidores cegados" : a === "dominio_anciao" ? "barreira ativa" : "biomassa estabilizada"}. Potência local ${m.p.rank}/4.`;
    if(hits.includes("defeated"))message.textContent+=" Uma forma se dissolveu; o casulo vai chamá-la de volta em 30s.";
    else if(hits.length)message.textContent+=" O pulso queimou a resina.";
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
        "ArrowUp",
        "ArrowDown",
        "KeyE",
        "KeyQ",
        "Space", "ShiftLeft", "ShiftRight", "KeyC", "KeyM",
      ].includes(e.code)
    ) {
      e.preventDefault();
      keys.add(e.code);
    }
    if (e.code === "KeyE") action();
    if (e.code === "KeyQ") power();
    if (e.code === "KeyF") attack();
    if (e.code === "KeyM") mapOpen = !mapOpen;
  });
  listen(window, "keyup", (e) => keys.delete(e.code));
  listen(window, "blur", () => keys.clear());
  listen(canvas, "pointerdown", (e) => {
    drag = true;
    lastX = e.clientX;
    lastY = e.clientY;
    try { canvas.setPointerCapture(e.pointerId); } catch { /* ponteiro sintético */ }
    canvas.focus();
    canvas.requestPointerLock?.();
  });
  listen(canvas, "pointermove", (e) => {
    if (drag && !document.pointerLockElement) {
      m.angle += (e.clientX - lastX) * 0.005;
      m.pitch = Math.max(-0.92, Math.min(0.92, m.pitch - (e.clientY - lastY) * 0.0035));
      lastX = e.clientX;
      lastY = e.clientY;
    }
  });
  listen(document, "mousemove", (e) => {
    if (document.pointerLockElement === canvas && !mapOpen) {
      m.angle += (e.movementX || 0) * 0.0022;
      m.pitch = Math.max(-0.92, Math.min(0.92, m.pitch - (e.movementY || 0) * 0.0022));
    }
  });
  listen(canvas, "pointerup", () => (drag = false));
  listen(canvas, "pointercancel", () => (drag = false));
  listen(shell.querySelector("[data-map]"), "click", () => (mapOpen = !mapOpen));
  for (const b of shell.querySelectorAll("[data-key]")) {
    listen(b, "pointerdown", (e) => {
      e.preventDefault();
      try { b.setPointerCapture(e.pointerId); } catch { /* ponteiro sintético */ }
      keys.add(b.dataset.key);
    });
    for (const ev of ["pointerup", "pointercancel", "lostpointercapture"])
      listen(b, ev, () => keys.delete(b.dataset.key));
  }
  shell.querySelector("[data-action]").onclick = action;
  shell.querySelector("[data-power]").onclick = power;
  shell.querySelector("[data-attack]").onclick = attack;
  shell.querySelector("[data-exit]").onclick = exit;
  shell.querySelector("[data-volume]").oninput=e=>{if(master)master.gain.value=Number(e.target.value)/100;};
  shell.querySelector("[data-audio]").onclick = async (e) => {
    try {
    enabled = !enabled;
    e.target.textContent = `ÁUDIO: ${enabled ? "ON" : "OFF"}`;
    if (enabled) {
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      if(!master){master=audio.createGain();master.gain.value=Number(shell.querySelector("[data-volume]").value)/100;const limiter=audio.createDynamicsCompressor();limiter.threshold.value=-18;limiter.ratio.value=8;master.connect(limiter);limiter.connect(audio.destination);}
      await audio.resume();
      if (!drone) {
        drone = audio.createOscillator();
        const g = audio.createGain();
        drone.frequency.value = 47;
        g.gain.value = 0.018;
        drone.connect(g);
        g.connect(master);
        drone.start();
        ocean();
        if (!hiss) {
          hiss = audio.createBufferSource();
          hiss.buffer = ensureNoise();
          hiss.loop = true;
          const hg = audio.createGain(), hf = audio.createBiquadFilter();
          hg.gain.value = 0.006;
          hf.type = "highpass";
          hf.frequency.value = 1400;
          hiss.connect(hf); hf.connect(hg); hg.connect(master);
          hiss.start();
        }
      }
    } else audio?.suspend();
    } catch {enabled=false;e.target.textContent="ÁUDIO: INDISPONÍVEL";}
  };
  const depth = new Float32Array(384);
  function drawMap() {
    const ox = 68, oy = 44, size = 4.5;
    ctx.fillStyle = "rgba(5,9,8,.94)";
    ctx.fillRect(42, 26, 300, 166);
    ctx.strokeStyle = "rgba(161,205,181,.65)";
    ctx.strokeRect(42.5, 26.5, 299, 165);
    ctx.fillStyle = "#b8d8c4";
    ctx.font = "8px monospace";
    ctx.fillText("MAPA TÁTICO // BAÍA DE QUARENTENA", 55, 40);
    ctx.fillStyle = "rgba(15,30,26,.92)";
    ctx.fillRect(ox - 2, oy - 2, 32 * size + 4, 32 * size + 4);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const c = cell(x + .5, y + .5);
      if (c) {
        ctx.fillStyle = c === 1 ? "rgba(122,137,118,.78)" : c === 3 ? "rgba(184,126,70,.9)" : "rgba(76,91,82,.75)";
        ctx.fillRect(ox + x * size, oy + y * size, size, size);
      } else {
        ctx.fillStyle = "rgba(111,188,166,.055)";
        ctx.fillRect(ox + x * size, oy + y * size, 1, 1);
      }
    }
    for (const s of sites) {
      if (m.p.data.includes(s.id) && s.id !== "terminal" && s.id !== "ancora") continue;
      ctx.fillStyle = s.id === "ancora" ? "#e4a8ff" : s.id === "terminal" ? "#71efe0" : "#ffd28a";
      ctx.fillRect(ox + s.x * size - 1.5, oy + s.y * size - 1.5, 3, 3);
    }
    const n = nuloEntity(m, t);
    ctx.fillStyle = "#f0e5ca";
    ctx.fillRect(ox + n.x * size - 1, oy + n.y * size - 1, 2, 2);
    const px = ox + m.x * size, py = oy + m.y * size;
    ctx.fillStyle = "#d9fff1";
    ctx.beginPath();
    ctx.moveTo(px + Math.cos(m.angle) * 5, py + Math.sin(m.angle) * 5);
    ctx.lineTo(px + Math.cos(m.angle + 2.5) * 3, py + Math.sin(m.angle + 2.5) * 3);
    ctx.lineTo(px + Math.cos(m.angle - 2.5) * 3, py + Math.sin(m.angle - 2.5) * 3);
    ctx.closePath();
    ctx.fill();
    ctx.font = "7px monospace";
    ctx.fillStyle = "#ffd28a";
    ctx.fillText("● MEMÓRIA", 222, 52);
    ctx.fillStyle = "#71efe0";
    ctx.fillText("● TERMINAL", 222, 63);
    ctx.fillStyle = "#e4a8ff";
    ctx.fillText("● ÂNCORA", 222, 74);
    ctx.fillStyle = "#f0e5ca";
    ctx.fillText("● NULO", 222, 85);
    ctx.fillStyle = "#9bbdb6";
    ctx.fillText("M FECHA", 222, 178);
  }
  function renderLegacy() {
    ctx.save();
    if(shake>0&&!motion.matches)ctx.translate(Math.round(Math.sin(t*73)*shake*10),Math.round(Math.cos(t*59)*shake*6));
    if(!motion.matches&&m.noise>0)ctx.translate(0,Math.round(Math.sin(t*(m.noise>.8?12:7.5))*m.noise*1.6));
    const fov = 0.72 + (m.noise > 0.8 ? 0.035 : 0) + (motion.matches ? 0 : Math.sin(t * 0.9) * 0.006);
    const eye=(m.crouched?65:95)+(!motion.matches&&m.noise>0?Math.sin(t*(m.noise>.8?13:9))*1.2:0);
    const sky = ctx.createLinearGradient(0, 0, 0, 135);
    sky.addColorStop(0, "#020508");
    sky.addColorStop(0.62, "#16201f");
    sky.addColorStop(1, "#4c584c");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 384, 216);
    // Low overcast and a smudged sodium glow on the water line: the bay keeps
    // its horizon, but it reads as weather and industry, not a night skybox.
    for (let i = 0; i < 6; i++) {
      const yy = 54 + i * 9;
      ctx.fillStyle = `rgba(24,33,31,${0.18 - i * 0.018})`;
      ctx.fillRect(0, yy, 384, 7 + i * 2);
    }
    const sodium = ctx.createLinearGradient(0, 92, 0, 122);
    sodium.addColorStop(0, "rgba(143,101,52,0)");
    sodium.addColorStop(0.55, "rgba(143,101,52,.16)");
    sodium.addColorStop(1, "rgba(143,101,52,0)");
    ctx.fillStyle = sodium;
    ctx.fillRect(0, 92, 384, 30);
    {
      const offset = -((m.angle / (Math.PI * 2)) % 1) * 760;
      const shapes = [
        [30, 96, 62, 16, 0.9], [104, 88, 38, 24, 0.8], [150, 98, 84, 14, 0.7],
        [246, 92, 34, 20, 0.85], [292, 100, 70, 12, 0.65], [374, 90, 48, 20, 0.8],
        [432, 98, 78, 14, 0.7], [522, 94, 56, 18, 0.85], [590, 100, 82, 12, 0.6],
        [684, 92, 44, 20, 0.8],
      ];
      for (let pass = 0; pass < 3; pass++) {
        ctx.save();
        ctx.translate(offset + pass * 760, 0);
        ctx.fillStyle = "#08100f";
        for (const [x, y, w, h, a] of shapes) {
          ctx.globalAlpha = a;
          ctx.fillRect(x, y, w, h);
          if (w > 55) for (let wx = x + 5; wx < x + w - 4; wx += 13) {
            ctx.fillStyle = "rgba(196,152,84,.32)";
            ctx.fillRect(wx, y + 5, 2, 2);
            ctx.fillStyle = "#08100f";
          }
        }
        // crane over the container yard
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = "#060c0c";
        ctx.fillRect(196, 48, 3, 52);
        ctx.fillRect(120, 52, 82, 2);
        ctx.fillRect(196, 54, 2, 26);
        ctx.fillRect(126, 54, 1, 16);
        // far lighthouse and its slow sweep
        ctx.fillRect(478, 62, 5, 38);
        ctx.fillRect(476, 58, 9, 5);
        const beam = ctx.createRadialGradient(480, 58, 2, 480, 58, 44);
        beam.addColorStop(0, "rgba(255,213,138,.22)");
        beam.addColorStop(1, "rgba(255,213,138,0)");
        ctx.fillStyle = beam;
        ctx.fillRect(436, 14, 88, 88);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(72,96,84,.14)";
      ctx.fillRect(0, 101, 384, 18);
    }
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
      ctx.globalAlpha = 0.5;
      for (let y = 0; y < 108; y += 54) for (let x = 0; x < 384; x += 96) ctx.drawImage(images["teto-metal-escuro"], x, y, 96, 54);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(3,7,8,.58)";
      ctx.fillRect(0, 0, 384, 108);
    }
    ctx.fillStyle = "#111b22";
    ctx.fillRect(0, 108, 384, 108);
    {
      const data = floorImage.data;
      for (let y = 0; y < 108; y++) {
        const distance = Math.max(0.55, 88 / (y + 1));
        const fog = Math.min(0.78, distance / 24);
        const rowShade = Math.max(0.26, 0.98 - distance / 22);
        for (let x = 0; x < 192; x++) {
          const a = m.angle + Math.atan(((x + 0.5) / 96 - 1) * fov);
          const wx = m.x + Math.cos(a) * distance, wy = m.y + Math.sin(a) * distance;
          const tx = ((wx * 32) | 0) & 63, ty = ((wy * 32) | 0) & 63;
          const src = (ty * 64 + tx) * 4, out = (y * 192 + x) * 4;
          const wet = Math.sin(wx * 1.7 + wy * 2.3) + Math.sin(wx * 4.1 - wy * 1.3) > 1.18;
          const tile = wet ? floorTiles.water : floorTiles.base;
          const ripple = wet && !motion.matches ? 1.12 + 0.08 * Math.sin(t * 1.8 + wx * 3) : 1;
          const shade = rowShade * ripple;
          const warm = indoors ? 1.14 : 1.02;
          data[out] = tile[src] * shade * warm * (1 - fog) + 8 * fog;
          data[out + 1] = tile[src + 1] * shade * (1 - fog) + 13 * fog;
          data[out + 2] = tile[src + 2] * shade * (1 - fog) + 17 * fog;
          data[out + 3] = 255;
        }
      }
      floorCtx.putImageData(floorImage, 0, 0);
      ctx.drawImage(floorLayer, 0, 108, 384, 108);
      if (indoors) { ctx.globalAlpha = 0.08; ctx.drawImage(images["piso-metal"], 0, 108, 384, 108); }
      ctx.globalAlpha = 0.1;
      ctx.drawImage(images["piso-resina"], 0, 110, 384, 106);
      ctx.globalAlpha = 1;
    }
    for (let y = 124; y < 216; y += 16) {
      ctx.fillStyle = `rgba(30,130,145,${0.04 + 0.02 * Math.sin(t + y)})`;
      ctx.fillRect(Math.sin(t * 0.3 + y) * 12, y, 384, 1);
    }
    for (let x = 0; x < 384; x += 2) {
      const a = m.angle + Math.atan((x / 192 - 1) * fov),
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
      const h = Math.min(980, 300 / corrected),
        wx = m.x + dx * d,
        wy = m.y + dy * d;
      const edgeX = Math.abs(wx - Math.round(wx)),
        edgeY = Math.abs(wy - Math.round(wy));
      const u = edgeX < edgeY ? wy % 1 : wx % 1;
      const im =
        images[
          hit === 1 ? "parede-azulejo-quebrado" : hit === 3 ? "porta-pesada" : "parede-concreto-umido"
        ];
      const wallTop = 108 - (300-eye) / corrected;
      ctx.drawImage(
        im,
        Math.floor(u * im.width),
        0,
        1,
        im.height,
        x,
        wallTop,
        2,
        h,
      );
      // A single lit rim, a warm volumetric band and a dark baseboard make the
      // new materials read as built walls instead of repeating stripes.
      const lit = Math.max(0.025, 0.14 - corrected / 70);
      ctx.fillStyle = `rgba(209,166,112,${lit * (edgeX < edgeY ? 0.62 : 1)})`;
      ctx.fillRect(x, wallTop + h * 0.16, 2, h * 0.46);
      ctx.fillStyle = `rgba(133,221,205,${Math.max(0.035, 0.12 - corrected / 90)})`;
      ctx.fillRect(x, wallTop, 2, 1);
      ctx.fillStyle = "rgba(2,7,11,.34)";
      ctx.fillRect(x, wallTop + h - Math.max(1, h * 0.035), 2, Math.max(1, h * 0.035));
      ctx.fillStyle = `rgba(3,8,17,${Math.min(0.88, (m.p.details.gerador?0.14:0.2) + corrected / 50 + (edgeX < edgeY ? 0.06 : 0))})`;
      ctx.fillRect(x, wallTop, 2, h);
    }
    const objects = [
      ...sites.filter((s) => !m.p.data.includes(s.id)),
      ...details.map((d) => ({ ...d, scale: d.scale * 0.72 })),
      ...loreProps.map((d) => ({ ...d, scale: d.scale * 0.72 })),
      ...combatProps.map((d) => ({ ...d, scale: d.scale * 0.8 })),
      ...lote5Props.map((d) => ({ ...d, scale: d.scale * 0.8 })),
      ...lote6Props.map((d) => ({ ...d, scale: d.scale * 0.8 })),
      ...lote7Props.map((d) => ({ ...d, scale: d.scale * 0.8 })),
      ...lote7Decor.map((d) => ({ ...d, scale: d.scale * 0.8 })),
      nuloEntity(m, t),
      ...enemies.filter((e) => !e.dead).map((e) => ({ ...e, art: enemyArt(e), scale: e.hunter ? 1.08 : e.guardian ? 1.12 : 1 })),
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
        h = Math.min(430, 210 / forward)*(o.scale??1),
        im = images[o.art],
        w = (h * im.width) / im.height,
        top =
          108 +
          eye / forward -
          h +
          ((o.art.startsWith("infectado") || o.art.startsWith("guardiao")) && !motion.matches
            ? Math.sin(t * 7 + o.x) * Math.min(2, h * 0.025)
            : 0) +
          (o.art === "tubo-vapor" && !motion.matches ? Math.sin(t * 2.2 + o.x) * Math.min(3, h * 0.03) : 0) +
          ((o.art === "nulo-operador" || o.art === "nulo-operador-voz") && !motion.matches ? Math.sin(t * 1.25) * Math.min(2, h * 0.02) : 0) +
          (o.art.startsWith("afogado") && !motion.matches ? Math.sin(t * 9 + o.x) * Math.min(2, h * 0.025) : 0);
      ctx.globalAlpha = Math.max(0.1, 1 - forward / (m.p.details.gerador?40:30));
      if (o.art === "selo-recompilado") ctx.globalAlpha *= 0.72 + 0.28 * Math.sin(t * 2.4);
      if (o.art === "portal-mare") ctx.globalAlpha *= fendaOpen(m) ? 0.9 + 0.1 * Math.sin(t * 2.6) : 0.55;
      if (o.art === "tubo-vapor") {
        ctx.fillStyle = `rgba(196,236,229,${0.05 + 0.04 * Math.sin(t * 1.7)})`;
        ctx.fillRect(sx - 2, top - 5, 4, 4);
      }
      if (o.art === "nulo-operador-voz") {
        ctx.globalAlpha *= 0.68 + 0.18 * Math.sin(t * 8.7);
        ctx.fillStyle = `rgba(112,232,220,${0.08 + 0.04 * Math.sin(t * 5)})`;
        ctx.fillRect(sx - w * 0.32, top + h * 0.1, w * 0.64, h * 0.8);
      }
      if (o.art === "transicao-fenda") ctx.globalAlpha *= 0.8 + 0.2 * Math.sin(t * 2.6);
      if ((o.kind === "nulo" || o.art === "transicao-fenda" || o.art === "turbina-sala" || o.art === "portal-mare" || o.art === "lampada-industrial" || o.art === "lanterna-sinal") && forward <= depth[Math.max(0, Math.min(383, Math.floor(sx)))] + 0.25) {
        const glow = ctx.createRadialGradient(sx, top + h * 0.45, 1, sx, top + h * 0.45, Math.max(8, w * 0.55));
        const tone = o.art === "turbina-sala" || o.art === "lampada-industrial" || o.art === "lanterna-sinal" ? "255,178,92" : o.art === "transicao-fenda" || o.art === "portal-mare" ? "255,197,117" : "113,231,218";
        glow.addColorStop(0, `rgba(${tone},${o.kind === "nulo" ? ".28" : ".16"})`);
        glow.addColorStop(1, `rgba(${tone},0)`);
        ctx.fillStyle = glow;
        ctx.fillRect(sx - w, top - h * 0.08, w * 2, h * 1.05);
        if (o.kind === "nulo") { ctx.fillStyle = "rgba(255,198,110,.55)"; ctx.fillRect(sx - 1, top + h * 0.13, 2, 2); }
      }
      ctx.fillStyle = "rgba(0,0,0,.34)";
      ctx.beginPath();
      ctx.ellipse(sx, 108 + eye / forward, Math.max(2, w * 0.36), Math.max(1, h * 0.032), 0, 0, Math.PI * 2);
      ctx.fill();
      for (
        let x = Math.max(0, Math.floor(sx - w / 2));
        x < Math.min(384, sx + w / 2);
        x++
      ) {
        if (forward > depth[x] + 0.2) continue;
        ctx.fillStyle="rgba(0,0,0,.35)";ctx.fillRect(x,108+eye/forward,1,Math.max(1,3/forward));
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
      if (o.art === "transicao-fenda" && forward <= depth[Math.max(0, Math.min(383, Math.floor(sx)))] + 0.25) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = (motion.matches ? 0.62 : 0.55 + 0.2 * Math.sin(t * 3.4)) * (0.55 + 0.45 * (1 - forward / 30));
        const rift = ctx.createRadialGradient(sx, top + h * 0.45, 1, sx, top + h * 0.45, Math.max(10, w * 0.8));
        rift.addColorStop(0, "rgba(180,255,240,.9)");
        rift.addColorStop(0.32, "rgba(125,246,229,.55)");
        rift.addColorStop(0.62, "rgba(255,184,96,.28)");
        rift.addColorStop(1, "rgba(125,246,229,0)");
        ctx.fillStyle = rift;
        ctx.fillRect(sx - w, top - h * 0.2, w * 2, h * 1.4);
        ctx.fillStyle = "rgba(198,255,242,.68)";
        ctx.fillRect(sx - Math.max(1, w * 0.035), top + h * 0.1, Math.max(2, w * 0.07), h * 0.8);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    {
      // Banks of harbour fog swallow the middle distance. The floor still
      // exists under it, but the player can no longer measure the yard.
      const haze = ctx.createLinearGradient(0, 78, 0, 150);
      haze.addColorStop(0, "rgba(70,90,81,0)");
      haze.addColorStop(0.48, "rgba(70,90,81,.23)");
      haze.addColorStop(1, "rgba(70,90,81,0)");
      ctx.fillStyle = haze;
      ctx.fillRect(0, 78, 384, 74);
      if (!motion.matches) {
        const drift = Math.sin(t * 0.17) * 26;
        ctx.fillStyle = "rgba(96,122,107,.09)";
        ctx.fillRect(-30 + drift, 96, 250, 9);
        ctx.fillRect(170 - drift * 0.7, 107, 260, 6);
      }
      // Foreground cables and a work bulb: depth in front of the lens.
      ctx.strokeStyle = "rgba(3,6,6,.92)";
      ctx.lineWidth = 2;
      const sway = motion.matches ? 0 : Math.sin(t * 1.3) * 2;
      ctx.beginPath();
      ctx.moveTo(292, -4);
      ctx.quadraticCurveTo(322 + sway, 32, 338 + sway, 66);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(102, -6);
      ctx.quadraticCurveTo(74 - sway, 24, 58 - sway, 44);
      ctx.stroke();
      const bulbX = 338 + sway, bulbY = 66;
      ctx.fillStyle = "rgba(230,185,112,.12)";
      ctx.beginPath(); ctx.arc(bulbX, bulbY, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(244,210,154,.28)";
      ctx.fillRect(bulbX - 2, bulbY - 1, 4, 4);
    }
    ctx.font="9px monospace";ctx.fillStyle="#9bbdb6";
    const directions=["L","S","O","N"],heading=directions[((Math.round(m.angle/(Math.PI/2))%4)+4)%4];
    ctx.fillText(`${heading} · BAÍA / ${m.p.details.gerador?"ENERGIA RESTAURADA":"SEM REDE"}`,120,17);
    ctx.fillStyle = "#c0e7da";
    ctx.fillRect(190, 108, 4, 1);
    ctx.fillRect(192, 106, 1, 4);
    if (m.stress > 50) {
      ctx.fillStyle = `rgba(160,10,70,${Math.min(0.23, m.stress / 500)})`;
      ctx.fillRect(0, 0, 384, 216);
    }
    if (
      !motion.matches &&
      m.p.elapsed > 90 &&
      Math.sin(t * 2) > 0.992
    ) {
      ctx.fillStyle = "#72cabc30";
      ctx.fillRect(0, (t * 39) % 216, 384, 3);
    }
    if(pulse>0){
      const k=1-pulse/.6;
      ctx.strokeStyle=`rgba(120,230,220,${(1-k)*.55})`;ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(192,122,12+k*188,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle=`rgba(120,230,220,${(1-k)*.08})`;ctx.fillRect(0,0,384,216);
    }
    if(hurtFlash>0){ctx.fillStyle=`rgba(170,18,52,${.3*hurtFlash/.32})`;ctx.fillRect(0,0,384,216);}
    if(swing>0){const k=swing/.18;ctx.strokeStyle=`rgba(198,242,231,${.65*k})`;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(118,186);ctx.lineTo(206,140);ctx.lineTo(268,72);ctx.stroke();ctx.strokeStyle=`rgba(198,242,231,${.22*k})`;ctx.lineWidth=6;ctx.stroke();}
    if(m.p.containment.lanterna){ctx.fillStyle="rgba(104,206,170,.035)";ctx.fillRect(0,0,384,216);}
    if(m.finished){
      const k=Math.min(1,endClock/2.4);
      ctx.globalAlpha=0.55*(1-k*0.45);
      ctx.drawImage(images["transicao-fenda"],192-50-k*26,108-90-k*34,100+k*52,180+k*68);
      ctx.globalAlpha=1;
      const detailCount=Object.keys(m.p.details).filter(k=>details.some(d=>d.id===k)).length;
      ctx.fillStyle="rgba(3,9,13,.94)";ctx.fillRect(52,46,280,120);
      ctx.strokeStyle="#537379";ctx.strokeRect(52.5,46.5,279,119);
      ctx.font="11px monospace";ctx.fillStyle="#c0e7da";ctx.fillText("RELATÓRIO DE ECO",68,64);
      ctx.font="9px monospace";ctx.fillStyle="#9bbdb6";
      ctx.fillText(`DESCOMPASSO ${m.p.rank}/4 · MEMÓRIAS ${m.p.data.length}/3`,68,82);
      ctx.fillText(`REGISTROS ${detailCount}/8 · LORE ${m.p.lore.length}/6 · NULO ${m.p.nulo.length}/4`,68,96);
      ctx.fillText(`BALIZA ${m.p.checkpoint==="boia"?"VINCULADA":"NÃO VINCULADA"} · FÔLEGO ${Math.round(m.stamina)}`,68,110);
      ctx.fillStyle="#e0b56a";ctx.fillText(nuloReportLine(m),68,128);
      ctx.fillStyle="#c0e7da";ctx.fillText("A ponte do Limiar aceitará seu eco.",68,146);
    }
    if(intro>0){ctx.fillStyle=`rgba(0,0,0,${Math.min(1,intro/1.6)})`;ctx.fillRect(0,0,384,216);}
    if(m.finished&&endClock>3.15){ctx.fillStyle=`rgba(0,0,0,${Math.min(1,(endClock-3.15)/.85)})`;ctx.fillRect(0,0,384,216);}
    // VHS/PSX finish: soft lens vignette, warm tape grade, scanlines, grain
    // and a low-bitrate timestamp. The flashlight is a screen-space cone so
    // the bay edges fall away even in the open yard.
    {
      const reach = lampOn(m) ? 268 : 236;
      const flash = ctx.createRadialGradient(192, 114, 16, 192, 116, reach);
      flash.addColorStop(0, "rgba(0,0,0,0)");
      flash.addColorStop(0.42, "rgba(0,0,0,.08)");
      flash.addColorStop(0.74, "rgba(0,0,0,.26)");
      flash.addColorStop(1, "rgba(0,0,0,.64)");
      ctx.fillStyle = flash;
      ctx.fillRect(0, 0, 384, 216);
      ctx.save();
      ctx.globalCompositeOperation = "overlay";
      const grade = ctx.createLinearGradient(0, 0, 0, 216);
      grade.addColorStop(0, "rgba(24,40,38,.42)");
      grade.addColorStop(0.56, "rgba(96,68,38,.18)");
      grade.addColorStop(1, "rgba(150,96,44,.26)");
      ctx.fillStyle = grade;
      ctx.fillRect(0, 0, 384, 216);
      ctx.restore();
      ctx.fillStyle = "rgba(154,112,72,.04)";
      ctx.fillRect(0, 0, 384, 216);
      const pool = ctx.createRadialGradient(192, 190, 6, 192, 176, 188);
      pool.addColorStop(0, "rgba(255,204,136,.19)");
      pool.addColorStop(0.55, "rgba(190,142,82,.06)");
      pool.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = pool;
      ctx.fillRect(0, 0, 384, 216);
      if (!motion.matches) {
        ctx.strokeStyle = "rgba(190,214,203,.10)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 38; i++) {
          const rx = (i * 73 + t * 140) % 430 - 20, ry = (i * 41 + t * 210) % 220;
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 3, ry + 9);
        }
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(0,0,0,.11)";
      for (let y = 1; y < 216; y += 3) ctx.fillRect(0, y, 384, 1);
      if (!motion.matches) {
        for (let i = 0; i < 54; i++) {
          const a = 0.025 + Math.random() * 0.045;
          ctx.fillStyle = `rgba(235,248,231,${a})`;
          ctx.fillRect(Math.random() * 384 | 0, Math.random() * 216 | 0, 1, 1);
        }
        if (Math.sin(t * 17) > 0.3) {
          ctx.fillStyle = "rgba(205,72,72,.8)";
          ctx.fillRect(12, 11, 3, 3);
          ctx.font = "7px monospace";
          ctx.fillStyle = "rgba(222,194,166,.8)";
          ctx.fillText("REC", 18, 16);
        }
        ctx.font = "7px monospace";
        ctx.fillStyle = "rgba(222,194,166,.65)";
        const secs = Math.floor(m.p.elapsed);
        ctx.fillText(`CAM 02  ${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`, 300, 16);
      }
    }
    if(mapOpen) drawMap();
    ctx.restore();
  }
  function render() {
    if (world3d?.available) {
      m.shake = shake;
      world3d.syncProps(signals().filter((s) => s.label && s.kind !== "nulo"));
      world3d.render({
        ctx,
        m,
        t,
        dt: frameDt,
        mode: activeFrame ? "3d" : "entering",
        intro,
        endClock,
        enemies,
        nulo: nuloEntity(m, t),
        activeProps: signals().filter((s) => s.label && s.kind !== "nulo"),
        reducedMotion: motion.matches,
      });
      if (intro > 0.55 && !m.finished && !mapOpen) {
        const alpha = Math.min(1, (2.0 - intro) * 4) * Math.min(1, (intro - 0.55) / 0.7);
        ctx.save();
        ctx.textAlign = "center";
        ctx.fillStyle = `rgba(206,236,227,${0.92 * alpha})`;
        ctx.font = "12px monospace";
        ctx.fillText("B A Í A   D E   Q U A R E N T E N A", 192, 100);
        ctx.fillStyle = `rgba(232,190,132,${0.85 * alpha})`;
        ctx.font = "7px monospace";
        ctx.fillText("03:12 // A ÂNCORA NÃO RESPONDE", 192, 114);
        ctx.strokeStyle = `rgba(168,217,206,${0.35 * alpha})`;
        ctx.beginPath();
        ctx.moveTo(130, 121.5);
        ctx.lineTo(254, 121.5);
        ctx.stroke();
        ctx.restore();
      }
      if (mapOpen) drawMap();
      return;
    }
    renderLegacy();
  }
  return {
    mission: m,
    enemies,
    world3d,
    frame(dt, { mode }) {
      if (disposed) return;
      dt = Math.max(0, Math.min(dt, 0.05));
      frameDt = dt;
      t += dt;
      activeFrame=mode==="3d";
      shell.classList.toggle("recompilado", lote5Complete(m));
      shell.classList.toggle("fenda-aberta", fendaOpen(m));
      shake=Math.max(0,shake-dt);
      if(mode!=="2d")intro=Math.max(0,intro-dt);
      if(activeFrame&&!m.finished&&m.p.rank!==lastRank){
        lastRank=m.p.rank;
        if(m.p.rank>=4){message.textContent+=" A FENDA DE RECOMPILAÇÃO ABRIU A SUDESTE.";tone(660,.9,.024,"sine");tone(110,.5,.02,"sawtooth");}
      }
      if (mode === "3d" && !m.finished) {
        m.p.elapsed += dt;
        m.cooldown = Math.max(0, m.cooldown - dt);
        m.ward = Math.max(0, m.ward - dt);
        pulse=Math.max(0,pulse-dt);
        hurtFlash=Math.max(0,hurtFlash-dt);
        attackClock=Math.max(0,attackClock-dt);
        swing=Math.max(0,swing-dt);
        const lookTarget = ((keys.has("ArrowRight") ? 1 : 0) - (keys.has("ArrowLeft") ? 1 : 0)) * 1.9;
        lookVel += (lookTarget - lookVel) * Math.min(1, dt * 11);
        m.angle += lookVel * dt;
        m.lookVel = lookVel;
        const pitchTarget = ((keys.has("ArrowUp") ? 1 : 0) - (keys.has("ArrowDown") ? 1 : 0)) * 1.15;
        pitchVel += (pitchTarget - pitchVel) * Math.min(1, dt * 10);
        m.pitch = Math.max(-0.92, Math.min(0.92, m.pitch + pitchVel * dt));
        const f = Number(keys.has("KeyW")) - Number(keys.has("KeyS")),
          s = Number(keys.has("KeyD")) - Number(keys.has("KeyA")),
          norm = Math.max(1, Math.hypot(f, s)),
          moving=!!(f||s),
          crouch=keys.has("KeyC"),
          sprint=moving&&!crouch&&(keys.has("ShiftLeft")||keys.has("ShiftRight"))&&m.stamina>1,
          surface=terrain(m),
          speed = (2.2 + m.p.rank * 0.12)*(crouch?.52:sprint?1.55:1)*(surface==="resina"?.7:1)*(m.stamina<1?.82:1);
        m.crouched=crouch;
        m.stamina=Math.max(0,Math.min(100,m.stamina+dt*(sprint?-25:17)));
        m.noise=crouch?.1:sprint?1:moving?.4:0;
        m.idle=f||s?0:m.idle+dt;
        const gain = 1 - Math.exp(-dt * (surface==="resina"?3.2:crouch?9:7));
        m.vx +=
          (((Math.cos(m.angle) * f - Math.sin(m.angle) * s) * speed) / norm -
            m.vx) *
          gain;
        m.vy +=
          (((Math.sin(m.angle) * f + Math.cos(m.angle) * s) * speed) / norm -
            m.vy) *
          gain;
        move(m, m.vx * dt, m.vy * dt);
        // Containment hazards and the lantern are local trade-offs, never global health.
        if(hazardProp&&!m.p.containment.cabo&&Math.hypot(hazardProp.x-m.x,hazardProp.y-m.y)<1.3){
          m.stress=Math.min(100,m.stress+dt*13);
          if((hazardClock+=dt)>1.1){hazardClock=0;tone(120+Math.random()*40,.18,.02,"sawtooth");}
        }
        if(lightProp&&m.p.containment.lanterna&&Math.hypot(lightProp.x-m.x,lightProp.y-m.y)<6)
          m.stress=Math.max(0,m.stress-dt*2.6);
        const stressBefore=m.stress;
        if (m.p.elapsed > 45) {
          const phases=enemies.map(e=>e.phase);
          pursuit.update(m,enemies,dt,state.progress.archetype);
          enemies.forEach((e,i)=>{if(e.phase!==phases[i]){
            if(e.phase==='windup')tone(145,.4,.03,'sawtooth');
            if(e.phase==='listen')tone(300,.3,.01,'sine');
            if(e.phase==='stunned')tone(90,.3,.03,'triangle');
            if(e.phase==='rise')tone(70,.5,.02,'sawtooth');
            if(e.phase==='strike'){tone(60,.12,.045,'triangle');if(Math.hypot(e.x-m.x,e.y-m.y)<2.2)shake=.24;}
            if(e.phase==='hurt')tone(210,.16,.025,'square');
            if(e.phase==='dissolve'){tone(140,.9,.03,'sine');tone(70,.6,.02,'triangle');message.textContent="A forma perde a coesão e escorre para o casulo. Nenhum item ou dado se perde.";}
            if(e.phase==='dead')message.textContent="O casulo já está trabalhando. Uma nova forma sobe em 30s.";
          }});
        }
        if(m.stress>stressBefore+2){hurtFlash=.32;shake=Math.max(shake,.2);}
        if (m.stress >= 100) {
          m.x =m.p.checkpoint==="boia"?17.5:16;
          m.y = m.p.checkpoint==="boia"?24.5:19;
          m.vx=m.vy=0;m.ward=3;
          m.stress = 25;
          message.textContent =
            "NEXO recuperou seu eco no terminal. Nenhum dado ou item perdido.";
          tone(65, 0.7);
        }
        if (Math.hypot(m.vx, m.vy) > 0.4 && t - lastStep > (sprint?.32:crouch?.8:.55)) {
          lastStep = t;
          tone(surface==="madeira"?90:surface==="resina"?38:60, .09,crouch?.006:.018, "triangle");
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
      if (enabled && audio && activeFrame) {
        // respiração diegética: acelera com tensão, fôlego baixo e proximidade.
        const threat = Math.min(
          ...[...enemies.filter((e) => !e.dead).map((e) => Math.hypot(e.x - m.x, e.y - m.y)), Math.hypot(nuloEntity(m, t).x - m.x, nuloEntity(m, t).y - m.y), 24],
        );
        const breathEvery = Math.max(1.15, 4.1 - m.stress * 0.026 - Math.max(0, 8 - threat) * 0.08);
        if ((breathClock += dt) > breathEvery) {
          breathClock = 0;
          noiseBurst(0.34, m.crouched ? 0.003 : 0.0055, 620);
          if (m.stress > 45 || m.stamina < 25) tone(184 + Math.random() * 34, 0.46, 0.012, "sine");
          if (m.stress > 74) tone(360, 0.15, 0.005, "sine");
        }
        if ((creakClock += dt) > 8.5 + Math.random() * 5) {
          creakClock = 0;
          const a = Math.random() * Math.PI * 2;
          const sx = m.x + Math.cos(a) * 6.5,
            sy = m.y + Math.sin(a) * 6.5;
          const pan = Math.max(-1, Math.min(1, (-(sx - m.x) * Math.sin(m.angle) + (sy - m.y) * Math.cos(m.angle)) / 6.5));
          noiseBurst(0.6, 0.007, 280, pan);
          tone(74 + Math.random() * 24, 0.8, 0.009, "triangle");
        }
        if ((staticClock += dt) > Math.max(1.1, 5.5 - m.stress * 0.045)) {
          staticClock = 0;
          noiseBurst(0.06, 0.004 + m.stress / 26000, 2600, Math.random() * 2 - 1);
        }
        if((beatClock+=dt)>(m.stress>30?.4:.85)){beatClock=0;beat++;const notes=[55,65.406,73.416,61.735];tone(notes[Math.floor(beat/8)%4],1.5,.012,"triangle");if(m.stress>20||m.finished)tone(beat%2?42:84,.13,.025,"sine");if(m.finished)tone(220*(1+beat%3),.3,.014,"sawtooth");
          if(lote5Complete(m)&&beat%4===0)tone(330+beat%3*55,.55,.009,"sine");}
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
        const lamp = lote7Props[0], rift = lote6Props.find((p) => p.id === "fenda6");
        if (lamp && Math.hypot(m.x - lamp.x, m.y - lamp.y) < 7 && (lampClock += dt) > 2.2) {
          lampClock = 0;
          tone(118, .12, .007, "sawtooth");
          noiseBurst(.035, .006, 2200);
        }
        if (rift && Math.hypot(m.x - rift.x, m.y - rift.y) < 9 && (portalClock += dt) > 3.1) {
          portalClock = 0;
          tone(48, 1.6, .012, "sine");
          tone(96, .8, .006, "triangle");
        }
        if ((enemyClock += dt) > 1.7) {
          enemyClock = 0;
          for (const e of enemies) if (!e.dead && Math.hypot(e.x - m.x, e.y - m.y) < 4.4) noiseBurst(.18, .008, 380);
        }
        if (terrain(m) !== "madeira" && (dripClock += dt) > 3.7) {
          dripClock = 0;
          if (Math.random() > .45) tone(900 + Math.random() * 500, .16, .004, "sine");
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
      readout.textContent = `DESCOMPASSO LOCAL ${m.p.rank}/4 · DADOS ${m.p.data.length}/3 · ${Math.max(0, 600 - Math.floor(m.p.elapsed))}s · FÔLEGO ${Math.round(m.stamina)} · ${m.crouched?"SILENCIOSO":m.noise>.8?"PASSOS ALTOS":"CAMINHANDO"} · REGISTROS ${Object.keys(m.p.details).filter(k=>details.some(d=>d.id===k)).length}/8 · LORE ${m.p.lore.length}/6 · TENSÃO ${Math.round(m.stress)} · AMEAÇAS ${enemies.filter(e=>!e.dead&&e.phase!=="dissolve").length}/${enemies.length} · Q ${Math.ceil(m.cooldown)}s · ${lote5Readout(m)} · ${lote6Readout(m)} · ${lote7Readout(m)}`;
      objective.textContent = objectiveLine(m);
      const near = nearestSignal(m,signals());
      const nearLabel = typeof near?.label === "string" ? near.label.trim() : "";
      aside.textContent = m.finished
        ? ""
        : nearLabel
        ? `[E] ${nearLabel}`
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
      const secs = Math.max(0, 600 - Math.floor(m.p.elapsed));
      const headingIndex = ((Math.round(m.angle / (Math.PI / 2)) % 4) + 4) % 4;
      const dirs = ["L", "S", "O", "N"];
      if (hud.heading) hud.heading.textContent = dirs[headingIndex];
      if (hud.bearing) hud.bearing.textContent = `${String(Math.round(((90 + m.angle * 180 / Math.PI) % 360 + 360) % 360)).padStart(3, "0")}°`;
      if (hud.tension) hud.tension.style.width = `${Math.max(0, Math.min(100, m.stress))}%`;
      if (hud.tensionValue) hud.tensionValue.textContent = String(Math.round(m.stress));
      if (hud.stamina) hud.stamina.style.width = `${Math.max(0, Math.min(100, m.stamina))}%`;
      if (hud.clock) hud.clock.textContent = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
      if (hud.torch) {
        hud.torch.textContent = m.finished ? "FALHA" : m.p.details.gerador ? "ESTÁVEL" : "ON";
        hud.torch.classList.toggle("falha", m.finished || m.stress > 82);
      }
      if (hud.noise) hud.noise.textContent = m.crouched ? "SILÊNCIO" : m.noise > 0.8 ? "ALTO" : m.noise > 0.2 ? "PASSOS" : "QUIETO";
      const nearestSite = Math.min(...sites.filter((s) => !m.p.data.includes(s.id)).map((s) => Math.hypot(s.x - m.x, s.y - m.y)), 30);
      const barsOn = Math.max(1, Math.min(4, Math.round((1 - nearestSite / 30) * 4)));
      hud.signalBars.forEach((bar, i) => bar.classList.toggle("on", i < barsOn));
      if (hud.signalText) hud.signalText.textContent = m.finished ? "ROMPIDO" : barsOn >= 3 ? "FORTE" : barsOn === 2 ? "INSTÁVEL" : "FRACO";
      shell.classList.toggle("mare-tenso", m.stress > 62);
      shell.classList.toggle("mare-fim", m.finished);
      render();
    },
    dispose() {
      disposed = true;
      abort.abort();
      keys.clear();
      drone?.stop();
      surf?.stop();
      audio?.close().catch(() => {});
      world3d?.dispose?.();
      save();
      shell.remove();
      if (old === undefined) delete mount.dataset.mission;
      else mount.dataset.mission = old;
    },
  };
}
