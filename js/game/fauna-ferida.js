// =====================================================================
// FAUNA FERIDA — missões de ajudar animais
//
// O criador pediu "missões secundárias do tipo ajudar animais". Isto não
// é um coletável com outro sprite: cada bicho é um SER com problema,
// estado e solução, e a solução só funciona se o jogador tiver o
// vocabulário certo (Maré cura na água, Bio-Forja repara na terra,
// Domínio quebra o que prende).
//
// Três desfechos por bicho, nesta ordem de preferência:
//   1. SOCORRO  — o módulo certo age. Conta para a missão, sobe o
//                 Respeito do Mar e o bicho volta ao mar saudável.
//   2. ALÍVIO   — o jogador chega perto e fica. O bicho melhora um
//                 pouco, mas não é curado. Ensina sem punir.
//   3. NADA     — longe ou sem módulo: o bicho existe, respira, sofre.
//
// Regra de escala: nada de bicho ferido espalhado pelo mapa inteiro.
// São POUCOS e cada um fica num lugar que se lê (recife, poça de maré,
// costão). Poucos e memoráveis, não um sistema de spawn.
// =====================================================================

import { MODULOS } from '../engine/selos-modulo.js';

// Quanto tempo de presença (sem tocar) o jogador precisa para aliviar.
export const CARINHO_SEGUNDOS = 2.4;
export const DISTANCIA_CARINHO = 1.6;
export const DISTANCIA_SOCORRO = 1.8;

/**
 * Tipos de bicho ferido. `cura` diz QUAL módulo resolve e em que meio:
 *   'agua'  → só funciona submerso (o Maré cura nadando)
 *   'terra' → só funciona em pé na areia
 * Qualquer um resolve `domestico`, mas com metade do valor.
 */
export const BICHOS = Object.freeze({
  tartaruga: {
    nome: 'TARTARUGA DE CASCO RACHADO',
    problema: 'ficou presa numa rede de pesca e o casco rachou.',
    cura: 'mare_astral',
    meio: 'agua',
    // Precisa de resgate, não de cura: quem solta é o Domínio.
    alternativa: 'lamina_dominio_anciao',
    xp: 60,
    respeito: .18,
    falaSocorro: 'Ela empurra a água devagar, testando o casco. Depois vai embora sem pressa.',
    falaAlivio: 'Ela para de lutar contra a rede. Ainda está presa, mas já não se debate.',
  },
  golfinho: {
    nome: 'GOLFINHO ENCALHADO',
    problema: 'encalhou na maré baixa e está secando ao sol.',
    cura: 'mare_astral',
    meio: 'agua',
    xp: 70,
    respeito: .22,
    falaSocorro: 'A maré sobe onde você toca. Ele escorrega de volta e some num assobio.',
    falaAlivio: 'Ele respira mais calmo. O sol continua subindo, e ele continua ali.',
  },
  caranguejo: {
    nome: 'CARANGUEJO PRESO EM LIXO',
    problema: 'ficou com uma alça de plástico enroscada na carapaça.',
    cura: 'motor_bio_forja',
    meio: 'terra',
    xp: 45,
    respeito: .14,
    falaSocorro: 'A alça estala e cai. Ele fica parado, como se conferisse o peso que sumiu.',
    falaAlivio: 'Ele agita as patas mais devagar. A alça continua lá.',
  },
  passaro: {
    nome: 'AVE DE ASA QUEBRADA',
    problema: 'bateu no costão e não consegue abrir a asa direita.',
    cura: 'motor_bio_forja',
    meio: 'terra',
    xp: 55,
    respeito: .17,
    falaSocorro: 'A asa range, encontra o encaixe e abre. Ela te encara antes de subir.',
    falaAlivio: 'Ela para de tentar voar. Aceita a sombra e fica.',
  },
  estrela: {
    nome: 'ESTRELA-DO-MAR SECA',
    problema: 'a poça de maré escoou e ela está exposta.',
    cura: 'mare_astral',
    meio: 'agua',
    alternativa: 'motor_bio_forja',
    xp: 35,
    respeito: .11,
    falaSocorro: 'A água volta pela poça. Os braços se abrem um a um, sem pressa.',
    falaAlivio: 'Um fio de água chega à poça. Ela ainda está quase seca.',
  },
  arraia: {
    nome: 'ARRAIA ENREDADA',
    problema: 'linha de pesca enrolada na cauda, cortando a nadadeira.',
    cura: 'lamina_dominio_anciao',
    meio: 'agua',
    xp: 65,
    respeito: .19,
    falaSocorro: 'O fio se rompe limpo. Ela desce em espiral e se dissolve na água funda.',
    falaAlivio: 'Ela deixa de se contorcer. O fio continua apertando.',
  },
});

export const ORDEM_BICHOS = ['tartaruga', 'golfinho', 'caranguejo', 'passaro', 'estrela', 'arraia'];

// ---------------------------------------------------------------------
// ESTADO
// ---------------------------------------------------------------------

export function criarEstadoFauna() {
  return {
    bichos: [],          // instâncias no mapa atual
    curados: 0,
    aliviados: 0,
    // Bichos tratados, por id estável — vai para o save.
    tratados: {},
  };
}

/**
 * Escolhe os bichos do mapa. Determinístico: o mesmo mapa sempre tem os
 * mesmos animais nos mesmos lugares (senão o save mente sobre onde estão).
 *
 * Usa as bordas de recife já calculadas pela vida aquática: um bicho
 * ferido perto de um recife lê como "este lugar tem vida e ela está em
 * apuros", em vez de um ponto aleatório de mar.
 */
export function criarBichosFeridos(map, recifes = [], opts = {}) {
  const rows = map?.aguaPraia;
  if (!rows) return [];
  const limite = opts.limite ?? 4;
  const bichos = [];

  // 1. Perto dos recifes: cada recife pode abrigar um bicho.
  for (let i = 0; i < recifes.length && bichos.length < limite; i++) {
    const r = recifes[i];
    const tipo = ORDEM_BICHOS[i % ORDEM_BICHOS.length];
    const def = BICHOS[tipo];
    // Recife é água: bicho de terra aqui seria bicho afogado. O laço de
    // areia abaixo cuida dos terrestres.
    if (def.meio !== 'agua') continue;
    // Em água = perto do recife; em terra = o golfinho encalhado não
    // pode estar no fundo, então usa a orla mais próxima.
    const raio = .55;
    const ang = (i * 2.399) % (Math.PI * 2);
    const x = r.x + Math.cos(ang) * raio;
    const y = r.y + Math.sin(ang) * raio;
    if (!aguaEm(rows, x, y) && def.meio === 'agua') continue;
    bichos.push(criarBicho(tipo, x, y, map.id, i));
  }

  // 2. Um na areia, sempre: o bicho de terra é o que ensina que existe
  //    mais de um jeito de ajudar.
  const deTerra = ORDEM_BICHOS.filter(t => BICHOS[t].meio === 'terra');
  for (let i = 0; i < deTerra.length && bichos.length < limite; i++) {
    const pos = acharAreia(rows, i);
    if (!pos) break;
    if (bichos.some(b => Math.hypot(b.x - pos.x, b.y - pos.y) < 3)) continue;
    bichos.push(criarBicho(deTerra[i], pos.x, pos.y, map.id, 50 + i));
  }

  return bichos;
}

function criarBicho(tipo, x, y, mapId, seed) {
  const def = BICHOS[tipo];
  return {
    tipo,
    id: `${mapId}:${tipo}:${x.toFixed(2)},${y.toFixed(2)}`,
    x, y,
    def,
    // 'ferido' | 'aliviado' | 'curado'
    estado: 'ferido',
    // Tempo de presença acumulado do jogador perto (alívio).
    carinho: 0,
    fase: (seed * 0.7) % (Math.PI * 2),
    // O bicho respira: usado no desenho e no teste.
    respiro: 0,
  };
}

function aguaEm(rows, x, y) {
  const ch = rows[Math.floor(y)]?.[Math.floor(x)];
  return typeof ch === 'string' && 'YyDdX'.includes(ch);
}

function acharAreia(rows, seed) {
  // Varre a praia em ordem deslocada pelo seed: o bicho de terra não
  // deve cair sempre no mesmo canto.
  const alt = rows.length, larg = rows[0]?.length ?? 0;
  const inicio = Math.floor(((seed * 0.37) % 1) * larg);
  for (let y = 0; y < alt; y++) {
    for (let k = 0; k < larg; k++) {
      const x = (inicio + k) % larg;
      if (rows[y]?.[x] === 's' || rows[y]?.[x] === 'b') {
        // Longe da borda superior: nada de bicho na linha do trem.
        if (y < 3) continue;
        return { x: x + .5, y: y + .5 };
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------
// AJUDA
// ---------------------------------------------------------------------

/**
 * O módulo do jogador serve para este bicho, neste meio?
 * Devolve { ok, motivo } — nunca lança.
 */
export function podeAjudar(bicho, arquetipo, submerso) {
  if (!bicho || bicho.estado === 'curado') return { ok: false, motivo: 'já curado' };
  const def = bicho.def;
  const modalidades = new Set([def.cura, def.alternativa].filter(Boolean));
  const serve = modalidades.has(arquetipo);
  if (!serve) {
    return { ok: false, falta: 'modulo', motivo: `precisa de ${nomeDoModulo(def.cura)}` };
  }
  const meioOk = def.meio === 'agua' ? submerso : !submerso;
  if (!meioOk) {
    // `falta: 'meio'` — o módulo serve, só falta o gesto. É o caso em que
    // vale a pena AVISAR o jogador (mergulhar é segurar ESPAÇO).
    return { ok: false, falta: 'meio', meio: def.meio, motivo: def.meio === 'agua' ? 'segure ESPAÇO e mergulhe até ele' : 'saia da água' };
  }
  // Alternativa vale menos, mas vale.
  const completo = arquetipo === def.cura;
  return { ok: true, completo, motivo: completo ? 'socorro pleno' : 'socorro parcial' };
}

function nomeDoModulo(arq) {
  return MODULOS[arq]?.nome ?? 'outro módulo';
}

/**
 * Um passo de ajuda. Chamado a cada quadro com o jogador parado ou não
 * perto do bicho. Devolve o que aconteceu neste quadro.
 */
export function ajudarBicho(bicho, { player, arquetipo, submerso, dt, nado }) {
  const resultado = { curado: false, aliviado: false, motivo: null };
  if (!bicho || bicho.estado === 'curado') return resultado;
  const dist = Math.hypot(player.x - bicho.x, player.y - bicho.y);
  if (dist > DISTANCIA_CARINHO) {
    // Longe: o alívio esfria devagar. Não zera de uma vez (não pune
    // quem precisa se afastar para respirar).
    bicho.carinho = Math.max(0, bicho.carinho - dt * .35);
    return resultado;
  }

  const veredito = podeAjudar(bicho, arquetipo, submerso);
  // E — a tecla de interagir — é o gesto de socorrer, mas só quando o
  // veredito permite. Alívio é passivo: não pede tecla.
  if (veredito.ok) {
    resultado.motivo = veredito.motivo;
    // Deixamos o main disparar `socorrer` com E; aqui só marcamos
    // que ESTE bicho é socorrível agora.
    resultado.pronto = true;
    resultado.socorroParcial = !veredito.completo;
    return resultado;
  }

  // Sem módulo certo: ao menos fica perto e o bicho sossega.
  bicho.carinho += dt;
  if (bicho.carinho >= CARINHO_SEGUNDOS && bicho.estado === 'ferido') {
    bicho.estado = 'aliviado';
    resultado.aliviado = true;
  }
  resultado.motivo = veredito.motivo;
  resultado.falta = veredito.falta ?? null;
  resultado.meio = veredito.meio ?? null;
  return resultado;
}

/**
 * Aplica o socorro (tecla E). Separado de `ajudarBicho` porque socorrer
 * é um ATO, não um estado: acontece uma vez e grava no save.
 */
export function socorrerBicho(bicho, { player, arquetipo, submerso, progress }) {
  if (!bicho || bicho.estado === 'curado') return null;
  const dist = Math.hypot(player.x - bicho.x, player.y - bicho.y);
  if (dist > DISTANCIA_SOCORRO) return null;
  const veredito = podeAjudar(bicho, arquetipo, submerso);
  if (!veredito.ok) return { ok: false, motivo: veredito.motivo };

  const fator = veredito.completo ? 1 : .5;
  bicho.estado = 'curado';
  const chave = chaveDoBicho(bicho);
  if (progress) {
    progress.faunaTratada ??= {};
    progress.faunaTratada[chave] = { tipo: bicho.tipo, completo: veredito.completo };
    progress.faunaCurada = (progress.faunaCurada ?? 0) + 1;
  }
  return {
    ok: true,
    tipo: bicho.tipo,
    nome: bicho.def.nome,
    xp: Math.round(bicho.def.xp * fator),
    respeito: bicho.def.respeito * fator,
    completo: veredito.completo,
    fala: bicho.def.falaSocorro,
  };
}

export function chaveDoBicho(bicho) {
  return bicho.id;
}

/**
 * Aplica desfecho ao estado do nado (respeito) e ao progresso.
 * Mantido separado para o teste poder medir sem DOM nem missão.
 */
export function aplicarRecompensa(res, nado, ganharRespeito) {
  if (!res?.ok) return { respeitoGanho: 0, xp: 0 };
  let respeitoGanho = 0;
  if (nado && typeof ganharRespeito === 'function') {
    ganharRespeito(nado, res.respeito);
    respeitoGanho = res.respeito;
  }
  return { respeitoGanho, xp: res.xp };
}

/**
 * Quantos bichos do mapa já foram tratados (lido do progresso).
 * Usado pelo painel e pela missão para não pedir de novo.
 */
export function contarTratados(map, progress) {
  const feitos = progress?.faunaTratada ?? {};
  const prefixo = `${map?.id}:`;
  return Object.keys(feitos).filter(k => k.startsWith(prefixo)).length;
}

export function resumoFauna(estado) {
  if (!estado?.bichos?.length) return 'nenhum animal em apuros por aqui';
  const feridos = estado.bichos.filter(b => b.estado === 'ferido').length;
  const aliviados = estado.bichos.filter(b => b.estado === 'aliviado').length;
  const curados = estado.bichos.filter(b => b.estado === 'curado').length;
  return `${feridos} ferido(s), ${aliviados} aliviado(s), ${curados} curado(s)`;
}

// ---------------------------------------------------------------------
// CACHE POR MAPA — o mesmo bicho não nasce duas vezes
// ---------------------------------------------------------------------
const cachePorMapa = new WeakMap();

/**
 * Instâncias de fauna do mapa, criadas uma vez e reaproveitadas.
 * Lê `progress.faunaTratada` para que o bicho já curado não reapareça
 * ao voltar ao mapa — o save manda, não a memória do renderer.
 */
export function detalhesFauna(map, progress, recifes = null) {
  if (!map) return [];
  let estado = cachePorMapa.get(map);
  if (!estado) {
    estado = criarEstadoFauna();
    estado.bichos = criarBichosFeridos(map, recifes ?? [], { limite: 4 });
    cachePorMapa.set(map, estado);
  }
  // Sincroniza com o save a cada leitura (barato: 4 itens).
  const feitos = progress?.faunaTratada;
  if (feitos) {
    for (const b of estado.bichos) {
      if (b.estado === 'curado') continue;
      if (feitos[b.id]) b.estado = 'curado';
    }
  }
  return estado.bichos;
}

/** Marca o rastro de socorro (o renderer decai a cada frame). */
export function marcarRastro(bicho) {
  if (bicho) bicho.rastro = 1;
}

// ---------------------------------------------------------------------
// PONTE COM O JOGO — um passo por quadro
// ---------------------------------------------------------------------
import { recordQuestEvent } from './quests.js';

/**
 * Atualiza a fauna do mapa a cada quadro: presença que alivia, prontidão
 * de socorro e recompensa quando um bicho é socorrido.
 *
 * Devolve `{ pronto, bicho, mensagem }` para o HUD mostrar "E — SOCORRER".
 * O ato em si continua em `socorrerBicho`, chamado pela tecla.
 */
export function atualizarFauna(map, { player, progress, arquetipo, submerso, nado, dt, recifes }) {
  const bichos = detalhesFauna(map, progress, recifes);
  let pronto = null, dica = null;
  for (const b of bichos) {
    if (b.estado === 'curado') continue;
    const r = ajudarBicho(b, { player, arquetipo, submerso, dt, nado });
    if (r.aliviado) b.rastro = 1;
    if (r.pronto && !pronto) pronto = { bicho: b, parcial: r.socorroParcial };
    // Módulo certo, bicho ao alcance, só falta mergulhar (ou sair da água).
    if (r.falta === 'meio' && !dica) dica = { bicho: b, meio: r.meio, motivo: r.motivo };
  }
  return { pronto, dica: pronto ? null : dica, bichos, mensagem: resumoFauna({ bichos }) };
}

/**
 * Socorre o bicho mais próximo que o módulo atual permite. Chamado pela
 * tecla E. Devolve o resultado pronto para o HUD, ou null.
 */
export function socorrerProximo(map, { player, progress, arquetipo, submerso, nado, recifes }) {
  const bichos = detalhesFauna(map, progress, recifes);
  let alvo = null, melhor = Infinity;
  for (const b of bichos) {
    if (b.estado === 'curado') continue;
    const d = Math.hypot(player.x - b.x, player.y - b.y);
    if (d > DISTANCIA_SOCORRO || d >= melhor) continue;
    if (!podeAjudar(b, arquetipo, submerso).ok) continue;
    alvo = b; melhor = d;
  }
  if (!alvo) return null;
  const res = socorrerBicho(alvo, { player, arquetipo, submerso, progress });
  if (!res?.ok) return res;
  alvo.rastro = 1;

  // Missão: dois eventos, um por bicho e um por meio. O id estável no
  // save garante que socorrer o MESMO bicho de novo não conte outra vez.
  if (progress) {
    recordQuestEvent(progress, { type: 'socorro', amount: 1 });
    if (alvo.def.meio === 'terra') recordQuestEvent(progress, { type: 'socorro_terra', amount: 1 });
  }
  return { ...res, bicho: alvo };
}
