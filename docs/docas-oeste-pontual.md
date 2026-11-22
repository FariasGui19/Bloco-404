# Ajuste pontual do recanto esquerdo — Docas da Neblina

Base: `1ddc250d49a00475c0248fe738c6149c3b4070da`. Escopo: exclusivamente a região esquerda indicada nas duas imagens do pedido. Não é uma nova revisão do mapa inteiro.

## Ver resultado

- [Antes / referência / resultado](../qa/docas-oeste-pontual-comparacao.jpg) — a primeira coluna usa a **segunda imagem fornecida pelo usuário**, sem substituir a referência por outra interpretação.
- [Recanto completo no render real](../qa/docas-oeste-pontual-pontual.png).
- [Mapa completo](../qa/docas-oeste-pontual-full.png) e [mapa completo anterior](../qa/docas-oeste-pontual-full-antes.png).
- [Prévia animada](previa-docas-oeste-pontual.html): selecionar “Recanto esquerdo completo”. Links “Versão anterior” e “Com ajuste” carregam a mesma câmera/renderer com e sem os recursos desta revisão. Pausa e movimento reduzido disponíveis. Não grava saves.

## Composição corrigida

### Margem e trilha

O promontório alto com topo plano foi retirado da apresentação nesse recorte, junto com os recortes de musgo/pedras que pertenciam àquela montagem. Em seu lugar há uma margem baixa irregular, rochas menores, arbustos e uma trilha de areia curva contornando a água.

A base antiga elevada atrás das palmeiras recebe remoção localizada com transição de alpha, apenas no cache visual. A praia dianteira e sua ligação com o caminho da casa vizinha são preservadas. A arte nova tem borda inferior irregular e suave: não se usa um retângulo opaco cobrindo a água nem se corta um triângulo do caminho para assentar a peça.

### Cristais, palmeiras, abrigo e cerca

Os cristais estão agrupados **nas raízes das duas palmeiras, imediatamente à esquerda e um pouco atrás do abrigo**, em vez de isolados no centro da areia. A luz roxa aparece na vegetação, no solo e na lateral do abrigo, com variação pequena de intensidade.

O abrigo foi reconstruído com telhado baixo azul-violeta/ferrugem, placas irregulares, esteios, frente escura e ripas. A cerca fica à direita, em camada de profundidade própria. A montagem antiga da cabana, o tronco solto e os arbustos antigos que caíam dentro do recorte deixam de competir com os elementos novos. O prop `lote5_destrocos`, que cruzava o limite dianteiro, é removido **somente da apresentação**; sua caixa de exclusão de comparação é explícita.

A casa grande vizinha não foi redesenhada. A cerca nova encontra a composição existente na borda direita do recorte.

### Árvore seca e névoa

A árvore tem tronco curvo, ramos finos e musgo pendente, atrás das palmeiras/abrigo. A árvore antiga que fazia parte da imagem compartilhada dos fundos é removida apenas na sobreposição local, sem mexer no restante dessa cabana/vegetação.

Três bancos suaves de névoa usam a folha animada existente: atrás da vegetação/árvore, junto à praia dianteira e na margem rochosa esquerda. Há uma bruma difusa de baixa intensidade ao fundo e na junção frontal. A névoa e o brilho param no recorte. No modo reduzido, o resultado fica estável.

## Arte e profundidade

Foi feita **uma geração nova**, guiada pela segunda imagem e pelo recorte correspondente da prancha original. Fonte: `assets/source-art/docas-oeste-pontual/composicao.png`, 1216×864.

O processamento separa a composição em **seis camadas exclusivas**, sem duplicação de pixels entre elas:

| Camada | Profundidade/pé na planta |
|---|---:|
| Solo, areia, margem baixa e pedras | passe de terreno |
| Árvore seca | Y385 |
| Palmeiras | Y423 |
| Cristais | Y451 |
| Abrigo | Y453 |
| Cerca dianteira | Y490 |

Uma imagem RGBA de atlas, **2048×1034**, contém os seis recortes com gutters. A planta de composição é `(85,210,435,310)`, com cerca de **2,8 pixels de fonte por unidade da planta**. O close é renderizado novamente na câmera próxima, não ampliado a partir de screenshot pequeno.

Os recortes usam `sourceBox=[left,top,right,bottom]`; o código calcula a largura/altura pela diferença dos extremos. Há regressão específica para impedir que esses extremos sejam tratados como dimensões, o que esticaria cada camada.

A arte nova segue a composição da referência, mas é uma reconstrução, não uma cópia pixel a pixel. Traço, tábuas, detalhes das pedras e ramificações têm pequenas diferenças. Não se afirma perfeição literal ou resolução infinita em qualquer zoom.

## Limite da edição e preservação do resto

`RECORTE_OESTE` em `js/engine/docas-oeste-pontual.js` define um polígono local de apresentação. Supressões da montagem antiga, camadas novas, brilhos e névoa usam esse limite. O resto do cenário continua nos caminhos de render anteriores.

A fonte compartilhada `fundos-enraizados.png` também contém a árvore antiga à esquerda. Recortar esse bitmap inteiro já redimensionado provocava pequenas diferenças de reamostragem em sua borda direita, fora do pedido. A solução foi gerar **uma cópia mascarada em resolução nativa**, `fundos-preservados.png`, sem alterar o original. Os pixels fora da máscara local são preservados byte a byte. Não é uma segunda arte gerada nem um redesenho dos fundos.

O atlas novo e essa cópia são uma unidade de prontidão: se um faltar, a região inteira usa a montagem anterior. O cache do terreno é invalidado se esse estado de prontidão mudar; não deixa uma substituição pela metade.

**Comparação Chromium:** 86.747 pixels alterados dentro do recorte e **zero pixels alterados fora** do polígono com guarda de 3 px para antialias e da caixa do prop deslocado removido. A câmera é idêntica e o relógio visual é fixado no mesmo instante. Essa comparação cobre também cais/barcos, margem direita, cabanas centrais, mar distante, farol e portal.

Nenhuma modificação em dados de colisão/movimentação, controles, spawns, missões, saves, `DimensionManager`, atlas anteriores ou animação global do mar. A troca é visual: as máscaras físicas anteriores são mantidas, não se cria uma passagem nova pela margem.

## Reprodução

Requer Pillow e NumPy:

```sh
python tools/preparar-docas-oeste-pontual.py
python tests/docas-oeste-pontual.py
node --experimental-default-type=module tests/docas-oeste-pontual.mjs
```

O script registra hashes da fonte nova e da fonte compartilhada antiga em `manifest.json`, faz chroma key/despill, suaviza a linha inferior da praia, separa os objetos, limpa RGB invisível e empacota o atlas. Nenhum atlas anterior é sobrescrito.

## Testes desta execução

- Suíte `tests/*.mjs`: **211 aprovados, 14 opcionais ignorados e 23 falhas herdadas**. Testes temporais de praia executados isoladamente.
- As 23 falhas foram reproduzidas numa extração dos módulos/testes do HEAD anterior às alterações desta revisão.
- **Nove testes Chromium reais aprovados:** oeste-pontual, fidelidade, acabamento, fechamento, encaixe, cirúrgico, pesqueiro-03, gameplay-live e dimension-rupture.
- Novo teste Chromium exige: diferença real dentro do recorte; zero diferença fora; seis camadas usadas uma vez; oclusão com personagem em Y440; cerca depois do abrigo; névoa animada e repouso estável; estado/storage/geometria intactos; fallback integral também quando apenas uma das duas imagens novas falha.
- Teste Python exige: ausência de chroma, RGB transparente limpo, gutters, máscaras exclusivas, tamanhos corretos, praia sem retângulo inferior e pixels da cabana dos fundos intactos fora da sobreposição.
- Contratos/hash centrais, estrutura e boot permanecem aprovados. `git diff --check` limpo.
- Gameplay real verificou menu/save/RAF, espera de missão, mar/barco/tentáculo, redução/retomada e reload.
- Ruptura real verificou terminal final → Nulo → entrada → Limiar 3D → Esc/2D, sem erros de página nem alteração indevida de referências/vitais/resultado.

Três testes de navegador anteriores reconhecem a cópia mascarada como representação da mesma cabana dos fundos, mantendo exigências de presença, contagem e profundidade. Não foram relaxados limiares de desempenho nem contratos de gameplay.

Falhas herdadas: caminho-correntes, combat-basic, enseada-ecos, nado-desenho, docas-lote5/8/9/10/11/12/13, enseada-2-lote4/5/6/7/8/9/10, enseada-3-reference, enseada-4-lote, enseada-reconstrucao, limiar-frequencia e oceano-animado.

Sem PR ou merge nesta etapa; resultado disponível para avaliação visual.
