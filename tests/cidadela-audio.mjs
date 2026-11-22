import assert from 'node:assert/strict';
const store=new Map();globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
const oscillators=[];let contexts=0;
class FakeContext {
  constructor(){contexts++;this.state='running';this.currentTime=1;this.destination={};}
  resume(){return Promise.resolve();}
  createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
  createOscillator(){const o={frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){},start(){},stop(){}};oscillators.push(o);return o;}
}
globalThis.AudioContext=FakeContext;
const {citadelAudioEnabled,toggleCitadelAudio,playCitadelSound}=await import('../js/game/cidadela-audio.js');
assert(!citadelAudioEnabled());playCitadelSound('shot');assert.equal(contexts,0,'áudio desativado não cria contexto');
assert(toggleCitadelAudio());assert.equal(contexts,1);assert.equal(store.get('bloco404_cidadela_som'),'1');
for(let i=0;i<12;i++)playCitadelSound('shot');assert.equal(oscillators.length,8,'limite de vozes simultâneas');
oscillators[0].onended();playCitadelSound('echo');assert.equal(oscillators.length,9,'voz encerrada libera limite');
oscillators[1].onended();playCitadelSound('reload');assert.equal(oscillators.length,10,'recarga tem som opcional');
oscillators[2].onended();playCitadelSound('ready');assert.equal(oscillators.length,11,'conclusão tem som opcional');
assert(!toggleCitadelAudio());assert.equal(store.get('bloco404_cidadela_som'),'0');playCitadelSound('victory');playCitadelSound('reload');playCitadelSound('ready');assert.equal(oscillators.length,11);
console.log('Cidadela: áudio opcional, preferência e limite de vozes OK.');
