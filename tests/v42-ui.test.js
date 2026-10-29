'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),model=require('../server/model.json');
function setup(t,{blocked=false}={}){
  const dom=new JSDOM(fs.readFileSync(path.join(root,'public/index.html'),'utf8'),{url:'http://localhost:3001',runScripts:'outside-only'});t.after(()=>dom.window.close());
  const w=dom.window,calls=[],$=id=>w.document.getElementById(id);
  const row={ID_USUARIO:'FICTICIO',NOMBRE_USUARIO:'Cuenta Ficticia',ID_ROL:'ADMIN',ACTIVO:true,_id:Buffer.from(JSON.stringify(['FICTICIO'])).toString('base64url')};
  w.fetch=async(url,request={})=>{calls.push({url,...request});let data={ok:true,rows:[]};
    if(url==='/api/dashboard')data={alumnos:7,matriculas:4,grupos:2,pendientes:3,pagosRegistrados:5,ciclosActivos:1,ingresos:250,recent:[],exams:[]};
    else if(url.endsWith('/actions'))data={dependencias:blocked?[{nombre:'Historial de operaciones',cantidad:2}]:[],acciones:[{id:'eliminar',label:'Eliminar definitivamente',enabled:!blocked,explanation:blocked?'El historial debe conservarse.':'La eliminación es irreversible.'},{id:'desactivar',label:'Desactivar',enabled:true,explanation:'Se conserva el historial.'}],explicacion:'Revisa este registro antes de continuar.'};
    else if(url.startsWith('/api/records/USUARIO?'))data={rows:[row],count:1,pageSize:15};
    else if(url==='/api/student/overview')data={profile:{DNI_ALUMNO:'42000001',NOMBRE_COMPLETO:'María Ficticia'},groups:[],notes:[],payments:[],exams:[],schedule:[{DIA_SEMANA:1,HORA_INICIO:'08:00',HORA_FIN:'09:00',ID_TIPO_BLOQUE:'CLASE',NOMBRE_CURSO:'Matemática',NOMBRE_HORARIO:'HORARIO_ACADEMICO Ficticio',NOMBRE_TURNO:'Mañana',NOMBRE_AULA:'AULA Ficticia'}]};
    return {ok:true,status:200,json:async()=>data};
  };
  const ctx=dom.getInternalVMContext();for(const file of ['app.js','v4.js','v41.js','v45.js'])vm.runInContext(fs.readFileSync(path.join(root,'public',file),'utf8'),ctx);w.document.removeEventListener('DOMContentLoaded',w.boot);
  const state=vm.runInContext('state',ctx);state.modules=structuredClone(model);state.user={rol:'ADMIN',nombre:'Admin Ficticio',cambiar:false};state.page='USUARIO';
  return {w,$,calls,state,row,v41:vm.runInContext('V41',ctx)};
}
test('V4.2 integra imágenes locales y conserva indicadores reales sin estadísticas decorativas',async t=>{
  const {$,v41}=setup(t);await v41.dashboard();assert.ok($('content').querySelector('.v42-hero-media img[src="/assets/aula-fractales.webp"]'));assert.match($('content').textContent,/7/);assert.match($('content').textContent,/Todavía no hay inscripciones/);
  assert.equal($('content').querySelectorAll('.v41-metric').length,6);assert.equal($('content').querySelectorAll('[data-go="inscripcion"]').length,2);
});
test('V4.5 separa papelera de eliminación definitiva y exige confirmación',async t=>{
  const {$,v41,row,calls}=setup(t);await v41.manage(model.USUARIO,row);
  assert.equal($('modalRoot').querySelector('[data-record-action="eliminar"]'),null);$('modalRoot').querySelector('[data-record-action="desactivar"]').click();assert.equal($('recordActionForm').checkValidity(),false);$('recordActionCancel').click();assert.equal($('recordActionForm').hidden,true);$('sendTrash').click();assert.equal($('v45Confirm').checkValidity(),false);assert.equal(calls.filter(c=>c.method==='DELETE').length,0);
});
test('V4.2 oculta eliminación rechazada y explica la conservación del historial',async t=>{
  const {$,v41,row}=setup(t,{blocked:true});await v41.manage(model.USUARIO,row);assert.equal($('modalRoot').querySelector('[data-record-action="eliminar"]'),null);assert.match($('modalRoot').textContent,/historial debe conservarse/);assert.ok($('modalRoot').querySelector('[data-record-action="desactivar"]'));
});
test('V4.2 intranet conserva nombre, horario y leyenda sin introducir resultados simulados',async t=>{
  const {$,v41,state}=setup(t);state.user.rol='ALUMNO';await v41.studentView('student-schedule');assert.match($('content').textContent,/María/);assert.match($('content').textContent,/Matemática/);assert.ok($('content').querySelector('.v42-student-image img'));assert.equal($('content').querySelectorAll('.v42-schedule-legend span').length,2);assert.ok($('content').querySelector('.v4-week-mobile'));assert.equal($('content').querySelector('.v41-result'),null);
});
