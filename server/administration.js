'use strict';
const model=require('./model.json');const ops=require('./operations');const {validate,rule}=require('./rules');
const {securityReady}=require('./security-schema');const accounts=require('./account-service');
const physical=new Set(['ALUMNO','Usuario','CURSOS','CARRERA','Aula','Grupo','Ciclo','Docente','Docente_Asignatura','Examen','Horario']);
const activeField=m=>m.columns.find(c=>c.type==='bit'&&/^(Activo|Activa)$/i.test(c.name))?.name;
const quote=name=>'['+name.replace(/]/g,']]')+']';
function schema(table){const m=model[table];if(!m)throw rule('Módulo no encontrado.');return m;}
function keys(m,id){try{const values=JSON.parse(Buffer.from(id,'base64url').toString('utf8'));if(!Array.isArray(values)||values.length!==m.pk.length||values.some(v=>typeof v!=='string'||!v||v.length>200))throw Error();return values;}catch{throw rule('Identificador inválido.');}}
function selector(m,values){return {where:m.pk.map((k,i)=>`${quote(k)}=@key${i}`).join(' AND '),inputs:Object.fromEntries(values.map((v,i)=>['key'+i,v]))};}
function auditCode(m,row){return m.pk.map(k=>String(row[k])).join('|');}
function policy(m){return {physical:physical.has(m.name),activeField:activeField(m),controlled:['ALUMNO','MATRICULA','Pago','Usuario','Nota_Examen','Examen_Grupo','Ciclo'].includes(m.name)};}
async function rowFor(tx,m,id){const s=selector(m,keys(m,id));const row=(await ops.query(tx,`SELECT * FROM dbo.${quote(m.name)} WITH (UPDLOCK,HOLDLOCK) WHERE ${s.where}`,s.inputs)).recordset[0];if(!row)throw Object.assign(rule('Registro no encontrado.'),{status:404});return row;}
async function dependencies(tx,m,row){
  const fields=(await ops.query(tx,`SELECT fk.object_id AS Id,fk.name AS Relacion,fk.is_disabled AS Deshabilitada,fk.is_not_trusted AS NoConfiable,s.name AS Esquema,t.name AS Tabla,c.name AS Columna,rc.name AS Referencia
    FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fc ON fc.constraint_object_id=fk.object_id
    JOIN sys.tables t ON t.object_id=fc.parent_object_id JOIN sys.schemas s ON s.schema_id=t.schema_id
    JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id
    JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id
    WHERE fk.referenced_object_id=OBJECT_ID(@table) ORDER BY fk.object_id,fc.constraint_column_id`,{table:'dbo.'+m.name})).recordset;
  if(fields.some(f=>f.Deshabilitada||f.NoConfiable))throw Object.assign(rule('No se puede comprobar con seguridad una relación deshabilitada o no confiable. Solicita su revisión antes de eliminar.'),{status:409});
  const groups=new Map();for(const field of fields){if(!groups.has(field.Id))groups.set(field.Id,[]);groups.get(field.Id).push(field);}
  const result=[];
  for(const fields of groups.values()){
    const first=fields[0],inputs=Object.fromEntries(fields.map((f,i)=>['v'+i,row[f.Referencia]]));
    const n=Number((await ops.query(tx,`SELECT COUNT_BIG(*) n FROM ${quote(first.Esquema)}.${quote(first.Tabla)} WITH (UPDLOCK,HOLDLOCK) WHERE ${fields.map((f,i)=>`${quote(f.Columna)}=@v${i}`).join(' AND ')}`,inputs)).recordset[0].n);
    if(n)result.push({tabla:first.Tabla,nombre:model[first.Tabla]?.label||'Historial o información de seguridad',cantidad:n});
  }
  // La auditoría usa claves lógicas: no basta con comprobar las FK.
  // El alta sola puede conservarse en auditoría aun cuando se retire un registro nunca utilizado.
  const history=Number((await ops.query(tx,`SELECT COUNT_BIG(*) n FROM dbo.Auditoria_V4 WITH (UPDLOCK,HOLDLOCK)
    WHERE Entidad=@entity AND Codigo=@code AND Accion<>'CREAR'`,{entity:m.name,code:auditCode(m,row)})).recordset[0].n);
  if(history)result.push({tabla:'Auditoria_V4',nombre:'Historial de operaciones sobre este registro',cantidad:history,tipo:'historial'});
  return result;
}
async function deletionGuard(tx,m,row,actor){
  if(m.name!=='Usuario')return '';
  if(row.Cod_Usuario===actor.Cod_Usuario)return 'No puedes eliminar tu propia cuenta. Utiliza otra cuenta administradora autorizada.';
  if(row.ROL_Cod_Rol==='ADMIN'&&row.Activo){
    const n=Number((await ops.query(tx,"SELECT COUNT_BIG(*) n FROM dbo.Usuario WITH (UPDLOCK,HOLDLOCK) WHERE ROL_Cod_Rol='ADMIN' AND Activo=1")).recordset[0].n);
    if(n<=1)return 'Debe conservarse al menos una cuenta administradora activa.';
  }
  return '';
}
async function state(tx,m,row){
  if(m.name==='ALUMNO'&&await securityReady(tx))return (await ops.query(tx,'SELECT Activo FROM dbo.Alumno_Estado_V41 WHERE ALUMNO_DNI_Alu=@dni',{dni:row.DNI_Alu})).recordset[0]?.Activo??true;
  if(m.name==='Nota_Examen'&&await securityReady(tx))return !((await ops.query(tx,'SELECT Anulada FROM dbo.Nota_Estado_V41 WHERE Nota_Examen_Cod_Nota=@code',{code:row.Cod_Nota})).recordset[0]?.Anulada??false);
  const field=activeField(m);if(field)return !!row[field];
  if(m.name==='MATRICULA')return row.ESTADO_MATRICULA_Cod_Estado_Matricula!=='ANULADA';
  if(m.name==='Examen_Grupo')return row.ESTADO_EXAMEN_GRUPO_Cod_Estado_Examen!=='CANCELADO';
  if(m.name==='Ciclo')return row.ESTADO_CICLO_Cod_Estado!=='CANCELADO';
  return true;
}
async function review(table,id,actor){
  if(table==='ALUMNO'&&await require('./schema-v43').ready()){
    const dni=keys(schema(table),id)[0],p=await require('./student-lifecycle').review(dni,actor);
    const enabled=!p.bloqueos.some(b=>b.startsWith('Primero desactiva'));
    return {dependencias:p.dependencias,activo:!enabled,controlado:true,revision:p.revision,dni,totalPendiente:p.totalPendiente,
      explicacion:p.conserva,acciones:[{id:'eliminar',label:'Eliminar definitivamente',enabled:p.permitido,explanation:p.permitido?'Se eliminarán únicamente las relaciones revisadas y las obligaciones pendientes.':p.bloqueos.join(' ')},
        {id:enabled?'restaurar':'desactivar',label:enabled?'Reactivar':'Desactivar',enabled:true,explanation:'La desactivación conserva matrículas, pagos e historial.'}]};
  }
  const m=schema(table);return ops.transaction(async tx=>{
    const row=await rowFor(tx,m,id),deps=await dependencies(tx,m,row),p=policy(m),enabled=await state(tx,m,row),ready=await securityReady(tx);
    const actions=[];
    const modernUser=m.name==='Usuario'&&await require('./schema-v43').ready(tx);
    const blockers=modernUser?deps.filter(d=>d.tabla!=='Usuario_Seguridad_V41'&&d.tipo!=='historial'):deps;
    const guard=p.physical?(modernUser&&row.Activo?'Primero desactiva la cuenta antes de eliminarla definitivamente.':modernUser&&row.ALUMNO_DNI_Alu?'Revisa la eliminación conjunta desde la ficha del estudiante para comprobar matrícula, deudas e historial.':await deletionGuard(tx,m,row,actor)):'';
    if(p.physical)actions.push({id:'eliminar',label:'Eliminar definitivamente',enabled:!guard&&!blockers.length,explanation:guard||(blockers.length?'Hay dependencias o historial de operaciones. Revisa la información vinculada y utiliza desactivar, dar de baja o anular cuando corresponda.':'La cuenta o registro no tiene operaciones protegidas. Se retirará también su control de sesiones; la auditoría administrativa se conserva.')});
    if(m.name==='Pago')return {dependencias:deps,acciones:[],explicacion:'Confirma o anula la confirmación desde Gestión de pagos. Las obligaciones no se eliminan.'};
    if(p.activeField||p.controlled){
      const needsSchema=['ALUMNO','Nota_Examen','Usuario'].includes(m.name);
      const self=m.name==='Usuario'&&row.Cod_Usuario===actor.Cod_Usuario;
      const cancel=['MATRICULA','Nota_Examen','Examen_Grupo','Ciclo'].includes(m.name);
      actions.push({id:enabled?(cancel?'anular':'desactivar'):'restaurar',label:enabled?(cancel?'Anular':'Desactivar'):'Restaurar',enabled:!self&&(!needsSchema||ready),explanation:self?'No puedes desactivar tu propia cuenta.':needsSchema&&!ready?'Esta operación requiere las migraciones V4.1.':m.name==='MATRICULA'?'Las cuotas y pagos asociados se conservan; anular una matrícula no elimina su deuda.':'Se conserva el historial y se registra el motivo.'});
    }
    return {dependencias:deps,acciones:actions,activo:enabled,explicacion:actions.length?'Revisa las relaciones antes de confirmar.':'Este catálogo del sistema se conserva. Puedes editar los datos permitidos.'};
  });
}
async function remove(table,id,body,actor){
  if(table==='ALUMNO'&&await require('./schema-v43').ready())return require('./student-lifecycle').remove(keys(schema(table),id)[0],body,actor);
  const m=schema(table);if(!physical.has(table))throw rule('Este registro conserva historial. Utiliza desactivar, anular o corregir.');
  if(body?.confirmacion!=='ELIMINAR')throw rule('Confirma la eliminación después de revisar las dependencias.');const motive=accountsReason(body.motivo);
  return ops.transaction(async tx=>{
    const row=await rowFor(tx,m,id),guard=await deletionGuard(tx,m,row,actor);
    if(guard)throw Object.assign(rule(guard),{status:409});
    const modernUser=m.name==='Usuario'&&await require('./schema-v43').ready(tx);
    if(modernUser&&row.Activo)throw Object.assign(rule('Primero desactiva la cuenta antes de eliminarla definitivamente.'),{status:409});
    if(modernUser&&row.ALUMNO_DNI_Alu)throw Object.assign(rule('Revisa la eliminación conjunta desde la ficha del estudiante.'),{status:409});
    const all=await dependencies(tx,m,row),deps=modernUser?all.filter(d=>d.tabla!=='Usuario_Seguridad_V41'&&d.tipo!=='historial'):all;
    if(deps.length)throw Object.assign(rule('No se puede eliminar: hay información académica, financiera o administrativa vinculada. Puedes desactivar el registro cuando corresponda.'),{status:409,dependencias:deps});
    const s=selector(m,keys(m,id));
    if(modernUser)await ops.query(tx,'DELETE FROM dbo.Usuario_Seguridad_V41 WHERE Usuario_Cod_Usuario=@id',{id:row.Cod_Usuario});
    try{await ops.query(tx,`DELETE FROM dbo.${quote(m.name)} WHERE ${s.where}`,s.inputs);}
    catch(e){const number=e.number||e.originalError?.info?.number;
      if(number===229)throw Object.assign(rule('La cuenta SQL de la aplicación no tiene permiso para eliminar este tipo de registro. Solicita revisar el script de permisos V4.2; no cambies las relaciones SQL.'),{status:503});
      if(number===547)throw Object.assign(rule('SQL impidió la eliminación porque existe información vinculada. Actualiza la revisión de dependencias.'),{status:409});
      throw e;
    }
    await ops.audit(tx,actor,m.name,auditCode(m,row),'ELIMINAR',row,null,motive);return {ok:true};
  });
}
function accountsReason(value){return require('./account-security').reason(value);}
async function changeState(table,id,body,actor){
  const m=schema(table),action=body?.accion;if(!['desactivar','anular','restaurar'].includes(action))throw rule('Acción administrativa inválida.');
  if(body?.confirmacion!==true)throw rule('Confirma la operación después de revisar el historial.');const motive=accountsReason(body.motivo);
  if(!policy(m).activeField&&!policy(m).controlled||m.name==='Pago')throw rule('Este registro no permite esa acción.');
  return ops.transaction(async tx=>{
    const row=await rowFor(tx,m,id),beforeActive=await state(tx,m,row),restoring=action==='restaurar';
    const cancellation=['MATRICULA','Nota_Examen','Examen_Grupo','Ciclo'].includes(m.name);
    if(!restoring&&action!==(cancellation?'anular':'desactivar'))throw rule('Esta acción no corresponde al tipo de registro.');
    if(beforeActive===restoring)throw Object.assign(rule('El registro ya está en ese estado.'),{status:409});
    let change={};
    if(m.name==='ALUMNO'){
      await accounts.ready(tx);
      const old=(await ops.query(tx,'SELECT * FROM dbo.Alumno_Estado_V41 WITH (UPDLOCK,HOLDLOCK) WHERE ALUMNO_DNI_Alu=@dni',{dni:row.DNI_Alu})).recordset[0];
      const user=(await ops.query(tx,'SELECT Cod_Usuario,Activo FROM dbo.Usuario WITH (UPDLOCK,HOLDLOCK) WHERE ALUMNO_DNI_Alu=@dni',{dni:row.DNI_Alu})).recordset[0];
      const previous=restoring?old?.Usuario_Activo_Anterior??false:!!user?.Activo;
      await ops.query(tx,old?`UPDATE dbo.Alumno_Estado_V41 SET Activo=@active,Usuario_Activo_Anterior=@previous,Motivo=@motive,Usuario_Cod_Usuario=@actor,Fecha=SYSUTCDATETIME() WHERE ALUMNO_DNI_Alu=@dni`:
        `INSERT dbo.Alumno_Estado_V41(ALUMNO_DNI_Alu,Activo,Usuario_Activo_Anterior,Motivo,Usuario_Cod_Usuario) VALUES (@dni,@active,@previous,@motive,@actor)`,{dni:row.DNI_Alu,active:restoring,previous,motive,actor:actor.Cod_Usuario});
      if(user){await ops.query(tx,'UPDATE dbo.Usuario SET Activo=@active WHERE Cod_Usuario=@id',{id:user.Cod_Usuario,active:restoring?previous:false});await accounts.revoke(tx,user.Cod_Usuario);}
      change={Activo:restoring};
    }else if(m.name==='Nota_Examen'){
      await accounts.ready(tx);const found=(await ops.query(tx,'SELECT Nota_Examen_Cod_Nota FROM dbo.Nota_Estado_V41 WITH (UPDLOCK,HOLDLOCK) WHERE Nota_Examen_Cod_Nota=@code',{code:row.Cod_Nota})).recordset[0];
      await ops.query(tx,found?'UPDATE dbo.Nota_Estado_V41 SET Anulada=@cancel,Motivo=@motive,Usuario_Cod_Usuario=@actor,Fecha=SYSUTCDATETIME() WHERE Nota_Examen_Cod_Nota=@code':'INSERT dbo.Nota_Estado_V41(Nota_Examen_Cod_Nota,Anulada,Motivo,Usuario_Cod_Usuario) VALUES (@code,@cancel,@motive,@actor)',{code:row.Cod_Nota,cancel:!restoring,motive,actor:actor.Cod_Usuario});change={Anulada:!restoring};
    }else{
      const bit=activeField(m);
      if(bit)change[bit]=restoring;
      else{
        const field=({MATRICULA:'ESTADO_MATRICULA_Cod_Estado_Matricula',Examen_Grupo:'ESTADO_EXAMEN_GRUPO_Cod_Estado_Examen',Ciclo:'ESTADO_CICLO_Cod_Estado'})[m.name];
        const history=(await ops.query(tx,"SELECT TOP(1) Anterior FROM dbo.Auditoria_V4 WHERE Entidad=@entity AND Codigo=@code AND Accion='ANULAR' ORDER BY Id DESC",{entity:m.name,code:auditCode(m,row)})).recordset[0];
        const previous=history?.Anterior?JSON.parse(history.Anterior)[field]:null;
        const allowed=m.name==='MATRICULA'?['ACTIVA','FINALIZADA','RETIRADA']:m.name==='Ciclo'?['PROGRAMADO','ACTIVO','FINALIZADO']:['PROGRAMADO','RENDIDO'];
        change[field]=restoring?(allowed.includes(previous)?previous:allowed[0]):m.name==='MATRICULA'?'ANULADA':'CANCELADO';
        if(m.name==='Examen_Grupo'){change.Estado=change[field];change.Publicado=false;}
      }
      if(m.name==='Usuario')await accounts.ready(tx);
      if(m.name!=='MATRICULA'||change.ESTADO_MATRICULA_Cod_Estado_Matricula==='ACTIVA')await validate(m.name,change,row,tx,actor);
      const s=selector(m,keys(m,id));await ops.query(tx,`UPDATE dbo.${quote(m.name)} SET ${Object.keys(change).map((k,i)=>`${quote(k)}=@v${i}`).join(',')} WHERE ${s.where}`,{...s.inputs,...Object.fromEntries(Object.values(change).map((v,i)=>['v'+i,v]))});
      if(m.name==='Usuario')await accounts.revoke(tx,row.Cod_Usuario);
    }
    const before=m.name==='ALUMNO'?{...row,Activo:beforeActive}:m.name==='Nota_Examen'?{...row,Anulada:!beforeActive}:row;
    await ops.audit(tx,actor,m.name,auditCode(m,row),restoring?'RESTAURAR':action==='anular'?'ANULAR':'DESACTIVAR',before,{...row,...change},motive);
    return {ok:true};
  });
}
module.exports={review,remove,changeState,policy,dependencies};
