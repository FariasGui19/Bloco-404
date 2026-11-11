// =====================================================================
// FERRAMENTAS DOS ARQUÉTIPOS — NÍVEL 2 DO CAMINHO, mas já jogáveis
//
// Documento de direção (docs/modos-e-habilidades.md): cada arquétipo tem um
// caminho próprio de 0 a 5. No nível 1 o operador recebe o kit básico (Q/R);
// no nível 2 escolhe uma FERRAMENTA; e a Ultimate do nível 1 é a sobrecarga
// dessa ferramenta — por isso a Ultimate muda conforme a escolha.
//
// Aqui ficam, por arquétipo:
//   - o rótulo da escolha (FERRAMENTA no Bio/Domínio, CORRENTE na Maré,
//     FORMA no Núcleo);
//   - as ferramentas disponíveis, cada uma com sua leitura de mundo;
//   - a sobrecarga (Ultimate nível 1) que ela libera.
//
// Regras comuns às sobrecargas:
//   - custo e recarga altos, como toda Ultimate;
//   - `kind` define a geometria do efeito (ver js/game/ultimate.js);
//   - `buff` é temporário e vive na sessão, nunca no save.
// =====================================================================

// Tipos de efeito (todos jogáveis hoje, sem estado falso):
//   burst → onda radial no raio, dano + cura + bônus
//   wave  → raio maior, dano menor, bônus forte (rede, maré, chamado)
//   line  → cone na direção apontada, dano alto (cortes e estocadas)
//   dash  → avanço curto com dano em cone e bônus de velocidade
//   guard → janela de invulnerabilidade + cura (muralhas e cúpulas)
//   surge → bônus + energia, com dano leve em volta (velocidade, sintonia)
export const ULTIMATE_KINDS = Object.freeze(['burst', 'wave', 'line', 'dash', 'guard', 'surge']);

export const ARCHETYPE_TOOLS = Object.freeze({
  // -------------------------------------------------------------------
  // MOTOR BIO-FORJA — reconfigura o mundo com ferramentas
  // -------------------------------------------------------------------
  motor_bio_forja: Object.freeze({
    label: 'FERRAMENTA',
    hint: 'A sobrecarga do F é a da ferramenta instalada.',
    tools: Object.freeze([
      Object.freeze({
        id: 'lamina_de_forja',
        name: 'LÂMINA DE FORJA',
        short: 'LÂMINA',
        color: '#ff8a4c',
        kind: 'line',
        tagline: 'Corta cabos, vegetação alienígena e caixas lacradas.',
        ultimate: Object.freeze({
          id: 'corte_de_reconfiguracao',
          tier: 'tool',
          signature: 'serra',
          name: 'CORTE DE RECONFIGURAÇÃO',
          color: '#ff8a4c',
          kind: 'line',
          cost: 52,
          cooldown: 24,
          range: 6.5,
          arc: .22,
          damage: 36,
          healPct: .1,
          buff: Object.freeze({ id: 'corte_reconfiguracao', label: 'FIO INSTÁVEL', duration: 8, basicDamagePct: .12 }),
          effectText: '+12% dano básico por 8 s',
          description: 'A lâmina cresce e fica instável: um corte longo à frente, sem pedir alvo.',
        }),
      }),
      Object.freeze({
        id: 'punho_de_impacto',
        name: 'PUNHO DE IMPACTO',
        short: 'PUNHO',
        color: '#ffc861',
        kind: 'burst',
        tagline: 'Empurra blocos, quebra paredes rachadas e derruba portas.',
        ultimate: Object.freeze({
          id: 'martelo_de_forja',
          tier: 'tool',
          signature: 'martelo',
          name: 'MARTELO DE FORJA',
          color: '#ffc861',
          kind: 'burst',
          cost: 58,
          cooldown: 26,
          radius: 4.5,
          damage: 34,
          healPct: .15,
          buff: Object.freeze({ id: 'martelo_de_forja', label: 'PESO DE FORJA', duration: 8, basicDamagePct: .2 }),
          effectText: '+20% dano básico por 8 s',
          description: 'O braço vira uma ferramenta gigantesca e o impacto abre uma cratera curta.',
        }),
      }),
      Object.freeze({
        id: 'gancho_magnetico',
        name: 'GANCHO MAGNÉTICO',
        short: 'GANCHO',
        color: '#b78cff',
        kind: 'wave',
        tagline: 'Puxa metal, ativa trilhos e recupera itens em buracos.',
        ultimate: Object.freeze({
          id: 'rede_de_ancoragem',
          tier: 'tool',
          signature: 'cabos',
          name: 'REDE DE ANCORAGEM',
          color: '#b78cff',
          kind: 'wave',
          cost: 54,
          cooldown: 25,
          radius: 7.5,
          damage: 18,
          healPct: .15,
          buff: Object.freeze({ id: 'rede_de_ancoragem', label: 'REDE ESTENDIDA', duration: 10, energyRegen: 1.2 }),
          effectText: '+1,2 energia/s por 10 s',
          description: 'Vários cabos saem do gancho ao mesmo tempo e varrem uma área larga.',
        }),
      }),
      Object.freeze({
        id: 'asa_de_impulso',
        name: 'ASA DE IMPULSO',
        short: 'ASA',
        color: '#54ccff',
        kind: 'dash',
        tagline: 'Pulo duplo, planeio e travessia de fendas.',
        ultimate: Object.freeze({
          id: 'quebra_limite_cinetico',
          tier: 'tool',
          signature: 'propulsores',
          name: 'QUEBRA-LIMITE CINÉTICO',
          color: '#54ccff',
          kind: 'dash',
          cost: 50,
          cooldown: 22,
          range: 4.6,
          arc: .28,
          damage: 26,
          healPct: .1,
          buff: Object.freeze({ id: 'quebra_limite', label: 'PROPULSOR ABERTO', duration: 6, moveSpeedPct: .3 }),
          effectText: '+30% velocidade por 6 s',
          description: 'Os propulsores abrem de uma vez: avanço longo com trilha energética.',
        }),
      }),
    ]),
  }),

  // -------------------------------------------------------------------
  // LÂMINA DE DOMÍNIO ANCIÃO — força, postura, proteção
  // -------------------------------------------------------------------
  lamina_dominio_anciao: Object.freeze({
    label: 'FERRAMENTA',
    hint: 'A sobrecarga do F é a da arma ou postura instalada.',
    tools: Object.freeze([
      Object.freeze({
        id: 'espada_de_dominio',
        name: 'ESPADA DE DOMÍNIO',
        short: 'ESPADA',
        color: '#ffd465',
        kind: 'line',
        tagline: 'Golpe pesado de frequência antiga.',
        ultimate: Object.freeze({
          id: 'corte_de_ruptura',
          tier: 'tool',
          signature: 'lamina_vertical',
          name: 'CORTE DE RUPTURA',
          color: '#ffd465',
          kind: 'line',
          cost: 56,
          cooldown: 26,
          range: 6.8,
          arc: .2,
          damage: 42,
          healPct: .08,
          buff: Object.freeze({ id: 'corte_de_ruptura', label: 'FREQUÊNCIA ROMPIDA', duration: 8, basicDamagePct: .15 }),
          effectText: '+15% dano básico por 8 s',
          description: 'Um único corte de frequência antiga atravessa a linha à frente.',
        }),
      }),
      Object.freeze({
        id: 'escudo_de_dominio',
        name: 'ESCUDO DE DOMÍNIO',
        short: 'ESCUDO',
        color: '#b78cff',
        kind: 'guard',
        tagline: 'Postura defensiva; absorve o primeiro impacto.',
        ultimate: Object.freeze({
          id: 'muralha_de_frequencia',
          tier: 'tool',
          signature: 'muralha_hex',
          name: 'MURALHA DE FREQUÊNCIA',
          color: '#b78cff',
          kind: 'guard',
          cost: 52,
          cooldown: 28,
          guard: 3,
          radius: 3.2,
          damage: 14,
          healPct: .3,
          buff: Object.freeze({ id: 'muralha_de_frequencia', label: 'MURALHA', duration: 9, basicDamagePct: .1 }),
          effectText: '+10% dano básico por 9 s',
          description: 'Uma parede de frequência fecha o corpo: o operador fica invulnerável e o choque empurra o que chega.',
        }),
      }),
      Object.freeze({
        id: 'postura_de_dominio',
        name: 'POSTURA DE DOMÍNIO',
        short: 'POSTURA',
        color: '#ff7d8f',
        kind: 'guard',
        tagline: 'Corpo firme; o golpe pesado não recua.',
        ultimate: Object.freeze({
          id: 'corpo_de_titanio',
          tier: 'tool',
          signature: 'tita',
          name: 'CORPO DE TITÂNIO',
          color: '#ff7d8f',
          kind: 'guard',
          cost: 50,
          cooldown: 30,
          guard: 4.2,
          radius: 2.4,
          damage: 10,
          healPct: .38,
          buff: Object.freeze({ id: 'corpo_de_titanio', label: 'TITÂNIO', duration: 12, basicDamagePct: .12 }),
          effectText: '+12% dano básico por 12 s',
          description: 'A postura fecha como liga: mais tempo invulnerável, mais cura, menos alcance.',
        }),
      }),
      Object.freeze({
        id: 'investida_de_dominio',
        name: 'INVESTIDA DE DOMÍNIO',
        short: 'INVESTIDA',
        color: '#ff9a5c',
        kind: 'dash',
        tagline: 'Avanço curto de ombro, sem perder a pose.',
        ultimate: Object.freeze({
          id: 'impacto_do_trono_antigo',
          tier: 'tool',
          signature: 'trono',
          name: 'IMPACTO DO TRONO ANTIGO',
          color: '#ff9a5c',
          kind: 'dash',
          cost: 56,
          cooldown: 27,
          range: 4.2,
          arc: .3,
          damage: 34,
          healPct: .12,
          buff: Object.freeze({ id: 'trono_antigo', label: 'TRONO', duration: 7, moveSpeedPct: .2 }),
          effectText: '+20% velocidade por 7 s',
          description: 'O operador avança como um trono tombando e o impacto abre caminho.',
        }),
      }),
    ]),
  }),

  // -------------------------------------------------------------------
  // MARÉ ASTRAL — fluxo, pressão e correntes
  // -------------------------------------------------------------------
  mare_astral: Object.freeze({
    label: 'CORRENTE',
    hint: 'A sobrecarga do F é a da corrente instalada.',
    tools: Object.freeze([
      Object.freeze({
        id: 'escudo_liquido',
        name: 'ESCUDO LÍQUIDO',
        short: 'CÚPULA',
        color: '#54ccff',
        kind: 'guard',
        tagline: 'Água pressionada na frente do corpo.',
        ultimate: Object.freeze({
          id: 'cupula_de_pressao',
          tier: 'tool',
          signature: 'cupula_agua',
          name: 'CÚPULA DE PRESSÃO',
          color: '#54ccff',
          kind: 'guard',
          cost: 52,
          cooldown: 26,
          guard: 3.4,
          radius: 3.6,
          damage: 16,
          healPct: .28,
          buff: Object.freeze({ id: 'cupula_de_pressao', label: 'PRESSÃO', duration: 9, energyRegen: 1 }),
          effectText: '+1 energia/s por 9 s',
          description: 'A água endurece em cúpula: empurra quem chega perto e fecha a guarda.',
        }),
      }),
      Object.freeze({
        id: 'passo_abissal',
        name: 'PASSO DE CORRENTE',
        short: 'CORRENTE',
        color: '#73e9fa',
        kind: 'dash',
        tagline: 'Caminhar pela corrente, dentro e fora da água.',
        ultimate: Object.freeze({
          id: 'corrente_abissal',
          tier: 'tool',
          signature: 'vortice',
          name: 'CORRENTE ABISSAL',
          color: '#73e9fa',
          kind: 'dash',
          cost: 50,
          cooldown: 22,
          range: 4.8,
          arc: .3,
          damage: 28,
          healPct: .12,
          buff: Object.freeze({ id: 'corrente_abissal', label: 'CORRENTE', duration: 7, moveSpeedPct: .25 }),
          effectText: '+25% velocidade por 7 s',
          description: 'A corrente puxa o corpo por uma fenda de água e corta o que estiver no caminho.',
        }),
      }),
      Object.freeze({
        id: 'chicote_de_mare',
        name: 'CHICOTE DE MARÉ',
        short: 'CHICOTE',
        color: '#a6f0ff',
        kind: 'line',
        tagline: 'Açoite de água pressurizada.',
        ultimate: Object.freeze({
          id: 'onda_cortante',
          tier: 'tool',
          signature: 'chicote',
          name: 'ONDA CORTANTE',
          color: '#a6f0ff',
          kind: 'line',
          cost: 54,
          cooldown: 24,
          range: 7,
          arc: .26,
          damage: 38,
          healPct: .12,
          buff: Object.freeze({ id: 'onda_cortante', label: 'LÂMINA DE ÁGUA', duration: 8, basicDamagePct: .12 }),
          effectText: '+12% dano básico por 8 s',
          description: 'O chicote vira uma lâmina de água longa e corta em linha reta.',
        }),
      }),
      Object.freeze({
        id: 'senso_de_corrente',
        name: 'SENSO DE CORRENTE',
        short: 'SENSO',
        color: '#8cff9e',
        kind: 'surge',
        tagline: 'Ler a corrente e chamar a fauna próxima.',
        ultimate: Object.freeze({
          id: 'chamado_da_mare',
          tier: 'tool',
          signature: 'sonar',
          name: 'CHAMADO DA MARÉ',
          color: '#8cff9e',
          kind: 'surge',
          cost: 48,
          cooldown: 22,
          radius: 8,
          damage: 12,
          healPct: .2,
          buff: Object.freeze({ id: 'chamado_da_mare', label: 'MARÉ CHAMADA', duration: 9, energyRegen: 2 }),
          effectText: '+2 energia/s por 9 s',
          description: 'O operador abre os sentidos: a maré responde em volta e devolve energia.',
        }),
      }),
    ]),
  }),

  // -------------------------------------------------------------------
  // NÚCLEO 10X — formas de eco
  // -------------------------------------------------------------------
  nucleo_dez_forma: Object.freeze({
    label: 'FORMA',
    hint: 'A sobrecarga do F é a da forma escolhida.',
    tools: Object.freeze([
      Object.freeze({
        id: 'nucleo_veloz',
        preview: 'assets/sprites/ui/nucleo-forma-veloz.png',
        name: 'FORMA VELOZ',
        short: 'VELOZ',
        color: '#8cff9e',
        kind: 'surge',
        playable: true,
        // Primeira forma: corrida, 1,8× de velocidade, 30 s de barra e 8 s de
        // recarga. Golpe não consome a barra (diferente da Quebra).
        form: Object.freeze({
          slug: 'veloz',
          duration: 30,
          recharge: 8,
          speedMult: 1.8,
          hitCost: 0,
          color: '#6bff92',
          coreColor: '#8cff9e',
          echoColor: '#6bff92',
        }),
        tagline: 'Dash e corrida; o primeiro eco do Núcleo.',
        ultimate: Object.freeze({
          id: 'velocidade_temporal',
          tier: 'tool',
          signature: 'tempo',
          name: 'VELOCIDADE TEMPORAL',
          color: '#8cff9e',
          kind: 'surge',
          cost: 48,
          cooldown: 22,
          radius: 4,
          damage: 10,
          healPct: .12,
          buff: Object.freeze({ id: 'velocidade_temporal', label: 'TEMPO CURTO', duration: 7, moveSpeedPct: .55, energyRegen: 1 }),
          effectText: '+55% velocidade e +1 energia/s por 7 s',
          description: 'O eco acelera o próprio tempo: o operador cruza a sala antes do som.',
        }),
      }),
      Object.freeze({
        id: 'nucleo_bruto',
        requiredLevel: 4,
        name: 'QUEBRA SISTEMAS',
        short: 'QUEBRA',
        color: '#ffc94a',
        // Miniatura da roda do T: bloco de cabeça recortado da folha de
        // referência em tools/preparar-quebra-sistemas.py. A arte é DADO, para
        // não existir um mapa escondido entre forma e imagem no código da UI.
        preview: 'assets/sprites/ui/nucleo-quebra-sistemas.png',
        // Segunda forma jogável: bípede atarracado de ferro, sem cabeça, com
        // bloco de colisão no lugar do rosto e marretas telescópicas.
        playable: true,
        kind: 'burst',
        form: Object.freeze({
          // slug usado em IDs de sprite, efeito e texto
          slug: 'bruta',
          // Duração base e recarga próprias: a forma é mais curta que a Veloz
          // porque cada golpe consome a barra de transformação.
          duration: 20,
          recharge: 10,
          // Inércia extrema: 40% mais lento que o operador, sem o multiplicador da Veloz.
          speedMult: .6,
          // Marreta acerta mais forte que o pulso do operador (a Veloz usa o
          // formMult do perfil de combate; aqui o peso fica na própria forma).
          damageMult: 1.9,
          // Cada golpe carregado consome a barra: 3 s por impacto.
          hitCost: 3,
          // Preparação longa (sensação de peso) e pancada que derruba estruturas.
          attackWindup: .55,
          // Só a Quebra abre portões travados por peso e escudos de impacto.
          breaksWeight: true,
          // Visual: passo pesado treme a câmera; parar solta exaustão.
          stompShake: 2.6,
          color: '#ffc94a',
          coreColor: '#ffb02e',
          echoColor: '#6bff92',
        }),
        tagline: 'Ferro denso, pistões e marretas: demolição de peso.',
        ultimate: Object.freeze({
          id: 'devorador_de_tectonica',
          tier: 'tool',
          // Assinatura própria: ombros magmáticos e fenda de placa tectônica.
          signature: 'tectonica',
          name: 'DEVORADOR DE TECTÔNICA',
          color: '#ff7a3c',
          kind: 'burst',
          // Marca a Ultimate que deixa CICATRIZ no mapa (js/game/scars.js):
          // a fenda aberta pelo impacto continua lá depois do efeito passar.
          blast: 'tectonica',
          cost: 56,
          cooldown: 27,
          radius: 5.6,
          damage: 40,
          healPct: .18,
          buff: Object.freeze({ id: 'devorador_de_tectonica', label: 'OMBROS MAGMÁTICOS', duration: 9, basicDamagePct: .24 }),
          effectText: '+24% dano básico por 9 s',
          description: 'O corpo triplica, os ombros viram magma e o soco abre uma fenda no chão.',
        }),
      }),
      Object.freeze({
        id: 'nucleo_fluido',
        name: 'FORMA FLUIDA',
        short: 'FLUIDA',
        color: '#54ccff',
        // A forma ainda não existe em jogo: o galho aparece na árvore, mas
        // não pode ser instalado — evita F morto por escolha impossível.
        playable: false,
        project: 'FORMA EM PROJETO',
        kind: 'dash',
        tagline: 'Deslizar entre obstáculos em vez de batê-los.',
        ultimate: Object.freeze({
          id: 'fenda_de_eco',
          tier: 'tool',
          signature: 'fenda',
          name: 'FENDA DE ECO',
          color: '#54ccff',
          kind: 'dash',
          cost: 50,
          cooldown: 23,
          range: 4.4,
          arc: .3,
          damage: 24,
          healPct: .12,
          buff: Object.freeze({ id: 'fenda_de_eco', label: 'FENDA', duration: 7, moveSpeedPct: .28 }),
          effectText: '+28% velocidade por 7 s',
          description: 'O corpo dobra e atravessa a própria silhueta, deixando um corte de eco.',
        }),
      }),
      Object.freeze({
        id: 'nucleo_puro',
        name: 'FORMA NÚCLEO',
        short: 'NÚCLEO',
        color: '#c9a4ff',
        // A forma ainda não existe em jogo: o galho aparece na árvore, mas
        // não pode ser instalado — evita F morto por escolha impossível.
        playable: false,
        project: 'FORMA EM PROJETO',
        kind: 'burst',
        tagline: 'Os dez ecos reunidos num corpo só.',
        ultimate: Object.freeze({
          id: 'sobreposicao_10x',
          tier: 'tool',
          signature: 'sobreposicao',
          name: 'SOBREPOSIÇÃO 10X',
          color: '#c9a4ff',
          kind: 'burst',
          cost: 58,
          cooldown: 28,
          radius: 6,
          damage: 30,
          healPct: .25,
          buff: Object.freeze({ id: 'sobreposicao_10x', label: 'SOBREPOSIÇÃO', duration: 8, moveSpeedPct: .2, energyRegen: .8 }),
          effectText: '+20% velocidade e +0,8 energia/s por 8 s',
          description: 'Dez silhuetas se sobrepõem e a onda sai de todas ao mesmo tempo.',
        }),
      }),
    ]),
  }),
});

export const TOOL_LABELS = Object.freeze(
  Object.fromEntries(Object.entries(ARCHETYPE_TOOLS).map(([id, entry]) => [id, entry.label]))
);

export function getTools(archetypeId) {
  return ARCHETYPE_TOOLS[archetypeId]?.tools ?? [];
}

export function getTool(archetypeId, toolId) {
  if (!toolId) return null;
  return getTools(archetypeId).find(tool => tool.id === toolId) ?? null;
}

export function getToolUltimate(archetypeId, toolId) {
  return getTool(archetypeId, toolId)?.ultimate ?? null;
}

// Todas as sobrecargas de ferramenta, para busca por id (HUD, Códex, testes).
export const TOOL_ULTIMATES = Object.freeze(
  Object.values(ARCHETYPE_TOOLS).flatMap(entry => entry.tools.map(tool => tool.ultimate))
);

export const TOOL_ULTIMATE_IDS = Object.freeze(TOOL_ULTIMATES.map(ultimate => ultimate.id));
