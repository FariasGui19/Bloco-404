// Ambiente opcional, sem downloads ou autoplay. Só cria o AudioContext depois
// do clique no botão; três fontes fixas são reutilizadas durante a sessão.
let context=null, mix=null, drone=null, hiss=null, tension=null, enabled=false, last=-1;
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
    }
    enabled=true;context.resume().catch(()=>{});return true;
  } catch {enabled=false;return false;}
}
export function atualizarAudioCromatico(active, danger) {
  if(!context||!enabled)return;
  const desired=active? (danger?2:1):0;
  if(desired===last)return;
  last=desired;
  try {const now=context.currentTime;mix.gain.setTargetAtTime(active?.22:0,now,.45);tension.gain.setTargetAtTime(danger?.035:0,now,.4);}
  catch { /* O áudio não pode interromper a missão. */ }
}
