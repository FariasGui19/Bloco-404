const piece=(name,width,kind)=>Object.freeze({name,width,kind,sprite:'docas_interativo_lote7_'+name.replaceAll('-','_')});
export const INTERATIVOS_DOCAS_LOTE7=Object.freeze({
 cromatica_fragmento_costa:piece('fragmento-costa',39,'fragmento'),
 cromatica_fragmento_acampamento:piece('fragmento-vigia',40,'fragmento'),
 cromatica_fita_casa:piece('gravador-oeste',42,'fita'),
 cromatica_fita_vigilia:piece('gravador-leste',38,'fita'),
 docas_chave:piece('chave-trilha',34,'suprimento'),
 docas_fusivel:piece('fusivel-nucleo',34,'suprimento'),
 cromatica_terminal:piece('terminal-crt',59,'terminal'),
});
export function visualInterativoDocas(o){return INTERATIVOS_DOCAS_LOTE7[o.id]??null;}
