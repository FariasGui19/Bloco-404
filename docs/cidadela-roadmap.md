# Roadmap Vivo de Cidadela 404 (Checklist Completo do Entregável Final)

Este documento mantém o **checklist exaustivo, sem limites artificiais**, de tudo o que falta para considerar **Cidadela 404** e a travessia completa de **Bloco 404** uma obra finalizada (artes, mecânicas, interações, história/lore, transições, áudio e verificação).

> Regra de ouro do projeto: **nenhum lote é puramente visual ou de animação** — toda entrega visual deve vir acompanhada de aprofundamento mecânico, novas interações, expansão narrativa e acabamento de transições. Este checklist é atualizado ao fim de cada lote.

---

## 1. Concluído nos Lotes Anteriores (PR #105 + Lote #2 + Lote #3 + Lote #4)
- [x] **Lote #1 (PR #105):** 10 sprites (`rota-terminal-azul`, `rota-icone-vermelha`, `vigilante-queda`, `vigilante-colapso`, `vigilante-escudo-impacto`, `suprimento-energia`, `drop-sucata-codigo`, `drop-nucleo-estatica`, `bancada-sintese`, `sonda-nexo-pulso`) + Fase 2 do Vigilante (rajada tripla), reflexão de escudo, Bancada de Síntese (`[1–5]`), Quest `cidadela_forja_sobrevivencia`, 2 relíquias (`selo_codigo_queimado`, `nucleo_vigilante_forjado`), células de energia, Ronda Setorial (`PATROL_SEEDS`) e inspeção da carcaça do Vigilante Inerte.
- [x] **Lote #2 (PR #106):** 10 artes (`barril-estatica`, `barril-explosao`, `escudo-campo`, `vigilante-sobretensao`, `terminal-ronda`, `vigilia-sentinela-ativo`, `prop-reator-estavel`, `imp-elite`, `imp-elite-ataque`, `cidadela-entrada-corredor.jpg`) + barris explosivos de estática com reação em cadeia, módulo de blindagem de campo, golpe cinético corpo-a-corpo (`[V]`/`[C]`), inimigo blindado de elite (`imp-elite`) com rajada dupla e recarga de energia ao abate, visual dedicado da Fase 2 do Vigilante, faixas de segurança por cor nas três eclusas, nome do setor no HUD, pulso restaurador do reator estabilizado, cena única para o 2º quadro de `THRESHOLD_SCENES` e telemetria pós-vitória no console/anel da Estação 66.6.
- [x] **Lote #3:** 10 artes (`parede-oficina`, `vigilante-inerte-acorrentado`, `nucleo-treino-ativo`, `painel-transmissor-ativo`, `projetil-elite`, `imp-elite-colapso`, `golpe-cinetico-pulso`, `reliquia-selo-codigo`, `reliquia-nucleo-vigilante`, `cidadela-retorno-estavel.jpg`) + parede exclusiva da Oficina da Vigília, estados ativos visuais para o núcleo de treino e painel transmissor pós-vitória, sprite próprio da carcaça inerte acorrentada, projétil e colapso próprios do `imp-elite`, pulso visual do golpe cinético `[V]`, **parry cinético** de projéteis (`+5 EN` e redução de recarga), **barris sobrecarregados** via habilidade `Q` (Domínio) ou `F` (Ultimate), recompensa única de `+25 XP` e drop de núcleo na Ronda Setorial com contador persistido (`cidadela_rondas_concluidas`), bônus de estabilização setorial (`+10 EN` ao limpar setor visitado), falas de rádio NEXO-04 ao forjar relíquias, **ícones próprios e lista dinâmica no Códex** (somente leitura + resumo de materiais), **micro-cutscene de retorno estável** (`CITADEL_RETURN_SCENES`), telemetria pós-vitória no diagnóstico `[R]` do Terminal da Enseada e Console 66.6, e diário `[L]` estendido com relíquias/fendas/oficina/rondas.
- [x] **Lote #4 (Atual — Polimento Final & Profundidade):** 10 artes (`imp-elite-lateral`, `imp-elite-costas`, `imp-elite-dano`, `parede-arena`, `registro-entrada`, `registro-forja`, `drop-sucata-hud`, `drop-nucleo-hud`, `vigilante-nucleo-aviso`, `cidadela-travessia-anel.jpg`) + vistas direcionais (`lateral`/`costas`) e dano dedicado do `imp-elite`, **investida de choque** telegrafada em curta distância (`< 2,2 tiles`), parede exclusiva da Arena do Reator (`parede-arena.png`), gravações de sobreviventes visualmente distintas com convergência narrativa dos 3 segundos ao reunir as 3 caixas, contagem regressiva + retículo de abertura do núcleo do Vigilante, fala progressiva de Fase 2 abaixo de 25% PV, ícones de materiais (`drop-sucata-hud`, `drop-nucleo-hud`) no HUD/Bancada/Códex, prompts contextuais de barris e escudos, resumo `[V]`/`[1–5]` na pausa e `GRAVAÇÕES X/3` em `[L]`, 4 novos tons sintetizados (`step_reactor`, `elite_shot`, `rare_drop`, `core_open`), e 3º quadro exclusivo em `THRESHOLD_SCENES`.

---

## 2. Próximos Lotes — Checklist Completo do Que Falta para Obra Finalizada

### A. Artes, Sprites e Quadros Visuais
- [x] **Inimigo `imp-elite` (Lotes #3 e #4):** projétil próprio (`projetil-elite.png`), colapso (`imp-elite-colapso.png`), vistas direcionais (`imp-elite-lateral.png`, `imp-elite-costas.png`) e dano (`imp-elite-dano.png`).
- [x] **Golpe Cinético (`V`):** pulso visual em primeira pessoa (`golpe-cinetico-pulso.png`).
- [ ] **Arsenal do Jogador — Variações de Golpe Cinético por Módulo (opcional):** quadros individuais por arquétipo para `[V]` além do pulso cinético unificado.
- [x] **Props e Ambientação Única por Setor (Lotes #3 e #4):** parede dedicada da Oficina (`parede-oficina.png`), parede da Arena do Reator (`parede-arena.png`), gravações distintas (`registro-entrada.png`, `registro-forja.png`), painel transmissor ativo (`painel-transmissor-ativo.png`), núcleo de treino ativo (`nucleo-treino-ativo.png`) e carcaça inerte acorrentada (`vigilante-inerte-acorrentado.png`).
- [x] **Cutscenes e Ícones de Códex (Lotes #3 e #4):** `THRESHOLD_SCENES` com 3 artes exclusivas (`cidadela-travessia-anel.jpg`), `CITADEL_RETURN_SCENES` (`cidadela-retorno-estavel.jpg`), e ícones dedicados das relíquias e materiais no HUD, Bancada e Códex.
- [ ] **Texturas de Piso/Teto e Paralaxe (opcional):** faixas texturizadas ou placas de piso diferenciadas para a Arena do Reator e Oficina da Vigília (mantendo orçamento fixo do framebuffer 480×270).

### B. Mecânicas e Sistemas de Combate
- [ ] **Receitas Extras na Bancada (opcional):** receitas de pós-jogo ligadas às Fendas/Oficina além das 5 receitas atuais (preservando compatibilidade de `CITADEL_RECIPES.length === 5` ou atualizando contrato de testes).
- [x] **Efeitos Elementais / Sinergias (Lote #3):** barris sobrecarregados (`Q` Domínio / `F` Ultimate) e **parry cinético `[V]`** (`+5 EN` e redução de recarga).
- [x] **Padrões de Inimigos e Chefe (Lote #4):** investida de choque telegrafada em curta distância do `imp-elite` e indicador visual + contagem regressiva de abertura do núcleo do Vigilante (`vigilante-nucleo-aviso.png`).
- [x] **Ronda Setorial com Recompensa & Estabilização Setorial (Lote #3):** `+25 XP` únicos, drop de núcleo e `+10 EN` por setor estabilizado.

### C. Interações, Mundo e Exploração
- [x] **Diálogos da Bancada, Integração Bidirecional e Códex (Lotes #3 e #4):** NEXO-04 ao forjar relíquias, reações da Enseada e Estação 66.6 (`[R]`/`[E]`), Códex somente leitura com ícones de relíquias e materiais.
- [x] **Inspeção Contextual dos Barris e Escudos (Lote #4):** prompt informativo ao se aproximar de barril não detonado ou cápsula de escudo quando com proteção já ativa.

### D. História, Lore e Transições
- [x] **Arco Narrativo do Vigilante e do Remetente (Lote #4):** fala progressiva abaixo de 25% PV na Fase 2 e convergência explícita entre as 3 gravações, a anomalia de 3 segundos na Estação 66.6 e a abertura da Vigília.
- [x] **Cutscene de Retorno Pós-Vitória & Diário `[L]` Estendido (Lotes #3 e #4):** `CITADEL_RETURN_SCENES` na primeira saída estável e `[L]` com Relíquias, Gravações, Fendas, Oficina e Rondas.

### E. Áudio, Polimento, Acessibilidade e Verificação
- [x] **Áudio Sintetizado (`cidadela-audio.js`) (Lote #4):** tons distintos para passo no reator/oficina (`step_reactor`), disparo do `imp-elite` (`elite_shot`), coleta de núcleo raro (`rare_drop`) e abertura do núcleo do Vigilante (`core_open`).
- [ ] **Movimento Reduzido (`prefers-reduced-motion`) — Auditoria em Navegador Real:** validação manual em navegador/dispositivos reais da visibilidade estática de todos os efeitos novos (explosão, pulso do reator, golpe cinético, retículo do núcleo e alertas de Fase 2).
- [x] **Cobertura de Testes Automatizados (Lotes #3 e #4):** suítes `tests/cidadela-lote3-fechamento.mjs` e `tests/cidadela-lote4-polimento.mjs` cobrindo assets, mecânicas, áudio, Códex somente leitura e telemetria.
- [ ] **Integração Final e Validação Manual em Navegador:** revisar/mergear a pilha de PRs (`arena/99c3a664-bloco-404` -> `arena/8fb675b9-bloco-404` -> `main`) e realizar playthrough completo no browser (`python3 -m http.server 8000`).
