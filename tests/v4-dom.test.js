'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..');const model=require('../server/model.json');
const contextData={programas:[{ID_PROGRAMA:'PREUNIV',NOMBRE_PROGRAMA:'Preparación'}],ciclos:[{ID_CICLO:'REG',NOMBRE_CICLO:'Regular',ID_PROGRAMA:'PREUNIV',MODALIDAD:'REGULAR',FECHA_INICIO:'2027-01-31'}],grupos:[{ID_HORARIO_ACADEMICO:'GR',NOMBRE_HORARIO:'HORARIO_ACADEMICO A',ID_CICLO:'REG',ID_TURNO:'MANANA',NOMBRE_TURNO:'MANANA',NOMBRE_AULA:'AULA ficticia',NOMBRE_CICLO:'Regular',NUMERO_MENSUALIDADES:4,PRECIO_MENSUAL:250,FECHA_INICIO:'2027-01-31',FECHA_FIN:'2027-05-30'}],carreras:[{ID_CARRERA:'SIS',NOMBRE_CARRERA:'Sistemas'}],parentescos:[{ID_PARENTESCO:'TUTOR',PARENTESCO:'Tutor'}],asignaturas:[{ID_CURSO:'MAT',NOMBRE_CURSO:'Matemática',DNI_DOCENTE:'00000003',NOMBRE_COMPLETO:'DOCENTE Ficticio'}]};
function setup(t,existing=false){
  const dom=new JSDOM(fs.readFileSync(path.join(root,'public/index.html'),'utf8'),{url:'http://localhost:3000',runScripts:'outside-only'});t.after(()=>dom.window.close());const w=dom.window,requests=[];
  w.fetch=async(url,options={})=>{
    const body=options.body?JSON.parse(options.body):undefined;requests.push({url,body,method:options.method||'GET'});let data;
    if(url==='/api/academic/context')data=structuredClone(contextData);
    else if(url.startsWith('/api/alumnos/'))data={alumno:existing?{DNI_ALUMNO:'00000001',NOMBRE_COMPLETO:'Alumno Legado Ficticio',NOMBRE_APODERADO:'Tutor',ID_PARENTESCO:'TUTOR',ID_CARRERA:'SIS'}:null,historial:[]};
    else if(url==='/api/inscripciones')data={matricula:'M4000000000000000001',cuotas:4,total:existing?1000:1050,usuario:'00000001',claveTemporal:existing?null:'TemporalFicticiaSoloPruebas123'};
    else if(url.includes('/api/simulacros/')&&url.includes('/alumno/'))data={alumno:{DNI_ALUMNO:'00000001',NOMBRE_COMPLETO:'Alumno Ficticio',NOMBRE_HORARIO:'HORARIO_ACADEMICO A',PUNTAJE_MAXIMO:100,ID_RESULTADO:'N1',PUNTAJE_TOTAL:80}};
    else if(url.includes('/api/simulacros/')&&url.endsWith('/resultados'))data={ok:true,codigo:'N1',corregido:true};
    else if(url==='/api/pagos/medios')data={rows:[{ID_MEDIO_PAGO:'YAPE',NOMBRE_MEDIO_PAGO:'Yape',ACTIVO:true}]};
    else if(url.startsWith('/api/pagos/alumno/'))data={alumno:{DNI_ALUMNO:'00000001',NOMBRE_COMPLETO:'Alumno Ficticio'},rows:[{ID_PAGO:'P1',ID_CONCEPTO:'MENSUALIDAD',NUMERO_MENSUALIDAD:1,MONTO:250,ID_ESTADO_PAGO:'PENDIENTE',FECHA_VENCIMIENTO:'2027-01-31'}]};
    else if(url.startsWith('/api/records/BLOQUE_HORARIO?'))data={rows:[],count:0,pageSize:15};
    else data={rows:[],ok:true};
    return {ok:true,status:200,json:async()=>data};
  };
  const ctx=dom.getInternalVMContext();vm.runInContext(fs.readFileSync(path.join(root,'public/app.js'),'utf8'),ctx);w.document.removeEventListener('DOMContentLoaded',w.boot);vm.runInContext(fs.readFileSync(path.join(root,'public/v4.js'),'utf8'),ctx);
  const state=vm.runInContext('state',ctx);state.modules=structuredClone(model);state.user={rol:'ADMIN',nombre:'Administrador Ficticio',cambiar:false};const v4=vm.runInContext('V4',ctx);
  let pending;const original=v4.submit;v4.submit=(form,work)=>(pending=original(form,work));
  const $=id=>w.document.getElementById(id);
  const change=(id,value)=>{$(id).value=value;$(id).dispatchEvent(new w.Event('change'));};
  return {w,$,v4,requests,change,submit:async id=>{$(id).onsubmit({preventDefault(){},currentTarget:$(id)});await pending;}};
}
test('formulario integral: valida celular, filtra grupos y muestra la clave una sola vez',async t=>{
  const {$,v4,change,requests,submit,w}=setup(t);await v4.enrollmentView();assert.equal($('enrollDetails').disabled,true);
  $('enrollDni').value='00000001';await $('lookupStudent').onclick();assert.equal($('enrollDetails').disabled,false);
  $('field-NOMBRE_COMPLETO').value='Alumno Ficticio';$('field-NOMBRE_APODERADO').value='Tutor Ficticio';change('field-ID_PARENTESCO','TUTOR');change('field-ID_CARRERA','SIS');
  const cell=$('field-CELULAR');assert.equal(cell.maxLength,9);cell.value='90000000 ';assert.equal(cell.checkValidity(),false);cell.value='900000001';assert.equal(cell.checkValidity(),true);
  change('enrollProgram','PREUNIV');change('enrollMode','REGULAR');change('enrollCycle','REG');change('enrollShift','TARDE');assert.equal($('enrollGroup').options.length,1);change('enrollShift','MANANA');change('enrollGroup','GR');
  assert.ok($('enrollmentForm').checkValidity());assert.match($('enrollSummary').textContent,/1[,.]050/);
  await submit('enrollmentForm');const request=requests.find(r=>r.url==='/api/inscripciones');assert.equal(request.body.alumno.DNI_ALUMNO,'00000001');assert.equal(request.body.ID_HORARIO_ACADEMICO,'GR');assert.match($('modalRoot').textContent,/TemporalFicticiaSoloPruebas123/);
  w.closeModal();assert.doesNotMatch($('modalRoot').textContent,/TemporalFicticia/);assert.equal($('enrollDetails').disabled,true);
});
test('reinscripción presenta datos existentes y envía exclusivamente el DNI del alumno',async t=>{
  const {$,v4,change,requests,submit}=setup(t,true);await v4.enrollmentView();$('enrollDni').value='00000001';await $('lookupStudent').onclick();assert.ok($('field-NOMBRE_COMPLETO').disabled);
  change('enrollProgram','PREUNIV');change('enrollMode','REGULAR');change('enrollCycle','REG');change('enrollShift','MANANA');change('enrollGroup','GR');await submit('enrollmentForm');
  assert.deepEqual(requests.find(r=>r.url==='/api/inscripciones').body.alumno,{DNI_ALUMNO:'00000001'});assert.match($('modalRoot').textContent,/conserva su cuenta/);
});
test('gestión de pagos busca por DNI y confirma el medio seleccionado',async t=>{
  const {$,v4,submit,requests,w}=setup(t);await v4.paymentsView('00000001');assert.match($('paymentRows').textContent,/Confirmar pago/);assert.match($('paymentResults').textContent,/250/);assert.match(w.fmtDateTime('2026-10-25T01:00:00Z'),/24\/10/);
  await v4.paymentModal({ID_PAGO:'P1',MONTO:250,ID_ESTADO_PAGO:'PENDIENTE'},async()=>{});$('paymentValue').value='YAPE';await submit('confirmPayment');
  assert.deepEqual(requests.find(r=>r.url==='/api/pagos/P1/confirmar').body,{medio:'YAPE'});
});
test('puntaje por DNI consulta nombre, grupo y nota previa antes de permitir una corrección',async t=>{
  const {$,v4,submit,requests}=setup(t);v4.scoreModal('SIM1');assert.equal($('scoreFields').disabled,true);$('scoreDni').value='00000001';await $('scoreLookup').onclick();
  assert.match($('scoreStudent').textContent,/Alumno Ficticio.*HORARIO_ACADEMICO A/);assert.equal($('scoreFields').disabled,false);assert.equal($('scoreValue').max,'100');assert.equal($('scoreValue').value,'80');assert.equal($('scoreReason').required,true);
  $('scoreValue').value='81';$('scoreReason').value='Corrección ficticia autorizada';await submit('scoreForm');assert.equal(requests.find(r=>r.url==='/api/simulacros/SIM1/resultados').body.PUNTAJE_TOTAL,81);
});
test('enlace anterior de bloques abre la cabecera del horario completo',async t=>{
  const {v4,w}=setup(t);let selected;w.V44={editor:async id=>{selected=id;}};await v4.scheduleModal({ID_HORARIO_ACADEMICO:'GR'});assert.equal(selected,'GR');await v4.scheduleModal(null);assert.equal(selected,null);
});
test('horario semanal muestra días, horas, docente, turno, aula y recreos',t=>{
  const {v4}=setup(t);const html=v4.weekly([{DIA_SEMANA:1,HORA_INICIO:'07:00',HORA_FIN:'08:00',ID_TIPO_BLOQUE:'CLASE',NOMBRE_CURSO:'Matemática',NOMBRE_COMPLETO:'DOCENTE Ficticio',NOMBRE_HORARIO:'HORARIO_ACADEMICO A',NOMBRE_TURNO:'MANANA',NOMBRE_AULA:'AULA ficticia'},{DIA_SEMANA:1,HORA_INICIO:'08:00',HORA_FIN:'08:15',ID_TIPO_BLOQUE:'RECREO'}]);
  for(const word of ['Lunes','Domingo','07:00','DOCENTE Ficticio','MANANA','AULA ficticia','Recreo','v4-week-mobile'])assert.ok(html.includes(word));
});
