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
    try{return await r.query(text);}catch(e){if(!e.sqlContext){const match=text.match(/\b(INSERT\s+(?:INTO\s+)?|UPDATE\s+|DELETE\s+(?:FROM\s+)?)(?:dbo\.)?\[?([A-Z_]+)\b/i);if(match)e.sqlContext={operation:match[1].trim().split(/\s/)[0].toUpperCase(),table:match[2]};}throw e;}
  }
  async function transaction(work){
    const tx=new sql.Transaction(await database.pool());await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    try{const result=await work(tx);await tx.commit();return result;}
    catch(e){try{await tx.rollback();}catch{}throw e;}
  }
  async function nextCode(tx,prefix){
    if(!/^[A-Z][A-Z0-9]$/.test(prefix))throw Error('Prefijo interno inválido.');
    const row=(await query(tx,"SELECT CONVERT(varchar(18),NEXT VALUE FOR dbo.SECUENCIA_OPERACION) AS n")).recordset[0];
    return prefix+String(row.n).padStart(18,'0');
  }
  async function audit(tx,actor,entity,code,action,before,after,reason){
    const clean=value=>Array.isArray(value)?value.map(clean):value&&typeof value==='object'&&!(value instanceof Date)?Object.fromEntries(Object.entries(value).filter(([key])=>!['CLAVE_HASH','NUEVA_CLAVE','claveTemporal','codigoActivacion','CODIGO_HASH','NONCE','DESAFIO_HASH'].includes(key)).map(([key,item])=>[key,clean(item)])):value;
    const who=(await query(tx,'SELECT u.NOMBRE_USUARIO,u.ID_ROL,ISNULL(a.ES_PRUEBA,0) ES_PRUEBA FROM dbo.USUARIO u LEFT JOIN dbo.ALUMNO a ON a.DNI_ALUMNO=u.DNI_ALUMNO WHERE u.ID_USUARIO=@id',{id:actor.ID_USUARIO})).recordset[0];
    if(!who)throw rule('La cuenta responsable de la operación no está disponible.');
    let test=!!who.ES_PRUEBA||after?.esPrueba===true;
    if(entity==='ALUMNO')test=test||!!(await query(tx,'SELECT ES_PRUEBA FROM dbo.ALUMNO WHERE DNI_ALUMNO=@id',{id:code})).recordset[0]?.ES_PRUEBA;
    if(['MATRICULA','PAGO','RESULTADO_SIMULACRO'].includes(entity)){
      const joins={MATRICULA:'JOIN dbo.ALUMNO a ON a.DNI_ALUMNO=r.DNI_ALUMNO',PAGO:'JOIN dbo.ALUMNO a ON a.DNI_ALUMNO=r.DNI_ALUMNO',RESULTADO_SIMULACRO:'JOIN dbo.MATRICULA m ON m.ID_MATRICULA=r.ID_MATRICULA JOIN dbo.ALUMNO a ON a.DNI_ALUMNO=m.DNI_ALUMNO'},key={MATRICULA:'ID_MATRICULA',PAGO:'ID_PAGO',RESULTADO_SIMULACRO:'ID_RESULTADO'};
      test=test||!!(await query(tx,`SELECT a.ES_PRUEBA FROM dbo.${entity} r ${joins[entity]} WHERE r.${key[entity]}=@id`,{id:code})).recordset[0]?.ES_PRUEBA;
    }
    const protectedEvent=!test||entity==='PAGO'||/PAGO|COBRO|CLAVE|CONTACTO|RECUPERA|ACTIVA|SESION|CORREO|POLITICA/.test(action);
    await query(tx,`INSERT dbo.AUDITORIA_SISTEMA (ENTIDAD,ID_REGISTRO,ACCION,DATOS_ANTERIORES,DATOS_NUEVOS,ID_USUARIO_RESPONSABLE,MOTIVO,NOMBRE_ACTOR,ROL_ACTOR,ES_PRUEBA,PROTEGIDO,RETENER_HASTA)
      SELECT @entity,@code,@action,@before,@after,@actor,@reason,@name,@role,@test,@protected,CASE WHEN @protected=0 THEN DATEADD(day,DIAS_RETENCION_PRUEBA,SYSUTCDATETIME()) END FROM dbo.POLITICA_AUDITORIA WHERE ID=1`,{
      entity,code,action,before:before?JSON.stringify(clean(before)):null,after:after?JSON.stringify(clean(after)):null,actor:actor.ID_USUARIO,reason:reason||null,name:who.NOMBRE_USUARIO,role:who.ID_ROL,test,protected:protectedEvent
    });
  }
  async function enroll(body,actor){
    if(!body||typeof body!=='object'||Array.isArray(body))throw rule('Envía los datos de inscripción.');
    if(!body.alumno||typeof body.alumno!=='object'||Array.isArray(body.alumno))throw rule('Envía los datos del estudiante.');
    const alumno={...body.alumno},group=body.ID_HORARIO_ACADEMICO;
    if(Object.keys(body).some(k=>!['alumno','ID_HORARIO_ACADEMICO','accesoInicial','esPrueba','seleccion'].includes(k)))throw rule('Campo de inscripción desconocido.');
    for(const c of model.ALUMNO.columns)if(Object.hasOwn(alumno,c.name)&&typeof alumno[c.name]==='string')alumno[c.name]=alumno[c.name].trim()||null;
    if(body.esPrueba!==undefined&&typeof body.esPrueba!=='boolean')throw rule('La identificación de prueba debe ser verdadera o falsa.');
    const mode=body.accesoInicial?.modo||'TEMPORAL';
    if(!['TEMPORAL','DNI_ACTIVACION'].includes(mode)||mode==='DNI_ACTIVACION'&&body.accesoInicial.identidadConfirmada!==true)throw rule('El acceso con DNI requiere entrega directa del código al estudiante identificado.');
    if(!alumno||typeof alumno!=='object'||Array.isArray(alumno)||!/^\d{8}$/.test(alumno.DNI_ALUMNO||''))throw rule('Ingresa el DNI de ocho dígitos.');
    if(typeof group!=='string'||!group||group.length>20)throw rule('Selecciona el grupo académico.');
    const allowed=new Set(model.ALUMNO.columns.map(c=>c.name));
    if(Object.keys(alumno).some(k=>!allowed.has(k)))throw rule('Campo de estudiante desconocido.');
    validateFields(model.ALUMNO,alumno);
    return transaction(async tx=>{
      await require('./schema-v45').required(tx);
      if((await query(tx,"SELECT 1 FROM dbo.PAPELERA_REGISTRO WITH(UPDLOCK,HOLDLOCK) WHERE ENTIDAD='ALUMNO' AND ID_REGISTRO=@dni AND ESTADO='EN_PAPELERA'",{dni:alumno.DNI_ALUMNO})).recordset.length)throw rule('El estudiante está en papelera. Restáuralo antes de matricular.');
      const existing=(await query(tx,'SELECT * FROM dbo.ALUMNO WITH (UPDLOCK,HOLDLOCK) WHERE DNI_ALUMNO=@dni',{dni:alumno.DNI_ALUMNO})).recordset[0];
      if(existing&&Object.keys(alumno).some(k=>k!=='DNI_ALUMNO'))throw Object.assign(rule('Este DNI ya está registrado. Consulta su ficha para crear una nueva matrícula.'),{status:409});
      if(!existing){
        if(alumno.ID_CARRERA&&(await query(tx,"SELECT ID FROM dbo.PAPELERA_REGISTRO WITH(UPDLOCK,HOLDLOCK) WHERE ENTIDAD='CARRERA' AND ID_REGISTRO=@id AND ESTADO='EN_PAPELERA'",{id:alumno.ID_CARRERA})).recordset.length)throw rule('La carrera seleccionada est\u00e1 en papelera.');
        for(const [field,table,key,label] of [['ID_CARRERA','CARRERA','ID_CARRERA','carrera'],['ID_PARENTESCO','PARENTESCO','ID_PARENTESCO','parentesco']])if(alumno[field]&&!((await query(tx,`SELECT 1 FROM dbo.${table} WITH(HOLDLOCK) WHERE ${key}=@id`,{id:alumno[field]})).recordset.length))throw rule('La opción de '+label+' seleccionada no existe. Actualiza el formulario.');
      }
      for(const [table,key,value,label] of [['ROL','ID_ROL','ALUMNO','rol de estudiante'],['ESTADO_MATRICULA','ID_ESTADO_MATRICULA','ACTIVA','estado de matrícula'],['ESTADO_PAGO','ID_ESTADO_PAGO','PENDIENTE','estado de pago'],['CONCEPTO_PAGO','ID_CONCEPTO','MENSUALIDAD','mensualidades'],['CONCEPTO_PAGO','ID_CONCEPTO','MATRICULA_INICIAL','matrícula y materiales']])if(!(await query(tx,`SELECT 1 FROM dbo.${table} WITH(HOLDLOCK) WHERE ${key}=@id`,{id:value})).recordset.length)throw rule('Falta configurar '+label+'. Solicita revisión administrativa antes de inscribir.');
      const v43=await require('./schema-v43').ready(tx);
      if(body.esPrueba&&!v43)throw rule('Completa la migración antes de registrar datos de prueba.');
      if(existing&&body.esPrueba!==undefined&&!!existing.ES_PRUEBA!==body.esPrueba)throw rule('Un estudiante existente conserva su identificación real o de prueba.');
      const ready=await require('./security-schema').securityReady(tx);
      if(mode==='DNI_ACTIVACION'&&!ready)throw rule('El modo de activación con DNI requiere las migraciones V4.1.');
      if(existing&&ready){const baja=(await query(tx,'SELECT ACTIVO FROM dbo.ESTADO_ALUMNO WITH (UPDLOCK,HOLDLOCK) WHERE DNI_ALUMNO=@dni',{dni:alumno.DNI_ALUMNO})).recordset[0];if(baja&&!baja.ACTIVO)throw rule('El estudiante está dado de baja. Revisa su restauración antes de inscribirlo.');}
      const g=(await query(tx,`SELECT g.*,c.MODALIDAD,c.NUMERO_MENSUALIDADES,c.PRECIO_MENSUAL,c.FECHA_INICIO,c.FECHA_FIN,c.ID_ESTADO_CICLO
        FROM dbo.HORARIO_ACADEMICO g WITH (UPDLOCK,HOLDLOCK) JOIN dbo.CICLO c WITH (HOLDLOCK) ON c.ID_CICLO=g.ID_CICLO
        JOIN dbo.AULA a WITH (HOLDLOCK) ON a.ID_AULA=g.ID_AULA JOIN dbo.PROGRAMA p WITH (HOLDLOCK) ON p.ID_PROGRAMA=c.ID_PROGRAMA
        WHERE g.ID_HORARIO_ACADEMICO=@group AND a.ACTIVO=1 AND p.ACTIVO=1`,{group})).recordset[0];
      if(!g||!g.ACTIVO||!['PROGRAMADO','ACTIVO'].includes(g.ID_ESTADO_CICLO))throw rule('El grupo o ciclo no está disponible.');
      if(g.ESTADO_HORARIO!=='PUBLICADO')throw rule('El horario aún es un borrador. Publícalo antes de matricular.');
      if(body.seleccion&&(body.seleccion.ID_CICLO!==g.ID_CICLO||body.seleccion.ID_TURNO!==g.ID_TURNO||body.seleccion.MODALIDAD!==g.MODALIDAD))throw rule('El horario seleccionado no corresponde al ciclo, modalidad o turno. Actualiza las opciones.');
      if((await query(tx,"SELECT 1 FROM dbo.PAPELERA_REGISTRO WHERE ESTADO='EN_PAPELERA' AND ((ENTIDAD='HORARIO_ACADEMICO' AND ID_REGISTRO=@horario) OR (ENTIDAD='CICLO' AND ID_REGISTRO=@ciclo))",{horario:group,ciclo:g.ID_CICLO})).recordset.length)throw rule('El horario o ciclo está en papelera.');
      if(!((g.MODALIDAD==='REGULAR'&&g.NUMERO_MENSUALIDADES===4)||(g.MODALIDAD==='ACELERADO'&&g.NUMERO_MENSUALIDADES===2))||Number(g.PRECIO_MENSUAL)<=0)throw rule('La configuración económica del ciclo no es válida.');
      if(v43&&Number(g.PRECIO_MENSUAL)!==250)throw rule('La mensualidad de nuevas inscripciones debe ser S/ 250. Revisa la tarifa del ciclo; las deudas anteriores se conservan.');
      const duplicate=(await query(tx,`SELECT TOP 1 m.ID_MATRICULA FROM dbo.MATRICULA m WITH (UPDLOCK,HOLDLOCK)
        JOIN dbo.HORARIO_ACADEMICO g ON g.ID_HORARIO_ACADEMICO=m.ID_HORARIO_ACADEMICO WHERE m.DNI_ALUMNO=@dni AND g.ID_CICLO=@cycle`,{dni:alumno.DNI_ALUMNO,cycle:g.ID_CICLO})).recordset[0];
      if(duplicate)throw rule('El estudiante ya tiene una matrícula en este ciclo. Revisa su historial.');
      const occupied=(await query(tx,"SELECT COUNT_BIG(*) n FROM dbo.MATRICULA WITH (UPDLOCK,HOLDLOCK) WHERE ID_HORARIO_ACADEMICO=@group AND ID_ESTADO_MATRICULA='ACTIVA'",{group})).recordset[0];
      if(Number(occupied.n)>=g.CAPACIDAD_MAXIMA)throw rule('El grupo alcanzó su cupo máximo.');
      const historyCounts=(await query(tx,`SELECT (SELECT COUNT(*) FROM dbo.MATRICULA WHERE DNI_ALUMNO=@dni) matriculas,
        (SELECT COUNT(*) FROM dbo.PAGO WHERE DNI_ALUMNO=@dni AND ID_CONCEPTO='MATRICULA_INICIAL') iniciales`,{dni:alumno.DNI_ALUMNO})).recordset[0];
      const initialCharge=!existing||(!historyCounts.matriculas&&!historyCounts.iniciales);
      if(!existing){
        validateFields(model.ALUMNO,alumno);
        for(const c of model.ALUMNO.columns)if(c.required&&!alumno[c.name])throw rule(`Completa ${c.name}.`);
        const cols=model.ALUMNO.columns.filter(c=>Object.hasOwn(alumno,c.name));
        await query(tx,`INSERT dbo.ALUMNO (${cols.map(c=>`[${c.name}]`).join(',')}${v43?',ES_PRUEBA':''}) VALUES (${cols.map(c=>'@'+c.name).join(',')}${v43?',@test':''})`,{...Object.fromEntries(cols.map(c=>[c.name,alumno[c.name]])),...(v43?{test:!!body.esPrueba}:{})});
      }
      const user=(await query(tx,'SELECT ID_USUARIO,NOMBRE_USUARIO,ACTIVO FROM dbo.USUARIO WITH (UPDLOCK,HOLDLOCK) WHERE DNI_ALUMNO=@dni',{dni:alumno.DNI_ALUMNO})).recordset[0];
      let temporary=null,activation=null;
      if(user&&mode==='DNI_ACTIVACION')throw rule('Las cuentas existentes conservan su acceso. Usa recuperación administrativa cuando corresponda.');
      if(!user){
        const reserved=(await query(tx,'SELECT ID_USUARIO FROM dbo.USUARIO WITH (UPDLOCK,HOLDLOCK) WHERE NOMBRE_USUARIO=@dni',{dni:alumno.DNI_ALUMNO})).recordset[0];
        if(reserved)throw rule('El DNI ya está utilizado por otra cuenta; revisa Usuarios antes de inscribir.');
        temporary=mode==='DNI_ACTIVACION'?alumno.DNI_ALUMNO:crypto.randomBytes(18).toString('base64url');
        const userCode=await nextCode(tx,'U4');
        await query(tx,`INSERT dbo.USUARIO (ID_USUARIO,NOMBRE_USUARIO,CLAVE_HASH,ID_ROL,DNI_ALUMNO,DEBE_CAMBIAR_CLAVE)
          VALUES (@code,@dni,@hash,'ALUMNO',@dni,1)`,{code:userCode,dni:alumno.DNI_ALUMNO,hash:await hashPassword(temporary)});
        if(mode==='DNI_ACTIVACION')activation=await require('./account-service').prepareActivation(tx,{ID_USUARIO:userCode});
      }
      const matricula=await nextCode(tx,'M4');
      await query(tx,`INSERT dbo.MATRICULA (ID_MATRICULA,DNI_ALUMNO,ID_HORARIO_ACADEMICO,ID_ESTADO_MATRICULA,FECHA_MATRICULA)
        VALUES (@code,@dni,@group,'ACTIVA',CONVERT(date,SYSDATETIMEOFFSET() AT TIME ZONE 'SA Pacific Standard Time'))`,{code:matricula,dni:alumno.DNI_ALUMNO,group});
      // DATEADD conserva fin de mes. Los importes quedan congelados en PAGO.
      for(let n=1;n<=g.NUMERO_MENSUALIDADES;n++)await query(tx,`INSERT dbo.PAGO
        (ID_PAGO,ID_CONCEPTO,NUMERO_MENSUALIDAD,MONTO,FECHA_VENCIMIENTO,ID_ESTADO_PAGO,DNI_ALUMNO,ID_MATRICULA)
        VALUES (@code,'MENSUALIDAD',@n,@amount,DATEADD(month,@offset,CONVERT(date,@start)),'PENDIENTE',@dni,@mat)`,{
        code:await nextCode(tx,'P4'),n,amount:Number(g.PRECIO_MENSUAL),offset:n-1,start:g.FECHA_INICIO,dni:alumno.DNI_ALUMNO,mat:matricula
      });
      // El cargo inicial se genera solo en la primera admision sin historial previo.
      if(initialCharge)await query(tx,`INSERT dbo.PAGO
        (ID_PAGO,ID_CONCEPTO,MONTO,FECHA_VENCIMIENTO,ID_ESTADO_PAGO,DNI_ALUMNO)
        VALUES (@code,'MATRICULA_INICIAL',50,CONVERT(date,SYSDATETIMEOFFSET() AT TIME ZONE 'SA Pacific Standard Time'),'PENDIENTE',@dni)`,{code:await nextCode(tx,'P4'),dni:alumno.DNI_ALUMNO});
      await audit(tx,actor,'MATRICULA',matricula,'INSCRIPCION',null,{DNI_ALUMNO:alumno.DNI_ALUMNO,ID_HORARIO_ACADEMICO:group,cuotas:g.NUMERO_MENSUALIDADES,inicial:initialCharge},null);
      return {matricula,nuevo:!existing,inicial:initialCharge,cuotas:g.NUMERO_MENSUALIDADES,total:Number(g.PRECIO_MENSUAL)*g.NUMERO_MENSUALIDADES+(initialCharge?50:0),usuario:user?.NOMBRE_USUARIO||alumno.DNI_ALUMNO,cuentaActiva:user?!!user.ACTIVO:true,claveTemporal:temporary,codigoActivacion:activation,modoAcceso:mode};
    });
  }
  async function payment(code,body,actor,reverse=false){
    if(!body||Object.keys(body).some(k=>!(reverse?['motivo']:['medio']).includes(k)))throw rule('Datos de pago inválidos.');
    if(reverse&&(typeof body.motivo!=='string'||body.motivo.trim().length<5||body.motivo.length>250))throw rule('Describe el motivo de anulación (5 a 250 caracteres).');
    return transaction(async tx=>{
      const before=(await query(tx,'SELECT * FROM dbo.PAGO WITH (UPDLOCK,HOLDLOCK) WHERE ID_PAGO=@code',{code})).recordset[0];
      if(!before)throw Object.assign(rule('Obligación no encontrada.'),{status:404});
      if(before.ID_ESTADO_PAGO!==(reverse?'PAGADO':'PENDIENTE'))throw Object.assign(rule(reverse?'Solo se puede anular la confirmación de una obligación pagada.':'La obligación ya está pagada.'),{status:409});
      if(!reverse){
        if(typeof body.medio!=='string'||body.medio.length>10)throw rule('Selecciona un medio de pago.');
        const method=(await query(tx,'SELECT ID_MEDIO_PAGO FROM dbo.MEDIO_PAGO WITH (HOLDLOCK) WHERE ID_MEDIO_PAGO=@medio AND ACTIVO=1',{medio:body.medio})).recordset[0];
        if(!method)throw rule('Medio de pago no disponible.');
      }
      await query(tx,reverse?`UPDATE dbo.PAGO SET ID_ESTADO_PAGO='PENDIENTE',FECHA_PAGO=NULL,ID_MEDIO_PAGO=NULL,ID_USUARIO_RESPONSABLE=NULL WHERE ID_PAGO=@code`:
        `UPDATE dbo.PAGO SET ID_ESTADO_PAGO='PAGADO',FECHA_PAGO=SYSUTCDATETIME(),ID_MEDIO_PAGO=@medio,ID_USUARIO_RESPONSABLE=@actor WHERE ID_PAGO=@code`,
        reverse?{code}:{code,medio:body.medio,actor:actor.ID_USUARIO});
      const after=(await query(tx,'SELECT * FROM dbo.PAGO WHERE ID_PAGO=@code',{code})).recordset[0];
      await audit(tx,actor,'PAGO',code,reverse?'ANULAR_CONFIRMACION':'CONFIRMAR_PAGO',before,after,body.motivo);
      return {ok:true};
    });
  }
  async function createExam(body,actor){
    if(!body||Object.keys(body).some(k=>!['ID_SIMULACRO','NOMBRE_SIMULACRO','PUNTAJE_MAXIMO','FECHA_PROGRAMADA','HORA_INICIO','DURACION_MINUTOS','grupos'].includes(k)))throw rule('Datos de simulacro inválidos.');
    const exam={ID_SIMULACRO:body.ID_SIMULACRO,NOMBRE_SIMULACRO:body.NOMBRE_SIMULACRO,PUNTAJE_MAXIMO:body.PUNTAJE_MAXIMO};
    for(const c of model.SIMULACRO.columns)if(c.required&&!c.default&&exam[c.name]==null)throw rule(`Completa ${c.name}.`);
    validateFields(model.SIMULACRO,exam);
    validateFields(model.SIMULACRO_HORARIO,{FECHA_PROGRAMADA:body.FECHA_PROGRAMADA,HORA_INICIO:body.HORA_INICIO,DURACION_MINUTOS:body.DURACION_MINUTOS});
    if(!body.FECHA_PROGRAMADA||!body.HORA_INICIO||!(body.DURACION_MINUTOS>0)||!(body.PUNTAJE_MAXIMO>0))throw rule('Completa fecha, hora, duración y puntaje máximo.');
    if(!Array.isArray(body.grupos)||!body.grupos.length||body.grupos.length>100||new Set(body.grupos).size!==body.grupos.length||body.grupos.some(g=>typeof g!=='string'||!g||g.length>20))throw rule('Selecciona grupos participantes sin duplicados (máximo 100).');
    return transaction(async tx=>{
      for(const group of [...body.grupos].sort()){
        const available=(await query(tx,"SELECT ID_HORARIO_ACADEMICO FROM dbo.HORARIO_ACADEMICO WITH (UPDLOCK,HOLDLOCK) WHERE ID_HORARIO_ACADEMICO=@group AND ACTIVO=1",{group})).recordset[0];
        if(!available)throw rule('Uno de los grupos participantes no está disponible.');
      }
      await query(tx,'INSERT dbo.SIMULACRO (ID_SIMULACRO,NOMBRE_SIMULACRO,PUNTAJE_MAXIMO) VALUES (@code,@name,@max)',{code:body.ID_SIMULACRO,name:body.NOMBRE_SIMULACRO,max:body.PUNTAJE_MAXIMO});
      for(const group of [...body.grupos].sort())await query(tx,`INSERT dbo.SIMULACRO_HORARIO
        (ID_SIMULACRO_HORARIO,ID_SIMULACRO,ID_HORARIO_ACADEMICO,FECHA_PROGRAMADA,HORA_INICIO,DURACION_MINUTOS,ESTADO,ID_ESTADO_SIMULACRO)
        VALUES (@code,@exam,@group,@date,@time,@duration,'PROGRAMADO','PROGRAMADO')`,{code:await nextCode(tx,'E4'),exam:body.ID_SIMULACRO,group,date:body.FECHA_PROGRAMADA,time:body.HORA_INICIO,duration:body.DURACION_MINUTOS});
      await audit(tx,actor,'SIMULACRO',body.ID_SIMULACRO,'CREAR',null,body,null);return {ok:true};
    });
  }
  return {query,transaction,nextCode,audit,enroll,payment,createExam};
}
module.exports={createOperations,...createOperations()};
