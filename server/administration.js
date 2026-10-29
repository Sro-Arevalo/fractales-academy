'use strict';
const model=require('./model.json');const ops=require('./operations');const {validate,rule}=require('./rules');
const {securityReady}=require('./security-schema');const accounts=require('./account-service');
const physical=new Set(['ALUMNO','USUARIO','CURSO','CARRERA','AULA','HORARIO_ACADEMICO','CICLO','DOCENTE','CURSO_DOCENTE','SIMULACRO']);
const activeField=m=>m.columns.find(c=>c.type==='bit'&&/^(ACTIVO|ACTIVO)$/i.test(c.name))?.name;
const quote=name=>'['+name.replace(/]/g,']]')+']';
function schema(table){const m=model[table];if(!m)throw rule('Módulo no encontrado.');return m;}
function keys(m,id){try{const values=JSON.parse(Buffer.from(id,'base64url').toString('utf8'));if(!Array.isArray(values)||values.length!==m.pk.length||values.some(v=>typeof v!=='string'||!v||v.length>200))throw Error();return values;}catch{throw rule('Identificador inválido.');}}
function selector(m,values){return {where:m.pk.map((k,i)=>`${quote(k)}=@key${i}`).join(' AND '),inputs:Object.fromEntries(values.map((v,i)=>['key'+i,v]))};}
function auditCode(m,row){return m.pk.map(k=>String(row[k])).join('|');}
function policy(m){return {physical:physical.has(m.name),activeField:activeField(m),controlled:['ALUMNO','MATRICULA','PAGO','USUARIO','RESULTADO_SIMULACRO','SIMULACRO_HORARIO','CICLO'].includes(m.name)};}
async function rowFor(tx,m,id){const s=selector(m,keys(m,id));const row=(await ops.query(tx,`SELECT * FROM dbo.${quote(m.name)} WITH (UPDLOCK,HOLDLOCK) WHERE ${s.where}`,s.inputs)).recordset[0];if(!row)throw Object.assign(rule('Registro no encontrado.'),{status:404});return row;}
async function dependencies(tx,m,row){
  if(!(await ops.query(tx,"SELECT HAS_PERMS_BY_NAME(DB_NAME(),'DATABASE','VIEW DEFINITION') n")).recordset[0].n)throw Object.assign(rule('Se requiere VIEW DEFINITION para comprobar todas las dependencias antes de eliminar.'),{status:503});
  const fields=(await ops.query(tx,`SELECT fk.object_id AS ID,fk.name AS Relacion,fk.is_disabled AS Deshabilitada,fk.is_not_trusted AS NoConfiable,s.name AS Esquema,t.name AS NOMBRE_TABLA,c.name AS Columna,rc.name AS Referencia
    FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fc ON fc.constraint_object_id=fk.object_id
    JOIN sys.tables t ON t.object_id=fc.parent_object_id JOIN sys.schemas s ON s.schema_id=t.schema_id
    JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id
    JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id
    WHERE fk.referenced_object_id=OBJECT_ID(@table) ORDER BY fk.object_id,fc.constraint_column_id`,{table:'dbo.'+m.name})).recordset;
  if(fields.some(f=>f.Deshabilitada||f.NoConfiable))throw Object.assign(rule('No se puede comprobar con seguridad una relación deshabilitada o no confiable. Solicita su revisión antes de eliminar.'),{status:409});
  const groups=new Map();for(const field of fields){if(!groups.has(field.ID))groups.set(field.ID,[]);groups.get(field.ID).push(field);}
  const result=[];
  for(const fields of groups.values()){
    const first=fields[0],inputs=Object.fromEntries(fields.map((f,i)=>['v'+i,row[f.Referencia]]));
    const n=Number((await ops.query(tx,`SELECT COUNT_BIG(*) n FROM ${quote(first.Esquema)}.${quote(first.NOMBRE_TABLA)} WITH (UPDLOCK,HOLDLOCK) WHERE ${fields.map((f,i)=>`${quote(f.Columna)}=@v${i}`).join(' AND ')}`,inputs)).recordset[0].n);
    if(n)result.push({tabla:first.NOMBRE_TABLA,nombre:model[first.NOMBRE_TABLA]?.label||'Historial o información de seguridad',cantidad:n});
  }
  // La auditoría usa claves lógicas: no basta con comprobar las FK.
  // El alta sola puede conservarse en auditoría aun cuando se retire un registro nunca utilizado.
  const history=Number((await ops.query(tx,`SELECT COUNT_BIG(*) n FROM dbo.AUDITORIA_SISTEMA WITH (UPDLOCK,HOLDLOCK)
    WHERE ENTIDAD=@entity AND ID_REGISTRO=@code AND ACCION<>'CREAR'`,{entity:m.name,code:auditCode(m,row)})).recordset[0].n);
  if(history)result.push({tabla:'AUDITORIA_SISTEMA',nombre:'Historial de operaciones sobre este registro',cantidad:history,tipo:'historial'});
  return result;
}
async function removableDependencies(tx,m,row,deps){
  // El historial de edicion de un catalogo puede conservarse sin retener un registro sin uso.
  let blockers=deps.filter(d=>d.tipo!=='historial');
  if(m.name==='HORARIO_ACADEMICO'){
    const blocks=(await ops.query(tx,'SELECT * FROM dbo.BLOQUE_HORARIO WITH(UPDLOCK,HOLDLOCK) WHERE ID_HORARIO_ACADEMICO=@id',{id:row.ID_HORARIO_ACADEMICO})).recordset;
    for(const block of blocks)blockers.push(...(await dependencies(tx,model.BLOQUE_HORARIO,block)).filter(d=>d.tipo!=='historial'));
    blockers=blockers.filter(d=>d.tabla!=='BLOQUE_HORARIO');
  }
  return blockers;
}
async function deletionGuard(tx,m,row,actor){
  if(m.name!=='USUARIO')return '';
  if(row.ID_USUARIO===actor.ID_USUARIO)return 'No puedes eliminar tu propia cuenta. Utiliza otra cuenta administradora autorizada.';
  if(row.ID_ROL==='ADMIN'&&row.ACTIVO){
    const n=Number((await ops.query(tx,"SELECT COUNT_BIG(*) n FROM dbo.USUARIO WITH (UPDLOCK,HOLDLOCK) WHERE ID_ROL='ADMIN' AND ACTIVO=1")).recordset[0].n);
    if(n<=1)return 'Debe conservarse al menos una cuenta administradora activa.';
  }
  return '';
}
async function state(tx,m,row){
  if(m.name==='ALUMNO'&&await securityReady(tx))return (await ops.query(tx,'SELECT ACTIVO FROM dbo.ESTADO_ALUMNO WHERE DNI_ALUMNO=@dni',{dni:row.DNI_ALUMNO})).recordset[0]?.ACTIVO??true;
  if(m.name==='RESULTADO_SIMULACRO'&&await securityReady(tx))return !((await ops.query(tx,'SELECT ANULADO FROM dbo.ESTADO_RESULTADO WHERE ID_RESULTADO=@code',{code:row.ID_RESULTADO})).recordset[0]?.ANULADO??false);
  const field=activeField(m);if(field)return !!row[field];
  if(m.name==='MATRICULA')return row.ID_ESTADO_MATRICULA!=='ANULADA';
  if(m.name==='SIMULACRO_HORARIO')return row.ID_ESTADO_SIMULACRO!=='CANCELADO';
  if(m.name==='CICLO')return row.ID_ESTADO_CICLO!=='CANCELADO';
  return true;
}
async function review(table,id,actor){
  if(table==='ALUMNO'&&await require('./schema-v43').ready()){
    const dni=keys(schema(table),id)[0],p=await require('./student-lifecycle').review(dni,actor);
    const enabled=!p.bloqueos.some(b=>b.startsWith('Primero desactiva'));
    return {dependencias:p.dependencias,ACTIVO:!enabled,controlado:true,revision:p.revision,dni,totalPendiente:p.totalPendiente,
      explicacion:p.conserva,detalle:p.detalle,acciones:[{id:'eliminar',label:'Eliminar definitivamente',enabled:p.permitido,explanation:p.permitido?'Se eliminarán únicamente las relaciones revisadas y las obligaciones pendientes.':p.bloqueos.join(' ')},
        {id:enabled?'restaurar':'desactivar',label:enabled?'Reactivar':'Desactivar',enabled:true,explanation:'La desactivación conserva matrículas, pagos e historial.'}]};
  }
  const m=schema(table);return ops.transaction(async tx=>{
    const row=await rowFor(tx,m,id),deps=await dependencies(tx,m,row),p=policy(m),enabled=await state(tx,m,row),ready=await securityReady(tx);
    const actions=[];
    const modernUser=m.name==='USUARIO'&&await require('./schema-v43').ready(tx);
    const blockers=modernUser?deps.filter(d=>d.tabla!=='SEGURIDAD_USUARIO'&&d.tipo!=='historial'):await removableDependencies(tx,m,row,deps);
    const guard=p.physical?(modernUser&&row.ACTIVO?'Primero desactiva la cuenta antes de eliminarla definitivamente.':modernUser&&row.DNI_ALUMNO?'Revisa la eliminación conjunta desde la ficha del estudiante para comprobar matrícula, deudas e historial.':await deletionGuard(tx,m,row,actor)):'';
    if(p.physical)actions.push({id:'eliminar',label:'Eliminar definitivamente',enabled:!guard&&!blockers.length,explanation:guard||(blockers.length?'Hay dependencias o historial de operaciones. Revisa la información vinculada y utiliza desactivar, dar de baja o anular cuando corresponda.':'La cuenta o registro no tiene operaciones protegidas. Se retirará también su control de sesiones; la auditoría administrativa se conserva.')});
    if(m.name==='PAGO')return {dependencias:deps,acciones:[],explicacion:'Confirma o anula la confirmación desde Gestión de pagos. Las obligaciones no se eliminan.'};
    if(p.activeField||p.controlled){
      const needsSchema=['ALUMNO','RESULTADO_SIMULACRO','USUARIO'].includes(m.name);
      const self=m.name==='USUARIO'&&row.ID_USUARIO===actor.ID_USUARIO;
      const cancel=['MATRICULA','RESULTADO_SIMULACRO','SIMULACRO_HORARIO','CICLO'].includes(m.name);
      actions.push({id:enabled?(cancel?'anular':'desactivar'):'restaurar',label:enabled?(cancel?'Anular':'Desactivar'):'Restaurar',enabled:!self&&(!needsSchema||ready),explanation:self?'No puedes desactivar tu propia cuenta.':needsSchema&&!ready?'Esta operación requiere las migraciones V4.1.':m.name==='MATRICULA'?'Las cuotas y pagos asociados se conservan; anular una matrícula no elimina su deuda.':'Se conserva el historial y se registra el motivo.'});
    }
    return {dependencias:deps,acciones:actions,ACTIVO:enabled,explicacion:actions.length?'Revisa las relaciones antes de confirmar.':'Este catálogo del sistema se conserva. Puedes editar los datos permitidos.'};
  });
}
async function removeWork(table,id,body,actor,tx){
  if(table==='ALUMNO'&&await require('./schema-v43').ready(tx))return require('./student-lifecycle').removeInTransaction(tx,keys(schema(table),id)[0],body,actor);
  const m=schema(table);if(!physical.has(table))throw rule('Este registro conserva historial. Utiliza desactivar, anular o corregir.');
  if(body?.confirmacion!=='ELIMINAR')throw rule('Confirma la eliminación después de revisar las dependencias.');const motive=accountsReason(body.motivo);

    if(m.name==='HORARIO_ACADEMICO')await require('./schedules').lock(tx);
    const row=await rowFor(tx,m,id),guard=await deletionGuard(tx,m,row,actor);
    if(guard)throw Object.assign(rule(guard),{status:409});
    const modernUser=m.name==='USUARIO'&&await require('./schema-v43').ready(tx);
    if(modernUser&&row.ACTIVO)throw Object.assign(rule('Primero desactiva la cuenta antes de eliminarla definitivamente.'),{status:409});
    if(modernUser&&row.DNI_ALUMNO)throw Object.assign(rule('Revisa la eliminación conjunta desde la ficha del estudiante.'),{status:409});
    const all=await dependencies(tx,m,row),deps=modernUser?all.filter(d=>d.tabla!=='SEGURIDAD_USUARIO'&&d.tipo!=='historial'):await removableDependencies(tx,m,row,all);
    if(deps.length)throw Object.assign(rule('No se puede eliminar: hay información académica, financiera o administrativa vinculada. Puedes desactivar el registro cuando corresponda.'),{status:409,dependencias:deps});
    const s=selector(m,keys(m,id));
    if(modernUser)await ops.query(tx,'DELETE FROM dbo.SEGURIDAD_USUARIO WHERE ID_USUARIO_RESPONSABLE=@id',{id:row.ID_USUARIO});
    let blocks=[];if(m.name==='HORARIO_ACADEMICO'){blocks=(await ops.query(tx,'SELECT * FROM dbo.BLOQUE_HORARIO WITH(UPDLOCK,HOLDLOCK) WHERE ID_HORARIO_ACADEMICO=@id',{id:row.ID_HORARIO_ACADEMICO})).recordset;await ops.query(tx,'DELETE dbo.BLOQUE_HORARIO WHERE ID_HORARIO_ACADEMICO=@id',{id:row.ID_HORARIO_ACADEMICO});}
    try{await ops.query(tx,`DELETE FROM dbo.${quote(m.name)} WHERE ${s.where}`,s.inputs);}
    catch(e){const number=e.number||e.originalError?.info?.number;
      if(number===229)throw Object.assign(rule('La cuenta SQL de la aplicación no tiene permiso para eliminar este tipo de registro. Solicita revisar el script de permisos V4.2; no cambies las relaciones SQL.'),{status:503});
      if(number===547)throw Object.assign(rule('SQL impidió la eliminación porque existe información vinculada. Actualiza la revisión de dependencias.'),{status:409});
      throw e;
    }
    await ops.audit(tx,actor,m.name,auditCode(m,row),'ELIMINAR',m.name==='HORARIO_ACADEMICO'?{...row,bloques:blocks}:row,null,motive);return {ok:true};

}
async function remove(table,id,body,actor){return require('./trash').eraseRecord(table,id,body,actor);}

function accountsReason(value){return require('./account-security').reason(value);}
async function changeStateWork(table,id,body,actor,tx){
  const m=schema(table),action=body?.accion;if(!['desactivar','anular','restaurar'].includes(action))throw rule('Acción administrativa inválida.');
  if(body?.confirmacion!==true)throw rule('Confirma la operación después de revisar el historial.');const motive=accountsReason(body.motivo);
  if(!policy(m).activeField&&!policy(m).controlled||m.name==='PAGO')throw rule('Este registro no permite esa acción.');

    if(m.name==='HORARIO_ACADEMICO')await require('./schedules').lock(tx);
    const row=await rowFor(tx,m,id),beforeActive=await state(tx,m,row),restoring=action==='restaurar';
    const cancellation=['MATRICULA','RESULTADO_SIMULACRO','SIMULACRO_HORARIO','CICLO'].includes(m.name);
    if(!restoring&&action!==(cancellation?'anular':'desactivar'))throw rule('Esta acción no corresponde al tipo de registro.');
    if(beforeActive===restoring)throw Object.assign(rule('El registro ya está en ese estado.'),{status:409});
    let change={};
    if(m.name==='ALUMNO'){
      await accounts.ready(tx);
      const old=(await ops.query(tx,'SELECT * FROM dbo.ESTADO_ALUMNO WITH (UPDLOCK,HOLDLOCK) WHERE DNI_ALUMNO=@dni',{dni:row.DNI_ALUMNO})).recordset[0];
      const user=(await ops.query(tx,'SELECT ID_USUARIO,ACTIVO FROM dbo.USUARIO WITH (UPDLOCK,HOLDLOCK) WHERE DNI_ALUMNO=@dni',{dni:row.DNI_ALUMNO})).recordset[0];
      const previous=restoring?old?.ACCESO_ACTIVO_ANTERIOR??false:!!user?.ACTIVO;
      await ops.query(tx,old?`UPDATE dbo.ESTADO_ALUMNO SET ACTIVO=@active,ACCESO_ACTIVO_ANTERIOR=@previous,MOTIVO=@motive,ID_USUARIO_RESPONSABLE=@actor,FECHA_EVENTO=SYSUTCDATETIME() WHERE DNI_ALUMNO=@dni`:
        `INSERT dbo.ESTADO_ALUMNO(DNI_ALUMNO,ACTIVO,ACCESO_ACTIVO_ANTERIOR,MOTIVO,ID_USUARIO_RESPONSABLE) VALUES (@dni,@active,@previous,@motive,@actor)`,{dni:row.DNI_ALUMNO,active:restoring,previous,motive,actor:actor.ID_USUARIO});
      if(user){await ops.query(tx,'UPDATE dbo.USUARIO SET ACTIVO=@active WHERE ID_USUARIO=@id',{id:user.ID_USUARIO,active:restoring?previous:false});await accounts.revoke(tx,user.ID_USUARIO);}
      change={ACTIVO:restoring};
    }else if(m.name==='RESULTADO_SIMULACRO'){
      await accounts.ready(tx);const found=(await ops.query(tx,'SELECT ID_RESULTADO FROM dbo.ESTADO_RESULTADO WITH (UPDLOCK,HOLDLOCK) WHERE ID_RESULTADO=@code',{code:row.ID_RESULTADO})).recordset[0];
      await ops.query(tx,found?'UPDATE dbo.ESTADO_RESULTADO SET ANULADO=@cancel,MOTIVO=@motive,ID_USUARIO_RESPONSABLE=@actor,FECHA_EVENTO=SYSUTCDATETIME() WHERE ID_RESULTADO=@code':'INSERT dbo.ESTADO_RESULTADO(ID_RESULTADO,ANULADO,MOTIVO,ID_USUARIO_RESPONSABLE) VALUES (@code,@cancel,@motive,@actor)',{code:row.ID_RESULTADO,cancel:!restoring,motive,actor:actor.ID_USUARIO});change={ANULADO:!restoring};
    }else{
      const bit=activeField(m);
      if(bit)change[bit]=restoring;
      else{
        const field=({MATRICULA:'ID_ESTADO_MATRICULA',SIMULACRO_HORARIO:'ID_ESTADO_SIMULACRO',CICLO:'ID_ESTADO_CICLO'})[m.name];
        const history=(await ops.query(tx,"SELECT TOP(1) DATOS_ANTERIORES FROM dbo.AUDITORIA_SISTEMA WHERE ENTIDAD=@entity AND ID_REGISTRO=@code AND ACCION='ANULAR' ORDER BY ID DESC",{entity:m.name,code:auditCode(m,row)})).recordset[0];
        const previous=history?.DATOS_ANTERIORES?JSON.parse(history.DATOS_ANTERIORES)[field]:null;
        const allowed=m.name==='MATRICULA'?['ACTIVA','FINALIZADA','RETIRADA']:m.name==='CICLO'?['PROGRAMADO','ACTIVO','FINALIZADO']:['PROGRAMADO','RENDIDO'];
        change[field]=restoring?(allowed.includes(previous)?previous:allowed[0]):m.name==='MATRICULA'?'ANULADA':'CANCELADO';
        if(m.name==='SIMULACRO_HORARIO'){change.ESTADO=change[field];change.PUBLICADO=false;}
      }
      if(m.name==='USUARIO')await accounts.ready(tx);
      if(m.name!=='MATRICULA'||change.ID_ESTADO_MATRICULA==='ACTIVA')await validate(m.name,change,row,tx,actor);
      const s=selector(m,keys(m,id));await ops.query(tx,`UPDATE dbo.${quote(m.name)} SET ${Object.keys(change).map((k,i)=>`${quote(k)}=@v${i}`).join(',')}${m.name==='HORARIO_ACADEMICO'?',VERSION_HORARIO=VERSION_HORARIO+1':''} WHERE ${s.where}`,{...s.inputs,...Object.fromEntries(Object.values(change).map((v,i)=>['v'+i,v]))});
      if(m.name==='USUARIO')await accounts.revoke(tx,row.ID_USUARIO);
    }
    const before=m.name==='ALUMNO'?{...row,ACTIVO:beforeActive}:m.name==='RESULTADO_SIMULACRO'?{...row,ANULADO:!beforeActive}:row;
    await ops.audit(tx,actor,m.name,auditCode(m,row),restoring?'RESTAURAR':action==='anular'?'ANULAR':'DESACTIVAR',before,{...row,...change},motive);
    return {ok:true};

}
async function changeState(table,id,body,actor){return ops.transaction(async tx=>{if(await require('./trash').current(tx,table,id))throw rule('Restaura este registro desde Papelera de reciclaje.');return changeStateWork(table,id,body,actor,tx);});}

module.exports={review,remove,changeState,policy,dependencies,removeWork,changeStateWork,rowFor,state,keys,selector,schema,auditCode};
