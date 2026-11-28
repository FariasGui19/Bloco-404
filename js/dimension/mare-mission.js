import {terrain, createPursuit, enemyArt, hurtEnemy, visible} from './mare-mission-life.js';
import {useLore} from './mare-mission-lore.js';
import {nuloEntity} from './mare-mission-lote6.js';
import {lote13Names, drawServiceMap, drawBayReport} from './mare-mission-lote13.js';
import {createMareWorld3D} from './mare-mission-world3d.js';
import {cell, waterAt, onDock, CABINS, notes, sceneryProps, createMission, move, interact, abilities, scannerTarget} from './mare-mission-model.js';
import {entry, systems, sites, anchor, currentSite, siteStatus, nextObjective, promptFor, relativeBearing, statusColor, circuitLegs, cableColor} from './mare-mission-circuit.js';

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
  shell.innerHTML = `<canvas width="384" height="216" tabindex="0" aria-label="Baía de quarentena em primeira pessoa"></canvas><div class="mare-letterbox" aria-hidden="true"></div><div class="mare-frame" aria-hidden="true"></div>
<header class="mare-hud">
  <div class="mare-brand"><span class="mare-rec" aria-hidden="true"></span><div><small>MARÉ CROMÁTICA <i>// BAÍA DE QUARENTENA</i></small><h1>OPERAÇÃO / LINHA DE RETORNO</h1></div></div>
  <div class="mare-compass" aria-label="Bússola"><span class="mare-heading">N</span><div class="mare-compass-track"><i></i><b></b><i></i><em class="mare-target" aria-hidden="true"></em></div><span class="mare-bearing">000°</span></div>
  <div class="mare-signal"><small>SINAL DO ALVO</small><div class="mare-signal-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></div><b class="mare-signal-text">FRACO</b>
    <div class="mare-threat" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    <b class="mare-zone-name">PRAIA</b></div>
</header>
<aside aria-live="polite"></aside>
<div class="mare-next" hidden><div class="mare-next-body">
  <div class="mare-next-title"><small>H-03 / ESTRUTURA HÚMIDA</small><b class="mare-next-count">0/3</b></div>
  <b class="mare-next-action">—</b><div class="mare-next-loc"><i class="mare-next-arrow" aria-hidden="true"></i><span class="mare-next-detail"></span><span class="mare-next-dist"></span></div>
  <div class="mare-steps" aria-label="Sistemas da baía">${systems.map(s => `<span data-step="${s.id}">${s.code} ${s.short}</span>`).join('')}</div>
</div></div>
<footer class="mare-hud-foot">
  <div class="mare-handset">
    <nav class="mare-move" aria-label="Movimento"><button data-key="KeyW" aria-label="Frente">W</button><button data-key="KeyA" aria-label="Esquerda">A</button><button data-key="KeyS" aria-label="Trás">S</button><button data-key="KeyD" aria-label="Direita">D</button><button data-key="ShiftLeft">CORRER</button><button data-key="KeyC">AGACHAR</button></nav>
    <nav class="mare-look" aria-label="Câmera"><button data-key="ArrowUp" aria-label="Olhar para cima">▲</button><button data-key="ArrowLeft" aria-label="Olhar à esquerda">◀</button><button data-key="ArrowDown" aria-label="Olhar para baixo">▼</button><button data-key="ArrowRight" aria-label="Olhar à direita">▶</button></nav>
  </div>
  <div class="mare-log"><span>NEXO-04 / RX</span><p class="mare-message" role="status"></p></div>
  <div class="mare-vitals">
    <div class="mare-vital"><small>TENSÃO</small><div class="mare-meter"><i class="mare-tension"></i></div><b class="mare-tension-value">0</b></div>
    <div class="mare-vital"><small>FÔLEGO</small><div class="mare-meter"><i class="mare-stamina"></i></div></div>
    <div class="mare-vital"><small>LANTERNA</small><b class="mare-torch">ON</b></div>
    <div class="mare-vital"><small>TEMPO</small><b class="mare-clock">10:00</b></div>
    <div class="mare-vital"><small>RUÍDO</small><b class="mare-noise">QUIETO</b></div>
  </div>
  <div class="mare-controls">
    <button data-audio>ÁUDIO: OFF</button><button data-lamp><b>L</b> LANTERNA</button><button data-dash><b>␣</b> ESQUIVA</button><button data-action><b>E</b> SCANNER</button><button data-power><b>Q</b> PULSO</button><button data-attack><b>F</b> GOLPE</button><button data-map><b>M</b> MAPA</button><button data-exit>SAIR</button>
    <label class="mare-volume">VOL <input data-volume type="range" min="0" max="100" value="55" aria-label="Volume da missão"></label>
  </div>
  <p class="mare-readout"></p>
  <p class="mare-keys">WASD mover · mouse/arrastar olhar · E interagir · F golpe · Q pulso · L lanterna · ESPAÇO esquiva · SHIFT correr · C agachar · M mapa · ESC sair</p>
</footer>`;
  mount.append(shell);
  const canvas = shell.querySelector("canvas"),
    ctx = canvas.getContext("2d", { alpha: false }),
    readout = shell.querySelector(".mare-readout"),
    message = shell.querySelector(".mare-message");
  ctx.imageSmoothingEnabled = false;
  message.textContent = m.p.data.length ? 'Telemetria recuperada. Retome a linha indicada no scanner.'
    : 'O portal perdeu a portadora. Sintonize o sensor âmbar à frente.';
  // Apenas as folhas que entram neste percurso (incluindo o fallback).
  const atlas = {
    'mare-missao-base': ['piso-resina'],
    'mare-missao-lote2': ['radio'],
    'mare-missao-lote3': ['diario-faroleiro','prontuario-quarentena','maca-quarentena'],
    'mare-missao-lote4': ['casulo-mare'],
    'mare-missao-lote5': ['caldeira-sala','tubo-vapor','guardiao-mare','guardiao-dano','piso-metal'],
    'mare-missao-lote6': ['nulo-operador','nulo-operador-voz'],
    'mare-missao-lote7': ['chao-concreto-umido','chao-agua-rasa','teto-metal-escuro','parede-azulejo-quebrado','porta-pesada','parede-concreto-umido','afogado-mare','afogado-dano'],
    'mare-missao-lote8': ['guindaste-baia','caixote-madeira','rede-pesca'],
    'mare-missao-lote11': ['gerador-quarentena','rede-deriva','boia-cromatica'],
    'mare-missao-lote13': lote13Names,
    'mare-coast': ['nulo-0','nulo-1','nulo-2','nulo-3','afogado-0','afogado-1','afogado-2','afogado-3',
      'guardiao-0','guardiao-1','guardiao-2','guardiao-3','ancora-cromatica','pier-zero','barco-destroco',
      'nulo-sobrecarga','vegetacao-duna',"caranguejo","gaivota","peixe","onda"],
  };
  const images = {};
  try {
    await Promise.all(Object.entries(atlas).flatMap(([dir, names]) => names.map(async name => {
      const im = new Image();
      im.src = new URL(`../../assets/sprites/${dir}/${name}.png`, import.meta.url).href;
      try { await im.decode(); images[name] = im; }
      catch (err) {
        if (!sceneryProps.some(s => s.art === name) || sites.some(s => s.art === name)) throw err;
      }
    })));
  } catch (err) {
    shell.remove();
    if (old === undefined) delete mount.dataset.mission; else mount.dataset.mission = old;
    throw err;
  }
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
    scanner: shell.querySelector("[data-action]"),
    zone: shell.querySelector(".mare-zone-name"),
    threat: [...shell.querySelectorAll(".mare-threat i")],
    steps: [...shell.querySelectorAll(".mare-steps [data-step]")],
    target: shell.querySelector(".mare-target"),
    next: shell.querySelector(".mare-next"),
    nextAction: shell.querySelector(".mare-next-action"),
    nextDetail: shell.querySelector(".mare-next-detail"),
    nextCount: shell.querySelector(".mare-next-count"),
    nextDist: shell.querySelector(".mare-next-dist"),
    nextArrow: shell.querySelector(".mare-next-arrow"),
  };
  // A cena 3D é construída uma vez. Se o WebGL falhar, o raycaster legado
  // continua como plano B e a missão nunca fica sem imagem.
  const worldProps = [...sceneryProps, ...notes];
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
  }).catch((error) => {
    console.error("Maré 3D indisponível:", error);
    return { available: false };
  });
  m.pitch ??= 0;
  m.lookVel = 0;
  m.lamp ??= 100;
  m.lampOn ??= true;
  m.dashT ??= 0;
  m.dashCd ??= 0;
  m.dashDir ??= 0;
  let lastZoneShown = "praia", zoneClock = 0;
  let disposed = false,
    t = 0,
    saveClock = 0,
    lastStep = 0,
    endClock = 0,
    drag = false,
    lastX = 0,
    lastY = 0,
    lookVel = 0,
    pitchVel = 0,
    mapOpen = false,
    audio = null,
    enabled = false,
    drone = null, master=null, activeFrame=false, beatClock=0, beat=0, breathClock=0, shake=0, intro=2.0, pulse=0, scanFlash=0, scanned=null, hurtFlash=0, attackClock=0, swing=0, frameDt=1/60;
  const pursuit=createPursuit(), motion=matchMedia("(prefers-reduced-motion: reduce)"), aside=shell.querySelector("aside");
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
    stepClock = 0,
    ambientClock = 0,
    exitRequested = false,
    coastZone = "praia",
    lampClock = 0,
    portalClock = 0,
    dripClock = 0,
    creakClock = 0,
    staticClock = 0,
    musicGain = null,
    musicFilter = null,
    musicOsc = [],
    motifClock = 0;
  function score() {
    if (musicGain || !audio || !master) return;
    musicFilter = audio.createBiquadFilter();
    musicFilter.type = "lowpass";
    musicFilter.frequency.value = 240;
    musicFilter.Q.value = 0.8;
    musicGain = audio.createGain();
    musicGain.gain.value = 0.0001;
    musicFilter.connect(musicGain);
    musicGain.connect(master);
    for (const [f, type, level, detune] of [
      [55, "sine", 0.22, -4],
      [82.41, "sine", 0.14, 3],
      [110, "triangle", 0.07, 6],
      [164.81, "sine", 0.035, -8],
    ]) {
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = type;
      o.frequency.value = f;
      o.detune.value = detune;
      g.gain.value = level;
      o.connect(g);
      g.connect(musicFilter);
      o.start();
      musicOsc.push(o);
    }
    musicGain.gain.setTargetAtTime(0.06, audio.currentTime, 2.5);
  }
  function updateScore(dt) {
    if (!musicGain || !audio) return;
    const now = audio.currentTime;
    musicFilter.frequency.setTargetAtTime(
      200 + m.stress * 4.2 + (coastZone === "anchor" ? 70 : 0) + (m.finished ? 180 : 0),
      now,
      0.6,
    );
    musicGain.gain.setTargetAtTime(
      0.045 + (m.stress / 100) * 0.035 + (m.finished ? 0.04 : 0),
      now,
      1.2,
    );
    motifClock -= dt;
    if (motifClock <= 0) {
      motifClock = m.finished ? 3.2 : 9 + Math.random() * 7;
      const root = coastZone === "anchor" ? 174.61 : 164.81;
      tone(root, 3.4, 0.005, "sine");
      tone(root * 1.5, 2.6, 0.003, "triangle");
      if (m.stress > 68) tone(root * 1.414, 3.8, 0.0035, "sine");
    }
  }
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
  function tone(f, d = 0.15, v = 0.025, type = "sine", pan = 0, delay = 0) {
    if (!enabled || !audio || !master) return;
    const o = audio.createOscillator(),
      g = audio.createGain();
    o.type = type;
    o.frequency.value = f;
    const at = audio.currentTime + delay;
    g.gain.setValueAtTime(v, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + d);
    o.connect(g);
    if (pan && audio.createStereoPanner) {
      const panner = audio.createStereoPanner(); panner.pan.value = pan;
      g.connect(panner); panner.connect(master);
    } else g.connect(master);
    o.start(at); o.stop(at + d);
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
  // Ambientes distintos por marco: cada ponto da missão tem seu próprio pulso.
  function zoneOf(m) {
    const near = (x, y) => Math.hypot(m.x - x, m.y - y);
    return near(anchor.x, anchor.y) < 6 || near(systems[2].x, systems[2].y) < 3 ? 'anchor'
      : near(systems[1].x, systems[1].y) < 5 ? 'terminal'
      : near(entry.x, entry.y) < 6 ? 'pier' : m.x > 25.1 ? 'surf' : 'praia';
  }
  function coastAmbient(dt, m) {
    ambientClock -= dt;
    if (ambientClock > 0 || !activeFrame) return;
    ambientClock = 2.8 + Math.random() * 1.4;
    const zone = zoneOf(m);
    coastZone = zone;
    shell.dataset.zone = zone;
    if (zone === "pier") {
      noiseBurst(0.85, 0.0035, 320, -0.2);
      tone(46, 1.4, 0.009, "sine");
      if (Math.random() > 0.55) tone(392, 0.7, 0.005, "triangle");
    } else if (zone === "terminal") {
      tone(55, 0.75, 0.012, "sawtooth");
      tone(110, 0.4, 0.004, "sine");
      if (Math.random() > 0.6) tone(880, 0.12, 0.004, "square");
    } else if (zone === "anchor") {
      tone(38, 1.8, 0.016, "sine");
      tone(76, 0.9, 0.007, "triangle");
      if (Math.random() > 0.5) tone(228 + Math.random() * 90, 0.5, 0.005, "sine");
    } else if (zone === "surf") {
      noiseBurst(0.7, 0.006, 520, 0.25);
      tone(58, 1.1, 0.008, "sine");
    } else {
      noiseBurst(0.55, 0.0025, 240, -0.45);
      if (Math.random() > 0.66) tone(174, 0.9, 0.004, "triangle");
    }
    // Boia-sino, madeira cedendo e lamento distante: assinatura de cada área.
    if (zone === "surf" && Math.random() < 0.34) {
      tone(196, 2.8, 0.006, "sine");
      tone(392, 2.2, 0.0025, "sine");
    }
    if (zone === "pier" && Math.random() < 0.3) {
      noiseBurst(0.55, 0.004, 180, 0.25);
      tone(122, 0.6, 0.003, "triangle");
    }
    if (zone === "anchor" && Math.random() < 0.26) {
      tone(64, 3.6, 0.008, "sine");
      tone(48, 4.2, 0.006, "sine");
    }
  }
  function dash() {
    if (m.finished || m.dashCd > 0 || m.stamina < 28) return;
    const f = Number(keys.has("KeyW")) - Number(keys.has("KeyS"));
    const side = Number(keys.has("KeyD")) - Number(keys.has("KeyA"));
    m.dashDir = f || side ? m.angle + Math.atan2(side, f) : m.angle;
    m.dashT = 0.17;
    m.dashCd = 0.9;
    m.stamina = Math.max(0, m.stamina - 28);
    m.noise = Math.max(m.noise, 0.7);
    shake = Math.max(shake, 0.22);
    tone(138, 0.16, 0.018, "triangle");
    noiseBurst(0.18, 0.007, 1100, 0.15);
  }
  function action() {
    if (!activeFrame || m.finished || mapOpen) return;
    const near = scannerTarget(m), cue = promptFor(m, near);
    if (!cue || cue.kind === 'locked') return;
    if (cue.kind === 'lore') {
      message.textContent = useLore(m, near);
      tone(330, .16, .013, 'triangle'); save(); return;
    }
    const log = interact(m, near);
    if (!log) return;
    message.textContent = log;
    scanned = near; scanFlash = .65;
    world3d.pulse?.(near);
    const pan = Math.sin(relativeBearing(m, near) * Math.PI/180);
    noiseBurst(.10, .013, 1200, pan);
    if (near === systems[1]) tone(65, .72, .018, 'sawtooth', pan);
    tone(near.hz, .32, .025, 'triangle', pan);
    tone(near.hz * 1.5, .42, .017, 'sine', pan, .12);
    if (m.finished) {
      // Quinta aberta que resolve em acorde maior; a sirene fica reservada à retirada.
      [392, 494, 587, 784].forEach((hz,i) => tone(hz, 1.25, .016, 'sine', pan, .24+i*.18));
    } else if (currentSite(m) === anchor) tone(near.hz*2, .42, .012, 'sine', pan, .3);
    hud.next.classList.remove('avancou');
    void hud.next.offsetWidth;
    hud.next.classList.add('avancou');
    // Confirmar no toque, não no último frame da vinheta: ESC durante a
    // transmissão não perde o desfecho. O bridge aguarda a saída do manager.
    save();
    if (m.finished) complete();
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
    const radius=3.2+m.p.rank*.35, hits=[];
    for(const e of enemies){
      if(e.dead||e.phase==="dissolve")continue;
      if(Math.hypot(e.x-m.x,e.y-m.y)>radius||!visible(e,m))continue;
      const result=hurtEnemy(e,a==="motor_bio_forja"?2:1);
      if(result)hits.push(result);
    }
    pulse=.6;
    if(hits.length){tone(520,.35,.03,"square");tone(260,.5,.02,"triangle");shake=.18;}
    message.textContent = `${abilities[a] ?? "Pulso de identidade"}: ${a === "mare_astral" ? "sinais revelados" : a === "nucleo_dez_forma" ? "perseguidores cegados" : a === "dominio_anciao" ? "barreira ativa" : "biomassa estabilizada"}. Potência local ${m.p.rank}/4.`;
    if(hits.includes("defeated"))message.textContent+=" Uma forma se dissolveu; o casulo vai chamá-la de volta em 30s.";
    else if(hits.length)message.textContent+=" O pulso queimou a resina.";
    tone(330, 0.5);
  }
  const listen = (el, event, fn) =>
    el.addEventListener(event, fn, { signal: abort.signal });
  listen(window, "keydown", (e) => {
    if (e.repeat || m.finished) return;
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
    if (e.code === "Space") {
      e.preventDefault();
      dash();
    }
    if (e.code === "KeyL") {
      m.lampOn = !m.lampOn;
      message.textContent = m.lampOn
        ? "Lanterna reacende. A luz revela, mas também denuncia."
        : "Lanterna apagada. Seus passos e o farol bastam por enquanto.";
    }
  });
  listen(window, "keyup", (e) => keys.delete(e.code));
  listen(window, "blur", () => keys.clear());
  listen(canvas, "pointerdown", (e) => {
    drag = true;
    lastX = e.clientX;
    lastY = e.clientY;
    try { canvas.setPointerCapture(e.pointerId); } catch { /* ponteiro sintético */ }
    canvas.focus();
    // Em telas de toque e iframes sem pointer-lock, o arrasto continua ativo.
    if (e.pointerType !== 'touch') {
      try { canvas.requestPointerLock?.()?.catch?.(() => {}); } catch { /* usar arrasto */ }
    }
  });
  listen(canvas, "pointermove", (e) => {
    if (drag && !document.pointerLockElement && !mapOpen && !m.finished) {
      m.angle += (e.clientX - lastX) * 0.005;
      m.pitch = Math.max(-0.92, Math.min(0.92, m.pitch - (e.clientY - lastY) * 0.0035));
      lastX = e.clientX;
      lastY = e.clientY;
    }
  });
  listen(document, "mousemove", (e) => {
    if (document.pointerLockElement === canvas && !mapOpen && !m.finished) {
      m.angle += (e.movementX || 0) * 0.0022;
      m.pitch = Math.max(-0.92, Math.min(0.92, m.pitch - (e.movementY || 0) * 0.0022));
    }
  });
  listen(canvas, "pointerup", () => (drag = false));
  listen(canvas, "pointercancel", () => (drag = false));
  listen(shell.querySelector("[data-map]"), "click", () => { if (!m.finished) mapOpen = !mapOpen; });
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
  shell.querySelector("[data-dash]").onclick = dash;
  shell.querySelector("[data-lamp]").onclick = () => {
    if (m.finished) return;
    m.lampOn = !m.lampOn;
    message.textContent = m.lampOn ? "Lanterna ON." : "Lanterna OFF — silhueta mais difícil de ler.";
  };
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
      if (disposed || !enabled) return;
      if (!drone) {
        drone = audio.createOscillator();
        const g = audio.createGain();
        drone.frequency.value = 47;
        g.gain.value = 0.018;
        drone.connect(g);
        g.connect(master);
        drone.start();
        ocean();
        score();
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
  // No raycaster, reprojetar o mesmo cabo sobre o chão, antes das paredes e
  // sprites. Cortar no plano próximo evita uma faixa virando a tela ao girar.
  function drawCableOnFloor(fov, eye) {
    const cos = Math.cos(m.angle), sin = Math.sin(m.angle), focal = 192/fov;
    const project = ([x,y]) => {
      const dx = x-m.x, dy = y-m.y;
      return { side: -dx*sin + dy*cos, z: dx*cos + dy*sin };
    };
    const near = .35;
    ctx.save(); ctx.lineCap = 'round';
    for (const leg of circuitLegs) {
      ctx.strokeStyle = cableColor(m, leg);
      const points = leg.cable.map(project);
      for (let i=1; i<points.length; i++) {
        let a = points[i-1], b = points[i];
        if (a.z > b.z) [a,b] = [b,a];
        if (b.z <= near) continue;
        if (a.z < near) a = { side: a.side + (b.side-a.side)*(near-a.z)/(b.z-a.z), z: near };
        ctx.lineWidth = Math.max(.7, Math.min(5, 12/(a.z+b.z)));
        ctx.beginPath();
        ctx.moveTo(192 + focal*a.side/a.z, 108 + eye/a.z);
        ctx.lineTo(192 + focal*b.side/b.z, 108 + eye/b.z);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  const depth = new Float32Array(384);
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
    const indoors = CABINS.some(
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
          const sea = waterAt(wx,wy) && !onDock(wx,wy);
          const wet = sea || Math.sin(wx * 1.7 + wy * 2.3) + Math.sin(wx * 4.1 - wy * 1.3) > 1.18;
          const tile = wet ? floorTiles.water : floorTiles.base;
          const ripple = wet && !motion.matches ? 1.12 + 0.08 * Math.sin(t * 1.8 + wx * 3) : 1;
          const shade = rowShade * ripple;
          const warm = indoors ? 1.14 : 1.02;
          data[out] = tile[src] * shade * warm * (1 - fog) + 8 * fog;
          data[out + 1] = tile[src + 1] * shade * (1 - fog) + 13 * fog;
          data[out + 2] = tile[src + 2] * shade * (1 - fog) + 17 * fog + (sea ? 14 : 0);
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
    drawCableOnFloor(fov, eye);
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
        if (hit === 4 || (hit && waterAt(mx,my))) { hit = 0; continue; }
        if (hit) break;
      }
      const corrected = d * Math.cos(a - m.angle);
      depth[x] = depth[x + 1] = corrected;
      if (!hit) continue;
      const coastRock = !CABINS.some(([a,b,w,d]) => mx>=a && mx<a+w && my>=b && my<b+d);
      const wallHeight = coastRock ? 76 : 300;
      const h = Math.min(980, wallHeight / corrected),
        wx = m.x + dx * d,
        wy = m.y + dy * d;
      const edgeX = Math.abs(wx - Math.round(wx)),
        edgeY = Math.abs(wy - Math.round(wy));
      const u = edgeX < edgeY ? wy % 1 : wx % 1;
      const im =
        images[
          hit === 1 ? "parede-azulejo-quebrado" : hit === 3 ? "porta-pesada" : "parede-concreto-umido"
        ];
      const wallTop = 108 - (wallHeight-eye) / corrected;
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
      ctx.fillStyle = `rgba(3,8,17,${Math.min(0.88, (m.p.data.includes(systems[1].id)?0.14:0.2) + corrected / 50 + (edgeX < edgeY ? 0.06 : 0))})`;
      ctx.fillRect(x, wallTop, 2, h);
    }
    const objects = [
      ...sites, ...worldProps,
      nuloEntity(m, t),
      ...enemies.filter((e) => !e.dead).map((e) => ({ ...e, art: enemyArt(e), scale: e.hunter ? 1.08 : e.guardian ? 1.12 : 1 })),
    ].sort(
      (a, b) =>
        Math.hypot(b.x - m.x, b.y - m.y) - Math.hypot(a.x - m.x, a.y - m.y),
    );
    for (const o of objects) {
      const station = sites.includes(o), status = station ? siteStatus(m,o) : null;
      const im = images[o === systems[2] && status === 'online' ? 'terminal-estados-2' : o.art];
      if (!im) continue;
      const dx = o.x - m.x,
        dy = o.y - m.y,
        forward = dx * Math.cos(m.angle) + dy * Math.sin(m.angle),
        side = -dx * Math.sin(m.angle) + dy * Math.cos(m.angle);
      if (forward < 0.25 || (!station && Math.hypot(dx,dy)<.85)) continue;
      const sx = 192 + (side / forward) * 267,
        h = Math.min(430, 210 / forward)*(o.scale??1),
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
      ctx.globalAlpha = Math.max(0.1, 1 - forward / (m.p.data.includes(systems[1].id)?40:30));
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
      if (station && sx > 0 && sx < 384 && forward <= depth[sx | 0] + .1) {
        const k = Math.max(3, Math.min(14, 25/forward));
        ctx.globalAlpha = 1; ctx.fillStyle = '#101d22';
        ctx.fillRect(sx-k,top-k*1.5,k*2,k*1.45);
        ctx.fillStyle = statusColor[status];
        ctx.fillRect(sx-k,top-1,k*2,2);
        ctx.textAlign='center'; ctx.font=`bold ${Math.max(6,k)|0}px monospace`;
        ctx.fillText(o.code,sx,top-3); ctx.textAlign='left';
        if (scanFlash > 0 && scanned === o) {
          ctx.globalAlpha=scanFlash/.65; ctx.strokeStyle=statusColor.online;
          ctx.beginPath(); ctx.arc(sx,top+h*.4,k*(2.4-scanFlash),0,Math.PI*2); ctx.stroke();
        }
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
    }
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
    if(intro>0){ctx.fillStyle=`rgba(0,0,0,${Math.min(1,intro/1.6)})`;ctx.fillRect(0,0,384,216);}
    if(m.finished&&endClock>3.15){ctx.fillStyle=`rgba(0,0,0,${Math.min(1,(endClock-3.15)/.85)})`;ctx.fillRect(0,0,384,216);}
    // VHS/PSX finish: soft lens vignette, warm tape grade, scanlines, grain
    // and a low-bitrate timestamp. The flashlight is a screen-space cone so
    // the bay edges fall away even in the open yard.
    {
      const reach = m.lampOn ? 268 : 205;
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
    ctx.restore();
  }
  function render() {
    if (world3d?.available) {
      m.shake = shake;
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
    } else renderLegacy();
    if (m.finished && endClock > .55) drawBayReport(ctx, m);
    else if (mapOpen && !m.finished) drawServiceMap(ctx, m);
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
      shell.classList.toggle('fenda-aberta', currentSite(m) === anchor || m.p.completed);
      scanFlash = Math.max(0, scanFlash-dt);
      shake=Math.max(0,shake-dt);
      if(mode!=="2d")intro=Math.max(0,intro-dt);
      if (mode === "3d" && !m.finished) {
        m.p.elapsed += dt;
        coastAmbient(dt, m);
        updateScore(dt);
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
        m.dashCd = Math.max(0, m.dashCd - dt);
        if (m.dashT > 0) {
          m.dashT = Math.max(0, m.dashT - dt);
          move(m, Math.cos(m.dashDir) * 6.4 * dt, Math.sin(m.dashDir) * 6.4 * dt);
          shake = Math.max(shake, 0.08);
        }
        // O gerador online também alimenta a recarga local da lanterna.
        const charging = m.p.data.includes(systems[1].id) && Math.hypot(m.x-systems[1].x, m.y-systems[1].y) < 4.2;
        if (charging) m.lamp = Math.min(100, m.lamp + dt * 16);
        else if (m.lampOn) m.lamp = Math.max(0, m.lamp - dt * 0.32);
        m.p.lamp = m.lamp;
        m.p.lampOn = m.lampOn;
        if (m.lamp <= 0.5 && m.lampOn) {
          m.lampOn = false;
          message.textContent = "Sem carga. O gerador auxiliar recarrega a lanterna quando está online.";
          tone(74, 0.7, 0.02, "sawtooth");
        }
        // Respirar agachado, longe de caça, alivia a tensão.
        const hunterNear = enemies.some((e) => !e.dead && Math.hypot(e.x - m.x, e.y - m.y) < 11);
        if (!hunterNear && m.crouched && m.noise < 0.2) m.stress = Math.max(0, m.stress - dt * 1.6);
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
          // Uma baliza vinculada em partida anterior continua sendo respeitada.
          m.x = m.p.checkpoint === 'boia' ? 17.5 : entry.x;
          m.y = m.p.checkpoint === 'boia' ? 24.5 : entry.y;
          m.vx=m.vy=0;m.ward=3;
          m.stress = 25;
          message.textContent =
            "NEXO recuperou seu eco. Os sistemas ativos foram preservados.";
          tone(65, 0.7);
        }
        if (Math.hypot(m.vx, m.vy) > 0.4 && t - lastStep > (sprint?.32:crouch?.8:.55)) {
          lastStep = t;
          tone(surface==="madeira"?90:surface==="resina"?38:surface==="agua"?36:surface==="areia"?54:60, .09,crouch?.006:.018, "triangle");
          if(surface==="agua")noiseBurst(.14,crouch?.004:.012,900,.2);
          if(surface==="areia")noiseBurst(.11,crouch?.002:.006,520,-.1);
        }
        if (m.p.elapsed >= 600) {
          m.timedOut = m.finished = true;
          m.p.elapsed = 0; // outra janela na próxima visita; não apagar sistemas nem conceder vitória
          mapOpen = false;
          message.textContent = 'Janela encerrada. Retirada de emergência à Fenda; reentre para retomar.';
          tone(82, 1.2, .025, 'triangle');
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
        const nearEnemy = enemies.reduce((d,e)=>e.dead?d:Math.min(d,Math.hypot(e.x-m.x,e.y-m.y)),99);
        if((stepClock+=dt)>(m.crouched?.82:Math.hypot(m.vx,m.vy)>3?.37:.56)){
          stepClock=0;
          const wood=terrain(m)==="madeira";
          noiseBurst(wood?.07:.05, m.crouched?.0025:.0045+(wood?.001:0), wood?760:420, Math.random()*.5-.25);
          tone(wood?78:58, .06, m.crouched?.003:.006, "triangle");
        }
        if((beatClock+=dt)>(m.timedOut?.34:m.stress>30||nearEnemy<11?.46:.85)){beatClock=0;beat++;const notes=[55,65.406,73.416,61.735];tone(notes[Math.floor(beat/8)%4],1.5,.012,"triangle");if(m.stress>20||m.timedOut)tone(beat%2?42:84,.13,.025,"sine");if(m.timedOut)tone(220*(1+beat%3),.3,.014,"sawtooth");
          if(m.p.data.length===3&&beat%4===0)tone(330+beat%3*55,.55,.009,"sine");}
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
        const lamp = systems[1], rift = anchor;
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
          for (const e of enemies) {
            if (e.dead) continue;
            const dx=e.x-m.x, dy=e.y-m.y, dist=Math.hypot(dx,dy);
            if (dist < 9) {
              const pan=Math.max(-1,Math.min(1,(-dx*Math.sin(m.angle)+dy*Math.cos(m.angle))/9));
              noiseBurst(.16*(1-dist/10), .009*(1-dist/11), 300+dist*22, pan);
              if (dist < 5.5) tone(e.guardian?38:52, .35, .009, "sawtooth");
            }
          }
        }
        if (terrain(m) !== "madeira" && (dripClock += dt) > 3.7) {
          dripClock = 0;
          if (Math.random() > .45) tone(900 + Math.random() * 500, .16, .004, "sine");
        }
      }
      if (m.finished && mode === "3d") {
        endClock += dt;
        shell.classList.toggle('mare-overload', m.timedOut && endClock < 3.4);
        if (endClock > 4 && !exitRequested) { exitRequested = true; exit(); }
      }
      const next = nextObjective(m);
      readout.textContent = `ESTRUTURA HÚMIDA ${m.p.data.length}/3 · DOMÍNIO LOCAL ${m.p.rank}/4 · AMEAÇAS ${enemies.filter(e=>!e.dead&&e.phase!=='dissolve').length}/${enemies.length}`;
      hud.next.hidden = !next || mapOpen;
      if (next) {
        hud.nextAction.textContent = next.action;
        hud.nextDetail.textContent = next.label;
        hud.nextCount.textContent = `${next.have}/${next.need}`;
        hud.nextDist.textContent = `${next.distance} m`;
        const relative = relativeBearing(m, next.target);
        hud.nextArrow.style.transform = `rotate(${relative}deg)`;
        hud.target.style.display = Math.abs(relative) < 92 ? 'block' : 'none';
        hud.target.style.left = `${50 + Math.max(-50, Math.min(50, relative/92*50))}%`;
        hud.target.classList.toggle('chegou', next.distance <= 2);
      } else hud.target.style.display = 'none';
      world3d.setMarker?.(next?.target ?? null);
      const cue = mapOpen ? null : promptFor(m, scannerTarget(m));
      aside.dataset.kind = cue?.kind ?? '';
      hud.scanner.classList.toggle('em-alcance', cue?.kind === 'mission' || cue?.kind === 'lore');
      // É uma região viva: não anunciar o mesmo prompt sessenta vezes por segundo.
      if (aside.textContent !== (cue?.line ?? '')) aside.textContent = cue?.line ?? '';
      const secs = m.timedOut ? 0 : Math.max(0, 600-Math.floor(m.p.elapsed));
      const deg = ((90+m.angle*180/Math.PI)%360+360)%360;
      hud.heading.textContent = ['N','L','S','O'][Math.round(deg/90)%4];
      hud.bearing.textContent = `${String(Math.round(deg)%360).padStart(3,'0')}°`;
      if (hud.tension) hud.tension.style.width = `${Math.max(0, Math.min(100, m.stress))}%`;
      if (hud.tensionValue) hud.tensionValue.textContent = String(Math.round(m.stress));
      if (hud.stamina) hud.stamina.style.width = `${Math.max(0, Math.min(100, m.stamina))}%`;
      if (hud.clock) hud.clock.textContent = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
      if (hud.torch) {
        hud.torch.textContent = !m.lampOn ? "OFF" : `${Math.round(m.lamp)}%`;
        hud.torch.classList.toggle("falha", !m.lampOn || m.lamp < 18);
      }
      const zoneNow = zoneOf(m);
      coastZone = zoneNow;
      shell.dataset.zone = zoneNow;
      if (hud.zone) {
        const zoneNames = { pier: "PÍER DE ENTRADA", terminal: "GALPÕES", anchor: "ESTAÇÃO DA ÂNCORA", surf: "ARREBENTAÇÃO", fenda: "FENDA", praia: "PRAIA" };
        hud.zone.textContent = m.finished ? (m.timedOut ? "RETIRADA" : "PONTE ESTÁVEL") : zoneNames[zoneNow] ?? "PRAIA";
      }
      const liveEnemies = enemies.filter((e) => !e.dead && e.phase !== "dissolve");
      const nearestEnemy = Math.min(99, ...liveEnemies.map((e) => Math.hypot(e.x - m.x, e.y - m.y)));
      const threatLevel = Math.max(0, Math.min(4, Math.round((1 - Math.min(1, nearestEnemy / 17)) * 4) + (m.stress > 72 ? 1 : 0)));
      hud.threat.forEach((bar, i) => bar.classList.toggle("on", i < threatLevel));
      shell.dataset.threat = String(threatLevel);
      hud.steps.forEach((step,i) => {
        const status = siteStatus(m, systems[i]);
        step.classList.toggle('feito', status === 'online');
        step.classList.toggle('ativo', status === 'ready');
        step.setAttribute('aria-label', `${systems[i].label}: ${status === 'online' ? 'ativo' : status === 'ready' ? 'disponível' : 'sem rede'}`);
      });
      shell.classList.toggle("mare-abertura", intro > 0.45 && !m.finished);
      shell.classList.toggle("mare-mapa", mapOpen);
      shell.classList.toggle("mare-colapso", m.timedOut && endClock > 3.2);
      if (zoneNow !== lastZoneShown) {
        lastZoneShown = zoneNow;
        zoneClock = 1.8;
        shell.classList.remove("mare-virada");
        void shell.offsetWidth;
        shell.classList.add("mare-virada");
      }
      zoneClock = Math.max(0, zoneClock - dt);
      if (!zoneClock) shell.classList.remove("mare-virada");
      if (hud.noise) hud.noise.textContent = m.crouched ? "SILÊNCIO" : m.noise > 0.8 ? "ALTO" : m.noise > 0.2 ? "PASSOS" : "QUIETO";
      const nearestSite = next?.distance ?? 0;
      const barsOn = Math.max(1, Math.min(4, Math.round((1 - nearestSite / 30) * 4)));
      hud.signalBars.forEach((bar, i) => bar.classList.toggle("on", i < barsOn));
      if (hud.signalText) hud.signalText.textContent = m.finished ? (m.timedOut ? "PERDIDO" : "ESTÁVEL") : barsOn >= 3 ? "FORTE" : barsOn === 2 ? "INSTÁVEL" : "FRACO";
      shell.classList.toggle("mare-tenso", m.stress > 62);
      shell.classList.toggle("mare-cansado", m.stamina < 25);
      shell.classList.toggle("mare-escuro", m.lampOn === false);
      shell.classList.toggle("mare-esquiva", m.dashT > 0);
      shell.classList.toggle("mare-fim", m.finished);
      const threat = world3d?.state?.threat ?? 0;
      shell.classList.toggle("mare-perto", threat > 0.55 && !m.finished);
      render();
    },
    dispose() {
      disposed = true;
      abort.abort();
      keys.clear();
      if (document.pointerLockElement === canvas) document.exitPointerLock?.();
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
