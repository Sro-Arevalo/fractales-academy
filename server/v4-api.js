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
  const queries={
    programas:'SELECT Cod_Programa,Nomb_Programa FROM dbo.Programa WHERE Activo=1 ORDER BY Nomb_Programa',
    ciclos:"SELECT * FROM dbo.Ciclo WHERE ESTADO_CICLO_Cod_Estado IN ('ACTIVO','PROGRAMADO') ORDER BY Fech_Inicio DESC",
    grupos:`SELECT g.*,t.Nomb_Turno,a.Nomb_Aula,c.Nomb_Ciclo,c.Programa_Cod_Programa,c.Modalidad,c.Fech_Inicio,c.Fech_Fin,c.Nro_Mensualidades,c.Precio_Mensual
      FROM dbo.Grupo g JOIN dbo.Turno t ON t.Cod_Turno=g.Turno_Cod_Turno JOIN dbo.Aula a ON a.Cod_Aula=g.Aula_Cod_Aula JOIN dbo.Ciclo c ON c.Cod_Ciclo=g.Ciclo_Cod_Ciclo
      WHERE g.Activo=1 AND c.ESTADO_CICLO_Cod_Estado IN ('ACTIVO','PROGRAMADO') ORDER BY c.Fech_Inicio DESC,g.Nomb_Grupo`,
    carreras:'SELECT * FROM dbo.CARRERA ORDER BY Nomb_Carrera',
    parentescos:'SELECT * FROM dbo.PARENTESCO ORDER BY Tipo_Paren',
    asignaturas:`SELECT da.*,c.Nomb_Curso,d.Nom_Doc FROM dbo.Docente_Asignatura da JOIN dbo.CURSOS c ON c.Cod_Curso=da.CURSOS_Cod_Curso
      JOIN dbo.Docente d ON d.DNI_Doc=da.Docente_DNI_Doc WHERE c.Activa=1 AND d.Activo=1 ORDER BY c.Nomb_Curso,d.Nom_Doc`
  };
  const entries=await Promise.all(Object.entries(queries).map(async([key,text])=>[key,(await ops.query(null,text)).recordset]));
  res.json(Object.fromEntries(entries));
});
get('/alumnos/:dni/inscripcion',async(req,res)=>{
  const inputs={dni:dni(req.params.dni)};
  const alumno=(await ops.query(null,'SELECT * FROM dbo.ALUMNO WHERE DNI_Alu=@dni',inputs)).recordset[0]||null;
  const historial=(await ops.query(null,`SELECT m.Cod_Matricula,m.Fech_Matricula,g.Nomb_Grupo,c.Nomb_Ciclo,m.ESTADO_MATRICULA_Cod_Estado_Matricula
    FROM dbo.MATRICULA m JOIN dbo.Grupo g ON g.Cod_Grupo=m.Grupo_Cod_Grupo JOIN dbo.Ciclo c ON c.Cod_Ciclo=g.Ciclo_Cod_Ciclo
    WHERE m.ALUMNO_DNI_Alu=@dni ORDER BY m.Fech_Matricula DESC`,inputs)).recordset;
  res.json({alumno,historial});
});
post('/inscripciones',async(req,res)=>res.status(201).json(await ops.enroll(req.body,req.user)));
get('/pagos/alumno/:dni',async(req,res)=>{
  const inputs={dni:dni(req.params.dni)};
  const alumno=(await ops.query(null,'SELECT DNI_Alu,Nomb_Alu FROM dbo.ALUMNO WHERE DNI_Alu=@dni',inputs)).recordset[0];
  if(!alumno)return res.status(404).json({error:'Estudiante no encontrado.'});
  const rows=(await ops.query(null,`SELECT p.*,c.Nomb_Ciclo,g.Nomb_Grupo FROM dbo.Pago p LEFT JOIN dbo.MATRICULA m ON m.Cod_Matricula=p.MATRICULA_Cod_Matricula
    LEFT JOIN dbo.Grupo g ON g.Cod_Grupo=m.Grupo_Cod_Grupo LEFT JOIN dbo.Ciclo c ON c.Cod_Ciclo=g.Ciclo_Cod_Ciclo WHERE p.ALUMNO_DNI_Alu=@dni ORDER BY p.Fech_Vencimiento,p.Cod_Pago`,inputs)).recordset;
  res.json({alumno,rows});
});
get('/pagos/medios',async(req,res)=>res.json({rows:(await ops.query(null,'SELECT * FROM dbo.MEDIO_PAGO ORDER BY Nomb_Medio')).recordset}));
post('/pagos/medios',async(req,res)=>{
  const {codigo,nombre,activo=true}=req.body||{};
  if(!/^[A-Z0-9_-]{1,10}$/.test(codigo||'')||typeof nombre!=='string'||!nombre.trim()||nombre.length>60||typeof activo!=='boolean')throw rule('Código de medio obligatorio (1 a 10 caracteres A-Z, 0-9, _ o -), nombre hasta 60 caracteres y estado válido.');
  await ops.transaction(async tx=>{
    const before=(await ops.query(tx,'SELECT * FROM dbo.MEDIO_PAGO WITH (UPDLOCK,HOLDLOCK) WHERE Cod_Medio=@codigo',{codigo})).recordset[0];
    await ops.query(tx,before?'UPDATE dbo.MEDIO_PAGO SET Nomb_Medio=@nombre,Activo=@activo WHERE Cod_Medio=@codigo':'INSERT dbo.MEDIO_PAGO (Cod_Medio,Nomb_Medio,Activo) VALUES (@codigo,@nombre,@activo)',{codigo,nombre:nombre.trim(),activo});
    await ops.audit(tx,req.user,'MEDIO_PAGO',codigo,before?'ACTUALIZAR':'CREAR',before,{codigo,nombre,activo},null);
  });res.json({ok:true});
});
post('/pagos/:codigo/confirmar',async(req,res)=>res.json(await ops.payment(req.params.codigo,req.body,req.user)));
post('/pagos/:codigo/anular',async(req,res)=>res.json(await ops.payment(req.params.codigo,req.body,req.user,true)));
get('/auditoria/:entidad/:codigo',async(req,res)=>{
  if(!['Pago','Nota_Examen','Examen_Grupo','Examen','MATRICULA','MEDIO_PAGO'].includes(req.params.entidad)||req.params.codigo.length>20)throw rule('Referencia de historial inválida.');
  res.json({rows:(await ops.query(null,`SELECT Id,Accion,Anterior,Nuevo,Usuario_Cod_Usuario,Motivo,Fecha FROM dbo.Auditoria_V4
    WHERE Entidad=@entity AND Codigo=@code ORDER BY Id DESC`,{entity:req.params.entidad,code:req.params.codigo})).recordset});
});
get('/simulacros',async(req,res)=>res.json({rows:(await ops.query(null,`SELECT e.*,eg.Cod_examen_grupo,eg.Grupo_Cod_Grupo,eg.Fech_programada,eg.Publicado,g.Nomb_Grupo
  FROM dbo.Examen e LEFT JOIN dbo.Examen_Grupo eg ON eg.Examen_Cod_Examen=e.Cod_Examen LEFT JOIN dbo.Grupo g ON g.Cod_Grupo=eg.Grupo_Cod_Grupo
  ORDER BY eg.Fech_programada DESC,e.Cod_Examen,g.Nomb_Grupo`)).recordset}));
post('/simulacros',async(req,res)=>res.status(201).json(await ops.createExam(req.body,req.user)));
get('/simulacros/:codigo/alumno/:dni',async(req,res)=>{
  const rows=(await ops.query(null,`SELECT a.DNI_Alu,a.Nomb_Alu,m.Cod_Matricula,g.Nomb_Grupo,e.Nomb_Examen,e.puntaje_maximo,
    n.Cod_Nota,n.Puntaje_total,eg.Publicado FROM dbo.MATRICULA m JOIN dbo.ALUMNO a ON a.DNI_Alu=m.ALUMNO_DNI_Alu
    JOIN dbo.Grupo g ON g.Cod_Grupo=m.Grupo_Cod_Grupo JOIN dbo.Examen_Grupo eg ON eg.Grupo_Cod_Grupo=m.Grupo_Cod_Grupo
    JOIN dbo.Examen e ON e.Cod_Examen=eg.Examen_Cod_Examen LEFT JOIN dbo.Nota_Examen n ON n.MATRICULA_Cod_Matricula=m.Cod_Matricula AND n.Examen_Grupo_Cod_examen_grupo=eg.Cod_examen_grupo
    WHERE m.ALUMNO_DNI_Alu=@dni AND eg.Examen_Cod_Examen=@exam AND m.ESTADO_MATRICULA_Cod_Estado_Matricula<>'ANULADA'
    AND eg.ESTADO_EXAMEN_GRUPO_Cod_Estado_Examen<>'CANCELADO'`,{dni:dni(req.params.dni),exam:req.params.codigo})).recordset;
  if(rows.length!==1)throw rule('El alumno debe pertenecer a un único grupo participante del simulacro.');
  res.json({alumno:rows[0]});
});
post('/simulacros/:codigo/resultados',async(req,res)=>{
  const {DNI_Alu,Puntaje_total,Motivo_Cambio}=req.body||{};dni(DNI_Alu);
  if(Object.keys(req.body).some(k=>!['DNI_Alu','Puntaje_total','Motivo_Cambio'].includes(k)))throw rule('Campo de resultado desconocido.');
  validateFields(model.Nota_Examen,{Puntaje_total});
  if(typeof Puntaje_total!=='number')throw rule('Ingresa un único puntaje total.');
  const result=await ops.transaction(async tx=>{
    // Bloquear el examen serializa los resultados del mismo simulacro entre grupos.
    const exam=(await ops.query(tx,'SELECT Cod_Examen FROM dbo.Examen WITH (UPDLOCK,HOLDLOCK) WHERE Cod_Examen=@code',{code:req.params.codigo})).recordset[0];
    if(!exam)throw rule('Simulacro no encontrado.');
    const matches=(await ops.query(tx,`SELECT m.Cod_Matricula,m.Grupo_Cod_Grupo,eg.Cod_examen_grupo FROM dbo.MATRICULA m WITH (UPDLOCK,HOLDLOCK)
      JOIN dbo.Examen_Grupo eg ON eg.Grupo_Cod_Grupo=m.Grupo_Cod_Grupo WHERE m.ALUMNO_DNI_Alu=@dni AND eg.Examen_Cod_Examen=@exam
      AND m.ESTADO_MATRICULA_Cod_Estado_Matricula<>'ANULADA' AND eg.ESTADO_EXAMEN_GRUPO_Cod_Estado_Examen<>'CANCELADO'`,{dni:DNI_Alu,exam:req.params.codigo})).recordset;
    if(matches.length!==1)throw rule('El alumno debe tener una matrícula válida en un único grupo participante.');
    const match=matches[0];
    const before=(await ops.query(tx,'SELECT * FROM dbo.Nota_Examen WITH (UPDLOCK,HOLDLOCK) WHERE Examen_Grupo_Cod_examen_grupo=@eg AND MATRICULA_Cod_Matricula=@mat',{eg:match.Cod_examen_grupo,mat:match.Cod_Matricula})).recordset[0];
    if(before&&(typeof Motivo_Cambio!=='string'||Motivo_Cambio.trim().length<5||Motivo_Cambio.length>250))throw rule('Ya existe un resultado. Para corregirlo indica un motivo (5 a 250 caracteres).');
    const data={Cod_Nota:before?.Cod_Nota||await ops.nextCode(tx,'N4'),Puntaje_total,MATRICULA_Cod_Matricula:match.Cod_Matricula,Examen_Grupo_Cod_examen_grupo:match.Cod_examen_grupo,Grupo_Cod_Grupo:match.Grupo_Cod_Grupo};
    await validate('Nota_Examen',data,before,tx,req.user);
    await ops.query(tx,before?'UPDATE dbo.Nota_Examen SET Puntaje_total=@score WHERE Cod_Nota=@code':`INSERT dbo.Nota_Examen (Cod_Nota,Puntaje_total,MATRICULA_Cod_Matricula,Examen_Grupo_Cod_examen_grupo,Grupo_Cod_Grupo) VALUES (@code,@score,@mat,@eg,@group)`,before?{code:data.Cod_Nota,score:Puntaje_total}:{code:data.Cod_Nota,score:Puntaje_total,mat:match.Cod_Matricula,eg:match.Cod_examen_grupo,group:match.Grupo_Cod_Grupo});
    await ops.audit(tx,req.user,'Nota_Examen',data.Cod_Nota,before?'CORREGIR':'CREAR',before,data,Motivo_Cambio);
    return {ok:true,codigo:data.Cod_Nota,corregido:!!before};
  });res.json(result);
});
post('/simulacros/:codigo/publicacion',async(req,res)=>{
  const {Publicado}=req.body||{};if(typeof Publicado!=='boolean'||Object.keys(req.body).length!==1)throw rule('Indica si se publican los resultados.');
  await ops.transaction(async tx=>{
    const rows=(await ops.query(tx,'SELECT * FROM dbo.Examen_Grupo WITH (UPDLOCK,HOLDLOCK) WHERE Examen_Cod_Examen=@exam',{exam:req.params.codigo})).recordset;
    if(!rows.length)throw rule('El simulacro no tiene grupos participantes.');
    for(const before of rows){
      if(before.ESTADO_EXAMEN_GRUPO_Cod_Estado_Examen==='CANCELADO'&&Publicado)throw rule('No se puede publicar un simulacro cancelado.');
      await ops.query(tx,'UPDATE dbo.Examen_Grupo SET Publicado=@published WHERE Cod_examen_grupo=@code',{published:Publicado,code:before.Cod_examen_grupo});
      await ops.audit(tx,req.user,'Examen_Grupo',before.Cod_examen_grupo,Publicado?'PUBLICAR':'RETIRAR_PUBLICACION',before,{...before,Publicado},'Publicación administrativa');
    }
  });res.json({ok:true});
});
module.exports=router;
