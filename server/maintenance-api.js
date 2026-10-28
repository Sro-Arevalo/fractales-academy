'use strict';
const express=require('express');
const {authenticate,admin}=require('./auth');
const ops=require('./operations');
const {rule}=require('./rules');
const schema=require('./schema-v43');
const guardians=require('./guardians');
const lifecycle=require('./student-lifecycle');
const router=express.Router();
const rate=max=>require('express-rate-limit')({windowMs:15*60000,limit:max,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Espera unos minutos antes de solicitar otro código.'}});
router.use('/admin/maintenance',authenticate,admin);
const safe=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
router.get('/admin/maintenance/capabilities',safe(async(req,res)=>res.json({v43:await schema.ready()})));
router.get('/admin/maintenance/account-email',safe(async(req,res)=>{
  await schema.required();const row=(await ops.query(null,'SELECT Correo_Recuperacion,Correo_Verificado FROM dbo.Usuario WHERE Cod_Usuario=@id',{id:req.user.Cod_Usuario})).recordset[0];
  res.json({email:row?.Correo_Recuperacion||'',verificado:!!row?.Correo_Verificado});
}));
router.post('/admin/maintenance/account-email/request',rate(6),safe(async(req,res)=>res.json(await require('./account-service').requestAdminEmail(req.user,req.body))));
router.post('/admin/maintenance/account-email/confirm',rate(15),safe(async(req,res)=>res.json(await require('./account-service').confirmAdminEmail(req.user,req.body?.codigo))));
router.get('/admin/maintenance/guardians',safe(async(req,res)=>{
  await schema.required();const q=String(req.query.q||'').trim().slice(0,120);
  res.json({rows:(await ops.query(null,`SELECT TOP(80) p.*,(SELECT COUNT(*) FROM dbo.ALUMNO a WHERE a.DNI_Apoderado=p.DNI_Apoderado) Alumnos
    FROM dbo.APODERADO p WHERE p.DNI_Apoderado LIKE @q OR p.Nomb_Apoderado LIKE @q ORDER BY p.Nomb_Apoderado,p.DNI_Apoderado`,{q:'%'+q+'%'})).recordset});
}));
router.post('/admin/maintenance/guardians',safe(async(req,res)=>{await schema.required();res.json(await guardians.save(req.body,req.user));}));
router.delete('/admin/maintenance/guardians/:dni',safe(async(req,res)=>{
  await schema.required();const dni=req.params.dni;
  if(!/^\d{8}$/.test(dni)||req.body?.confirmacion!=='ELIMINAR '+dni)throw rule('Revisa el apoderado y escribe ELIMINAR seguido de su DNI.');
  const motive=require('./account-security').reason(req.body.motivo);
  await ops.transaction(async tx=>{
    const row=(await ops.query(tx,'SELECT * FROM dbo.APODERADO WITH (UPDLOCK,HOLDLOCK) WHERE DNI_Apoderado=@dni',{dni})).recordset[0];
    if(!row)throw Object.assign(rule('Apoderado no encontrado.'),{status:404});
    const deps=await require('./administration').dependencies(tx,{name:'APODERADO',pk:['DNI_Apoderado']},row);
    if(deps.length)throw Object.assign(rule('El apoderado tiene alumnos o historial vinculado. Corrige los datos compartidos; conserva su identidad.'),{status:409});
    await ops.query(tx,'DELETE dbo.APODERADO WHERE DNI_Apoderado=@dni',{dni});
    await ops.audit(tx,req.user,'APODERADO',dni,'ELIMINAR',null,{sinAlumnos:true},motive);
  });res.json({ok:true});
}));
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
