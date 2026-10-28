'use strict';
const crypto=require('node:crypto');
const db=require('./db');
const bcrypt=require('bcryptjs');
const model=require('./model.json');
const {rule,validate}=require('./rules');
const {validateFields}=require('./validation');

// La inyección se usa en pruebas; en la aplicación se utiliza exclusivamente db.js.
function createOperations(database=db,hashPassword=value=>bcrypt.hash(value,12)){
  const {sql}=database;
  async function query(tx,text,inputs={}){
    const r=await database.request(tx);
    for(const [key,value] of Object.entries(inputs))r.input(key,value);
    return r.query(text);
  }
  async function transaction(work){
    const tx=new sql.Transaction(await database.pool());await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    try{const result=await work(tx);await tx.commit();return result;}
    catch(e){try{await tx.rollback();}catch{}throw e;}
  }
  async function nextCode(tx,prefix){
    if(!/^[A-Z][A-Z0-9]$/.test(prefix))throw Error('Prefijo interno inválido.');
    const row=(await query(tx,"SELECT CONVERT(varchar(18),NEXT VALUE FOR dbo.Seq_Operacion_V4) AS n")).recordset[0];
    return prefix+String(row.n).padStart(18,'0');
  }
  async function audit(tx,actor,entity,code,action,before,after,reason){
    const clean=value=>Array.isArray(value)?value.map(clean):value&&typeof value==='object'&&!(value instanceof Date)?Object.fromEntries(Object.entries(value).filter(([key])=>!['Clave_Hash','Nueva_Clave','claveTemporal','codigoActivacion','Codigo_Hash','Nonce','Desafio_Hash'].includes(key)).map(([key,item])=>[key,clean(item)])):value;
    await query(tx,`INSERT dbo.Auditoria_V4 (Entidad,Codigo,Accion,Anterior,Nuevo,Usuario_Cod_Usuario,Motivo)
      VALUES (@entity,@code,@action,@before,@after,@actor,@reason)`,{
      entity,code,action,before:before?JSON.stringify(clean(before)):null,after:after?JSON.stringify(clean(after)):null,actor:actor.Cod_Usuario,reason:reason||null
    });
  }
  async function enroll(body,actor){
    if(!body||typeof body!=='object'||Array.isArray(body))throw rule('Envía los datos de inscripción.');
    if(!body.alumno||typeof body.alumno!=='object'||Array.isArray(body.alumno))throw rule('Envía los datos del estudiante.');
    const alumno={...body.alumno},group=body.Grupo_Cod_Grupo;
    if(Object.keys(body).some(k=>!['alumno','Grupo_Cod_Grupo','accesoInicial','apoderado','esPrueba'].includes(k)))throw rule('Campo de inscripción desconocido.');
    if(body.esPrueba!==undefined&&typeof body.esPrueba!=='boolean')throw rule('La identificación de prueba debe ser verdadera o falsa.');
    const mode=body.accesoInicial?.modo||'TEMPORAL';
    if(!['TEMPORAL','DNI_ACTIVACION'].includes(mode)||mode==='DNI_ACTIVACION'&&body.accesoInicial.identidadConfirmada!==true)throw rule('El acceso con DNI requiere entrega directa del código al estudiante identificado.');
    if(!alumno||typeof alumno!=='object'||Array.isArray(alumno)||!/^\d{8}$/.test(alumno.DNI_Alu||''))throw rule('Ingresa el DNI de ocho dígitos.');
    if(typeof group!=='string'||!group||group.length>20)throw rule('Selecciona el grupo académico.');
    const allowed=new Set(model.ALUMNO.columns.map(c=>c.name));
    if(Object.keys(alumno).some(k=>!allowed.has(k)))throw rule('Campo de estudiante desconocido.');
    validateFields(model.ALUMNO,alumno);
    return transaction(async tx=>{
      const existing=(await query(tx,'SELECT * FROM dbo.ALUMNO WITH (UPDLOCK,HOLDLOCK) WHERE DNI_Alu=@dni',{dni:alumno.DNI_Alu})).recordset[0];
      const v43=await require('./schema-v43').ready(tx);
      if((body.apoderado||body.esPrueba)&&!v43)throw rule('Completa la migración V4.3 antes de registrar apoderados o datos de prueba.');
      if(existing&&body.esPrueba!==undefined&&!!existing.Es_Prueba!==body.esPrueba)throw rule('Un estudiante existente conserva su identificación real o de prueba.');
      const ready=await require('./security-schema').securityReady(tx);
      if(mode==='DNI_ACTIVACION'&&!ready)throw rule('El modo de activación con DNI requiere las migraciones V4.1.');
      if(existing&&ready){const baja=(await query(tx,'SELECT Activo FROM dbo.Alumno_Estado_V41 WITH (UPDLOCK,HOLDLOCK) WHERE ALUMNO_DNI_Alu=@dni',{dni:alumno.DNI_Alu})).recordset[0];if(baja&&!baja.Activo)throw rule('El estudiante está dado de baja. Revisa su restauración antes de inscribirlo.');}
      const g=(await query(tx,`SELECT g.*,c.Modalidad,c.Nro_Mensualidades,c.Precio_Mensual,c.Fech_Inicio,c.Fech_Fin,c.ESTADO_CICLO_Cod_Estado
        FROM dbo.Grupo g WITH (UPDLOCK,HOLDLOCK) JOIN dbo.Ciclo c WITH (HOLDLOCK) ON c.Cod_Ciclo=g.Ciclo_Cod_Ciclo
        JOIN dbo.Aula a WITH (HOLDLOCK) ON a.Cod_Aula=g.Aula_Cod_Aula JOIN dbo.Programa p WITH (HOLDLOCK) ON p.Cod_Programa=c.Programa_Cod_Programa
        WHERE g.Cod_Grupo=@group AND a.Activa=1 AND p.Activo=1`,{group})).recordset[0];
      if(!g||!g.Activo||!['PROGRAMADO','ACTIVO'].includes(g.ESTADO_CICLO_Cod_Estado))throw rule('El grupo o ciclo no está disponible.');
      if(!((g.Modalidad==='REGULAR'&&g.Nro_Mensualidades===4)||(g.Modalidad==='ACELERADO'&&g.Nro_Mensualidades===2))||Number(g.Precio_Mensual)<=0)throw rule('La configuración económica del ciclo no es válida.');
      if(v43&&Number(g.Precio_Mensual)!==250)throw rule('La mensualidad de nuevas inscripciones debe ser S/ 250. Revisa la tarifa del ciclo; las deudas anteriores se conservan.');
      const duplicate=(await query(tx,`SELECT TOP 1 m.Cod_Matricula FROM dbo.MATRICULA m WITH (UPDLOCK,HOLDLOCK)
        JOIN dbo.Grupo g ON g.Cod_Grupo=m.Grupo_Cod_Grupo WHERE m.ALUMNO_DNI_Alu=@dni AND g.Ciclo_Cod_Ciclo=@cycle`,{dni:alumno.DNI_Alu,cycle:g.Ciclo_Cod_Ciclo})).recordset[0];
      if(duplicate)throw rule('El estudiante ya tiene una matrícula en este ciclo. Revisa su historial.');
      const occupied=(await query(tx,"SELECT COUNT_BIG(*) n FROM dbo.MATRICULA WITH (UPDLOCK,HOLDLOCK) WHERE Grupo_Cod_Grupo=@group AND ESTADO_MATRICULA_Cod_Estado_Matricula='ACTIVA'",{group})).recordset[0];
      if(Number(occupied.n)>=g.Cupo_Max)throw rule('El grupo alcanzó su cupo máximo.');
      if(!existing){
        if(v43)await require('./guardians').attach(tx,alumno,body.apoderado);
        validateFields(model.ALUMNO,alumno);
        for(const c of model.ALUMNO.columns)if(c.required&&!alumno[c.name])throw rule(`Completa ${c.name}.`);
        const cols=model.ALUMNO.columns.filter(c=>Object.hasOwn(alumno,c.name));
        await query(tx,`INSERT dbo.ALUMNO (${cols.map(c=>`[${c.name}]`).join(',')}${v43?',Es_Prueba':''}) VALUES (${cols.map(c=>'@'+c.name).join(',')}${v43?',@test':''})`,{...Object.fromEntries(cols.map(c=>[c.name,alumno[c.name]])),...(v43?{test:!!body.esPrueba}:{})});
      }
      const user=(await query(tx,'SELECT Cod_Usuario,Nomb_Usuario,Activo FROM dbo.Usuario WITH (UPDLOCK,HOLDLOCK) WHERE ALUMNO_DNI_Alu=@dni',{dni:alumno.DNI_Alu})).recordset[0];
      let temporary=null,activation=null;
      if(user&&mode==='DNI_ACTIVACION')throw rule('Las cuentas existentes conservan su acceso. Usa recuperación administrativa cuando corresponda.');
      if(!user){
        const reserved=(await query(tx,'SELECT Cod_Usuario FROM dbo.Usuario WITH (UPDLOCK,HOLDLOCK) WHERE Nomb_Usuario=@dni',{dni:alumno.DNI_Alu})).recordset[0];
        if(reserved)throw rule('El DNI ya está utilizado por otra cuenta; revisa Usuarios antes de inscribir.');
        temporary=mode==='DNI_ACTIVACION'?alumno.DNI_Alu:crypto.randomBytes(18).toString('base64url');
        const userCode=await nextCode(tx,'U4');
        await query(tx,`INSERT dbo.Usuario (Cod_Usuario,Nomb_Usuario,Clave_Hash,ROL_Cod_Rol,ALUMNO_DNI_Alu,Debe_Cambiar_Clave)
          VALUES (@code,@dni,@hash,'ALUMNO',@dni,1)`,{code:userCode,dni:alumno.DNI_Alu,hash:await hashPassword(temporary)});
        if(mode==='DNI_ACTIVACION')activation=await require('./account-service').prepareActivation(tx,{Cod_Usuario:userCode});
      }
      const matricula=await nextCode(tx,'M4');
      await query(tx,`INSERT dbo.MATRICULA (Cod_Matricula,ALUMNO_DNI_Alu,Grupo_Cod_Grupo,ESTADO_MATRICULA_Cod_Estado_Matricula,Fech_Matricula)
        VALUES (@code,@dni,@group,'ACTIVA',CONVERT(date,SYSDATETIMEOFFSET() AT TIME ZONE 'SA Pacific Standard Time'))`,{code:matricula,dni:alumno.DNI_Alu,group});
      // DATEADD conserva fin de mes. Los importes quedan congelados en Pago.
      for(let n=1;n<=g.Nro_Mensualidades;n++)await query(tx,`INSERT dbo.Pago
        (Cod_Pago,CONCEPTO_PAGO_Cod_Concepto,Nro_Mensualidad,Monto,Fech_Vencimiento,ESTADO_PAGO_Cod_Estado,ALUMNO_DNI_Alu,MATRICULA_Cod_Matricula)
        VALUES (@code,'MENSUALIDAD',@n,@amount,DATEADD(month,@offset,CONVERT(date,@start)),'PENDIENTE',@dni,@mat)`,{
        code:await nextCode(tx,'P4'),n,amount:Number(g.Precio_Mensual),offset:n-1,start:g.Fech_Inicio,dni:alumno.DNI_Alu,mat:matricula
      });
      // Un alumno legado nunca recibe cargos retroactivos por falta de historial.
      if(!existing)await query(tx,`INSERT dbo.Pago
        (Cod_Pago,CONCEPTO_PAGO_Cod_Concepto,Monto,Fech_Vencimiento,ESTADO_PAGO_Cod_Estado,ALUMNO_DNI_Alu)
        VALUES (@code,'MATRICULA_INICIAL',50,CONVERT(date,SYSDATETIMEOFFSET() AT TIME ZONE 'SA Pacific Standard Time'),'PENDIENTE',@dni)`,{code:await nextCode(tx,'P4'),dni:alumno.DNI_Alu});
      await audit(tx,actor,'MATRICULA',matricula,'INSCRIPCION',null,{DNI_Alu:alumno.DNI_Alu,Grupo_Cod_Grupo:group,cuotas:g.Nro_Mensualidades,inicial:!existing},null);
      return {matricula,nuevo:!existing,cuotas:g.Nro_Mensualidades,total:Number(g.Precio_Mensual)*g.Nro_Mensualidades+(!existing?50:0),usuario:user?.Nomb_Usuario||alumno.DNI_Alu,cuentaActiva:user?!!user.Activo:true,claveTemporal:temporary,codigoActivacion:activation,modoAcceso:mode};
    });
  }
  async function payment(code,body,actor,reverse=false){
    if(!body||Object.keys(body).some(k=>!(reverse?['motivo']:['medio']).includes(k)))throw rule('Datos de pago inválidos.');
    if(reverse&&(typeof body.motivo!=='string'||body.motivo.trim().length<5||body.motivo.length>250))throw rule('Describe el motivo de anulación (5 a 250 caracteres).');
    return transaction(async tx=>{
      const before=(await query(tx,'SELECT * FROM dbo.Pago WITH (UPDLOCK,HOLDLOCK) WHERE Cod_Pago=@code',{code})).recordset[0];
      if(!before)throw Object.assign(rule('Obligación no encontrada.'),{status:404});
      if(before.ESTADO_PAGO_Cod_Estado!==(reverse?'PAGADO':'PENDIENTE'))throw Object.assign(rule(reverse?'Solo se puede anular la confirmación de una obligación pagada.':'La obligación ya está pagada.'),{status:409});
      if(!reverse){
        if(typeof body.medio!=='string'||body.medio.length>10)throw rule('Selecciona un medio de pago.');
        const method=(await query(tx,'SELECT Cod_Medio FROM dbo.MEDIO_PAGO WITH (HOLDLOCK) WHERE Cod_Medio=@medio AND Activo=1',{medio:body.medio})).recordset[0];
        if(!method)throw rule('Medio de pago no disponible.');
      }
      await query(tx,reverse?`UPDATE dbo.Pago SET ESTADO_PAGO_Cod_Estado='PENDIENTE',Fech_Pago=NULL,Medio_Pago=NULL,Usuario_Cod_Usuario=NULL WHERE Cod_Pago=@code`:
        `UPDATE dbo.Pago SET ESTADO_PAGO_Cod_Estado='PAGADO',Fech_Pago=SYSUTCDATETIME(),Medio_Pago=@medio,Usuario_Cod_Usuario=@actor WHERE Cod_Pago=@code`,
        reverse?{code}:{code,medio:body.medio,actor:actor.Cod_Usuario});
      const after=(await query(tx,'SELECT * FROM dbo.Pago WHERE Cod_Pago=@code',{code})).recordset[0];
      await audit(tx,actor,'Pago',code,reverse?'ANULAR_CONFIRMACION':'CONFIRMAR_PAGO',before,after,body.motivo);
      return {ok:true};
    });
  }
  async function createExam(body,actor){
    if(!body||Object.keys(body).some(k=>!['Cod_Examen','Nomb_Examen','puntaje_maximo','Fech_programada','Hr_inicio','Duracion_minutos','grupos'].includes(k)))throw rule('Datos de simulacro inválidos.');
    const exam={Cod_Examen:body.Cod_Examen,Nomb_Examen:body.Nomb_Examen,puntaje_maximo:body.puntaje_maximo};
    for(const c of model.Examen.columns)if(c.required&&!c.default&&exam[c.name]==null)throw rule(`Completa ${c.name}.`);
    validateFields(model.Examen,exam);
    validateFields(model.Examen_Grupo,{Fech_programada:body.Fech_programada,Hr_inicio:body.Hr_inicio,Duracion_minutos:body.Duracion_minutos});
    if(!body.Fech_programada||!body.Hr_inicio||!(body.Duracion_minutos>0)||!(body.puntaje_maximo>0))throw rule('Completa fecha, hora, duración y puntaje máximo.');
    if(!Array.isArray(body.grupos)||!body.grupos.length||body.grupos.length>100||new Set(body.grupos).size!==body.grupos.length||body.grupos.some(g=>typeof g!=='string'||!g||g.length>20))throw rule('Selecciona grupos participantes sin duplicados (máximo 100).');
    return transaction(async tx=>{
      for(const group of [...body.grupos].sort()){
        const available=(await query(tx,"SELECT Cod_Grupo FROM dbo.Grupo WITH (UPDLOCK,HOLDLOCK) WHERE Cod_Grupo=@group AND Activo=1",{group})).recordset[0];
        if(!available)throw rule('Uno de los grupos participantes no está disponible.');
      }
      await query(tx,'INSERT dbo.Examen (Cod_Examen,Nomb_Examen,puntaje_maximo) VALUES (@code,@name,@max)',{code:body.Cod_Examen,name:body.Nomb_Examen,max:body.puntaje_maximo});
      for(const group of [...body.grupos].sort())await query(tx,`INSERT dbo.Examen_Grupo
        (Cod_examen_grupo,Examen_Cod_Examen,Grupo_Cod_Grupo,Fech_programada,Hr_inicio,Duracion_minutos,Estado,ESTADO_EXAMEN_GRUPO_Cod_Estado_Examen)
        VALUES (@code,@exam,@group,@date,@time,@duration,'PROGRAMADO','PROGRAMADO')`,{code:await nextCode(tx,'E4'),exam:body.Cod_Examen,group,date:body.Fech_programada,time:body.Hr_inicio,duration:body.Duracion_minutos});
      await audit(tx,actor,'Examen',body.Cod_Examen,'CREAR',null,body,null);return {ok:true};
    });
  }
  return {query,transaction,nextCode,audit,enroll,payment,createExam};
}
module.exports={createOperations,...createOperations()};
