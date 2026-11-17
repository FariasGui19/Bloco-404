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
ou `node --experimental-default-type=module tools/gerar-folhas-enseada-lote6.mjs`.
As folhas usam o mesmo recorte de `sprite-clean.js` que o renderizador; se a
arte-base mudar, regenere e atualize as dimensões no teste do lote.
