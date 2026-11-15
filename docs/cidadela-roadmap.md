# Roadmap Vivo de Cidadela 404 (Checklist Completo do Entregável Final)

Este documento mantém o **checklist exaustivo, sem limites artificiais**, de tudo o que falta para considerar **Cidadela 404** e a travessia completa de **Bloco 404** uma obra finalizada (artes, mecânicas, interações, história/lore, transições, áudio e verificação).

> Regra de ouro do projeto: **nenhum lote é puramente visual ou de animação** — toda entrega visual deve vir acompanhada de aprofundamento mecânico, novas interações, expansão narrativa e acabamento de transições. Este checklist é atualizado ao fim de cada lote.

---

## 1. Concluído nos Lotes (PR #105 + Lotes #2–#6 = 60 Artes Novas)
- [x] **Lote #1 (PR #105):** 10 sprites (`rota-terminal-azul`, `rota-icone-vermelha`, `vigilante-queda`, `vigilante-colapso`, `vigilante-escudo-impacto`, `suprimento-energia`, `drop-sucata-codigo`, `drop-nucleo-estatica`, `bancada-sintese`, `sonda-nexo-pulso`) + Fase 2 do Vigilante (rajada tripla), reflexão de escudo, Bancada de Síntese (`[1–5]`), Quest `cidadela_forja_sobrevivencia`, 2 relíquias (`selo_codigo_queimado`, `nucleo_vigilante_forjado`), células de energia, Ronda Setorial (`PATROL_SEEDS`) e inspeção da carcaça do Vigilante Inerte.
- [x] **Lote #2 (PR #106):** 10 artes (`barril-estatica`, `barril-explosao`, `escudo-campo`, `vigilante-sobretensao`, `terminal-ronda`, `vigilia-sentinela-ativo`, `prop-reator-estavel`, `imp-elite`, `imp-elite-ataque`, `cidadela-entrada-corredor.jpg`) + barris explosivos de estática com reação em cadeia, módulo de blindagem de campo, golpe cinético corpo-a-corpo (`[V]`/`[C]`), inimigo blindado de elite (`imp-elite`) com rajada dupla e recarga de energia ao abate, visual dedicado da Fase 2 do Vigilante, faixas de segurança por cor nas três eclusas, nome do setor no HUD, pulso restaurador do reator estabilizado, cena única para o 2º quadro de `THRESHOLD_SCENES` e telemetria pós-vitória no console/anel da Estação 66.6.
- [x] **Lote #3:** 10 artes (`parede-oficina`, `vigilante-inerte-acorrentado`, `nucleo-treino-ativo`, `painel-transmissor-ativo`, `projetil-elite`, `imp-elite-colapso`, `golpe-cinetico-pulso`, `reliquia-selo-codigo`, `reliquia-nucleo-vigilante`, `cidadela-retorno-estavel.jpg`) + parede exclusiva da Oficina da Vigília, estados ativos visuais para o núcleo de treino e painel transmissor pós-vitória, sprite próprio da carcaça inerte acorrentada, projétil e colapso próprios do `imp-elite`, pulso visual do golpe cinético `[V]`, **parry cinético** de projéteis (`+5 EN` e redução de recarga), **barris sobrecarregados** via habilidade `Q` (Domínio) ou `F` (Ultimate), recompensa única de `+25 XP` e drop de núcleo na Ronda Setorial com contador persistido (`cidadela_rondas_concluidas`), bônus de estabilização setorial (`+10 EN` ao limpar setor visitado), falas de rádio NEXO-04 ao forjar relíquias, **ícones próprios e lista dinâmica no Códex** (somente leitura + resumo de materiais), **micro-cutscene de retorno estável** (`CITADEL_RETURN_SCENES`), telemetria pós-vitória no diagnóstico `[R]` do Terminal da Enseada e Console 66.6, e diário `[L]` estendido com relíquias/fendas/oficina/rondas.
- [x] **Lote #4:** 10 artes (`imp-elite-lateral`, `imp-elite-costas`, `imp-elite-dano`, `parede-arena`, `registro-entrada`, `registro-forja`, `drop-sucata-hud`, `drop-nucleo-hud`, `vigilante-nucleo-aviso`, `cidadela-travessia-anel.jpg`) + vistas direcionais (`lateral`/`costas`) e dano dedicado do `imp-elite`, **investida de choque** telegrafada em curta distância (`< 2,2 tiles`), parede exclusiva da Arena do Reator (`parede-arena.png`), gravações de sobreviventes visualmente distintas com convergência narrativa dos 3 segundos ao reunir as 3 caixas, contagem regressiva + retículo de abertura do núcleo do Vigilante, fala progressiva de Fase 2 abaixo de 25% PV, ícones de materiais (`drop-sucata-hud`, `drop-nucleo-hud`) no HUD/Bancada/Códex, prompts contextuais de barris e escudos, resumo `[V]`/`[1–5]` na pausa e `GRAVAÇÕES X/3` em `[L]`, 4 novos tons sintetizados (`step_reactor`, `elite_shot`, `rare_drop`, `core_open`), e 3º quadro exclusivo em `THRESHOLD_SCENES`.
- [x] **Lote #5 (Fechamento DOOM × Bloco 404):** 10 artes (`melee-mare`, `melee-nucleo`, `melee-dominio`, `melee-bio`, `celula-sobrecarga-doom`, `placa-secreta-404`, `prop-console-reator`, `piso-arena`, `trofeu-cidadela-404`, `cidadela-aurora-limiar.jpg`) + variações exclusivas de `[V]` por arquétipo, **parry duplo** (`>= 2` projéteis = `+7 EN`/projétil + escudo), **Célula de Sobrecarga E1M1** (`12s` de cadência `0,16s`, `+35%` dano, `+20 EN`), sequência de abates (`combo >= 3` = `+4 EN`), **Placa Secreta E1M1 // NULO-666**, Console de Telemetria do Reator, descrição dinâmica em `embarque_dimensional`, piso da Arena (`piso-arena.png`), selo **100% CIDADELA 404** (`cidadela_100_porcento` + `trofeu-cidadela-404.png`), 2ª cena de fechamento em `CITADEL_RETURN_SCENES`, e 4 novos tons sintetizados (`overdrive`, `secret`, `trophy`, `parry_double`).
- [x] **Lote #6 (Atual — Animações Finais + Passivas/História por Arquétipo):** 10 artes (`imp-elite-passo-a`, `imp-elite-passo-b`, `imp-elite-lateral-ataque`, `imp-elite-queda`, `vigilante-fase2-ataque`, `piso-oficina`, `ultimate-mare`, `ultimate-nucleo`, `ultimate-dominio`, `ultimate-bio`) + **passivas exclusivas dos 4 arquétipos** na Cidadela (`mare_astral`: `+10%` deslocamento e `1,2x` dissipação de eco; `nucleo_dez_forma`: recarga `1,25s` e impulso `Shift` estendido para `0,22s`; `lamina_dominio_anciao`: `+8` de precisão no núcleo exposto do Vigilante; `motor_bio_forja`: `-15%` de dano recebido acima de 50% PV), **leituras únicas por arquétipo** na Carcaça Inerte do Vigilante, na Placa E1M1 e no relatório pós-rede de NEXO-04, piso texturizado da Oficina (`piso-oficina.png`), borda de sobrecarga E1M1 e explosões de Ultimate `[F]` individuais por arquétipo.

---

## 2. Auditoria Completa de Animações & Checklist Final (Do Mais Simples ao Mais Avançado)

### Nível 1 — Interface & HUD (Simples): **100% Concluído**
- [x] Ícones dedicados no HUD 2x (Vida, Munição, Energia, Eco + Alerta, Escudo, Bloqueio, Interação, Sucata, Núcleo, Troféu 100%, selo de módulo e barra de recarga).

### Nível 2 — Arsenal, Habilidades & Golpes do Jogador (Simples → Médio): **100% Concluído**
- [x] 4 canhões com `idle`, recuo (`fire`), `return`, `reload`, `blocked` (recarga bloqueada) e `muzzle` (`burst` + `tail`).
- [x] 4 emblemas de habilidade (`Q`: `base`/`mid`/`tail`), 4 golpes cinéticos `[V]` exclusivos (`melee-*`) e 4 explosões de Ultimate `[F]` exclusivas (`ultimate-*`).

### Nível 3 — Cenário, Props & Texturas de Setor (Simples → Médio): **~95% Concluído**
- [x] 5 texturas de parede distintas (`metal`, `tijolo`, `eclusa`, `oficina`, `arena`), pisos da Arena e Oficina (`piso-arena.png`, `piso-oficina.png`), e estados ativos/pulsos de todos os props (Terminais, Arquivos, CRTs com interferência, Sonda, Reator, Relés, Transmissor, Treino, Gravações, Fendas, Cofres, Ecos, Bancada, Ronda, Placa E1M1 e Console do Reator).
- [ ] *Opcional cosmético:* faixa texturizada exclusiva para os corredores iniciais (`entrada`/`galeria`, que já contam com trilhos convergentes de teto/piso).

### Nível 4 — Inimigos Comuns: `imp`, `orb`, `echo` (Médio): **100% das 4 Direções Concluído**
- [x] Frente (`idle`, `walk_a/b`, `charge`, `attack/b`, `release`, `hurt`, `fall`, `death`), lateral espelhada (`side`, `side_walk_a/b`, `side_attack`, `side_release`, `side_hurt`, `side_fall`, `side_death`) e costas (`back`, `back_walk`, `back_attack`, `back_release`, `back_hurt`, `back_fall`, `back_death`).
- [ ] *Opcional avançado:* diagonais intermediárias (45°/135°, padrão 8 direções completo).

### Nível 5 — Sentinela de Elite: `imp-elite` (Avançado): **~90% Concluído**
- [x] Frente (`idle`, `walk_a/b`, `attack`, `hurt`, `fall`, `death`), lateral (`side`, `side_attack` espelhada), costas (`back`) e projétil próprio (`projetil-elite.png`).
- [ ] *Opcional avançado:* quadros separados para `imp-elite-lateral-passo-a/b`, `imp-elite-lateral-dano/queda` e `imp-elite-costas-ataque` (atualmente reutiliza as poses lateral/frontal correspondentes).

### Nível 6 — Chefe: O Vigilante (Avançado): **~95% Concluído**
- [x] Blindado, aviso em 2 quadros, escudo refletindo, ataque Fase 1 (2 quadros), Fase 2 (`vigilante-sobretensao.png`) + **ataque dedicado Fase 2 (`vigilante-fase2-ataque.png`)**, núcleo aberto (`open_a`/`open_b`) + retículo de aviso (`vigilante-nucleo-aviso.png`), dano no núcleo, queda, colapso final e carcaça inerte acorrentada pós-vitória.
- [ ] *Opcional avançado:* quadro dedicado de núcleo vermelho aberto exclusivo para a Fase 2 (`vigilante-fase2-aberto.png`).

### Nível 7 — Cutscenes, Áudio & Testes Automatizados: **100% Concluído**
- [x] Cutscenes exclusivas (`SIGNAL_SCENES`, `THRESHOLD_SCENES` ×3, `CITADEL_END_SCENES`, `CITADEL_RETURN_SCENES` ×2).
- [x] Áudio sintetizado completo (`cidadela-audio.js`) e **140 testes automatizados** passando (`cidadela-lote1..6`).
- [ ] **Passo final humano:** validação manual rápida em navegador real (`python3 -m http.server 8000`) e merge final da PR #106.
