import {details,nearestSignal,useDetail,terrain,createPursuit,enemyArt,hurtEnemy,visible} from './mare-mission-life.js';
import {lore as loreProps,useLore} from './mare-mission-lore.js';
import {combatProps,isInteractiveCombat,useCombatProp} from './mare-mission-combat.js';
import {lote5Props,isInteractiveLote5,lote5Complete,lote5Readout,useLote5} from './mare-mission-lote5.js';
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
  shell.innerHTML = `<canvas width="384" height="216" tabindex="0" aria-label="Baía infectada em primeira pessoa"></canvas><header><small>MARÉ CROMÁTICA / BAÍA DE QUARENTENA</small><h1>A ÂNCORA NÃO RESPONDE</h1></header><aside aria-live="polite"></aside><footer><p class="mare-readout"></p><p class="mare-message">Recupere 3 memórias nas cabanas. Recompile no terminal central; alcance a âncora a sudeste. Nulo ameaça romper a contenção em 10 minutos.</p><p>WASD mover · ← → / arrastar olhar · E interagir · F golpe · Q pulso (fere e dissolve) · SHIFT correr · C agachar · ESC retornar sem perdas</p><button data-audio>ÁUDIO: OFF</button><button data-action>INTERAGIR</button><button data-power>HABILIDADE</button><button data-attack>GOLPE</button><button data-exit>RETORNAR</button><label> VOLUME <input data-volume type="range" min="0" max="100" value="55" aria-label="Volume da missão"></label></footer><nav aria-label="Movimento"><button data-key="KeyW">↑</button><button data-key="KeyA">←</button><button data-key="KeyS">↓</button><button data-key="KeyD">→</button><button data-key="ArrowLeft">↶</button><button data-key="ArrowRight">↷</button><button data-key="ShiftLeft">CORRER</button><button data-key="KeyC">BAIXAR</button></nav>`;
  mount.append(shell);
  const canvas = shell.querySelector("canvas"),
    ctx = canvas.getContext("2d", { alpha: false }),
    readout = shell.querySelector(".mare-readout"),
    message = shell.querySelector(".mare-message");
  ctx.imageSmoothingEnabled = false;
  const extraNames = ["retrato","radio","gerador","boia","armario","rede","sino","valvula","infectado-preparo","infectado-golpe"];
  const lote3Names = ["diario-faroleiro","lente-farol","mapa-evacuacao","maca-quarentena","prontuario-quarentena","caixa-sinal","infectado-busca","infectado-escuta","infectado-atordoado","infectado-erguendo"];
  const lote4Names = ["infectado-golpe-baixo","infectado-golpe-alto","infectado-dano","infectado-dissolvido","casulo-mare","eco-operador","painel-contencao","cabo-energia","lanterna-sinal","porta-fenda"];
  const lote5Names = ["caldeira-sala","tubo-vapor","cristal-mare","valvula-pressao","painel-recompilacao","selo-recompilado","guardiao-mare","guardiao-dano","porta-recompilacao","piso-metal"];
  const artDir = (n) => lote5Names.includes(n) ? "mare-missao-lote5" : lote4Names.includes(n) ? "mare-missao-lote4" : lote3Names.includes(n) ? "mare-missao-lote3" : extraNames.includes(n) ? "mare-missao-lote2" : "mare-missao-base";
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
      [...names,...extraNames,...lote3Names,...lote4Names,...lote5Names].map(async (n) => {
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
  let disposed = false,
    t = 0,
    saveClock = 0,
    lastStep = 0,
    endClock = 0,
    drag = false,
    lastX = 0,
    audio = null,
    enabled = false,
    drone = null, master=null, activeFrame=false, beatClock=0, beat=0, breathClock=0, shake=0, intro=1.6, pulse=0, hurtFlash=0, hazardClock=0, attackClock=0, swing=0;
  const pursuit=createPursuit(), motion=matchMedia("(prefers-reduced-motion: reduce)"), aside=shell.querySelector("aside");
  const hazardProp=combatProps.find(p=>p.kind==="hazard"), lightProp=combatProps.find(p=>p.kind==="light");
  const enemies = [
    { x: 27, y: 16 },
    { x: 4, y: 17, guardian: true },
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
  const signals = () => [
    ...sites.filter((s) => !m.p.data.includes(s.id)),
    ...details.filter((d) => !m.p.details[d.id] || d.id === "radio" || d.id === "sino"),
    ...loreProps.filter((d) => !m.p.lore.includes(d.id)),
    ...combatProps.filter(isInteractiveCombat),
    ...lote5Props.filter(isInteractiveLote5),
  ];
  function action() {
    if(m.finished)return;
    const near = nearestSignal(m,signals());
    const beforeLore = m.p.lore.length;
    const machine = isInteractiveLote5(near) ? useLote5(m, near) : null;
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
        "KeyE",
        "KeyQ",
        "Space", "ShiftLeft", "ShiftRight", "KeyC",
      ].includes(e.code)
    ) {
      e.preventDefault();
      keys.add(e.code);
    }
    if (e.code === "KeyE") action();
    if (e.code === "KeyQ") power();
    if (e.code === "KeyF") attack();
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
      }
    } else audio?.suspend();
    } catch {enabled=false;e.target.textContent="ÁUDIO: INDISPONÍVEL";}
  };
  const depth = new Float32Array(384);
  function render() {
    ctx.save();
    if(shake>0&&!motion.matches)ctx.translate(Math.round(Math.sin(t*73)*shake*10),Math.round(Math.cos(t*59)*shake*6));
    const eye=(m.crouched?65:95)+(!motion.matches&&m.noise>0?Math.sin(t*(m.noise>.8?13:9))*1.2:0);
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
      ctx.globalAlpha = 0.22;
      ctx.drawImage(images["piso-metal"], 0, 108, 384, 108);
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
        108 - (190-eye) / corrected,
        2,
        h,
      );
      ctx.fillStyle = `rgba(3,8,17,${Math.min(0.94, (m.p.details.gerador?0.14:0.2) + corrected / 27 + (edgeX < edgeY ? 0.12 : 0))})`;
      ctx.fillRect(x, 108 - (190-eye) / corrected, 2, h);
    }
    const objects = [
      ...sites.filter((s) => !m.p.data.includes(s.id)),
      ...details.map((d) => ({ ...d, scale: d.scale * 0.72 })),
      ...loreProps.map((d) => ({ ...d, scale: d.scale * 0.72 })),
      ...combatProps.map((d) => ({ ...d, scale: d.scale * 0.8 })),
      ...lote5Props.map((d) => ({ ...d, scale: d.scale * 0.8 })),
      { x: 16, y: 5, art: "nulo" },
      ...enemies.filter((e) => !e.dead).map((e) => ({ ...e, art: enemyArt(e), scale: e.guardian ? 1.12 : 1 })),
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
        h = Math.min(350, 175 / forward)*(o.scale??1),
        im = images[o.art],
        w = (h * im.width) / im.height,
        top =
          108 +
          eye / forward -
          h +
          ((o.art.startsWith("infectado") || o.art.startsWith("guardiao")) && !motion.matches
            ? Math.sin(t * 7 + o.x) * Math.min(2, h * 0.025)
            : 0) +
          (o.art === "tubo-vapor" && !motion.matches ? Math.sin(t * 2.2 + o.x) * Math.min(3, h * 0.03) : 0);
      ctx.globalAlpha = Math.max(0.1, 1 - forward / (m.p.details.gerador?40:30));
      if (o.art === "selo-recompilado") ctx.globalAlpha *= 0.72 + 0.28 * Math.sin(t * 2.4);
      if (o.art === "tubo-vapor") {
        ctx.fillStyle = `rgba(196,236,229,${0.05 + 0.04 * Math.sin(t * 1.7)})`;
        ctx.fillRect(sx - 2, top - 5, 4, 4);
      }
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
      ctx.globalAlpha = 1;
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
      const detailCount=Object.keys(m.p.details).filter(k=>details.some(d=>d.id===k)).length;
      ctx.fillStyle="rgba(3,9,13,.94)";ctx.fillRect(52,46,280,120);
      ctx.strokeStyle="#537379";ctx.strokeRect(52.5,46.5,279,119);
      ctx.font="11px monospace";ctx.fillStyle="#c0e7da";ctx.fillText("RELATÓRIO DE ECO",68,64);
      ctx.font="9px monospace";ctx.fillStyle="#9bbdb6";
      ctx.fillText(`DESCOMPASSO ${m.p.rank}/4 · MEMÓRIAS ${m.p.data.length}/3`,68,82);
      ctx.fillText(`REGISTROS ${detailCount}/8 · LORE ${m.p.lore.length}/6`,68,96);
      ctx.fillText(`BALIZA ${m.p.checkpoint==="boia"?"VINCULADA":"NÃO VINCULADA"} · FÔLEGO ${Math.round(m.stamina)}`,68,110);
      ctx.fillStyle="#e0b56a";ctx.fillText(m.p.lore.length>=4?'NULO: “O farol reconhece você.”':'NULO: “O silêncio também é um registro.”',68,128);
      ctx.fillStyle="#c0e7da";ctx.fillText("A ponte do Limiar aceitará seu eco.",68,146);
    }
    if(intro>0){ctx.fillStyle=`rgba(0,0,0,${Math.min(1,intro/1.6)})`;ctx.fillRect(0,0,384,216);}
    if(m.finished&&endClock>3.15){ctx.fillStyle=`rgba(0,0,0,${Math.min(1,(endClock-3.15)/.85)})`;ctx.fillRect(0,0,384,216);}
    ctx.restore();
  }
  return {
    mission: m,
    enemies,
    frame(dt, { mode }) {
      if (disposed) return;
      dt = Math.max(0, Math.min(dt, 0.05));
      t += dt;
      activeFrame=mode==="3d";
      shell.classList.toggle("recompilado", lote5Complete(m));
      shake=Math.max(0,shake-dt);
      if(activeFrame)intro=Math.max(0,intro-dt);
      if (mode === "3d" && !m.finished) {
        m.p.elapsed += dt;
        m.cooldown = Math.max(0, m.cooldown - dt);
        m.ward = Math.max(0, m.ward - dt);
        pulse=Math.max(0,pulse-dt);
        hurtFlash=Math.max(0,hurtFlash-dt);
        attackClock=Math.max(0,attackClock-dt);
        swing=Math.max(0,swing-dt);
        m.angle +=
          ((keys.has("ArrowRight") ? 1 : 0) - (keys.has("ArrowLeft") ? 1 : 0)) *
          dt *
          1.9;
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
        if(m.stamina<25&&(breathClock+=dt)>2.6){breathClock=0;tone(190+Math.random()*30,.5,.018,"sine");tone(420,.18,.008,"sine");}
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
      readout.textContent = `DESCOMPASSO LOCAL ${m.p.rank}/4 · DADOS ${m.p.data.length}/3 · ${Math.max(0, 600 - Math.floor(m.p.elapsed))}s · FÔLEGO ${Math.round(m.stamina)} · ${m.crouched?"SILENCIOSO":m.noise>.8?"PASSOS ALTOS":"CAMINHANDO"} · REGISTROS ${Object.keys(m.p.details).filter(k=>details.some(d=>d.id===k)).length}/8 · LORE ${m.p.lore.length}/6 · TENSÃO ${Math.round(m.stress)} · AMEAÇAS ${enemies.filter(e=>!e.dead&&e.phase!=="dissolve").length}/${enemies.length} · Q ${Math.ceil(m.cooldown)}s · ${lote5Readout(m)}`;
      const near = nearestSignal(m,signals());
      aside.textContent = near
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
