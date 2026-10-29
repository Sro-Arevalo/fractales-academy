'use strict';
const crypto=require('node:crypto');
const bcrypt=require('bcryptjs');
const ops=require('./operations');
const {securityReady}=require('./security-schema');
const {createNotifications,emailAddress,peruNumber}=require('./notifications');
const {rule}=require('./rules');
const GENERIC='Si la cuenta tiene un contacto verificado y el servicio está disponible, recibirás un código. Si no llega, solicita ayuda a la administración.';
function secret(){if(!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32)throw Error('JWT_SECRET no configurado.');return process.env.JWT_SECRET;}
function protectedCode(user,purpose,nonce,code){return crypto.createHmac('sha256',secret()).update('fractales-v41-code\0'+user+'\0'+purpose+'\0'+nonce+'\0'+code).digest('hex');}
function matches(user,row,code){const expected=protectedCode(user,row.PROPOSITO,row.NONCE,code);return typeof row.CODIGO_HASH==='string'&&/^[0-9a-f]{64}$/.test(row.CODIGO_HASH)&&crypto.timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(row.CODIGO_HASH,'hex'));}
function password(value,confirmation,dni){
  if(typeof value!=='string'||value.length<12||Buffer.byteLength(value,'utf8')>72)throw rule('Usa al menos 12 caracteres y como máximo 72 bytes. Puedes elegir una frase fácil de recordar.');
  if(value===dni)throw rule('Tu nueva contraseña no puede ser tu DNI.');
  if(confirmation!==undefined&&value!==confirmation)throw rule('Las contraseñas no coinciden.');
}
function reason(value){if(typeof value!=='string'||value.trim().length<5||value.length>250)throw rule('Describe el motivo (5 a 250 caracteres).');return value.trim();}
function createAccountSecurity(notifications=createNotifications()){
  const pending=new Set();
  async function ready(tx){if(!await securityReady(tx))throw Object.assign(rule('Esta opción requiere la migración V4.1. Solicita ayuda a la administración.'),{status:503});}
  async function ensureUser(tx,id){
    await ops.query(tx,`IF NOT EXISTS(SELECT 1 FROM dbo.SEGURIDAD_USUARIO WITH (UPDLOCK,HOLDLOCK) WHERE ID_USUARIO_RESPONSABLE=@id)
      INSERT dbo.SEGURIDAD_USUARIO(ID_USUARIO_RESPONSABLE) VALUES (@id)`,{id});
  }
  async function revoke(tx,id,activation){
    await ensureUser(tx,id);
    const row=(await ops.query(tx,'UPDATE dbo.SEGURIDAD_USUARIO SET VERSION_SESION=VERSION_SESION+1,ACTIVACION_REQUERIDA=COALESCE(@activation,ACTIVACION_REQUERIDA) OUTPUT inserted.VERSION_SESION WHERE ID_USUARIO_RESPONSABLE=@id',{id,activation:activation??null})).recordset[0];
    await ops.query(tx,'UPDATE dbo.CODIGO_CUENTA SET CONSUMIDO=1,DESAFIO_HASH=NULL WHERE ID_USUARIO_RESPONSABLE=@id',{id});
    return row.VERSION_SESION;
  }
  async function issue(tx,user,purpose,channel,destination,code,minutes=10){
    await ops.query(tx,'UPDATE dbo.CODIGO_CUENTA SET CONSUMIDO=1,DESAFIO_HASH=NULL WHERE ID_USUARIO_RESPONSABLE=@id AND PROPOSITO=@purpose AND CONSUMIDO=0',{id:user.ID_USUARIO,purpose});
    const id=crypto.randomUUID(),nonce=crypto.randomBytes(16).toString('hex');
    await ops.query(tx,`INSERT dbo.CODIGO_CUENTA(ID,ID_USUARIO_RESPONSABLE,PROPOSITO,CANAL,DESTINO,NONCE,CODIGO_HASH,FECHA_VENCIMIENTO)
      VALUES (@codeId,@id,@purpose,@channel,@destination,@nonce,@hash,DATEADD(minute,@minutes,SYSUTCDATETIME()))`,{
      codeId:id,id:user.ID_USUARIO,purpose,channel,destination,nonce,hash:protectedCode(user.ID_USUARIO,purpose,nonce,code),minutes
    });return id;
  }
  async function withinLimit(tx,id,purpose){
    const row=(await ops.query(tx,`SELECT COUNT(*) AS cantidad,MAX(FECHA_CREACION) AS ultimo FROM dbo.CODIGO_CUENTA WITH (UPDLOCK,HOLDLOCK)
      WHERE ID_USUARIO_RESPONSABLE=@id AND PROPOSITO=@purpose AND FECHA_CREACION>DATEADD(hour,-1,SYSUTCDATETIME())`,{id,purpose})).recordset[0];
    return Number(row.cantidad)<3&&(!row.ultimo||Date.now()-new Date(row.ultimo).getTime()>=60000);
  }
  function dispatch(id,message,channel){
    const job=Promise.resolve().then(()=>channel==='EMAIL'?notifications.sendEmail(message):notifications.sendSMS({...message,to:peruNumber(message.to)}))
      .catch(async()=>{await ops.query(null,'UPDATE dbo.CODIGO_CUENTA SET CONSUMIDO=1,DESAFIO_HASH=NULL WHERE ID=@id',{id}).catch(()=>{});console.error('[Fractales cuentas] No se completó la entrega del código.');})
      .finally(()=>pending.delete(job));pending.add(job);
  }
  function identity(value){
    const input=typeof value==='string'?value.trim():'';
    if(emailAddress(input))return {email:input.toLowerCase(),dni:null};
    if(/^\d{8}$/.test(input))return {email:null,dni:input};
    throw rule('Ingresa tu correo registrado o un DNI de ocho dígitos.');
  }
  async function recoveryUser(tx,identifier,channel,projection){
    if(await require('./schema-v43').ready(tx)){
      const target=identity(identifier),select=projection==='u.*'?'u.*':`u.ID_USUARIO,u.ACTIVO,CASE WHEN u.ID_ROL='ADMIN' THEN u.CORREO_RECUPERACION ELSE c.DESTINO END AS DESTINO`;
      const rows=(await ops.query(tx,`SELECT TOP(2) ${select} FROM dbo.USUARIO u WITH (UPDLOCK,HOLDLOCK)
        LEFT JOIN dbo.ALUMNO a ON a.DNI_ALUMNO=u.DNI_ALUMNO LEFT JOIN dbo.ESTADO_ALUMNO es ON es.DNI_ALUMNO=a.DNI_ALUMNO
        LEFT JOIN dbo.CONTACTO_VERIFICADO c ON c.DNI_ALUMNO=a.DNI_ALUMNO AND c.TIPO=@channel AND c.ACTIVO=1
        WHERE u.ACTIVO=1 AND (
          (u.ID_ROL='ADMIN' AND @channel='EMAIL' AND @email IS NOT NULL AND LOWER(u.CORREO_RECUPERACION)=@email AND u.CORREO_VERIFICADO=1)
          OR (u.ID_ROL='ALUMNO' AND ISNULL(es.ACTIVO,1)=1 AND ((@dni IS NOT NULL AND a.DNI_ALUMNO=@dni) OR (@email IS NOT NULL AND LOWER(a.CORREO)=@email))
          AND c.DESTINO=CASE WHEN @channel='EMAIL' THEN a.CORREO ELSE a.CELULAR END)) ORDER BY u.ID_USUARIO`,{...target,channel})).recordset;
      return rows.length===1?rows[0]:null;
    }
    const users=(await ops.query(tx,`SELECT TOP(2) ${projection} FROM dbo.USUARIO u WITH (UPDLOCK,HOLDLOCK)
      JOIN dbo.ALUMNO a ON a.DNI_ALUMNO=u.DNI_ALUMNO LEFT JOIN dbo.ESTADO_ALUMNO es ON es.DNI_ALUMNO=a.DNI_ALUMNO
      JOIN dbo.CONTACTO_VERIFICADO c ON c.DNI_ALUMNO=a.DNI_ALUMNO
      WHERE ((@dni IS NOT NULL AND a.DNI_ALUMNO=@dni) OR (@email IS NOT NULL AND LOWER(a.CORREO)=@email))
      AND u.ID_ROL='ALUMNO' AND u.ACTIVO=1 AND ISNULL(es.ACTIVO,1)=1 AND c.TIPO=@channel AND c.ACTIVO=1
      AND c.DESTINO=CASE WHEN @channel='EMAIL' THEN a.CORREO ELSE a.CELULAR END ORDER BY u.ID_USUARIO`,{...identity(identifier),channel})).recordset;
    return users.length===1?users[0]:null;
  }
  async function requestRecovery(identifier,channel='EMAIL'){
    const configured=channel==='EMAIL'?notifications.emailConfigured:channel==='SMS'&&notifications.smsConfigured;
    identity(identifier);
    if(!configured||!await securityReady()||pending.size>=50)return {message:GENERIC,disponible:!!configured&&await securityReady()};
    const delivery=await ops.transaction(async tx=>{
      const user=await recoveryUser(tx,identifier,channel,'u.ID_USUARIO,u.ACTIVO,c.DESTINO');
      if(!user||!await withinLimit(tx,user.ID_USUARIO,'RECUPERACION'))return null;
      const code=String(crypto.randomInt(0,1000000)).padStart(6,'0');
      const id=await issue(tx,user,'RECUPERACION',channel,user.DESTINO,code);
      return {id,to:user.DESTINO,code,purpose:'RECUPERACION'};
    });
    if(delivery)dispatch(delivery.id,delivery,channel);
    return {message:GENERIC,disponible:true};
  }
  async function check(tx,user,purpose,code,channel){
    const row=(await ops.query(tx,`SELECT TOP(1) *,CASE WHEN FECHA_VENCIMIENTO>SYSUTCDATETIME() THEN 1 ELSE 0 END AS Vigente
      FROM dbo.CODIGO_CUENTA WITH (UPDLOCK,HOLDLOCK) WHERE ID_USUARIO_RESPONSABLE=@id AND PROPOSITO=@purpose AND CONSUMIDO=0 ORDER BY FECHA_CREACION DESC`,{id:user.ID_USUARIO,purpose})).recordset[0];
    if(!row)return null;
    if(!row.Vigente||row.INTENTOS>=5){await ops.query(tx,'UPDATE dbo.CODIGO_CUENTA SET CONSUMIDO=1 WHERE ID=@id',{id:row.ID});return null;}
    if((channel&&row.CANAL!==channel)||!matches(user.ID_USUARIO,row,code)){
      await ops.query(tx,'UPDATE dbo.CODIGO_CUENTA SET INTENTOS=INTENTOS+1,CONSUMIDO=CASE WHEN INTENTOS+1>=5 THEN 1 ELSE 0 END WHERE ID=@id',{id:row.ID});return null;
    }
    await ops.query(tx,'UPDATE dbo.CODIGO_CUENTA SET CONSUMIDO=1 WHERE ID=@id',{id:row.ID});return row;
  }
  async function completeRecovery(body){
    await ready();password(body?.nueva,body?.confirmacion,body?.dni);
    if(typeof body?.confirmacion!=='string')throw rule('Confirma tu nueva contraseña.');
    const identifier=body?.email||body?.dni;identity(identifier);
    if(typeof body?.codigo!=='string'||!/^\d{6}$/.test(body.codigo))throw rule('El código es inválido o ha expirado. Solicita uno nuevo.');
    const success=await ops.transaction(async tx=>{
      const user=await recoveryUser(tx,identifier,body.canal||'EMAIL','u.*');
      if(!user)return false;
      const code=await check(tx,user,'RECUPERACION',body.codigo,body.canal||'EMAIL');if(!code)return false;
      // El contacto debe seguir verificado y coincidir con el perfil al consumir el código.
      const valid=user.ID_ROL==='ADMIN'?(user.CORREO_VERIFICADO&&code.CANAL==='EMAIL'&&code.DESTINO===user.CORREO_RECUPERACION):(await ops.query(tx,`SELECT c.ID FROM dbo.CONTACTO_VERIFICADO c JOIN dbo.ALUMNO a ON a.DNI_ALUMNO=c.DNI_ALUMNO
        WHERE c.DNI_ALUMNO=@dni AND c.ACTIVO=1 AND c.TIPO=@channel AND c.DESTINO=@destination
        AND c.DESTINO=CASE WHEN c.TIPO='EMAIL' THEN a.CORREO ELSE a.CELULAR END`,{dni:user.DNI_ALUMNO,channel:code.CANAL,destination:code.DESTINO})).recordset[0];
      if(!valid)return false;
      password(body.nueva,body.confirmacion,user.DNI_ALUMNO);
      if(await bcrypt.compare(body.nueva,user.CLAVE_HASH))throw rule('Elige una contraseña diferente de la anterior.');
      await ops.query(tx,'UPDATE dbo.USUARIO SET CLAVE_HASH=@hash,DEBE_CAMBIAR_CLAVE=0 WHERE ID_USUARIO=@id',{id:user.ID_USUARIO,hash:await bcrypt.hash(body.nueva,12)});
      await revoke(tx,user.ID_USUARIO,false);
      await ops.audit(tx,user,'USUARIO',user.ID_USUARIO,'RECUPERAR_ACCESO',null,{canal:code.CANAL},'Código de contacto verificado');return true;
    });
    if(!success)throw rule('El código es inválido o ha expirado. Solicita uno nuevo.');return {ok:true,message:'Contraseña actualizada. Ingresa nuevamente con tu nueva contraseña.'};
  }
  async function prepareActivation(tx,user){
    await ready(tx);await ensureUser(tx,user.ID_USUARIO);
    const code=crypto.randomBytes(12).toString('base64url');
    await ops.query(tx,'UPDATE dbo.SEGURIDAD_USUARIO SET ACTIVACION_REQUERIDA=1 WHERE ID_USUARIO_RESPONSABLE=@id',{id:user.ID_USUARIO});
    await issue(tx,user,'ACTIVACION','DIRECTO',null,code,24*60);return code;
  }
  async function activationProof(user,code){
    if(typeof code!=='string'||code.length>100)return null;
    return ops.transaction(async tx=>{
      const valid=await check(tx,user,'ACTIVACION',code,'DIRECTO');if(!valid)return null;
      const nonce=crypto.randomBytes(24).toString('base64url');
      await ops.query(tx,`UPDATE dbo.CODIGO_CUENTA SET DESAFIO_HASH=@hash,FECHA_VENCIMIENTO=CASE WHEN FECHA_VENCIMIENTO<DATEADD(minute,10,SYSUTCDATETIME()) THEN FECHA_VENCIMIENTO ELSE DATEADD(minute,10,SYSUTCDATETIME()) END WHERE ID=@id`,{id:valid.ID,hash:crypto.createHash('sha256').update(nonce).digest('hex')});
      return {id:valid.ID,nonce};
    });
  }
  async function changePassword(user,auth,body){
    password(body?.nueva,body?.confirmacion,user.DNI_ALUMNO);
    return ops.transaction(async tx=>{
      const current=(await ops.query(tx,'SELECT CLAVE_HASH,DEBE_CAMBIAR_CLAVE FROM dbo.USUARIO WITH (UPDLOCK,HOLDLOCK) WHERE ID_USUARIO=@id AND ACTIVO=1',{id:user.ID_USUARIO})).recordset[0];
      if(!current)throw rule('La cuenta no está disponible.');
      if(await securityReady(tx)){
        const live=(await ops.query(tx,'SELECT VERSION_SESION FROM dbo.SEGURIDAD_USUARIO WITH (UPDLOCK,HOLDLOCK) WHERE ID_USUARIO_RESPONSABLE=@id',{id:user.ID_USUARIO})).recordset[0];
        if((live?.VERSION_SESION||0)!==(auth.version||0))throw Object.assign(rule('La sesión cambió. Inicia sesión nuevamente.'),{status:401});
      }
      const initial=current.DEBE_CAMBIAR_CLAVE&&['password_change','onboarding'].includes(auth.scope);
      if(!initial&&(typeof body.actual!=='string'||!await bcrypt.compare(body.actual,current.CLAVE_HASH)))throw rule('La contraseña actual no es correcta.');
      if(await bcrypt.compare(body.nueva,current.CLAVE_HASH))throw rule('Elige una contraseña diferente de la anterior.');
      if(user.ACTIVACION_REQUERIDA){
        if(auth.scope!=='onboarding'||!auth.activation)throw rule('Completa la verificación de activación.');
        const proof=(await ops.query(tx,`SELECT ID FROM dbo.CODIGO_CUENTA WITH (UPDLOCK,HOLDLOCK) WHERE ID=@codeId AND ID_USUARIO_RESPONSABLE=@id AND PROPOSITO='ACTIVACION' AND CONSUMIDO=1 AND FECHA_VENCIMIENTO>SYSUTCDATETIME() AND DESAFIO_HASH=@hash`,{codeId:auth.activation.id,id:user.ID_USUARIO,hash:crypto.createHash('sha256').update(auth.activation.nonce).digest('hex')})).recordset[0];
        if(!proof)throw rule('La activación expiró. Solicita un nuevo código al administrador.');
      }
      await ops.query(tx,'UPDATE dbo.USUARIO SET CLAVE_HASH=@hash,DEBE_CAMBIAR_CLAVE=0 WHERE ID_USUARIO=@id',{id:user.ID_USUARIO,hash:await bcrypt.hash(body.nueva,12)});
      const version=await securityReady(tx)?await revoke(tx,user.ID_USUARIO,false):0;
      await ops.audit(tx,user,'USUARIO',user.ID_USUARIO,'CAMBIAR_CLAVE',null,{primerIngreso:!!initial},null);
      return {...user,DEBE_CAMBIAR_CLAVE:false,ACTIVACION_REQUERIDA:false,VERSION_SESION:version};
    });
  }
  async function administrativeRecovery(dni,body,actor){
    await ready();if(body?.identidadConfirmada!==true)throw rule('Confirma que verificaste la identidad del estudiante.');const motive=reason(body?.motivo);
    return ops.transaction(async tx=>{
      const user=(await ops.query(tx,"SELECT ID_USUARIO,NOMBRE_USUARIO,ACTIVO FROM dbo.USUARIO WITH (UPDLOCK,HOLDLOCK) WHERE DNI_ALUMNO=@dni AND ID_ROL='ALUMNO'",{dni})).recordset[0];
      if(!user)throw rule('No se encontró una cuenta de alumno.');
      const temporary=crypto.randomBytes(18).toString('base64url');
      await ops.query(tx,'UPDATE dbo.USUARIO SET CLAVE_HASH=@hash,DEBE_CAMBIAR_CLAVE=1 WHERE ID_USUARIO=@id',{id:user.ID_USUARIO,hash:await bcrypt.hash(temporary,12)});
      await revoke(tx,user.ID_USUARIO,false);
      await ops.audit(tx,actor,'USUARIO',user.ID_USUARIO,'RECUPERACION_ADMIN',null,{DNI_ALUMNO:dni},motive);
      return {usuario:user.NOMBRE_USUARIO,claveTemporal:temporary,cuentaActiva:!!user.ACTIVO};
    });
  }
  async function applyContact(tx,user,channel,destination,actor,method,motive){
    await ops.query(tx,channel==='EMAIL'?'UPDATE dbo.ALUMNO SET CORREO=@destination WHERE DNI_ALUMNO=@dni':'UPDATE dbo.ALUMNO SET CELULAR=@destination WHERE DNI_ALUMNO=@dni',{dni:user.DNI_ALUMNO,destination});
    await ops.query(tx,'UPDATE dbo.CONTACTO_VERIFICADO SET ACTIVO=0 WHERE DNI_ALUMNO=@dni AND TIPO=@channel AND ACTIVO=1',{dni:user.DNI_ALUMNO,channel});
    await ops.query(tx,`INSERT dbo.CONTACTO_VERIFICADO(DNI_ALUMNO,TIPO,DESTINO,METODO_VERIFICACION,ID_USUARIO_RESPONSABLE) VALUES (@dni,@channel,@destination,@method,@actor)`,{dni:user.DNI_ALUMNO,channel,destination,method,actor:actor.ID_USUARIO});
    await ops.audit(tx,actor,'CONTACTO',user.DNI_ALUMNO,'VERIFICAR_CONTACTO',null,{tipo:channel,destino:destination,metodo:method},motive);
  }
  async function requestContact(user,body){
    await ready();const {tipo,destino,actual}=body||{};
    if(!['EMAIL','SMS'].includes(tipo)||!(tipo==='EMAIL'?emailAddress(destino):typeof destino==='string'&&/^\d{9}$/.test(destino)))throw rule('Ingresa un correo válido o un celular de nueve dígitos.');
    const current=(await ops.query(null,'SELECT CLAVE_HASH FROM dbo.USUARIO WHERE ID_USUARIO=@id',{id:user.ID_USUARIO})).recordset[0];
    if(typeof actual!=='string'||!current||!await bcrypt.compare(actual,current.CLAVE_HASH))throw rule('Confirma tu contraseña actual para actualizar el contacto.');
    const configured=tipo==='EMAIL'?notifications.emailConfigured:notifications.smsConfigured;
    if(pending.size>=50)throw rule('Hay solicitudes en curso. Intenta en unos minutos.');
    const delivery=await ops.transaction(async tx=>{
      const live=(await ops.query(tx,'SELECT ID_USUARIO,CLAVE_HASH FROM dbo.USUARIO WITH (UPDLOCK,HOLDLOCK) WHERE ID_USUARIO=@id AND ACTIVO=1',{id:user.ID_USUARIO})).recordset[0];
      if(!live||live.CLAVE_HASH!==current.CLAVE_HASH)throw Object.assign(rule('La cuenta cambió. Inicia sesión nuevamente.'),{status:401});
      const count=(await ops.query(tx,"SELECT COUNT(*) n FROM dbo.SOLICITUD_CONTACTO WHERE DNI_ALUMNO=@dni AND FECHA_CREACION>DATEADD(hour,-1,SYSUTCDATETIME())",{dni:user.DNI_ALUMNO})).recordset[0].n;
      if(count>=3||configured&&!await withinLimit(tx,user.ID_USUARIO,'VERIFICAR_CONTACTO'))throw rule('Espera antes de solicitar otro cambio de contacto.');
      await ops.query(tx,"UPDATE dbo.SOLICITUD_CONTACTO SET ESTADO='REEMPLAZADA' WHERE DNI_ALUMNO=@dni AND ESTADO IN ('PENDIENTE','PENDIENTE_ADMIN')",{dni:user.DNI_ALUMNO});
      const code=String(crypto.randomInt(0,1000000)).padStart(6,'0');
      const codeId=configured?await issue(tx,user,'VERIFICAR_CONTACTO',tipo,destino,code):null;
      const id=crypto.randomUUID();
      await ops.query(tx,`INSERT dbo.SOLICITUD_CONTACTO(ID,DNI_ALUMNO,TIPO,DESTINO,ESTADO,ID_CODIGO) VALUES (@id,@dni,@type,@destination,@state,@code)`,{id,dni:user.DNI_ALUMNO,type:tipo,destination:destino,state:configured?'PENDIENTE':'PENDIENTE_ADMIN',code:codeId});
      await ops.audit(tx,user,'CONTACTO',user.DNI_ALUMNO,'SOLICITAR_CAMBIO',null,{tipo,solicitud:id},'Solicitud del estudiante');
      return {id:codeId,to:destino,code,purpose:'VERIFICAR_CONTACTO'};
    });
    if(configured)dispatch(delivery.id,delivery,tipo);
    return {ok:true,requiereCodigo:!!configured,message:configured?'Solicitud registrada. Recibirás un código si se completa la entrega. Vence en 10 minutos.':'Solicitud registrada para revisión de administración. No se envió ningún código.'};
  }
  async function confirmContact(user,code){
    await ready();if(typeof code!=='string'||!/^\d{6}$/.test(code))throw rule('Código inválido o expirado.');
    const success=await ops.transaction(async tx=>{
      const valid=await check(tx,user,'VERIFICAR_CONTACTO',code);if(!valid)return false;
      const request=(await ops.query(tx,"SELECT ID FROM dbo.SOLICITUD_CONTACTO WITH (UPDLOCK,HOLDLOCK) WHERE ID_CODIGO=@id AND DNI_ALUMNO=@dni AND ESTADO='PENDIENTE'",{id:valid.ID,dni:user.DNI_ALUMNO})).recordset[0];
      if(!request)return false;
      await applyContact(tx,user,valid.CANAL,valid.DESTINO,user,'CODIGO','Código recibido en el contacto solicitado');
      await ops.query(tx,"UPDATE dbo.SOLICITUD_CONTACTO SET ESTADO='VERIFICADA',FECHA_RESOLUCION=SYSUTCDATETIME(),ID_USUARIO_RESPONSABLE=@actor WHERE ID=@id",{id:request.ID,actor:user.ID_USUARIO});return true;
    });if(!success)throw rule('Código inválido o expirado.');return {ok:true};
  }
  async function requestAdminEmail(user,body){
    await require('./schema-v43').required();
    if(user.ID_ROL!=='ADMIN'||!emailAddress(body?.email))throw rule('Ingresa un correo electrónico válido.');
    if(!notifications.emailConfigured)throw Object.assign(rule('Configura el servicio de correo antes de verificar tu dirección.'),{status:503});
    if(pending.size>=50)throw rule('Hay solicitudes en curso. Intenta en unos minutos.');
    const delivery=await ops.transaction(async tx=>{
      const current=(await ops.query(tx,"SELECT ID_USUARIO,CLAVE_HASH FROM dbo.USUARIO WITH (UPDLOCK,HOLDLOCK) WHERE ID_USUARIO=@id AND ID_ROL='ADMIN' AND ACTIVO=1",{id:user.ID_USUARIO})).recordset[0];
      if(!current||typeof body.actual!=='string'||!await bcrypt.compare(body.actual,current.CLAVE_HASH))throw rule('Confirma tu contraseña actual.');
      if(!await withinLimit(tx,user.ID_USUARIO,'VERIFICAR_CONTACTO'))throw rule('Espera antes de solicitar otro código.');
      const code=String(crypto.randomInt(0,1000000)).padStart(6,'0'),destination=body.email.trim().toLowerCase();
      const id=await issue(tx,user,'VERIFICAR_CONTACTO','EMAIL',destination,code);
      return {id,to:destination,code,purpose:'VERIFICAR_CONTACTO'};
    });dispatch(delivery.id,delivery,'EMAIL');return {ok:true,message:'Solicitud registrada. Introduce el código recibido para verificar tu correo.'};
  }
  async function confirmAdminEmail(user,code){
    await require('./schema-v43').required();if(user.ID_ROL!=='ADMIN'||typeof code!=='string'||!/^\d{6}$/.test(code))throw rule('Código inválido o expirado.');
    const success=await ops.transaction(async tx=>{
      const current=(await ops.query(tx,"SELECT ID_USUARIO,CORREO_RECUPERACION FROM dbo.USUARIO WITH (UPDLOCK,HOLDLOCK) WHERE ID_USUARIO=@id AND ID_ROL='ADMIN' AND ACTIVO=1",{id:user.ID_USUARIO})).recordset[0];
      if(!current)return false;const valid=await check(tx,user,'VERIFICAR_CONTACTO',code,'EMAIL');if(!valid)return false;
      await ops.query(tx,'UPDATE dbo.USUARIO SET CORREO_RECUPERACION=@email,CORREO_VERIFICADO=1 WHERE ID_USUARIO=@id',{email:valid.DESTINO,id:user.ID_USUARIO});
      await ops.audit(tx,user,'USUARIO',user.ID_USUARIO,'VERIFICAR_CORREO',null,{correo:valid.DESTINO},'Control del correo mediante código temporal');return true;
    });if(!success)throw rule('Código inválido o expirado.');return {ok:true};
  }
  async function resolveContact(id,body,actor){
    await ready();const motive=reason(body?.motivo);
    if(typeof body?.aprobar!=='boolean'||body.aprobar&&body.identidadConfirmada!==true)throw rule('Confirma la identidad y el control del contacto antes de aprobarlo.');
    return ops.transaction(async tx=>{
      const request=(await ops.query(tx,"SELECT * FROM dbo.SOLICITUD_CONTACTO WITH (UPDLOCK,HOLDLOCK) WHERE ID=@id AND ESTADO IN ('PENDIENTE','PENDIENTE_ADMIN')",{id})).recordset[0];
      if(!request)throw rule('La solicitud no está pendiente.');
      if(body.aprobar)await applyContact(tx,{DNI_ALUMNO:request.DNI_ALUMNO},request.TIPO,request.DESTINO,actor,'PRESENCIAL',motive);
      if(!body.aprobar)await ops.audit(tx,actor,'CONTACTO',request.DNI_ALUMNO,'RECHAZAR_CONTACTO',null,{solicitud:id},motive);
      await ops.query(tx,'UPDATE dbo.SOLICITUD_CONTACTO SET ESTADO=@state,FECHA_RESOLUCION=SYSUTCDATETIME(),ID_USUARIO_RESPONSABLE=@actor,MOTIVO=@motive WHERE ID=@id',{id,state:body.aprobar?'APROBADA':'RECHAZADA',actor:actor.ID_USUARIO,motive});
      if(request.ID_CODIGO)await ops.query(tx,'UPDATE dbo.CODIGO_CUENTA SET CONSUMIDO=1 WHERE ID=@id',{id:request.ID_CODIGO});return {ok:true};
    });
  }
  return {notifications,requestRecovery,completeRecovery,prepareActivation,activationProof,changePassword,administrativeRecovery,requestContact,confirmContact,requestAdminEmail,confirmAdminEmail,resolveContact,revoke,ready,flush:()=>Promise.all([...pending])};
}
module.exports={createAccountSecurity,password,reason,protectedCode,matches,GENERIC};
