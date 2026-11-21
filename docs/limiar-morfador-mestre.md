# Morfador Mestre — ferramenta de autoria 3D

Implementação limitada ao modo criativo solicitado. Não inclui nova lapidação de modelos, mapa, missões, poderes ou combate.

## Como usar

### Laboratório

Abra `docs/setor-limiar-3d.html`, entre no 3D e abra **DEV · MORFADOR MESTRE** no canto esquerdo. **F8** abre/recolhe o painel sem sair do cenário. Marque **Ativar modo criativo**.

### Jogo principal

O painel respeita a autorização de autoria **já existente no Morfador 2D**. Num save de desenvolvimento, execute uma vez no console do navegador:

```js
__morfador("morfador_de_ressonancia")
```

Esse comando existente marca o estado atual como autoria; o salvamento normal determina sua persistência. Depois, no Setor Limiar, abra o painel por clique ou F8 e ative o modo. Saves comuns não exibem o painel, e a API também recusa ativação sem autorização. A flag é um gesto explícito de autoria do projeto, não uma senha nem autenticação de servidor. O laboratório autoriza a ferramenta explicitamente em memória, sem promover saves reais.

## Controles

- **Arquétipo:** troca ao vivo entre Núcleo X10, Domínio Ancião, Motor Bio-Forja e Maré Astral. Não recria o cenário, não reinicializa a câmera nem teleporta o operador. Os três trajes entram equipados por padrão; X10 continua humano civil.
- **Corpo / traje:** roupa civil ou traje; no X10, operador, Forma Veloz ou Quebra Sistemas. A ativação de forma usa o helper nativo e atualiza o HUD.
- **Ferramenta / forma selecionada:** catálogo jogável do arquétipo, ou padrão. Não concede protótipos marcados como não jogáveis.
- **Energia, recarga e duração livres:** ligada por padrão, restaura vida/energia, zera recargas e mantém a duração da forma enquanto o teste está ativo. Desmarcar permite testar os custos e timers normais; os desbloqueios continuam disponíveis.
- **Reabastecer:** repõe os recursos e limpa recargas pontualmente. A janela de atuação/animação em curso continua respeitada, evitando sobreposição quebrada de ações.
- **Desativar ou Esc/retorno 2D:** descarta o estado criativo e retoma os objetos reais de progresso/jogador. Reentrar no 3D começa com modo OFF e painel recolhido.

Todas as habilidades implementadas ficam presentes no estado temporário, com os quatro arquétipos no nível máximo canônico (20). Ferramentas e ambas as formas nativas ficam disponíveis. **O painel não implementa renderizadores/comandos ausentes no 3D:** J/K/L/T/R continuam sendo as ações já suportadas pelo sandbox, sem inventar Ultimates ou formas futuras.

## Proteção do save

`runtime.js` usa uma fachada local com as mesmas referências de jogador/progresso enquanto o modo está desligado. Ao ativar, o Morfador copia **somente jogador e progresso** e destaca essas referências na fachada. Controlador, ações e HUD continuam consultando a mesma fachada; o estado global do jogo e o autosave seguem apontando para os objetos reais, intactos. O cenário, câmera e controlador não são recriados.

Ao desativar, as referências originais são retomadas, sem copiar desbloqueios, XP, itens, poderes ou recursos criativos para o save. Mesmo a interação com a âncora escreve apenas na cópia temporária e não chama o callback de salvar enquanto o criativo está ligado. Saída normal, descarte e perda de contexto WebGL também limpam o painel/estado. Não há chave nova em localStorage, migração ou patch do sistema de save. O Morfador 2D permanece independente.

## Validação

- `tests/dimension-master-morpher.mjs`: isolamento por cópia, restauração das referências exatas, nível/catálogo, ferramentas, formas, recursos opcionais, entradas inválidas, descarte repetido, autorização negada e laboratório explícito.
- `tests/dimension-master-morpher-browser.mjs`: troca dos quatro rigs em WebGL sem teleporte/reentrada; Quebra selecionável diretamente; recursos livres/opcionais; âncora isolada; save normal inalterado; descarte/reentrada e perda de contexto; viewport móvel; autorização real pelo comando existente no jogo principal.
- Passaram também as dez suítes Node anteriores e `dimension-browser.mjs` (jogo principal, save, WASD, voo, mergulho, barco, âncora normal, retorno 2D e rollback).

Captura local ignorada pelo Git: `.qa/master-morpher.png`.
