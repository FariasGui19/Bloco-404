# Enseada dos Ecos — checklist de animação

A meta é revisar todos os elementos visíveis, interativos ou não, em lotes.
Uma animação existente não implica que ela esteja aprovada visualmente: cada
lote ainda precisa de revisão no jogo, inclusive com movimento reduzido.
Não tornar objetos lógicos ocultos visíveis apenas para animá-los.

## Já existente antes deste lote

- [x] Fogueira, tenda, biruta, árvores e algumas palmeiras: folhas do lote 3.
- [x] Carrilhão, bambu e arbustos do oeste: folhas do lote 4.
- [x] Rede e gaivotas: quadros alternativos; cascata, portais, fauna e outros
  elementos já usam efeitos procedurais ou animações próprias.

## Lote 5 — dez folhas novas implementadas

Reflexos e pulsos discretos derivados dos recortes atuais, oito quadros em loop,
sem mexer na base, colisão ou ações. São animações ambientais, não respostas
específicas a apertar o botão de interação.

- [x] Relógio de maré — reflexo no mostrador.
- [x] Torre-antena — pulso vermelho no sinal.
- [x] Bancada de campo — reflexos nos detalhes metálicos.
- [x] Monólito de eco — pulsação da luz.
- [x] Estela dos navegadores — brilho das runas.
- [x] Piscina termal — reflexos na água.
- [x] Fonte de cristal — pulsação do cristal.
- [x] Espelho de ressonância — reflexo na superfície.
- [x] Cristais e corais da gruta — brilho dos cristais.
- [x] Lanterna de coral — oscilação da luz quente.

## Lote 6 — dez folhas novas implementadas

- [x] Cais e veleiro — balanço do barco e da ponta da amarra, com píer fixo.
- [x] Árvores de copa redonda — movimento das copas.
- [x] Mata densa do nordeste — vento na parte superior.
- [x] Planta junto à cachoeira — folhas ao vento.
- [x] Corais amarelos — movimento suave na corrente.
- [x] Coral rosa — movimento suave na corrente.
- [x] Portal das Correntes — reflexos na abertura, além do vórtice existente.
- [x] Pedras rúnicas do cais — pulsação dos detalhes iluminados.
- [x] Concha central da praia — brilho suave nos pontos claros.
- [x] Tartaruga marinha decorativa — movimento suave em loop.

Folhas anteriores de palmeiras, árvores do acampamento e arbustos foram
reaproveitadas nas demais instâncias compatíveis da vegetação manual, com fases
diferentes. O vento não altera suas coordenadas nem colisões.

### O que já existia nos elementos pedidos

- [x] Cachoeira da Estação 66.6: fios de água e espuma procedurais.
- [x] Mar: superfície animada, ondulações e ondas configuradas no mapa.
- [x] Piscina termal visível: reflexos do lote 5, anéis e bolhas procedurais. O objeto
  `fonte_termal_enseada` é um ponto lógico oculto, não a piscina visível.
- [x] Fogueira: folha do lote 3 e brilho/faíscas procedurais.
- [x] Portais: vórtices procedurais; o das Correntes recebeu também a folha do
  lote 6. Falta revisar os dois portais visualmente em todas as condições.

## Lote 7 — revisão de visibilidade (dez folhas)

Os lotes anteriores foram marcados como implementados sem validação suficiente
no jogo. Os deslocamentos eram pequenos demais na escala em que as artes são
exibidas. Este lote substitui as folhas dos pontos abaixo por quadros mais
perceptíveis (o código anterior continua no histórico/arquivos, mas não é a
animação ativa desses pontos):

- [x] Cachoeira da Estação 66.6 — dezena de filetes móveis e espuma.
- [x] Piscina termal — ondulações na água, sem mover as pedras.
- [x] Fogueira — chamas oscilantes com base fixa.
- [x] Barco do cais — movimento do casco e da amarra, píer fixo.
- [x] Portal das Correntes — anéis na abertura, além do vórtice existente.
- [x] Palmeira alta — copa ao vento.
- [x] Palmeira baixa — copa ao vento.
- [x] Palmeira jovem — copa ao vento.
- [x] Palmeira média — copa ao vento.
- [x] Árvore do acampamento — copa ao vento.
- [x] Mar da Enseada: luz móvel não é mais inteiramente desligada pelo
  controle automático de desempenho; mantém um único desenho adicional.
- [x] Chromium: o renderizador real carregou e desenhou as dez folhas em dois
  tempos distintos; movimento reduzido usa a arte estática.
- [ ] Revisão humana dos ciclos, contraste e encaixe em todos os zooms e
  dispositivos. O teste de navegador não substitui esta avaliação.

## Próximos lotes — ainda não concluídos

- [ ] Inventariar e revisar as demais instâncias de vegetação, incluindo
  árvores, palmeiras, arbustos e mata; reaproveitar folhas compatíveis.
- [ ] Revisar água, espuma, piscina, portais e cascata no jogo; aperfeiçoar
  movimento e transições onde necessário, incluindo avaliar vapor na piscina.
- [ ] Revisar cais, barco, boias, redes e objetos da praia e do mar.
- [ ] Revisar fauna, cardumes, borboletas e pássaros com seus habitats.
- [ ] Revisar gruta, conchas, placas, pedras e demais marcos interativos;
  decidir quais pedem resposta visual à interação, além do movimento ambiente.
- [ ] Auditar itens ocultos/lógicos e efeitos já existentes para evitar
  duplicações; testar colisões, acessibilidade e desempenho em cada lote.
- [ ] Fazer validação visual completa em todos os setores e com movimento reduzido.

Regerar as folhas: instalar `@napi-rs/canvas` sem salvar dependência e executar
`node --experimental-default-type=module tools/gerar-folhas-enseada-lote5.mjs`
ou `node --experimental-default-type=module tools/gerar-folhas-enseada-lote6.mjs`
ou `node --experimental-default-type=module tools/gerar-folhas-enseada-lote7.mjs`.
As folhas usam o mesmo recorte de `sprite-clean.js` que o renderizador; se a
arte-base mudar, regenere e atualize as dimensões no teste do lote.

Teste opcional de renderização no navegador: instale `playwright-core` sem salvar
a dependência e execute `BROWSER_EXECUTABLE=/caminho/para/chromium node
--experimental-default-type=module tests/enseada-animacao-render-browser.mjs`.
Ele usa um mapa real e registra as chamadas de desenho; não usa nem altera saves.

## Dioramas e resposta a interações (etapa independente dos lotes de folhas)

- [x] Controlador comum com entrada/saída, pausa do mundo, restauração da
  câmera e dos controles, e ações por teclado ou botão.
- [x] Fonte e gruta em camadas 2.5D; partículas limitadas, chuva e luz do
  estado real do clima. Fonte com capivara, carinho e recuperação gradual;
  gruta com observação e descanso. Recompensas anteriores preservadas.
- [x] Carrilhão reage à aproximação e ao uso; som sintetizado opcional (desligado
  até ser ativado na cena). Marcos suportados têm gesto curto e pulso visual,
  antes de executar a interação e o progresso já existentes.
- [ ] Refinar os gestos isométricos em animações próprias por objeto: limpar a
  estela, empilhar pedras, aquecer mãos, deitar/balançar na rede e reflexão no
  espelho. Os gestos atuais são aproximações, não folhas dedicadas.
- [ ] Avaliar tempo/dia e avanço de tempo ao descansar quando existir um
  relógio de jogo compatível. O clima atual não fornece esse relógio.
- [ ] Revisar FPS real em dispositivos diversos e gestos em todos os zooms;
  as cenas FPV de monólito, estela e pedras continuam fora desta etapa.

Teste: `node --experimental-default-type=module tests/imersao-enseada.mjs`.

## FPV — lote 1: dez folhas de efeitos pixelados

- [x] Mar, ondas, ondulações, vapor, bolhas, chuva, respingos, mão,
  brilho de carinho e cascata: dez folhas de 8 quadros, 32×32 por quadro.
- [x] Dioramas compostos em resolução fixa com planos independentes: fauna
  costeira e piscina/palmeiras animadas já existentes, rochas, concha e recorte
  do tileset da praia. Os panoramas e a capivara gerada foram removidos.
- [x] Capivara usa quadros existentes de fauna com linha d'água e respiração;
  chuva e luz seguem o clima real, e o movimento reduzido fixa os quadros.
- [x] Teste de composição e teste do controlador; inspeção das duas cenas e
  saída no navegador. As folhas se regeneram com
  `python tools/gerar-folhas-enseada-fpv.py` (requer Pillow).
- [ ] Refinar desenho do braço por arquétipo e criar quadros específicos de
  nado/carinho da capivara; a folha atual é a da fauna do jogo, recortada na
  linha d'água, não uma folha de nado dedicada.
- [ ] Validar desempenho e enquadramento em dispositivos, proporções e zooms
  variados. O FPS de 60 não foi medido em hardware de referência.

## Correção visual dos dioramas — em andamento

- [x] Fonte: mão geométrica retirada; carinho usa pequenas ondulações e
  reflexos sem cobrir a capivara. UI compartilha uma barra discreta e foco
  visível, com mensagem estável para leitores de tela.
- [x] Fonte e gruta: água com textura do tileset da praia, vegetação de folhas
  do mapa, horizonte e camadas com deslocamentos independentes.
- [x] Duas novas peças transparentes de primeiro plano, ilustradas a partir
  das referências visuais da piscina e da concha (não são sprites originais do
  mapa), mais cópias de folhas de vegetação com franjas magenta reduzidas.
- [x] Gruta: moldura de madrepérola com abertura real e mar até o primeiro
  plano, sem a antiga faixa chapada de areia; chuva continua atrás da moldura.
- [x] Passeio nas duas cenas em Chromium, além de conferência da UI em 375×667
  com movimento reduzido. Testes de controlador, camadas e estrutura passaram.
- [ ] Prosseguir com o lote solicitado de dez folhas para a fonte e depois
  outro para a gruta: esta revisão acrescenta duas peças ilustradas e duas
  cópias limpas, não dez folhas novas. Substituir também o céu ainda simples,
  refinar a transição água/capivara e validar o enquadramento da concha em mais telas altas.
- [ ] Fazer revisão visual humana e medir desempenho em dispositivos reais.
