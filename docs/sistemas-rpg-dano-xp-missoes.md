# Combate, maestria, vida e Códex

Estado atual do RPG do Bloco 404. Tudo é data-driven: números em `js/data`,
regras puras em `js/game`, interface em `js/ui`. Inimigos agressivos continuam
pendentes — o que existe já é jogável nos alvos de treino e nas zonas de eco.

## 1. Arquivos

| Arquivo | Papel |
| --- | --- |
| `js/data/combat-balance.js` | dano, golpes, recarga, alcance, crítico, multiplicadores de habilidade e regras de vida |
| `js/data/mastery.js` | trilhas de maestria, limiares e efeitos por arquétipo |
| `js/data/quests.js` | missões contáveis e recompensas |
| `js/data/items.js` | catálogo de itens do inventário |
| `js/game/rpg.js` | nível, XP, estatísticas derivadas e rolagem de dano |
| `js/game/mastery.js` | motor da maestria (contadores → ranks → bônus) |
| `js/game/health.js` | vida, dano, invulnerabilidade, regeneração e respawn |
| `js/game/hazards.js` | zonas de eco instável (dano ambiental) |
| `js/game/combat.js` | aplica dano, registra vitória, XP e eventos |
| `js/game/quests.js` | objetivos, conclusão e entrega única de recompensa |
| `js/game/combat-feedback.js` | números flutuantes de dano/crítico/XP |
| `js/ui/codex.js` | Códex com abas (missões, progressão, inventário, atributos) |
| `js/game/progression.js` | normaliza e migra os campos novos em saves antigos |

## 2. Ataque básico por arquétipo (nível 1)

| Arquétipo | Dano/golpe | Golpes | Recarga | Alcance | Crítico | Perfil |
| --- | --- | --- | --- | --- | --- | --- |
| Domínio Ancião | 13 | 1 | 0,68 s | 2,0 | 12% (×1,85) | lento, maior pico |
| Motor Bio-Forja | 9 | 1 | 0,54 s | 1,8 | 7% (×1,6) | médio e estável |
| Maré Astral | 5 | 2 | 0,52 s | 1,9 | 9% (×1,55) | dois toques por gesto |
| Núcleo 10X | 5 | 1 | 0,32 s | 1,7 | 11% (×1,7) | mais rápido; ×1,35 em Forma Veloz |

```text
dano = base × (1 + ganhoPorNível × (nível − 1)) × (1 + maestria de ataque) × (forma veloz ? ×1,35 : 1)
```

Cada golpe varia ±6% e pode ser crítico. Encadear golpes sem pausa entra em
recuperação (`strain`) e soma tempo à recarga.

### Habilidades de impacto

| Habilidade | Multiplicador |
| --- | --- |
| Golpe de Ruptura | ×2,4 |
| Passo de Corrente | ×1,9 |
| Pulso da Forma Veloz | ×1,6 |
| Propulsor de Impulso | ×1,2 |

Varreduras (`postura_dominio`, `senso_corrente`, `eco_scan`, `bio_diagnostic`)
não causam dano. O nó de dano de habilidade vem da maestria de **eco**.

## 3. Maestria — progressão orgânica por uso

Não existe ponto para gastar. Cada trilha sobe conforme o jogador **faz** o que
ela representa, e os ranks são derivados dos contadores (mudar limiares no
futuro recalcula tudo sem migração).

| Trilha | Sobe com | Efeito por rank | Limiares |
| --- | --- | --- | --- |
| Ataque | golpes básicos que acertam | +4% dano básico, +1% crítico | 30 / 80 / 160 / 300 |
| Fluxo | usos de Q, R e transformação | −3% recarga, +0,4 energia/s | 10 / 25 / 50 / 90 |
| Eco | vitórias, missões e descobertas | +4% dano de habilidade, +5% XP | 4 / 10 / 20 / 40 |
| Locomoção | tiles percorridos | +2% velocidade | 150 / 500 / 1200 / 2500 |

**Núcleo 10X — trilha CINÉTICA (locomoção):** além dos +2% de velocidade,
a Forma Veloz ganha **+3% de velocidade por rank** e **+1,2 s de duração por
rank**. Ou seja: quanto mais você anda, corre e dá dash na forma, mais rápida e
mais longa ela fica — exatamente o comportamento "orgânico" pedido.

Nomes por arquétipo:

| Arquétipo | Ataque | Fluxo | Eco | Locomoção |
| --- | --- | --- | --- | --- |
| Núcleo 10X | PULSO SINTONIZADO | CIRCUITO ESTÁVEL | LEITURA PROFUNDA | CINÉTICA |
| Domínio Ancião | FIO ANCESTRAL | PASSADA FIRME | RUNAS VIVAS | PESO E IMPULSO |
| Maré Astral | CORRENTE CONTÍNUA | RESPIRAÇÃO ABISSAL | SINTONIA LÍQUIDA | FLUIDEZ |
| Bio-Forja | IMPULSO AFIADO | SERVO ESTÁVEL | DIAGNÓSTICO DUPLO | PROPULSÃO |

O save guarda só quatro números em `progress.archetypeProgress[arquétipo].mastery`.
Saves antigos com `points`/`nodes` da árvore antiga são lidos e **ignorados**
(não viram poder, não são apagados à força).

## 4. Vida

| Regra | Valor |
| --- | --- |
| Vida base | Domínio 150 · Bio 130 · Núcleo 120 · Maré 110 (+8 por nível) |
| Regeneração | após 5 s sem dano, +4 vida/s |
| Invulnerabilidade | 1,6 s após levar dano |
| Morte | 1,2 s caído e retorno ao ponto seguro com 60% da vida |
| Ao renascer | 2,4 s invulnerável |

**Sem punição permanente:** morrer não remove XP, itens, missões nem flags. A
vida é de sessão (não vai para o save); cada carregamento abre com a barra
cheia. A HUD mostra a barra com o ícone de coração e pulsa abaixo de 30%.

### Fonte de dano atual: zonas de eco instável

Declaradas no mapa em `hazards`. Duas na Enseada dos Ecos, longe do spawn, do
alvo de treino e do caminho obrigatório. Pulsam a cada 1,2–1,5 s, causam 9–12
de dano e **são ignoradas durante o dash**. O teste `tests/vida.mjs` garante que
nenhuma zona nasce sobre spawn, alvo de treino ou parede.

## 4.5 Ultimate (`F`) — o quinto slot

A Ultimate tem **duas camadas** desde a 0.4.0:

1. **Ultimate de arquétipo (base)** — todo operador tem, mesmo sem ferramenta.
   Atinge tudo dentro do raio, cura e deixa um bônus temporário.
2. **Sobrecarga de ferramenta (nível 1)** — ao instalar uma ferramenta,
   corrente ou forma no Códex, o `F` passa a usar a sobrecarga dela: corte em
   linha, impacto curto, onda larga, avanço, guarda ou sintonia, com custo e
   recarga próprios.

A escolha fica em `progress.tools[arquétipo]`, é saneada ao carregar (id
inválido volta para a base) e muda a Ultimate na HUD e no Códex na hora.
Recarga, bônus e efeito são de sessão — nada disso vai para o save.

| Arquétipo | Ultimate | Custo | Recarga | Raio | Dano | Cura | Bônus |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Bio-Forja | PULSO DA FORJA VIVA | 58 | 26 s | 5,5 | 22 | 45% | +3 vida/s por 8 s |
| Domínio | COROA DA FALHA | 62 | 30 s | 6,5 | 38 | 15% | +15% dano básico por 10 s |
| Maré | SINFONIA DO ESTUÁRIO | 54 | 24 s | 7 | 20 | 25% | +1,5 energia/s por 8 s |
| Núcleo 10X | HORIZONTE DE DEZ ECOS | 50 | 22 s | 6 | 24 | 20% | +35% velocidade e +0,8 energia/s por 7 s |

As 16 sobrecargas (quatro por arquétipo), com custo, recarga e tipo de efeito,
estão em `docs/modos-e-habilidades.md`; os dados vivem em
`js/data/archetype-tools.js`.

Regras verificadas por `tests/ultimate.mjs` e `tests/ferramentas.mjs`:

- bloqueia sem arquétipo, com vida zerada, em recarga e sem energia (sem cobrar nada);
- corte só atinge o cone à frente; onda larga alcança o que o impacto curto não alcança;
- guarda aplica invulnerabilidade real; avanço cria o dash do mapa (colisão manda);
- a escolha da ferramenta sobrevive ao ciclo salvar → carregar e é saneada se o id não existir;
- dano radial ignora a direção e não atinge quem está fora do raio;
- cura proporcional à vida máxima do arquétipo/nível, limitada ao máximo;
- bônus entra em `getDerivedStats` (dano básico, velocidade) e expira sozinho;
- uso conta 2 pontos na maestria de **fluxo**;
- com debug (`H`) ou calibração (`V`) ligados, o `F` continua sendo das ferramentas de cenário.

HUD: bloco próprio com o sigilo do arquétipo, recarga, energia faltando e o
bônus ativo. Códex → **Progressão** mostra o cartão da Ultimate com custo,
recarga e estado.

## 5. Códex de Rotas (`J`)

Substitui o antigo diário monolítico. Quatro abas com ícones próprios:

| Aba | Conteúdo |
| --- | --- |
| **Missões** | missão principal, missões contáveis com barra por objetivo e resumo de exploração da Enseada |
| **Progressão** | nível, XP, resumo da maestria e as quatro trilhas com pips, barra até o próximo rank e efeito |
| **Inventário** | grade de 8 espaços, catálogo de itens com nome/descrição e painel de companheiros |
| **Atributos** | vida, energia, dano, crítico, recarga, alcance, bônus de XP e velocidade da Forma Veloz |

Atalhos: `J` abre/fecha, `ESC` fecha, `1–4` troca de aba, `←`/`→` navegam.
Abrir o Códex **nunca altera o progresso** — só os botões de companheiro salvam,
de propósito.

Cores: cada aba tem acento próprio (`data-tab` no CSS) e cada trilha usa a cor do
seu ícone — dourado (ataque), ciano (fluxo), âmbar (eco) e violeta (locomoção).
A barra de vida é vermelha, energia ciano e XP dourado.

Arte: `assets/sprites/ui/codex-fundo.png` (fundo atmosférico),
`assets/sprites/ui/codex/icone-emblema.png` (emblema do cabeçalho),
`assets/sprites/ui/codex/icone-*.png` (8 ícones, cada um na cor da sua função) e
`assets/sprites/ui/codex/ultimate-*.png` (4 sigilos de Ultimate), gerados a
partir de `assets/source-art/ui/` e tratados por `tools/preparar-codex-ui.py`.

## 6. Missões contáveis

`CALIBRAÇÃO DE CAMPO` começa ao concluir a avaliação com o NEXO-04: derrotar 3
ecos de treino rende 60 XP, 1 rank de eco e o item `registro_de_calibracao`.
Recompensa entregue uma única vez; o Códex mostra `atual/alvo` por objetivo.

As missões antigas (`embarque_dimensional`, `calibracao_de_eco`) seguem com o
fluxo próprio: `progress.activeQuest` continua sendo a principal, e
`progress.questLog` guarda apenas as missões novas.

## 7. Testes

```bash
node --experimental-default-type=module tests/combat-basic.mjs
node --experimental-default-type=module tests/rpg.mjs
node --experimental-default-type=module tests/maestria.mjs
node --experimental-default-type=module tests/vida.mjs
node --experimental-default-type=module tests/codex.mjs
node --experimental-default-type=module tests/missoes.mjs
node --experimental-default-type=module tests/dano-habilidades.mjs
node --experimental-default-type=module tests/ultimate.mjs
node --experimental-default-type=module tests/ferramentas.mjs
node --experimental-default-type=module tests/estrutura.mjs
node --experimental-default-type=module tests/boot.mjs
```

## 8. Pendências honestas

- Inimigos agressivos com patrulha, telegrafia e contra-ataque.
- Escalonamento de vida dos alvos por mapa (hoje todos com 60).
- Mais fontes de cura (itens, descanso, estações) e feedback sonoro.
- Persistir maestria de forma legível no Códex com histórico de rank.
- Balanceamento final só depois do primeiro inimigo real.
