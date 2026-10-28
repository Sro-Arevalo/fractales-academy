'use strict';
const crypto=require('node:crypto');
const jwt=require('jsonwebtoken');
const ops=require('./operations');
const {rule}=require('./rules');
const {reason}=require('./account-security');
const schema=require('./schema-v43');
const quote=s=>'['+s.replace(/]/g,']]')+']';
const primary={ALUMNO:'DNI_Alu',Usuario:'Cod_Usuario',MATRICULA:'Cod_Matricula',Pago:'Cod_Pago',Cuenta_Codigo_V41:'Id',Usuario_Seguridad_V41:'Usuario_Cod_Usuario',Contacto_Verificado_V41:'Id',Solicitud_Contacto_V41:'Id',Alumno_Estado_V41:'ALUMNO_DNI_Alu',Nota_Examen:'Cod_Nota',Nota_Estado_V41:'Nota_Examen_Cod_Nota'};
const labels={ALUMNO:'Estudiante',Usuario:'Cuenta de acceso',MATRICULA:'Matrículas',Pago:'Obligaciones pendientes',Cuenta_Codigo_V41:'Códigos temporales',Usuario_Seguridad_V41:'Control de sesiones',Contacto_Verificado_V41:'Contactos verificados',Solicitud_Contacto_V41:'Solicitudes de contacto',Alumno_Estado_V41:'Estado del estudiante',Nota_Examen:'Resultados académicos de prueba',Nota_Estado_V41:'Estado de resultados de prueba'};
function secret(){if(!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32)throw Error('JWT_SECRET no configurado.');return process.env.JWT_SECRET;}
function digest(value){return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');}
function token(actor,scope,hash){return jwt.sign({sub:actor.Cod_Usuario,scope,hash},secret(),{expiresIn:'10m',issuer:'fractales-deletion',audience:'fractales-admin',algorithm:'HS256'});}
function verify(value,actor,scope,hash){
  try{const p=jwt.verify(value,secret(),{issuer:'fractales-deletion',audience:'fractales-admin',algorithms:['HS256']});if(p.sub!==actor.Cod_Usuario||p.scope!==scope||p.hash!==hash)throw Error();}
  catch{throw Object.assign(rule('La revisión expiró o los datos cambiaron. Revisa las dependencias nuevamente.'),{status:409});}
}
async function plan(tx,dni,actor){
  if(!/^\d{8}$/.test(dni||''))throw rule('DNI inválido.');
  await schema.required(tx);
  const rows=async(text,params={dni})=>(await ops.query(tx,text,params)).recordset;
  const student=(await rows('SELECT * FROM dbo.ALUMNO WITH (UPDLOCK,HOLDLOCK) WHERE DNI_Alu=@dni'))[0];
  if(!student)throw Object.assign(rule('Estudiante no encontrado.'),{status:404});
  const entities={ALUMNO:[student]};
  entities.Usuario=await rows('SELECT Cod_Usuario,Nomb_Usuario,ROL_Cod_Rol,ALUMNO_DNI_Alu,Activo FROM dbo.Usuario WITH (UPDLOCK,HOLDLOCK) WHERE ALUMNO_DNI_Alu=@dni ORDER BY Cod_Usuario');
  entities.MATRICULA=await rows('SELECT * FROM dbo.MATRICULA WITH (UPDLOCK,HOLDLOCK) WHERE ALUMNO_DNI_Alu=@dni ORDER BY Cod_Matricula');
  entities.Pago=await rows('SELECT * FROM dbo.Pago WITH (UPDLOCK,HOLDLOCK) WHERE ALUMNO_DNI_Alu=@dni ORDER BY Cod_Pago');
  for(const table of ['Alumno_Estado_V41','Contacto_Verificado_V41','Solicitud_Contacto_V41'])entities[table]=await rows(`SELECT * FROM dbo.${quote(table)} WITH (UPDLOCK,HOLDLOCK) WHERE ALUMNO_DNI_Alu=@dni ORDER BY ${quote(primary[table])}`);
  entities.Cuenta_Codigo_V41=await rows(`SELECT c.Id,c.Usuario_Cod_Usuario,c.Consumido,c.Intentos,c.Expira FROM dbo.Cuenta_Codigo_V41 c WITH (UPDLOCK,HOLDLOCK) JOIN dbo.Usuario u ON u.Cod_Usuario=c.Usuario_Cod_Usuario WHERE u.ALUMNO_DNI_Alu=@dni ORDER BY c.Id`);
  entities.Usuario_Seguridad_V41=await rows(`SELECT s.* FROM dbo.Usuario_Seguridad_V41 s WITH (UPDLOCK,HOLDLOCK) JOIN dbo.Usuario u ON u.Cod_Usuario=s.Usuario_Cod_Usuario WHERE u.ALUMNO_DNI_Alu=@dni ORDER BY s.Usuario_Cod_Usuario`);
  // Prueba se identifica al CREAR al alumno; el trigger impide reclasificar una persona real.
  // No basta con que la nota este anulada ni con escribir "prueba" en su nombre.
  entities.Nota_Examen=[];entities.Nota_Estado_V41=[];
  if(student.Es_Prueba&&await require('./schema-v44').ready(tx)){
    entities.Nota_Examen=await rows('SELECT n.* FROM dbo.Nota_Examen n WITH(UPDLOCK,HOLDLOCK) JOIN dbo.MATRICULA m ON m.Cod_Matricula=n.MATRICULA_Cod_Matricula WHERE m.ALUMNO_DNI_Alu=@dni ORDER BY n.Cod_Nota');
    entities.Nota_Estado_V41=await rows('SELECT s.* FROM dbo.Nota_Estado_V41 s WITH(UPDLOCK,HOLDLOCK) JOIN dbo.Nota_Examen n ON n.Cod_Nota=s.Nota_Examen_Cod_Nota JOIN dbo.MATRICULA m ON m.Cod_Matricula=n.MATRICULA_Cod_Matricula WHERE m.ALUMNO_DNI_Alu=@dni ORDER BY s.Nota_Examen_Cod_Nota');
  }
  const blocked=[];
  if(entities.Alumno_Estado_V41[0]?.Activo!==false&&entities.Alumno_Estado_V41[0]?.Activo!==0)blocked.push('Primero desactiva al estudiante. Sus matrículas y deudas permanecerán guardadas hasta confirmar la eliminación.');
  if(entities.Usuario.some(u=>u.Activo))blocked.push('Todas las cuentas del estudiante deben estar desactivadas.');
  if(entities.Usuario.some(u=>u.Cod_Usuario===actor.Cod_Usuario||u.ROL_Cod_Rol!=='ALUMNO'))blocked.push('No se puede eliminar una cuenta administradora ni la cuenta que realiza la operación.');
  const visible=(await ops.query(tx,"SELECT HAS_PERMS_BY_NAME(DB_NAME(),'DATABASE','VIEW DEFINITION') completo")).recordset[0];
  if(!visible?.completo)blocked.push('Se requiere permiso VIEW DEFINITION de la base para revisar todas las relaciones, incluidas las de otros esquemas.');
  if(entities.Pago.some(p=>p.ESTADO_PAGO_Cod_Estado!=='PENDIENTE'||p.Fech_Pago||p.Medio_Pago||p.Usuario_Cod_Usuario))blocked.push('Hay pagos realizados o información de cobro. Conserva el historial financiero y utiliza la desactivación.');
  const history=await rows(`SELECT a.Id,a.Entidad,a.Codigo,a.Accion FROM dbo.Auditoria_V4 a WITH (UPDLOCK,HOLDLOCK)
    WHERE (a.Entidad='ALUMNO' AND a.Codigo=@dni)
    OR (a.Entidad='Pago' AND (EXISTS(SELECT 1 FROM dbo.Pago p WHERE p.ALUMNO_DNI_Alu=@dni AND p.Cod_Pago=a.Codigo)
      OR JSON_VALUE(CASE WHEN ISJSON(a.Anterior)=1 THEN a.Anterior END,'$.ALUMNO_DNI_Alu')=@dni))
    OR (a.Entidad='MATRICULA' AND EXISTS(SELECT 1 FROM dbo.MATRICULA m WHERE m.ALUMNO_DNI_Alu=@dni AND m.Cod_Matricula=a.Codigo)) ORDER BY a.Id`);
  if(history.some(a=>a.Entidad==='Pago'&&['CONFIRMAR_PAGO','ANULAR_CONFIRMACION'].includes(a.Accion)))blocked.push('El historial contiene cobros, aunque se hayan anulado. No se elimina automáticamente.');
  // Revisar TODAS las FK efectivas, incluidas extensiones ajenas al modelo local.
  const metadata=await rows(`SELECT fk.object_id Id,fk.is_disabled Deshabilitada,fk.is_not_trusted NoConfiable,
    ps.name Esquema,pt.name Tabla,pc.name Columna,rt.name Padre,rc.name Referencia
    FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fc ON fc.constraint_object_id=fk.object_id
    JOIN sys.tables pt ON pt.object_id=fc.parent_object_id JOIN sys.schemas ps ON ps.schema_id=pt.schema_id
    JOIN sys.columns pc ON pc.object_id=fc.parent_object_id AND pc.column_id=fc.parent_column_id
    JOIN sys.tables rt ON rt.object_id=fc.referenced_object_id JOIN sys.schemas rs ON rs.schema_id=rt.schema_id
    JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id
    WHERE rs.name='dbo' ORDER BY fk.object_id,fc.constraint_column_id`,{});
  const relations=new Map();for(const f of metadata){if(!entities[f.Padre])continue;if(!relations.has(f.Id))relations.set(f.Id,[]);relations.get(f.Id).push(f);}
  const extra=[];
  for(const fields of relations.values()){
    const first=fields[0];if(first.Deshabilitada||first.NoConfiable)blocked.push('Hay relaciones deshabilitadas o no confiables. Solicita revisar la integridad antes de eliminar.');
    for(const parent of entities[first.Padre]){
      if(fields.some(f=>!Object.hasOwn(parent,f.Referencia)))throw Object.assign(rule('Una relación adicional requiere revisar columnas protegidas. Solicita revisión administrativa antes de eliminar.'),{status:409});
      const inputs=Object.fromEntries(fields.map((f,i)=>['v'+i,parent[f.Referencia]]));
      const actual=Number((await ops.query(tx,`SELECT COUNT_BIG(*) n FROM ${quote(first.Esquema)}.${quote(first.Tabla)} WITH (UPDLOCK,HOLDLOCK) WHERE ${fields.map((f,i)=>`${quote(f.Columna)}=@v${i}`).join(' AND ')}`,inputs)).recordset[0].n);
      const planned=first.Esquema==='dbo'?(entities[first.Tabla]||[]).filter(r=>fields.every(f=>String(r[f.Columna])===String(parent[f.Referencia]))).length:0;
      if(actual>planned){extra.push({tabla:first.Tabla,nombre:first.Tabla==='Nota_Examen'?'Resultados académicos históricos':`Información protegida: ${first.Esquema}.${first.Tabla}`,cantidad:actual-planned});blocked.push(first.Tabla==='Nota_Examen'?'Existen resultados académicos históricos, incluso si fueron anulados. Deben conservarse.':`Existen relaciones protegidas en ${first.Esquema}.${first.Tabla}. No se eliminarán automáticamente.`);}
    }
  }
  const dependencias=Object.entries(entities).filter(([,r])=>r.length).map(([tabla,r])=>({tabla,nombre:labels[tabla],cantidad:r.length})).concat(extra);
  const total=entities.Pago.reduce((n,p)=>n+Math.round(Number(p.Monto)*100),0)/100;
  const result={dni,nombre:student.Nomb_Alu,esPrueba:!!student.Es_Prueba,permitido:!blocked.length,bloqueos:[...new Set(blocked)],dependencias,totalPendiente:total,
    detalle:{estudiante:{dni,nombre:student.Nomb_Alu,celular:student.Cel_Alu},cuentas:entities.Usuario.map(u=>({usuario:u.Nomb_Usuario,activo:!!u.Activo})),matriculas:entities.MATRICULA.map(m=>({codigo:m.Cod_Matricula,horario:m.Grupo_Cod_Grupo,estado:m.ESTADO_MATRICULA_Cod_Estado_Matricula})),obligaciones:entities.Pago.map(p=>({codigo:p.Cod_Pago,monto:Number(p.Monto),estado:p.ESTADO_PAGO_Cod_Estado})),notas:entities.Nota_Examen.map(n=>({codigo:n.Cod_Nota,puntaje:n.Puntaje_total}))},
    conserva:'La auditoría permanece. Las notas de personas reales y cualquier historial de cobros bloquean la eliminación; puedes conservar todo mediante Desactivar.'};
  return {public:result,entities,hash:digest({entities,history,extra})};
}
async function execute(tx,p,actor,motive){
  if(!p.public.permitido)throw Object.assign(rule(p.public.bloqueos.join(' ')),{status:409});
  // Orden explícito; nunca DELETE CASCADE ni eliminación de auditorías.
  for(const table of ['Nota_Estado_V41','Nota_Examen','Solicitud_Contacto_V41','Contacto_Verificado_V41','Cuenta_Codigo_V41','Usuario_Seguridad_V41','Alumno_Estado_V41','Pago','MATRICULA','Usuario','ALUMNO']){
    for(const row of p.entities[table])await ops.query(tx,`DELETE FROM dbo.${quote(table)} WHERE ${quote(primary[table])}=@id`,{id:row[primary[table]]});
  }
  await ops.audit(tx,actor,'ALUMNO',p.public.dni,'ELIMINAR_CONTROLADO',null,{dependencias:p.public.dependencias,totalPendiente:p.public.totalPendiente,esPrueba:p.public.esPrueba,resultadosPrueba:p.public.detalle.notas},motive);
}
async function review(dni,actor){return ops.transaction(async tx=>{const p=await plan(tx,dni,actor);return {...p.public,revision:token(actor,'student:'+dni,p.hash)};});}
async function remove(dni,body,actor){
  if(body?.confirmacion!=='ELIMINAR '+dni)throw rule('Escribe ELIMINAR seguido del DNI para confirmar la eliminación definitiva.');const motive=reason(body.motivo);
  return ops.transaction(async tx=>{const p=await plan(tx,dni,actor);verify(body.revision,actor,'student:'+dni,p.hash);await execute(tx,p,actor,motive);return {ok:true};});
}
async function tests(actor){
  return ops.transaction(async tx=>{
    await schema.required(tx);const students=(await ops.query(tx,'SELECT TOP(51) DNI_Alu FROM dbo.ALUMNO WITH (UPDLOCK,HOLDLOCK) WHERE Es_Prueba=1 ORDER BY DNI_Alu')).recordset;
    const plans=[];for(const s of students.slice(0,50))plans.push(await plan(tx,s.DNI_Alu,actor));
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
    for(const p of plans)await execute(tx,p,actor,motive);
    return {ok:true,eliminados:plans.length};
  });
}
module.exports={review,remove,tests,clean};
