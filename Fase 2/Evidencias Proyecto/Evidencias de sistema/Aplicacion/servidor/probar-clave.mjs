/**
 * Comprueba que tu clave de Claude funciona, sin abrir la app ni el emulador.
 *
 *   PowerShell:  $env:ANTHROPIC_API_KEY="sk-ant-..." ; node servidor/probar-clave.mjs
 *
 * Envía una solicitud de ejemplo (intermedio, 20 min, peso corporal) y muestra la rutina
 * que propone la IA, o el motivo exacto del error.
 */
import { manejarSolicitud } from './kinetia-ia.mjs';

const EJEMPLO = {
  "version": "kinetia-rutina-ia-0.1",
  "perfil": {
    "edad": 27,
    "peso_kg": 62,
    "estatura_cm": 165,
    "nivel_perfil": "I"
  },
  "sesion": {
    "nivel": "I",
    "duracion_min": 20,
    "equipo": "PC",
    "plantilla": "I20_PC"
  },
  "antecedentes": {},
  "cupos": [
    {
      "familia": "sentadilla",
      "candidatos": [
        {
          "id": "K01",
          "nombre": "Sentadilla corporal",
          "nivel_minimo": "P",
          "lateralidad": "bilateral",
          "series": 2,
          "cantidad": 10,
          "unidad": "repeticiones",
          "descanso_series_s": 90,
          "descanso_lados_s": 0
        }
      ]
    },
    {
      "familia": "puente",
      "candidatos": [
        {
          "id": "K08",
          "nombre": "Puente unilateral, pierna contraria sujeta detrás del muslo",
          "nivel_minimo": "I",
          "lateralidad": "por_lado",
          "series": 2,
          "cantidad": 6,
          "unidad": "repeticiones",
          "descanso_series_s": 90,
          "descanso_lados_s": 30
        },
        {
          "id": "K06",
          "nombre": "Puente bilateral corporal",
          "nivel_minimo": "P",
          "lateralidad": "bilateral",
          "series": 2,
          "cantidad": 12,
          "unidad": "repeticiones",
          "descanso_series_s": 90,
          "descanso_lados_s": 0
        }
      ]
    },
    {
      "familia": "dead_bug",
      "candidatos": [
        {
          "id": "K12",
          "nombre": "Dead bug con extensión contralateral",
          "nivel_minimo": "I",
          "lateralidad": "alternado",
          "series": 2,
          "cantidad": 5,
          "unidad": "repeticiones",
          "descanso_series_s": 60,
          "descanso_lados_s": 0
        },
        {
          "id": "K11",
          "nombre": "Dead bug inicial desde apoyos",
          "nivel_minimo": "P",
          "lateralidad": "alternado",
          "series": 2,
          "cantidad": 6,
          "unidad": "repeticiones",
          "descanso_series_s": 60,
          "descanso_lados_s": 0
        }
      ]
    }
  ]
};

if (!process.env.ANTHROPIC_API_KEY) {
  console.log('Falta la clave. En PowerShell escribe:  $env:ANTHROPIC_API_KEY="sk-ant-..."  y vuelve a intentarlo.');
  process.exit(1);
}
const inicio = Date.now();
const respuesta = await manejarSolicitud(new Request('http://local/', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(EJEMPLO),
}), { ...process.env, KINETIA_TOKEN: '' });
const datos = await respuesta.json();
const segundos = ((Date.now() - inicio) / 1000).toFixed(1);

if (respuesta.status !== 200) {
  console.log(`\nNo funcionó (${respuesta.status}) después de ${segundos} s:\n  ${datos.error}\n`);
  const e = String(datos.error);
  if (/401|authentication|api-key|invalid/i.test(e)) console.log('→ La clave no es válida o expiró. Revisa que la copiaste completa (empieza con sk-ant-).');
  else if (/workspace/i.test(e)) console.log('→ Tu clave no está asociada a un workspace. Crea otra eligiendo un workspace, o define $env:ANTHROPIC_WORKSPACE_ID.');
  else if (/credit|balance|billing|402/i.test(e)) console.log('→ Falta crédito. Cárgalo en platform.claude.com/settings/billing.');
  else if (/model/i.test(e)) console.log('→ Problema con el modelo. Prueba con $env:KINETIA_MODELO="claude-sonnet-5-5".');
  process.exit(1);
}
console.log(`\nLa clave funciona. Rutina propuesta por ${datos.modelo} en ${segundos} s:\n`);
console.log(`  ${datos.resumen}\n`);
for (const c of datos.cupos) {
  console.log(`  • ${c.familia}: ${c.ejercicio} · ${c.series} series · intensidad ${c.intensidad} · descanso ${c.descanso}`);
  console.log(`    ${c.motivo}`);
}
console.log('\nEsto solo prueba el servidor. En la app, el motor volverá a validar la propuesta.\n');
