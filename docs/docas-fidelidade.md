# Docas — revisão dos três recortes e do mar

Base: `87aa29af6857a02320f77f47cb24a6f9595b7a18`. Esta revisão trata os três pontos indicados pelo usuário, usando a quarta imagem (prancha completa) como referência. **O farol superior e o portal/cristal ciano não foram redesenhados.**

## Abrir e comparar

- [Prévia real animada](previa-docas-fidelidade.html): seis setores e mais três câmeras correspondentes aos recortes, com pausa e movimento reduzido.
- [Mapa completo](../qa/docas-fidelidade-full.png) e [comparação geral](../qa/docas-fidelidade-comparacao-geral.jpg).
- **Ponto 1:** [prancha / antes / agora](../qa/docas-fidelidade-comparacao-1.jpg), [render próximo](../qa/docas-fidelidade-recorte1.png).
- **Ponto 2:** [prancha / antes / agora](../qa/docas-fidelidade-comparacao-2.jpg), [render próximo](../qa/docas-fidelidade-recorte2.png).
- **Ponto 3:** [prancha / antes / agora](../qa/docas-fidelidade-comparacao-3.jpg), [render próximo](../qa/docas-fidelidade-recorte3.png).
- Mar: [oeste](../qa/docas-fidelidade-west.png), [norte](../qa/docas-fidelidade-north.png), [leste](../qa/docas-fidelidade-east.png), [sul](../qa/docas-fidelidade-south.png).

As capturas vêm do mesmo `renderDocas` usado pelo jogo. Os closes são renderizados novamente na câmera próxima, não screenshots borrados ampliados. As comparações usam os mesmos retângulos da planta para os três estados, sem retoque na captura. A prancha é normalizada de 1672×941 para a planta histórica de 1568×882 apenas para comparação espacial.

## Diagnóstico e ajustes por ponto

### 1 — Abrigo, palmeiras e cristal oeste

**Diferença encontrada:** a revisão anterior tinha um celeiro fechado, com porta e degraus, enquanto a prancha mostra um abrigo baixo com frente aberta, esteios e cerca curta sob metal remendado. Não era só uma questão de nitidez.

**Alteração:** arte nova `abrigo-oeste.png`, guiada pelo recorte correspondente da prancha: varanda aberta, postes finos, ripas de guarda-corpo, telhado irregular violeta/ferrugem e pedras sob os pés. Caixa **(337,369,123,88)**, mantendo o pé **Y451** e a ordenação com o personagem. A sombra de contato fica sob o abrigo. Um reflexo roxo discreto vem do lado do cristal; não mantém o brilho de janela da cabana fechada antiga.

Palmeiras, cristal, pedras, tronco e arbustos que já circundam esse ponto permanecem em suas posições: não se moveu a cabana maior nem se inflou o cristal para esconder junções. As aberturas da varanda são alpha real, não preenchimento verde ou uma placa de cenário opaca.

**Limite:** o novo desenho aproxima a tipologia e a composição da prancha, mas a geometria exata do telhado e o arranjo de tábuas não são cópias dos pixels originais. O entorno oeste continua usando os sprites já existentes.

### 2 — Margem do cais, anexo e contato com a água

**Diferenças encontradas:** plataforma oval flutuante sob o anexo; recorte antigo de falésia com término duro; material repetido nas faces; conexão do cais com degraus cinza volumosos. Havia ainda duas representações do acesso sendo desenhadas: `escada-oeste` e `escada-mare`.

**Alterações:**

- `costa-sudeste.png`: uma massa rochosa conectada, com lábio de solo/pedra na parte de trás, raízes, faces quebradas, vegetação baixa, cristais nas fendas e pedras na linha d'água. Caixa **(807,567,390,205)**. Substitui o oval sob o anexo, sem reutilizar o mesmo promontório da torre.
- O recorte antigo `margem-direita` deixa de ser desenhado à esquerda de X1197 quando a costa nova está pronta. As faces genéricas de reparo nessa faixa também são suprimidas; não ficam atravessando a nova falésia.
- A faixa de reparo junto ao novo apoio utiliza areia/pedra derivada da superfície da arte nova, em escala reduzida, e não uma ampliação do antigo quadradinho de 24 px. O restante do solo à direita mantém seu material anterior.
- `acesso-cais.png`: conexão baixa de tábuas, pedras gastas e dois degraus, com borda irregular, desenhada na **mesma transformação de `CAIS_SUL` e na mesma caixa da peça `escada-mare`**. Quando carregada, impede as duas escadas antigas de serem desenhadas. Não muda o deck, os barcos, estacas, redes ou a geometria física do acesso.
- Ondas/reflexos de contato adicionais junto aos pontos (992,739) e (1126,774), com a mesma fase da ressaca e redução estável. Ficam atrás da arte rochosa e respeitam as máscaras da água.

**Limites importantes:** a falésia nova ainda tem um contorno diferente da referência, com face esquerda mais alta e uma crista traseira direita mais pronunciada. A extensão visual inferior é **talude/cenário não transitável**, não uma nova área explorável: não foi ampliada a colisão até a silhueta da pintura. Os props de missão continuam nas posições físicas anteriores, não nas coordenadas da prancha. Portanto não se declara reprodução geométrica perfeita deste ponto.

### 3 — Cabana alongada e vegetação dos fundos

**Diferença encontrada:** a faixa gerada anteriormente tinha paredões elevados, palmeiras espaçadas demais e uma árvore seca quase escondida, diferindo da composição da prancha.

**Alteração:** uma composição nova guiada diretamente pelo recorte: árvore seca de tronco curvo à esquerda, palmeiras de alturas variadas atrás do telhado, arbustos e raízes baixos, cabana alongada com telhas onduladas azul-violeta, três janelas iluminadas, varanda/cerca, degraus e subida rochosa à direita. Caixa **(374,142,480,258)**.

O conjunto inclui a própria cabana. Por isso substitui `central_fundos` no z-sort em **pé Y385**, em vez de ser colocado sob uma segunda cópia do prédio. O passe antigo da encosta ao fundo é suprimido quando a arte nova está pronta. Teste de navegador exige exatamente uma chamada à composição e verifica personagem à frente dela e atrás do abrigo oeste em um exemplo de profundidade.

A construção não balança com o vento: o antigo shear da encosta não é aplicado ao conjunto novo. A iluminação tem variação pequena; os vagalumes/fauna existentes continuam ativos. A borda recortada do tronco à esquerda foi removida/atenuada no processamento. Há diferença de escala e de traço entre os elementos novos e os atlas históricos vizinhos; a transição não é declarada idêntica à pintura.

### 4 — Roxo/magenta e vida no mar todo

Além dos gradientes e folhas de onda já existentes, há uma **nova pintura de reflexos de mar**, da qual são extraídos quatro trechos diferentes, sem fundo opaco. O processamento conserva as linhas claras, remove a contribuição do mar escuro e suaviza todas as bordas de cada trecho. A paleta das linhas é ajustada para roxo/magenta, sem substituir a água azul de base.

- Os quatro trechos variam em posição, escala, espelhamento, ângulo discreto e luminosidade, em coordenadas de mundo.
- Movimento e luminosidade usam `faseRessaca`, a mesma do cais; as ondas, cáusticas e névoa anteriores permanecem.
- A antiga curva senoidal magenta desenhada por célula fica apenas como fallback quando a pintura nova não carrega.
- Cobre oeste, norte/fundo, leste e sul, inclusive coordenadas além do canvas do terreno. Continua limitado a 360 células candidatas por chamada, sem criar canvas por frame.
- Terra, deck, prédios bloqueados e interseções entre polígonos continuam excluídos pelas máscaras. O trecho já finalizado do barco oeste continua com ganho zero para o novo reforço.
- Oito bancos de névoa da revisão anterior são preservados, sem adicionar neblina nova sobre o topo ciano ou o pátio central.

**Limite:** a distribuição dos reflexos é procedural e repetível, não segue exatamente cada linha de espuma da pintura. Os quatro trechos podem repetir formas em enquadramentos amplos. Não é uma simulação fluida nem uma nova folha completa de animação desenhada quadro a quadro.

## Arte, fontes e reprodução

Foram usados **seis pedidos de geração/edição**, dentro do orçamento de dez: cinco artes finais, com uma revisão adicional da costa. Fontes em `assets/source-art/docas-fidelidade/`:

| Arte final | Saída nativa usada |
|---|---:|
| Abrigo aberto | 998×800 |
| Cabana/vegetação dos fundos | 1392×751 |
| Costa sudeste | 1440×669 |
| Conexão do cais | 1111×683 |
| Mar fosforescente | quatro trechos de 400×200, atlas 800×400 |

Saída adicional `solo.png` (384×176) é derivada da superfície da costa nova, com repeat espelhado de bordas coincidentes; não é uma sexta arte gerada. As três grandes peças têm pelo menos 2,8 pixels de fonte por unidade da planta desenhada. Não se alega resolução infinita em qualquer zoom.

```sh
# Requer Pillow e NumPy
python tools/preparar-docas-fidelidade.py
python tests/docas-fidelidade.py
node --experimental-default-type=module tests/docas-fidelidade.mjs
```

O script faz chroma key/despill, limpa RGB invisível após redução, gera os quatro trechos de reflexão e grava hashes das cinco fontes em `manifest.json`. Fontes/atlas anteriores não são sobrescritos.

## Preservações e testes

Não houve edição em dados de colisão, spawn, controle, saves, missões, `DimensionManager`, `CAIS_SUL`, posições marítimas ou atlas anteriores. Os hashes do topo do farol/portal em `docas-fechamento.mjs` e os oito contratos centrais continuam passando.

Resultados desta execução:

- **210 testes MJS aprovados, 13 opcionais ignorados e 23 falhas preexistentes** na suíte sem navegador configurado. Os testes temporais de praia foram executados isoladamente para não medir contenção entre processos.
- As 23 falhas foram novamente reproduzidas numa extração dos módulos/testes de HEAD anterior às alterações desta revisão.
- **Oito testes Chromium reais aprovados:** fidelidade, acabamento, fechamento, encaixe, cirúrgico, pesqueiro-03, gameplay-live e dimension-rupture.
- Novo teste Chromium: uso das novas peças no render real; cabana única; ausência da plataforma oval do anexo e da escada dupla; z-sort pelo pé; pintura de mar realmente usada e animada nos quatro lados; repouso no modo reduzido; estado/storage intactos; fallback funcional com todas as novas imagens bloqueadas.
- Testes anteriores foram atualizados para reconhecer as peças substitutas, mantendo exigências de presença, quantidade e profundidade. Não se removeu teste antigo só para obter sinal verde.
- Três testes Python de imagens aprovados: alpha/chroma, RGB invisível, contorno não retangular, bordas suaves dos quatro trechos de mar e emenda do solo.
- Estrutura: **231 módulos, 687 imports relativos**, sem assets HTML/CSS faltando; boot e `git diff --check` aprovados.
- Gameplay real: menu/save/RAF, espera simulada de missão, mar/barco/tentáculo, redução/retomada e reload.
- Ruptura real: terminal final → Nulo → entrada → Limiar 3D → Esc/2D, com referências/vitais/resultado preservados e sem erros de página.

Falhas herdadas: caminho-correntes, combat-basic, enseada-ecos, nado-desenho, docas-lote5/8/9/10/11/12/13, enseada-2-lote4/5/6/7/8/9/10, enseada-3-reference, enseada-4-lote, enseada-reconstrucao, limiar-frequencia e oceano-animado.

## Estado para revisão

O resultado está disponível para avaliação visual; não foi criado nem mesclado PR nesta etapa. O topo do farol e o portal continuam reservados. A suíte não está toda verde, e os limites geométricos/artísticos acima são explícitos: esta revisão melhora os três problemas apontados, mas não deve ser apresentada como uma reprodução perfeita ou pixel a pixel da prancha.
