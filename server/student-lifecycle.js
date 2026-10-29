'use strict';
const crypto=require('node:crypto');
const jwt=require('jsonwebtoken');
const ops=require('./operations');
const {rule}=require('./rules');
const {reason}=require('./account-security');
const schema=require('./schema-v43');
const quote=s=>'['+s.replace(/]/g,']]')+']';
const primary={ALUMNO:'DNI_ALUMNO',USUARIO:'ID_USUARIO',MATRICULA:'ID_MATRICULA',PAGO:'ID_PAGO',CODIGO_CUENTA:'ID',SEGURIDAD_USUARIO:'ID_USUARIO_RESPONSABLE',CONTACTO_VERIFICADO:'ID',SOLICITUD_CONTACTO:'ID',ESTADO_ALUMNO:'DNI_ALUMNO',RESULTADO_SIMULACRO:'ID_RESULTADO',ESTADO_RESULTADO:'ID_RESULTADO'};
const labels={ALUMNO:'Estudiante',USUARIO:'Cuenta de acceso',MATRICULA:'Matrículas',PAGO:'Obligaciones pendientes',CODIGO_CUENTA:'Códigos temporales',SEGURIDAD_USUARIO:'Control de sesiones',CONTACTO_VERIFICADO:'Contactos verificados',SOLICITUD_CONTACTO:'Solicitudes de contacto',ESTADO_ALUMNO:'ESTADO del estudiante',RESULTADO_SIMULACRO:'Resultados académicos de prueba',ESTADO_RESULTADO:'ESTADO de resultados de prueba'};
function secret(){if(!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32)throw Error('JWT_SECRET no configurado.');return process.env.JWT_SECRET;}
function digest(value){return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');}
function token(actor,scope,hash){return jwt.sign({sub:actor.ID_USUARIO,scope,hash},secret(),{expiresIn:'10m',issuer:'fractales-deletion',audience:'fractales-admin',algorithm:'HS256'});}
function verify(value,actor,scope,hash){
  try{const p=jwt.verify(value,secret(),{issuer:'fractales-deletion',audience:'fractales-admin',algorithms:['HS256']});if(p.sub!==actor.ID_USUARIO||p.scope!==scope||p.hash!==hash)throw Error();}
  catch{throw Object.assign(rule('La revisión expiró o los datos cambiaron. Revisa las dependencias nuevamente.'),{status:409});}
}
async function plan(tx,dni,actor){
  if(!/^\d{8}$/.test(dni||''))throw rule('DNI inválido.');
  await schema.required(tx);
  const rows=async(text,params={dni})=>(await ops.query(tx,text,params)).recordset;
  const student=(await rows('SELECT * FROM dbo.ALUMNO WITH (UPDLOCK,HOLDLOCK) WHERE DNI_ALUMNO=@dni'))[0];
  if(!student)throw Object.assign(rule('Estudiante no encontrado.'),{status:404});
  const entities={ALUMNO:[student]};
  entities.USUARIO=await rows('SELECT ID_USUARIO,NOMBRE_USUARIO,ID_ROL,DNI_ALUMNO,ACTIVO FROM dbo.USUARIO WITH (UPDLOCK,HOLDLOCK) WHERE DNI_ALUMNO=@dni ORDER BY ID_USUARIO');
  entities.MATRICULA=await rows('SELECT * FROM dbo.MATRICULA WITH (UPDLOCK,HOLDLOCK) WHERE DNI_ALUMNO=@dni ORDER BY ID_MATRICULA');
  entities.PAGO=await rows('SELECT * FROM dbo.PAGO WITH (UPDLOCK,HOLDLOCK) WHERE DNI_ALUMNO=@dni ORDER BY ID_PAGO');
  for(const table of ['ESTADO_ALUMNO','CONTACTO_VERIFICADO','SOLICITUD_CONTACTO'])entities[table]=await rows(`SELECT * FROM dbo.${quote(table)} WITH (UPDLOCK,HOLDLOCK) WHERE DNI_ALUMNO=@dni ORDER BY ${quote(primary[table])}`);
  entities.CODIGO_CUENTA=await rows(`SELECT c.ID,c.ID_USUARIO_RESPONSABLE,c.CONSUMIDO,c.INTENTOS,c.FECHA_VENCIMIENTO FROM dbo.CODIGO_CUENTA c WITH (UPDLOCK,HOLDLOCK) JOIN dbo.USUARIO u ON u.ID_USUARIO=c.ID_USUARIO_RESPONSABLE WHERE u.DNI_ALUMNO=@dni ORDER BY c.ID`);
  entities.SEGURIDAD_USUARIO=await rows(`SELECT s.* FROM dbo.SEGURIDAD_USUARIO s WITH (UPDLOCK,HOLDLOCK) JOIN dbo.USUARIO u ON u.ID_USUARIO=s.ID_USUARIO_RESPONSABLE WHERE u.DNI_ALUMNO=@dni ORDER BY s.ID_USUARIO_RESPONSABLE`);
  // Prueba se identifica al CREAR al alumno; el trigger impide reclasificar una persona real.
  // No basta con que la nota este anulada ni con escribir "prueba" en su nombre.
  entities.RESULTADO_SIMULACRO=[];entities.ESTADO_RESULTADO=[];
  if(student.ES_PRUEBA&&await require('./schema-v44').ready(tx)){
    entities.RESULTADO_SIMULACRO=await rows('SELECT n.* FROM dbo.RESULTADO_SIMULACRO n WITH(UPDLOCK,HOLDLOCK) JOIN dbo.MATRICULA m ON m.ID_MATRICULA=n.ID_MATRICULA WHERE m.DNI_ALUMNO=@dni ORDER BY n.ID_RESULTADO');
    entities.ESTADO_RESULTADO=await rows('SELECT s.* FROM dbo.ESTADO_RESULTADO s WITH(UPDLOCK,HOLDLOCK) JOIN dbo.RESULTADO_SIMULACRO n ON n.ID_RESULTADO=s.ID_RESULTADO JOIN dbo.MATRICULA m ON m.ID_MATRICULA=n.ID_MATRICULA WHERE m.DNI_ALUMNO=@dni ORDER BY s.ID_RESULTADO');
  }
  const blocked=[];
  if(!(await rows("SELECT ID FROM dbo.PAPELERA_REGISTRO WITH(UPDLOCK,HOLDLOCK) WHERE ENTIDAD='ALUMNO' AND ID_REGISTRO=@dni AND ESTADO='EN_PAPELERA'")).length)blocked.push('Envía al estudiante a papelera antes de eliminar definitivamente.');
  if(entities.ESTADO_ALUMNO[0]?.ACTIVO!==false&&entities.ESTADO_ALUMNO[0]?.ACTIVO!==0)blocked.push('Primero desactiva al estudiante. Sus matrículas y deudas permanecerán guardadas hasta confirmar la eliminación.');
  if(entities.USUARIO.some(u=>u.ACTIVO))blocked.push('Todas las cuentas del estudiante deben estar desactivadas.');
  if(entities.USUARIO.some(u=>u.ID_USUARIO===actor.ID_USUARIO||u.ID_ROL!=='ALUMNO'))blocked.push('No se puede eliminar una cuenta administradora ni la cuenta que realiza la operación.');
  const visible=(await ops.query(tx,"SELECT HAS_PERMS_BY_NAME(DB_NAME(),'DATABASE','VIEW DEFINITION') completo")).recordset[0];
  if(!visible?.completo)blocked.push('Se requiere permiso VIEW DEFINITION de la base para revisar todas las relaciones, incluidas las de otros esquemas.');
  if(entities.PAGO.some(p=>p.ID_ESTADO_PAGO!=='PENDIENTE'||p.FECHA_PAGO||p.ID_MEDIO_PAGO||p.ID_USUARIO_RESPONSABLE))blocked.push('Hay pagos realizados o información de cobro. Conserva el historial financiero y utiliza la desactivación.');
  const history=await rows(`SELECT a.ID,a.ENTIDAD,a.ID_REGISTRO,a.ACCION FROM dbo.AUDITORIA_SISTEMA a WITH (UPDLOCK,HOLDLOCK)
    WHERE (a.ENTIDAD='ALUMNO' AND a.ID_REGISTRO=@dni)
    OR (a.ENTIDAD='PAGO' AND (EXISTS(SELECT 1 FROM dbo.PAGO p WHERE p.DNI_ALUMNO=@dni AND p.ID_PAGO=a.ID_REGISTRO)
      OR JSON_VALUE(CASE WHEN ISJSON(a.DATOS_ANTERIORES)=1 THEN a.DATOS_ANTERIORES END,'$.DNI_ALUMNO')=@dni))
    OR (a.ENTIDAD='MATRICULA' AND EXISTS(SELECT 1 FROM dbo.MATRICULA m WHERE m.DNI_ALUMNO=@dni AND m.ID_MATRICULA=a.ID_REGISTRO)) ORDER BY a.ID`);
  if(history.some(a=>a.ENTIDAD==='PAGO'&&['CONFIRMAR_PAGO','ANULAR_CONFIRMACION'].includes(a.ACCION)))blocked.push('El historial contiene cobros, aunque se hayan anulado. No se elimina automáticamente.');
  // Revisar TODAS las FK efectivas, incluidas extensiones ajenas al modelo local.
  const metadata=await rows(`SELECT fk.object_id ID,fk.is_disabled Deshabilitada,fk.is_not_trusted NoConfiable,
    ps.name Esquema,pt.name NOMBRE_TABLA,pc.name Columna,rt.name Padre,rc.name Referencia
    FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fc ON fc.constraint_object_id=fk.object_id
    JOIN sys.tables pt ON pt.object_id=fc.parent_object_id JOIN sys.schemas ps ON ps.schema_id=pt.schema_id
    JOIN sys.columns pc ON pc.object_id=fc.parent_object_id AND pc.column_id=fc.parent_column_id
    JOIN sys.tables rt ON rt.object_id=fc.referenced_object_id JOIN sys.schemas rs ON rs.schema_id=rt.schema_id
    JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id
    WHERE rs.name='dbo' ORDER BY fk.object_id,fc.constraint_column_id`,{});
  const relations=new Map();for(const f of metadata){if(!entities[f.Padre])continue;if(!relations.has(f.ID))relations.set(f.ID,[]);relations.get(f.ID).push(f);}
  const extra=[];
  for(const fields of relations.values()){
    const first=fields[0];if(first.Deshabilitada||first.NoConfiable)blocked.push('Hay relaciones deshabilitadas o no confiables. Solicita revisar la integridad antes de eliminar.');
    for(const parent of entities[first.Padre]){
      if(fields.some(f=>!Object.hasOwn(parent,f.Referencia)))throw Object.assign(rule('Una relación adicional requiere revisar columnas protegidas. Solicita revisión administrativa antes de eliminar.'),{status:409});
      const inputs=Object.fromEntries(fields.map((f,i)=>['v'+i,parent[f.Referencia]]));
      const actual=Number((await ops.query(tx,`SELECT COUNT_BIG(*) n FROM ${quote(first.Esquema)}.${quote(first.NOMBRE_TABLA)} WITH (UPDLOCK,HOLDLOCK) WHERE ${fields.map((f,i)=>`${quote(f.Columna)}=@v${i}`).join(' AND ')}`,inputs)).recordset[0].n);
      const planned=first.Esquema==='dbo'?(entities[first.NOMBRE_TABLA]||[]).filter(r=>fields.every(f=>String(r[f.Columna])===String(parent[f.Referencia]))).length:0;
      if(actual>planned){extra.push({tabla:first.NOMBRE_TABLA,nombre:first.NOMBRE_TABLA==='RESULTADO_SIMULACRO'?'Resultados académicos históricos':`Información protegida: ${first.Esquema}.${first.NOMBRE_TABLA}`,cantidad:actual-planned});blocked.push(first.NOMBRE_TABLA==='RESULTADO_SIMULACRO'?'Existen resultados académicos históricos, incluso si fueron anulados. Deben conservarse.':`Existen relaciones protegidas en ${first.Esquema}.${first.NOMBRE_TABLA}. No se eliminarán automáticamente.`);}
    }
  }
  const dependencias=Object.entries(entities).filter(([,r])=>r.length).map(([tabla,r])=>({tabla,nombre:labels[tabla],cantidad:r.length})).concat(extra);
  const total=entities.PAGO.filter(p=>p.ID_ESTADO_PAGO==='PENDIENTE').reduce((n,p)=>n+Math.round(Number(p.MONTO)*100),0)/100;
  const result={dni,nombre:student.NOMBRE_COMPLETO,esPrueba:!!student.ES_PRUEBA,permitido:!blocked.length,bloqueos:[...new Set(blocked)],dependencias,totalPendiente:total,
    detalle:{estudiante:{dni,nombre:student.NOMBRE_COMPLETO,celular:student.CELULAR},cuentas:entities.USUARIO.map(u=>({usuario:u.NOMBRE_USUARIO,ACTIVO:!!u.ACTIVO})),matriculas:entities.MATRICULA.map(m=>({codigo:m.ID_MATRICULA,horario:m.ID_HORARIO_ACADEMICO,estado:m.ID_ESTADO_MATRICULA})),obligaciones:entities.PAGO.map(p=>({codigo:p.ID_PAGO,monto:Number(p.MONTO),estado:p.ID_ESTADO_PAGO})),notas:entities.RESULTADO_SIMULACRO.map(n=>({codigo:n.ID_RESULTADO,puntaje:n.PUNTAJE_TOTAL}))},
    conserva:'La auditoría permanece. Las notas de personas reales y cualquier historial de cobros bloquean la eliminación; puedes conservar todo mediante Desactivar.'};
  return {public:result,entities,hash:digest({entities,history,extra})};
}
async function execute(tx,p,actor,motive){
  if(!p.public.permitido)throw Object.assign(rule(p.public.bloqueos.join(' ')),{status:409});
  // Orden explícito; nunca DELETE CASCADE ni eliminación de auditorías.
  for(const table of ['ESTADO_RESULTADO','RESULTADO_SIMULACRO','SOLICITUD_CONTACTO','CONTACTO_VERIFICADO','CODIGO_CUENTA','SEGURIDAD_USUARIO','ESTADO_ALUMNO','PAGO','MATRICULA','USUARIO','ALUMNO']){
    for(const row of p.entities[table])await ops.query(tx,`DELETE FROM dbo.${quote(table)} WHERE ${quote(primary[table])}=@id`,{id:row[primary[table]]});
  }
  await ops.audit(tx,actor,'ALUMNO',p.public.dni,'ELIMINAR_CONTROLADO',null,{dependencias:p.public.dependencias,totalPendiente:p.public.totalPendiente,esPrueba:p.public.esPrueba,resultadosPrueba:p.public.detalle.notas},motive);
}
async function review(dni,actor){return ops.transaction(async tx=>{const p=await plan(tx,dni,actor);return {...p.public,revision:token(actor,'student:'+dni,p.hash)};});}
async function remove(dni,body,actor){
  return ops.transaction(tx=>removeInTransaction(tx,dni,body,actor));
}
async function removeInTransaction(tx,dni,body,actor){
  if(body?.confirmacion!=='ELIMINAR '+dni)throw rule('Escribe ELIMINAR seguido del DNI para confirmar la eliminación definitiva.');const motive=reason(body.motivo);
  const p=await plan(tx,dni,actor);verify(body.revision,actor,'student:'+dni,p.hash);await execute(tx,p,actor,motive);return {ok:true};
}
async function tests(actor){
  return ops.transaction(async tx=>{
    await schema.required(tx);const students=(await ops.query(tx,'SELECT TOP(51) DNI_ALUMNO FROM dbo.ALUMNO WITH (UPDLOCK,HOLDLOCK) WHERE ES_PRUEBA=1 ORDER BY DNI_ALUMNO')).recordset;
    const plans=[];for(const s of students.slice(0,50))plans.push(await plan(tx,s.DNI_ALUMNO,actor));
    return {rows:plans.map(p=>({...p.public,revision:token(actor,'student:'+p.public.dni,p.hash)})),hayMas:students.length>50};
  });
}
async function clean(body,actor){
  if(body?.confirmacion!=='ELIMINAR PRUEBAS')throw rule('Escribe ELIMINAR PRUEBAS para confirmar.');const motive=reason(body?.motivo);
  if(!Array.isArray(body.registros)||!body.registros.length||body.registros.length>50||body.registros.some(s=>!s||typeof s!=='object'||!/^\d{8}$/.test(s.dni||'')||typeof s.revision!=='string')||new Set(body.registros.map(s=>s.dni)).size!==body.registros.length)throw rule('Selecciona de 1 a 50 estudiantes de prueba sin duplicados y con su revisión vigente.');
  return ops.transaction(async tx=>{
    const plans=[];
    for(const selected of [...body.registros].sort((a,b)=>String(a.dni).localeCompare(String(b.dni)))){
      const p=await plan(tx,selected.dni,actor);if(!p.public.esPrueba)throw rule('La limpieza solo admite estudiantes identificados como prueba al crearlos.');
      verify(selected.revision,actor,'student:'+selected.dni,p.hash);if(!p.public.permitido)throw Object.assign(rule(p.public.bloqueos.join(' ')),{status:409});plans.push(p);
    }
    for(const p of plans){await execute(tx,p,actor,motive);await ops.query(tx,"UPDATE dbo.PAPELERA_REGISTRO SET ESTADO='ELIMINADO',NOMBRE=N'Registro eliminado',FECHA_RESOLUCION=SYSUTCDATETIME() WHERE ENTIDAD='ALUMNO' AND ID_REGISTRO=@dni AND ESTADO='EN_PAPELERA'",{dni:p.public.dni});}
    return {ok:true,eliminados:plans.length};
  });
}
module.exports={review,remove,tests,clean,removeInTransaction,digest,token,verify};
