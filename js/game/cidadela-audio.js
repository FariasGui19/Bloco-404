// Efeitos sintetizados, opcionais e locais à Cidadela: nenhum arquivo ou
// contexto de áudio é carregado até o jogador habilitar o som com M.
const STORAGE_KEY='bloco404_cidadela_som';
const TONES=Object.freeze({
  shot: {from:220,to:90,duration:.10,type:'square',volume:.025},
  enemy: {from:320,to:160,duration:.13,type:'sawtooth',volume:.018},
  echo: {from:580,to:260,duration:.20,type:'triangle',volume:.028},
  ability: {from:260,to:540,duration:.22,type:'triangle',volume:.028},
  ultimate: {from:120,to:440,duration:.32,type:'sawtooth',volume:.022},
  pickup: {from:520,to:780,duration:.16,type:'sine',volume:.025},
  damage: {from:150,to:75,duration:.16,type:'triangle',volume:.028},
  victory: {from:280,to:680,duration:.34,type:'sine',volume:.03},
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
