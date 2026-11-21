# Referência visual e ponte da Ruptura Dimensional

## Visual compartilhado (jogo, laboratório, Morfador)

As duas referências anexadas orientam a identidade, traduzida para o rig low-poly existente, não uma reprodução pixel a pixel:

- Maxilar/queixo mais afilados, óculos escuros mais retangulares e bigode menos inclinado.
- Mechas com mais volume, orientação ondulada e contraste discreto no cabelo; laterais curtas preservadas.
- Domínio Ancião mantém armadura escura e ouro. Braços tatuados expostos, abas traseiras divididas e retirada da lente circular/monóculo para conservar os óculos do operador.
- Lâmina e rastro continuam **dourados**, conforme o pedido textual, apesar do ciano da imagem. Empunhadura, poses e transformações existentes preservadas.
- Sem texturas novas, sem luzes extras, `NearestFilter` preservado. A galeria mede 23.530 triângulos / 176 chamadas / 12 texturas com os quatro rigs; não é benchmark de GPU física.

## Como acionar no gameplay

1. Concluir a estabilização da âncora da Maré Cromática, com desfecho `total` **ou** `parcial`.
2. Atravessar o portal 2D até `mare_cromatica_fenda`.
3. Interagir com `cromatica_limiar_final` (EXAMINAR O OUTRO LADO).
4. O diálogo acusa uma sabotagem deliberada do **Operador Nulo**: a âncora foi estabilizada, mas ele interferiu na saída. A falha não é derrota nem expiração do cronômetro.
5. Ao fechar o diálogo, o adaptador aguarda os bloqueios normais de entrada (menus, cutscenes, carregamento etc.) e chama o `DimensionManager` existente.
6. A sequência de descompressão/ruptura existente recebe a identificação narrativa e desemboca no Setor Limiar funcional.
7. Esc retorna ao ponto 2D da Fenda, com a mesma progressão e atributos. Não há loop automático de entrada.

O cronômetro, o colapso antigo e as soluções da missão não foram reescritos. Saves antigos não ganham flags só por leitura ou carregamento. O novo registro nasce apenas da interação elegível.

## Contrato modular

`js/dimension/rupture.js` não importa DOM, Three.js ou a implementação de missões futuras.

- `canRequestRupture(state)`: consulta pura dos pré-requisitos.
- `requestRupture(state)`: agenda de modo idempotente; o chamador salva o registro.
- `createRuptureBridge({state, manager, save, emit})`: observa a agenda e delega a travessia transacional.
- Identificador estável: `mare-cromatica:nulo:limiar-v1`.
- Registro aditivo: `progress.dimensionalRupture = {id, status, source, destination}`.
- Estados persistidos: `pending`, `arrived`, `unavailable`.
- `arrived` só é gravado após o manager alcançar `3d`, não quando o carregamento começa.
- Falha de WebGL/cancelamento antes da chegada: rollback original para 2D, estado `unavailable`, nova tentativa por interação explícita.

A UI publica **`bloco404:rupture-phase`**, com `detail = {id, phase, source, destination}` imutável:

| phase | Ponto de extensão |
| --- | --- |
| `interference` | início da sabotagem; possível direção de cena futura |
| `entering` | runtime criado; sequência de entrada em andamento |
| `arrived` | primeira chegada confirmada ao 3D; ponto para futura progressão pós-ruptura |
| `returned` | retorno seguro ao 2D após essa travessia |
| `unavailable` | recuperação sem reset; feedback/telemetria opcional |

Exemplo de extensão **futura**, não instalada automaticamente:

```js
window.addEventListener('bloco404:rupture-phase', ({detail}) => {
  if (detail.phase !== 'arrived') return;
  // Futuro coordenador: decidir quando revelar a divisão principal do 404.
  // Persistir seus próprios marcos idempotentes, não depender só do evento.
  // Evolução dos kits, operadores/duplas/pupilos entram em módulos separados.
});
```

Nenhuma divisão do 404 foi inventada, nenhum level/kit foi promovido e nenhum outro operador foi desbloqueado. Os hooks apenas fornecem pontos claros para as próximas etapas. O evento de debug `bloco404:rupture` permanece separado do fluxo narrativo.

## Validação e ressalva de baseline

- **198 testes Node passaram**, incluindo todos os testes dimensionais, Maré Cromática e o novo `dimension-rupture.mjs`.
- A execução ampla encontrou **23 falhas preexistentes**. Todos esses casos também falham na revisão-base `97fa020ac4cf90ae21ba00afce985caef5165db8`; não houve nova falha nessa comparação. Não foram alterados mapas/assets legados para mascarar essas falhas.
- Falhas: caminho-correntes; combat-basic; docas-lote5/8/9/10/11/12/13; enseada-2-lote4/5/6/7/8/9/10; enseada-3-reference; enseada-4-lote; enseada-ecos; enseada-reconstrucao; limiar-frequencia; nado-desenho; oceano-animado.
- **8 suítes Chromium/WebGL passaram**: dimension, surgery, master-morpher, living, polish, sculpt, environment e rupture.
- A nova suíte browser testa a interação real do terminal, diálogo, bloqueio durante diálogo, sequência de entrada, chegada, evento de retorno, Esc, identidade dos objetos, vida e desfecho preservados.
- Cobertura existente: HUD X10, controles/transformações, Morfador isolado, saves, perda de contexto, mobile, movimento reduzido e retorno 2D.

Capturas locais não versionadas: `.qa/surgery-face.png`, `.qa/living-sword.png`, `.qa/rupture-dialogue.png`, `.qa/rupture-entering.png`.
