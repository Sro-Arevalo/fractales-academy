'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const model=require('../server/model.json');
const root=path.join(__dirname,'..');
test('se preservan 25 tablas y 27 relaciones',()=>{
  assert.equal(Object.keys(model).length,25);
  assert.equal(Object.values(model).reduce((n,m)=>n+m.fks.length,0),27);
});
test('todas las tablas tienen PK y los destinos de relaciones existen',()=>{
  for(const m of Object.values(model)){
    assert.ok(m.pk.length>0,`${m.name} sin PK`);
    for(const k of m.pk)assert.ok(m.columns.some(c=>c.name===k));
    for(const f of m.fks){assert.ok(model[f.table],`${m.name}->${f.table}`);for(const k of f.columns)assert.ok(m.columns.some(c=>c.name===k));}
  }
});
test('los DNI conservan VARCHAR(8) como claves primarias',()=>{
  for(const [table,col] of [['ALUMNO','DNI_Alu'],['Docente','DNI_Doc']]) {
    const c=model[table].columns.find(x=>x.name===col);
    assert.equal(c.type,'varchar');assert.equal(c.length,8);assert.ok(c.pk);
  }
});
test('el material gráfico original está disponible',()=>{
  for(const asset of ['logo-original.png','banner-fractales.png']) assert.ok(fs.statSync(path.join(root,'public','assets',asset)).size>10000);
});
test('la API nunca expone el hash en las columnas de la interfaz',()=>{
  const cols=model.Usuario.columns.map(c=>c.name);
  assert.ok(cols.includes('Clave_Hash'));
  const script=fs.readFileSync(path.join(root,'server','api.js'),'utf8');
  assert.match(script,/function projection\(m\)\{return m.columns.filter\(c=>c.name!=='Clave_Hash'\)/);
});
