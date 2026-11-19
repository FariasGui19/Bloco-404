// Música e foley originais, sintetizados localmente uma vez no opt-in. As
// caudas passam pelo início do loop sem clique; a mixagem depois só muda gains.
const TAU=Math.PI*2, RATE=16000;
const note=midi=>440*2**((midi-69)/12);
const clamp=value=>Math.max(0,Math.min(1,value));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const env=(t,d,a,r)=>smooth(t/a)*smooth((d-t)/r);
const CHORDS=[[38,45,53,57,64],[34,46,53,57,62],[43,50,55,58,62],[33,45,52,55,62],
  [38,45,53,57,64],[34,46,53,57,65],[43,50,55,58,67],[33,45,52,56,62]];

export function sintetizarPartitura(rate=RATE) {
  const barra=4, data=new Float32Array(barra*CHORDS.length*rate);
  const layer=(start,len,midi,volume,bell=false)=>{
    const hz=note(midi), origin=Math.floor(rate*start),samples=Math.round(rate*len);
    for(let i=0;i<samples;i++){
      const t=i/rate,x=TAU*hz*t;
      const e=bell?Math.exp(-1.35*t)*env(t,len,.027,.34):env(t,len,1.38,1.52);
      const wave=bell? .71*Math.sin(x)+.27*Math.sin(x*2.007)*Math.exp(-1.7*t)+.12*Math.sin(x*3.014)*Math.exp(-3*t)
        : .73*Math.sin(x+.24*Math.sin(t*1.4))+.17*Math.sin(x*1.0031)+.095*Math.sin(x*2);
      data[(origin+i)%data.length]+=wave*e*volume;
    }
  };
  for(let i=0;i<CHORDS.length;i++){
    const c=CHORDS[i],t=i*barra;
    for(let j=0;j<c.length-1;j++)layer(t+.08*j,barra+1.5,c[j],j===0?.105:.052);
    for(const [at,pitch,amp] of [[.38,c[3],.16],[1.68,c[4],.14],[2.88,c[2]+12,.105]]){
      layer(t+at,2.8,pitch,amp,true);layer(t+at+.39,2.2,pitch,.24*amp,true);
    }
  }
  return data;
}

// Foley: surf uses band-shaped white noise with separate wash/hiss, low
// hull resonance is a flexing two-tone groan, and water calls are rare.
export const DOCAS_FOLEY=['ondas','madeira','sino','abismo'];
export function sintetizarFoley(kind,rate=RATE) {
  const duration={ondas:12,madeira:16,sino:24,abismo:18}[kind];
  const data=new Float32Array(duration*rate);
  let seed=49405, slow=0, fast=0;
  for(let i=0;i<data.length;i++){
    const t=i/rate;
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const noise=seed/2147483648-1;
    slow+=.018*(noise-slow);fast+=.43*(noise-fast);
    if(kind==='ondas'){
      const power=.12+.54*Math.sin(t/duration*TAU*2+.26)**4+.15*Math.sin(t/duration*TAU)**2;
      const boom=Math.sin(TAU*43*t)*.05*Math.sin(t/duration*TAU)**4;
      data[i]=(fast*.48+slow*2)*power+boom;
    }else if(kind==='madeira'){
      const q=(t%8)-.42,len=2.1;
      const bends=TAU*(114*q+9*q*q+1.65*Math.sin(q*3.8));
      data[i]=q>0&&q<len?env(q,len,.28,.72)*(.16*Math.sin(bends)+.074*Math.sin(bends*1.72)+.17*(fast-slow)):0;
    }else if(kind==='sino'){
      const q=t<8?t-5.1:t-15.2;
      data[i]=q>0&&q<3.7?env(q,3.7,.045,.4)*Math.exp(-q*1.6)*(.31*Math.sin(TAU*328*q)+.14*Math.sin(TAU*704*q)+.08*Math.sin(TAU*1039*q)):0;
    }else if(kind==='abismo'){
      const q=t-1.2,len=5.6;
      const bend=TAU*(54*q+5*Math.sin(q*.92)+1.4*q*q);
      data[i]=q>0&&q<len?env(q,len,1.15,2.1)*(.30*Math.sin(bend)+.18*slow+.055*Math.sin(bend*2.05)):0;
    }
    // Join both ends at zero to avoid a hard seam in the texture loop.
    data[i]*=env(t,duration,.075,.075);
  }
  return data;
}

const canais=['trilha',...DOCAS_FOLEY];
const niveis=[.32,.38,.24,.20,.22];
export function criarPaisagemDocas(context,mix) {
  return canais.map((kind,i)=>{
    const samples=i?sintetizarFoley(kind):sintetizarPartitura();
    const buffer=context.createBuffer(1,samples.length,RATE);
    buffer.getChannelData(0).set(samples);
    const src=context.createBufferSource(),gain=context.createGain();
    const pan=context.createStereoPanner?.();
    gain.gain.value=0;src.buffer=buffer;src.loop=true;src.connect(gain);
    if(pan){gain.connect(pan);pan.connect(mix);}else gain.connect(mix);
    src.start();
    return {kind,gain,pan,lastGain:-1,lastPan:-2};
  });
}

export function atualizarPaisagemDocas(channels,now,scene,alerta) {
  if(!channels)return;
  for(let i=0;i<channels.length;i++){
    const channel=channels[i],local=scene?.[channel.kind];
    const level=!scene?0:i?clamp(local?.gain||0):alerta?.62:1;
    const gain=Math.round(level*20)/20*niveis[i];
    const pan=i && scene?Math.max(-1,Math.min(1,Math.round((local?.pan||0)*10)/10)):0;
    if(gain!==channel.lastGain){channel.gain.gain.setTargetAtTime(gain,now,.35);channel.lastGain=gain;}
    if(pan!==channel.lastPan){channel.pan?.pan.setTargetAtTime(pan,now,.32);channel.lastPan=pan;}
  }
}
