// =====================================================================
// CICATRIZES DO MUNDO — a fenda que a Quebra Sistemas abre
//
// A Ultimate DEVORADOR DE TECTÔNICA já desenhava uma fenda por ~1 s e
// aplicava o dano radial. O que faltava era a marca FICAR no chão: o golpe
// abria e fechava, e o mapa continuava inteiro.
//
// Aqui a fenda vira dado do progresso (e portanto entra no save):
//   progress.scars.fissuras = [{ id, mapId, x, y, facing, dx, dy, len, seed, at }]
//
// Regras escolhidas para não virar bagunça visual:
//   - cada mapa tem as suas: sair e voltar não perde marca nenhuma;
//   - teto de 24 por save (as mais antigas cedem lugar) — memória e leitura;
//   - repetir o golpe no mesmo ponto REFORÇA a fenda (não duplica);
//   - nada de física: é decalque de chão, então não trava passagem.
// =====================================================================
const FACING = {
  down: [1, 1], up: [-1, -1], left: [-1, 1], right: [1, -1],
};

export const MAX_FISSURAS = 24;

function listaDe(progress) {
  if (!progress) return null;
  progress.scars ??= {};
  progress.scars.fissuras ??= [];
  return progress.scars.fissuras;
}

// Registra a fenda aberta pela Ultimate. Devolve a fenda usada (nova ou
// reforçada) para o renderer/teste saberem o que aconteceu.
export function addTectonicFissure({ progress, mapId, x, y, facing = 'down', radius = 5.6, now = Date.now() }) {
  const lista = listaDe(progress);
  if (!lista || !mapId || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  const [dx, dy] = FACING[facing] ?? FACING.down;

  // Mesma cova, mesmo lugar: a segunda marretada alarga a fenda existente.
  const irma = lista.find(f => f.mapId === mapId && Math.hypot(f.x - x, f.y - y) < .9);
  if (irma) {
    irma.len = Math.min(6.4, (irma.len ?? 3) + .55);
    irma.at = now;
    return irma;
  }

  const fissura = {
    id: `fenda_${mapId}_${Math.round(x * 10)}_${Math.round(y * 10)}`,
    mapId,
    x, y,
    facing,
    dx, dy,
    // Comprimento em tiles: proporcional ao raio da Ultimate, com teto.
    len: Math.min(5.2, Math.max(2.6, (radius ?? 5.6) * .62)),
    // Semente estável: o desenho da mesma fenda não "ferve" a cada quadro.
    seed: (Math.round(x * 73) ^ Math.round(y * 151) ^ Math.round((facing?.length ?? 1) * 977)) >>> 0,
    at: now,
  };
  lista.push(fissura);
  while (lista.length > MAX_FISSURAS) lista.shift();
  return fissura;
}

export function getFissures(progress, mapId) {
  const lista = progress?.scars?.fissuras ?? [];
  if (!mapId) return lista.slice();
  return lista.filter(f => f.mapId === mapId);
}

// Usado no Códex/console e nos testes: limpa as marcas de um mapa (ou todas).
export function clearFissures(progress, mapId = null) {
  if (!progress?.scars?.fissuras) return 0;
  const antes = progress.scars.fissuras.length;
  progress.scars.fissuras = mapId
    ? progress.scars.fissuras.filter(f => f.mapId !== mapId)
    : [];
  return antes - progress.scars.fissuras.length;
}
