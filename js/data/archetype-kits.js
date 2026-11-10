// Catálogo dos slots do módulo. IDs existentes são preservados para saves e gates.
// null = slot ainda sem habilidade definida (hoje só utilidade e suporte).
import { TOOL_ULTIMATE_IDS } from './archetype-tools.js';

export const ARCHETYPE_KITS = {
  nucleo_dez_forma: { q: 'forma_veloz', r: 'eco_scan', utility: null, support: null, ultimate: 'horizonte_dez_ecos' },
  lamina_dominio_anciao: { q: 'golpe_ruptura', r: 'postura_dominio', utility: null, support: null, ultimate: 'coroa_da_falha' },
  motor_bio_forja: { q: 'bio_dash', r: 'bio_diagnostic', utility: null, support: null, ultimate: 'pulso_forja_viva' },
  mare_astral: { q: 'passo_corrente', r: 'senso_corrente', utility: null, support: null, ultimate: 'sinfonia_estuario' },
};

export const KIT_SLOTS = Object.freeze(['q', 'r', 'utility', 'support', 'ultimate']);

// Os demais Q/R são protótipos jogáveis com efeitos procedurais provisórios.
export const IMPLEMENTED_ABILITIES = Object.freeze([
  'bio_dash', 'bio_diagnostic', 'golpe_ruptura', 'postura_dominio',
  'passo_corrente', 'senso_corrente', 'forma_veloz', 'eco_scan',
  'pulso_forja_viva', 'coroa_da_falha', 'sinfonia_estuario', 'horizonte_dez_ecos',
  // Sobrecargas de ferramenta (Ultimate nível 1), escolhidas no Códex.
  ...TOOL_ULTIMATE_IDS,
]);
