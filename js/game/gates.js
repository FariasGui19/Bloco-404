  // js/game/gates.js
  // =====================================================================
  // GATES (SISTEMA DE CAPACIDADES)
  //
  // Qualquer objeto pode exigir uma capacidade:
  //
  // gate: {
  //   anyOf: [
  //     { arquetipo: 'lamina_dominio_anciao' },
  //     { habilidade: 'golpe_ruptura' },
  //     { flag: 'ponte_consertada' }
  //   ],
  //   falha:   ['A ROCHA NÃO CEDE.'],
  //   sucesso: ['A ROCHA SE PARTE.'],
  //   promptFalha: 'EXAMINAR',
  // }
  //
  // Ao ser aberto, o gate grava a flag `gate_<id>` em state.progress.flags
  // (persistida pelo save) e o objeto deixa de bloquear.
  // =====================================================================

  import { state } from './state.js';
  import { getArchetypeAbilities } from './abilities.js';

  const flagKey = (object) => `gate_${object.id}`;

  // Habilidades efetivas = as salvas no progresso + as do arquétipo equipado.
  // (Assim o gate funciona mesmo que progress.abilities não seja preenchido ao equipar.)
  function getEffectiveAbilities() {
    return new Set([
      ...(state.progress.abilities ?? []),
      ...getArchetypeAbilities(state.progress.archetype),
    ]);
  }

  // ---------------------------------------------------------------------
  // CHECAGEM DE CAPACIDADE
  // ---------------------------------------------------------------------

  export function checkGate(gate) {
    if (!gate) return true;
    if (gate.requiresFlag && !state.progress.flags?.[gate.requiresFlag]) return false;
    if (!Array.isArray(gate.anyOf) || gate.anyOf.length === 0) return true;

    const abilities = getEffectiveAbilities();

    return gate.anyOf.some(req => {
      if (req.arquetipo && state.progress.archetype === req.arquetipo) return true;
      if (req.habilidade && abilities.has(req.habilidade)) return true;
      if (req.flag && state.progress.flags?.[req.flag]) return true;
      return false;
    });
  }

  export function getGateFailureMessage(gate) {
    if (!gate) return ['ACESSO NEGADO.'];
    if (gate.requiresFlag && !state.progress.flags?.[gate.requiresFlag] &&
        state.progress.archetype === gate.diagnosisArchetype) {
      return gate.falhaDiagnostico ?? ['USE R PARA DIAGNOSTICAR PRIMEIRO.'];
    }
    return gate.falha ?? ['VOCÊ NÃO TEM A CAPACIDADE NECESSÁRIA PARA PASSAR.'];
  }

  export function getGateSuccessMessage(gate) {
    return gate?.sucesso ?? ['CAMINHO LIBERADO.'];
  }

  // ---------------------------------------------------------------------
  // ESTADO ABERTO / FECHADO
  // ---------------------------------------------------------------------

  export function isGateOpen(object) {
    if (!object?.gate) return false;
    return !!(object.aberto || state.progress.flags?.[flagKey(object)]);
  }

  // Aplica o efeito visual/colisão no objeto em runtime.
  export function applyGateOpenState(object) {
    object.aberto = true;
    // Barreiras de travessia permanecem visíveis e sólidas para caminhada.
    if (object.phaseAction) return;
    object.bloqueia = false;
    object.hitbox = { offsetX: 0, offsetY: 0, width: 0, height: 0 };
    object.oculto = object.gate?.manterVisivel ? false : true;

    if (object.gate?.frameAberto) {
      object.frame = object.gate.frameAberto;
    }
  }

  // Abre o gate e grava no progresso. O chamador deve chamar saveGame() depois.
  export function openGate(object) {
    if (!object?.gate) return;

    state.progress.flags ??= {};
    state.progress.flags[flagKey(object)] = true;

    applyGateOpenState(object);
  }

  // Chamar sempre que um mapa for carregado (map-manager), para reaplicar
  // os gates já abertos — senão eles "fecham" de novo ao reentrar no mapa.
  export function applyGateStates(objects = []) {
    for (const object of objects) {
      if (object.gate && state.progress.flags?.[flagKey(object)]) {
        applyGateOpenState(object);
      }
    }
  } 