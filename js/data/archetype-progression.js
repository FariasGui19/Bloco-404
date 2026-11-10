// =====================================================================
// CAMINHO DOS ARQUÉTIPOS — níveis 0 a 5
//
// O documento de direção pede que cada arquétipo cresça em seis degraus:
//
//   0 · módulo instalado
//   1 · kit básico (Q/R)
//   2 · especialização de ferramenta
//   3 · ultimate de ferramenta (a sobrecarga que o F usa hoje)
//   4 · combinação / modo avançado
//   5 · ultimate de arquétipo
//
// O jogo ainda não tem pontos de nível de habilidade: o que está pronto é o
// que dá para jogar. Este arquivo é a leitura honesta disso — cada item diz
// se está pronto, se está parcial ou se ainda é plano. Nada aqui concede
// poder por conta própria; quem libera coisa é o jogo.
// =====================================================================

export const PATH_STATES = Object.freeze({
  pronto: 'DISPONÍVEL',
  parcial: 'EM TESTE',
  futuro: 'PLANEJADO',
});

// Nomes dos degraus, iguais para os quatro módulos.
export const LEVEL_TITLES = Object.freeze({
  0: 'MÓDULO INSTALADO',
  1: 'KIT BÁSICO',
  2: 'ESPECIALIZAÇÃO DE FERRAMENTA',
  3: 'ULTIMATE DE FERRAMENTA',
  4: 'COMBINAÇÃO / MODO AVANÇADO',
  5: 'ULTIMATE DE ARQUÉTIPO',
});

export const ARCHETYPE_PATHS = Object.freeze({
  // -------------------------------------------------------------------
  motor_bio_forja: Object.freeze({
    tagline: 'Não é o arquétipo do dash: é o que reconfigura o mundo.',
    levels: Object.freeze([
      Object.freeze({
        level: 0, state: 'pronto', title: 'MÓDULO INSTALADO',
        items: Object.freeze(['Traje e identidade do Motor Bio-Forja']),
      }),
      Object.freeze({
        level: 1, state: 'pronto', title: 'CALIBRAÇÃO',
        items: Object.freeze(['Q · Propulsor de Impulso', 'R · Link de Diagnóstico']),
        note: 'O R já revela falha e rota de manutenção em máquinas próximas.',
      }),
      Object.freeze({
        level: 2, state: 'pronto', title: 'FERRAMENTAS',
        items: Object.freeze(['Lâmina de Forja', 'Punho de Impacto', 'Gancho Magnético', 'Asa de Impulso']),
        note: 'Escolha uma no Códex; a escolha vale para todo o perfil.',
      }),
      Object.freeze({
        level: 3, state: 'pronto', title: 'SOBRECARGA DA FERRAMENTA',
        items: Object.freeze(['Corte de Reconfiguração', 'Martelo de Forja', 'Rede de Ancoragem', 'Quebra-Limite Cinético']),
        note: 'O F passa a usar a sobrecarga da ferramenta instalada.',
      }),
      Object.freeze({
        level: 4, state: 'futuro', title: 'PROTOCOLO DE SOBREPOSIÇÃO',
        items: Object.freeze(['Placas se reorganizam', 'Dash curto sem recarga alta', 'Interações tecnológicas avançadas']),
      }),
      Object.freeze({
        level: 5, state: 'futuro', title: 'ARQUITETO DE ECO',
        items: Object.freeze(['Ponte temporária', 'Plataforma ligada', 'Drone de forja temporário']),
        note: 'A Ultimate de arquétipo atual (Pulso da Forja Viva) já funciona e será refundida aqui.',
      }),
    ]),
  }),

  // -------------------------------------------------------------------
  lamina_dominio_anciao: Object.freeze({
    tagline: 'Força, postura, proteção e armas de frequência antiga.',
    levels: Object.freeze([
      Object.freeze({
        level: 0, state: 'pronto', title: 'MÓDULO INSTALADO',
        items: Object.freeze(['Traje e identidade da Lâmina de Domínio']),
      }),
      Object.freeze({
        level: 1, state: 'pronto', title: 'DOMÍNIO',
        items: Object.freeze(['Q · Golpe de Ruptura', 'R · Postura de Domínio']),
      }),
      Object.freeze({
        level: 2, state: 'pronto', title: 'FERRAMENTAS',
        items: Object.freeze(['Espada de Domínio', 'Escudo de Domínio', 'Postura de Domínio', 'Investida de Domínio']),
      }),
      Object.freeze({
        level: 3, state: 'pronto', title: 'SOBRECARGA DA FERRAMENTA',
        items: Object.freeze(['Corte de Ruptura', 'Muralha de Frequência', 'Corpo de Titânio', 'Impacto do Trono Antigo']),
      }),
      Object.freeze({
        level: 4, state: 'futuro', title: 'GUARDA LONGA',
        items: Object.freeze(['Postura contínua', 'Ondas douradas nos golpes']),
      }),
      Object.freeze({
        level: 5, state: 'futuro', title: 'COROA DO DOMÍNIO',
        items: Object.freeze(['Modo de guerreiro dimensional', 'Proteção a NPCs próximos']),
        note: 'A Coroa da Falha atual é a forma provisória deste degrau.',
      }),
    ]),
  }),

  // -------------------------------------------------------------------
  mare_astral: Object.freeze({
    tagline: 'Fluxo, pressão, correntes e vida aquática.',
    levels: Object.freeze([
      Object.freeze({
        level: 0, state: 'pronto', title: 'MÓDULO INSTALADO',
        items: Object.freeze(['Traje e identidade da Maré Astral']),
      }),
      Object.freeze({
        level: 1, state: 'pronto', title: 'CORRENTE',
        items: Object.freeze(['Q · Passo de Corrente', 'R · Senso de Corrente']),
      }),
      Object.freeze({
        level: 2, state: 'pronto', title: 'CORRENTES',
        items: Object.freeze(['Escudo Líquido', 'Passo Abissal', 'Chicote de Maré', 'Senso de Corrente']),
      }),
      Object.freeze({
        level: 3, state: 'pronto', title: 'SOBRECARGA DA CORRENTE',
        items: Object.freeze(['Cúpula de Pressão', 'Corrente Abissal', 'Onda Cortante', 'Chamado da Maré']),
      }),
      Object.freeze({
        level: 4, state: 'futuro', title: 'RESPIRAÇÃO E FAUNA',
        items: Object.freeze(['Imersão em água', 'Comunicação com fauna aquática']),
      }),
      Object.freeze({
        level: 5, state: 'futuro', title: 'MARÉ DE ABISMO',
        items: Object.freeze(['Muda o fluxo da área', 'Caminhos líquidos', 'Gravidade local reduzida']),
        note: 'A Sinfonia do Estuário atual é a forma provisória deste degrau.',
      }),
    ]),
  }),

  // -------------------------------------------------------------------
  nucleo_dez_forma: Object.freeze({
    tagline: 'A recompensa é variedade; o custo é treino e energia.',
    levels: Object.freeze([
      Object.freeze({
        level: 0, state: 'pronto', title: 'MÓDULO INSTALADO',
        items: Object.freeze(['Traje e identidade do Núcleo 10X']),
      }),
      Object.freeze({
        level: 1, state: 'pronto', title: 'PRIMEIRO ECO',
        items: Object.freeze(['Q · Forma Veloz', 'R · Eco Scan']),
      }),
      Object.freeze({
        level: 2, state: 'pronto', title: 'FORMAS',
        items: Object.freeze(['Veloz', 'Bruta', 'Fluida', 'Núcleo']),
        note: 'Cada forma tem leitura própria; trocar de forma é decisão de build.',
      }),
      Object.freeze({
        level: 3, state: 'pronto', title: 'SOBRECARGA DA FORMA',
        items: Object.freeze(['Velocidade Temporal', 'Impacto de Eco', 'Fenda de Eco', 'Sobreposição 10X']),
      }),
      Object.freeze({
        level: 4, state: 'futuro', title: 'MÚLTIPLAS FORMAS',
        items: Object.freeze(['Duas formas ao mesmo tempo', 'Eco de formas velozes']),
      }),
      Object.freeze({
        level: 5, state: 'futuro', title: 'FORMA SUPREMA DE ADAPTAÇÃO',
        items: Object.freeze(['Forma extrema', 'Missões de descoberta por forma']),
        note: 'O Horizonte de Dez Ecos atual é a forma provisória deste degrau.',
      }),
    ]),
  }),
});

export function getPath(archetypeId) {
  return ARCHETYPE_PATHS[archetypeId] ?? null;
}

export function getPathLevel(archetypeId, level) {
  return getPath(archetypeId)?.levels.find(entry => entry.level === level) ?? null;
}
