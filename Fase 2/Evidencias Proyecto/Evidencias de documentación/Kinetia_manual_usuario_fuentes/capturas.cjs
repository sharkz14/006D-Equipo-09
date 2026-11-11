// Capturas para el manual de usuario (versión web 10, tamaño teléfono).
// Uso: node capturas.cjs <url> <carpeta_salida> [respuestas_capturas_ia.json]
// Con el archivo de respuestas, /api/rutina devuelve una respuesta real de Claude guardada (la app la valida igual).
const { chromium } = require('playwright');
const fs = require('fs');
const [URL, OUT, RESP] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const respuesta = RESP ? JSON.parse(fs.readFileSync(RESP, 'utf8')).respuestas.find((r) => r.respuesta)?.respuesta : null;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'es-CL' });
  const page = await ctx.newPage(); globalThis.__p = page;
  // Reloj controlado: en la sesión se adelanta el tiempo para que la duración registrada sea realista.
  await page.clock.install();
  const logs = []; page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text().slice(0, 160)); });
  page.on('dialog', async (d) => { logs.push('DIALOGO: ' + d.message().slice(0, 120)); await d.accept(); });
  if (respuesta) {
    await page.route('**/api/rutina', async (route) => {
      await new Promise((ok) => setTimeout(ok, 600));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(respuesta) });
    });
  }
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const t = (txt) => page.getByText(new RegExp('^[^\\p{L}\\p{N}¿¡]{0,4}' + esc(txt) + '$', 'u')).first();
  const ver = async (txt) => (await t(txt).count()) > 0 && await t(txt).isVisible().catch(() => false);
  const clic = async (txt) => { await t(txt).click({ timeout: 8000 }); await page.waitForTimeout(400); };
  const foto = async (n, ms = 900) => { await page.waitForTimeout(ms); await page.screenshot({ path: `${OUT}/${n}.png` }); console.log('foto', n); };
  const bajar = async (px) => { await page.mouse.move(195, 450); await page.mouse.wheel(0, px); await page.waitForTimeout(700); };
  const subir = async () => { await page.mouse.move(195, 450); await page.mouse.wheel(0, -20000); await page.waitForTimeout(600); };

  await page.goto(URL, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500);
  // 1. Cuestionario
  await foto('01_bienvenida');
  await clic('Empecemos');
  await page.getByPlaceholder('Tu nombre').fill('Camila'); await foto('02_nombre', 400); await clic('Continuar');
  await page.getByPlaceholder('Edad').fill('24'); await clic('Continuar');
  await page.getByPlaceholder('62').fill('60'); await page.getByPlaceholder('165').fill('165');
  await foto('03_cuerpo', 500); await clic('Continuar');
  await clic('Hip hop'); await clic('K-pop'); await foto('04_estilos', 500); await clic('Continuar');
  await foto('05_fuerza', 500);
  await page.getByText(/Sí, llevo 6 meses o más/).first().click(); await page.waitForTimeout(400);
  await clic('No'); await clic('30 minutos');
  let nada = false; let fotoPuente = false; let fotoDead = false;
  for (let k = 0; k < 16 && !(await ver('Guardar y ver mi sesión')); k++) {
    const antes = await page.innerText('body');
    if (/puente/i.test(antes) && await ver('Lo hago, pero me cuesta')) {
      if (!fotoPuente) { fotoPuente = true; await foto('06_puente', 1500); }
      await clic('Lo hago, pero me cuesta'); continue;
    }
    if (/dead bug/i.test(antes) && await ver('Nunca lo he hecho')) {
      if (!fotoDead) { fotoDead = true; await foto('07_dead_bug', 1500); }
      await clic('Nunca lo he hecho'); continue;
    }
    if (await ver('A veces')) { await clic('A veces'); continue; }
    if (await ver('Nada en particular')) { if (!nada) { await foto('08_evitar', 500); await clic('Nada en particular'); nada = true; } else await clic('Continuar'); continue; }
    if (await ver('Continuar')) await clic('Continuar');
    if ((await page.innerText('body')) === antes) break;
  }
  await foto('09_resumen', 700);
  await clic('Guardar y ver mi sesión'); await page.waitForTimeout(1800);
  // 2. Inicio
  await foto('10_inicio', 1200);
  await bajar(600); await foto('11_inicio_semana', 400); await subir();
  // 3. Preparar
  await clic('Preparar mi rutina'); await page.waitForTimeout(900);
  await foto('12_preparar', 600);
  await bajar(700); await foto('13_preparar_confirmaciones', 300);
  await page.getByText('No tengo dolor ni una lesión', { exact: false }).first().click(); await page.waitForTimeout(250);
  await page.getByText('Entiendo que Kinetia no enseña pasos', { exact: false }).first().click(); await page.waitForTimeout(250);
  await foto('14_preparar_marcadas', 300);
  await clic('Generar rutina con IA');
  await page.waitForTimeout(250); await foto('15_generando', 0);
  for (let i = 0; i < 60 && !(await ver('Empezar sesión')); i++) await page.waitForTimeout(500);
  // 4. Rutina
  await foto('16_rutina', 1200);
  for (let i = 1; i <= 4; i++) { await bajar(650); await foto(`17_rutina_${i}`, 300); }
  if (await ver('Ver la sesión completa')) { await clic('Ver la sesión completa'); await bajar(450); await foto('18_sesion_completa', 500); }
  // 5. Sesión guiada
  await clic('Empezar sesión'); await page.waitForTimeout(1200);
  await foto('20_sesion_calentamiento', 1500);
  const vistos = new Set();
  for (let k = 0; k < 220 && !(await ver('¿Cómo te fue?')); k++) {
    const cuerpo = await page.innerText('body');
    const ej = (cuerpo.match(/Ejercicio (\d) de (\d)/) || [])[1];
    if (ej && !vistos.has('ej' + ej) && /Terminé|Listo/.test(cuerpo)) {
      vistos.add('ej' + ej);
      if (ej === '1' || ej === '4') { await foto(`21_sesion_ejercicio_${ej}`, 1500); await bajar(600); await foto(`22_sesion_ejercicio_${ej}_tecnica`, 400); await subir(); }
    }
    if (!vistos.has('descanso') && await ver('Saltar descanso')) { vistos.add('descanso'); await foto('23_sesion_descanso', 1200); }
    if (!vistos.has('lado') && await ver('Terminé este lado')) { vistos.add('lado'); await foto('24_sesion_lado', 1200); }
    let hecho = false;
    for (const o of ['Terminé la serie', 'Terminé este lado', 'Listo', 'Saltar descanso', 'Saltar', 'Continuar']) {
      if (!hecho && await ver(o)) { await clic(o); hecho = true; }
    }
    if (hecho) await page.clock.fastForward('00:40'); else await page.waitForTimeout(800);
  }
  // 6. ¿Cómo te fue?
  await foto('25_como_te_fue', 900);
  await clic('Fácil'); await clic('No'); await foto('26_como_te_fue_marcado', 400);
  await clic('Guardar sesión'); await page.waitForTimeout(1500);
  await foto('27_celebracion', 1500);
  await clic('Volver al inicio'); await page.waitForTimeout(1500);
  await foto('28_inicio_despues', 1000);
  await bajar(600); await foto('29_inicio_semana_despues', 400); await subir();
  // 6b. Segunda sesión: detener por dolor
  await clic('Preparar mi rutina'); await page.waitForTimeout(900);
  await page.getByText('No tengo dolor ni una lesión', { exact: false }).first().click(); await page.waitForTimeout(250);
  await page.getByText('Entiendo que Kinetia no enseña pasos', { exact: false }).first().click(); await page.waitForTimeout(250);
  await clic('Generar rutina con IA');
  for (let i = 0; i < 60 && !(await ver('Empezar sesión')); i++) await page.waitForTimeout(500);
  await clic('Empezar sesión'); await page.waitForTimeout(1200);
  for (let k = 0; k < 10 && !(await ver('Terminé la serie')); k++) {
    for (const o of ['Listo', 'Saltar descanso', 'Saltar', 'Continuar']) if (await ver(o)) { await clic(o); break; }
    await page.clock.fastForward('00:20');
  }
  await clic('Detener por dolor'); await foto('33_sesion_detenida', 1000);
  await bajar(600); await foto('34_sesion_detenida_abajo', 400);
  for (let k = 0; k < 4 && !(await ver('¿Sentiste dolor o molestias?')); k++) { if (await ver('Continuar')) await clic('Continuar'); }
  await foto('35_detenida_preguntas', 600);
  if (await ver('Difícil')) await clic('Difícil');
  if (await ver('Guardar sesión')) { await clic('Guardar sesión'); await page.waitForTimeout(1500); }
  await foto('36_detenida_fin', 1200);
  for (const o of ['Volver al inicio', 'Continuar']) if (await ver(o)) { await clic(o); break; }
  await page.waitForTimeout(1200); await foto('37_inicio_tras_dolor', 800);
  await clic('Preparar mi rutina'); await page.waitForTimeout(900); await bajar(700); await foto('38_preparar_tras_dolor', 400);
  await page.getByText(/^‹ Volver$/).first().click().catch(() => {}); await page.waitForTimeout(900);
  // 7. Perfil y Cómo funciona
  await t('Perfil').click(); await page.waitForTimeout(1200); await foto('30_perfil');
  await bajar(800); await foto('31_perfil_abajo', 400);
  await t('Cómo funciona').click(); await foto('32_como_funciona', 1200);
  console.log(logs.join('\n') || 'sin errores');
  await browser.close();
})().catch(async (e) => {
  console.error('FALLO:', e.message.split('\n')[0]);
  try { await globalThis.__p.screenshot({ path: OUT + '/fallo.png' }); console.error((await globalThis.__p.innerText('body')).slice(0, 700)); } catch {}
  process.exit(1);
});
