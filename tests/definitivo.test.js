'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const latest=read('sql/00_REFERENCIA_SQL_SERVER_RECIBIDO.sql');
const azure=read('sql/01_AZURE_BASE_NUEVA_25_TABLAS.sql');
const migrate=read('sql/03_ACTUALIZAR_BASE_EXISTENTE.sql');
const triggers=['TR_Pago_Mes_Valido','TR_Horario_Sin_Cruces','TR_Nota_Examen_Puntaje','TR_Matricula_CupoMaximo'];
const indexes=['UX_Usuario_UnicaCuentaAlumno','UX_Pago_ConceptoUnicoAlumno','UX_Pago_MensualidadMatricula'];
const schemaParts=s=>[...s.matchAll(/(?:CREATE TABLE \S+ \([\s\S]*?\);|ALTER TABLE \S+ ADD CONSTRAINT \S+\s+FOREIGN KEY[\s\S]*?;)/g)].map(m=>m[0]);
test('el script Azure contiene exactamente las tablas y FK de la version recibida',()=>{
  assert.equal(schemaParts(azure).length,52);
  assert.deepEqual(schemaParts(azure),schemaParts(latest));
  assert.equal((azure.match(/CREATE TABLE /g)||[]).length,25);
  assert.equal((azure.match(/ALTER TABLE .*ADD CONSTRAINT /g)||[]).length,27);
});
test('Azure usa base precreada: no ejecuta USE master ni CREATE DATABASE',()=>{
  assert.doesNotMatch(azure,/\bUSE\s*\[?master\]?\s*;/i);
  assert.doesNotMatch(azure,/\bCREATE DATABASE\b/i);
  assert.match(azure,/IF EXISTS \(SELECT 1 FROM sys\.tables/);
});
test('version definitiva incorpora cuatro triggers y tres indices nuevos',()=>{
  for(const t of triggers){assert.match(azure,new RegExp('CREATE OR ALTER TRIGGER '+t));assert.match(migrate,new RegExp('CREATE OR ALTER TRIGGER '+t));}
  for(const x of indexes){assert.match(azure,new RegExp('CREATE UNIQUE INDEX '+x));assert.match(migrate,new RegExp('CREATE UNIQUE INDEX '+x));}
});
test('migrador de base existente no borra tablas ni registros y valida duplicados',()=>{
  assert.doesNotMatch(migrate,/\b(?:DROP TABLE|TRUNCATE TABLE|DELETE FROM)\b/i);
  assert.match(migrate,/HAVING COUNT\(\*\)>1/);
  assert.match(migrate,/CREATE UNIQUE INDEX/);
});
test('API comunica errores de triggers con mensajes comprensibles',()=>{
  const source=read('server/index.js');
  assert.match(source,/code>=51001&&code<=51005/);
});
