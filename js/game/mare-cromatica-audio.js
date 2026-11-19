// Ambiente opcional, sem downloads ou autoplay. Só cria o AudioContext depois
// do clique no botão; fontes fixas são reutilizadas durante a sessão.
let context=null, mix=null, drone=null, hiss=null, tension=null, fogo=null, enabled=false, last=-1, lastFogo=-1;
export function ativarAudioCromatico() {
  if(enabled){enabled=false;context?.suspend?.().catch(()=>{});return false;}
  const Audio=globalThis.AudioContext ?? globalThis.webkitAudioContext;if(!Audio)return false;
  try {
    if(!context) {
      context=new Audio();mix=context.createGain();mix.gain.value=0;mix.connect(context.destination);
      const osc=context.createOscillator();osc.type='sine';osc.frequency.value=55;drone=context.createGain();drone.gain.value=.10;osc.connect(drone);drone.connect(mix);osc.start();
      const pulse=context.createOscillator();pulse.type='triangle';pulse.frequency.value=109;tension=context.createGain();tension.gain.value=0;pulse.connect(tension);tension.connect(mix);pulse.start();
      const buffer=context.createBuffer(1,context.sampleRate*2,context.sampleRate),data=buffer.getChannelData(0);
      // Ruído determinístico e suavizado, sem alocações por quadro.
      let seed=403,prev=0;for(let i=0;i<data.length;i++){seed=(seed*1664525+1013904223)>>>0;prev=.88*prev+.12*(seed/2147483648-1);data[i]=prev;}
      const source=context.createBufferSource();source.buffer=buffer;source.loop=true;hiss=context.createGain();hiss.gain.value=.045;source.connect(hiss);hiss.connect(mix);source.start();
      // Fogo usa o mesmo ruído em um filtro; só aparece quando aceso e próximo.
      const filtroFogo=context.createBiquadFilter();filtroFogo.type='highpass';filtroFogo.frequency.value=900;fogo=context.createGain();fogo.gain.value=0;source.connect(filtroFogo);filtroFogo.connect(fogo);fogo.connect(mix);
      // Dois harmônicos suaves sustentam uma nota de vigília sob o ruído do mar.
      // Osciladores contínuos e LFO lento: sem sequenciadores nem alocações por quadro.
      const harmony=context.createGain();harmony.gain.value=.008;harmony.connect(mix);
      for(const hz of [164.81,220]){const note=context.createOscillator();note.type='sine';note.frequency.value=hz;note.connect(harmony);note.start();}
      const breath=context.createOscillator(),depth=context.createGain();breath.type='sine';breath.frequency.value=.04;depth.gain.value=.003;breath.connect(depth);depth.connect(harmony.gain);breath.start();
      // Maré grave e rangido: modulações fixas, sem buffers por quadro.
      const swell=context.createOscillator(),swellDepth=context.createGain();swell.type='sine';swell.frequency.value=.085;swellDepth.gain.value=.016;swell.connect(swellDepth);swellDepth.connect(hiss.gain);swell.start();
      const wood=context.createOscillator(),woodGain=context.createGain(),woodLfo=context.createOscillator(),woodDepth=context.createGain();
      wood.type='triangle';wood.frequency.value=92;woodGain.gain.value=.005;woodLfo.frequency.value=.055;woodDepth.gain.value=.003;woodLfo.connect(woodDepth);woodDepth.connect(woodGain.gain);wood.connect(woodGain);woodGain.connect(mix);wood.start();woodLfo.start();
    }
    enabled=true;context.resume().catch(()=>{});return true;
  } catch {enabled=false;return false;}
}
export function atualizarAudioCromatico(active, danger, proximidadeFogo=0) {
  if(!context||!enabled)return;
  const desired=active? (danger?2:1):0;
  const fire=active && Number.isFinite(proximidadeFogo)?Math.round(Math.max(0,Math.min(1,proximidadeFogo))*10)/10:0;
  if(desired===last && fire===lastFogo)return;
  last=desired;lastFogo=fire;
  try {const now=context.currentTime;mix.gain.setTargetAtTime(active?.22:0,now,.45);tension.gain.setTargetAtTime(active && danger?.035:0,now,.4);fogo.gain.setTargetAtTime(fire*.045,now,.3);}
  catch { /* O áudio não pode interromper a missão. */ }
}
