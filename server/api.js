'use strict';
const express=require('express');
const limit=require('express-rate-limit');
const {sql,pool,request}=require('./db');
const {bcrypt,createSession,clearSession,authenticate,admin,student}=require('./auth');
const {validate,rule}=require('./rules');
const model=require('./model.json');
const {autoCode,validateFields}=require('./validation');
const operations=require('./operations');
const accounts=require('./account-service');
const administration=require('./administration');
const {securityFor,securityReady}=require('./security-schema');
const router=express.Router();
const fixedCatalogs=new Set(['Programa','ROL','Turno','PARENTESCO','ESTADO_CICLO','ESTADO_MATRICULA','ESTADO_PAGO','ESTADO_EXAMEN_GRUPO','CONCEPTO_PAGO','TIPO_BLOQUE']);
const invalidAccess={error:'No pudimos verificar el acceso. Revisa tu usuario, contraseña y, si corresponde, el código de activación.'};
const publicUser=u=>({id:u.Cod_Usuario,nombre:u.Nomb_Usuario,rol:u.ROL_Cod_Rol,alumno:u.ALUMNO_DNI_Alu,cambiar:!!u.Debe_Cambiar_Clave,activar:!!u.Activacion_Requerida});
function safe(fn){return (req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);}
function filterSchema(t){ const m=model[t]; if(!m) throw rule('El módulo solicitado no existe.');return m;}
function idFor(m,row){return Buffer.from(JSON.stringify(m.pk.map(k=>row[k]))).toString('base64url');}
function parseId(m,id){
  try { const arr=JSON.parse(Buffer.from(id,'base64url').toString('utf8'));if(!Array.isArray(arr)||arr.length!==m.pk.length||arr.some(x=>x===null||typeof x==='object')) throw Error();return arr; }
  catch {throw rule('Identificador de registro inválido.');}
}
function bind(req,name,col,value) {
  if(value===null || value===undefined) {req.input(name,null);return;}
  if(col.type==='bit') { if(value!==true&&value!==false&&value!==1&&value!==0) throw rule(`${col.name}: ingresa un valor verdadero o falso.`);req.input(name,sql.Bit,Boolean(value));return; }
  if(col.type==='tinyint'||col.type==='smallint') {
    const num=Number(value), hi=col.type==='tinyint'?255:32767;
    if(!Number.isInteger(num)||num<0||num>hi) throw rule(`${col.name}: número fuera de rango.`);
    req.input(name,col.type==='tinyint'?sql.TinyInt:sql.SmallInt,num);return;
  }
  if(col.type==='decimal') {
    const num=Number(value);if(!Number.isFinite(num)||num<0||Math.abs(num*10**(col.scale||0)-Math.round(num*10**(col.scale||0)))>0.000001) throw rule(`${col.name}: número decimal inválido.`);
    req.input(name,sql.Decimal(col.length,col.scale||0),num);return;
  }
  if(col.type==='date') {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value))||isNaN(Date.parse(value+'T00:00:00Z')))throw rule(`${col.name}: fecha inválida.`);
    req.input(name,sql.VarChar(10),value);return;
  }
  if(col.type==='datetime2') {
    const s=String(value).replace('T',' ').replace(/\.\d+Z?$/,'').replace(/Z$/,'');
    if(!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(s))throw rule(`${col.name}: fecha/hora inválida.`);
    req.input(name,sql.VarChar(25),s);return;
  }
  if(col.type==='time') {
    if(!/^\d{2}:\d{2}(:\d{2})?$/.test(String(value)))throw rule(`${col.name}: hora inválida.`);
    req.input(name,sql.VarChar(8),value);return;
  }
  if(typeof value!=='string' || value.length>col.length || value.trim()==='') throw rule(`${col.name}: texto obligatorio o supera ${col.length} caracteres.`);
  req.input(name,col.type==='nvarchar'?sql.NVarChar(col.length):sql.VarChar(col.length),value.trim());
}
function existingWhere(m,values,req,prefix='key'){
  return m.pk.map((k,i)=>{ const col=m.columns.find(c=>c.name===k);bind(req,`${prefix}${i}`,col,values[i]);return `[${k}]=@${prefix}${i}`;}).join(' AND ');
}
function canAutoCode(m,col){return autoCode(m,col);}
function dataFor(m,body,isInsert){
  if(!body||typeof body!=='object'||Array.isArray(body)) throw rule('Envía un objeto JSON válido.');
  if(m.name==='Usuario'&&Object.hasOwn(body,'Debe_Cambiar_Clave'))throw rule('El cambio obligatorio de contraseña se administra automáticamente.');
  const writable=m.columns.filter(c=>c.name!=='Clave_Hash');const allowed=new Set([...writable.map(c=>c.name),...(m.name==='Usuario'?['Nueva_Clave']:[]),...(['Nota_Examen','Examen_Grupo'].includes(m.name)?['Motivo_Cambio']:[])]);
  for(const name of Object.keys(body)) if(!allowed.has(name)) throw rule(`Campo desconocido o protegido: ${name}`);
  const data={};
  for(const col of writable){
    if(!Object.prototype.hasOwnProperty.call(body,col.name)) {
      if(isInsert && col.required&&!col.default && !canAutoCode(m,col) && !['Estado','Usuario_Cod_Usuario'].includes(col.name)) throw rule(`Completa el campo «${col.name}».`);
      continue;
    }
    let value=body[col.name];if(value==='')value=null;
    if(value===null&&col.required && !(isInsert&&canAutoCode(m,col))) throw rule(`«${col.name}» es obligatorio.`);
    if(!isInsert&&col.pk)throw rule('Los identificadores de los registros no se pueden modificar.');
    if(isInsert&&canAutoCode(m,col)){if(value!==null)throw rule(`El código ${col.name} se genera automáticamente.`);continue;}
    data[col.name]=value;
  }
  if(m.name==='Examen_Grupo'&&isInsert && !Object.prototype.hasOwnProperty.call(data,'Estado'))data.Estado=data.ESTADO_EXAMEN_GRUPO_Cod_Estado_Examen;
  if(m.name==='Pago' && isInsert && data.ESTADO_PAGO_Cod_Estado==='PAGADO') {
    data.Usuario_Cod_Usuario='RESUELTO_POR_BACKEND';
    if(!data.Fech_Pago)data.Fech_Pago=new Date().toISOString().slice(0,19).replace('T',' ');
  }
  return data;
}
function projection(m){return m.columns.filter(c=>c.name!=='Clave_Hash').map(c=>`[${c.name}]`).join(', ');}
function sqlError(e){
  if(e.status) return e;
  const code=e.number||e.originalError?.info?.number;
  if(code===2627||code===2601) return rule('Ya existe un registro con ese identificador o combinación de valores.');
  if(code===547) return rule('La operación incumple una relación o regla de la base de datos. Verifica las referencias y los valores.');
  if(code===515) return rule('Falta un campo obligatorio.');
  if(code===8152||code===2628) return rule('Uno de los textos supera la longitud permitida.');
  const triggers={
    51001:'Número de mensualidad fuera de la duración del ciclo.',
    51002:'El bloque está fuera del horario del turno.',
    51003:'Cruce de horario: el grupo, aula o docente ya está ocupado.',
    51004:'La nota supera el puntaje máximo del simulacro.',
    51005:'El grupo ha excedido el cupo de matrículas activas.'
  };
  if(triggers[code])return rule(triggers[code]);
  if(code===1205){const err=rule('Conflicto de acceso simultáneo. Intenta nuevamente.');err.status=409;return err;}
  return e;
}
router.get('/health',safe(async(req,res)=>{ const r=await request();await r.query('SELECT 1 AS ok');res.json({ok:true,service:'Fractales Academy'}); }));
router.post('/auth/login',limit({windowMs:15*60*1000,limit:10,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Demasiados intentos. Espera 15 minutos.'}}),safe(async(req,res)=>{
  const name=String(req.body?.usuario||'').trim().slice(0,80),pass=String(req.body?.clave||'');
  if(!name||!pass||pass.length>200) return res.status(400).json({error:'Ingresa usuario y contraseña.'});
  const q=await request();q.input('name',sql.VarChar(80),name);
  const u=(await q.query('SELECT Cod_Usuario,Nomb_Usuario,Clave_Hash,ROL_Cod_Rol,ALUMNO_DNI_Alu,Debe_Cambiar_Clave FROM dbo.Usuario WHERE Nomb_Usuario=@name AND Activo=1')).recordset[0];
  if(!u||!['ADMIN','ALUMNO'].includes(u.ROL_Cod_Rol)||!(await bcrypt.compare(pass,u.Clave_Hash)))return res.status(401).json(invalidAccess);
  const secured=await securityFor(u);
  if(!secured.Alumno_Activo)return res.status(401).json(invalidAccess);
  let proof=null;
  if(secured.Activacion_Requerida){proof=await accounts.activationProof(secured,req.body?.codigoActivacion);if(!proof)return res.status(401).json(invalidAccess);}
  createSession(res,secured,proof?{scope:'onboarding',activation:proof}:{});res.json({user:publicUser(secured)});
}));
router.post('/auth/logout',(req,res)=>{clearSession(res);res.json({ok:true});});
router.get('/auth/me',authenticate,(req,res)=>res.json({user:publicUser(req.user)}));
router.post('/auth/change-password',authenticate,safe(async(req,res)=>{
  const updated=await accounts.changePassword(req.user,req.auth,req.body);createSession(res,updated);res.json({ok:true,user:publicUser(updated)});
}));
router.use(require('./accounts-api'));
router.use(require('./v4-api'));
router.use(require('./maintenance-api'));
router.get('/meta',authenticate,admin,(req,res)=>res.json({modules:Object.values(model).map(m=>({...m,columns:m.columns.filter(c=>c.name!=='Clave_Hash')}))}));
router.get('/options/:table',authenticate,admin,safe(async(req,res)=>{
  const m=filterSchema(req.params.table);
  const term=String(req.query.q||'').trim().slice(0,60);
  const valueCol=String(req.query.valueCol||m.pk[0]);
  if(!m.columns.some(c=>c.name===valueCol))throw rule('Columna de referencia desconocida.');
  const r=await request();r.input('q',sql.NVarChar(100),`%${term}%`);
  const displayCols=m.display.map(n=>`CONVERT(nvarchar(200),[${n}]) LIKE @q`).join(' OR ');
  const rows=(await r.query(`SELECT TOP (80) ${projection(m)} FROM dbo.[${m.name}] WHERE ${displayCols} ORDER BY [${m.pk[0]}]`)).recordset;
  res.json({rows:rows.map(row=>({value:row[valueCol],label:m.display.map(k=>row[k]).filter(v=>v!==null&&v!==undefined).join(' · '),row}))});
}));
router.get('/dashboard',authenticate,admin,safe(async(req,res)=>{
  const p=await pool();const [a,b,c,d,e,f,g,h,i]=await Promise.all([
    p.request().query('SELECT COUNT_BIG(*) n FROM dbo.ALUMNO'),
    p.request().query("SELECT COUNT_BIG(*) n FROM dbo.MATRICULA WHERE ESTADO_MATRICULA_Cod_Estado_Matricula='ACTIVA'"),
    p.request().query("SELECT COUNT_BIG(*) n FROM dbo.Pago WHERE ESTADO_PAGO_Cod_Estado='PENDIENTE'"),
    p.request().query("SELECT ISNULL(SUM(Monto),0) n FROM dbo.Pago WHERE ESTADO_PAGO_Cod_Estado='PAGADO' AND Fech_Pago>=DATEFROMPARTS(YEAR(GETDATE()),MONTH(GETDATE()),1)"),
    p.request().query(`SELECT TOP 6 m.Cod_Matricula,a.Nomb_Alu,g.Nomb_Grupo,m.Fech_Matricula FROM dbo.MATRICULA m JOIN dbo.ALUMNO a ON a.DNI_Alu=m.ALUMNO_DNI_Alu JOIN dbo.Grupo g ON g.Cod_Grupo=m.Grupo_Cod_Grupo ORDER BY m.Fech_Matricula DESC,m.Cod_Matricula DESC`),
    p.request().query(`SELECT TOP 5 eg.Fech_programada,e.Nomb_Examen,g.Nomb_Grupo FROM dbo.Examen_Grupo eg JOIN dbo.Examen e ON e.Cod_Examen=eg.Examen_Cod_Examen JOIN dbo.Grupo g ON g.Cod_Grupo=eg.Grupo_Cod_Grupo WHERE eg.Fech_programada>=CONVERT(date,GETDATE()) AND eg.ESTADO_EXAMEN_GRUPO_Cod_Estado_Examen='PROGRAMADO' ORDER BY eg.Fech_programada`),
    p.request().query('SELECT COUNT_BIG(*) n FROM dbo.Grupo WHERE Activo=1'),
    p.request().query("SELECT COUNT_BIG(*) n FROM dbo.Ciclo WHERE ESTADO_CICLO_Cod_Estado='ACTIVO'"),
    p.request().query("SELECT COUNT_BIG(*) n FROM dbo.Pago WHERE ESTADO_PAGO_Cod_Estado='PAGADO'")
  ]);
  res.json({alumnos:Number(a.recordset[0].n),matriculas:Number(b.recordset[0].n),pendientes:Number(c.recordset[0].n),ingresos:Number(d.recordset[0].n),recent:e.recordset,exams:f.recordset,grupos:Number(g.recordset[0].n),ciclosActivos:Number(h.recordset[0].n),pagosRegistrados:Number(i.recordset[0].n)});
}));
router.get('/records/:table',authenticate,admin,safe(async(req,res)=>{
  const m=filterSchema(req.params.table);
  const page=Math.max(1,Math.min(100000,parseInt(req.query.page,10)||1));const limitPage=15;
  const search=String(req.query.q||'').trim().slice(0,80);
  const p=await pool();const q=p.request();q.input('q',sql.NVarChar(180),`%${search}%`);q.input('offset',sql.Int,(page-1)*limitPage);q.input('lim',sql.Int,limitPage);
  const look=m.display.map(k=>`CONVERT(nvarchar(200),[${k}]) LIKE @q`).join(' OR ');
  const active=administration.policy(m).activeField,sidecar=['ALUMNO','Nota_Examen'].includes(m.name)&&await securityReady();
  const join=sidecar?(m.name==='ALUMNO'?'LEFT JOIN dbo.Alumno_Estado_V41 es ON es.ALUMNO_DNI_Alu=ALUMNO.DNI_Alu':'LEFT JOIN dbo.Nota_Estado_V41 es ON es.Nota_Examen_Cod_Nota=Nota_Examen.Cod_Nota'):'';
  const statusExpression=sidecar?(m.name==='ALUMNO'?'ISNULL(es.Activo,1)':'CASE WHEN ISNULL(es.Anulada,0)=0 THEN 1 ELSE 0 END'):active?`[${active}]`:null;
  const extra=sidecar?`,CASE WHEN (${statusExpression})=1 THEN '${m.name==='ALUMNO'?'ACTIVO':'VIGENTE'}' ELSE '${m.name==='ALUMNO'?'BAJA':'ANULADA'}' END AS _estadoGestion`:'';
  const state=String(req.query.estado||'');if(state&&!['activo','inactivo'].includes(state))throw rule('Filtro de estado inválido.');
  const where=[...(search?[`(${look})`]:[]),...(statusExpression&&state?[`(${statusExpression})=${state==='activo'?1:0}`]:[])];
  const condition=where.length?'WHERE '+where.join(' AND '):'';
  const column=String(req.query.orden||m.pk[0]);if(!m.columns.some(c=>c.name===column&&c.name!=='Clave_Hash'))throw rule('Ordenamiento inválido.');
  const direction=req.query.direccion==='desc'?'DESC':'ASC';
  const sort=`[${column}] ${direction}`+(m.pk.includes(column)?'':','+m.pk.map(k=>`[${k}]`).join(','));
  const rows=(await q.query(`SELECT ${projection(m)}${extra} FROM dbo.[${m.name}] ${join} ${condition} ORDER BY ${sort} OFFSET @offset ROWS FETCH NEXT @lim ROWS ONLY`)).recordset;
  const r=p.request();r.input('q',sql.NVarChar(180),`%${search}%`);
  const count=(await r.query(`SELECT COUNT_BIG(*) n FROM dbo.[${m.name}] ${join} ${condition}`)).recordset[0].n;
  res.json({rows:rows.map(x=>({...x,_id:idFor(m,x)})),count:Number(count),page,pageSize:limitPage,policy:{...administration.policy(m),statusField:sidecar?'_estadoGestion':active}});
}));
router.get('/records/:table/:id',authenticate,admin,safe(async(req,res)=>{
  const m=filterSchema(req.params.table);const q=await request();const where=existingWhere(m,parseId(m,req.params.id),q);
  const row=(await q.query(`SELECT ${projection(m)} FROM dbo.[${m.name}] WHERE ${where}`)).recordset[0];
  if(!row)return res.status(404).json({error:'Registro no encontrado.'});res.json({row:{...row,_id:idFor(m,row)}});
}));
async function save(req,res,isInsert) {
  const m=filterSchema(req.params.table);const payload=dataFor(m,req.body,isInsert);
  if(['Grupo','Horario'].includes(m.name))throw rule('Edita y guarda el horario semanal completo desde Horarios académicos.');
  if(isInsert&&fixedCatalogs.has(m.name))throw rule('Este catálogo del sistema tiene opciones definidas por las reglas académicas. Puedes editar sus descripciones permitidas.');
  if(m.name==='Pago')throw rule('Las obligaciones se generan al inscribir. Usa la gestión de pagos para confirmar o anular un cobro.');
  if(isInsert&&['ALUMNO','MATRICULA'].includes(m.name))throw rule('Utiliza el formulario de inscripción para crear alumno, cuenta, matrícula y cuotas en una transacción.');
  validateFields(m,payload);
  const p=await pool();const tx=new sql.Transaction(p);await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    if(isInsert)for(const c of m.columns)if(canAutoCode(m,c))payload[c.name]=await operations.nextCode(tx,({Usuario:'U4',Nota_Examen:'N4',Examen_Grupo:'E4'})[m.name]||'O4');
    let current=null;
    if(!isInsert){const r=await request(tx);const where=existingWhere(m,parseId(m,req.params.id),r);
      current=(await r.query(`SELECT * FROM dbo.[${m.name}] WITH (UPDLOCK,HOLDLOCK) WHERE ${where}`)).recordset[0];
      if(!current)throw Object.assign(new Error('Registro no encontrado.'),{status:404});
    }
    if(m.name==='Usuario') {
      if(isInsert){
        if(typeof req.body.Nueva_Clave!=='string'||req.body.Nueva_Clave.length<12||Buffer.byteLength(req.body.Nueva_Clave,'utf8')>72)throw rule('La contraseña inicial debe tener al menos 12 caracteres y hasta 72 bytes.');
        payload.Clave_Hash=await bcrypt.hash(req.body.Nueva_Clave,12);
        payload.Debe_Cambiar_Clave=true;
      } else if(Object.prototype.hasOwnProperty.call(req.body,'Nueva_Clave') && req.body.Nueva_Clave) {
        if(typeof req.body.Nueva_Clave!=='string'||req.body.Nueva_Clave.length<12||Buffer.byteLength(req.body.Nueva_Clave,'utf8')>72)throw rule('La contraseña debe tener al menos 12 caracteres y hasta 72 bytes.');
        payload.Clave_Hash=await bcrypt.hash(req.body.Nueva_Clave,12);payload.Debe_Cambiar_Clave=true;
      }
    }
    if(m.name==='Horario'&&(payload.TIPO_BLOQUE_Cod_Tipo??current?.TIPO_BLOQUE_Cod_Tipo)==='CLASE'){
      const course=payload.Docente_Asignatura_CURSOS_Cod_Curso??current?.Docente_Asignatura_CURSOS_Cod_Curso;
      const teacher=payload.Docente_Asignatura_Docente_DNI_Doc??current?.Docente_Asignatura_Docente_DNI_Doc;
      const valid=(await operations.query(tx,`SELECT c.Cod_Curso FROM dbo.CURSOS c WITH (UPDLOCK,HOLDLOCK)
        CROSS JOIN dbo.Docente d WITH (UPDLOCK,HOLDLOCK) WHERE c.Cod_Curso=@course AND c.Activa=1 AND d.DNI_Doc=@teacher AND d.Activo=1`,{course,teacher})).recordset[0];
      if(!valid)throw rule('Selecciona un curso y un docente activos.');
      await operations.query(tx,`IF NOT EXISTS(SELECT 1 FROM dbo.Docente_Asignatura WITH (UPDLOCK,HOLDLOCK) WHERE CURSOS_Cod_Curso=@course AND Docente_DNI_Doc=@teacher)
        INSERT dbo.Docente_Asignatura(CURSOS_Cod_Curso,Docente_DNI_Doc) VALUES(@course,@teacher)`,{course,teacher});
    }
    if(m.name==='ALUMNO')await require('./schema-v44').required(tx);
    await validate(m.name,payload,current,tx,req.user);
    // Campos calculados únicamente por el backend; no son confiables si vienen del navegador.
    if(m.name==='Pago') {
      if(Object.prototype.hasOwnProperty.call(req.body,'Usuario_Cod_Usuario'))throw rule('El cajero se toma de la sesión autenticada.');
    }
    const values=Object.entries(payload);
    if(isInsert && !values.length)throw rule('No hay campos para registrar.');
    if(!isInsert && !values.length)throw rule('No se enviaron cambios.');
    const r=await request(tx);
    values.forEach(([key,value],i)=>bind(r,`v${i}`,m.columns.find(c=>c.name===key),value));
    let query;
    if(isInsert) query=`INSERT INTO dbo.[${m.name}] (${values.map(([k])=>`[${k}]`).join(',')}) VALUES (${values.map((_,i)=>`@v${i}`).join(',')})`;
    else { const where=existingWhere(m,parseId(m,req.params.id),r);
      query=`UPDATE dbo.[${m.name}] SET ${values.map(([k],i)=>`[${k}]=@v${i}`).join(',')} WHERE ${where}`;
    }
    await r.query(query);
    // Un alta no tiene sesiones anteriores. La revocación corresponde a cambios de cuentas existentes.
    if(m.name==='Usuario'&&!isInsert&&(payload.Clave_Hash||Object.hasOwn(payload,'Activo')&&Boolean(payload.Activo)!==Boolean(current.Activo))&&await securityReady(tx))await accounts.revoke(tx,current.Cod_Usuario,payload.Clave_Hash?false:undefined);
    if(['Nota_Examen','Examen_Grupo'].includes(m.name)){
      const reason=req.body.Motivo_Cambio;
      if(!isInsert&&(typeof reason!=='string'||reason.trim().length<5||reason.length>250))throw rule('Describe el motivo del cambio (5 a 250 caracteres).');
      await operations.audit(tx,req.user,m.name,current?.[m.pk[0]]||payload[m.pk[0]],isInsert?'CREAR':'CORREGIR',current,{...current,...payload},reason);
    }else await operations.audit(tx,req.user,m.name,m.pk.map(k=>String(current?.[k]||payload[k])).join('|'),isInsert?'CREAR':'EDITAR',current,{...current,...payload},req.body.Motivo_Cambio);
    await tx.commit();res.status(isInsert?201:200).json({ok:true,message:isInsert?'Registro guardado.':'Cambios guardados.'});
  } catch(e) {try{await tx.rollback();}catch{}throw sqlError(e);}
}
router.post('/records/:table',authenticate,admin,safe((req,res)=>save(req,res,true)));
router.put('/records/:table/:id',authenticate,admin,safe((req,res)=>save(req,res,false)));
router.delete('/records/:table/:id',authenticate,admin,safe(async(req,res)=>{
  res.json(await administration.remove(req.params.table,req.params.id,req.body,req.user));
}));
router.get('/records/:table/:id/actions',authenticate,admin,safe(async(req,res)=>res.json(await administration.review(req.params.table,req.params.id,req.user))));
router.post('/records/:table/:id/state',authenticate,admin,safe(async(req,res)=>res.json(await administration.changeState(req.params.table,req.params.id,req.body,req.user))));
router.get('/student/overview',authenticate,student,safe(async(req,res)=>{
  const dni=req.user.ALUMNO_DNI_Alu,p=await pool(),v41=await securityReady();
  async function query(text){const r=p.request();r.input('dni',sql.VarChar(8),dni);return (await r.query(text)).recordset;}
  const [profile,groups,notes,schedule,exams,payments]=await Promise.all([
    query('SELECT DNI_Alu,Nomb_Alu,Correo_Alu,CARRERA_Cod_Carrera FROM dbo.ALUMNO WHERE DNI_Alu=@dni'),
    query(`SELECT m.Cod_Matricula,m.Fech_Matricula,m.ESTADO_MATRICULA_Cod_Estado_Matricula,g.Cod_Grupo,g.Nomb_Grupo,c.Nomb_Ciclo,c.Cod_Ciclo,c.Fech_Inicio,c.Fech_Fin,c.Modalidad,p.Nomb_Programa,t.Nomb_Turno FROM dbo.MATRICULA m JOIN dbo.Grupo g ON g.Cod_Grupo=m.Grupo_Cod_Grupo JOIN dbo.Ciclo c ON c.Cod_Ciclo=g.Ciclo_Cod_Ciclo JOIN dbo.Programa p ON p.Cod_Programa=c.Programa_Cod_Programa JOIN dbo.Turno t ON t.Cod_Turno=g.Turno_Cod_Turno WHERE m.ALUMNO_DNI_Alu=@dni ORDER BY m.Fech_Matricula DESC,m.Cod_Matricula DESC`),
    query(`SELECT ne.Puntaje_total,ne.Fech_registro,ex.Nomb_Examen,ex.puntaje_maximo,g.Nomb_Grupo,eg.Fech_programada FROM dbo.Nota_Examen ne JOIN dbo.MATRICULA ma ON ma.Cod_Matricula=ne.MATRICULA_Cod_Matricula JOIN dbo.Examen_Grupo eg ON eg.Cod_examen_grupo=ne.Examen_Grupo_Cod_examen_grupo JOIN dbo.Examen ex ON ex.Cod_Examen=eg.Examen_Cod_Examen JOIN dbo.Grupo g ON g.Cod_Grupo=ma.Grupo_Cod_Grupo ${v41?'LEFT JOIN dbo.Nota_Estado_V41 ns ON ns.Nota_Examen_Cod_Nota=ne.Cod_Nota':''} WHERE ma.ALUMNO_DNI_Alu=@dni AND eg.Publicado=1 ${v41?'AND ISNULL(ns.Anulada,0)=0':''} ORDER BY eg.Fech_programada DESC`),
    query(`SELECT h.Dia_Semana,h.Hr_Inicio,h.Hr_Fin,h.TIPO_BLOQUE_Cod_Tipo,co.Cod_Curso curso,co.Nomb_Curso,d.Nom_Doc,g.Nomb_Grupo,t.Nomb_Turno,a.Nomb_Aula FROM dbo.Horario h JOIN dbo.Grupo g ON g.Cod_Grupo=h.Grupo_Cod_Grupo JOIN dbo.Turno t ON t.Cod_Turno=g.Turno_Cod_Turno JOIN dbo.Aula a ON a.Cod_Aula=g.Aula_Cod_Aula JOIN dbo.MATRICULA m ON m.Grupo_Cod_Grupo=g.Cod_Grupo LEFT JOIN dbo.CURSOS co ON co.Cod_Curso=h.Docente_Asignatura_CURSOS_Cod_Curso LEFT JOIN dbo.Docente d ON d.DNI_Doc=h.Docente_Asignatura_Docente_DNI_Doc WHERE m.ALUMNO_DNI_Alu=@dni AND m.ESTADO_MATRICULA_Cod_Estado_Matricula='ACTIVA' AND h.Activo=1 AND g.Activo=1 ORDER BY h.Dia_Semana,h.Hr_Inicio`),
    query(`SELECT eg.Fech_programada,eg.Hr_inicio,e.Nomb_Examen,g.Nomb_Grupo FROM dbo.Examen_Grupo eg JOIN dbo.Examen e ON e.Cod_Examen=eg.Examen_Cod_Examen JOIN dbo.Grupo g ON g.Cod_Grupo=eg.Grupo_Cod_Grupo JOIN dbo.MATRICULA m ON m.Grupo_Cod_Grupo=g.Cod_Grupo WHERE m.ALUMNO_DNI_Alu=@dni AND m.ESTADO_MATRICULA_Cod_Estado_Matricula='ACTIVA' AND eg.ESTADO_EXAMEN_GRUPO_Cod_Estado_Examen='PROGRAMADO' ORDER BY eg.Fech_programada`),
    query(`SELECT Cod_Pago,MATRICULA_Cod_Matricula,CONCEPTO_PAGO_Cod_Concepto,Nro_Mensualidad,Monto,ESTADO_PAGO_Cod_Estado,Fech_Vencimiento,Fech_Pago,Medio_Pago FROM dbo.Pago WHERE ALUMNO_DNI_Alu=@dni ORDER BY Fech_Vencimiento DESC,Cod_Pago`)
  ]);
  res.json({profile:profile[0]||null,groups,notes,schedule,exams,payments});
}));
router.use((req,res)=>res.status(404).json({error:'La operación solicitada no existe.'}));
module.exports=router;
