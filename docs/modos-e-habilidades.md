# Modos de uso e direção dos arquétipos

## Decisões e escopo atual

Cada operador escolhe um arquétipo; um possível morfador mestre futuro não é troca de módulo. Níveis dos cinco slots já podem ser registrados no save, mas ainda não existe sistema jogável de subir nível nem habilidades de utilidade e suporte. **A 0.4.0 ligou a Ultimate à ferramenta escolhida** (ver abaixo). Valores abaixo são protótipos, não balanceamento final.

## Caminho do arquétipo — níveis 0 a 5

O caminho vale para os quatro módulos, com nomes próprios em cada degrau:

| Nível | O que é | Estado em 0.4.0 |
| --- | --- | --- |
| 0 | Módulo instalado | disponível |
| 1 | Kit básico (Q/R) | disponível |
| 2 | Especialização de ferramenta | disponível (escolha no Códex) |
| 3 | Ultimate de ferramenta | disponível (tecla F) |
| 4 | Combinação / modo avançado | planejado |
| 5 | Ultimate de arquétipo | planejado (a base atual ocupa o lugar) |

O Códex → **Progressão** mostra a escada inteira e marca cada degrau como
`DISPONÍVEL`, `EM TESTE` ou `PLANEJADO`; nada ali concede poder por conta
própria. O jogador não precisa desbloquear tudo de uma vez.

## Ultimate — duas camadas

**Ultimate de arquétipo (base).** Todo operador tem, mesmo sem ferramenta:

| Arquétipo | Ultimate | Custo | Recarga | Raio | Dano | Cura | Bônus |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Bio-Forja | PULSO DA FORJA VIVA | 58 | 26 s | 5,5 | 22 | 45% | +3 vida/s por 8 s |
| Domínio | COROA DA FALHA | 62 | 30 s | 6,5 | 38 | 15% | +15% dano básico por 10 s |
| Maré | SINFONIA DO ESTUÁRIO | 54 | 24 s | 7 | 20 | 25% | +1,5 energia/s por 8 s |
| Núcleo 10X | HORIZONTE DE DEZ ECOS | 50 | 22 s | 6 | 24 | 20% | +35% velocidade e +0,8 EN/s por 7 s |

**Sobrecarga de ferramenta (Ultimate nível 1).** Quando o jogador instala uma
ferramenta/corrente/forma no Códex, o **F** passa a usar a sobrecarga dela —
com custo, recarga e bônus próprios.

### Motor Bio-Forja — FERRAMENTA

| Ferramenta | Sobrecarga | Tipo | Custo | Recarga | Efeito |
| --- | --- | --- | --- | --- | --- |
| Lâmina de Forja | CORTE DE RECONFIGURAÇÃO | corte em linha | 52 | 24 s | 36 de dano num cone de 6,5 tiles; +12% dano básico por 8 s |
| Punho de Impacto | MARTELO DE FORJA | impacto curto | 58 | 26 s | 34 de dano em 4,5 tiles; +20% dano básico por 8 s |
| Gancho Magnético | REDE DE ANCORAGEM | onda larga | 54 | 25 s | 18 de dano em 7,5 tiles; +1,2 EN/s por 10 s |
| Asa de Impulso | QUEBRA-LIMITE CINÉTICO | avanço | 50 | 22 s | avanço de 4,6 tiles + 26 de dano; +30% velocidade por 6 s |

### Lâmina de Domínio Ancião — FERRAMENTA

| Ferramenta | Sobrecarga | Tipo | Custo | Recarga | Efeito |
| --- | --- | --- | --- | --- | --- |
| Espada | CORTE DE RUPTURA | corte em linha | 56 | 26 s | 42 de dano em 6,8 tiles; +15% dano básico por 8 s |
| Escudo | MURALHA DE FREQUÊNCIA | guarda | 52 | 28 s | 3 s invulnerável, cura 30%, empurrão curto; +10% dano por 9 s |
| Postura | CORPO DE TITÂNIO | guarda longa | 50 | 30 s | 4,2 s invulnerável, cura 38%, alcance menor; +12% dano por 12 s |
| Investida | IMPACTO DO TRONO ANTIGO | avanço | 56 | 27 s | avanço de 4,2 tiles + 34 de dano; +20% velocidade por 7 s |

### Maré Astral — CORRENTE

| Corrente | Sobrecarga | Tipo | Custo | Recarga | Efeito |
| --- | --- | --- | --- | --- | --- |
| Escudo Líquido | CÚPULA DE PRESSÃO | guarda | 52 | 26 s | 3,4 s invulnerável, cura 28%; +1 EN/s por 9 s |
| Passo de Corrente | CORRENTE ABISSAL | avanço | 50 | 22 s | avanço de 4,8 tiles + 28 de dano; +25% velocidade por 7 s |
| Chicote de Maré | ONDA CORTANTE | corte em linha | 54 | 24 s | 38 de dano em 7 tiles; +12% dano básico por 8 s |
| Senso de Corrente | CHAMADO DA MARÉ | sintonia | 48 | 22 s | 12 de dano em 8 tiles, cura 20%; +2 EN/s por 9 s |

### Núcleo 10X — FORMA

| Forma | Sobrecarga | Tipo | Custo | Recarga | Efeito |
| --- | --- | --- | --- | --- | --- |
| Veloz | VELOCIDADE TEMPORAL | sintonia | 48 | 22 s | +55% velocidade e +1 EN/s por 7 s; dano leve em 4 tiles |
| Bruta | IMPACTO DE ECO | impacto curto | 54 | 25 s | 36 de dano em 4,8 tiles; +18% dano básico por 8 s |
| Fluida | FENDA DE ECO | avanço | 50 | 23 s | avanço de 4,4 tiles + 24 de dano; +28% velocidade por 7 s |
| Núcleo | SOBREPOSIÇÃO 10X | onda | 58 | 28 s | 30 de dano em 6 tiles, cura 25%; +20% velocidade e +0,8 EN/s por 8 s |

Regras que valem para as duas camadas:

- bloqueia sem arquétipo, com vida zerada, em recarga ou sem energia — e não cobra nada quando falha;
- dano radial não pede direção; corte/avanço usam a direção apontada e só atingem o cone;
- guarda usa a invulnerabilidade real do jogo (a mesma dos respawns), não um escudo fake;
- avanço usa o dash do mapa, então parede e colisão continuam mandando;
- recarga, bônus e efeito são de sessão; a **escolha** da ferramenta vai para o save;
- uso conta 2 pontos na maestria de fluxo;
- com debug (`H`) ou calibração (`V`) ligados, o `F` pertence às ferramentas de cenário.

Arte: um sigilo por arquétipo em `assets/sprites/ui/codex/ultimate-*.png` e o
efeito em jogo é procedural (`burst`, `wave`, `line`, `dash`, `guard`, `surge`),
sem folha nova. Ainda pendente: pose do personagem executando a Ultimate, aviso
de área para inimigos futuros, número de utilidade/suporte e o degrau 4 de cada
arquétipo.

**Bio-Forja, Q no nível 1:**

| Modo | Como usar | Energia | Alcance | Duração | Recarga |
| --- | --- | --- | --- | --- | --- |
| Rápido | Q com roupa civil | 28 | 2,15 tiles | 0,18 s | 1,25 s |
| Traje ativo | T para equipar, depois Q | 22 | 2,80 tiles | 0,18 s | 1,25 s |

O dash conserva suas colisões; os modos não liberam água ou gates extras. O estado do traje é temporário de runtime, não altera o arquétipo escolhido nem seu nível no save. O perfil é fixado no início do dash. O T não troca o traje durante um dash, diálogo, menu ou calibração. O Q continua exibindo a pose de propulsão Bio-Forja também no uso rápido. Nenhum nível superior altera estes números ainda.

## Núcleo 10X — proposta para próximas etapas

- O bracelete terá interface circular própria para selecionar **Formas de Eco**; a interface é separada da animação de transformação. O personagem escolhe apenas um módulo por vez.
- Q **Pulso Veloz**: protótipo de ativação rápida com impulso e retorno automático; pose de referência e efeito provisório. Modo sustentado, seleção circular e progressão ainda não implementados.
- R **Leitura de Eco**: protótipo de varredura com pulso verde que identifica o gate fechado mais próximo; lente orbital, anomalias e rastros biológicos são planos futuros.
- A futura forma sustentada precisa de regras claras de ativação, energia, expiração, retorno seguro e o que acontece ao atravessar mapas; não permitir sair em local inválido nem atravessar barreiras sem capacidade apropriada. Modo rápido e forma sustentada devem ser estados distintos, não efeitos obtidos apenas pela roupa visível.

## Direção das outras habilidades — proposta do usuário

- Domínio Q: golpe pesado linear com preparação, lâmina dourada, impacto poligonal e atordoamento; romper apenas obstáculos compatíveis. R: leitura sísmica de falhas e vestígios com anéis dourados e runas gráficas.
- Maré Q: arrancada fluida em arco, fita líquida e gotas; futuros vãos devem exigir regras e destinos seguros. R: gota suspensa e mapa de correntes, umidade e fauna em ciano e azul profundo.
- 10X Q: glitch holográfico verde, forma veloz e rastro cinético. R: leitura de anomalias por lente orbital. As imagens existentes são referência visual, não são automaticamente uma sequência de animação utilizável.

Os demais Q/R têm protótipos com energia, recarga, efeitos e poses provisórias. O Golpe de Ruptura abre a rocha com Q; o Passo de Corrente abre a caverna com Q. As varreduras identificam gates fechados próximos, sem desbloqueá-los. As folhas de referência têm poses, não animações temporais finais. Parte dos gates legados ainda aceita E somente pela posse do módulo; a sequência inicial de missões do metrô também depende da Bio-Forja. Rotas alternativas completas por arquétipo, Núcleo 10X com interface de seleção e formas, vãos seguros e combate continuam pendentes.

## Preparação para missão inicial compartilhada

As transições de progresso (diagnóstico do aeroporto, painel de carga e instalação do fragmento) foram isoladas em `js/game/metro-quest.js`; a UI continua chamando essas mesmas transições e salvando normalmente. **Isso ainda não desbloqueia o metrô para os outros módulos.** Terminais, mensagens, grade de impulso e coleta ainda dependem da rota Bio-Forja.

Próxima etapa: criar soluções próprias por arquétipo para acesso ao terminal, à segurança da carga e ao painel do metrô, todas alimentando as mesmas flags e missão sem conceder outro módulo. Testar o percurso inteiro com saves novos e antigos, inclusive sem permitir que habilidades de outros módulos atravessem a barreira Bio-Forja indevidamente.
