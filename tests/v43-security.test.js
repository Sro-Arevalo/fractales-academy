'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createNotifications}=require('../server/notifications');
test('correo simulado funciona únicamente en desarrollo/pruebas y no utiliza SMTP',async()=>{
  const provider=createNotifications({NODE_ENV:'test',EMAIL_PROVIDER:'local'});assert.equal(provider.emailConfigured,true);assert.equal(provider.local,true);
  await provider.sendEmail({to:'alumno@example.test',code:'001234',purpose:'RECUPERACION'});assert.equal(provider.inbox.length,1);assert.equal(provider.inbox[0].code,'001234');
  assert.throws(()=>createNotifications({NODE_ENV:'production',EMAIL_PROVIDER:'local'}),/prohibido/);
  assert.equal(createNotifications({EMAIL_PROVIDER:'local'}).emailConfigured,false);
});
test('bandeja simulada limita su memoria y rechaza destinos inválidos',async()=>{
  const provider=createNotifications({NODE_ENV:'development',EMAIL_PROVIDER:'local'});
  for(let i=0;i<60;i++)await provider.sendEmail({to:'alumno@example.test',code:String(i).padStart(6,'0'),purpose:'RECUPERACION'});
  assert.equal(provider.inbox.length,50);await assert.rejects(provider.sendEmail({to:'invalido',code:'001234'}));
});
