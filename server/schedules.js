'use strict';
const ops=require('./operations'),{rule,timeHHMM}=require('./rules'),schema=require('./schema-v44');
const fail=message=>Object.assign(rule(message),{status:409});
function minute(t){if(typeof t!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(t))throw rule('Usa horas válidas con formato HH:mm.');return Number(t.slice(0,2))*60+Number(t.slice(3));}
function parse(body){
  if(!body||Array.isArray(body)||Object.keys(body).some(k=>!['nombre','ciclo','modalidad','turno','aula','capacidad','estado','version','bloques'].includes(k)))throw rule('Datos del horario inválidos.');
  for(const k of ['nombre','ciclo','turno','aula'])if(typeof body[k]!=='string'||!body[k].trim()||body[k].length>({nombre:60,ciclo:20,turno:10,aula:10})[k])throw rule('Completa nombre (hasta 60 caracteres), ciclo, turno y aula válidos.');
  if(!['REGULAR','ACELERADO'].includes(body.modalidad)||!['BORRADOR','PUBLICADO'].includes(body.estado)||!Number.isInteger(body.capacidad)||body.capacidad<1||body.capacidad>10000)throw rule('Revisa modalidad, estado y capacidad.');
  if(!Array.isArray(body.bloques)||body.bloques.length>200)throw rule('El horario admite hasta 200 bloques.');
  const blocks=body.bloques.map(b=>{
    if(!b||Object.keys(b).some(k=>!['dia','inicio','fin','tipo','curso','docente','excepcion','motivo'].includes(k))||!Number.isInteger(b.dia)||b.dia<1||b.dia>7||!['CLASE','RECREO'].includes(b.tipo)||b.excepcion!==undefined&&typeof b.excepcion!=='boolean')throw rule('Bloque académico inválido.');
    if(minute(b.inicio)>=minute(b.fin))throw rule('La hora de término debe ser posterior al inicio.');
    if(b.tipo==='CLASE'&&(typeof b.curso!=='string'||!b.curso||b.curso.length>10||typeof b.docente!=='string'||!/^\d{8}$/.test(b.docente)))throw rule('Cada clase necesita un curso y un docente.');
    if(b.excepcion&&(typeof b.motivo!=='string'||b.motivo.trim().length<5||b.motivo.length>250))throw rule('La excepción de turno necesita un motivo de 5 a 250 caracteres.');
    return {...b,curso:b.tipo==='CLASE'?b.curso:null,docente:b.tipo==='CLASE'?b.docente:null,excepcion:!!b.excepcion,motivo:b.excepcion?b.motivo.trim():null};
  }).sort((a,b)=>a.dia-b.dia||a.inicio.localeCompare(b.inicio));
  for(let i=1;i<blocks.length;i++)if(blocks[i].dia===blocks[i-1].dia&&minute(blocks[i].inicio)<minute(blocks[i-1].fin))throw rule('Hay dos bloques superpuestos dentro del horario.');
  if(body.estado==='PUBLICADO'&&!blocks.some(b=>b.tipo==='CLASE'))throw rule('Agrega al menos una clase antes de publicar. Puedes guardar un borrador vacío.');
  return {...body,nombre:body.nombre.trim(),bloques:blocks};
}
async function lock(tx){
  // Todas las escrituras del horario y sus estados usan el mismo bloqueo de transaccion.
  const r=(await ops.query(tx,"DECLARE @r int; EXEC @r=sys.sp_getapplock @Resource='Fractales/Horarios/V44',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000; SELECT @r resultado;")).recordset[0];
  if(r.resultado<0)throw fail('Otro administrador está guardando horarios. Intenta nuevamente.');
}
async function list(){await schema.required();return {rows:(await ops.query(null,`SELECT g.*,c.Nomb_Ciclo,c.Modalidad,c.Fech_Inicio,c.Fech_Fin,t.Nomb_Turno,a.Nomb_Aula,
 (SELECT COUNT(*) FROM dbo.Horario h WHERE h.Grupo_Cod_Grupo=g.Cod_Grupo) Bloques,
 (SELECT COUNT(*) FROM dbo.MATRICULA m WHERE m.Grupo_Cod_Grupo=g.Cod_Grupo AND m.ESTADO_MATRICULA_Cod_Estado_Matricula='ACTIVA') Matriculas
 FROM dbo.Grupo g JOIN dbo.Ciclo c ON c.Cod_Ciclo=g.Ciclo_Cod_Ciclo JOIN dbo.Turno t ON t.Cod_Turno=g.Turno_Cod_Turno JOIN dbo.Aula a ON a.Cod_Aula=g.Aula_Cod_Aula ORDER BY c.Fech_Inicio DESC,g.Nomb_Grupo`)).recordset};}
async function detail(id){await schema.required();return ops.transaction(async tx=>{
 const header=(await ops.query(tx,'SELECT g.*,c.Modalidad FROM dbo.Grupo g WITH(HOLDLOCK) JOIN dbo.Ciclo c ON c.Cod_Ciclo=g.Ciclo_Cod_Ciclo WHERE Cod_Grupo=@id',{id})).recordset[0];
 if(!header)throw Object.assign(rule('Horario no encontrado.'),{status:404});
 const blocks=(await ops.query(tx,'SELECT * FROM dbo.Horario WITH(HOLDLOCK) WHERE Grupo_Cod_Grupo=@id ORDER BY Dia_Semana,Hr_Inicio,Cod_Horario',{id})).recordset;
 return {header,bloques:blocks.map(b=>({dia:b.Dia_Semana,inicio:timeHHMM(b.Hr_Inicio),fin:timeHHMM(b.Hr_Fin),tipo:b.TIPO_BLOQUE_Cod_Tipo,curso:b.Docente_Asignatura_CURSOS_Cod_Curso,docente:b.Docente_Asignatura_Docente_DNI_Doc,excepcion:!!b.Excepcion_Turno,motivo:b.Motivo_Excepcion}))};
});}
async function save(id,body,actor){
 if(actor.rol!=='ADMIN'&&actor.ROL_Cod_Rol!=='ADMIN')throw Object.assign(rule('Solo administradores pueden guardar horarios.'),{status:403});
 const data=parse(body);
 return ops.transaction(async tx=>{
  await schema.required(tx);await lock(tx);
  const before=id?(await ops.query(tx,'SELECT * FROM dbo.Grupo WITH(UPDLOCK,HOLDLOCK) WHERE Cod_Grupo=@id',{id})).recordset[0]:null;
  if(id&&!before)throw Object.assign(rule('Horario no encontrado.'),{status:404});
  if(before&&(!Number.isInteger(data.version)||data.version!==before.Version_Horario))throw fail('El horario cambió desde que lo abriste. Recarga antes de guardar.');
  if(before&&!before.Activo)throw fail('Reactiva el horario antes de editarlo.');
  const context=(await ops.query(tx,`SELECT c.*,a.Capacidad,a.Activa,p.Activo ProgramaActivo,t.Hr_Inicio,t.Hr_Fin FROM dbo.Ciclo c WITH(UPDLOCK,HOLDLOCK)
   JOIN dbo.Programa p ON p.Cod_Programa=c.Programa_Cod_Programa CROSS JOIN dbo.Aula a WITH(UPDLOCK,HOLDLOCK) CROSS JOIN dbo.Turno t
   WHERE c.Cod_Ciclo=@ciclo AND a.Cod_Aula=@aula AND t.Cod_Turno=@turno`,{ciclo:data.ciclo,aula:data.aula,turno:data.turno})).recordset[0];
  if(!context||!context.Activa||!context.ProgramaActivo||!['ACTIVO','PROGRAMADO'].includes(context.ESTADO_CICLO_Cod_Estado)||context.Modalidad!==data.modalidad)throw rule('El ciclo, modalidad, aula o turno no está disponible.');
  if(data.capacidad>context.Capacidad)throw rule('El cupo supera la capacidad del aula.');
  const occupied=id?Number((await ops.query(tx,"SELECT COUNT(*) n FROM dbo.MATRICULA WITH(UPDLOCK,HOLDLOCK) WHERE Grupo_Cod_Grupo=@id AND ESTADO_MATRICULA_Cod_Estado_Matricula='ACTIVA'",{id})).recordset[0].n):0;
  if(data.capacidad<occupied)throw rule('El cupo no puede ser menor que las matrículas activas.');
  if(before&&before.Ciclo_Cod_Ciclo!==data.ciclo&&(await ops.query(tx,'SELECT TOP(1) Cod_Matricula FROM dbo.MATRICULA WITH(UPDLOCK,HOLDLOCK) WHERE Grupo_Cod_Grupo=@id',{id})).recordset.length)throw rule('Un horario con matrículas conserva su ciclo. Duplica como borrador para otro período.');
  if(data.estado==='PUBLICADO'&&(await ops.query(tx,"SELECT TOP(1) Cod_Grupo FROM dbo.Grupo WITH(UPDLOCK,HOLDLOCK) WHERE Activo=1 AND Estado_Horario='PUBLICADO' AND Ciclo_Cod_Ciclo=@ciclo AND Turno_Cod_Turno=@turno AND Aula_Cod_Aula=@aula AND Cod_Grupo<>@id",{ciclo:data.ciclo,turno:data.turno,aula:data.aula,id:id||''})).recordset.length)throw fail('Ya existe un horario activo para este ciclo, turno y aula. Edita el existente.');
  const code=id||await ops.nextCode(tx,'G4');
  if((await ops.query(tx,'SELECT TOP(1) Cod_Grupo FROM dbo.Grupo WITH(UPDLOCK,HOLDLOCK) WHERE Ciclo_Cod_Ciclo=@ciclo AND Nomb_Grupo=@nombre AND Cod_Grupo<>@id',{ciclo:data.ciclo,nombre:data.nombre,id:id||''})).recordset.length)throw fail('Ya existe un horario con este nombre en el ciclo. Usa un nombre identificador diferente.');
  const previous=id?(await ops.query(tx,'SELECT * FROM dbo.Horario WITH(UPDLOCK,HOLDLOCK) WHERE Grupo_Cod_Grupo=@id',{id})).recordset:[];
  // Dependencias adicionales de un bloque impiden sustituirlo: FK revierte toda la transaccion.
  if(id)await ops.query(tx,'DELETE dbo.Horario WHERE Grupo_Cod_Grupo=@id',{id});
  await ops.query(tx,before?`UPDATE dbo.Grupo SET Nomb_Grupo=@nombre,Cupo_Max=@capacidad,Ciclo_Cod_Ciclo=@ciclo,Turno_Cod_Turno=@turno,Aula_Cod_Aula=@aula,Estado_Horario=@estado,Version_Horario=Version_Horario+1 WHERE Cod_Grupo=@code`:
   `INSERT dbo.Grupo(Cod_Grupo,Nomb_Grupo,Cupo_Max,Ciclo_Cod_Ciclo,Turno_Cod_Turno,Aula_Cod_Aula,Estado_Horario) VALUES(@code,@nombre,@capacidad,@ciclo,@turno,@aula,@estado)`,{nombre:data.nombre,capacidad:data.capacidad,ciclo:data.ciclo,turno:data.turno,aula:data.aula,estado:data.estado,code});
  for(const b of data.bloques){
   if((b.inicio<timeHHMM(context.Hr_Inicio)||b.fin>timeHHMM(context.Hr_Fin))&&!b.excepcion)throw rule('Un bloque está fuera del turno. Autoriza una excepción con motivo o corrige la hora.');
   if(b.tipo==='CLASE'){
    if(!(await ops.query(tx,'SELECT c.Cod_Curso FROM dbo.CURSOS c WITH(UPDLOCK,HOLDLOCK) CROSS JOIN dbo.Docente d WITH(UPDLOCK,HOLDLOCK) WHERE c.Cod_Curso=@curso AND c.Activa=1 AND d.DNI_Doc=@docente AND d.Activo=1',b)).recordset.length)throw rule('Selecciona cursos y docentes activos.');
    await ops.query(tx,'IF NOT EXISTS(SELECT 1 FROM dbo.Docente_Asignatura WITH(UPDLOCK,HOLDLOCK) WHERE CURSOS_Cod_Curso=@curso AND Docente_DNI_Doc=@docente) INSERT dbo.Docente_Asignatura(CURSOS_Cod_Curso,Docente_DNI_Doc) VALUES(@curso,@docente)',b);
   }
   if(data.estado==='PUBLICADO'){
    const conflict=(await ops.query(tx,`SELECT TOP(1) g.Nomb_Grupo FROM dbo.Horario h WITH(UPDLOCK,HOLDLOCK) JOIN dbo.Grupo g ON g.Cod_Grupo=h.Grupo_Cod_Grupo JOIN dbo.Ciclo c ON c.Cod_Ciclo=g.Ciclo_Cod_Ciclo
     WHERE h.Activo=1 AND g.Activo=1 AND h.Grupo_Cod_Grupo<>@code AND h.Dia_Semana=@dia AND h.Hr_Inicio<CONVERT(time,@fin) AND CONVERT(time,@inicio)<h.Hr_Fin
     AND c.Fech_Inicio<=@end AND @start<=c.Fech_Fin AND (g.Aula_Cod_Aula=@aula OR h.Docente_Asignatura_Docente_DNI_Doc=@docente)`,{...b,code,aula:data.aula,start:context.Fech_Inicio,end:context.Fech_Fin})).recordset[0];
    if(conflict)throw fail('Cruce de aula o docente con «'+conflict.Nomb_Grupo+'».');
   }
   await ops.query(tx,`INSERT dbo.Horario(Cod_Horario,Dia_Semana,Hr_Inicio,Hr_Fin,Activo,Grupo_Cod_Grupo,TIPO_BLOQUE_Cod_Tipo,Docente_Asignatura_CURSOS_Cod_Curso,Docente_Asignatura_Docente_DNI_Doc,Excepcion_Turno,Motivo_Excepcion,Autorizado_Por)
    VALUES(@block,@dia,CONVERT(time,@inicio),CONVERT(time,@fin),@activo,@code,@tipo,@curso,@docente,@excepcion,@motivo,@actor)`,{...b,block:await ops.nextCode(tx,'H4'),code,activo:data.estado==='PUBLICADO',actor:b.excepcion?actor.Cod_Usuario:null});
  }
  await ops.audit(tx,actor,'Grupo',code,before?'GUARDAR_HORARIO':'CREAR',before?{...before,bloques:previous}:null,data,'Guardado transaccional del horario semanal completo');
  return {ok:true,id:code,version:(before?.Version_Horario||0)+1,estado:data.estado,bloques:data.bloques.length};
 });
}
module.exports={parse,lock,list,detail,save};
