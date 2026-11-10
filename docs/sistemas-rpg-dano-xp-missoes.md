# Dano, XP, missões e árvore de progressão

Primeira camada do RPG do Bloco 404. Tudo aqui é data-driven: os números
vivem em `js/data`, as regras puras em `js/game` e nenhum módulo repete
constantes. Inimigos agressivos e dano ao jogador continuam pendentes — o
que existe hoje já é jogável nos alvos de treino.

## Arquivos

| Arquivo | Papel |
| --- | --- |
| `js/data/combat-balance.js` | dano, golpes, recarga, alcance, crítico e multiplicadores de habilidade por arquétipo |
| `js/data/progression-tree.js` | grade de nós (ataque/fluxo/eco) com sabor próprio por arquétipo |
| `js/data/quests.js` | definição das missões contáveis e suas recompensas |
| `js/game/rpg.js` | XP, níveis, pontos, ranks, estatísticas derivadas e rolagem de dano |
| `js/game/quests.js` | motor de objetivos, conclusão e entrega única de recompensa |
| `js/game/combat.js` | aplica dano, registra vitória, concede XP e dispara eventos de missão |
| `js/game/combat-feedback.js` | números flutuantes de dano/crítico/XP (só memória) |
| `js/game/progression.js` | normaliza e migra os campos novos em saves antigos |

## Ataque básico por arquétipo (nível 1)

| Arquétipo | Dano/golpe | Golpes | Recarga | Alcance | Crítico | Perfil |
| --- | --- | --- | --- | --- | --- | --- |
| Domínio Ancião | 13 | 1 | 0,68 s | 2,0 | 12% (×1,85) | lento, pesado, maior pico por golpe |
| Motor Bio-Forja | 9 | 1 | 0,54 s | 1,8 | 7% (×1,6) | médio, estável |
| Maré Astral | 5 | 2 | 0,52 s | 1,9 | 9% (×1,55) | dois toques por gesto, ritmo fluido |
| Núcleo 10X | 5 | 1 | 0,32 s | 1,7 | 11% (×1,7) | mais rápido; ×1,35 em Forma Veloz |

Cada golpe varia ±6% e pode ser crítico. O dano final é:

```text
dano = base × (1 + ganhoPorNível × (nível − 1)) × (1 + nósDeAtaque) × (formaVeloz ? ×1,35 : 1)
```

Ao encadear golpes sem pausa, o ataque entra em recuperação depois de N
acertos (`strain`), somando tempo à recarga — a leitura de "sobrecarga"
que já existia na HUD.

## Habilidades de impacto

`ABILITY_DAMAGE` multiplica o dano básico do arquétipo:

| Habilidade | Multiplicador | Observação |
| --- | --- | --- |
| Golpe de Ruptura | ×2,4 | maior dano de área curta |
| Passo de Corrente | ×1,9 | atinge à frente no impulso |
| Forma Veloz (pulso) | ×1,6 | rápido, menor compromisso |
| Propulsor de Impulso | ×1,2 | dano incidental do dash |

Varreduras (`postura_dominio`, `senso_corrente`, `eco_scan`,
`bio_diagnostic`) não causam dano e continuam sendo leitura de sistemas.
O dano de habilidade também sobe com o nó `eco_1`.

## XP, níveis e pontos

- Curva: `xpParaPróximoNível = round(40 × 1,2^(nível−1))`, teto no nível 20.
- Cada nível concede **1 ponto** de árvore.
- Alvos de treino dão **25 XP** e param de dar XP no nível 5; XP de missão
  continua valendo em qualquer nível.
- XP, nível, pontos e ranks são salvos em `progress.archetypeProgress[arquétipo]`,
  que já existia nos saves — a migração só adiciona campos neutros.

## Árvore

Seis nós por arquétipo, em três ramos com nomes próprios:

| Ramo | Nós | Efeito por rank |
| --- | --- | --- |
| Ataque | `ataque_1` (3 ranks) | +6% dano básico |
| Ataque | `ataque_2` (2) — exige `ataque_1` rank 2 | +10% dano básico, +3% crítico |
| Fluxo | `fluxo_1` (3) | −5% recarga |
| Fluxo | `fluxo_2` (2) — exige `fluxo_1` rank 2 | −5% recarga, +1,5 energia |
| Eco | `eco_1` (3) | +8% dano de habilidade |
| Eco | `eco_2` (1) — exige `eco_1` rank 2 | +15% XP recebido |

Os custos crescem por rank (`1, 1, 2`, etc.). A árvore abre no diário
(`J`): mostra nível, XP, pontos e os seis nós, com botão por nó. Nó
bloqueado informa o motivo (pontos ou pré-requisito).

## Missões contáveis

`CALIBRAÇÃO DE CAMPO` começa ao concluir a avaliação com o NEXO-04:
derrotar 3 ecos de treino rende 60 XP, 1 ponto e o item
`registro_de_calibracao`. A recompensa é entregue uma única vez; o diário
mostra `atual/alvo` por objetivo.

As missões antigas (`embarque_dimensional`, `calibracao_de_eco`) seguem com
o fluxo próprio e não foram reescritas: `progress.activeQuest` continua
sendo a missão principal. `progress.questLog` guarda apenas as missões
novas, e abrir o diário não altera o save.

## Testes

```bash
node --experimental-default-type=module tests/combat-basic.mjs
node --experimental-default-type=module tests/rpg.mjs
node --experimental-default-type=module tests/missoes.mjs
node --experimental-default-type=module tests/dano-habilidades.mjs
```

## Pendências honestas

- Inimigos agressivos, vida do jogador com dano real, invulnerabilidade e morte.
- Escalonamento dos alvos de treino por mapa (hoje todos têm 60 de vida).
- Dano de habilidade em inimigos que se movem e resistências por tipo.
- UI dedicada da árvore fora do diário e feedback sonoro.
- Balanceamento só pode ser fechado depois do primeiro inimigo real.
