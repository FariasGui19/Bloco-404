// Som opcional, iniciado apenas por gesto explícito. Nenhum arquivo externo,
// contexto ou loop é criado até o jogador apertar o botão de som.
let context = null, enabled = false;
export function immersiveSoundEnabled() { return enabled; }
export function toggleImmersiveSound() {
  if (enabled) { enabled = false; context?.suspend?.()?.catch?.(() => {}); return false; }
  const Audio = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (!Audio) return false;
  try { context ??= new Audio(); context.resume?.()?.catch?.(() => {}); enabled = true; } catch { enabled = false; }
  return enabled;
}
export function playImmersiveSound(kind) {
  if (!enabled || !context || context.state !== 'running') return;
  try {
    const notes = kind === 'chime' ? [740, 988, 1175] : kind === 'water' ? [310, 240] : [510, 680];
    notes.forEach((frequency, i) => {
      const start = context.currentTime + i * .10, osc = context.createOscillator(), gain = context.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(frequency, start);
      osc.frequency.exponentialRampToValueAtTime(frequency * (kind === 'water' ? .55 : 1.01), start + .32);
      gain.gain.setValueAtTime(.0001, start); gain.gain.exponentialRampToValueAtTime(.025, start + .02);
      gain.gain.exponentialRampToValueAtTime(.0001, start + .32);
      osc.connect(gain); gain.connect(context.destination); osc.start(start); osc.stop(start + .33);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    });
  } catch { /* O som nunca deve impedir a interação. */ }
}
