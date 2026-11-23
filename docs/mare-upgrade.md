# Maré Cromática — upgrade PSX 3D

Substitui o corredor pseudo-3D em raycaster da Baía de Quarentena por uma cena
Three.js de baixa poligonagem, mantendo a mesma missão, saves, HUD e contratos de
teste. O objetivo é PS1/Puppet Combo: névoa densa, texturas de 256 px com
`NearestFilter`, lanterna presa ao olhar e câmera com pitch real.

## O que mudou

- **Cena 3D contínua** (`js/dimension/mare-mission-world3d.js`): 32×32, sem teto,
  com cais, água, containers, dois guindastes, farol, cabanas e adereços. O
  renderizador WebGL é composto no canvas 384×216 da missão, então screenshots,
  mapa, HUD e testes continuam usando uma única superfície.
- **Câmera livre**: mouse/arraste e botões `↑`/`↓` alteram o pitch, com clamp
  natural em `-0,92..0,92`; a lanterna `SpotLight` acompanha o olhar. O `[E]`
  agora só aparece com alvo real, sem `undefined`.
- **Entrada cinematográfica**: a fumaça abre em 2 s com o letreiro
  `BAÍA DE QUARENTENA / 03:12 // A ÂNCORA NÃO RESPONDE`.
- **Ruptura**: aos 4 s do fim, o colapso devolve o jogador ao módulo de dimensão;
  a janela de `entering` da missão foi reduzida para 0,9 s em
  `dimension-manager.js` para não engolir cliques em máquinas lentas.
- **HUD**: bússola, barras de sinal, tensão, lanterna, leitura longa (recortada
  visualmente, preservada para QA) e moldura de scanlines/VHS.
- **Vulto de nevoeiro**: evento de medo periódico que some quando encarado pela
  lanterna. Não falha a missão; alimenta a tensão e o áudio.
- **Acessibilidade**: `prefers-reduced-motion` acalma tremor/scanlines, áudio
  começa desligado e todos os controles têm alternativa nos botões de tela.

## Arte própria

Nada foi reutilizado dos lotes anteriores. `tools/preparar-mare-upgrade.py`
prepara os originais de `assets/source-art/mare-upgrade/` em:

| Texturas 256×256 | Sprites com alfa |
| --- | --- |
| `madeira-tabuas` | `cristal-magenta` |
| `concreto-limoso` | `terminal-baia` |
| `agua-negra` | `farol-lanterna` |
| `pier-madeira` | |
| `rocha-basalto` | |
| `container-ferrugem` | |
| `metal-ondulado` | |

Texturas passam por corte quadrado, LANCZOS, quantização de 56 cores e
`NearestFilter`; sprites usam chave de preto com alfa erodido. O script é
idempotente e pode ser rodado de novo:

```bash
python3 tools/preparar-mare-upgrade.py
```

## Performance

O gargalo era GPU/SwiftShader, não a lógica (`manager.tick` media 2,5–8 ms):

- paredes agrupadas em 4 `BufferGeometry` com cor por vértice (concreto, madeira,
  metal, container), mais batches separados de `trim` (montantes/cintas) e
  `window` (`MeshBasicMaterial` para janelas acesas/apagadas);
- **nenhum `PointLight`**: postes são bulbo emissivo + halo, o farol é geometria
  + sprite, o cristal usa `emissive`;
- `MeshPhongMaterial` trocado por `MeshLambertMaterial` e
  `preserveDrawingBuffer` removido;
- iluminação de leitura: hemisfério `0x9fc3d4/0x131820 @4.0`, ambiente
  `0x6d8798 @4.2`, lua `0xa9c8dc @0.95` e preenchimento frio das fachadas
  `0x7394a6 @1.15`, além da lanterna `0xffd9a4 @42`.

Resultado: `tests/dimension-rupture-browser.mjs` passou de travar na entrada para
1/1 em 86 s no Chromium headless, e o frame 3D é composto normalmente.

## Evidência visual

Antes (`qa/upgrade/antes-*.png`, raycaster) e depois (`qa/upgrade/depois-*.png`):

- `entrada` — spawn, cabanas e corredor central;
- `corredor` — fachadas, janelas acesas e cabos;
- `tensao` — tensão alta, portal e farol no horizonte;
- `baia` — terminal de recomposição e adereços do cais;
- `cinema` — letreiro de abertura;
- `vulto` — silhueta antes de ser banida pela lanterna;
- `ruptura` — relatório de eco e colapso.

## Como validar

```bash
node --test tests/mare-upgrade-3d.mjs
python3 -m http.server 8000 --bind 0.0.0.0
LD_LIBRARY_PATH=/tmp/al2023/lib BROWSER_EXECUTABLE=/tmp/chromium \
BROWSER_LIBRARY_PATH=/tmp/al2023/lib PREVIEW_ORIGIN=http://127.0.0.1:8000 \
PLAYWRIGHT_MODULE=$PWD/.qa/node_modules/playwright-core/index.mjs \
node --test --test-concurrency=1 tests/mare-upgrade-3d-browser.mjs
```

O contrato estático cobre as 7 texturas, os 3 sprites, a pipeline, `FogExp2`,
`SpotLight`, pitch, HUD sem `undefined`, entrada/ruptura e saves. O teste de
navegador verifica cena ativa, prompt `[E]` limpo, botões de câmera, vulto
banido pela luz, canvas composto e colapso final.

## Limites conhecidos

- O interior das cabanas não tem teto; portas e janelas são recortes na fachada.
- Ainda há pouca luz nas paredes muito próximas à câmera; é intencional para o
  clima de quarentena, mas o brilho pode ser ajustado em `world3d.js` sem tocar
  na lógica da missão.
- O teste headless depende de SwiftShader; números de FPS variam bastante entre
  máquinas, por isso não há assert de framerate.
