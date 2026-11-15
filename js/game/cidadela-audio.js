// Efeitos sintetizados, opcionais e locais à Cidadela: nenhum arquivo ou
// contexto de áudio é carregado até o jogador habilitar o som com M.
const STORAGE_KEY='bloco404_cidadela_som';
const TONES=Object.freeze({
  step: {from:95,to:65,duration:.055,type:'triangle',volume:.012},
  step_reactor: {from:74,to:48,duration:.07,type:'sine',volume:.015},
  shot: {from:220,to:90,duration:.10,type:'square',volume:.025},
  elite_shot: {from:175,to:72,duration:.15,type:'sawtooth',volume:.026},
  reload: {from:180,to:240,duration:.11,type:'triangle',volume:.016},
  ready: {from:320,to:420,duration:.10,type:'sine',volume:.016},
  enemy: {from:320,to:160,duration:.13,type:'sawtooth',volume:.018},
  echo: {from:580,to:260,duration:.20,type:'triangle',volume:.028},
  ability: {from:260,to:540,duration:.22,type:'triangle',volume:.028},
  ultimate: {from:120,to:440,duration:.32,type:'sawtooth',volume:.022},
  pickup: {from:520,to:780,duration:.16,type:'sine',volume:.025},
  rare_drop: {from:660,to:1040,duration:.22,type:'triangle',volume:.026},
  key: {from:440,to:880,duration:.24,type:'triangle',volume:.026},
  craft: {from:360,to:720,duration:.22,type:'triangle',volume:.024},
  shield_deflect: {from:480,to:240,duration:.09,type:'square',volume:.018},
  parry_double: {from:560,to:920,duration:.18,type:'triangle',volume:.024},
  parry_q: {from:460,to:780,duration:.14,type:'triangle',volume:.022},
  radar_ping: {from:640,to:820,duration:.11,type:'sine',volume:.016},
  core_open: {from:340,to:680,duration:.16,type:'sine',volume:.02},
  phase2: {from:140,to:360,duration:.36,type:'sawtooth',volume:.024},
  damage: {from:150,to:75,duration:.16,type:'triangle',volume:.028},
  victory: {from:280,to:680,duration:.34,type:'sine',volume:.03},
  trophy: {from:440,to:980,duration:.38,type:'triangle',volume:.028},
  secret: {from:392,to:587,duration:.28,type:'sine',volume:.024},
  overdrive: {from:190,to:580,duration:.26,type:'sawtooth',volume:.026},
  explosion: {from:115,to:38,duration:.32,type:'sawtooth',volume:.036},
  melee: {from:280,to:110,duration:.09,type:'triangle',volume:.024},
  shield: {from:420,to:660,duration:.18,type:'sine',volume:.022},
});
let context=null, enabled, active=0;
function readEnabled() {
  if(enabled===undefined) {
    try { enabled=globalThis.localStorage?.getItem(STORAGE_KEY)==='1'; }
    catch { enabled=false; }
  }
  return enabled;
}
export function citadelAudioEnabled() { return readEnabled(); }
function ensureContext() {
  if(context && context.state!=='closed') return context;
  const Ctor=globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if(!Ctor) return null;
  try { context=new Ctor(); return context; } catch { return null; }
}
// Só deve ser chamado por uma ação explícita do jogador.
export function toggleCitadelAudio() {
  if(readEnabled()) {
    enabled=false;
  } else {
    const c=ensureContext();
    if(!c) return false;
    enabled=true;
    try { c.resume?.()?.catch?.(()=>{}); } catch { /* Navegador pode bloquear áudio. */ }
  }
  try { globalThis.localStorage?.setItem(STORAGE_KEY,enabled?'1':'0'); } catch { /* preferência opcional */ }
  return enabled;
}
export function playCitadelSound(name) {
  const tone=TONES[name];
  if(!readEnabled() || !tone || active>=8) return;
  const c=ensureContext(); if(!c) return;
  // Sem um gesto válido, navegadores podem manter o contexto suspenso.
  if(c.state==='suspended') { try { c.resume?.()?.catch?.(()=>{}); } catch {} return; }
  try {
    const now=c.currentTime, osc=c.createOscillator(), gain=c.createGain();
    osc.type=tone.type;osc.frequency.setValueAtTime(tone.from,now);
    osc.frequency.exponentialRampToValueAtTime(tone.to,now+tone.duration);
    gain.gain.setValueAtTime(tone.volume,now);gain.gain.exponentialRampToValueAtTime(.0001,now+tone.duration);
    osc.connect(gain);gain.connect(c.destination);
    osc.onended=()=>{active=Math.max(0,active-1);osc.disconnect();gain.disconnect();};
    osc.start(now);osc.stop(now+tone.duration);active++;
  } catch { /* Áudio é acessório e nunca bloqueia o jogo. */ }
}
