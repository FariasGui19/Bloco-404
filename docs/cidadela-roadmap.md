# Roadmap Vivo de Cidadela 404 (Checklist Completo do Entregável Final)

Este documento mantém o **checklist exaustivo, sem limites artificiais**, de tudo o que falta para considerar **Cidadela 404** e a travessia completa de **Bloco 404** uma obra finalizada (artes, mecânicas, interações, história/lore, transições, áudio e verificação).

> Regra de ouro do projeto: **nenhum lote é puramente visual ou de animação** — toda entrega visual deve vir acompanhada de aprofundamento mecânico, novas interações, expansão narrativa e acabamento de transições. Este checklist é atualizado ao fim de cada lote.

---

## 1. Concluído nos Lotes Anteriores (PR #105 + Lote #2 + Lote #3)
- [x] **Lote #1 (PR #105):** 10 sprites (`rota-terminal-azul`, `rota-icone-vermelha`, `vigilante-queda`, `vigilante-colapso`, `vigilante-escudo-impacto`, `suprimento-energia`, `drop-sucata-codigo`, `drop-nucleo-estatica`, `bancada-sintese`, `sonda-nexo-pulso`) + Fase 2 do Vigilante (rajada tripla), reflexão de escudo, Bancada de Síntese (`[1–5]`), Quest `cidadela_forja_sobrevivencia`, 2 relíquias (`selo_codigo_queimado`, `nucleo_vigilante_forjado`), células de energia, Ronda Setorial (`PATROL_SEEDS`) e inspeção da carcaça do Vigilante Inerte.
- [x] **Lote #2 (PR #106):** 10 artes (`barril-estatica`, `barril-explosao`, `escudo-campo`, `vigilante-sobretensao`, `terminal-ronda`, `vigilia-sentinela-ativo`, `prop-reator-estavel`, `imp-elite`, `imp-elite-ataque`, `cidadela-entrada-corredor.jpg`) + barris explosivos de estática com reação em cadeia, módulo de blindagem de campo, golpe cinético corpo-a-corpo (`[V]`/`[C]`), inimigo blindado de elite (`imp-elite`) com rajada dupla e recarga de energia ao abate, visual dedicado da Fase 2 do Vigilante, faixas de segurança por cor nas três eclusas, nome do setor no HUD, pulso restaurador do reator estabilizado, cena única para o 2º quadro de `THRESHOLD_SCENES` e telemetria pós-vitória no console/anel da Estação 66.6.
- [x] **Lote #3 (Atual — Fechamento da Cidadela 404):** 10 artes (`parede-oficina`, `vigilante-inerte-acorrentado`, `nucleo-treino-ativo`, `painel-transmissor-ativo`, `projetil-elite`, `imp-elite-colapso`, `golpe-cinetico-pulso`, `reliquia-selo-codigo`, `reliquia-nucleo-vigilante`, `cidadela-retorno-estavel.jpg`) + parede exclusiva da Oficina da Vigília, estados ativos visuais para o núcleo de treino e painel transmissor pós-vitória, sprite próprio da carcaça inerte acorrentada, projétil e colapso próprios do `imp-elite`, pulso visual do golpe cinético `[V]`, **parry cinético** de projéteis (`+5 EN` e redução de recarga), **barris sobrecarregados** via habilidade `Q` (Domínio) ou `F` (Ultimate), recompensa única de `+25 XP` e drop de núcleo na Ronda Setorial com contador persistido (`cidadela_rondas_concluidas`), bônus de estabilização setorial (`+10 EN` ao limpar setor visitado), falas de rádio NEXO-04 ao forjar relíquias, **ícones próprios e lista dinâmica no Códex** (somente leitura + resumo de materiais), **micro-cutscene de retorno estável** (`CITADEL_RETURN_SCENES`), telemetria pós-vitória no diagnóstico `[R]` do Terminal da Enseada e Console 66.6, e diário `[L]` estendido com relíquias/fendas/oficina/rondas.

---

## 2. Próximos Lotes — Checklist Completo do Que Falta para Obra Finalizada

### A. Artes, Sprites e Quadros Visuais
- [ ] **Inimigo `imp-elite` (direcionais opcionais):** quadros direcionais (`lateral`, `costas`, `dano`) — *projétil pesado (`projetil-elite.png`) e colapso próprio (`imp-elite-colapso.png`) já entregues no Lote #3*.
- [x] **Golpe Cinético (`V`):** pulso visual em primeira pessoa (`golpe-cinetico-pulso.png`) entregue no Lote #3.
- [ ] **Arsenal do Jogador — Variações de Sobrecarga (`F`) por Módulo:** quadros individuais por arquétipo para golpe cinético se expandido futuramente.
- [x] **Props e Ambientação Única por Setor (Lote #3):** parede dedicada da Oficina da Vigília (`parede-oficina.png`), painel transmissor ativo (`painel-transmissor-ativo.png`), núcleo de treino ativo (`nucleo-treino-ativo.png`) e carcaça inerte acorrentada (`vigilante-inerte-acorrentado.png`).
- [x] **Cutscenes e Ícones de Códex (Lote #3):** arte exclusiva de retorno estável à Estação 66.6 (`cidadela-retorno-estavel.jpg` em `CITADEL_RETURN_SCENES`) e ícones dedicados das relíquias (`reliquia-selo-codigo.png`, `reliquia-nucleo-vigilante.png`) na Bancada e no Códex.
- [ ] **Texturas de Piso/Teto e Paralaxe:** faixas texturizadas sutis ou placas de piso diferenciadas para a Arena do Reator e Oficina da Vigília (mantendo orçamento fixo do framebuffer 480×270).

### B. Mecânicas e Sistemas de Combate
- [ ] **Progressão de Arsenal / Mods na Bancada:** receitas adicionais ligadas às Fendas/Oficina além das 5 receitas atuais (preservando compatibilidade de `CITADEL_RECIPES`).
- [x] **Efeitos Elementais / Sinergias (Lote #3):**
  - [x] Detonação sobrecarregada de barris (dano e raio ampliados + lentidão estendida) via habilidade `Q` (Domínio) ou `F` (Ultimate).
  - [x] **Parry cinético `[V]`:** dissipa projéteis próximos no instante do impacto, restaura `+5 EN` por projétil e reduz a recarga do golpe.
- [ ] **Padrões de Inimigos e Chefe:** investida em curta distância do `imp-elite` e indicador discreto de abertura do núcleo do Vigilante.
- [x] **Ronda Setorial com Recompensa & Estabilização Setorial (Lote #3):** conclusão da ronda concede `+25 XP` na primeira conclusão, libera `nucleo_estatica` no terminal e persiste contador; limpar inimigos de um setor visitado restaura `+10 EN`.

### C. Interações, Mundo e Exploração
- [x] **Diálogos da Bancada, Integração Bidirecional e Códex (Lote #3):**
  - [x] Rádio NEXO-04 ao forjar `selo_codigo_queimado` e `nucleo_vigilante_forjado`.
  - [x] Reação do Terminal da Enseada e Console 66.6 (`[R]` e `[E]`) às relíquias forjadas, estabilização e contagem de rondas.
  - [x] Códex (`js/ui/codex.js`) com ícones de sprite das relíquias, slots dinâmicos e linha de materiais (`citadelMaterials`), estritamente somente leitura.
- [ ] **Inspeção Contextual dos Barris e Escudos:** prompt informativo opcional ao se aproximar de barril não detonado ou cápsula de escudo quando em vida/escudo cheio.

### D. História, Lore e Transições
- [ ] **Arco Narrativo do Vigilante e do Remetente:** falas adicionais na Fase 2 e conexão explícita entre as 3 vozes nas gravações e a anomalia dos 3 segundos.
- [x] **Cutscene de Retorno Pós-Vitória & Diário `[L]` Estendido (Lote #3):** `CITADEL_RETURN_SCENES` acionada na primeira saída estável e painel `[L]` exibindo Relíquias, Fendas, Oficina e Rondas concluídas.

### E. Áudio, Polimento, Acessibilidade e Verificação
- [ ] **Áudio Sintetizado (`cidadela-audio.js`):** sons distintos para passo em metal vs. sala do reator, disparo de `imp-elite`, bip de coleta de material raro e alerta sonoro sutil da abertura do núcleo do Vigilante.
- [ ] **Movimento Reduzido (`prefers-reduced-motion`):** auditoria de todas as animações novas (explosão de barris, pulso do reator, golpe cinético, alertas de Fase 2) garantindo legibilidade sem flicker.
- [x] **Cobertura de Testes Automatizados (Lote #3):** adicionada suíte dedicada `tests/cidadela-lote3-fechamento.mjs` cobrindo os 10 assets, parry cinético, barris sobrecarregados, rondas, limpeza setorial, Códex somente leitura e telemetria Enseada/Estação.
- [ ] **Alinhamento Final com `main`:** revisar e integrar a pilha de PRs até o merge final em `main`.
