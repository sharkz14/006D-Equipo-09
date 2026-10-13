// Reproduce la referencia del motor sin habilitar las fichas para uso real.
const {generateRoutine, VERSION} = require('./fuentes/generador_referencia.cjs');
const entrada = {nivel:'I', equipo:'PC', duracion:20, filtroSuperado:true,
  modo:'borrador', excluir:{ids:[], familias:[], tags:[]}};
const resultado = generateRoutine(entrada);
const deadBug = resultado.principal.filter(e => e.id === 'K11' || e.id === 'K12');
if (deadBug.length !== 1 || deadBug[0].id !== 'K12') {
  throw new Error('La referencia K12 no coincide con el generador original.');
}
console.log(JSON.stringify({version_motor:VERSION, entrada,
  principal:resultado.principal.map(e => e.id), seleccion_dead_bug:deadBug[0].id,
  ejecutable:resultado.ejecutable,
  uso:'referencia deterministica en borrador; no etiqueta validada'},null,2));

