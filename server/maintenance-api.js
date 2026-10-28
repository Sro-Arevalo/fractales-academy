'use strict';
const express=require('express');
const {authenticate,admin}=require('./auth');
const ops=require('./operations');
const {rule}=require('./rules');
const schema=require('./schema-v43');
const lifecycle=require('./student-lifecycle');
const router=express.Router();
const rate=max=>require('express-rate-limit')({windowMs:15*60000,limit:max,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Espera unos minutos antes de solicitar otro código.'}});
router.use('/admin/maintenance',authenticate,admin);
const safe=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
router.get('/admin/maintenance/capabilities',safe(async(req,res)=>res.json({v43:await schema.ready(),v44:await require('./schema-v44').ready()})));
router.get('/admin/maintenance/account-email',safe(async(req,res)=>{
  await schema.required();const row=(await ops.query(null,'SELECT Correo_Recuperacion,Correo_Verificado FROM dbo.Usuario WHERE Cod_Usuario=@id',{id:req.user.Cod_Usuario})).recordset[0];
  res.json({email:row?.Correo_Recuperacion||'',verificado:!!row?.Correo_Verificado});
}));
router.post('/admin/maintenance/account-email/request',rate(6),safe(async(req,res)=>res.json(await require('./account-service').requestAdminEmail(req.user,req.body))));
router.post('/admin/maintenance/account-email/confirm',rate(15),safe(async(req,res)=>res.json(await require('./account-service').confirmAdminEmail(req.user,req.body?.codigo))));
router.get('/admin/maintenance/test-data',safe(async(req,res)=>res.json(await lifecycle.tests(req.user))));
router.post('/admin/maintenance/test-data/clean',safe(async(req,res)=>res.json(await lifecycle.clean(req.body,req.user))));
router.get('/admin/maintenance/reports',safe(async(req,res)=>{
  const rows=(await ops.query(null,`SELECT c.Cod_Ciclo,c.Nomb_Ciclo,c.Modalidad,g.Cod_Grupo,g.Nomb_Grupo,g.Cupo_Max,
    (SELECT COUNT(*) FROM dbo.MATRICULA m WHERE m.Grupo_Cod_Grupo=g.Cod_Grupo AND m.ESTADO_MATRICULA_Cod_Estado_Matricula='ACTIVA') Matriculas_Activas,
    ISNULL((SELECT SUM(p.Monto) FROM dbo.Pago p JOIN dbo.MATRICULA m ON m.Cod_Matricula=p.MATRICULA_Cod_Matricula WHERE m.Grupo_Cod_Grupo=g.Cod_Grupo AND p.ESTADO_PAGO_Cod_Estado='PENDIENTE'),0) Pendiente,
    ISNULL((SELECT SUM(p.Monto) FROM dbo.Pago p JOIN dbo.MATRICULA m ON m.Cod_Matricula=p.MATRICULA_Cod_Matricula WHERE m.Grupo_Cod_Grupo=g.Cod_Grupo AND p.ESTADO_PAGO_Cod_Estado='PAGADO'),0) Cobrado
    FROM dbo.Ciclo c JOIN dbo.Grupo g ON g.Ciclo_Cod_Ciclo=c.Cod_Ciclo ORDER BY c.Fech_Inicio DESC,g.Nomb_Grupo`)).recordset;
  res.json({rows,nota:'Totales de mensualidades por grupo. Los cargos iniciales, sin matrícula asociada, se consultan en Gestión de pagos.'});
}));
module.exports=router;
