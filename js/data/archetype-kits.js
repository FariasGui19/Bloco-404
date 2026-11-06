// Catálogo dos slots do módulo. IDs existentes são preservados para saves e gates.
// null = slot ainda sem habilidade definida; não representa poder jogável.
export const ARCHETYPE_KITS = {
  nucleo_dez_forma: { q: 'forma_veloz', r: 'eco_scan', utility: null, support: null, ultimate: null },
  lamina_dominio_anciao: { q: 'golpe_ruptura', r: 'postura_dominio', utility: null, support: null, ultimate: null },
  motor_bio_forja: { q: 'bio_dash', r: 'bio_diagnostic', utility: null, support: null, ultimate: null },
  mare_astral: { q: 'passo_corrente', r: 'senso_corrente', utility: null, support: null, ultimate: null },
};

export const KIT_SLOTS = Object.freeze(['q', 'r', 'utility', 'support', 'ultimate']);

// Os demais Q/R são protótipos jogáveis com efeitos procedurais provisórios.
export const IMPLEMENTED_ABILITIES = Object.freeze([
  'bio_dash', 'bio_diagnostic', 'golpe_ruptura', 'postura_dominio',
  'passo_corrente', 'senso_corrente', 'forma_veloz', 'eco_scan',
]);
