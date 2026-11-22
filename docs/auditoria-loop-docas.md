# Auditoria e correção — animação das Docas no jogo real

## Causa reproduzida (não uma hipótese de deltaTime zero)

O teste abriu **`index.html`**, clicou em **Iniciar jogo → Continuar** e carregou um save sintético nas Docas com a incursão não iniciada e 600 segundos restantes. Nenhum teste chamou `render()` manualmente ou avançou artificialmente o relógio do gameplay.

Antes da correção:
- Navegador com `prefers-reduced-motion: no-preference`: o loop real desenhou 38 vezes o pesqueiro, com 12 quadros de atlas diferentes durante a observação.
- Navegador com `prefers-reduced-motion: reduce`: o loop real desenhou 44 vezes o pesqueiro, mas sempre no mesmo quadro.
- Nos dois casos, `iniciada=false` e `restante=600`. Não havia erro de JavaScript.

O bloqueio reproduzido estava em **`js/engine/docas-view.js`, dentro de `renderDocas`**:

```js
const reduced = !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const t = reduced ? 0 : now / 1000;
const clock = reduced ? null : t;
```

`0`/`null` são, corretamente, a convenção de pose fixa dos desenhadores. O problema era acioná-la silenciosamente por uma preferência herdada do Windows/navegador, sem uma escolha visível no jogo. Esse mesmo sinal congelava pesqueiro, tentáculo, espuma e mar. **`js/ui/mare-cromatica-hud.js`, em `desenharAtmosferaCromatica`**, também consultava a preferência do sistema separadamente e fixava o tempo da névoa.

Isso reproduz um caminho concreto para o sintoma relatado; não comprova qual configuração existe no computador do usuário, ao qual não houve acesso. Não foi encontrado um congelamento causado pelo estado AGUARDANDO. O renderizador já recebia `performance.now()` e o `dt` da simulação já avançava quando a missão estava em espera.

## Fluxo corrigido

1. **`js/main.js`, `frame(now)`**: avança `state.docasAnimation` uma vez por callback real de `requestAnimationFrame`, **antes de `await update(dt)`**. Assim, retornos antecipados de calibração, diálogo e menus da simulação não interrompem a cena.
2. **`js/engine/docas-animation.js`**: centraliza o relógio visual e a escolha de movimento. O delta visual vem do RAF, separado do limite de 33 ms da física, para que uma máquina a menos de 30 FPS não deixe a maré em câmera lenta. Deltas inválidos/negativos são ignorados, o salto máximo é 250 ms e abas ocultas não acumulam saltos. Não grava tempo visual no progresso ou no save.
3. **`js/engine/renderer.js`, `render(map,state,frameNow)`**: recebe o timestamp do RAF e encaminha-o ao renderizador das Docas. Chamadas externas antigas continuam compatíveis.
4. **`js/engine/docas-view.js`, `renderDocas`**: usa `tempoVisualDocas(state,now)`. Em gameplay, casco, ondas, espuma, reflexos, névoa, brilho e tentáculo recebem o mesmo tempo visual. O timestamp de fallback só atende chamadas isoladas sem runtime do loop.
5. **`js/ui/mare-cromatica-hud.js`, `desenharAtmosferaCromatica`**: a bruma das Docas usa o mesmo tempo e a mesma preferência, não uma segunda consulta independente ao sistema.

### Movimento existente agora ligado à política/relógio únicos

| Elemento | Caminho de desenho |
| --- | --- |
| Subida/descida e rotação do pesqueiro | `docas-cais-view.js → poseNavio` em `docas-vivas.js` |
| Cordame, fumaça e caústica do casco | `docas-pesqueiro-03.js → desenharCascoPesqueiro03` |
| Janelas e lanterna | `docas-cais-view.js`, pulso das lâmpadas a partir de `clock` |
| Água/espuma/reflexos do pesqueiro | `docas-vivas.js → desenharMarPesqueiro03` |
| Tentáculo orgânico e anéis magenta | `docas-costa-view.js → desenharTentaculoRessaca → docas-tentaculo-02.js` |
| Ondas e bruma do setor | `docas-view.js` e `mare-cromatica-hud.js` |

Não foi adicionado outro balanço por cima do casco. O deck, estacas e colisões continuam fixos; a animação acontece na água, no pesqueiro e nos efeitos do cais. A posição do tentáculo não foi alterada nesta correção.

## Controle explícito, sem congelamento silencioso

No HUD das Docas, abaixo do botão de som, há **Movimento da cena**:
- **Normal — animado**: padrão solicitado; mantém o gameplay animado mesmo se o navegador herdar redução de movimento do sistema.
- **Reduzido — estático**: escolha explícita; fixa a pose, o balanço, a névoa e os pulsos decorativos.
- **Seguir sistema**: opção explícita para respeitar `prefers-reduced-motion`, inclusive mudanças durante a sessão.

A escolha é persistida separadamente em `BLOCO404_DOCAS_MOVIMENTO`, sem alterar progresso. Outros mapas e a navegação mantêm suas políticas anteriores. O usuário que precisa de movimento reduzido pode selecioná-lo pelo teclado no HUD; o controle tem rótulo acessível e foco visível.

## Confirmação no loop real

O teste **`tests/docas-gameplay-live-browser.mjs`** roda em Chromium contra servidor HTTP estático, como o fluxo usado pelo Live Server. Abre o menu e o save de verdade. A câmera é apenas enquadrada para mostrar costa e pesqueiro; não há chamada de render manual nem alteração do relógio de animação. O teste observa as chamadas de canvas feitas pelo RAF do jogo.

Exemplo de execução, com o navegador inicialmente forçado a `reduce`:

| Observação (~1,3 s) | Normal | Reduzido explícito |
| --- | ---: | ---: |
| Desenhos do casco | 28 | 42 |
| Quadros distintos do casco | 11 | 1 |
| Inclinações distintas do casco | 28 | 1 |
| Quadros distintos do tentáculo | 13 | 1 |
| Quadros distintos de onda de proa | 6 | 1 |
| Quadros distintos do anel magenta | 5 | 1 |
| Cores/intensidades distintas do pulso da cabine | 28 | 1 |
| Posições observadas das seis elipses de névoa | 168 | 6 |
| Cronômetro da missão | 600 s | 600 s |

Também passaram: retorno de Reduzido para Normal sem reload; calibração ligada; mapa tático aberto (simulação retornando cedo); modo Sistema com troca da preferência do navegador; persistência após reload; ausência de erros de página/HTTP. Com calibração ligada, o teste observou 11 quadros do casco, 15 do tentáculo e 35 inclinações, mantendo a missão em espera.

O resultado confirma movimento **no `index.html` e no RAF do jogo**, não apenas numa prévia. Não houve acesso ao Live Server da máquina do usuário, jornada integral com save pessoal nem benchmark de FPS.

## Reprodução

```sh
node tests/docas-animation.mjs
# Iniciar o projeto em qualquer servidor HTTP estático (porta 8000 por padrão).
BROWSER_EXECUTABLE=/caminho/para/chromium \
PLAYWRIGHT_MODULE=playwright-core \
node tests/docas-gameplay-live-browser.mjs
```

O teste de navegador é opcional e requer Playwright/Chromium. Aceita `PREVIEW_ORIGIN`, `BROWSER_LIBRARY_PATH` e `CAPTURE_ART=1` para salvar métricas/capturas em `.qa/` (ignorada pelo Git). Testes anteriores de cais, maré, navegação, missões e boot também passaram. Nenhum atlas ou arte foi regenerado para esta correção de integração.
