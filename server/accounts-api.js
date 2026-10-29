'use strict';
const express=require('express'),limit=require('express-rate-limit');const {authenticate,admin,student,clearSession}=require('./auth');
const {securityReady}=require('./security-schema');const ops=require('./operations');const accounts=require('./account-service');const {rule}=require('./rules');
const router=express.Router(),safe=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
const rate=(windowMs,max)=>limit({windowMs,limit:max,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Has realizado varios intentos. Espera unos minutos antes de continuar.'}});
router.get('/auth/capabilities',safe(async(req,res)=>{const ready=await securityReady();res.json({v41:ready,email:ready&&!!accounts.notifications.emailConfigured,sms:ready&&!!accounts.notifications.smsConfigured,activacionDni:ready});}));
router.post('/auth/recovery/request',rate(15*60000,5),safe(async(req,res)=>{const started=Date.now(),result=await accounts.requestRecovery(req.body?.email||req.body?.dni,req.body?.canal||'EMAIL');await require('node:timers/promises').setTimeout(Math.max(0,250-(Date.now()-started)+require('node:crypto').randomInt(0,30)));res.status(202).json(result);}));
router.post('/auth/recovery/complete',rate(15*60000,15),safe(async(req,res)=>{const result=await accounts.completeRecovery(req.body);clearSession(res);res.json(result);}));
router.post('/admin/accounts/:dni/recover',authenticate,admin,rate(15*60000,10),safe(async(req,res)=>{if(!/^\d{8}$/.test(req.params.dni))throw rule('DNI inválido.');res.json(await accounts.administrativeRecovery(req.params.dni,req.body,req.user));}));
router.get('/student/profile',authenticate,student,safe(async(req,res)=>{
  const dni=req.user.DNI_ALUMNO,ready=await securityReady();
  const profile=(await ops.query(null,`SELECT a.*,c.NOMBRE_CARRERA,p.PARENTESCO FROM dbo.ALUMNO a JOIN dbo.CARRERA c ON c.ID_CARRERA=a.ID_CARRERA LEFT JOIN dbo.PARENTESCO p ON p.ID_PARENTESCO=a.ID_PARENTESCO WHERE a.DNI_ALUMNO=@dni`,{dni})).recordset[0];
  const contactos=ready?(await ops.query(null,`SELECT c.TIPO,c.DESTINO,c.VERIFICADO,c.METODO_VERIFICACION FROM dbo.CONTACTO_VERIFICADO c JOIN dbo.ALUMNO a ON a.DNI_ALUMNO=c.DNI_ALUMNO WHERE c.DNI_ALUMNO=@dni AND c.ACTIVO=1 AND c.DESTINO=CASE WHEN c.TIPO='EMAIL' THEN a.CORREO ELSE a.CELULAR END`,{dni})).recordset:[];
  const solicitudes=ready?(await ops.query(null,'SELECT TOP(10) ID,TIPO,DESTINO,ESTADO,FECHA_CREACION,FECHA_RESOLUCION FROM dbo.SOLICITUD_CONTACTO WHERE DNI_ALUMNO=@dni ORDER BY FECHA_CREACION DESC',{dni})).recordset:[];
  res.json({profile,contactos,solicitudes,verificacionDisponible:ready});
}));
router.post('/student/contact/request',authenticate,student,rate(15*60000,6),safe(async(req,res)=>res.json(await accounts.requestContact(req.user,req.body))));
router.post('/student/contact/confirm',authenticate,student,rate(15*60000,15),safe(async(req,res)=>res.json(await accounts.confirmContact(req.user,req.body?.codigo))));
router.get('/admin/contact-requests',authenticate,admin,safe(async(req,res)=>{
  await accounts.ready();res.json({rows:(await ops.query(null,`SELECT TOP(100) s.ID,s.DNI_ALUMNO,a.NOMBRE_COMPLETO,s.TIPO,s.DESTINO,s.ESTADO,s.FECHA_CREACION FROM dbo.SOLICITUD_CONTACTO s JOIN dbo.ALUMNO a ON a.DNI_ALUMNO=s.DNI_ALUMNO WHERE s.ESTADO IN ('PENDIENTE','PENDIENTE_ADMIN') ORDER BY s.FECHA_CREACION`)).recordset});
}));
router.post('/admin/contact-requests/:id/resolve',authenticate,admin,safe(async(req,res)=>{if(!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(req.params.id))throw rule('Solicitud inválida.');res.json(await accounts.resolveContact(req.params.id,req.body,req.user));}));
router.get('/admin/audit',authenticate,admin,safe(async(req,res)=>{
  const page=Math.max(1,Math.min(100000,parseInt(req.query.page,10)||1)),entity=String(req.query.entidad||'').slice(0,20),q=String(req.query.q||'').slice(0,80);
  const result=await ops.query(null,`SELECT ID,ENTIDAD,ID_REGISTRO,ACCION,ID_USUARIO_RESPONSABLE,MOTIVO,FECHA_EVENTO FROM dbo.AUDITORIA_SISTEMA WHERE (@entity='' OR ENTIDAD=@entity) AND (@q='' OR ID_REGISTRO LIKE @like OR ID_USUARIO_RESPONSABLE LIKE @like) ORDER BY FECHA_EVENTO DESC,ID DESC OFFSET @offset ROWS FETCH NEXT 20 ROWS ONLY`,{entity,q,like:'%'+q+'%',offset:(page-1)*20});
  const count=(await ops.query(null,"SELECT COUNT_BIG(*) n FROM dbo.AUDITORIA_SISTEMA WHERE (@entity='' OR ENTIDAD=@entity) AND (@q='' OR ID_REGISTRO LIKE @like OR ID_USUARIO_RESPONSABLE LIKE @like)",{entity,q,like:'%'+q+'%'})).recordset[0].n;
  res.json({rows:result.recordset,page,count:Number(count),pageSize:20});
}));
module.exports=router;
