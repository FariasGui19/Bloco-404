// Estado local da incursão. Nunca reduz o nível global nem modifica outras
// dimensões; leitura é pura e só ações explícitas criam dados no save.
export const CROMATICA_MAPS = Object.freeze(['mare_cromatica_superficie','mare_cromatica_contencao','mare_cromatica_fenda','mare_cromatica_docas','mare_cromatica_cabana_oeste','mare_cromatica_cabana_leste','mare_cromatica_galpao']);
export const CROMATICA_LIMIT = 600;
export const FRAGMENTOS = Object.freeze(['costa','acampamento','estacao']);
export const FITAS = Object.freeze(['casa','vigilia']);
export const PAINEIS = Object.freeze(['origem','retorno','memoria']);
const valid = a => a && typeof a === 'object' && !Array.isArray(a);
const keys = (list, allowed) => [...new Set(Array.isArray(list) ? list.filter(x => allowed.includes(x)) : [])];

export function lerMareCromatica(progress) {
  const raw = valid(progress?.mareCromatica) ? progress.mareCromatica : {};
  return { versaoCronometro: Number.isInteger(raw.versaoCronometro) ? raw.versaoCronometro : 0, iniciada: raw.iniciada === true, fragmentos: keys(raw.fragmentos,FRAGMENTOS), fitas: keys(raw.fitas,FITAS),
    paineis: keys(raw.paineis,PAINEIS), sincronizacao: Math.max(1,Math.min(4,Number.isInteger(raw.sincronizacao) ? raw.sincronizacao : 1)),
    restante: Number.isFinite(raw.restante) ? Math.max(0,Math.min(CROMATICA_LIMIT,raw.restante)) : CROMATICA_LIMIT,
    desfecho: ['total','parcial','colapso'].includes(raw.desfecho) ? raw.desfecho : null,
    estacaoAberta: raw.estacaoAberta === true, ancoraEstavel: raw.ancoraEstavel === true,
    colapsos: Number.isSafeInteger(raw.colapsos) && raw.colapsos>=0 ? raw.colapsos : 0 };
}
function edit(progress) { const normalized=lerMareCromatica(progress); progress.mareCromatica=normalized; return normalized; }
// Migração única: a incursão antiga começou ao atracar. Devolve o tempo e
// aguarda confirmação, preservando descobertas e finais já concluídos.
export function prepararMareCromatica(progress) {
  if (!progress || !progress.archetype) return false;
  const atual=lerMareCromatica(progress);
  if(atual.versaoCronometro>=1)return false;
  const data=edit(progress);data.versaoCronometro=1;
  if(data.desfecho!=='total' && data.desfecho!=='parcial'){
    data.iniciada=false;data.restante=CROMATICA_LIMIT;
    if(data.desfecho==='colapso'){
      data.desfecho=null;data.ancoraEstavel=false;data.paineis=[];
      progress.flags ??= {};delete progress.flags.cromatica_desfecho;progress.flags.cromatica_ancora_estavel=false;
    }
  }
  return true;
}
// Uma nova tentativa após colapso volta ao reconhecimento sem cronômetro;
// descobertas e contador histórico são preservados, painéis são da tentativa.
export function prepararRetornoDocas(progress) {
  if(!progress?.archetype || lerMareCromatica(progress).desfecho!=='colapso')return false;
  const data=edit(progress);data.versaoCronometro=1;data.iniciada=false;
  data.desfecho=null;data.restante=CROMATICA_LIMIT;data.ancoraEstavel=false;data.paineis=[];
  progress.flags ??= {};delete progress.flags.cromatica_desfecho;progress.flags.cromatica_ancora_estavel=false;
  return true;
}
export function iniciarMareCromatica(progress) {
  if (!progress || !progress.archetype) return false;
  prepararMareCromatica(progress);
  const data=edit(progress);
  if ((!data.iniciada && !data.desfecho) || data.desfecho==='colapso') {
    if(data.desfecho==='colapso'){data.ancoraEstavel=false;data.paineis=[];}
    data.iniciada=true;data.restante=CROMATICA_LIMIT;data.desfecho=null;
    progress.flags ??= {};progress.flags.cromatica_ancora_estavel=false;delete progress.flags.cromatica_desfecho;
    return true;
  }
  return false;
}
export function registrarMareCromatica(progress,tipo,id) {
  const data=lerMareCromatica(progress);
  if(!data.iniciada || data.desfecho) return false;
  const permitted = tipo==='fragmentos'?FRAGMENTOS:tipo==='fitas'?FITAS:tipo==='paineis'?PAINEIS:null;
  if(!permitted?.includes(id) || data[tipo].includes(id)) return false;
  if(tipo==='paineis' && !data.estacaoAberta) return false;
  const out=edit(progress);out[tipo].push(id);return true;
}
export function recompilarMareCromatica(progress) {
  const data=lerMareCromatica(progress);
  if(!data.iniciada || data.desfecho) return false;
  const rank=Math.min(4,1+data.fragmentos.length);
  if(rank<=data.sincronizacao) return false;
  edit(progress).sincronizacao=rank;return true;
}
export function abrirEstacaoCromatica(progress) {
  const data=lerMareCromatica(progress);
  if(!data.iniciada || data.desfecho || data.sincronizacao<2 || data.estacaoAberta) return false;
  edit(progress).estacaoAberta=true;progress.flags ??= {};progress.flags.cromatica_estacao_aberta=true;return true;
}
export function estabilizarAncoraCromatica(progress) {
  const data=lerMareCromatica(progress);
  if(!data.iniciada || data.desfecho || !data.estacaoAberta || data.paineis.length<3) return null;
  const out=edit(progress);out.ancoraEstavel=true;
  // Purificação depende de evidência e recompilação completas, não apenas
  // da velocidade. Ambas as soluções salvam o núcleo sem apagar o Hub.
  out.desfecho=out.sincronizacao===4 && out.fitas.length===2 ? 'total' : 'parcial';
  progress.flags ??= {};progress.flags.cromatica_ancora_estavel=true;progress.flags.cromatica_desfecho=out.desfecho;
  return out.desfecho;
}
export function colapsarMareCromatica(progress) {
  const data=lerMareCromatica(progress);if(!data.iniciada || data.desfecho) return false;
  const out=edit(progress);out.desfecho='colapso';out.colapsos=Math.min(Number.MAX_SAFE_INTEGER,out.colapsos+1);
  progress.flags ??= {};progress.flags.cromatica_desfecho='colapso';return true;
}
export function avancarMareCromatica(progress,dt) {
  const data=lerMareCromatica(progress);
  if(!data.iniciada || data.desfecho || !Number.isFinite(dt) || dt<=0) return false;
  const out=edit(progress);out.restante=Math.max(0,out.restante-Math.min(dt,.1));
  if(out.restante===0) return colapsarMareCromatica(progress);
  return false;
}
// Aplicado apenas nos mapas cromáticos: não altera perfis nem equipamento.
export function perfilSincronizacao(progress,mapId) {
  if(!CROMATICA_MAPS.includes(mapId)) return {custo:1,recarga:1,alcance:1};
  const rank=lerMareCromatica(progress).sincronizacao;
  const t=(rank-1)/3;return {custo:2-t,recarga:1.6-.6*t,alcance:.55+.45*t};
}
export function objetivoCromatico(progress) {
  const d=lerMareCromatica(progress);
  if(!d.iniciada) return progress?.flags?.docas_neblina_alcancada ? 'EXPLORAÇÃO LIVRE • INICIE A INCURSÃO NO BARCO' : 'INVESTIGUE O ALERTA NO LIMIAR 66.6';
  if(d.desfecho==='colapso') return 'COLAPSO • RETORNE AO LIMIAR PARA UMA NOVA TENTATIVA';
  if(d.desfecho) return 'ÂNCORA ESTÁVEL • A FENDA AGUARDA';
  if(!d.estacaoAberta) {
    if(d.sincronizacao<2) return `FRAGMENTOS ${d.fragmentos.length}/3 • RECOMPILE NO GALPÃO CRT`;
    if(progress?.flags?.docas_neblina_alcancada && (!progress.flags.docas_chave || !progress.flags.docas_fusivel)) return 'BUSQUE A CHAVE E O FUSÍVEL NAS CABANAS';
    return 'ABRA O SELO NO CAMINHO DO NÚCLEO';
  }
  if(d.paineis.length<3) return `CONTENÇÃO • PAINÉIS ${d.paineis.length}/3`;
  return 'ESTABILIZE O NÚCLEO DE ÂNCORA';
}

// Migração de continuidade para saves antigos do Maré Astral que já chegaram
// às Docas: registra a incursão como concluída (total) sem tocar em vida,
// inventário, identidade ou em qualquer outra dimensão. A decisão de aplicar
// fica no loadSave, restrita a saves de versão anterior e ao mapa das Docas.
export function concluirIncursaoLegado(progress) {
  if (!progress || progress.archetype !== 'mare_astral') return false;
  if (progress.flags?.docas_incursao_concluida_v2) return false;
  if (!progress.flags?.docas_neblina_alcancada) return false;
  const data = edit(progress);
  data.versaoCronometro = 1;
  data.iniciada = true;
  data.fragmentos = [...FRAGMENTOS];
  data.fitas = [...FITAS];
  data.sincronizacao = 4;
  data.estacaoAberta = true;
  data.paineis = [...PAINEIS];
  data.ancoraEstavel = true;
  data.desfecho = 'total';
  data.restante = CROMATICA_LIMIT;
  const flags = progress.flags ??= {};
  flags.docas_chave = true;
  flags.docas_fusivel = true;
  flags.cromatica_estacao_aberta = true;
  flags.cromatica_ancora_estavel = true;
  flags.cromatica_desfecho = 'total';
  flags.docas_incursao_concluida_v2 = true;
  return true;
}
