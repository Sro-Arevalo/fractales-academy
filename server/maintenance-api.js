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
  await schema.required();const row=(await ops.query(null,'SELECT CORREO_RECUPERACION,CORREO_VERIFICADO FROM dbo.USUARIO WHERE ID_USUARIO=@id',{id:req.user.ID_USUARIO})).recordset[0];
  res.json({email:row?.CORREO_RECUPERACION||'',verificado:!!row?.CORREO_VERIFICADO});
}));
router.post('/admin/maintenance/account-email/request',rate(6),safe(async(req,res)=>res.json(await require('./account-service').requestAdminEmail(req.user,req.body))));
router.post('/admin/maintenance/account-email/confirm',rate(15),safe(async(req,res)=>res.json(await require('./account-service').confirmAdminEmail(req.user,req.body?.codigo))));
router.get('/admin/maintenance/test-data',safe(async(req,res)=>res.json(await lifecycle.tests(req.user))));
router.post('/admin/maintenance/test-data/clean',safe(async(req,res)=>res.json(await lifecycle.clean(req.body,req.user))));
router.get('/admin/maintenance/reports',safe(async(req,res)=>{
  const rows=(await ops.query(null,`SELECT c.ID_CICLO,c.NOMBRE_CICLO,c.MODALIDAD,g.ID_HORARIO_ACADEMICO,g.NOMBRE_HORARIO,g.CAPACIDAD_MAXIMA,
    (SELECT COUNT(*) FROM dbo.MATRICULA m WHERE m.ID_HORARIO_ACADEMICO=g.ID_HORARIO_ACADEMICO AND m.ID_ESTADO_MATRICULA='ACTIVA') Matriculas_Activas,
    ISNULL((SELECT SUM(p.MONTO) FROM dbo.PAGO p JOIN dbo.MATRICULA m ON m.ID_MATRICULA=p.ID_MATRICULA WHERE m.ID_HORARIO_ACADEMICO=g.ID_HORARIO_ACADEMICO AND p.ID_ESTADO_PAGO='PENDIENTE'),0) Pendiente,
    ISNULL((SELECT SUM(p.MONTO) FROM dbo.PAGO p JOIN dbo.MATRICULA m ON m.ID_MATRICULA=p.ID_MATRICULA WHERE m.ID_HORARIO_ACADEMICO=g.ID_HORARIO_ACADEMICO AND p.ID_ESTADO_PAGO='PAGADO'),0) Cobrado
    FROM dbo.CICLO c JOIN dbo.HORARIO_ACADEMICO g ON g.ID_CICLO=c.ID_CICLO ORDER BY c.FECHA_INICIO DESC,g.NOMBRE_HORARIO`)).recordset;
  res.json({rows,nota:'Totales de mensualidades por grupo. Los cargos iniciales, sin matrícula asociada, se consultan en Gestión de pagos.'});
}));
module.exports=router;
