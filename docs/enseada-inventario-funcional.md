# Enseada dos Ecos: inventário funcional (base para a reconstrução)

Tudo abaixo precisa continuar funcionando depois da reconstrução do layout.
Coordenadas são de grade (72x64) do arquivo atual.

## Pontos de entrada (spawnPoints)
- inicio / vindo_da_praia: (19.9, 51.7)
- vindo_da_estacao_666: (30.1, 19)
- vindo_do_mar: (38.5, 7.4)
- vindo_da_darsena_mare: (49.5, 19.6)

## Portais (portals)
- acesso_estacao_666 (27, 16): porta para estacao_limiar_666
- rota_correntes (36, 3): porta para mar_caminho_das_correntes
- retorno_darsena_mare (50, 18): porta para mar_rota_mare_astral
- enseada_retorno (16, 52): porta para ilha_praia_inicial

## Coletáveis de história (collectibles)
- lumeo_encontro (27, 43), lumeo_ressonancia (29, 40), lumeo_vinculo (32, 39)
- enseada_rastro_mar (22, 46), enseada_rastro_pedra (34, 37), enseada_rastro_mata (26, 40)

## Objetos interativos (interacao / dispositivo / painel)
- terminal_frequencia_666 (painel, 18.5, 38.1): frequência 666
- torre_antena_enseada (dispositivo, 13.7, 29.8)
- relogio_mare_enseada (dispositivo, 11.3, 35.9)
- bancada_campo_enseada (dispositivo, 16, 35.8)
- maleta_expedicao_enseada (dispositivo, 23.5, 31.2)
- captador_ecos_enseada (dispositivo, 53.5, 24.3)
- espelho_arquetipos_enseada (dispositivo, 38, 50.1): espelho de ressonância
- acampamento_vigilia_enseada (decoração interativa, 19.9, 34.8)
- tenda_expedicao_enseada (19.5, 29.6)
- placa_trilha_enseada (27, 44.6)
- gruta_concha_enseada (34.2, 49.9)
- santuario_lumeo_enseada (42.6, 19.6)
- embarcadouro_mare_astral (46.8, 39.8), cais_madeira_pesca_enseada (48.8, 38.4), barco_expedicao_enseada (55.5, 36.5)

## Outros
- hazards: 2 | trainingTargets: 1 | fauna: 8 | pocas (piscinas): 1
- Objetos no total: 155

## Testes que cobrem a Enseada (tests/)
enseada-ecos, enseada-2-lote4..8, enseada-3-reference, enseada-4-lote, estacao-encaixe,
rota-mare-livre, beach-surface, praia-relevo, praia-performance, fauna-costeira, estrutura, boot.

## Regras de colisão e habitat
- Objetos bloqueantes precisam de hitbox e estar na lista de exceções de enseada-ecos.mjs
- Aquáticos exigem água (YyDdX) em toda a pegada; terrestres exigem terra (SMT)
- Marcos com espaçamento mínimo de 1.9 a 2.5 (lote7/lote8)
