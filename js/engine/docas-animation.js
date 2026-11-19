// Visual time is presentation state, never mission/save time. It is advanced
// once by the real RAF loop, BEFORE update() can return for calibration/menus.
export const DOCAS_MOTION_KEY='BLOCO404_DOCAS_MOVIMENTO';
export const DOCAS_MOTION_MODES=['normal','reduzido','sistema'];
let mode;
export function movimentoDocas(){
  if(mode===undefined){
    try{mode=globalThis.localStorage?.getItem(DOCAS_MOTION_KEY);}catch{}
    if(!DOCAS_MOTION_MODES.includes(mode))mode='normal';
  }
  return mode;
}
export function definirMovimentoDocas(value){
  if(!DOCAS_MOTION_MODES.includes(value))throw new TypeError('Modo de movimento das Docas inválido');
  mode=value;
  try{globalThis.localStorage?.setItem(DOCAS_MOTION_KEY,value);}catch{}
  return mode;
}
export function movimentoDocasReduzido(){
  const current=movimentoDocas();
  // System mode is an explicit option, not a silent per-browser freeze.
  return current==='reduzido'||(current==='sistema'&&!!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
}
export function avancarAnimacaoDocas(state,deltaSeconds,hidden=false){
  const runtime=state.docasAnimation??={elapsed:0,delta:0,frames:0};
  const dt=!hidden&&Number.isFinite(deltaSeconds)?Math.max(0,Math.min(.25,deltaSeconds)):0;
  runtime.delta=dt;runtime.elapsed+=dt;runtime.frames++;
  return runtime;
}
export function tempoVisualDocas(state,fallbackMilliseconds=0){
  const reduced=movimentoDocasReduzido();
  const elapsed=Number.isFinite(state?.docasAnimation?.elapsed)
    ? state.docasAnimation.elapsed : Math.max(0,fallbackMilliseconds/1000)||0;
  return {reduced,t:reduced?0:elapsed,clock:reduced?null:elapsed};
}
