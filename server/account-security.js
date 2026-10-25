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
function matches(user,row,code){const expected=protectedCode(user,row.Proposito,row.Nonce,code);return typeof row.Codigo_Hash==='string'&&/^[0-9a-f]{64}$/.test(row.Codigo_Hash)&&crypto.timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(row.Codigo_Hash,'hex'));}
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
    await ops.query(tx,`IF NOT EXISTS(SELECT 1 FROM dbo.Usuario_Seguridad_V41 WITH (UPDLOCK,HOLDLOCK) WHERE Usuario_Cod_Usuario=@id)
      INSERT dbo.Usuario_Seguridad_V41(Usuario_Cod_Usuario) VALUES (@id)`,{id});
  }
  async function revoke(tx,id,activation){
    await ensureUser(tx,id);
    const row=(await ops.query(tx,'UPDATE dbo.Usuario_Seguridad_V41 SET Version_Sesion=Version_Sesion+1,Activacion_Requerida=COALESCE(@activation,Activacion_Requerida) OUTPUT inserted.Version_Sesion WHERE Usuario_Cod_Usuario=@id',{id,activation:activation??null})).recordset[0];
    await ops.query(tx,'UPDATE dbo.Cuenta_Codigo_V41 SET Consumido=1,Desafio_Hash=NULL WHERE Usuario_Cod_Usuario=@id',{id});
    return row.Version_Sesion;
  }
  async function issue(tx,user,purpose,channel,destination,code,minutes=10){
    await ops.query(tx,'UPDATE dbo.Cuenta_Codigo_V41 SET Consumido=1,Desafio_Hash=NULL WHERE Usuario_Cod_Usuario=@id AND Proposito=@purpose AND Consumido=0',{id:user.Cod_Usuario,purpose});
    const id=crypto.randomUUID(),nonce=crypto.randomBytes(16).toString('hex');
    await ops.query(tx,`INSERT dbo.Cuenta_Codigo_V41(Id,Usuario_Cod_Usuario,Proposito,Canal,Destino,Nonce,Codigo_Hash,Expira)
      VALUES (@codeId,@id,@purpose,@channel,@destination,@nonce,@hash,DATEADD(minute,@minutes,SYSUTCDATETIME()))`,{
      codeId:id,id:user.Cod_Usuario,purpose,channel,destination,nonce,hash:protectedCode(user.Cod_Usuario,purpose,nonce,code),minutes
    });return id;
  }
  async function withinLimit(tx,id,purpose){
    const row=(await ops.query(tx,`SELECT COUNT(*) AS cantidad,MAX(Creado) AS ultimo FROM dbo.Cuenta_Codigo_V41 WITH (UPDLOCK,HOLDLOCK)
      WHERE Usuario_Cod_Usuario=@id AND Proposito=@purpose AND Creado>DATEADD(hour,-1,SYSUTCDATETIME())`,{id,purpose})).recordset[0];
    return Number(row.cantidad)<3&&(!row.ultimo||Date.now()-new Date(row.ultimo).getTime()>=60000);
  }
  function dispatch(id,message,channel){
    const job=Promise.resolve().then(()=>channel==='EMAIL'?notifications.sendEmail(message):notifications.sendSMS({...message,to:peruNumber(message.to)}))
      .catch(async()=>{await ops.query(null,'UPDATE dbo.Cuenta_Codigo_V41 SET Consumido=1,Desafio_Hash=NULL WHERE Id=@id',{id}).catch(()=>{});console.error('[Fractales cuentas] No se completó la entrega del código.');})
      .finally(()=>pending.delete(job));pending.add(job);
  }
  async function requestRecovery(dni,channel='EMAIL'){
    const configured=channel==='EMAIL'?notifications.emailConfigured:channel==='SMS'&&notifications.smsConfigured;
    if(!/^\d{8}$/.test(dni||''))throw rule('Ingresa un DNI de ocho dígitos.');
    if(!configured||!await securityReady()||pending.size>=50)return {message:GENERIC,disponible:!!configured&&await securityReady()};
    const delivery=await ops.transaction(async tx=>{
      const user=(await ops.query(tx,`SELECT u.Cod_Usuario,u.Activo,c.Destino FROM dbo.Usuario u WITH (UPDLOCK,HOLDLOCK)
        JOIN dbo.ALUMNO a ON a.DNI_Alu=u.ALUMNO_DNI_Alu JOIN dbo.Contacto_Verificado_V41 c ON c.ALUMNO_DNI_Alu=a.DNI_Alu
        WHERE u.ALUMNO_DNI_Alu=@dni AND u.ROL_Cod_Rol='ALUMNO' AND u.Activo=1 AND c.Tipo=@channel AND c.Activo=1
        AND c.Destino=CASE WHEN @channel='EMAIL' THEN a.Correo_Alu ELSE a.Cel_Alu END`,{dni,channel})).recordset[0];
      if(!user||!await withinLimit(tx,user.Cod_Usuario,'RECUPERACION'))return null;
      const code=String(crypto.randomInt(0,1000000)).padStart(6,'0');
      const id=await issue(tx,user,'RECUPERACION',channel,user.Destino,code);
      return {id,to:user.Destino,code,purpose:'RECUPERACION'};
    });
    if(delivery)dispatch(delivery.id,delivery,channel);
    return {message:GENERIC,disponible:true};
  }
  async function check(tx,user,purpose,code,channel){
    const row=(await ops.query(tx,`SELECT TOP(1) *,CASE WHEN Expira>SYSUTCDATETIME() THEN 1 ELSE 0 END AS Vigente
      FROM dbo.Cuenta_Codigo_V41 WITH (UPDLOCK,HOLDLOCK) WHERE Usuario_Cod_Usuario=@id AND Proposito=@purpose AND Consumido=0 ORDER BY Creado DESC`,{id:user.Cod_Usuario,purpose})).recordset[0];
    if(!row)return null;
    if(!row.Vigente||row.Intentos>=5){await ops.query(tx,'UPDATE dbo.Cuenta_Codigo_V41 SET Consumido=1 WHERE Id=@id',{id:row.Id});return null;}
    if((channel&&row.Canal!==channel)||!matches(user.Cod_Usuario,row,code)){
      await ops.query(tx,'UPDATE dbo.Cuenta_Codigo_V41 SET Intentos=Intentos+1,Consumido=CASE WHEN Intentos+1>=5 THEN 1 ELSE 0 END WHERE Id=@id',{id:row.Id});return null;
    }
    await ops.query(tx,'UPDATE dbo.Cuenta_Codigo_V41 SET Consumido=1 WHERE Id=@id',{id:row.Id});return row;
  }
  async function completeRecovery(body){
    await ready();password(body?.nueva,body?.confirmacion,body?.dni);
    if(typeof body?.confirmacion!=='string')throw rule('Confirma tu nueva contraseña.');
    if(!/^\d{8}$/.test(body?.dni||'')||typeof body?.codigo!=='string'||!/^\d{6}$/.test(body.codigo))throw rule('El código es inválido o ha expirado. Solicita uno nuevo.');
    const success=await ops.transaction(async tx=>{
      const user=(await ops.query(tx,"SELECT * FROM dbo.Usuario WITH (UPDLOCK,HOLDLOCK) WHERE ALUMNO_DNI_Alu=@dni AND ROL_Cod_Rol='ALUMNO' AND Activo=1",{dni:body.dni})).recordset[0];
      if(!user)return false;
      const code=await check(tx,user,'RECUPERACION',body.codigo,body.canal||'EMAIL');if(!code)return false;
      // El contacto debe seguir verificado y coincidir con el perfil al consumir el código.
      const valid=(await ops.query(tx,`SELECT c.Id FROM dbo.Contacto_Verificado_V41 c JOIN dbo.ALUMNO a ON a.DNI_Alu=c.ALUMNO_DNI_Alu
        WHERE c.ALUMNO_DNI_Alu=@dni AND c.Activo=1 AND c.Tipo=@channel AND c.Destino=@destination
        AND c.Destino=CASE WHEN c.Tipo='EMAIL' THEN a.Correo_Alu ELSE a.Cel_Alu END`,{dni:body.dni,channel:code.Canal,destination:code.Destino})).recordset[0];
      if(!valid)return false;
      await ops.query(tx,'UPDATE dbo.Usuario SET Clave_Hash=@hash,Debe_Cambiar_Clave=0 WHERE Cod_Usuario=@id',{id:user.Cod_Usuario,hash:await bcrypt.hash(body.nueva,12)});
      await revoke(tx,user.Cod_Usuario,false);
      await ops.audit(tx,user,'Usuario',user.Cod_Usuario,'RECUPERAR_ACCESO',null,{canal:code.Canal},'Código de contacto verificado');return true;
    });
    if(!success)throw rule('El código es inválido o ha expirado. Solicita uno nuevo.');return {ok:true,message:'Contraseña actualizada. Ingresa nuevamente con tu nueva contraseña.'};
  }
  async function prepareActivation(tx,user){
    await ready(tx);await ensureUser(tx,user.Cod_Usuario);
    const code=crypto.randomBytes(12).toString('base64url');
    await ops.query(tx,'UPDATE dbo.Usuario_Seguridad_V41 SET Activacion_Requerida=1 WHERE Usuario_Cod_Usuario=@id',{id:user.Cod_Usuario});
    await issue(tx,user,'ACTIVACION','DIRECTO',null,code,24*60);return code;
  }
  async function activationProof(user,code){
    if(typeof code!=='string'||code.length>100)return null;
    return ops.transaction(async tx=>{
      const valid=await check(tx,user,'ACTIVACION',code,'DIRECTO');if(!valid)return null;
      const nonce=crypto.randomBytes(24).toString('base64url');
      await ops.query(tx,`UPDATE dbo.Cuenta_Codigo_V41 SET Desafio_Hash=@hash,Expira=CASE WHEN Expira<DATEADD(minute,10,SYSUTCDATETIME()) THEN Expira ELSE DATEADD(minute,10,SYSUTCDATETIME()) END WHERE Id=@id`,{id:valid.Id,hash:crypto.createHash('sha256').update(nonce).digest('hex')});
      return {id:valid.Id,nonce};
    });
  }
  async function changePassword(user,auth,body){
    password(body?.nueva,body?.confirmacion,user.ALUMNO_DNI_Alu);
    return ops.transaction(async tx=>{
      const current=(await ops.query(tx,'SELECT Clave_Hash,Debe_Cambiar_Clave FROM dbo.Usuario WITH (UPDLOCK,HOLDLOCK) WHERE Cod_Usuario=@id AND Activo=1',{id:user.Cod_Usuario})).recordset[0];
      if(!current)throw rule('La cuenta no está disponible.');
      if(await securityReady(tx)){
        const live=(await ops.query(tx,'SELECT Version_Sesion FROM dbo.Usuario_Seguridad_V41 WITH (UPDLOCK,HOLDLOCK) WHERE Usuario_Cod_Usuario=@id',{id:user.Cod_Usuario})).recordset[0];
        if((live?.Version_Sesion||0)!==(auth.version||0))throw Object.assign(rule('La sesión cambió. Inicia sesión nuevamente.'),{status:401});
      }
      const initial=current.Debe_Cambiar_Clave&&['password_change','onboarding'].includes(auth.scope);
      if(!initial&&(typeof body.actual!=='string'||!await bcrypt.compare(body.actual,current.Clave_Hash)))throw rule('La contraseña actual no es correcta.');
      if(await bcrypt.compare(body.nueva,current.Clave_Hash))throw rule('Elige una contraseña diferente de la anterior.');
      if(user.Activacion_Requerida){
        if(auth.scope!=='onboarding'||!auth.activation)throw rule('Completa la verificación de activación.');
        const proof=(await ops.query(tx,`SELECT Id FROM dbo.Cuenta_Codigo_V41 WITH (UPDLOCK,HOLDLOCK) WHERE Id=@codeId AND Usuario_Cod_Usuario=@id AND Proposito='ACTIVACION' AND Consumido=1 AND Expira>SYSUTCDATETIME() AND Desafio_Hash=@hash`,{codeId:auth.activation.id,id:user.Cod_Usuario,hash:crypto.createHash('sha256').update(auth.activation.nonce).digest('hex')})).recordset[0];
        if(!proof)throw rule('La activación expiró. Solicita un nuevo código al administrador.');
      }
      await ops.query(tx,'UPDATE dbo.Usuario SET Clave_Hash=@hash,Debe_Cambiar_Clave=0 WHERE Cod_Usuario=@id',{id:user.Cod_Usuario,hash:await bcrypt.hash(body.nueva,12)});
      const version=await securityReady(tx)?await revoke(tx,user.Cod_Usuario,false):0;
      await ops.audit(tx,user,'Usuario',user.Cod_Usuario,'CAMBIAR_CLAVE',null,{primerIngreso:!!initial},null);
      return {...user,Debe_Cambiar_Clave:false,Activacion_Requerida:false,Version_Sesion:version};
    });
  }
  async function administrativeRecovery(dni,body,actor){
    await ready();if(body?.identidadConfirmada!==true)throw rule('Confirma que verificaste la identidad del estudiante.');const motive=reason(body?.motivo);
    return ops.transaction(async tx=>{
      const user=(await ops.query(tx,"SELECT Cod_Usuario,Nomb_Usuario,Activo FROM dbo.Usuario WITH (UPDLOCK,HOLDLOCK) WHERE ALUMNO_DNI_Alu=@dni AND ROL_Cod_Rol='ALUMNO'",{dni})).recordset[0];
      if(!user)throw rule('No se encontró una cuenta de alumno.');
      const temporary=crypto.randomBytes(18).toString('base64url');
      await ops.query(tx,'UPDATE dbo.Usuario SET Clave_Hash=@hash,Debe_Cambiar_Clave=1 WHERE Cod_Usuario=@id',{id:user.Cod_Usuario,hash:await bcrypt.hash(temporary,12)});
      await revoke(tx,user.Cod_Usuario,false);
      await ops.audit(tx,actor,'Usuario',user.Cod_Usuario,'RECUPERACION_ADMIN',null,{DNI_Alu:dni},motive);
      return {usuario:user.Nomb_Usuario,claveTemporal:temporary,cuentaActiva:!!user.Activo};
    });
  }
  async function applyContact(tx,user,channel,destination,actor,method,motive){
    await ops.query(tx,channel==='EMAIL'?'UPDATE dbo.ALUMNO SET Correo_Alu=@destination WHERE DNI_Alu=@dni':'UPDATE dbo.ALUMNO SET Cel_Alu=@destination WHERE DNI_Alu=@dni',{dni:user.ALUMNO_DNI_Alu,destination});
    await ops.query(tx,'UPDATE dbo.Contacto_Verificado_V41 SET Activo=0 WHERE ALUMNO_DNI_Alu=@dni AND Tipo=@channel AND Activo=1',{dni:user.ALUMNO_DNI_Alu,channel});
    await ops.query(tx,`INSERT dbo.Contacto_Verificado_V41(ALUMNO_DNI_Alu,Tipo,Destino,Metodo,Usuario_Cod_Usuario) VALUES (@dni,@channel,@destination,@method,@actor)`,{dni:user.ALUMNO_DNI_Alu,channel,destination,method,actor:actor.Cod_Usuario});
    await ops.audit(tx,actor,'Contacto',user.ALUMNO_DNI_Alu,'VERIFICAR_CONTACTO',null,{tipo:channel,destino:destination,metodo:method},motive);
  }
  async function requestContact(user,body){
    await ready();const {tipo,destino,actual}=body||{};
    if(!['EMAIL','SMS'].includes(tipo)||!(tipo==='EMAIL'?emailAddress(destino):typeof destino==='string'&&/^\d{9}$/.test(destino)))throw rule('Ingresa un correo válido o un celular de nueve dígitos.');
    const current=(await ops.query(null,'SELECT Clave_Hash FROM dbo.Usuario WHERE Cod_Usuario=@id',{id:user.Cod_Usuario})).recordset[0];
    if(typeof actual!=='string'||!current||!await bcrypt.compare(actual,current.Clave_Hash))throw rule('Confirma tu contraseña actual para actualizar el contacto.');
    const configured=tipo==='EMAIL'?notifications.emailConfigured:notifications.smsConfigured;
    if(pending.size>=50)throw rule('Hay solicitudes en curso. Intenta en unos minutos.');
    const delivery=await ops.transaction(async tx=>{
      const live=(await ops.query(tx,'SELECT Cod_Usuario,Clave_Hash FROM dbo.Usuario WITH (UPDLOCK,HOLDLOCK) WHERE Cod_Usuario=@id AND Activo=1',{id:user.Cod_Usuario})).recordset[0];
      if(!live||live.Clave_Hash!==current.Clave_Hash)throw Object.assign(rule('La cuenta cambió. Inicia sesión nuevamente.'),{status:401});
      const count=(await ops.query(tx,"SELECT COUNT(*) n FROM dbo.Solicitud_Contacto_V41 WHERE ALUMNO_DNI_Alu=@dni AND Creado>DATEADD(hour,-1,SYSUTCDATETIME())",{dni:user.ALUMNO_DNI_Alu})).recordset[0].n;
      if(count>=3||configured&&!await withinLimit(tx,user.Cod_Usuario,'VERIFICAR_CONTACTO'))throw rule('Espera antes de solicitar otro cambio de contacto.');
      await ops.query(tx,"UPDATE dbo.Solicitud_Contacto_V41 SET Estado='REEMPLAZADA' WHERE ALUMNO_DNI_Alu=@dni AND Estado IN ('PENDIENTE','PENDIENTE_ADMIN')",{dni:user.ALUMNO_DNI_Alu});
      const code=String(crypto.randomInt(0,1000000)).padStart(6,'0');
      const codeId=configured?await issue(tx,user,'VERIFICAR_CONTACTO',tipo,destino,code):null;
      const id=crypto.randomUUID();
      await ops.query(tx,`INSERT dbo.Solicitud_Contacto_V41(Id,ALUMNO_DNI_Alu,Tipo,Destino,Estado,Codigo_Id) VALUES (@id,@dni,@type,@destination,@state,@code)`,{id,dni:user.ALUMNO_DNI_Alu,type:tipo,destination:destino,state:configured?'PENDIENTE':'PENDIENTE_ADMIN',code:codeId});
      await ops.audit(tx,user,'Contacto',user.ALUMNO_DNI_Alu,'SOLICITAR_CAMBIO',null,{tipo,solicitud:id},'Solicitud del estudiante');
      return {id:codeId,to:destino,code,purpose:'VERIFICAR_CONTACTO'};
    });
    if(configured)dispatch(delivery.id,delivery,tipo);
    return {ok:true,requiereCodigo:!!configured,message:configured?'Solicitud registrada. Recibirás un código si se completa la entrega. Vence en 10 minutos.':'Solicitud registrada para revisión de administración. No se envió ningún código.'};
  }
  async function confirmContact(user,code){
    await ready();if(typeof code!=='string'||!/^\d{6}$/.test(code))throw rule('Código inválido o expirado.');
    const success=await ops.transaction(async tx=>{
      const valid=await check(tx,user,'VERIFICAR_CONTACTO',code);if(!valid)return false;
      const request=(await ops.query(tx,"SELECT Id FROM dbo.Solicitud_Contacto_V41 WITH (UPDLOCK,HOLDLOCK) WHERE Codigo_Id=@id AND ALUMNO_DNI_Alu=@dni AND Estado='PENDIENTE'",{id:valid.Id,dni:user.ALUMNO_DNI_Alu})).recordset[0];
      if(!request)return false;
      await applyContact(tx,user,valid.Canal,valid.Destino,user,'CODIGO','Código recibido en el contacto solicitado');
      await ops.query(tx,"UPDATE dbo.Solicitud_Contacto_V41 SET Estado='VERIFICADA',Resuelto=SYSUTCDATETIME(),Usuario_Cod_Usuario=@actor WHERE Id=@id",{id:request.Id,actor:user.Cod_Usuario});return true;
    });if(!success)throw rule('Código inválido o expirado.');return {ok:true};
  }
  async function resolveContact(id,body,actor){
    await ready();const motive=reason(body?.motivo);
    if(typeof body?.aprobar!=='boolean'||body.aprobar&&body.identidadConfirmada!==true)throw rule('Confirma la identidad y el control del contacto antes de aprobarlo.');
    return ops.transaction(async tx=>{
      const request=(await ops.query(tx,"SELECT * FROM dbo.Solicitud_Contacto_V41 WITH (UPDLOCK,HOLDLOCK) WHERE Id=@id AND Estado IN ('PENDIENTE','PENDIENTE_ADMIN')",{id})).recordset[0];
      if(!request)throw rule('La solicitud no está pendiente.');
      if(body.aprobar)await applyContact(tx,{ALUMNO_DNI_Alu:request.ALUMNO_DNI_Alu},request.Tipo,request.Destino,actor,'PRESENCIAL',motive);
      if(!body.aprobar)await ops.audit(tx,actor,'Contacto',request.ALUMNO_DNI_Alu,'RECHAZAR_CONTACTO',null,{solicitud:id},motive);
      await ops.query(tx,'UPDATE dbo.Solicitud_Contacto_V41 SET Estado=@state,Resuelto=SYSUTCDATETIME(),Usuario_Cod_Usuario=@actor,Motivo=@motive WHERE Id=@id',{id,state:body.aprobar?'APROBADA':'RECHAZADA',actor:actor.Cod_Usuario,motive});
      if(request.Codigo_Id)await ops.query(tx,'UPDATE dbo.Cuenta_Codigo_V41 SET Consumido=1 WHERE Id=@id',{id:request.Codigo_Id});return {ok:true};
    });
  }
  return {notifications,requestRecovery,completeRecovery,prepareActivation,activationProof,changePassword,administrativeRecovery,requestContact,confirmContact,resolveContact,revoke,ready,flush:()=>Promise.all([...pending])};
}
module.exports={createAccountSecurity,password,reason,protectedCode,matches,GENERIC};
