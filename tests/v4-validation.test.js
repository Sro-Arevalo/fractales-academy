'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {validateFields,autoCode,validDate}=require('../server/validation');
const model=require('../server/model.json');
test('celulares de alumno, apoderado y docente: nueve dígitos o NULL opcional',()=>{
  for(const [table,column] of [['ALUMNO','Cel_Alu'],['ALUMNO','Cel_Apoderado'],['Docente','Cel_Doc']]){
    assert.equal(model[table].columns.find(c=>c.name===column).length,9);
    validateFields(model[table],{[column]:'900123456'});
    for(const value of ['90012345','9001234567','90012345a','900 23456','90012345 ','+90123456',900123456,''])assert.throws(()=>validateFields(model[table],{[column]:value}));
  }
  validateFields(model.ALUMNO,{Cel_Alu:null,Cel_Apoderado:null});assert.throws(()=>validateFields(model.Docente,{Cel_Doc:null}));
});
test('catálogos exigen códigos explícitos con formato y longitud válidos',()=>{
  for(const name of ['CURSOS','Aula','CARRERA','Grupo','Ciclo','Docente','Examen']){
    const m=model[name],c=m.columns.find(c=>c.pk);assert.equal(autoCode(m,c),false);
    assert.throws(()=>validateFields(m,{[c.name]:''}));assert.throws(()=>validateFields(m,{[c.name]:'x'.repeat(c.length+1)}));
  }
  validateFields(model.CURSOS,{Cod_Curso:'MAT-01'});assert.throws(()=>validateFields(model.CURSOS,{Cod_Curso:'MAT 01'}));
  for(const name of ['MATRICULA','Pago','Usuario','Nota_Examen'])assert.ok(autoCode(model[name],model[name].columns.find(c=>c.pk)));
});
test('fechas reales, horas y decimales respetan los tipos de SQL Server',()=>{
  assert.ok(validDate('2028-02-29'));assert.ok(!validDate('2027-02-29'));assert.ok(!validDate('2027-02-31'));
  validateFields(model.Nota_Examen,{Puntaje_total:99.99});
  for(const value of [-1,NaN,Infinity,1.234,1000000])assert.throws(()=>validateFields(model.Nota_Examen,{Puntaje_total:value}));
  for(const value of ['25:00','07:80','-1:30'])assert.throws(()=>validateFields(model.Horario,{Hr_Inicio:value}));
});
