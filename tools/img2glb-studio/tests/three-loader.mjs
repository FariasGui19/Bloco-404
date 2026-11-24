// Permite testar os mesmos módulos do navegador sem instalar dependências.
const three = new URL('../../../js/vendor/three.module.js', import.meta.url).href;
export function resolve(specifier, context, nextResolve) {
  return specifier === 'three' ? { url: three, shortCircuit: true } : nextResolve(specifier, context);
}
