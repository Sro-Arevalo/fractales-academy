'use strict';
const express=require('express'),limit=require('express-rate-limit');const {authenticate,admin,student,clearSession}=require('./auth');
const {securityReady}=require('./security-schema');const ops=require('./operations');const accounts=require('./account-service');const {rule}=require('./rules');
const router=express.Router(),safe=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
const rate=(windowMs,max)=>limit({windowMs,limit:max,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Has realizado varios intentos. Espera unos minutos antes de continuar.'}});
router.get('/auth/capabilities',safe(async(req,res)=>{const ready=await securityReady();res.json({v41:ready,email:ready&&!!accounts.notifications.emailConfigured,sms:ready&&!!accounts.notifications.smsConfigured,activacionDni:ready});}));
router.post('/auth/recovery/request',rate(15*60000,5),safe(async(req,res)=>{const started=Date.now(),result=await accounts.requestRecovery(req.body?.dni,req.body?.canal||'EMAIL');await require('node:timers/promises').setTimeout(Math.max(0,250-(Date.now()-started)+require('node:crypto').randomInt(0,30)));res.status(202).json(result);}));
router.post('/auth/recovery/complete',rate(15*60000,15),safe(async(req,res)=>{const result=await accounts.completeRecovery(req.body);clearSession(res);res.json(result);}));
router.post('/admin/accounts/:dni/recover',authenticate,admin,rate(15*60000,10),safe(async(req,res)=>{if(!/^\d{8}$/.test(req.params.dni))throw rule('DNI inválido.');res.json(await accounts.administrativeRecovery(req.params.dni,req.body,req.user));}));
router.get('/student/profile',authenticate,student,safe(async(req,res)=>{
  const dni=req.user.ALUMNO_DNI_Alu,ready=await securityReady();
  const profile=(await ops.query(null,`SELECT a.*,c.Nomb_Carrera,p.Tipo_Paren FROM dbo.ALUMNO a JOIN dbo.CARRERA c ON c.Cod_Carrera=a.CARRERA_Cod_Carrera JOIN dbo.PARENTESCO p ON p.Cod_Paren=a.PARENTESCO_Cod_Paren WHERE a.DNI_Alu=@dni`,{dni})).recordset[0];
  const contactos=ready?(await ops.query(null,`SELECT c.Tipo,c.Destino,c.Verificado,c.Metodo FROM dbo.Contacto_Verificado_V41 c JOIN dbo.ALUMNO a ON a.DNI_Alu=c.ALUMNO_DNI_Alu WHERE c.ALUMNO_DNI_Alu=@dni AND c.Activo=1 AND c.Destino=CASE WHEN c.Tipo='EMAIL' THEN a.Correo_Alu ELSE a.Cel_Alu END`,{dni})).recordset:[];
  const solicitudes=ready?(await ops.query(null,'SELECT TOP(10) Id,Tipo,Destino,Estado,Creado,Resuelto FROM dbo.Solicitud_Contacto_V41 WHERE ALUMNO_DNI_Alu=@dni ORDER BY Creado DESC',{dni})).recordset:[];
  res.json({profile,contactos,solicitudes,verificacionDisponible:ready});
}));
router.post('/student/contact/request',authenticate,student,rate(15*60000,6),safe(async(req,res)=>res.json(await accounts.requestContact(req.user,req.body))));
router.post('/student/contact/confirm',authenticate,student,rate(15*60000,15),safe(async(req,res)=>res.json(await accounts.confirmContact(req.user,req.body?.codigo))));
router.get('/admin/contact-requests',authenticate,admin,safe(async(req,res)=>{
  await accounts.ready();res.json({rows:(await ops.query(null,`SELECT TOP(100) s.Id,s.ALUMNO_DNI_Alu,a.Nomb_Alu,s.Tipo,s.Destino,s.Estado,s.Creado FROM dbo.Solicitud_Contacto_V41 s JOIN dbo.ALUMNO a ON a.DNI_Alu=s.ALUMNO_DNI_Alu WHERE s.Estado IN ('PENDIENTE','PENDIENTE_ADMIN') ORDER BY s.Creado`)).recordset});
}));
router.post('/admin/contact-requests/:id/resolve',authenticate,admin,safe(async(req,res)=>{if(!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(req.params.id))throw rule('Solicitud inválida.');res.json(await accounts.resolveContact(req.params.id,req.body,req.user));}));
router.get('/admin/audit',authenticate,admin,safe(async(req,res)=>{
  const page=Math.max(1,Math.min(100000,parseInt(req.query.page,10)||1)),entity=String(req.query.entidad||'').slice(0,20),q=String(req.query.q||'').slice(0,80);
  const result=await ops.query(null,`SELECT Id,Entidad,Codigo,Accion,Usuario_Cod_Usuario,Motivo,Fecha FROM dbo.Auditoria_V4 WHERE (@entity='' OR Entidad=@entity) AND (@q='' OR Codigo LIKE @like OR Usuario_Cod_Usuario LIKE @like) ORDER BY Fecha DESC,Id DESC OFFSET @offset ROWS FETCH NEXT 20 ROWS ONLY`,{entity,q,like:'%'+q+'%',offset:(page-1)*20});
  const count=(await ops.query(null,"SELECT COUNT_BIG(*) n FROM dbo.Auditoria_V4 WHERE (@entity='' OR Entidad=@entity) AND (@q='' OR Codigo LIKE @like OR Usuario_Cod_Usuario LIKE @like)",{entity,q,like:'%'+q+'%'})).recordset[0].n;
  res.json({rows:result.recordset,page,count:Number(count),pageSize:20});
}));
module.exports=router;
