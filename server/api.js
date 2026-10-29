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
const trash=require('./trash');
const {securityFor,securityReady}=require('./security-schema');
const router=express.Router();
const fixedCatalogs=new Set(['PROGRAMA','ROL','TURNO','PARENTESCO','ESTADO_CICLO','ESTADO_MATRICULA','ESTADO_PAGO','ESTADO_SIMULACRO','CONCEPTO_PAGO','TIPO_BLOQUE']);
const invalidAccess={error:'No pudimos verificar el acceso. Revisa tu usuario, contraseña y, si corresponde, el código de activación.'};
const publicUser=u=>({id:u.ID_USUARIO,nombre:u.NOMBRE_USUARIO,rol:u.ID_ROL,alumno:u.DNI_ALUMNO,cambiar:!!u.DEBE_CAMBIAR_CLAVE,activar:!!u.ACTIVACION_REQUERIDA});
function safe(fn){return (req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);}
router.use(safe(async(req,res,next)=>{await require('./schema-v45').required();next();}));
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
  if(m.name==='USUARIO'&&Object.hasOwn(body,'DEBE_CAMBIAR_CLAVE'))throw rule('El cambio obligatorio de contraseña se administra automáticamente.');
  const writable=m.columns.filter(c=>c.name!=='CLAVE_HASH');const allowed=new Set([...writable.map(c=>c.name),...(m.name==='USUARIO'?['NUEVA_CLAVE']:[]),...(['RESULTADO_SIMULACRO','SIMULACRO_HORARIO'].includes(m.name)?['Motivo_Cambio']:[])]);
  for(const name of Object.keys(body)) if(!allowed.has(name)) throw rule(`Campo desconocido o protegido: ${name}`);
  const data={};
  for(const col of writable){
    if(!Object.prototype.hasOwnProperty.call(body,col.name)) {
      if(isInsert && col.required&&!col.default && !canAutoCode(m,col) && !['ESTADO','ID_USUARIO_RESPONSABLE'].includes(col.name)) throw rule(`Completa el campo «${col.name}».`);
      continue;
    }
    let value=body[col.name];if(value==='')value=null;
    if(value===null&&col.required && !(isInsert&&canAutoCode(m,col))) throw rule(`«${col.name}» es obligatorio.`);
    if(!isInsert&&col.pk)throw rule('Los identificadores de los registros no se pueden modificar.');
    if(isInsert&&canAutoCode(m,col)){if(value!==null)throw rule(`El código ${col.name} se genera automáticamente.`);continue;}
    data[col.name]=value;
  }
  if(m.name==='SIMULACRO_HORARIO'&&isInsert && !Object.prototype.hasOwnProperty.call(data,'ESTADO'))data.ESTADO=data.ID_ESTADO_SIMULACRO;
  if(m.name==='PAGO' && isInsert && data.ID_ESTADO_PAGO==='PAGADO') {
    data.ID_USUARIO_RESPONSABLE='RESUELTO_POR_BACKEND';
    if(!data.FECHA_PAGO)data.FECHA_PAGO=new Date().toISOString().slice(0,19).replace('T',' ');
  }
  return data;
}
function projection(m){return m.columns.filter(c=>c.name!=='CLAVE_HASH').map(c=>`[${m.name}].[${c.name}]`).join(', ');}
function sqlError(e){
 const friendly=require('./sql-errors').friendly(e);if(friendly){e.status=400;e.public=true;e.message=friendly;}return e;
}
router.get('/health',safe(async(req,res)=>{ const r=await request();await r.query('SELECT 1 AS ok');res.json({ok:true,service:'Fractales Academy',version:'4.5.0',schema:'V45'}); }));
router.post('/auth/login',limit({windowMs:15*60*1000,limit:10,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Demasiados intentos. Espera 15 minutos.'}}),safe(async(req,res)=>{
  const name=String(req.body?.usuario||'').trim().slice(0,80),pass=String(req.body?.clave||'');
  if(!name||!pass||pass.length>200) return res.status(400).json({error:'Ingresa usuario y contraseña.'});
  const q=await request();q.input('name',sql.VarChar(80),name);
  const u=(await q.query('SELECT ID_USUARIO,NOMBRE_USUARIO,CLAVE_HASH,ID_ROL,DNI_ALUMNO,DEBE_CAMBIAR_CLAVE FROM dbo.USUARIO WHERE NOMBRE_USUARIO=@name AND ACTIVO=1')).recordset[0];
  if(!u||!['ADMIN','ALUMNO'].includes(u.ID_ROL)||!(await bcrypt.compare(pass,u.CLAVE_HASH)))return res.status(401).json(invalidAccess);
  const secured=await securityFor(u);
  if(!secured.Alumno_Activo)return res.status(401).json(invalidAccess);
  let proof=null;
  if(secured.ACTIVACION_REQUERIDA){proof=await accounts.activationProof(secured,req.body?.codigoActivacion);if(!proof)return res.status(401).json(invalidAccess);}
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
router.use(require('./v45-api'));
router.get('/meta',authenticate,admin,(req,res)=>res.json({modules:Object.values(model).map(m=>({...m,columns:m.columns.filter(c=>c.name!=='CLAVE_HASH')}))}));
router.get('/options/:table',authenticate,admin,safe(async(req,res)=>{
  const m=filterSchema(req.params.table);
  const term=String(req.query.q||'').trim().slice(0,60);
  const valueCol=String(req.query.valueCol||m.pk[0]);
  if(!m.columns.some(c=>c.name===valueCol))throw rule('Columna de referencia desconocida.');
  const r=await request();r.input('q',sql.NVarChar(100),`%${term}%`);
  const displayCols=m.display.map(n=>`CONVERT(nvarchar(200),[${n}]) LIKE @q`).join(' OR ');
  const rows=(await r.query(`SELECT TOP (80) ${projection(m)} FROM dbo.[${m.name}] WHERE (${displayCols}) AND ${trash.visible(m)} ORDER BY [${m.pk[0]}]`)).recordset;
  res.json({rows:rows.map(row=>({value:row[valueCol],label:m.display.map(k=>row[k]).filter(v=>v!==null&&v!==undefined).join(' · '),row}))});
}));
router.get('/dashboard',authenticate,admin,safe(async(req,res)=>{
  const p=await pool();const [a,b,c,d,e,f,g,h,i]=await Promise.all([
    p.request().query(`SELECT COUNT_BIG(*) n FROM dbo.ALUMNO WHERE ${trash.visible(model.ALUMNO)}`),
    p.request().query("SELECT COUNT_BIG(*) n FROM dbo.MATRICULA WHERE ID_ESTADO_MATRICULA='ACTIVA'"),
    p.request().query("SELECT COUNT_BIG(*) n FROM dbo.PAGO WHERE ID_ESTADO_PAGO='PENDIENTE'"),
    p.request().query("SELECT ISNULL(SUM(MONTO),0) n FROM dbo.PAGO WHERE ID_ESTADO_PAGO='PAGADO' AND FECHA_PAGO>=DATEFROMPARTS(YEAR(GETDATE()),MONTH(GETDATE()),1)"),
    p.request().query(`SELECT TOP 6 m.ID_MATRICULA,a.NOMBRE_COMPLETO,g.NOMBRE_HORARIO,m.FECHA_MATRICULA FROM dbo.MATRICULA m JOIN dbo.ALUMNO a ON a.DNI_ALUMNO=m.DNI_ALUMNO JOIN dbo.HORARIO_ACADEMICO g ON g.ID_HORARIO_ACADEMICO=m.ID_HORARIO_ACADEMICO WHERE ${trash.visible(model.ALUMNO,'a')} ORDER BY m.FECHA_MATRICULA DESC,m.ID_MATRICULA DESC`),
    p.request().query(`SELECT TOP 5 eg.FECHA_PROGRAMADA,e.NOMBRE_SIMULACRO,g.NOMBRE_HORARIO FROM dbo.SIMULACRO_HORARIO eg JOIN dbo.SIMULACRO e ON e.ID_SIMULACRO=eg.ID_SIMULACRO JOIN dbo.HORARIO_ACADEMICO g ON g.ID_HORARIO_ACADEMICO=eg.ID_HORARIO_ACADEMICO WHERE eg.FECHA_PROGRAMADA>=CONVERT(date,GETDATE()) AND eg.ID_ESTADO_SIMULACRO='PROGRAMADO' ORDER BY eg.FECHA_PROGRAMADA`),
    p.request().query('SELECT COUNT_BIG(*) n FROM dbo.HORARIO_ACADEMICO WHERE ACTIVO=1'),
    p.request().query("SELECT COUNT_BIG(*) n FROM dbo.CICLO WHERE ID_ESTADO_CICLO='ACTIVO'"),
    p.request().query("SELECT COUNT_BIG(*) n FROM dbo.PAGO WHERE ID_ESTADO_PAGO='PAGADO'")
  ]);
  res.json({alumnos:Number(a.recordset[0].n),matriculas:Number(b.recordset[0].n),pendientes:Number(c.recordset[0].n),ingresos:Number(d.recordset[0].n),recent:e.recordset,exams:f.recordset,grupos:Number(g.recordset[0].n),ciclosActivos:Number(h.recordset[0].n),pagosRegistrados:Number(i.recordset[0].n)});
}));
router.get('/records/:table',authenticate,admin,safe(async(req,res)=>{
  const m=filterSchema(req.params.table);
  const page=Math.max(1,Math.min(100000,parseInt(req.query.page,10)||1));const limitPage=15;
  const search=String(req.query.q||'').trim().slice(0,80);
  const p=await pool();const q=p.request();q.input('q',sql.NVarChar(180),`%${search}%`);q.input('offset',sql.Int,(page-1)*limitPage);q.input('lim',sql.Int,limitPage);
  const look=m.display.map(k=>`CONVERT(nvarchar(200),[${m.name}].[${k}]) LIKE @q`).join(' OR ');
  const active=administration.policy(m).activeField,sidecar=['ALUMNO','RESULTADO_SIMULACRO'].includes(m.name)&&await securityReady();
  const join=sidecar?(m.name==='ALUMNO'?'LEFT JOIN dbo.ESTADO_ALUMNO es ON es.DNI_ALUMNO=ALUMNO.DNI_ALUMNO':'LEFT JOIN dbo.ESTADO_RESULTADO es ON es.ID_RESULTADO=RESULTADO_SIMULACRO.ID_RESULTADO'):'';
  const statusExpression=sidecar?(m.name==='ALUMNO'?'ISNULL(es.ACTIVO,1)':'CASE WHEN ISNULL(es.ANULADO,0)=0 THEN 1 ELSE 0 END'):active?`[${active}]`:null;
  const extra=sidecar?`,CASE WHEN (${statusExpression})=1 THEN '${m.name==='ALUMNO'?'ACTIVO':'VIGENTE'}' ELSE '${m.name==='ALUMNO'?'BAJA':'ANULADA'}' END AS _estadoGestion`:'';
  const state=String(req.query.estado||'');if(state&&!['ACTIVO','inactivo'].includes(state))throw rule('Filtro de estado inválido.');
  const where=[trash.visible(m),...(search?[`(${look})`]:[]),...(statusExpression&&state?[`(${statusExpression})=${state==='ACTIVO'?1:0}`]:[])];
  const condition=where.length?'WHERE '+where.join(' AND '):'';
  const column=String(req.query.orden||m.pk[0]);if(!m.columns.some(c=>c.name===column&&c.name!=='CLAVE_HASH'))throw rule('Ordenamiento inválido.');
  const direction=req.query.direccion==='desc'?'DESC':'ASC';
  const sort=`[${m.name}].[${column}] ${direction}`+(m.pk.includes(column)?'':','+m.pk.map(k=>`[${m.name}].[${k}]`).join(','));
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
  if(['HORARIO_ACADEMICO','BLOQUE_HORARIO'].includes(m.name))throw rule('Edita y guarda el horario semanal completo desde Horarios académicos.');
  if(isInsert&&fixedCatalogs.has(m.name))throw rule('Este catálogo del sistema tiene opciones definidas por las reglas académicas. Puedes editar sus descripciones permitidas.');
  if(m.name==='PAGO')throw rule('Las obligaciones se generan al inscribir. Usa la gestión de pagos para confirmar o anular un cobro.');
  if(isInsert&&['ALUMNO','MATRICULA'].includes(m.name))throw rule('Utiliza el formulario de inscripción para crear alumno, cuenta, matrícula y cuotas en una transacción.');
  validateFields(m,payload);
  const p=await pool();const tx=new sql.Transaction(p);await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    if(isInsert)for(const c of m.columns)if(canAutoCode(m,c))payload[c.name]=await operations.nextCode(tx,({USUARIO:'U4',RESULTADO_SIMULACRO:'N4',SIMULACRO_HORARIO:'E4'})[m.name]||'O4');
    let current=null;
    if(!isInsert){const r=await request(tx);const where=existingWhere(m,parseId(m,req.params.id),r);
      current=(await r.query(`SELECT * FROM dbo.[${m.name}] WITH (UPDLOCK,HOLDLOCK) WHERE ${where}`)).recordset[0];
      if(!current)throw Object.assign(new Error('Registro no encontrado.'),{status:404});
      if(await trash.current(tx,m.name,req.params.id))throw rule('Restaura el registro desde la papelera antes de editarlo.');
    }
    if(m.name==='USUARIO') {
      if(isInsert){
        if(typeof req.body.NUEVA_CLAVE!=='string'||req.body.NUEVA_CLAVE.length<12||Buffer.byteLength(req.body.NUEVA_CLAVE,'utf8')>72)throw rule('La contraseña inicial debe tener al menos 12 caracteres y hasta 72 bytes.');
        payload.CLAVE_HASH=await bcrypt.hash(req.body.NUEVA_CLAVE,12);
        payload.DEBE_CAMBIAR_CLAVE=true;
      } else if(Object.prototype.hasOwnProperty.call(req.body,'NUEVA_CLAVE') && req.body.NUEVA_CLAVE) {
        if(typeof req.body.NUEVA_CLAVE!=='string'||req.body.NUEVA_CLAVE.length<12||Buffer.byteLength(req.body.NUEVA_CLAVE,'utf8')>72)throw rule('La contraseña debe tener al menos 12 caracteres y hasta 72 bytes.');
        payload.CLAVE_HASH=await bcrypt.hash(req.body.NUEVA_CLAVE,12);payload.DEBE_CAMBIAR_CLAVE=true;
      }
    }
    if(m.name==='BLOQUE_HORARIO'&&(payload.ID_TIPO_BLOQUE??current?.ID_TIPO_BLOQUE)==='CLASE'){
      const course=payload.ID_CURSO??current?.ID_CURSO;
      const teacher=payload.DNI_DOCENTE??current?.DNI_DOCENTE;
      const valid=(await operations.query(tx,`SELECT c.ID_CURSO FROM dbo.CURSO c WITH (UPDLOCK,HOLDLOCK)
        CROSS JOIN dbo.DOCENTE d WITH (UPDLOCK,HOLDLOCK) WHERE c.ID_CURSO=@course AND c.ACTIVO=1 AND d.DNI_DOCENTE=@teacher AND d.ACTIVO=1`,{course,teacher})).recordset[0];
      if(!valid)throw rule('Selecciona un curso y un docente activos.');
      await operations.query(tx,`IF NOT EXISTS(SELECT 1 FROM dbo.CURSO_DOCENTE WITH (UPDLOCK,HOLDLOCK) WHERE ID_CURSO=@course AND DNI_DOCENTE=@teacher)
        INSERT dbo.CURSO_DOCENTE(ID_CURSO,DNI_DOCENTE) VALUES(@course,@teacher)`,{course,teacher});
    }
    if(m.name==='ALUMNO')await require('./schema-v44').required(tx);
    await validate(m.name,payload,current,tx,req.user);
    // Campos calculados únicamente por el backend; no son confiables si vienen del navegador.
    if(m.name==='PAGO') {
      if(Object.prototype.hasOwnProperty.call(req.body,'ID_USUARIO_RESPONSABLE'))throw rule('El cajero se toma de la sesión autenticada.');
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
    if(m.name==='USUARIO'&&!isInsert&&(payload.CLAVE_HASH||Object.hasOwn(payload,'ACTIVO')&&Boolean(payload.ACTIVO)!==Boolean(current.ACTIVO))&&await securityReady(tx))await accounts.revoke(tx,current.ID_USUARIO,payload.CLAVE_HASH?false:undefined);
    if(['RESULTADO_SIMULACRO','SIMULACRO_HORARIO'].includes(m.name)){
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
  const dni=req.user.DNI_ALUMNO,p=await pool(),v41=await securityReady();
  async function query(text){const r=p.request();r.input('dni',sql.VarChar(8),dni);return (await r.query(text)).recordset;}
  const [profile,groups,notes,schedule,exams,payments]=await Promise.all([
    query('SELECT DNI_ALUMNO,NOMBRE_COMPLETO,CORREO,ID_CARRERA FROM dbo.ALUMNO WHERE DNI_ALUMNO=@dni'),
    query(`SELECT m.ID_MATRICULA,m.FECHA_MATRICULA,m.ID_ESTADO_MATRICULA,g.ID_HORARIO_ACADEMICO,g.NOMBRE_HORARIO,c.NOMBRE_CICLO,c.ID_CICLO,c.FECHA_INICIO,c.FECHA_FIN,c.MODALIDAD,p.NOMBRE_PROGRAMA,t.NOMBRE_TURNO FROM dbo.MATRICULA m JOIN dbo.HORARIO_ACADEMICO g ON g.ID_HORARIO_ACADEMICO=m.ID_HORARIO_ACADEMICO JOIN dbo.CICLO c ON c.ID_CICLO=g.ID_CICLO JOIN dbo.PROGRAMA p ON p.ID_PROGRAMA=c.ID_PROGRAMA JOIN dbo.TURNO t ON t.ID_TURNO=g.ID_TURNO WHERE m.DNI_ALUMNO=@dni ORDER BY m.FECHA_MATRICULA DESC,m.ID_MATRICULA DESC`),
    query(`SELECT ne.PUNTAJE_TOTAL,ne.FECHA_REGISTRO,ex.NOMBRE_SIMULACRO,ex.PUNTAJE_MAXIMO,g.NOMBRE_HORARIO,eg.FECHA_PROGRAMADA FROM dbo.RESULTADO_SIMULACRO ne JOIN dbo.MATRICULA ma ON ma.ID_MATRICULA=ne.ID_MATRICULA JOIN dbo.SIMULACRO_HORARIO eg ON eg.ID_SIMULACRO_HORARIO=ne.ID_SIMULACRO_HORARIO JOIN dbo.SIMULACRO ex ON ex.ID_SIMULACRO=eg.ID_SIMULACRO JOIN dbo.HORARIO_ACADEMICO g ON g.ID_HORARIO_ACADEMICO=ma.ID_HORARIO_ACADEMICO ${v41?'LEFT JOIN dbo.ESTADO_RESULTADO ns ON ns.ID_RESULTADO=ne.ID_RESULTADO':''} WHERE ma.DNI_ALUMNO=@dni AND eg.PUBLICADO=1 ${v41?'AND ISNULL(ns.ANULADO,0)=0':''} ORDER BY eg.FECHA_PROGRAMADA DESC`),
    query(`SELECT h.DIA_SEMANA,h.HORA_INICIO,h.HORA_FIN,h.ID_TIPO_BLOQUE,co.ID_CURSO curso,co.NOMBRE_CURSO,d.NOMBRE_COMPLETO,g.NOMBRE_HORARIO,t.NOMBRE_TURNO,a.NOMBRE_AULA FROM dbo.BLOQUE_HORARIO h JOIN dbo.HORARIO_ACADEMICO g ON g.ID_HORARIO_ACADEMICO=h.ID_HORARIO_ACADEMICO JOIN dbo.TURNO t ON t.ID_TURNO=g.ID_TURNO JOIN dbo.AULA a ON a.ID_AULA=g.ID_AULA JOIN dbo.MATRICULA m ON m.ID_HORARIO_ACADEMICO=g.ID_HORARIO_ACADEMICO LEFT JOIN dbo.CURSO co ON co.ID_CURSO=h.ID_CURSO LEFT JOIN dbo.DOCENTE d ON d.DNI_DOCENTE=h.DNI_DOCENTE WHERE m.DNI_ALUMNO=@dni AND m.ID_ESTADO_MATRICULA='ACTIVA' AND h.ACTIVO=1 AND g.ACTIVO=1 ORDER BY h.DIA_SEMANA,h.HORA_INICIO`),
    query(`SELECT eg.FECHA_PROGRAMADA,eg.HORA_INICIO,e.NOMBRE_SIMULACRO,g.NOMBRE_HORARIO FROM dbo.SIMULACRO_HORARIO eg JOIN dbo.SIMULACRO e ON e.ID_SIMULACRO=eg.ID_SIMULACRO JOIN dbo.HORARIO_ACADEMICO g ON g.ID_HORARIO_ACADEMICO=eg.ID_HORARIO_ACADEMICO JOIN dbo.MATRICULA m ON m.ID_HORARIO_ACADEMICO=g.ID_HORARIO_ACADEMICO WHERE m.DNI_ALUMNO=@dni AND m.ID_ESTADO_MATRICULA='ACTIVA' AND eg.ID_ESTADO_SIMULACRO='PROGRAMADO' ORDER BY eg.FECHA_PROGRAMADA`),
    query(`SELECT ID_PAGO,ID_MATRICULA,ID_CONCEPTO,NUMERO_MENSUALIDAD,MONTO,ID_ESTADO_PAGO,FECHA_VENCIMIENTO,FECHA_PAGO,ID_MEDIO_PAGO FROM dbo.PAGO WHERE DNI_ALUMNO=@dni ORDER BY FECHA_VENCIMIENTO DESC,ID_PAGO`)
  ]);
  res.json({profile:profile[0]||null,groups,notes,schedule,exams,payments});
}));
router.use((req,res)=>res.status(404).json({error:'La operación solicitada no existe.'}));
module.exports=router;
