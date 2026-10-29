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
async function list(){await schema.required();return {rows:(await ops.query(null,`SELECT g.*,c.NOMBRE_CICLO,c.MODALIDAD,c.FECHA_INICIO,c.FECHA_FIN,t.NOMBRE_TURNO,a.NOMBRE_AULA,
 (SELECT COUNT(*) FROM dbo.BLOQUE_HORARIO h WHERE h.ID_HORARIO_ACADEMICO=g.ID_HORARIO_ACADEMICO) Bloques,
 (SELECT COUNT(*) FROM dbo.MATRICULA m WHERE m.ID_HORARIO_ACADEMICO=g.ID_HORARIO_ACADEMICO AND m.ID_ESTADO_MATRICULA='ACTIVA') Matriculas
 FROM dbo.HORARIO_ACADEMICO g JOIN dbo.CICLO c ON c.ID_CICLO=g.ID_CICLO JOIN dbo.TURNO t ON t.ID_TURNO=g.ID_TURNO JOIN dbo.AULA a ON a.ID_AULA=g.ID_AULA WHERE ${require('./trash').visible(require('./model.json').HORARIO_ACADEMICO,'g')} ORDER BY c.FECHA_INICIO DESC,g.NOMBRE_HORARIO`)).recordset};}
async function detail(id){await schema.required();return ops.transaction(async tx=>{
 const header=(await ops.query(tx,'SELECT g.*,c.MODALIDAD FROM dbo.HORARIO_ACADEMICO g WITH(HOLDLOCK) JOIN dbo.CICLO c ON c.ID_CICLO=g.ID_CICLO WHERE ID_HORARIO_ACADEMICO=@id',{id})).recordset[0];
 if(!header)throw Object.assign(rule('BLOQUE_HORARIO no encontrado.'),{status:404});
 const blocks=(await ops.query(tx,'SELECT * FROM dbo.BLOQUE_HORARIO WITH(HOLDLOCK) WHERE ID_HORARIO_ACADEMICO=@id ORDER BY DIA_SEMANA,HORA_INICIO,ID_BLOQUE_HORARIO',{id})).recordset;
 return {header,bloques:blocks.map(b=>({dia:b.DIA_SEMANA,inicio:timeHHMM(b.HORA_INICIO),fin:timeHHMM(b.HORA_FIN),tipo:b.ID_TIPO_BLOQUE,curso:b.ID_CURSO,docente:b.DNI_DOCENTE,excepcion:!!b.EXCEPCION_TURNO,motivo:b.MOTIVO_EXCEPCION}))};
});}
async function save(id,body,actor){
 if(actor.rol!=='ADMIN'&&actor.ID_ROL!=='ADMIN')throw Object.assign(rule('Solo administradores pueden guardar horarios.'),{status:403});
 const data=parse(body);
 return ops.transaction(async tx=>{
  await schema.required(tx);await lock(tx);
  const before=id?(await ops.query(tx,'SELECT * FROM dbo.HORARIO_ACADEMICO WITH(UPDLOCK,HOLDLOCK) WHERE ID_HORARIO_ACADEMICO=@id',{id})).recordset[0]:null;
  if(id&&!before)throw Object.assign(rule('BLOQUE_HORARIO no encontrado.'),{status:404});
  if(before&&(!Number.isInteger(data.version)||data.version!==before.VERSION_HORARIO))throw fail('El horario cambió desde que lo abriste. Recarga antes de guardar.');
  if(before&&!before.ACTIVO)throw fail('Reactiva el horario antes de editarlo.');
  const context=(await ops.query(tx,`SELECT c.*,a.CAPACIDAD,a.ACTIVO,p.ACTIVO ProgramaActivo,t.HORA_INICIO,t.HORA_FIN FROM dbo.CICLO c WITH(UPDLOCK,HOLDLOCK)
   JOIN dbo.PROGRAMA p ON p.ID_PROGRAMA=c.ID_PROGRAMA CROSS JOIN dbo.AULA a WITH(UPDLOCK,HOLDLOCK) CROSS JOIN dbo.TURNO t
   WHERE c.ID_CICLO=@ciclo AND a.ID_AULA=@aula AND t.ID_TURNO=@turno`,{ciclo:data.ciclo,aula:data.aula,turno:data.turno})).recordset[0];
  if(!context||!context.ACTIVO||!context.ProgramaActivo||!['ACTIVO','PROGRAMADO'].includes(context.ID_ESTADO_CICLO)||context.MODALIDAD!==data.modalidad)throw rule('El ciclo, modalidad, aula o turno no está disponible.');
  if(data.capacidad>context.CAPACIDAD)throw rule('El cupo supera la capacidad del aula.');
  const occupied=id?Number((await ops.query(tx,"SELECT COUNT(*) n FROM dbo.MATRICULA WITH(UPDLOCK,HOLDLOCK) WHERE ID_HORARIO_ACADEMICO=@id AND ID_ESTADO_MATRICULA='ACTIVA'",{id})).recordset[0].n):0;
  if(data.capacidad<occupied)throw rule('El cupo no puede ser menor que las matrículas activas.');
  if(before&&before.ID_CICLO!==data.ciclo&&(await ops.query(tx,'SELECT TOP(1) ID_MATRICULA FROM dbo.MATRICULA WITH(UPDLOCK,HOLDLOCK) WHERE ID_HORARIO_ACADEMICO=@id',{id})).recordset.length)throw rule('Un horario con matrículas conserva su ciclo. Duplica como borrador para otro período.');
  if(data.estado==='PUBLICADO'&&(await ops.query(tx,"SELECT TOP(1) ID_HORARIO_ACADEMICO FROM dbo.HORARIO_ACADEMICO WITH(UPDLOCK,HOLDLOCK) WHERE ACTIVO=1 AND ESTADO_HORARIO='PUBLICADO' AND ID_CICLO=@ciclo AND ID_TURNO=@turno AND ID_AULA=@aula AND ID_HORARIO_ACADEMICO<>@id",{ciclo:data.ciclo,turno:data.turno,aula:data.aula,id:id||''})).recordset.length)throw fail('Ya existe un horario ACTIVO para este ciclo, turno y aula. Edita el existente.');
  const code=id||await ops.nextCode(tx,'G4');
  if((await ops.query(tx,'SELECT TOP(1) ID_HORARIO_ACADEMICO FROM dbo.HORARIO_ACADEMICO WITH(UPDLOCK,HOLDLOCK) WHERE ID_CICLO=@ciclo AND NOMBRE_HORARIO=@nombre AND ID_HORARIO_ACADEMICO<>@id',{ciclo:data.ciclo,nombre:data.nombre,id:id||''})).recordset.length)throw fail('Ya existe un horario con este nombre en el ciclo. Usa un nombre identificador diferente.');
  const previous=id?(await ops.query(tx,'SELECT * FROM dbo.BLOQUE_HORARIO WITH(UPDLOCK,HOLDLOCK) WHERE ID_HORARIO_ACADEMICO=@id',{id})).recordset:[];
  // Dependencias adicionales de un bloque impiden sustituirlo: FK revierte toda la transaccion.
  if(id)await ops.query(tx,'DELETE dbo.BLOQUE_HORARIO WHERE ID_HORARIO_ACADEMICO=@id',{id});
  await ops.query(tx,before?`UPDATE dbo.HORARIO_ACADEMICO SET NOMBRE_HORARIO=@nombre,CAPACIDAD_MAXIMA=@capacidad,ID_CICLO=@ciclo,ID_TURNO=@turno,ID_AULA=@aula,ESTADO_HORARIO=@estado,VERSION_HORARIO=VERSION_HORARIO+1 WHERE ID_HORARIO_ACADEMICO=@code`:
   `INSERT dbo.HORARIO_ACADEMICO(ID_HORARIO_ACADEMICO,NOMBRE_HORARIO,CAPACIDAD_MAXIMA,ID_CICLO,ID_TURNO,ID_AULA,ESTADO_HORARIO) VALUES(@code,@nombre,@capacidad,@ciclo,@turno,@aula,@estado)`,{nombre:data.nombre,capacidad:data.capacidad,ciclo:data.ciclo,turno:data.turno,aula:data.aula,estado:data.estado,code});
  for(const b of data.bloques){
   if((b.inicio<timeHHMM(context.HORA_INICIO)||b.fin>timeHHMM(context.HORA_FIN))&&!b.excepcion)throw rule('Un bloque está fuera del turno. Autoriza una excepción con motivo o corrige la hora.');
   if(b.tipo==='CLASE'){
    if(!(await ops.query(tx,'SELECT c.ID_CURSO FROM dbo.CURSO c WITH(UPDLOCK,HOLDLOCK) CROSS JOIN dbo.DOCENTE d WITH(UPDLOCK,HOLDLOCK) WHERE c.ID_CURSO=@curso AND c.ACTIVO=1 AND d.DNI_DOCENTE=@docente AND d.ACTIVO=1',b)).recordset.length)throw rule('Selecciona cursos y docentes activos.');
    await ops.query(tx,'IF NOT EXISTS(SELECT 1 FROM dbo.CURSO_DOCENTE WITH(UPDLOCK,HOLDLOCK) WHERE ID_CURSO=@curso AND DNI_DOCENTE=@docente) INSERT dbo.CURSO_DOCENTE(ID_CURSO,DNI_DOCENTE) VALUES(@curso,@docente)',b);
   }
   if(data.estado==='PUBLICADO'){
    const conflict=(await ops.query(tx,`SELECT TOP(1) g.NOMBRE_HORARIO FROM dbo.BLOQUE_HORARIO h WITH(UPDLOCK,HOLDLOCK) JOIN dbo.HORARIO_ACADEMICO g ON g.ID_HORARIO_ACADEMICO=h.ID_HORARIO_ACADEMICO JOIN dbo.CICLO c ON c.ID_CICLO=g.ID_CICLO
     WHERE h.ACTIVO=1 AND g.ACTIVO=1 AND h.ID_HORARIO_ACADEMICO<>@code AND h.DIA_SEMANA=@dia AND h.HORA_INICIO<CONVERT(time,@fin) AND CONVERT(time,@inicio)<h.HORA_FIN
     AND c.FECHA_INICIO<=@end AND @start<=c.FECHA_FIN AND (g.ID_AULA=@aula OR h.DNI_DOCENTE=@docente)`,{...b,code,aula:data.aula,start:context.FECHA_INICIO,end:context.FECHA_FIN})).recordset[0];
    if(conflict)throw fail('Cruce de aula o docente con «'+conflict.NOMBRE_HORARIO+'».');
   }
   await ops.query(tx,`INSERT dbo.BLOQUE_HORARIO(ID_BLOQUE_HORARIO,DIA_SEMANA,HORA_INICIO,HORA_FIN,ACTIVO,ID_HORARIO_ACADEMICO,ID_TIPO_BLOQUE,ID_CURSO,DNI_DOCENTE,EXCEPCION_TURNO,MOTIVO_EXCEPCION,ID_USUARIO_AUTORIZADOR)
    VALUES(@block,@dia,CONVERT(time,@inicio),CONVERT(time,@fin),@ACTIVO,@code,@tipo,@curso,@docente,@excepcion,@motivo,@actor)`,{...b,block:await ops.nextCode(tx,'H4'),code,ACTIVO:data.estado==='PUBLICADO',actor:b.excepcion?actor.ID_USUARIO:null});
  }
  await ops.audit(tx,actor,'HORARIO_ACADEMICO',code,before?'GUARDAR_HORARIO':'CREAR',before?{...before,bloques:previous}:null,data,'Guardado transaccional del horario semanal completo');
  return {ok:true,id:code,version:(before?.VERSION_HORARIO||0)+1,estado:data.estado,bloques:data.bloques.length};
 });
}
module.exports={parse,lock,list,detail,save};
