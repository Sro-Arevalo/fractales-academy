'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..');const model=require('../server/model.json');
const contextData={programas:[{Cod_Programa:'PREUNIV',Nomb_Programa:'Preparación'}],ciclos:[{Cod_Ciclo:'REG',Nomb_Ciclo:'Regular',Programa_Cod_Programa:'PREUNIV',Modalidad:'REGULAR',Fech_Inicio:'2027-01-31'}],grupos:[{Cod_Grupo:'GR',Nomb_Grupo:'Grupo A',Ciclo_Cod_Ciclo:'REG',Turno_Cod_Turno:'MANANA',Nomb_Turno:'MANANA',Nomb_Aula:'Aula ficticia',Nomb_Ciclo:'Regular',Nro_Mensualidades:4,Precio_Mensual:250,Fech_Inicio:'2027-01-31',Fech_Fin:'2027-05-30'}],carreras:[{Cod_Carrera:'SIS',Nomb_Carrera:'Sistemas'}],parentescos:[{Cod_Paren:'TUTOR',Tipo_Paren:'Tutor'}],asignaturas:[{CURSOS_Cod_Curso:'MAT',Nomb_Curso:'Matemática',Docente_DNI_Doc:'00000003',Nom_Doc:'Docente Ficticio'}]};
function setup(t,existing=false){
  const dom=new JSDOM(fs.readFileSync(path.join(root,'public/index.html'),'utf8'),{url:'http://localhost:3000',runScripts:'outside-only'});t.after(()=>dom.window.close());const w=dom.window,requests=[];
  w.fetch=async(url,options={})=>{
    const body=options.body?JSON.parse(options.body):undefined;requests.push({url,body,method:options.method||'GET'});let data;
    if(url==='/api/academic/context')data=structuredClone(contextData);
    else if(url.startsWith('/api/alumnos/'))data={alumno:existing?{DNI_Alu:'00000001',Nomb_Alu:'Alumno Legado Ficticio',Nomb_Apoderado:'Tutor',PARENTESCO_Cod_Paren:'TUTOR',CARRERA_Cod_Carrera:'SIS'}:null,historial:[]};
    else if(url==='/api/inscripciones')data={matricula:'M4000000000000000001',cuotas:4,total:existing?1000:1050,usuario:'00000001',claveTemporal:existing?null:'TemporalFicticiaSoloPruebas123'};
    else if(url.includes('/api/simulacros/')&&url.includes('/alumno/'))data={alumno:{DNI_Alu:'00000001',Nomb_Alu:'Alumno Ficticio',Nomb_Grupo:'Grupo A',puntaje_maximo:100,Cod_Nota:'N1',Puntaje_total:80}};
    else if(url.includes('/api/simulacros/')&&url.endsWith('/resultados'))data={ok:true,codigo:'N1',corregido:true};
    else if(url==='/api/pagos/medios')data={rows:[{Cod_Medio:'YAPE',Nomb_Medio:'Yape',Activo:true}]};
    else if(url.startsWith('/api/pagos/alumno/'))data={alumno:{DNI_Alu:'00000001',Nomb_Alu:'Alumno Ficticio'},rows:[{Cod_Pago:'P1',CONCEPTO_PAGO_Cod_Concepto:'MENSUALIDAD',Nro_Mensualidad:1,Monto:250,ESTADO_PAGO_Cod_Estado:'PENDIENTE',Fech_Vencimiento:'2027-01-31'}]};
    else if(url.startsWith('/api/records/Horario?'))data={rows:[],count:0,pageSize:15};
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
  $('field-Nomb_Alu').value='Alumno Ficticio';$('field-Nomb_Apoderado').value='Tutor Ficticio';change('field-PARENTESCO_Cod_Paren','TUTOR');change('field-CARRERA_Cod_Carrera','SIS');
  const cell=$('field-Cel_Alu');assert.equal(cell.maxLength,9);cell.value='90000000 ';assert.equal(cell.checkValidity(),false);cell.value='900000001';assert.equal(cell.checkValidity(),true);
  change('enrollProgram','PREUNIV');change('enrollMode','REGULAR');change('enrollCycle','REG');change('enrollShift','TARDE');assert.equal($('enrollGroup').options.length,1);change('enrollShift','MANANA');change('enrollGroup','GR');
  assert.ok($('enrollmentForm').checkValidity());assert.match($('enrollSummary').textContent,/1[,.]050/);
  await submit('enrollmentForm');const request=requests.find(r=>r.url==='/api/inscripciones');assert.equal(request.body.alumno.DNI_Alu,'00000001');assert.equal(request.body.Grupo_Cod_Grupo,'GR');assert.match($('modalRoot').textContent,/TemporalFicticiaSoloPruebas123/);
  w.closeModal();assert.doesNotMatch($('modalRoot').textContent,/TemporalFicticia/);assert.equal($('enrollDetails').disabled,true);
});
test('reinscripción presenta datos existentes y envía exclusivamente el DNI del alumno',async t=>{
  const {$,v4,change,requests,submit}=setup(t,true);await v4.enrollmentView();$('enrollDni').value='00000001';await $('lookupStudent').onclick();assert.ok($('field-Nomb_Alu').disabled);
  change('enrollProgram','PREUNIV');change('enrollMode','REGULAR');change('enrollCycle','REG');change('enrollShift','MANANA');change('enrollGroup','GR');await submit('enrollmentForm');
  assert.deepEqual(requests.find(r=>r.url==='/api/inscripciones').body.alumno,{DNI_Alu:'00000001'});assert.match($('modalRoot').textContent,/conserva su cuenta/);
});
test('gestión de pagos busca por DNI y confirma el medio seleccionado',async t=>{
  const {$,v4,submit,requests,w}=setup(t);await v4.paymentsView('00000001');assert.match($('paymentRows').textContent,/Confirmar pago/);assert.match($('paymentResults').textContent,/250/);assert.match(w.fmtDateTime('2026-10-25T01:00:00Z'),/24\/10/);
  await v4.paymentModal({Cod_Pago:'P1',Monto:250,ESTADO_PAGO_Cod_Estado:'PENDIENTE'},async()=>{});$('paymentValue').value='YAPE';await submit('confirmPayment');
  assert.deepEqual(requests.find(r=>r.url==='/api/pagos/P1/confirmar').body,{medio:'YAPE'});
});
test('puntaje por DNI consulta nombre, grupo y nota previa antes de permitir una corrección',async t=>{
  const {$,v4,submit,requests}=setup(t);v4.scoreModal('SIM1');assert.equal($('scoreFields').disabled,true);$('scoreDni').value='00000001';await $('scoreLookup').onclick();
  assert.match($('scoreStudent').textContent,/Alumno Ficticio.*Grupo A/);assert.equal($('scoreFields').disabled,false);assert.equal($('scoreValue').max,'100');assert.equal($('scoreValue').value,'80');assert.equal($('scoreReason').required,true);
  $('scoreValue').value='81';$('scoreReason').value='Corrección ficticia autorizada';await submit('scoreForm');assert.equal(requests.find(r=>r.url==='/api/simulacros/SIM1/resultados').body.Puntaje_total,81);
});
test('editor de horario conserva el grupo al editar y filtra docentes por curso',async t=>{
  const {$,v4,change,submit,requests}=setup(t);await v4.scheduleModal({Cod_Horario:'H1',_id:'id-h1',Grupo_Cod_Grupo:'GR',TIPO_BLOQUE_Cod_Tipo:'CLASE',Docente_Asignatura_CURSOS_Cod_Curso:'MAT',Docente_Asignatura_Docente_DNI_Doc:'00000003',Dia_Semana:1,Hr_Inicio:'07:00',Hr_Fin:'08:00',Activo:true});
  assert.equal($('scheduleGroup').value,'GR');assert.equal($('scheduleTeacher').value,'00000003');assert.match($('scheduleInfo').textContent,/Aula ficticia/);change('scheduleType','RECREO');assert.equal($('scheduleTeacher').disabled,true);await submit('scheduleForm');
  const saved=requests.find(r=>r.url==='/api/records/Horario/id-h1');assert.equal(saved.method,'PUT');assert.equal(saved.body.Docente_Asignatura_Docente_DNI_Doc,null);assert.equal(saved.body.Grupo_Cod_Grupo,'GR');
});
test('horario semanal muestra días, horas, docente, turno, aula y recreos',t=>{
  const {v4}=setup(t);const html=v4.weekly([{Dia_Semana:1,Hr_Inicio:'07:00',Hr_Fin:'08:00',TIPO_BLOQUE_Cod_Tipo:'CLASE',Nomb_Curso:'Matemática',Nom_Doc:'Docente Ficticio',Nomb_Grupo:'Grupo A',Nomb_Turno:'MANANA',Nomb_Aula:'Aula ficticia'},{Dia_Semana:1,Hr_Inicio:'08:00',Hr_Fin:'08:15',TIPO_BLOQUE_Cod_Tipo:'RECREO'}]);
  for(const word of ['Lunes','Domingo','07:00','Docente Ficticio','MANANA','Aula ficticia','Recreo','v4-week-mobile'])assert.ok(html.includes(word));
});
