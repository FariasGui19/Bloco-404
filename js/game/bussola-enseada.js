// =====================================================================
// BÚSSOLA & SINERGIA DA ENSEADA DOS ECOS 2.0
//
// Centraliza:
//  - Metadados dos buffs da Enseada (Bancada de Campo + Cairn)
//  - Leitura dinâmica da Bússola de Maré da Enseada (alvos pendentes)
//  - Diretriz tática adaptada por arquétipo para o painel [J]
// =====================================================================
import { ARCHETYPES } from '../data/onboarding.js';
import { nomeDoClima } from './clima.js';

export const ENSEADA_BUFFS = Object.freeze({
  pulso_salino: Object.freeze({
    id: 'pulso_salino',
    label: 'PULSO SALINO',
    short: '+10% ORLA / NADO',
    cor: '#54ccff',
    archetype: 'mare_astral',
  }),
  vetor_leve: Object.freeze({
    id: 'vetor_leve',
    label: 'VETOR LEVE',
    short: '+10% AREIA SECA',
    cor: '#8ef5c8',
    archetype: 'vetor_aero',
  }),
  fio_ancestral: Object.freeze({
    id: 'fio_ancestral',
    label: 'FIO ANCESTRAL',
    short: '+35% DANO BÁSICO',
    cor: '#ffd465',
    archetype: 'lamina_dominio_anciao',
  }),
  escudo_bio: Object.freeze({
    id: 'escudo_bio',
    label: 'ESCUDO BIO-FORJA',
    short: '-50% DANO DE ECO',
    cor: '#ff9a5c',
    archetype: 'motor_bio_forja',
  }),
  foco_equilibrio: Object.freeze({
    id: 'foco_equilibrio',
    label: 'FOCO DE EQUILÍBRIO',
    short: '+2 EN/s & FIRMEZA',
    cor: '#a7ffbb',
    archetype: null,
  }),
});

export function getEnseadaBuffMeta(buffId) {
  return ENSEADA_BUFFS[buffId] ?? null;
}

const ENSEADA_LANDMARKS = Object.freeze([
  { flag: 'collected_enseada_rastro_mar', label: 'Vestígio Marinho (oeste)', coords: '10, 14' },
  { flag: 'collected_enseada_rastro_pedra', label: 'Vestígio da Pedra (norte)', coords: '19, 12' },
  { flag: 'collected_enseada_rastro_mata', label: 'Vestígio da Mata (sul)', coords: '21, 20' },
  { flag: 'companheiro_lumeo', label: 'Vínculo com Lúmeo', coords: '20, 19' },
  { flag: 'conduto_enseada_mare', label: 'Conduto da Maré Astral (baía leste)', coords: '28, 12' },
  { flag: 'enseada_viva_concluida', label: 'Marcos da Enseada Viva (Relógio, Fonte, Ostras, Espelho)', coords: '11–24' },
  { flag: 'expedicao_enseada_concluida', label: 'Expedição da Baía (Bancada, Antena, Barco, Acampamento)', coords: '9–27' },
  { flag: 'enseada_ecos_profundos_concluida', label: 'Ecos Profundos (Estela, Captador, Arcaz à Deriva)', coords: '17–22' },
]);

export function getEnseadaCompassReport(progress) {
  const flags = progress?.flags ?? {};
  const pending = ENSEADA_LANDMARKS.filter(entry => !flags[entry.flag]);
  const total = ENSEADA_LANDMARKS.length;
  const done = total - pending.length;
  const next = pending[0] ?? null;
  return {
    done,
    total,
    pending,
    next,
    summary: next
      ? `Alvo prioritário: ${next.label} (${next.coords}). Restam ${pending.length} marco(s) na Enseada.`
      : 'Todos os marcos principais da Enseada dos Ecos 2.0 foram registrados pela Bússola.',
  };
}

const ARCHETYPE_DIRECTIVES = Object.freeze({
  mare_astral: {
    enseada: 'Sua afinidade com o mar acelera na orla (+10% no Pulso Salino) e abre rotas pelo Embarcadouro, Barco e Conduto Leste.',
    geral: 'Priorize fluxos de água, mergulhos e rotas marítimas pelo arquipélago.',
    badge: 'SINTONIA AQUÁTICA',
  },
  vetor_aero: {
    enseada: 'Vento de costa ativa o Vetor Leve na Bancada (+10% na areia) e amplifica o Carrilhão e os saltos de campo.',
    geral: 'Explore mobilidade, deslocamento veloz e passagens elevadas.',
    badge: 'IMPULSO DE VENTO',
  },
  lamina_dominio_anciao: {
    enseada: 'A Lâmina reduz em 35% o dano dos ecos instáveis e recebe +35% de dano no Fio Ancestral da Bancada; lute sob chuva/ressaca para XP bônus.',
    geral: 'Confronte ecos instáveis, selos e desafios de combate direto.',
    badge: 'POSTURA ANCIÃ',
  },
  motor_bio_forja: {
    enseada: 'A Bio-Forja corta pela metade o dano dos ecos instáveis com o Escudo Bio e extrai energia viva da Fonte, Algas e Fauna.',
    geral: 'Repare condutores, cuide da fauna costeira e sustente sua equipe em campo.',
    badge: 'ENGENHARIA VIVA',
  },
  nucleo_dez_forma: {
    enseada: 'Alterne formas no Espelho e na Estela dos Navegadores para ler múltiplas assinaturas e ampliar sua duração de transformação.',
    geral: 'Equilibre Forma Veloz e Quebra Sistemas conforme o obstáculo da missão.',
    badge: 'MATRIZ ADAPTATIVA',
  },
});

export function getArchetypeMissionBriefing(progress, map, player, clima) {
  const id = progress?.archetype;
  const arch = ARCHETYPES[id];
  if (!arch) return null;
  const info = ARCHETYPE_DIRECTIVES[id] ?? ARCHETYPE_DIRECTIVES.nucleo_dez_forma;
  const inEnseada = map?.id === 'ilha_enseada_ecos';
  const buff = inEnseada ? getEnseadaBuffMeta(player?.enseadaBuff) : null;
  const climaLabel = inEnseada && clima?.atual ? `CLIMA: ${nomeDoClima(clima)}` : null;
  return {
    id,
    name: arch.nome,
    color: arch.cor,
    badge: info.badge,
    directive: inEnseada ? info.enseada : info.geral,
    buff,
    climaLabel,
  };
}
