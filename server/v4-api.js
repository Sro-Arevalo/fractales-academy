'use strict';
const express=require('express');
const {authenticate,admin}=require('./auth');
const {rule,validate}=require('./rules');
const {validateFields}=require('./validation');
const model=require('./model.json');
const ops=require('./operations');
const router=express.Router();
const safe=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
const get=(url,fn)=>router.get(url,authenticate,admin,safe(fn));
const post=(url,fn)=>router.post(url,authenticate,admin,safe(fn));
function dni(value){if(!/^\d{8}$/.test(value||''))throw rule('El DNI debe contener ocho dígitos.');return value;}

get('/academic/context',async(req,res)=>{
  await require('./schema-v44').required();
  const queries={
    programas:'SELECT ID_PROGRAMA,NOMBRE_PROGRAMA FROM dbo.PROGRAMA WHERE ACTIVO=1 ORDER BY NOMBRE_PROGRAMA',
    ciclos:"SELECT * FROM dbo.CICLO WHERE ID_ESTADO_CICLO IN ('ACTIVO','PROGRAMADO') ORDER BY FECHA_INICIO DESC",
    grupos:`SELECT g.*,t.NOMBRE_TURNO,t.HORA_INICIO Turno_Inicio,t.HORA_FIN Turno_Fin,a.NOMBRE_AULA,c.NOMBRE_CICLO,c.ID_PROGRAMA,c.MODALIDAD,c.FECHA_INICIO,c.FECHA_FIN,c.NUMERO_MENSUALIDADES,c.PRECIO_MENSUAL,
      g.CAPACIDAD_MAXIMA-(SELECT COUNT(*) FROM dbo.MATRICULA m WHERE m.ID_HORARIO_ACADEMICO=g.ID_HORARIO_ACADEMICO AND m.ID_ESTADO_MATRICULA='ACTIVA') Cupos_Disponibles
      FROM dbo.HORARIO_ACADEMICO g JOIN dbo.TURNO t ON t.ID_TURNO=g.ID_TURNO JOIN dbo.AULA a ON a.ID_AULA=g.ID_AULA JOIN dbo.CICLO c ON c.ID_CICLO=g.ID_CICLO JOIN dbo.PROGRAMA p ON p.ID_PROGRAMA=c.ID_PROGRAMA
      WHERE g.ACTIVO=1 AND g.ESTADO_HORARIO='PUBLICADO' AND a.ACTIVO=1 AND p.ACTIVO=1 AND c.ID_ESTADO_CICLO IN ('ACTIVO','PROGRAMADO') ORDER BY c.FECHA_INICIO DESC,g.NOMBRE_HORARIO`,
    aulas:'SELECT * FROM dbo.AULA WHERE ACTIVO=1 ORDER BY NOMBRE_AULA',
    cursos:'SELECT ID_CURSO,NOMBRE_CURSO FROM dbo.CURSO WHERE ACTIVO=1 ORDER BY NOMBRE_CURSO',
    docentes:'SELECT DNI_DOCENTE,NOMBRE_COMPLETO FROM dbo.DOCENTE WHERE ACTIVO=1 ORDER BY NOMBRE_COMPLETO',
    turnos:'SELECT * FROM dbo.TURNO ORDER BY HORA_INICIO',
    carreras:`SELECT * FROM dbo.CARRERA WHERE ${require('./trash').visible(model.CARRERA)} ORDER BY NOMBRE_CARRERA`,
    parentescos:'SELECT * FROM dbo.PARENTESCO ORDER BY PARENTESCO',
    asignaturas:`SELECT da.*,c.NOMBRE_CURSO,d.NOMBRE_COMPLETO FROM dbo.CURSO_DOCENTE da JOIN dbo.CURSO c ON c.ID_CURSO=da.ID_CURSO
      JOIN dbo.DOCENTE d ON d.DNI_DOCENTE=da.DNI_DOCENTE WHERE c.ACTIVO=1 AND d.ACTIVO=1 ORDER BY c.NOMBRE_CURSO,d.NOMBRE_COMPLETO`
  };
  const entries=await Promise.all(Object.entries(queries).map(async([key,text])=>[key,(await ops.query(null,text)).recordset]));
  res.json(Object.fromEntries(entries));
});
get('/academic/schedules',async(req,res)=>res.json(await require('./schedules').list()));
get('/academic/schedules/:id',async(req,res)=>res.json(await require('./schedules').detail(req.params.id)));
post('/academic/schedules',async(req,res)=>res.status(201).json(await require('./schedules').save(null,req.body,req.user)));
router.put('/academic/schedules/:id',authenticate,admin,safe(async(req,res)=>res.json(await require('./schedules').save(req.params.id,req.body,req.user))));
get('/alumnos/:dni/inscripcion',async(req,res)=>{
  const inputs={dni:dni(req.params.dni)};
  const alumno=(await ops.query(null,'SELECT * FROM dbo.ALUMNO WHERE DNI_ALUMNO=@dni',inputs)).recordset[0]||null;
  const historial=(await ops.query(null,`SELECT m.ID_MATRICULA,m.FECHA_MATRICULA,g.NOMBRE_HORARIO,c.NOMBRE_CICLO,m.ID_ESTADO_MATRICULA
    FROM dbo.MATRICULA m JOIN dbo.HORARIO_ACADEMICO g ON g.ID_HORARIO_ACADEMICO=m.ID_HORARIO_ACADEMICO JOIN dbo.CICLO c ON c.ID_CICLO=g.ID_CICLO
    WHERE m.DNI_ALUMNO=@dni ORDER BY m.FECHA_MATRICULA DESC`,inputs)).recordset;
  if(alumno&&(await ops.query(null,"SELECT ID FROM dbo.PAPELERA_REGISTRO WHERE ENTIDAD='ALUMNO' AND ID_REGISTRO=@dni AND ESTADO='EN_PAPELERA'",inputs)).recordset.length)throw rule('El estudiante está en papelera. Restáuralo antes de inscribirlo.');
  const initial=(await ops.query(null,"SELECT ID_PAGO FROM dbo.PAGO WHERE DNI_ALUMNO=@dni AND ID_CONCEPTO='MATRICULA_INICIAL'",inputs)).recordset;
  res.json({alumno,historial,primerIngreso:!historial.length&&!initial.length});
});
post('/inscripciones',async(req,res)=>res.status(201).json(await ops.enroll(req.body,req.user)));
get('/pagos/alumno/:dni',async(req,res)=>{
  const inputs={dni:dni(req.params.dni)};
  const alumno=(await ops.query(null,'SELECT DNI_ALUMNO,NOMBRE_COMPLETO FROM dbo.ALUMNO WHERE DNI_ALUMNO=@dni',inputs)).recordset[0];
  if(!alumno)return res.status(404).json({error:'Estudiante no encontrado.'});
  const rows=(await ops.query(null,`SELECT p.*,c.NOMBRE_CICLO,g.NOMBRE_HORARIO FROM dbo.PAGO p LEFT JOIN dbo.MATRICULA m ON m.ID_MATRICULA=p.ID_MATRICULA
    LEFT JOIN dbo.HORARIO_ACADEMICO g ON g.ID_HORARIO_ACADEMICO=m.ID_HORARIO_ACADEMICO LEFT JOIN dbo.CICLO c ON c.ID_CICLO=g.ID_CICLO WHERE p.DNI_ALUMNO=@dni ORDER BY p.FECHA_VENCIMIENTO,p.ID_PAGO`,inputs)).recordset;
  res.json({alumno,rows});
});
get('/pagos/medios',async(req,res)=>res.json({rows:(await ops.query(null,'SELECT * FROM dbo.MEDIO_PAGO ORDER BY NOMBRE_MEDIO_PAGO')).recordset}));
post('/pagos/medios',async(req,res)=>{
  const {codigo,nombre,ACTIVO=true}=req.body||{};
  if(!/^[A-Z0-9_-]{1,10}$/.test(codigo||'')||typeof nombre!=='string'||!nombre.trim()||nombre.length>60||typeof ACTIVO!=='boolean')throw rule('Código de medio obligatorio (1 a 10 caracteres A-Z, 0-9, _ o -), nombre hasta 60 caracteres y estado válido.');
  await ops.transaction(async tx=>{
    const before=(await ops.query(tx,'SELECT * FROM dbo.MEDIO_PAGO WITH (UPDLOCK,HOLDLOCK) WHERE ID_MEDIO_PAGO=@codigo',{codigo})).recordset[0];
    await ops.query(tx,before?'UPDATE dbo.MEDIO_PAGO SET NOMBRE_MEDIO_PAGO=@nombre,ACTIVO=@ACTIVO WHERE ID_MEDIO_PAGO=@codigo':'INSERT dbo.MEDIO_PAGO (ID_MEDIO_PAGO,NOMBRE_MEDIO_PAGO,ACTIVO) VALUES (@codigo,@nombre,@ACTIVO)',{codigo,nombre:nombre.trim(),ACTIVO});
    await ops.audit(tx,req.user,'MEDIO_PAGO',codigo,before?'ACTUALIZAR':'CREAR',before,{codigo,nombre,ACTIVO},null);
  });res.json({ok:true});
});
post('/pagos/:codigo/confirmar',async(req,res)=>res.json(await ops.payment(req.params.codigo,req.body,req.user)));
post('/pagos/:codigo/anular',async(req,res)=>res.json(await ops.payment(req.params.codigo,req.body,req.user,true)));
get('/auditoria/:entidad/:codigo',async(req,res)=>{
  if((!Object.hasOwn(model,req.params.entidad)&&!['MEDIO_PAGO','CONTACTO','APODERADO'].includes(req.params.entidad))||req.params.codigo.length>20)throw rule('Referencia de historial inválida.');
  res.json({rows:(await ops.query(null,`SELECT ID,ACCION,DATOS_ANTERIORES,DATOS_NUEVOS,ID_USUARIO_RESPONSABLE,MOTIVO,FECHA_EVENTO FROM dbo.AUDITORIA_SISTEMA
    WHERE ENTIDAD=@entity AND ID_REGISTRO=@code ORDER BY ID DESC`,{entity:req.params.entidad,code:req.params.codigo})).recordset});
});
get('/simulacros',async(req,res)=>res.json({rows:(await ops.query(null,`SELECT e.*,eg.ID_SIMULACRO_HORARIO,eg.ID_HORARIO_ACADEMICO,eg.FECHA_PROGRAMADA,eg.PUBLICADO,g.NOMBRE_HORARIO
  FROM dbo.SIMULACRO e LEFT JOIN dbo.SIMULACRO_HORARIO eg ON eg.ID_SIMULACRO=e.ID_SIMULACRO LEFT JOIN dbo.HORARIO_ACADEMICO g ON g.ID_HORARIO_ACADEMICO=eg.ID_HORARIO_ACADEMICO
  ORDER BY eg.FECHA_PROGRAMADA DESC,e.ID_SIMULACRO,g.NOMBRE_HORARIO`)).recordset}));
post('/simulacros',async(req,res)=>res.status(201).json(await ops.createExam(req.body,req.user)));
get('/simulacros/:codigo/alumno/:dni',async(req,res)=>{
  const rows=(await ops.query(null,`SELECT a.DNI_ALUMNO,a.NOMBRE_COMPLETO,m.ID_MATRICULA,g.NOMBRE_HORARIO,e.NOMBRE_SIMULACRO,e.PUNTAJE_MAXIMO,
    n.ID_RESULTADO,n.PUNTAJE_TOTAL,eg.PUBLICADO FROM dbo.MATRICULA m JOIN dbo.ALUMNO a ON a.DNI_ALUMNO=m.DNI_ALUMNO
    JOIN dbo.HORARIO_ACADEMICO g ON g.ID_HORARIO_ACADEMICO=m.ID_HORARIO_ACADEMICO JOIN dbo.SIMULACRO_HORARIO eg ON eg.ID_HORARIO_ACADEMICO=m.ID_HORARIO_ACADEMICO
    JOIN dbo.SIMULACRO e ON e.ID_SIMULACRO=eg.ID_SIMULACRO LEFT JOIN dbo.RESULTADO_SIMULACRO n ON n.ID_MATRICULA=m.ID_MATRICULA AND n.ID_SIMULACRO_HORARIO=eg.ID_SIMULACRO_HORARIO
    WHERE m.DNI_ALUMNO=@dni AND eg.ID_SIMULACRO=@exam AND m.ID_ESTADO_MATRICULA<>'ANULADA'
    AND eg.ID_ESTADO_SIMULACRO<>'CANCELADO'`,{dni:dni(req.params.dni),exam:req.params.codigo})).recordset;
  if(rows.length!==1)throw rule('El alumno debe pertenecer a un único grupo participante del simulacro.');
  res.json({alumno:rows[0]});
});
post('/simulacros/:codigo/resultados',async(req,res)=>{
  const {DNI_ALUMNO,PUNTAJE_TOTAL,Motivo_Cambio}=req.body||{};dni(DNI_ALUMNO);
  if(Object.keys(req.body).some(k=>!['DNI_ALUMNO','PUNTAJE_TOTAL','Motivo_Cambio'].includes(k)))throw rule('Campo de resultado desconocido.');
  validateFields(model.RESULTADO_SIMULACRO,{PUNTAJE_TOTAL});
  if(typeof PUNTAJE_TOTAL!=='number')throw rule('Ingresa un único puntaje total.');
  const result=await ops.transaction(async tx=>{
    // Bloquear el examen serializa los resultados del mismo simulacro entre grupos.
    const exam=(await ops.query(tx,'SELECT ID_SIMULACRO FROM dbo.SIMULACRO WITH (UPDLOCK,HOLDLOCK) WHERE ID_SIMULACRO=@code',{code:req.params.codigo})).recordset[0];
    if(!exam)throw rule('Simulacro no encontrado.');
    const matches=(await ops.query(tx,`SELECT m.ID_MATRICULA,m.ID_HORARIO_ACADEMICO,eg.ID_SIMULACRO_HORARIO FROM dbo.MATRICULA m WITH (UPDLOCK,HOLDLOCK)
      JOIN dbo.SIMULACRO_HORARIO eg ON eg.ID_HORARIO_ACADEMICO=m.ID_HORARIO_ACADEMICO WHERE m.DNI_ALUMNO=@dni AND eg.ID_SIMULACRO=@exam
      AND m.ID_ESTADO_MATRICULA<>'ANULADA' AND eg.ID_ESTADO_SIMULACRO<>'CANCELADO'`,{dni:DNI_ALUMNO,exam:req.params.codigo})).recordset;
    if(matches.length!==1)throw rule('El alumno debe tener una matrícula válida en un único grupo participante.');
    const match=matches[0];
    const before=(await ops.query(tx,'SELECT * FROM dbo.RESULTADO_SIMULACRO WITH (UPDLOCK,HOLDLOCK) WHERE ID_SIMULACRO_HORARIO=@eg AND ID_MATRICULA=@mat',{eg:match.ID_SIMULACRO_HORARIO,mat:match.ID_MATRICULA})).recordset[0];
    if(before&&(typeof Motivo_Cambio!=='string'||Motivo_Cambio.trim().length<5||Motivo_Cambio.length>250))throw rule('Ya existe un resultado. Para corregirlo indica un motivo (5 a 250 caracteres).');
    const data={ID_RESULTADO:before?.ID_RESULTADO||await ops.nextCode(tx,'N4'),PUNTAJE_TOTAL,ID_MATRICULA:match.ID_MATRICULA,ID_SIMULACRO_HORARIO:match.ID_SIMULACRO_HORARIO,ID_HORARIO_ACADEMICO:match.ID_HORARIO_ACADEMICO};
    await validate('RESULTADO_SIMULACRO',data,before,tx,req.user);
    await ops.query(tx,before?'UPDATE dbo.RESULTADO_SIMULACRO SET PUNTAJE_TOTAL=@score WHERE ID_RESULTADO=@code':`INSERT dbo.RESULTADO_SIMULACRO (ID_RESULTADO,PUNTAJE_TOTAL,ID_MATRICULA,ID_SIMULACRO_HORARIO,ID_HORARIO_ACADEMICO) VALUES (@code,@score,@mat,@eg,@group)`,before?{code:data.ID_RESULTADO,score:PUNTAJE_TOTAL}:{code:data.ID_RESULTADO,score:PUNTAJE_TOTAL,mat:match.ID_MATRICULA,eg:match.ID_SIMULACRO_HORARIO,group:match.ID_HORARIO_ACADEMICO});
    await ops.audit(tx,req.user,'RESULTADO_SIMULACRO',data.ID_RESULTADO,before?'CORREGIR':'CREAR',before,data,Motivo_Cambio);
    return {ok:true,codigo:data.ID_RESULTADO,corregido:!!before};
  });res.json(result);
});
post('/simulacros/:codigo/publicacion',async(req,res)=>{
  const {PUBLICADO}=req.body||{};if(typeof PUBLICADO!=='boolean'||Object.keys(req.body).length!==1)throw rule('Indica si se publican los resultados.');
  await ops.transaction(async tx=>{
    const rows=(await ops.query(tx,'SELECT * FROM dbo.SIMULACRO_HORARIO WITH (UPDLOCK,HOLDLOCK) WHERE ID_SIMULACRO=@exam',{exam:req.params.codigo})).recordset;
    if(!rows.length)throw rule('El simulacro no tiene grupos participantes.');
    for(const before of rows){
      if(before.ID_ESTADO_SIMULACRO==='CANCELADO'&&PUBLICADO)throw rule('No se puede publicar un simulacro cancelado.');
      await ops.query(tx,'UPDATE dbo.SIMULACRO_HORARIO SET PUBLICADO=@published WHERE ID_SIMULACRO_HORARIO=@code',{published:PUBLICADO,code:before.ID_SIMULACRO_HORARIO});
      await ops.audit(tx,req.user,'SIMULACRO_HORARIO',before.ID_SIMULACRO_HORARIO,PUBLICADO?'PUBLICAR':'RETIRAR_PUBLICACION',before,{...before,PUBLICADO},'Publicación administrativa');
    }
  });res.json({ok:true});
});
module.exports=router;
