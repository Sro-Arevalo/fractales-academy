'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');const {JSDOM}=require('jsdom');const model=require('../server/model.json');
const root=path.join(__dirname,'..');
function setup(t,options={}){
  const dom=new JSDOM(fs.readFileSync(path.join(root,'public/index.html'),'utf8'),{url:'http://localhost:3000',runScripts:'outside-only'});t.after(()=>dom.window.close());const w=dom.window,calls=[];
  const row={ID_CURSO:'MAT-FIC',NOMBRE_CURSO:'Curso Ficticio',ACTIVO:true,_id:Buffer.from(JSON.stringify(['MAT-FIC'])).toString('base64url')};
  const overview={profile:{DNI_ALUMNO:'00000001',NOMBRE_COMPLETO:'Estudiante Ficticio'},groups:[],notes:[],schedule:[],payments:[],exams:[]};
  w.fetch=async(url,request={})=>{
    const body=request.body?JSON.parse(request.body):undefined,method=request.method||'GET';calls.push({url,method,body});let data;
    if(url==='/api/auth/capabilities')data=options.capabilities||{v41:true,email:true,sms:false,activacionDni:true};
    else if(url==='/api/academic/context')data={programas:[{ID_PROGRAMA:'PREUNIV',NOMBRE_PROGRAMA:'Preparación'}],ciclos:[{ID_CICLO:'REG',NOMBRE_CICLO:'Regular',ID_PROGRAMA:'PREUNIV',MODALIDAD:'REGULAR'}],grupos:[{ID_HORARIO_ACADEMICO:'GR',NOMBRE_HORARIO:'HORARIO_ACADEMICO ficticio',ID_CICLO:'REG',ID_TURNO:'MANANA',NOMBRE_AULA:'AULA',NOMBRE_CICLO:'Regular',NUMERO_MENSUALIDADES:4,PRECIO_MENSUAL:250,FECHA_INICIO:'2027-01-31',FECHA_FIN:'2027-05-30'}],carreras:[{ID_CARRERA:'SIS',NOMBRE_CARRERA:'Sistemas'}],parentescos:[{ID_PARENTESCO:'TUTOR',PARENTESCO:'Tutor'}]};
    else if(url.startsWith('/api/alumnos/'))data={alumno:null,historial:[]};
    else if(url==='/api/inscripciones')data={matricula:'M4-FICTICIO',cuotas:4,total:1050,usuario:body.alumno.DNI_ALUMNO,claveTemporal:body.alumno.DNI_ALUMNO,codigoActivacion:'CodigoIndividualFicticio'};
    else if(url==='/api/dashboard')data={alumnos:12,matriculas:8,grupos:3,pendientes:2,pagosRegistrados:4,ciclosActivos:1,ingresos:1000,recent:[],exams:[]};
    else if(url==='/api/meta')data={modules:Object.values(model)};
    else if(url==='/api/student/overview')data=overview;
    else if(url==='/api/student/profile')data={profile:{DNI_ALUMNO:'00000001',NOMBRE_COMPLETO:'Estudiante Ficticio',NOMBRE_CARRERA:'Sistemas',CORREO:'alumno@example.test',CELULAR:'900000001'},contactos:[],solicitudes:[],verificacionDisponible:true};
    else if(url.endsWith('/actions'))data=options.blocked?{dependencias:[{nombre:'Matrículas',cantidad:2}],acciones:[{id:'eliminar',enabled:false,explanation:'Hay matrículas vinculadas.'},{id:'desactivar',label:'Desactivar',enabled:true,explanation:'Conserva su historial.'}],explicacion:'Hay información vinculada.'}:{dependencias:[],acciones:[{id:'eliminar',label:'Eliminar registro',enabled:true,explanation:'La eliminación será definitiva.'}],explicacion:'Revisa las relaciones.'};
    else if(url.startsWith('/api/records/CURSO?'))data={rows:[row],count:1,pageSize:15};
    else if(url==='/api/auth/recovery/request')data={message:'Si la cuenta tiene un contacto verificado, recibirás un código.',disponible:true};
    else if(url==='/api/auth/recovery/complete')data={ok:true,message:'Ingresa con tu nueva contraseña.'};
    else if(url==='/api/auth/change-password')data={user:{rol:'ALUMNO',nombre:'00000001',alumno:'00000001',cambiar:false}};
    else if(url==='/api/student/contact/request')data={ok:true,requiereCodigo:false,message:'Solicitud registrada para revisión de administración. No se envió ningún código.'};
    else data={ok:true,rows:[]};
    return {ok:true,status:200,json:async()=>data};
  };
  const ctx=dom.getInternalVMContext();for(const file of ['app.js','v4.js','v41.js','v45.js'])vm.runInContext(fs.readFileSync(path.join(root,'public',file),'utf8'),ctx);w.document.removeEventListener('DOMContentLoaded',w.boot);
  const state=vm.runInContext('state',ctx),v41=vm.runInContext('V41',ctx);state.modules=structuredClone(model);state.user={rol:options.role||'ADMIN',nombre:'USUARIO Ficticio',cambiar:false};state.page='CURSO';
  const v4=vm.runInContext('V4',ctx);let pending=null;const oldSubmit=v4.submit;v4.submit=(form,work)=>(pending=oldSubmit(form,work));
  return {w,state,v41,v4,calls,row,$:id=>w.document.getElementById(id),submit:async id=>{pending=null;const form=w.document.getElementById(id);await form.onsubmit({preventDefault(){},currentTarget:form});if(pending)await pending;}};
}
test('navegación agrupa administración por procesos y separa el espacio del alumno',t=>{
  const {v41,$,state}=setup(t);v41.renderNav();for(const title of ['GESTIÓN ACADÉMICA','EVALUACIONES','GESTIÓN ECONÓMICA','ADMINISTRACIÓN'])assert.ok($('navContent').textContent.includes(title));assert.ok($('navContent').querySelector('[data-nav="auditoria"]'));
  state.user.rol='ALUMNO';v41.renderNav();assert.ok($('navContent').querySelector('[data-nav="student-profile"]'));assert.equal($('navContent').querySelector('[data-nav="USUARIO"]'),null);assert.equal($('navContent').querySelector('[data-nav="auditoria"]'),null);
});
test('dashboard utiliza indicadores recibidos de la API y accesos de procesos reales',async t=>{
  const {v41,$}=setup(t);await v41.dashboard();assert.match($('content').textContent,/12/);assert.match($('content').textContent,/Horarios activos/);assert.match($('content').textContent,/Todavía no hay inscripciones/);assert.ok($('content').querySelector('[data-go="inscripcion"]'));assert.ok($('content').querySelector('img[src="/assets/estudio-ilustracion.svg"]'));
});
test('tabla permite ordenar y las tarjetas móviles conservan etiquetas y acciones accesibles',async t=>{
  const {v41,$,w,calls}=setup(t);await v41.setup();await v41.tableView('CURSO');await new Promise(resolve=>setImmediate(resolve));
  assert.ok($('content').querySelector('table.v41-responsive-table'));assert.ok([...$('content').querySelectorAll('tbody td')].every(td=>td.dataset.label));
  assert.ok($('content').querySelector('button[data-manage]'));$('content').querySelector('[data-sort="NOMBRE_CURSO"]').click();await new Promise(resolve=>setImmediate(resolve));assert.ok(calls.some(r=>r.url.includes('orden=NOMBRE_CURSO')));
  w.document.querySelector('#menuButton').setAttribute('aria-expanded','false');
});
test('V4.5 exige papelera antes de ofrecer eliminación definitiva',async t=>{
  const {v41,$,row,calls}=setup(t);await v41.manage(model.CURSO,row);assert.equal($('modalRoot').querySelector('[data-record-action="eliminar"]'),null);assert.ok($('sendTrash'));$('sendTrash').click();assert.equal($('v45Confirm').checkValidity(),false);assert.equal(calls.filter(r=>r.method==='DELETE').length,0);assert.match($('modalRoot').textContent,/Conservaremos sus relaciones/);
});
test('dependencias bloqueadas muestran explicación y ofrecen desactivar, sin botón de eliminar habilitado',async t=>{
  const {v41,$,row}=setup(t,{blocked:true});await v41.manage(model.CURSO,row);assert.equal($('modalRoot').querySelector('[data-record-action="eliminar"]'),null);assert.ok($('modalRoot').querySelector('[data-record-action="desactivar"]'));assert.match($('modalRoot').textContent,/Matrículas/);
});
test('sin correo configurado la recuperación muestra ayuda administrativa y no simula envíos',async t=>{
  const {v41,$,calls}=setup(t,{capabilities:{v41:true,email:false,sms:false}});await v41.recovery();assert.equal($('recoveryDni'),null);assert.match($('modalRoot').textContent,/No se enviará un código/);assert.equal(calls.filter(r=>r.method==='POST').length,0);
});
test('recuperación pide código y contraseñas coincidentes; no inicia sesión automáticamente',async t=>{
  const {v41,$,submit,calls,w}=setup(t);await v41.recovery();$('recoveryDni').value='alumno@example.test';await submit('recoveryRequestForm');assert.ok($('recoveryCode'));assert.equal($('resendRecovery').disabled,true);
  $('recoveryCode').value='001234';$('passwordNew').value='Una frase segura de prueba';$('passwordConfirm').value='No coincide';$('passwordConfirm').dispatchEvent(new w.Event('input'));assert.equal($('recoveryCompleteForm').checkValidity(),false);
  $('passwordConfirm').value=$('passwordNew').value;$('passwordConfirm').dispatchEvent(new w.Event('input'));await submit('recoveryCompleteForm');assert.match($('modalRoot').textContent,/Ya puedes volver/);assert.equal(calls.filter(r=>r.url==='/api/auth/login').length,0);
});
test('primer ingreso presenta confirmación, indicador y ocultación antes de abrir la intranet',async t=>{
  const {v41,$,state,w,submit,calls}=setup(t,{role:'ALUMNO'});state.user.cambiar=true;v41.password(true);assert.equal($('appView').hidden,true);assert.ok($('modalRoot').querySelector('.close-modal').hidden);assert.equal($('passwordCurrent'),null);
  $('passwordNew').value='Una frase muy personal y segura';$('passwordConfirm').value=$('passwordNew').value;$('passwordNew').dispatchEvent(new w.Event('input'));assert.ok(Number($('passwordStrength').value)>=3);$('modalRoot').querySelector('[data-secret-toggle="passwordNew"]').click();assert.equal($('passwordNew').type,'text');
  await submit('v41PasswordForm');assert.equal(calls.find(r=>r.url==='/api/auth/change-password').body.confirmacion,'Una frase muy personal y segura');assert.equal(state.user.cambiar,false);
});
test('perfil solicita contacto con contraseña y conserva el procedimiento administrativo',async t=>{
  const {v41,$,submit,calls}=setup(t,{role:'ALUMNO'});await v41.profile();assert.match($('content').textContent,/Sin verificar/);$('requestContactUpdate').click();$('contactValue').value='nuevo@example.test';$('contactCurrentPassword').value='Una clave ficticia segura';await submit('contactRequestForm');
  const request=calls.find(r=>r.url==='/api/student/contact/request');assert.equal(request.body.destino,'nuevo@example.test');assert.equal(request.body.actual,'Una clave ficticia segura');assert.ok($('content').textContent.includes('Mi perfil'));
});
test('intranet muestra únicamente resultados de la respuesta y conserva vistas de horario y pagos',async t=>{
  const {v41,$}=setup(t,{role:'ALUMNO'});await v41.studentView('home');assert.match($('content').textContent,/Estudiante/);assert.ok($('content').querySelector('[data-go="student-schedule"]'));assert.ok($('content').querySelector('[data-go="student-payments"]'));assert.match(v41.results([{NOMBRE_SIMULACRO:'Simulacro Ficticio',PUNTAJE_TOTAL:80,PUNTAJE_MAXIMO:100,FECHA_PROGRAMADA:'2027-02-01',NOMBRE_HORARIO:'A'}]),/<progress/);
});
test('modo DNI de inscripción nunca se preselecciona y exige confirmación de entrega identificada',async t=>{
  const {v4,$,w,submit,calls}=setup(t);await v4.enrollmentView();$('enrollDni').value='00000001';await $('lookupStudent').onclick();assert.equal($('enrollAccess').value,'TEMPORAL');
  const change=(id,value)=>{$(id).value=value;$(id).dispatchEvent(new w.Event('change'));};
  change('enrollAccess','DNI_ACTIVACION');assert.equal($('enrollIdentity').required,true);assert.equal($('enrollIdentity').checked,false);
  $('field-NOMBRE_COMPLETO').value='Alumno Ficticio';$('field-NOMBRE_APODERADO').value='Tutor Ficticio';change('field-ID_PARENTESCO','TUTOR');change('field-ID_CARRERA','SIS');change('enrollProgram','PREUNIV');change('enrollMode','REGULAR');change('enrollCycle','REG');change('enrollShift','MANANA');change('enrollGroup','GR');assert.equal($('enrollmentForm').checkValidity(),false);
  $('enrollIdentity').checked=true;assert.equal($('enrollmentForm').checkValidity(),true);await submit('enrollmentForm');const request=calls.find(r=>r.url==='/api/inscripciones');assert.equal(request.body.accesoInicial.identidadConfirmada,true);assert.match($('modalRoot').textContent,/CodigoIndividualFicticio/);
});
test('navegación con teclado mantiene el foco dentro de la confirmación',async t=>{
  const {v41,$,w,row}=setup(t);await v41.setup();await v41.manage(model.CURSO,row);
  const controls=[...$('modalRoot').querySelectorAll('button,input,select,textarea,a[href],summary')].filter(el=>!el.matches(':disabled')&&!el.hidden&&!el.closest('[hidden]'));
  controls.at(-1).focus();w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));assert.equal(w.document.activeElement,controls[0]);
  controls[0].focus();w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}));assert.equal(w.document.activeElement,controls.at(-1));
});
