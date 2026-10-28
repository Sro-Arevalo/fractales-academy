'use strict';
// Pruebas Chromium contra preview:v43 en localhost, con datos ficticios.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
(async()=>{
  const url=process.env.V43_PREVIEW_URL||'http://127.0.0.1:3001';
  if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(url))throw Error('Solo se permiten vistas de pruebas en loopback.');
  const dir=path.resolve('artifacts/local-preview/v43');fs.mkdirSync(dir,{recursive:true});
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'es-PE'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.goto(url+'/__local/login');await page.locator('.v41-metric').first().waitFor();
    await page.screenshot({path:path.join(dir,'01-dashboard.png'),fullPage:true,animations:'disabled'});console.log('PASS: dashboard con datos SQL reales.');
    await page.locator('#profileButton').click();await page.locator('#adminEmailForm').waitFor();assert.equal(await page.locator('#adminEmail').getAttribute('type'),'email');assert.equal(await page.locator('#adminEmailPassword').getAttribute('type'),'password');await page.screenshot({path:path.join(dir,'08-perfil-administrador.png'),fullPage:true,animations:'disabled'});await page.locator('.close-modal').click();
    for(const module of ['Ciclo','Grupo','CURSOS','Docente','Horario','MATRICULA','Nota_Examen','Usuario']){
      await page.locator(`#navContent [data-nav="${module}"]`).click();await page.locator('.v41-table').waitFor();
      assert.ok(await page.locator('#content').innerText());
    }
    await page.locator('#navContent [data-nav="catalogos"]').click();await page.locator('.v41-catalog-grid').waitFor();
    for(const module of ['Programa','CARRERA','Aula','Turno','Docente_Asignatura','Examen_Grupo','PARENTESCO','CONCEPTO_PAGO','ESTADO_CICLO','ESTADO_MATRICULA','ESTADO_PAGO','ESTADO_EXAMEN_GRUPO','TIPO_BLOQUE','ROL']){
      await page.locator('#navContent [data-nav="catalogos"]').click();await page.locator(`[data-go="${module}"]`).click();await page.locator('.v41-table').waitFor();
    }
    await page.locator('#navContent [data-nav="reportes"]').click();await page.getByRole('heading',{name:'Resumen académico y económico',exact:true}).waitFor();
    await page.locator('#navContent [data-nav="configuracion"]').click();await page.locator('#contactRequests .panel').waitFor();
    await page.locator('#navContent [data-nav="auditoria"]').click();await page.locator('#auditSearch').waitFor();
    console.log('PASS: consultas y navegación de los módulos y catálogos conservados.');
    await page.locator('#navContent [data-nav="inscripcion"]').click();await page.locator('.v43-steps').waitFor();
    await page.locator('#enrollNext').click();assert.match(await page.locator('[data-form-error]').innerText(),/DNI/);assert.equal(await page.locator('[data-step="0"]').isVisible(),true);
    const dni='43'+String(crypto.randomInt(100000,999999));
    await page.locator('#enrollDni').fill(dni);await page.locator('#lookupStudent').click();await page.locator('#enrollPersonal').waitFor({state:'visible'});
    await page.locator('#field-Nomb_Alu').fill('Estudiante ficticio de interfaz');await page.locator('#field-Cel_Alu').fill('900123456');await page.locator('#field-Correo_Alu').fill(dni+'@example.test');await page.locator('#enrollTest').check();
    await page.locator('#enrollNext').click();await page.locator('#guardianSelected').selectOption('43999001');await page.locator('#enrollKinship').selectOption('TUTOR');await page.locator('#enrollNext').click();
    await page.locator('#enrollProgram').selectOption('PREUNIV');await page.locator('#enrollMode').selectOption('REGULAR');await page.locator('#enrollCycle').selectOption('V4-REGULAR');await page.locator('#enrollShift').selectOption('MANANA');await page.locator('#enrollCareer').selectOption('V4-TEST');await page.locator('#enrollNext').click();
    await page.locator('#enrollGroup').selectOption('V4-GR');await page.locator('#enrollNext').click();assert.match(await page.locator('#enrollSummary').innerText(),/1[,.\s]?050/);
    await page.locator('#enrollAccess').selectOption('DNI_ACTIVACION');assert.equal(await page.locator('#enrollIdentity').getAttribute('required'),'');await page.locator('#enrollAccess').selectOption('TEMPORAL');
    await page.screenshot({path:path.join(dir,'02-inscripcion-confirmacion.png'),fullPage:true,animations:'disabled'});
    await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(dir,'03-inscripcion-movil.png'),fullPage:true,animations:'disabled'});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'La página no debe desbordar horizontalmente.');
    assert.ok(await page.locator('#enrollmentForm').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'El formulario debe caber en el móvil.');
    await page.locator('#enrollConfirm').check();const response=page.waitForResponse(r=>r.url()===url+'/api/inscripciones'&&r.request().method()==='POST');await page.locator('#enrollSave').click();assert.equal((await response).status(),201);await page.getByRole('heading',{name:'Inscripción registrada',exact:true}).waitFor();
    // No se capturan ni registran las credenciales temporales mostradas en el modal.
    await page.locator('.close-modal').click();console.log('PASS: formulario de cinco pasos, validación y matrícula real desde Chromium.');
    await page.setViewportSize({width:1440,height:1000});await page.locator('#navContent [data-nav="apoderados"]').click();await page.locator('#guardianTerm').fill('43999001');await page.locator('#guardianFind button[type="submit"]').click();await page.locator('[data-guardian="43999001"]').waitFor();console.log('PASS: búsqueda de apoderados conectada a SQL.');
    await page.locator('#navContent [data-nav="limpieza"]').click();await page.locator('#cleanupForm').waitFor();await page.screenshot({path:path.join(dir,'04-limpieza.png'),fullPage:true,animations:'disabled'});
    await page.locator('#navContent [data-nav="ALUMNO"]').click();await page.locator('#searchRecords').fill(dni);await page.getByRole('cell',{name:dni,exact:true}).waitFor();await page.getByRole('row').filter({has:page.getByRole('cell',{name:dni,exact:true})}).locator('[data-manage]').click();await page.locator('[data-record-action="desactivar"]').click();await page.locator('#recordReason').fill('Desactivación del registro ficticio de interfaz');await page.locator('#recordAcknowledge').check();await page.locator('#recordActionSubmit').click();await page.locator('#searchRecords').waitFor();
    await page.locator('#searchRecords').fill(dni);await page.getByRole('cell',{name:dni,exact:true}).waitFor();await page.getByRole('row').filter({has:page.getByRole('cell',{name:dni,exact:true})}).locator('[data-manage]').click();await page.locator('[data-record-action="eliminar"]').waitFor();assert.equal(await page.locator('#recordActionForm').isVisible(),false);await page.locator('[data-record-action="eliminar"]').click();assert.equal(await page.locator('#recordTypedConfirmation').isVisible(),true);await page.screenshot({path:path.join(dir,'05-eliminacion-revisada.png'),fullPage:true,animations:'disabled'});await page.locator('.close-modal').click();console.log('PASS: búsqueda, desactivación y confirmación de eliminación con dependencias visibles.');
    await page.goto(url+'/__local/student');await page.locator('.v41-student-welcome').waitFor();await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(dir,'06-estudiante-movil.png'),fullPage:true,animations:'disabled'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
    await page.locator('.v41-student-tabs [data-go="student-schedule"]').click();await page.locator('.v4-week-mobile').waitFor();await page.screenshot({path:path.join(dir,'07-horario-movil.png'),fullPage:true,animations:'disabled'});
    assert.deepEqual(errors,[],'Errores JavaScript inesperados en Chromium.');console.log('PASS: portal del estudiante y horario móvil sin errores JavaScript.');
    console.log('Capturas:',dir);
  }finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
