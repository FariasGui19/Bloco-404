# Praia 10.0 — o arquipélago das rotas perdidas, agora com mar de verdade

> "se isso foi a praia 2.0, agora quero a praia 10.0... não é pouco
> esforço, detalhes, criatividade, autenticidade, amassa!"

Este documento registra o que foi feito, o que foi medido e — o mais
importante — **por que cada decisão foi tomada**. Um plano que só lista
entregas não serve para a próxima pessoa que abrir o repositório.

---

## Estado por frente

| # | Frente | Estado | Prova |
|---|--------|--------|-------|
| 1 | Estação do trem cortada | **feito** | `tests/praia-enquadramento.mjs` |
| 2 | Praia maior | **feito** | `tests/praia-maior.mjs` |
| 3 | Fauna, vida, clima | **feito** | `tests/praia-clima.mjs`, `praia-fauna-animacao.mjs` |
| 4 | Gates distintos por arquétipo | **feito** | `tests/praia-gates-modulo.mjs` |
| 5 | Mergulho "Aquaman" | **feito** | `tests/praia-nado.mjs` |
| 6 | Missões de ajudar animais | **feito** | `tests/praia-fauna-ferida.mjs` |
| 7 | Animações | **feito** | `tests/praia-fauna-animacao.mjs` |
| 8 | 4 personagens, um por arquétipo | **feito** (2.0) | `tests/personas.mjs` |
| 9 | Morfador mestre (criador) | **feito** (2.0) | `tests/morfador.mjs` |

Suíte ao final: **76 arquivos de teste, todos verdes.**

---

## 1. Estação do trem — "eu tô entrando na imagem"

**O sintoma**: o jogador andava *dentro* do trem. A parte de cima do
desenho era cortada e um pedaço do sprite cobria o chão andável.

**O diagnóstico**: não era escala. `drawCroppedObject` posiciona o
objeto pelo **`larguraPx`** (e agora `escalaY`), e o trem antigo tinha
375 px de largura — 962×559 px na tela, com o topo em `y = -110`.
Metade da imagem ficava fora da tela e a base cobria 5 células
caminháveis da orla.

**A correção**: trem para 286×99 px (4,5×3,1 tiles), ancorado na orla
norte (`global.y: -1.1`), com `escalaY: 0.60`. Plataforma, dossel,
luminária, escada, guarda-corpo e placa reescalados na mesma proporção.

**A lição**: `ajusteY` **não** resolve sprite cobrindo chão. O problema
é de área, e a solução é mover o objeto para a água/orla, não afinar
o offset. Foi tentado: varrer `ajusteY` de 96 a 180 não zera nenhuma
célula coberta, porque a ilha inteira em volta é andável.

---

## 2. Praia maior — 48×48 → 66×64

**O pedido**: "aumentar um pouco o tamanho".

**O risco**: a praia 2.0 estava aprovada. Crescer mexendo no miolo
quebraria gates, rotas, spawns e saves.

**A solução**: o núcleo 48×48 é **restaurado célula por célula** no fim
do arquivo do mapa, contra uma cópia congelada (`NUCLEO_APROVADO`).
Tudo o que cresceu, cresceu para fora:

| Área | O que é | Tamanho |
|------|---------|---------|
| Enseada do Leste | meia-lua de areia + costão de pedra | 290 tiles de areia, 35 linhas |
| Cabo do Eco | praia larga ao sul, com ponta de pedra | 454 tiles de areia |
| Ilhota | ilha satélite separada por canal | 34 tiles |

**A aritmética do núcleo é auditada**: 2110 células preservadas + 183 de
franja (mar aberto que ganhou água desenhada) + 11 de passarela
declarada = 2304 = 48×48. Uma célula não classificada não passa no teste.

### O erro mais caro desta frente

A primeira versão da orla nova era **bonita e inalcançável**: 907 tiles
andáveis que o jogador via e não podia pisar. O teste de conectividade
(flood fill a partir do spawn) agora exige **zero** tiles isolados.
Praia que se vê e não se pisa é cenário, não é mapa.

Outros quatro erros reais que os testes pegaram:

1. Areia pintada **depois** da camada de água: a orla virava borrão.
   Terra tem que ser pintada antes.
2. A restauração do núcleo rodava antes da água e era desfeita — as
   passarelas desapareciam sem aviso.
3. Costão de pedra com veios de água virava labirinto (69 tiles presos).
   Virou paredão.
4. Um cardume aprovado em (42,17) ficou em célula `X` e era filtrado
   por `habitatAllows` — **o animal simplesmente sumia**. Movido 1 tile.

**Desempenho**: 792×768 px de mar assado, 2,3 MB de textura, ~260 ms de
montagem (uma vez por mapa, orçamento 350 ms). O custo **por frame** não
depende do tamanho do mapa — é limitado por arcos visíveis e partículas.

---

## 3. Fauna, vida e clima

### Fauna: 31 animais, 8 espécies

Quatro espécies novas em folha própria (`fauna-nova-1010.png`, 96×128,
8 frames cada): **golfinho**, **tartaruga**, **trinta-réis** e
**graxaim**. Somadas às antigas (caranguejo, gaivota, peixes, capivara).

`habitatAllows` passou a distinguir aquático de terrestre com pegada de
3×3 — antes só `peixes` nadava, e golfinho/tartaruga eram silenciosamente
filtrados para fora do mapa.

### Clima: sistema novo

Não existia. Agora são **7 estados** (limpo, brisa, nublado, garoa,
chuva, ressaca, neblina) que mudam por **transição suave de 70 s**,
nunca por sorteio de frame.

Regras que o teste trava:

- **nunca pula faixa**: um `dt` gigante não teleporta o tempo;
- **nunca pisca**: a luz não varia mais de 0,01 num frame;
- **determinístico**: mesmo seed abre o mesmo tempo;
- **custo fixo**: 120 partículas de teto, buffer reutilizado (3000
  frames de simulação não aumentaram o buffer em 1 partícula).

### E o clima MUDA o jogo

Isso era o critério: clima que só muda a cor é enfeite.

| Efeito | Em ressaca |
|--------|-----------|
| correnteza do mar | +55% |
| fôlego submerso | −25% |
| velocidade na água | −8% |
| faixa de areia molhada alagada | 1,2 tile |
| luminosidade da cena | 0,60 (de 1,00) |

---

## 4. Gates com a cara de cada módulo

**O sintoma**: "todos parecem só uma barreira pequena e padrão".

**O diagnóstico**: existia desenho por arquétipo (`drawBridgeThreshold`),
mas era um traço fino colado no deck. A 60 px de distância, seis gates
indistinguíveis.

**A correção**: cada módulo ganhou **cor, símbolo e presença**:

| Módulo | Cor | Símbolo | Pulso |
|--------|-----|---------|-------|
| MARÉ ASTRAL | `#35E6D3` | onda dupla deslizante | fluxo |
| NÚCLEO 10X | `#9CEFA2` | fenda angular que abre | cinético |
| LÂMINA DO DOMÍNIO | `#EDB85A` | rachadura sólida | estático |
| MOTOR BIO-FORJA | `#CE9C5F` | bornes com condutor que faísca | mecânico |

O gate virou **portal**: halo difuso, arco de energia e duas colunas.
Vencido, apaga para 25%. A travessia Maré/10X desenha as três marquinhas
do segundo módulo — é o único gate de dois caminhos, e agora isso se vê.

`selos-modulo.js` decide a identidade a partir do requisito declarado
(`arquetipo` ou `habilidade`), então gate novo ganha a cara certa sem
tocar no renderer.

---

## 5. Mergulho — o "Aquaman" que começa modesto

**O sintoma**: nadar era andar devagar. O passo na água era instantâneo,
sem peso, sem deslize, sem mar.

**O pedido literal**: "se locomover igual o Aquaman, obviamente não tão
rápido e imponente a princípio" — ganhando isso ao progredir.

### Locomoção (`nado.js` reescrito)

| Propriedade | Antes | Agora |
|-------------|-------|-------|
| velocidade | passo instantâneo | persegue alvo com inércia |
| planeio ao soltar | 0,09 tiles | **2,17 tiles** |
| velocidade nadando | — | 3,28 tiles/s (andar = 4,0) |
| correnteza | não existia | 1,41× a favor, 0,59× contra |

O planeio é o detalhe que faz o corpo parecer *denso*: sem direção, a
velocidade só decai exponencialmente. Perseguir alvo zero dava freio
instantâneo — esse foi um beco sem saída real.

### Respeito do mar — a curva de progressão

Eixo que sobe nadando fundo (0,012/s), mergulhando (0,05) e coletando,
e **nunca desce**. É a resposta ao "conquista o respeito dos animais":

| Respeito | Velocidade | Ar | Arrancada |
|----------|-----------|-----|-----------|
| 0,00 | 1,00× | 1,00× | 1,00× |
| 0,50 | 1,26× | 1,40× | 1,30× |
| 1,00 | 1,52× | 1,80× | 1,60× |

### Arrancada

Substitui a "propulsão" antiga. Impulso curto na direção apontada; o
Maré Astral tem versão mais longa e recarrega mais rápido (1,1 s contra
1,5 s).

---

## 6. Missões de ajudar animais

**O pedido**: "missões secundárias do tipo ajudar animais".

**A decisão de projeto**: não é coletável com outro sprite. Cada bicho é
um **ser com problema, meio e solução**, e a solução depende do módulo
do jogador.

| Bicho | Problema | Meio | Quem resolve |
|-------|----------|------|--------------|
| tartaruga | casco rachado, presa em rede | água | Maré (ou Domínio) |
| golfinho | encalhado na maré baixa | água | Maré |
| estrela-do-mar | poça secou | água | Maré (ou Bio-Forja) |
| arraia | linha de pesca na cauda | água | Lâmina |
| caranguejo | alça de plástico | terra | Bio-Forja |
| ave | asa quebrada | terra | Bio-Forja |

Três desfechos, nesta ordem de preferência:

1. **SOCORRO** — módulo certo + meio certo. XP e Respeito cheios.
   O módulo alternativo vale 50%.
2. **ALÍVIO** — 2,4 s de presença sem o módulo. O bicho sossega.
   *Ensina sem punir.* Esfria devagar ao se afastar — não pune quem
   precisa subir para respirar.
3. **NADA** — longe: o bicho existe, respira e sofre.

Nada de spawn aleatório: nascem nos **recifes** já calculados, são
determinísticos por mapa e não renascem quando o save já os tratou.

**Missão SALVA-VIDAS**: socorro ×3 + socorro em terra ×1, xp 180, item
`concha_ressonante`. O evento só dispara no ato, com id estável no save.

**Desenho**: procedural, zero asset novo. O estado muda o corpo —
ferido respira rápido, encolhe 14% e treme; aliviado abre e respira
fundo. A ferida é parte do desenho (a rachadura, a alça, o fio na
cauda), não um ícone. Quem socorre deixa rastro de partículas na cor
do módulo.

---

## 7. Animações

**O sintoma**: fauna era sprite trocando de quadro com um seno no eixo Y.
Lê como adesivo tremendo.

**A correção** (`fauna-animacao.js`): animação derivada do **estado**,
com três regras.

1. Nada de aleatório por frame — tudo vem de `clock`.
2. O salto é **físico**: parábola `4h·p(1−p)`, tempo de voo e tempo
   submerso separados.
3. A água responde: saltar deixa respingo.

**Golfinho medido**: 26 px no pico, 1,1 s no ar num ciclo de 3,7 s —
**70% do tempo submerso**, que é justamente o que faz o salto valer.
O corpo inclina −0,42 a +0,42 rad conforme sobe e cai.

**Trinta-réis**: bate asa em **rajada** (0,55 s de batida, 0,45 s de
planeio) em vez de vibrar o tempo todo.

---

## 8 e 9. Personagens e Morfador mestre

Fechados na praia 2.0, mantidos intactos:

- **4 slots**, um arquétipo por save. O onboarding recusa módulo já em
  uso com o diálogo NEXO-04. Limite duro.
- **Morfador mestre** (`morfador_de_ressonancia`, tecla **M**), só para
  o criador: alterna arquétipos, testa habilidades sem energia, nível 99
  temporário com o real guardado em `m.nivelReal`. Sem autoria é no-op
  silencioso.

---

## Decisões que continuam valendo

Herdadas da 2.0 e não negociadas:

- **Leveza é critério de aceite.** 60 FPS. Cada sistema novo declara seu
  custo por frame, e há teste para isso.
- **Praia aprovada não regride.** Gates, rotas Maré/10X, spawns e saves.
- Mergulho **livre e fluido**; missões **principalmente Maré Astral**.
- Fauna vem de **arte própria** (a referência da praia não tem fauna).
- Regras de arte: personagem original fixo, magenta só nas fontes, uma
  folha = uma linha, sem texto/moldura/sombra de chão na arte, costas ≠
  perfil espelhado.
- **Não corrigir objeto de cenário com `scale`** — `larguraPx` manda.
- **`global.y` do `linhaDoTrem` desloca em PIXELS**, não em tiles.
- **`baseSpeed` de `moverNaAgua` é TILES/S** (`PLAYER_SPEED = 4.0`).

---

## Onde mexer daqui pra frente

| Quero… | Arquivo |
|--------|---------|
| mudar o tempo/clima | `js/game/clima.js` (`CLIMAS`, `CORRENTE`) |
| novo bicho ferido | `js/game/fauna-ferida.js` (`BICHOS`) |
| animação de espécie | `js/game/fauna-animacao.js` (`PERFIS`) |
| cara de um gate | `js/engine/selos-modulo.js` (`MODULOS`) |
| crescer o mapa | `praia-inicial.js` — **só para fora**, com passarela declarada |
| ajustar natação | `js/game/nado.js` (`NADO`) |

Ao mexer em qualquer um destes, **rode a suíte inteira**. Os testes aqui
não são formalidade: nesta rodada eles pegaram 5 bugs reais que teriam
ido para a mão do jogador.
