# Docas da Neblina — acabamento do setor

Base desta revisão: `888840f01570a664a24826adad1d79d27bc86d74`.

## Conferência visual

- [Prévia animada do renderizador real](previa-docas-acabamento.html), com mapa completo e câmeras norte, sul, leste, oeste e centro. Pausa e movimento reduzido disponíveis. Não grava saves.
- [Setor completo](../qa/docas-acabamento-full.png).
- [Referência × resultado](../qa/docas-acabamento-comparacao.jpg).
- Detalhes: [direita/torre](../qa/docas-acabamento-east.png), [casinha/esquerda](../qa/docas-acabamento-west.png), [norte](../qa/docas-acabamento-north.png), [sul](../qa/docas-acabamento-south.png).

A referência é `assets/sprites/docas-neblina/referencia.png`, também fornecida como `Docas da Neblina Neon.png`. As capturas são do Canvas real do jogo, sem retoques posteriores. A comparação apenas redimensiona as duas imagens e acrescenta legendas.

## Mudanças

### Casinha

Uma nova cabana foi gerada, com telhado violeta gasto, abertura frontal escura, janela pequena, degraus e fundação curta. Mantém o destino (337,369,123,88), o pé Y451, a posição na ordenação por profundidade e a sombra de contato. O brilho agora acompanha a janela lateral pequena, em vez das duas janelas da arte anterior. A porta recebe preenchimento interno escuro no processamento, sem deixar o oceano aparecer através da parede. Se o sprite novo faltar, há fallback para a casinha anterior.

### Solo, torre vermelha e anexo direito

Removido o preenchimento bege plano a 85% e o recorte minúsculo repetido a 16%. O reparo utiliza material novo de pedras pequenas, areia escura e fissuras, com bordas de repetição coincidentes. A textura é aplicada **dentro do recorte de terra existente**, sem converter água ou deck em piso novo. Não amplia um fragmento de baixa resolução para cobrir o setor.

Uma segunda arte nova de promontório rochoso fornece superfície superior e frente irregular, com fissuras e raízes. Ela substitui as duas faixas estreitas repetitivas da revisão anterior:

- Torre: (1276,444,129,76), sob o apoio da torre em torno de (1355,456), abaixo da sua treliça.
- Anexo: (1013,595,151,58), atrás do edifício e seus pilares, em continuidade com a margem existente.

As posições foram reduzidas após inspeção em close: a primeira tentativa criava uma plataforma larga demais. As peças finais são apoios cênicos, não ilhas ou superfícies novas de colisão. Permanecem diferenças de desenho entre esses apoios novos e a falésia pintada original; não se afirma identidade pixel a pixel nem reconstrução completa da malha costeira.

### Oceano

As folhas animadas de onda/cáustica continuam sendo as do cais. Acrescentados reflexos minerais roxos/magenta translúcidos e segmentos de crista quebrados, seguindo `faseRessaca`. Posições em coordenadas de mundo têm dispersão maior para reduzir a aparência de grade. Há luz magenta também no mar de fundo, no leste e no sul, não só no início do cais.

- A malha de células continua limitada a 360 candidatas por chamada.
- A máscara continua excluindo terra, deck e bloqueios, inclusive regiões em que seus polígonos se sobrepõem.
- O setor de contato do barco oeste continua com ganho zero para o novo reforço; não substitui a água/casco já finalizados.
- Movimento reduzido mantém fase e pixels estáveis, sem alterar a preferência persistida durante a prévia.

### Névoa

Oito bancos adicionais usam a folha pintada existente: mar atrás das casas, praia oeste, falésia leste e mar inferior. Deslocamento lento de até 14 unidades, opacidade entre 12% e 21%. Não há banco novo atravessando o pátio central de interação nem cobrindo o topo ciano. A névoa anterior da falésia foi preservada.

## Fontes e reprodução

**Três imagens realmente geradas nesta revisão**, não apenas reamostradas: `assets/source-art/docas-acabamento/{cabana,promontorio,solo-costeiro}.png`.

Execute com Pillow e NumPy:

```sh
python tools/preparar-docas-acabamento.py
python tests/docas-acabamento.py
```

Saídas em `assets/sprites/docas-acabamento/`. O material de piso é um repeat espelhado de quatro quadrantes; os outros sprites têm chroma removido, alpha irregular e RGB invisível zerado depois da redução. As fontes da cabana e rocha fornecem pelo menos quatro pixels por unidade desenhada. Nenhum atlas anterior é sobrescrito.

## Preservações verificadas

Sem modificações nos dados geométricos, controles, colisão, salvamento, missão, câmera do jogo, atlas do cais/barcos ou `DimensionManager`. Farol superior, porta e portal/cristal ciano mantêm seus dados/atlas/poses. Os oito contratos de `docas-central.mjs` e os hashes do topo em `docas-fechamento.mjs` passaram.

## Testes

- Suíte `tests/*.mjs`, sem navegador configurado: **209 aprovados, 12 opcionais ignorados, 23 falhas herdadas**, após reexecução isolada dos dois testes temporais. Na primeira execução com seis processos simultâneos, `praia-performance` e `praia-relevo` também ultrapassaram seus limites de tempo; ambos passaram isoladamente (mar 112–136 ms no primeiro, 246 ms no segundo). Nenhum limiar ou teste de desempenho foi relaxado.
- Todas as 23 falhas restantes foram reproduzidas extraindo os módulos/testes de HEAD anterior à revisão para uma pasta de baseline.
- **Sete testes Chromium executados explicitamente e aprovados:** acabamento, fechamento, encaixe, cirúrgico, pesqueiro-03, gameplay-live e dimension-rupture.
- O novo teste verifica pixels magenta em quatro regiões de mar isoladas, animação/repouso da névoa, ausência de névoa nova no topo protegido, uso dos dois apoios e diversidade de cores do solo (não preenchimento plano).
- Teste de fechamento atualizado para exigir que o render real use a cabana nova **e** a encosta anterior; deixou de esperar duas chamadas ao atlas antigo porque a cabana foi substituída por arquivo independente.
- Dois testes Python de imagens aprovados; estrutura (231 módulos/686 imports), boot, contratos centrais e `git diff --check` aprovados.
- O teste de gameplay usa o index/menu/save reais e confirma mar, barco/tentáculo, redução/retomada e reload. O teste de ruptura executa terminal final → Nulo → entrada → Limiar → Esc/2D, sem erros de página ou alteração indevida de estado.

Falhas herdadas: caminho-correntes, combat-basic, enseada-ecos, nado-desenho, docas-lote5/8/9/10/11/12/13, enseada-2-lote4/5/6/7/8/9/10, enseada-3-reference, enseada-4-lote, enseada-reconstrucao, limiar-frequencia e oceano-animado.

## Escopo e limites

Este acabamento não avança para o farol/portal. Preserva a silhueta física e os barcos bons, portanto costa, proporções e trajetos ainda diferem da ilustração de referência. Os novos apoios são interpretações artísticas, não cópias exatas da pintura. A suíte geral não está toda verde. Não foi aberto nem mesclado PR nesta revisão: o resultado fica disponível para avaliação visual antes da próxima etapa.
