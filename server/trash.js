'use strict';
const ops=require('./operations'),admin=require('./administration'),model=require('./model.json'),{rule}=require('./rules'),{reason}=require('./account-security');
const eligible=new Set(['ALUMNO','USUARIO','CURSO','DOCENTE','HORARIO_ACADEMICO','AULA','CARRERA','CICLO','CURSO_DOCENTE','SIMULACRO']);
const q=s=>'['+s.replaceAll(']',']]')+']';
function visible(m,alias=m.name){const code=m.pk.length===1?`CONVERT(varchar(200),${q(alias)}.${q(m.pk[0])})`:`CONCAT(${m.pk.map((k,i)=>(i?"'|',":'')+q(alias)+'.'+q(k)).join(',')})`;return `NOT EXISTS(SELECT 1 FROM dbo.PAPELERA_REGISTRO papelera WHERE papelera.ENTIDAD='${m.name}' AND papelera.ID_REGISTRO=${code} AND papelera.ESTADO='EN_PAPELERA')`;}
const encoded=(m,row)=>Buffer.from(JSON.stringify(m.pk.map(k=>String(row[k])))).toString('base64url');
async function current(tx,table,id){const m=admin.schema(table),values=admin.keys(m,id),code=values.join('|');return (await ops.query(tx,"SELECT * FROM dbo.PAPELERA_REGISTRO WITH(UPDLOCK,HOLDLOCK) WHERE ENTIDAD=@table AND ID_REGISTRO=@code AND ESTADO='EN_PAPELERA'",{table,code})).recordset[0];}
async function actorRow(tx,actor){const r=(await ops.query(tx,"SELECT ID_USUARIO,NOMBRE_USUARIO FROM dbo.USUARIO WITH(UPDLOCK,HOLDLOCK) WHERE ID_USUARIO=@id AND ID_ROL='ADMIN' AND ACTIVO=1",{id:actor.ID_USUARIO})).recordset[0];if(!r)throw Object.assign(rule('Solo una cuenta administradora activa puede gestionar la papelera.'),{status:403});return r;}
async function send(table,id,body,actor){
 if(!eligible.has(table))throw rule('Este catálogo se conserva; no admite papelera.');const motive=reason(body?.motivo);if(body?.confirmacion!==true)throw rule('Confirma el envío a papelera.');
 return ops.transaction(async tx=>{
  const who=await actorRow(tx,actor),m=admin.schema(table),row=await admin.rowFor(tx,m,id);
  if(await current(tx,table,id))throw Object.assign(rule('El registro ya está en papelera.'),{status:409});
  if(table==='USUARIO'&&row.DNI_ALUMNO)throw rule('Envía la ficha del estudiante a papelera para conservar sus relaciones y bloquear todo el acceso.');
  if(table==='USUARIO'&&row.ID_USUARIO===actor.ID_USUARIO)throw rule('No puedes enviar tu propia cuenta a papelera.');
  const active=await admin.state(tx,m,row),policy=admin.policy(m);
  if(active&&(policy.activeField||policy.controlled))await admin.changeStateWork(table,id,{accion:['CICLO'].includes(table)?'anular':'desactivar',confirmacion:true,motivo:motive},actor,tx);
  const label=m.display.map(k=>row[k]).filter(v=>v!=null).join(' · ').slice(0,240),code=admin.auditCode(m,row);
  const result=await ops.query(tx,`INSERT dbo.PAPELERA_REGISTRO(ENTIDAD,CLAVES,ID_REGISTRO,NOMBRE,ID_ADMINISTRADOR,NOMBRE_ADMINISTRADOR,ESTADO_ANTERIOR,MOTIVO)
   OUTPUT CONVERT(varchar(20),inserted.ID) ID VALUES(@table,@keys,@code,@name,@actor,@admin,@state,@reason)`,{table,keys:JSON.stringify(m.pk.map(k=>String(row[k]))),code,name:label,actor:who.ID_USUARIO,admin:who.NOMBRE_USUARIO,state:JSON.stringify({activo:active}),reason:motive});
  await ops.audit(tx,actor,table,code,'ENVIAR_PAPELERA',null,{papelera:result.recordset[0].ID,esPrueba:!!row.ES_PRUEBA},motive);
  return {ok:true,id:result.recordset[0].ID};
 });
}
async function entry(tx,id){if(!/^[1-9]\d{0,18}$/.test(String(id)))throw rule('Entrada de papelera inválida.');const row=(await ops.query(tx,"SELECT * FROM dbo.PAPELERA_REGISTRO WITH(UPDLOCK,HOLDLOCK) WHERE ID=@id AND ESTADO='EN_PAPELERA'",{id:String(id)})).recordset[0];if(!row)throw Object.assign(rule('El registro ya no está en papelera.'),{status:404});return row;}
async function list(query){const page=Math.max(1,Math.min(100000,parseInt(query.page,10)||1)),term=String(query.q||'').slice(0,100),type=String(query.tipo||'');if(type&&!eligible.has(type))throw rule('Tipo de papelera inválido.');const params={q:'%'+term+'%',type,offset:(page-1)*15};
 const where="ESTADO='EN_PAPELERA' AND (NOMBRE LIKE @q OR ID_REGISTRO LIKE @q) AND (@type='' OR ENTIDAD=@type)";
 const rows=(await ops.query(null,`SELECT CONVERT(varchar(20),ID) ID,ENTIDAD,ID_REGISTRO,NOMBRE,FECHA_ENVIO,NOMBRE_ADMINISTRADOR,ESTADO,MOTIVO FROM dbo.PAPELERA_REGISTRO WHERE ${where} ORDER BY FECHA_ENVIO DESC,ID DESC OFFSET @offset ROWS FETCH NEXT 15 ROWS ONLY`,params)).recordset;
 const count=Number((await ops.query(null,`SELECT COUNT_BIG(*) n FROM dbo.PAPELERA_REGISTRO WHERE ${where}`,{q:params.q,type})).recordset[0].n);return {rows,count,page,pageSize:15};
}
async function info(id,actor){const e=await ops.transaction(tx=>entry(tx,id)),m=admin.schema(e.ENTIDAD),key=Buffer.from(e.CLAVES).toString('base64url'),review=await admin.review(e.ENTIDAD,key,actor);return {entry:e,table:e.ENTIDAD,key,review};}
async function restore(id,body,actor){const motive=reason(body?.motivo);if(body?.confirmacion!==true)throw rule('Confirma la restauración.');return ops.transaction(async tx=>{
 await actorRow(tx,actor);const e=await entry(tx,id),m=admin.schema(e.ENTIDAD),key=Buffer.from(e.CLAVES).toString('base64url');await admin.rowFor(tx,m,key);const previous=JSON.parse(e.ESTADO_ANTERIOR),policy=admin.policy(m);
 if(previous.activo&&(policy.activeField||policy.controlled))await admin.changeStateWork(e.ENTIDAD,key,{accion:'restaurar',confirmacion:true,motivo:motive},actor,tx);
 await ops.query(tx,"UPDATE dbo.PAPELERA_REGISTRO SET ESTADO='RESTAURADO',FECHA_RESOLUCION=SYSUTCDATETIME() WHERE ID=@id",{id:String(id)});await ops.audit(tx,actor,e.ENTIDAD,e.ID_REGISTRO,'RESTAURAR_PAPELERA',null,{activo:previous.activo},motive);return {ok:true};
 });}
async function erase(id,body,actor){return ops.transaction(async tx=>{await actorRow(tx,actor);const e=await entry(tx,id),key=Buffer.from(e.CLAVES).toString('base64url');await admin.removeWork(e.ENTIDAD,key,body,actor,tx);await ops.query(tx,"UPDATE dbo.PAPELERA_REGISTRO SET ESTADO='ELIMINADO',NOMBRE=N'Registro eliminado',FECHA_RESOLUCION=SYSUTCDATETIME() WHERE ID=@id",{id:String(id)});return {ok:true};});}
async function eraseRecord(table,id,body,actor){const e=await ops.transaction(tx=>current(tx,table,id));if(!e)throw rule('Envía primero el registro a papelera y revisa sus dependencias.');return erase(String(e.ID),body,actor);}
module.exports={eligible,visible,current,send,list,info,restore,erase,eraseRecord,encoded};
