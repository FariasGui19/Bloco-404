// =====================================================================
// ANIMAÇÃO DA FAUNA — o pedido "melhorar as animações"
//
// Até aqui, fauna era um sprite trocando de quadro com um seno no eixo
// Y. Isso lê como "adesivo tremendo". Golfinho que salta precisa de
// ARCO: sobe, vira, cai e volta para a água. Trinta-réis precisa de
// planeio com batida, não de flutuação constante.
//
// Aqui a animação é derivada do ESTADO, com três regras:
//
//   1. Nada de aleatório por frame. Tudo vem de `clock`, que é estável.
//   2. O salto é físico: parábola com tempo de voo e tempo de submerso.
//      O bicho passa a maior parte do tempo debaixo d'água — é o que
//      faz o salto valer.
//   3. A água responde: saltar deixa respingo (partículas no ponto de
//      saída e de entrada).
// =====================================================================

/** Perfil de animação por espécie. */
export const PERFIS = Object.freeze({
  golfinho: {
    // Ciclo: 2,6 s submerso + 1,1 s no ar.
    ciclo: 3.7,
    tempoNoAr: 1.1,
    altura: 26,          // px no topo do salto
    balanco: 0.42,       // radianos de inclinação no arco
    respingo: true,
    sombra: false,
  },
  tartaruga: {
    ciclo: 5.2,
    tempoNoAr: 0,
    altura: 0,
    balanco: 0.10,
    respingo: false,
    sombra: false,
  },
  trinta_reis: {
    ciclo: 1.9,
    tempoNoAr: 0,
    altura: 6,
    balanco: 0.06,
    respingo: false,
    sombra: true,
    // Bate asas em rajadas, não o tempo todo.
    batida: { ativa: 0.55, pausa: 0.45, amplitude: 5 },
  },
  graxaim: {
    ciclo: 1.35,
    tempoNoAr: 0,
    altura: 1.6,         // passo curtinho, quatro patas
    balanco: 0.03,
    respingo: false,
    sombra: true,
  },
  gaivota: { ciclo: 2.1, tempoNoAr: 0, altura: 4, balanco: 0.05, sombra: true },
  peixes: { ciclo: 2.8, tempoNoAr: 0, altura: 2, balanco: 0.04, sombra: false },
});

const suave = (t) => t * t * (3 - 2 * t);

/**
 * Estado de animação de um animal no instante `clock`.
 *
 * Devolve tudo o que o renderer precisa, sem que ele recalcule nada:
 * `y` (deslocamento vertical em px), `rot` (inclinação), `quadro`
 * (índice do sprite), `escalaY`, `sombra` e `respingo` (0..1, força).
 */
export function animarFauna(a) {
  const perfil = PERFIS[a.species] ?? PERFIS.graxaim;
  const ciclo = perfil.ciclo;
  const fase = (a.clock % ciclo) / ciclo;

  // ---- GOLFINHO: parábola de verdade ----
  if (a.species === 'golfinho') {
    const fraçãoAr = perfil.tempoNoAr / ciclo;
    if (fase < fraçãoAr) {
      // No ar: h = 4h·p(1-p), com p 0..1 ao longo do voo.
      const p = fase / fraçãoAr;
      const altura = 4 * perfil.altura * p * (1 - p);
      // Inclinação: sobe de -0.42 a +0.42 (nariz pra cima e depois pra baixo).
      const rot = (p - 0.5) * -2 * perfil.balanco;
      // O quadro acompanha o arco: 8 quadros ao longo do voo.
      const quadro = Math.min(7, Math.floor(p * 8));
      return {
        y: -altura,
        rot,
        quadro,
        escalaY: 1,
        sombra: false,
        respingo: (p < 0.06 || p > 0.94) ? 1 : 0,
        noAr: true,
        perfil,
      };
    }
    // Submerso: nada devagar, cauda batendo, e se prepara para subir.
    const p = (fase - fraçãoAr) / (1 - fraçãoAr);
    return {
      y: Math.sin(p * Math.PI * 2) * 2,
      rot: -0.12 + Math.sin(p * Math.PI * 2) * 0.08,
      quadro: 4 + (Math.floor(a.clock * 3) % 4),
      escalaY: 1 - 0.04 * Math.sin(p * Math.PI),
      sombra: false,
      respingo: 0,
      noAr: false,
      perfil,
    };
  }

  // ---- TRINTA-RÉIS: planeio com batida em rajada ----
  if (a.species === 'trinta_reis') {
    const rajada = perfil.batida;
    const emBatida = fase < rajada.ativa;
    const p = emBatida ? fase / rajada.ativa : 1;
    const altura = super_batida(emBatida, p, rajada.amplitude);
    const quadro = emBatida ? Math.floor(p * 4) : 4 + (Math.floor(a.clock * 2) % 4);
    return {
      y: -altura,
      rot: emBatida ? Math.sin(p * Math.PI * 2) * 0.08 : 0.04,
      quadro,
      escalaY: emBatida ? 1 + Math.sin(p * Math.PI * 2) * 0.05 : 1,
      sombra: true,
      respingo: 0,
      noAr: a.fleeing,
      perfil,
    };
  }

  // ---- Terrestres e peixes: ciclo suave, sem exagero ----
  const onda = Math.sin(fase * Math.PI * 2);
  return {
    y: -Math.abs(onda) * perfil.altura,
    rot: onda * perfil.balanco * 0.4,
    quadro: Math.floor(a.clock * (a.fleeing ? 9 : 4)) % 8,
    escalaY: 1,
    sombra: !!perfil.sombra,
    respingo: 0,
    noAr: a.fleeing && (a.species === 'gaivota'),
    perfil,
  };
}

function super_batida(ativa, p, amp) {
  if (!ativa) return 0;
  // Duas batidas por rajada, subindo no meio.
  return Math.abs(Math.sin(p * Math.PI * 2)) * amp;
}

/**
 * Partículas de respingo. Buffer fixo por espécie: um golfinho não
 * pode criar partícula nova a cada frame (vazaria memória).
 */
export function criarRespingos(n = 8) {
  return Array.from({ length: n }, (_, i) => ({
    x: 0, y: 0, vx: 0, vy: 0, vida: 0, fase: i * 0.7,
  }));
}

/**
 * Dispara respingo no ponto e atualiza todos. `forca` 0..1.
 */
export function atualizarRespingos(lista, dt, forca = 0) {
  if (!lista) return;
  dt = Math.max(0, Math.min(dt, 0.1));
  for (let i = 0; i < lista.length; i++) {
    const p = lista[i];
    if (p.vida <= 0) {
      if (forca > 0 && i < Math.round(lista.length * forca)) {
        // Nasce com distribuição determinística (sem Math.random).
        const a = (i / lista.length) * Math.PI + 0.3;
        p.vx = Math.cos(a) * (18 + i * 2);
        p.vy = -(24 + i * 3);
        p.vida = 1;
        p.x = 0; p.y = 0;
      }
      continue;
    }
    p.vida = Math.max(0, p.vida - dt * 1.6);
    p.vy += 62 * dt;          // gravidade
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
}
