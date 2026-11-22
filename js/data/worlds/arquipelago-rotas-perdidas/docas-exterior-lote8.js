const piece=(name,width,kind)=>Object.freeze({name,width,kind,sprite:'docas_exterior_lote8_'+name.replaceAll('-','_')});
export const INTERATIVOS_EXTERIORES_DOCAS=Object.freeze({
 cromatica_fragmento_estacao:piece('fragmento-trilha',40,'fragmento'),
 cromatica_selo:piece('selo-nucleo',37,'selo'),
 cromatica_painel_origem:piece('painel-sincronia',28,'painel'),
 cromatica_painel_retorno:piece('painel-sincronia',28,'painel'),
 cromatica_painel_memoria:piece('painel-sincronia',28,'painel'),
 cromatica_ancora:piece('ancora-controle',36,'ancora'),
 docas_diario_pier:piece('diario-pier',26,'registro'),
 docas_diario_trilha:piece('aviso-vigia',30,'registro'),
 docas_mural_vigia:piece('mural-vigia',34,'registro'),
 docas_resina:piece('amostra-resina',26,'ressonancia'),
 docas_eletrico:piece('caixa-eletrica',30,'ressonancia'),
 docas_biomassa:piece('biomassa',27,'ressonancia'),
 // Portal de eco: usa a arte do lote 4 da missão, sem duplicar interação.
 docas_portal_fenda_visual:{name:'portal-fenda',width:62,kind:'portal',sprite:'cromatica_porta_fenda'},
});
