import { IMMERSIVE_MODE } from '../game/immersive-view-manager.js';
import { worldToScreen } from '../engine/camera.js';
import { immersiveSoundEnabled, toggleImmersiveSound } from './immersive-audio.js';

const reducedMotion = () => !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));

export function initImmersiveView(manager) {
  const el = id => document.getElementById(id);
  const root = el('immersiveView'), background = el('immersiveBackground'), frame = el('immersiveCaveFrame');
  const capy = el('immersiveCapybara'), effects = el('immersiveEffects');
  const title = el('immersiveTitle'), subtitle = el('immersiveSubtitle'), message = el('immersiveMessage');
  const one = el('immersiveAction1'), two = el('immersiveAction2'), exit = el('immersiveExit'), sound = el('immersiveSound');
  if (!root || !effects) return () => {};
  // Carrega antes da entrada para não fazer o fade sobre imagens vazias.
  for (const src of ['assets/sprites/enseada-imersiva/fonte.jpg', 'assets/sprites/enseada-imersiva/gruta.jpg']) {
    const image = new Image(); image.src = src;
  }
  root.addEventListener('pointermove', event => {
    if (!reducedMotion()) manager.look(event.clientX, event.clientY, window.innerWidth, window.innerHeight);
  });
  one?.addEventListener('click', () => manager.action(1));
  two?.addEventListener('click', () => manager.action(2));
  exit?.addEventListener('click', () => manager.exit());
  sound?.addEventListener('click', () => {
    const on = toggleImmersiveSound(); sound.textContent = on ? 'SOM LIGADO' : 'SOM DESLIGADO';
    sound.setAttribute('aria-pressed', String(on));
  });
  let lastScene = null;
  return function renderImmersive(dt, gameCanvas) {
    const active = manager.active, scene = manager.scene;
    document.body.classList.toggle('immersive-active', active && !!scene);
    if (manager.mode === IMMERSIVE_MODE.QUICK) {
      root.hidden = true;
      drawQuickFeedback(gameCanvas, manager);
      lastScene = null;
      return;
    }
    if (!active || !scene) { root.hidden = true; lastScene = null; return; }
    if (manager.mode === IMMERSIVE_MODE.ENTERING) drawQuickFeedback(gameCanvas, manager);
    root.hidden = false; root.dataset.scene = scene;
    root.style.opacity = String(manager.alpha);
    root.style.pointerEvents = manager.mode === IMMERSIVE_MODE.FIRST_PERSON_DIORAMA ? 'auto' : 'none';
    if (lastScene !== scene) {
      title.textContent = scene === 'fonte' ? 'Fonte da Capivara' : 'Abrigo da Concha';
      subtitle.textContent = scene === 'fonte' ? 'ÁGUAS DA ENSEADA · UM INSTANTE PARA RESPIRAR' : 'UM ABRIGO DE MADREPÉROLA DIANTE DO MAR';
      one.innerHTML = scene === 'fonte' ? '<b>1</b> Fazer carinho' : '<b>1</b> Observar o horizonte';
      two.innerHTML = scene === 'fonte' ? '<b>2</b> Submergir / relaxar' : '<b>2</b> Descansar';
      sound.textContent = immersiveSoundEnabled() ? 'SOM LIGADO' : 'SOM DESLIGADO';
      sound.setAttribute('aria-pressed', String(immersiveSoundEnabled()));
      lastScene = scene;
    }
    message.textContent = manager.message || 'MOVA O MOUSE PARA OLHAR AO REDOR';
    two.setAttribute('aria-pressed', String(manager.relaxing));
    const still = reducedMotion(), x = still ? 0 : manager.lookX, y = still ? 0 : manager.lookY;
    const t = still ? 0 : performance.now() / 1000;
    background.style.transform = `translate(${(-x*1.5).toFixed(2)}%, ${(-y*1.2).toFixed(2)}%) scale(1.03)`;
    frame.style.transform = `translate(${(-x*3).toFixed(2)}%, ${(-y*2).toFixed(2)}%) scale(1.03)`;
    const pet = manager.petTime > 0 ? Math.sin((2.4-manager.petTime)*7)*4 : 0;
    capy.style.transform = `translate(calc(-50% + ${(-x*18).toFixed(1)}px), ${(-y*12 + Math.sin(t*1.8)*5).toFixed(1)}px) rotate(${pet.toFixed(1)}deg)`;
    drawEffects(effects, scene, manager, t, still);
  };
}

function drawEffects(canvas, scene, manager, t, still) {
  const g = canvas.getContext('2d'); if (!g) return;
  const w = canvas.width, h = canvas.height;
  g.clearRect(0,0,w,h);
  const climate = manager.state.clima ?? {};
  // Usa a iluminação e a chuva interpoladas do mesmo estado do mapa. O jogo
  // ainda não possui relógio dia/noite independente; não fabrica um horário.
  const darkness = clamp((1 - (climate.luz ?? 1)) * .70, 0, .4);
  if (darkness) { g.fillStyle = `rgba(12,30,48,${darkness})`; g.fillRect(0,0,w,h); }
  const rain = clamp(climate.chuva ?? 0,0,1);
  if (rain > .01) {
    g.save();
    // Na gruta, a chuva aparece apenas do lado de fora da moldura.
    if (scene === 'gruta') { g.beginPath(); g.moveTo(125,170); g.quadraticCurveTo(150,25,320,22); g.quadraticCurveTo(510,30,530,175); g.lineTo(540,300); g.lineTo(100,300); g.closePath(); g.clip(); }
    g.lineWidth = .7; g.strokeStyle = `rgba(215,245,255,${.25 + rain*.36})`;
    for (let i=0; i<Math.round(65*rain); i++) {
      const x = (i*97.3 + (still ? 0 : t*24))%w, y = (i*61.7 + (still ? 0 : t*(150+i%4*18)))%h;
      g.beginPath(); g.moveTo(x,y); g.lineTo(x-3,y+8); g.stroke();
    }
    g.restore();
  }
  if (scene === 'fonte') {
    g.lineWidth=1.1;
    for (let i=0;i<6;i++) {
      const f=(t*.18+i/6)%1, x=85+i*95, y=245+i%2*25;
      g.strokeStyle=`rgba(208,255,247,${.20*(1-f)})`;
      g.beginPath();g.ellipse(x,y,7+f*30,2+f*8,0,0,Math.PI*2);g.stroke();
    }
    for (let i=0;i<8;i++) {
      const f=(t*.12+i/8)%1, x=100+i*65+Math.sin(t+i)*5, y=250-f*100;
      g.strokeStyle=`rgba(242,255,247,${.09*Math.sin(f*Math.PI)})`;g.lineWidth=7;
      g.beginPath();g.moveTo(x,y+16);g.quadraticCurveTo(x+12,y,x+2,y-15);g.stroke();
    }
    if (manager.relaxing) {
      for (let i=0;i<10;i++) {
        const f=(t*.35+i/10)%1;
        g.strokeStyle=`rgba(222,255,255,${.6*(1-f)})`;g.lineWidth=1;
        g.beginPath();g.arc(200+(i*47)%245,340-f*85,2+f*3,0,Math.PI*2);g.stroke();
      }
    }
    if (manager.petTime > 0) {
      // Luva estilizada entra pelo primeiro plano; corações indicam reação.
      const progress = Math.sin(Math.PI * (1-manager.petTime/2.4));
      g.save();g.translate(440-progress*30,330-progress*90);g.rotate(-.25);
      g.fillStyle='#f4d7ae';g.strokeStyle='#764f42';g.lineWidth=3;
      g.beginPath();g.moveTo(0,70);g.lineTo(-10,16);g.quadraticCurveTo(-11,4,-3,3);g.lineTo(3,25);g.lineTo(3,-2);g.quadraticCurveTo(4,-11,10,-9);g.lineTo(13,24);g.lineTo(15,2);g.quadraticCurveTo(18,-7,23,-3);g.lineTo(24,28);g.lineTo(30,17);g.quadraticCurveTo(35,12,39,19);g.lineTo(34,54);g.lineTo(24,70);g.closePath();g.fill();g.stroke();g.restore();
      g.fillStyle='rgba(255,213,218,.9)';g.font='bold 18px sans-serif';g.fillText('♥',348,165-progress*20);g.fillText('♥',286,177-progress*12);
    }
  }
}

function drawQuickFeedback(canvas, manager) {
  if (!canvas || !manager.object) return;
  const c = canvas.getContext('2d'), p = worldToScreen(manager.object.x, manager.object.y), dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const f = clamp(manager.time / (manager.scene ? .7 : .48),0,1), alpha = Math.sin(f*Math.PI);
  const player = worldToScreen(manager.state.player.x, manager.state.player.y);
  const id = manager.object.id, warm = id === 'acampamento_vigilia_enseada' || id === 'enseada_banco_tronco_camp';
  c.save();c.setTransform(dpr,0,0,dpr,0,0);c.strokeStyle=warm ? `rgba(255,202,117,${alpha*.85})` : `rgba(157,255,226,${alpha*.8})`;c.lineWidth=2;
  c.beginPath();c.ellipse(p.x,p.y-18,12+f*24,5+f*8,0,0,Math.PI*2);c.stroke();
  // Um gesto curto acompanha o personagem nos marcos; a posição física não muda.
  if (['totem_eco_enseada','estela_navegadores_enseada','espelho_arquetipos_enseada','carrilhao_vento_enseada'].includes(id)) {
    const dx = p.x-player.x, dy = (p.y-25)-(player.y-18), length = Math.hypot(dx,dy) || 1;
    c.lineWidth=3; c.lineCap='round'; c.beginPath();c.moveTo(player.x,player.y-18);
    c.lineTo(player.x+dx/length*16*alpha,player.y-18+dy/length*16*alpha);c.stroke();
  }
  c.restore();
}
