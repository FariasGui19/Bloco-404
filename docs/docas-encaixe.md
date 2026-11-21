# Docas da Neblina — reconstrução e encaixe isométrico

## Ver o resultado

- [Prévia animada no renderizador real](previa-docas-encaixe.html): mapa completo, detalhe central, antes/depois e movimento reduzido.
- [Referência × resultado](../qa/docas-encaixe-comparacao.jpg).
- [Captura completa](../qa/docas-encaixe-resultado.png) e [detalhe](../qa/docas-encaixe-detalhe.png).

A prévia não lê nem grava a partida. O botão de comparação alterna a composição anterior usando o mesmo mapa, relógio e renderizador — não uma montagem alternativa. A fogueira aparece acesa na prévia; na partida continua respeitando a flag de interação `docas_fogueira_acesa`.

## Arte e registro

Foram preparados **3 atlas PNG RGBA com 30 peças**, abaixo do limite de 10 folhas. São recortes mascarados da referência fornecida, não pinturas novas geradas por IA nem arte de resolução superior. A imagem já existente em `assets/sprites/docas-neblina/referencia.png` é byte a byte idêntica ao anexo (SHA-256 registrado no manifesto). A fonte de 1672×941 é registrada na planta histórica de 1568×882.

- `estruturas.png`: cabana frontal, cabana elevada, oficina de cobertura arqueada, cabana direita, torre, farol, núcleo, porta e dois anexos.
- `relevo.png`: faces do penhasco, escadaria e piso do pátio. Os prédios/props são subtraídos das máscaras do relevo: não há uma imagem inteira achatada substituindo as entidades. Faces verticais são desenhadas fora do recorte do piso caminhável; não são confundidas com novas superfícies de colisão.
- `vida.png`: palmeiras, árvore seca, cristais, carga, barris, cerca e runa.

`manifest.json` e `docas-encaixe.js` descrevem retângulo no atlas, caixa na planta, camada e posição do pé para cada peça. Gutters transparentes de pelo menos 4 pixels, RGB transparente zerado e máscaras suavizadas evitam contaminação entre frames. A reprodução é feita com `tools/preparar-docas-encaixe.py` (Pillow e NumPy).

A escala e o contorno dos prédios deixam de depender da razão de aspecto dos sprites genéricos. As antigas estruturas/decorativos continuam nos dados, mas sua representação visual é substituída para evitar duplicatas; se qualquer atlas faltar, o renderizador mantém a composição anterior inteira. Posições de missão/portas e seus IDs não mudam.

### Profundidade e animação

As peças de objeto entram na mesma lista de profundidade do personagem, dos adversários e dos elementos do cais. O pé visual é explícito; teste de navegador verifica personagem à frente da cabana do fundo e atrás da oficina, sem usar o topo do recorte como profundidade. Sombras de contato são desenhadas na camada de chão.

Luzes nas posições reais das janelas, varredura dos dois monitores frontais, emissão do núcleo, torre vermelha, pulso dos cristais, deformação mínima das palmeiras pelo pé e bruma baixa usam exclusivamente o relógio visual existente. Sem timers, aleatoriedade por frame, mudanças de missão ou writes no save. O modo reduzido mantém as fontes legíveis, mas estáticas. A fogueira/fagulhas usam a implementação existente, condicionada à flag original.

## Sistemas preservados

Sem mudanças em câmera, input, movimentação, `DimensionManager`, save, missão, renderizadores/atlas do cais, barcos ou mar. Os oito contratos de `docas-central.mjs` continuam aprovados: layout, geometria/colisão, cais, costa oeste, spawns, objetos, portais e elementos marítimos têm os mesmos hashes. A única opção adicionada aos dados do mapa é `meta.docasEncaixe` para apresentação.

## Validação desta execução

- Suíte completa `tests/*.mjs`: **207 sucessos, 9 opcionais ignorados e 23 falhas preexistentes**. As mesmas 23 falhas foram reproduzidas numa extração local dos módulos e testes do commit-base `8fb1742`; não foram corrigidas fora do escopo.
- `docas-encaixe.mjs`: manifesto, três folhas, 30 peças, origem, gutters, limites UV, fallback e profundidade.
- `docas-encaixe.py`: alpha, gutters transparentes, RGB invisível limpo e frames não vazios.
- Chromium configurado, executados explicitamente:
  - `docas-encaixe-browser.mjs`: UVs e peças no mapa real, oclusão com personagem, antes/depois determinístico, cinco animações testadas **isoladamente** (oficina, torre, cristal, palmeira e núcleo), repouso estável, storage/estado intactos e nenhum erro HTTP/JS.
  - `docas-central-browser.mjs`: prévia central, animação/repouso/retomada e storage intacto. A verificação de arte foi atualizada para os atlas que substituem os PNGs avulsos.
  - `docas-gameplay-live-browser.mjs`: index real, menu/save/RAF, navegação/calibração, barcos/água/tentáculo em movimento, redução/retomada e reload.
  - `docas-pesqueiro-03-browser.mjs`: dez folhas e ordem costa/mar/casco no renderizador real.
  - `dimension-rupture-browser.mjs`: terminal final → diálogo Nulo → ruptura → Limiar → Esc/2D; referências, vitais e resultado mantidos.
- `estrutura.mjs`, `boot.mjs`, `docas-neblina.mjs`, `docas-central.mjs` e `git diff --check` aprovados.

Falhas preexistentes: `caminho-correntes`, `combat-basic`, `docas-lote5/8/9/10/11/12/13`, `enseada-2-lote4/5/6/7/8/9/10`, `enseada-3-reference`, `enseada-4-lote`, `enseada-ecos`, `enseada-reconstrucao`, `limiar-frequencia`, `nado-desenho`, `oceano-animado`.

## Limites visuais explícitos

O resultado aproxima as estruturas e o penhasco da pintura, mas **não é uma reprodução exata pixel a pixel** do mapa inteiro nem uma elevação de resolução da fonte. A costa oeste, o cais e as embarcações animadas preservados têm proporções/posições diferentes da referência; permanecem algumas transições geométricas visíveis nas bordas sul/leste. Não alteramos a malha física para mascarar essas diferenças, e não declaramos essas margens como concluídas com exatidão. A comparação inclui a referência inteira para tornar tais diferenças verificáveis.
