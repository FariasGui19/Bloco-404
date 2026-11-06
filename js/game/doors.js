// js/game/doors.js
// =====================================================================
//  PORTAS DE ELEVADOR: luz verde ao chegar perto → abre → fecha ao sair
//  Abre a "raio" tiles e só fecha a "raio + 0.5" (não fica piscando)
// =====================================================================
import { state } from './state.js';

export function updateDoors(dt) {
  const p = state.player;

  for (const o of state.objects ?? []) {
        const modoPorta = o.porta?.modo ?? 'auto';
    if (!o.porta || (modoPorta !== 'auto' && modoPorta !== 'glitch')) continue;

    o._abre ??= 0;
    o._luz ??= 0;
    o._perto ??= false;

    const raio = o.porta.raio ?? 2.2;
    const d = Math.hypot(p.x - o.x, p.y - o.y);

    if (d < raio) o._perto = true;
    else if (d > raio + 0.5) o._perto = false;

    if (o._perto) {
      o._luz += dt;
      if (o._luz > 0.35) o._abre = Math.min(1, o._abre + dt * 2.5);
    } else {
      o._luz = 0;
      o._abre = Math.max(0, o._abre - dt * 2.5);
    }
  }
}