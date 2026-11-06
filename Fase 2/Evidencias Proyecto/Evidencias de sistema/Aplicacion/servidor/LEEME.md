# Servidor de IA de Kinetia

Recibe el perfil (sin nombre), la sesión y los ejercicios compatibles que calculó la app, le pide a Claude que elija y
ajuste la rutina con opciones cerradas (esquema JSON) y devuelve la propuesta. La app la vuelve a validar con el motor de
reglas antes de mostrarla. No tiene dependencias: basta Node 18 o posterior.

## Probarlo sin clave (modo simulado)
```powershell
cd C:\Users\Administrador\Proyectos\kinetia
$env:KINETIA_SIMULADO="1"
node servidor\local.mjs
```
Responde siempre la primera variante compatible. Sirve para probar el recorrido de la app sin gastar.

## Usarlo con Claude
1. Crea una clave en https://platform.claude.com/settings/keys, asociada a un *workspace*, y carga crédito en
   https://platform.claude.com/settings/billing.
2. Comprueba la clave sin abrir la app:
   ```powershell
   cd C:\Users\Administrador\Proyectos\kinetia
   $env:ANTHROPIC_API_KEY="sk-ant-..."
   node servidor\probar-clave.mjs
   ```
   Debe decir «La clave funciona» y mostrar una rutina de ejemplo. Si falla, indica el motivo.
3. En una ventana de PowerShell **aparte** de la de Expo:
   ```powershell
   cd C:\Users\Administrador\Proyectos\kinetia
   $env:ANTHROPIC_API_KEY="sk-ant-..."
   node servidor\local.mjs
   ```
   Debe decir `Kinetia IA escuchando en http://localhost:8787 · modo Claude (claude-haiku-5-5)`.
4. Crea el archivo `.env.local` en la raíz del proyecto (copia `.env.example`):
   ```
   EXPO_PUBLIC_KINETIA_IA_URL=http://10.0.2.2:8787
   ```
5. Reinicia Expo con `npx expo start -c` y recarga la app. El botón dirá **Generar rutina con IA**.

`10.0.2.2` es la dirección con la que el emulador de Android llega a tu computador. La clave queda solo en la ventana de
PowerShell: no la escribas en archivos del proyecto ni la subas a GitHub.

## Variables
| Variable | Uso |
|---|---|
| `ANTHROPIC_API_KEY` | Clave de Claude. Obligatoria fuera del modo simulado. |
| `ANTHROPIC_WORKSPACE_ID` | Solo si la clave no está asociada a un workspace. |
| `KINETIA_MODELO` | Modelo; por defecto `claude-haiku-5-5`. |
| `KINETIA_TOKEN` | Opcional. Si se define, la app debe enviar el mismo valor (`EXPO_PUBLIC_KINETIA_IA_TOKEN`). |
| `KINETIA_SIMULADO` | `1` para responder sin llamar a Claude. |
| `PORT` | Puerto local; por defecto 8787. |

## Qué garantiza
- La IA solo puede elegir ejercicios de la lista compatible de cada cupo (enumerada en el esquema).
- Series iguales o menores que las de la ficha; intensidad completa, reducida (~75 %) o mínima (~50 %); descanso estándar
  o ampliado (+30 s). La IA **nunca** puede subir la dosis.
- La app calcula topes de carga por edad y peso/estatura (`src/lib/carga-perfil.ts`) y los envía con cada variante
  (contrato `kinetia-rutina-ia-0.2`). El esquema acota las opciones cuando todas las variantes de un cupo comparten el
  tope, y la app vuelve a aplicarlo al montar la rutina. Una app con el contrato 0.1 recibe un error 400 y usa la rutina
  por reglas: después de actualizar, reinicia el servidor.
- La app rechaza cualquier propuesta inválida, incompleta o tardía y usa la rutina por reglas, informando el motivo.
- No se envía el nombre de la persona.

## Publicarlo en la nube (opcional)
`kinetia-ia.mjs` exporta `default { fetch }`, el formato de Cloudflare Workers y plataformas similares. Al publicarlo, la
clave se define como secreto de la plataforma y la URL pública reemplaza a `http://10.0.2.2:8787` en `.env.local`.
