# Limiar — animação viva e identidade

## Escopo
Polimento de apresentação 3D, compartilhado pelo jogo, laboratório e Morfador Mestre. Não altera dano, recargas, desbloqueios, missões, progressão ou formato de save. Etapa 4 não foi iniciada.

Referências conferidas: player-sheet, Bio-Forja/Maré nível 1, sequência lateral da espada, caminhada frontal da Veloz e ataque lateral da Bruta. `video_1.mp4` não estava disponível no checkout; não foi usado como referência.

## Mudanças por ponto

1. **Operador:** ombros civis deixam de variar conforme o traje não equipado; cabeça discretamente menor, armação mais fina, olhos menos abertos, pupilas mais legíveis, bigode mais contido e sobrancelhas com repouso menos severo. Cabelo facetado e microanimação preservados.
2. **T/R/J/K:** curvas suaves entre poses com preparação, execução e recuperação independentes. Braços, cotovelos, pernas, joelhos, tronco e cabeça participam. A caminhada perde influência gradualmente durante a ação e retorna na recuperação, em vez de disputar com o golpe. T de retorno tem gesto de recolhimento e descarga menor, inclusive no laboratório e no término automático das formas.
3. **Identidades:** o tipo de animação passa a vir do arquétipo, não da presença do traje. Domínio mantém corte/estocada/guarda; Bio usa compressão e impulso; Maré usa abertura dos braços, torção e balanço fluido. Civil mantém o ritmo do kit mas troca empunhadura de arma por gesto de mão vazia. X10 continua sem traje.
4. **Veloz:** passada própria com anteriores e posteriores defasados, joelhos recolhendo na recuperação, alcance dos braços, balanço lateral e inclinação contida. Retirada a flexão fixa de joelho e a marcha humana acelerada. Só usa essa passada no solo; voo/nado/escalada continuam com seus modos. Rastro reutiliza geometria existente.
5. **Bruta/Quebra:** escala imponente preservada; marcha mais lenta, preparação longa do martelo, queda mais rápida, flexão de apoio, transferência do tronco e recuperação demorada. Pistões acompanham a passada e o impacto; vapor responde à descarga. Martelo acompanha o punho sem substituir a articulação do cotovelo.
6. **Espada:** pivô próprio de punho para preparação, varredura e recuperação; variações lateral/inversa/estocada preservadas. Espada e lâmina ficam ocultas no civil, sem perder a identidade de animação do Domínio.
7. **Bracelete X10:** cartucho B404 original preservado; aletas abrem e transladam na seleção, leitura e transformação. Leitura e convergência acompanham a posição real do bracelete, em vez de um ponto fixo no tronco. Nenhum mostrador circular ou emblema emprestado.

## Limites e desempenho

- Mesma malha low-poly e texturas `NearestFilter`, sem novos arquivos de textura ou luzes.
- Efeitos com geometria limitada e reutilizada; sem emissores nem criação de malhas por quadro.
- Movimento reduzido explícito preservado.
- Poses são apresentação: não implementam IK/foot-lock, física de martelo ou colisões de espada.
- Benchmark de navegador usa SwiftShader, não mede desempenho de GPU física.

## Validação

12 suítes Node aprovadas: dimension, motion, identity, performance, sculpt, polish, surgery, master-morpher, layout, environment, living e estrutura.

7 suítes Chromium/WebGL aprovadas: dimension-browser, sculpt-browser, polish-browser, surgery-browser, environment-browser, master-morpher-browser e living-browser.

Nova suíte `dimension-living.mjs`: continuidade de curvas, três tempos, gesto de retorno, identidade civil, ausência de arma civil, punho independente e passada terrestre própria. Nova suíte browser: corrida Veloz, execução Bruta, ação da espada, sem erros de página nem escrita em storage.

Regressões existentes cobrem controles reais, T e recarga, trajes, desbloqueios, Morfador isolado, save/âncora, volta 2D, reentrada, perda de contexto, mobile e movimento reduzido.

Capturas locais em `.qa/living-{veloz,bruta,sword}.png` e `.qa/surgery-face.png` (não versionadas).
