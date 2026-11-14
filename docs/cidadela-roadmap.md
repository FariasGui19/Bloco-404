# Roadmap Vivo de Cidadela 404 (Checklist Completo do Entregável Final)

Este documento mantém o **checklist exaustivo, sem limites artificiais**, de tudo o que falta para considerar **Cidadela 404** e a travessia completa de **Bloco 404** uma obra finalizada (artes, mecânicas, interações, história/lore, transições, áudio e verificação).

> Regra de ouro do projeto: **nenhum lote é puramente visual ou de animação** — toda entrega visual deve vir acompanhada de aprofundamento mecânico, novas interações, expansão narrativa e acabamento de transições. Este checklist é atualizado ao fim de cada lote.

---

## 1. Concluído nos Lotes Anteriores (PR #105 + Lote #2)
- [x] **Lote #1 (PR #105):** 10 sprites (`rota-terminal-azul`, `rota-icone-vermelha`, `vigilante-queda`, `vigilante-colapso`, `vigilante-escudo-impacto`, `suprimento-energia`, `drop-sucata-codigo`, `drop-nucleo-estatica`, `bancada-sintese`, `sonda-nexo-pulso`) + Fase 2 do Vigilante (rajada tripla), reflexão de escudo, Bancada de Síntese (`[1–5]`), Quest `cidadela_forja_sobrevivencia`, 2 relíquias (`selo_codigo_queimado`, `nucleo_vigilante_forjado`), células de energia, Ronda Setorial (`PATROL_SEEDS`) e inspeção da carcaça do Vigilante Inerte.
- [x] **Lote #2 (Atual):** 10 artes (`barril-estatica`, `barril-explosao`, `escudo-campo`, `vigilante-sobretensao`, `terminal-ronda`, `vigilia-sentinela-ativo`, `prop-reator-estavel`, `imp-elite`, `imp-elite-ataque`, `cidadela-entrada-corredor.jpg`) + barris explosivos de estática com reação em cadeia, módulo de blindagem de campo, golpe cinético corpo-a-corpo (`[V]`/`[C]`), inimigo blindado de elite (`imp-elite`) com rajada dupla e recarga de energia ao abate, visual dedicado da Fase 2 do Vigilante, faixas de segurança por cor nas três eclusas, nome do setor no HUD, pulso restaurador do reator estabilizado, cena única para o 2º quadro de `THRESHOLD_SCENES` e telemetria pós-vitória no console/anel da Estação 66.6.

---

## 2. Próximos Lotes — Checklist Completo do Que Falta para Obra Finalizada

### A. Artes, Sprites e Quadros Visuais Pendentes
- [ ] **Inimigo `imp-elite`:** quadros direcionais (`lateral`, `costas`, `dano`, `colapso` próprio em vez de fallback do `imp` comum) e ícone próprio de projétil pesado (`projetil-elite.png`).
- [ ] **Arsenal do Jogador — Variações de Sobrecarga (`F`) e Golpe Cinético (`V`):** quadro visual de impacto/onda cinética em primeira pessoa para os 4 módulos ao pressionar `[V]` (braço/lâmina/onda sônica/pulso bio).
- [ ] **Props e Ambientação Única por Setor:**
  - [ ] Parede/textura dedicada para a **Oficina da Vigília** (`parede-oficina.png`) diferenciando-a dos corredores de tijolo e metal.
  - [ ] Sprites distintos para **painel transmissor pós-vitória** ativo vs. sintonizado e **registros de sobreviventes** diferenciados por voz (3 gravações distintas).
  - [ ] Arte própria para o **núcleo de treino** pós-vitória (`training` ativo vs. em espera) e **carcaça inerte do Vigilante** com correntes/cabos conectados ao reator (`vigilante-inerte-acorrentado.png`).
- [ ] **Cutscenes e Telas de Transição:**
  - [ ] Ilustração exclusiva para `CITADEL_END_SCENES` quadro 2 (`A LINHA SOBREVIVE`) se houver reutilização de `frequencia-ruptura.png` em cenas futuras, além de arte de retorno à Estação 66.6 com o anel estabilizado pós-vitória.
  - [ ] Arte do **Códex / Inventário** para as duas relíquias forjadas da Cidadela (`selo_codigo_queimado` e `nucleo_vigilante_forjado`) e para os materiais (`sucata_codigo`, `nucleo_estatica`).
- [ ] **Texturas de Piso/Teto e Paralaxe:** faixas texturizadas sutis ou placas de piso diferenciadas para a Arena do Reator e Oficina da Vigília (mantendo orçamento fixo do framebuffer 480×270).

### B. Mecânicas e Sistemas de Combate
- [ ] **Progressão de Arsenal / Mods na Bancada:** adicionar receitas avançadas ou melhorias de recarga/cadência ligadas ao selamento das 3 Fendas Residuais e à conclusão da Oficina da Vigília.
- [ ] **Efeitos Elementais / Sinergias:**
  - [ ] Detonação de barris aplicando dano em área maior quando ativada por habilidades `Q` ou `F`.
  - [ ] Interação defensiva do golpe cinético `[V]` para desviar/dissipar projéteis comuns no momento exato do impacto (*parry* cinético com janela justa).
- [ ] **Padrões de Inimigos e Chefe:**
  - [ ] Ataque telegrafado de investida ou onda circular do `imp-elite` em distâncias curtas.
  - [ ] Telemetria clara de barra/indicador de abertura do escudo do Vigilante (contagem regressiva visual discreta antes do núcleo abrir).
- [ ] **Ronda Setorial Escalável:** modo de ondas consecutivas ou seleção de intensidade no Terminal de Ronda após limpar a primeira ronda (com recompensa bônus de núcleos/XP).
- [ ] **Economia de Energia & Suprimentos:** estação de recarga parcial no corredor central após derrotar todos os inimigos de um setor (recompensa de limpeza setorial).

### C. Interações, Mundo e Exploração
- [ ] **Diálogos e Leituras da Bancada:** ao forjar `selo_codigo_queimado` ou `nucleo_vigilante_forjado`, disparar fala contextual do NEXO-04 explicando a origem da peça e seu efeito no módulo atual.
- [ ] **Inspeção Contextual dos Barris e Escudos:** prompt informativo opcional ao se aproximar de barril não detonado ou cápsula de escudo quando em vida/escudo cheio.
- [ ] **Integração Bidirecional com Estação 66.6 e Enseada:**
  - [ ] Reação do **Terminal da Enseada** e de objetos da **Estação 66.6** às relíquias forjadas na Cidadela (`selo_codigo_queimado`, `nucleo_vigilante_forjado`).
  - [ ] Registro automático das relíquias, materiais e registros da Cidadela no **Códex** (`js/ui/codex.js`) com abas/descrições completas.
- [ ] **Botão/Acesso Rápido por Mouse/Toque (HUD):** suporte claro no HUD pausado para rebind/dica visual das teclas `[V]`, `[1–5]` e resumo de status das Fendas/Oficina/Forja.

### D. História, Lore e Transições
- [ ] **Arco Narrativo do Vigilante e do Remetente:**
  - [ ] Diálogos de rádio progressivos durante a Fase 2 do Vigilante e após inspecionar os 3 registros de sobreviventes pós-vitória.
  - [ ] Conexão explícita entre as 3 vozes nas gravações da Cidadela, a anomalia dos "3 segundos antes" da Estação 66.6 e o desbloqueio da Oficina da Vigília.
- [ ] **Cutscene / Transição de Retorno Pós-Vitória:**
  - [ ] Micro-transição narrativa na primeira volta à Estação 66.6 após estabilizar o reator (`cidadela-retorno` com variação visual/textual quando `cidadela_estavel === true`).
- [ ] **Diário de Memória (`[L]`) Completo:** página dedicada ou segunda vista para listar Gravações de Sobreviventes, Relatórios da Oficina e Relíquias Forjadas além dos 3 Registros e 3 Arquivos.

### E. Áudio, Polimento, Acessibilidade e Verificação
- [ ] **Áudio Sintetizado (`cidadela-audio.js`):** sons distintos para passo em metal vs. sala do reator, disparo de `imp-elite`, bip de coleta de material raro e alerta sonoro sutil da abertura do núcleo do Vigilante.
- [ ] **Movimento Reduzido (`prefers-reduced-motion`):** auditoria de todas as animações novas (explosão de barris, pulso do reator, golpe cinético, alertas de Fase 2) garantindo legibilidade sem flicker.
- [ ] **Cobertura de Testes Automatizados:**
  - [ ] Manter 100% dos testes em `tests/*.mjs` passando a cada lote.
  - [ ] Adicionar testes dedicados para Códex/inventário das relíquias da Cidadela, reações da Enseada pós-forja, *parry* cinético e áudio opcional.
- [ ] **Alinhamento Final com `main`:** revisar e integrar a pilha de PRs (`arena/99c3a664-bloco-404` -> `arena/8fb675b9-bloco-404` -> próximo lote) até o merge final em `main`.
