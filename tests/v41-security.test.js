'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createNotifications,emailAddress,peruNumber}=require('../server/notifications');
const {protectedCode,matches,password}=require('../server/account-security');
test('códigos protegidos dependen de cuenta, propósito, nonce y secreto del servidor',()=>{
  const previous=process.env.JWT_SECRET;process.env.JWT_SECRET='secreto-local-de-pruebas-v41-de-mas-de-32-caracteres';
  try{
    const nonce='a'.repeat(32),hash=protectedCode('U1','RECUPERACION',nonce,'001234');assert.match(hash,/^[0-9a-f]{64}$/);assert.notEqual(hash,'001234');
    assert.ok(matches('U1',{PROPOSITO:'RECUPERACION',NONCE:nonce,CODIGO_HASH:hash},'001234'));
    assert.ok(!matches('U2',{PROPOSITO:'RECUPERACION',NONCE:nonce,CODIGO_HASH:hash},'001234'));
    assert.ok(!matches('U1',{PROPOSITO:'ACTIVACION',NONCE:nonce,CODIGO_HASH:hash},'001234'));
    assert.ok(!matches('U1',{PROPOSITO:'RECUPERACION',NONCE:nonce,CODIGO_HASH:'x'.repeat(64)},'001234'));
  }finally{if(previous===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=previous;}
});
test('contraseña personal exige confirmación coherente y evita truncamiento bcrypt',()=>{
  password('Una frase personal segura','Una frase personal segura','00000001');
  assert.throws(()=>password('00000001','00000001','00000001'));
  assert.throws(()=>password('Una frase personal segura','Una frase diferente','00000001'));
  assert.throws(()=>password('á'.repeat(37),'á'.repeat(37),'00000001'));
});
test('SMTP queda desactivado sin configuración completa y SMS solo ofrece interfaz',async()=>{
  const disabled=createNotifications({});assert.equal(disabled.emailConfigured,false);assert.equal(disabled.smsConfigured,false);await assert.rejects(disabled.sendEmail({to:'alumno@example.test',code:'001234',purpose:'RECUPERACION'}));
  assert.equal(createNotifications({EMAIL_PROVIDER:'smtp',SMTP_HOST:'smtp.example.test',SMTP_PORT:'25',SMTP_USER:'ficticio',SMTP_PASSWORD:'ficticio',EMAIL_FROM:'academia@example.test'}).emailConfigured,false);
  assert.equal(createNotifications({EMAIL_PROVIDER:'smtp',SMTP_HOST:'smtp.example.test',SMTP_PORT:'587',SMTP_USER:'ficticio',SMTP_PASSWORD:'ficticio',EMAIL_FROM:'academia@example.test'}).emailConfigured,true);
  assert.ok(emailAddress('alumno@example.test'));assert.ok(!emailAddress('alumno@example.test\r\nBcc:otra@example.test'));
  assert.equal(peruNumber('900000001'),'+51900000001');assert.throws(()=>peruNumber('+51900000001'));await assert.rejects(disabled.sendSMS({to:'+51900000001'}));
});
