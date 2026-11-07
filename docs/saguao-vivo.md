# Saguão vivo — integração das folhas

As quatro referências foram arquivadas em `assets/source-art/saguao`. São JPEGs RGB: o quadriculado é parte da imagem, não transparência. `tools/preparar-saguao.py` isola fundos neutros conectados às bordas, remove ruído e normaliza células; usa Pillow, NumPy e SciPy. A extração é aproximada e precisa de revisão quando houver PNG RGBA original.

- **Mobiliário:** vaso, lixeira, carrinho e bebedouro ocupam posições periféricas, com hitboxes pequenas nas bases. Não mudam os objetos de missão. Os demais quadros não foram usados para evitar preencher corredores com móveis sem função.
- **NEXO-04:** caminhada atualizada com a nova folha RGBA de quatro direções; a linha frontal usa somente poses coerentes. Aceno frontal e tablet lateral usam as poses anteriores quando a rotina existente escolhe essas ações. As direções não disponíveis continuam usando a folha anterior. O desenho do console na referência está cortado e não foi utilizado. Diálogos e IA existentes permanecem.
- **Viajante:** NPC ambiental com mala, rota curta e espera perto do jogador; não bloqueia o jogador, possui diálogo breve opcional e não cria progresso. As imagens apresentam variação de orientação, por isso foram escolhidas e repetidas apenas poses coerentes, com inversão lateral quando necessário. Não é um sistema de multidão ou de missões.
- **Painel de destinos e portal:** estruturas fixas da folha original, com varredura e fluxo procedurais recortados à tela e ao interior. O fluxo do portal é exibido **apenas após `metroCalibrado`**, sem mudar o gate. Os quadros alternativos das folhas geradas tinham deslocamentos de moldura e base e não são usados.
- **Projetor:** a folha recebida mistura efeito semitransparente com quadriculado opaco, impossibilitando recuperar o alpha verdadeiro sem resíduos visíveis. Foi mantido o holograma procedural do saguão, em vez de colocar uma placa quadriculada ou anunciar uma integração perfeita.

O spawn, os três portais, suas regras e a missão não foram substituídos. A ambientação não é salva; ao recarregar, a viajante reinicia sua rota. Próxima melhoria de qualidade: exportar os mesmos quadros em PNG com transparência real, tamanhos e linha de pés constantes e movimentos por direção sem variação da identidade do personagem.

## Lapidação posterior

O painel próximo à porta foi desespelhado e seu texto ajustado à perspectiva. Vaso e bebedouro ganharam escala, âncoras e sombras de contato, com hitboxes proporcionais; rotas e spawns continuam acessíveis. A viajante permanece com a arte anterior enquanto aguardamos a nova folha.

As folhas novas de Maré, Domínio e forma veloz foram guardadas em `assets/source-art/proximas-animacoes/` para análise e integração futura; neste patch não foram modificadas as animações de ataque ou a corrida do jogador, pois o foco é o saguão. A nova folha de caminhada RGBA do NEXO foi escolhida para o saguão; a alternativa também foi preservada para comparação.
