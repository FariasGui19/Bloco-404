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
export const DOCAS_FOLEY=['ondas','madeira','sino','abismo','pressagio','interior','cordame','interferencia','goteira'];
export function sintetizarFoley(kind,rate=RATE) {
  const duration={ondas:12,madeira:16,sino:24,abismo:18,pressagio:40,interior:28,cordame:32,interferencia:36,goteira:30}[kind];
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
    }else if(kind==='pressagio'){
      // Sparse bowed-metal dissonance, not a jump scare. Long silence between
      // swells leaves the existing melody and useful gameplay cues readable.
      const q=t-8.4,len=10.8;
      if(q>0&&q<len){const bow=env(q,len,3.5,4.8);const phase=TAU*(73.42*q+.35*Math.sin(q*.7));
        data[i]=bow*(.13*Math.sin(phase)+.075*Math.sin(phase*1.05946)+.055*Math.sin(phase*2.013)+slow*.20);}
      const far=t-29.2;if(far>0&&far<3.8)data[i]+=.09*env(far,3.8,.2,2.5)*Math.exp(-far)*Math.sin(TAU*291.7*far);
    }else if(kind==='interior'){
      // Muffled surf through planks, CRT transformer and distant roof drops.
      const breathe=.58+.22*Math.sin(t/duration*TAU*3);
      data[i]=(.065*Math.sin(TAU*49*t)+.026*Math.sin(TAU*98.3*t)+slow*.32)*breathe;
      for(const at of [3.1,10.8,19.6,25.3]){const q=t-at;if(q>0&&q<.36)data[i]+=.11*Math.exp(-q*23)*Math.sin(TAU*(980*q-310*q*q))*env(q,.36,.006,.1);}
    }
    if(kind==='cordame'){
      const q=t-11.3;
      if(q>0&&q<3.1)data[i]=.1*env(q,3.1,.7,1.3)*(Math.sin(TAU*(87*q+2.7*q*q))+.32*Math.sin(TAU*132.1*q));
      const knock=t-23.7;if(knock>0&&knock<.25)data[i]+=.16*Math.exp(-knock*26)*Math.sin(TAU*171*knock);
    }else if(kind==='interferencia'){
      // Unintelligible radio carrier, never a spoken hint or jump scare.
      for(const at of [6.2,21.4]){const q=t-at;if(q>0&&q<2.8)data[i]+=.13*env(q,2.8,.4,.9)*(fast-slow)*(.5+.5*Math.sin(TAU*3.2*q));}
      data[i]+=.015*Math.sin(TAU*151.7*t)*(.5+.5*Math.sin(t*.6));
    }else if(kind==='goteira'){
      for(const at of [2.1,7.6,17.8,18.2,26.7]){const q=t-at;if(q>0&&q<.7)data[i]+=.13*env(q,.7,.008,.3)*Math.exp(-q*9)*Math.sin(TAU*(870*q-160*q*q));}
      data[i]+=.012*Math.sin(TAU*61*t)+slow*.035;
    }
    // Join both ends at zero to avoid a hard seam in the texture loop.
    data[i]*=env(t,duration,.075,.075);
  }
  return data;
}

const canais=['trilha',...DOCAS_FOLEY];
const niveis=[.32,.38,.24,.20,.22,.16,.25,.18,.16,.20];
export function criarPaisagemDocas(context,mix) {
  // A small deterministic room tail is built only at opt-in. No network,
  // per-frame buffers, timers, feedback loops or additional AudioContexts.
  let room=null;
  if(context.createConvolver){
    room=context.createConvolver();const rate=context.sampleRate,tail=context.createBuffer(2,Math.round(rate*1.8),rate);let seed=9124;
    for(let c=0;c<2;c++){const data=tail.getChannelData(c);for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=(seed/2147483648-1)*Math.exp(-i/(rate*.28))*.26;}}
    room.buffer=tail;const wet=context.createGain();wet.gain.value=.12;room.connect(wet);wet.connect(mix);
  }
  return canais.map((kind,i)=>{
    const samples=i?sintetizarFoley(kind):sintetizarPartitura();
    const buffer=context.createBuffer(1,samples.length,RATE);
    buffer.getChannelData(0).set(samples);
    const src=context.createBufferSource(),gain=context.createGain();
    const pan=context.createStereoPanner?.();
    gain.gain.value=0;src.buffer=buffer;src.loop=true;src.connect(gain);
    if(pan){gain.connect(pan);pan.connect(mix);if(room)pan.connect(room);}else {gain.connect(mix);if(room)gain.connect(room);}
    src.start();
    return {kind,gain,pan,lastGain:-1,lastPan:-2};
  });
}

export function atualizarPaisagemDocas(channels,now,scene,alerta) {
  if(!channels)return;
  for(let i=0;i<channels.length;i++){
    const channel=channels[i],local=scene?.[channel.kind];
    const level=!scene?0:i?clamp(local?.gain||0):(alerta?.62:1)*clamp(scene.trilha?.gain??1);
    const gain=Math.round(level*20)/20*niveis[i];
    const pan=i && scene?Math.max(-1,Math.min(1,Math.round((local?.pan||0)*10)/10)):0;
    if(gain!==channel.lastGain){channel.gain.gain.setTargetAtTime(gain,now,.35);channel.lastGain=gain;}
    if(pan!==channel.lastPan){channel.pan?.pan.setTargetAtTime(pan,now,.32);channel.lastPan=pan;}
  }
}
