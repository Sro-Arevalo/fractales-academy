'use strict';
const express=require('express');
const crypto=require('node:crypto');
const limit=require('express-rate-limit');
const {sql,pool,request}=require('./db');
const {bcrypt,createSession,clearSession,authenticate,admin,student}=require('./auth');
const {validate,rule}=require('./rules');
const model=require('./model.json');
const router=express.Router();
const publicUser=u=>({id:u.Cod_Usuario,nombre:u.Nomb_Usuario,rol:u.ROL_Cod_Rol,alumno:u.ALUMNO_DNI_Alu,cambiar:!!u.Debe_Cambiar_Clave});
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
    const num=Number(value);if(!Number.isFinite(num)||num<0||!Number.isInteger(num*Math.pow(10,col.scale||0)+1e-8)) throw rule(`${col.name}: número decimal inválido.`);
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
function canAutoCode(m,col){return m.pk.length===1&&col.pk&&/^Cod_/i.test(col.name)&&!['ROL','TIPO_BLOQUE','CONCEPTO_PAGO','ESTADO_CICLO','ESTADO_EXAMEN_GRUPO','ESTADO_MATRICULA','ESTADO_PAGO','PARENTESCO','Programa'].includes(m.name);}
function generateCode(m,col){const tag=m.name.replace(/[^a-z]/gi,'').toUpperCase().slice(0,2).padEnd(2,'X');return (tag+crypto.randomBytes(10).toString('hex')).slice(0,col.length);}
function dataFor(m,body,isInsert){
  if(!body||typeof body!=='object'||Array.isArray(body)) throw rule('Envía un objeto JSON válido.');
  const writable=m.columns.filter(c=>c.name!=='Clave_Hash');const allowed=new Set([...writable.map(c=>c.name),...(m.name==='Usuario'?['Nueva_Clave']:[])]);
  for(const name of Object.keys(body)) if(!allowed.has(name)) throw rule(`Campo desconocido o protegido: ${name}`);
  const data={};
  for(const col of writable){
    if(!Object.prototype.hasOwnProperty.call(body,col.name)) {
      if(isInsert && col.required&&!col.default && !canAutoCode(m,col) && !['Estado','Usuario_Cod_Usuario'].includes(col.name)) throw rule(`Completa el campo «${col.name}».`);
      continue;
    }
    let value=body[col.name];if(value==='')value=null;
    if(value===null&&col.required && !(isInsert&&canAutoCode(m,col))) throw rule(`«${col.name}» es obligatorio.`);
    data[col.name]=value;
  }
  if(isInsert){for(const col of m.columns)if(canAutoCode(m,col)&&!data[col.name])data[col.name]=generateCode(m,col);}
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
  if(!u||!(await bcrypt.compare(pass,u.Clave_Hash)))return res.status(401).json({error:'Usuario o contraseña incorrectos.'});
  createSession(res,u);res.json({user:publicUser(u)});
}));
router.post('/auth/logout',(req,res)=>{clearSession(res);res.json({ok:true});});
router.get('/auth/me',authenticate,(req,res)=>res.json({user:publicUser(req.user)}));
router.post('/auth/change-password',authenticate,safe(async(req,res)=>{
  const old=String(req.body?.actual||''),fresh=String(req.body?.nueva||'');
  if(fresh.length<12||fresh.length>72) throw rule('La nueva contraseña debe tener entre 12 y 72 caracteres.');
  const q=await request();q.input('id',sql.VarChar(20),req.user.Cod_Usuario);
  const u=(await q.query('SELECT Clave_Hash FROM dbo.Usuario WHERE Cod_Usuario=@id')).recordset[0];
  if(!u||!(await bcrypt.compare(old,u.Clave_Hash))) throw rule('La contraseña actual no es correcta.');
  const hash=await bcrypt.hash(fresh,12);
  const w=await request();w.input('hash',sql.VarChar(255),hash);w.input('id',sql.VarChar(20),req.user.Cod_Usuario);
  await w.query('UPDATE dbo.Usuario SET Clave_Hash=@hash,Debe_Cambiar_Clave=0 WHERE Cod_Usuario=@id');
  const updated={...req.user,Debe_Cambiar_Clave:false};createSession(res,updated);res.json({ok:true,user:publicUser(updated)});
}));
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
  const p=await pool();const [a,b,c,d,e,f]=await Promise.all([
    p.request().query('SELECT COUNT_BIG(*) n FROM dbo.ALUMNO'),
    p.request().query("SELECT COUNT_BIG(*) n FROM dbo.MATRICULA WHERE ESTADO_MATRICULA_Cod_Estado_Matricula='ACTIVA'"),
    p.request().query("SELECT COUNT_BIG(*) n FROM dbo.Pago WHERE ESTADO_PAGO_Cod_Estado='PENDIENTE'"),
    p.request().query("SELECT ISNULL(SUM(Monto),0) n FROM dbo.Pago WHERE ESTADO_PAGO_Cod_Estado='PAGADO' AND Fech_Pago>=DATEFROMPARTS(YEAR(GETDATE()),MONTH(GETDATE()),1)"),
    p.request().query(`SELECT TOP 6 m.Cod_Matricula,a.Nomb_Alu,g.Nomb_Grupo,m.Fech_Matricula FROM dbo.MATRICULA m JOIN dbo.ALUMNO a ON a.DNI_Alu=m.ALUMNO_DNI_Alu JOIN dbo.Grupo g ON g.Cod_Grupo=m.Grupo_Cod_Grupo ORDER BY m.Fech_Matricula DESC,m.Cod_Matricula DESC`),
    p.request().query(`SELECT TOP 5 eg.Fech_programada,e.Nomb_Examen,g.Nomb_Grupo FROM dbo.Examen_Grupo eg JOIN dbo.Examen e ON e.Cod_Examen=eg.Examen_Cod_Examen JOIN dbo.Grupo g ON g.Cod_Grupo=eg.Grupo_Cod_Grupo WHERE eg.Fech_programada>=CONVERT(date,GETDATE()) AND eg.ESTADO_EXAMEN_GRUPO_Cod_Estado_Examen='PROGRAMADO' ORDER BY eg.Fech_programada`)
  ]);
  res.json({alumnos:Number(a.recordset[0].n),matriculas:Number(b.recordset[0].n),pendientes:Number(c.recordset[0].n),ingresos:Number(d.recordset[0].n),recent:e.recordset,exams:f.recordset});
}));
router.get('/records/:table',authenticate,admin,safe(async(req,res)=>{
  const m=filterSchema(req.params.table);
  const page=Math.max(1,Math.min(100000,parseInt(req.query.page,10)||1));const limitPage=15;
  const search=String(req.query.q||'').trim().slice(0,80);
  const p=await pool();const q=p.request();q.input('q',sql.NVarChar(180),`%${search}%`);q.input('offset',sql.Int,(page-1)*limitPage);q.input('lim',sql.Int,limitPage);
  const look=m.display.map(k=>`CONVERT(nvarchar(200),[${k}]) LIKE @q`).join(' OR ');
  const where=search?`WHERE ${look}`:'';
  const sort=m.pk.map(k=>`[${k}]`).join(',');
  const rows=(await q.query(`SELECT ${projection(m)} FROM dbo.[${m.name}] ${where} ORDER BY ${sort} OFFSET @offset ROWS FETCH NEXT @lim ROWS ONLY`)).recordset;
  const r=p.request();r.input('q',sql.NVarChar(180),`%${search}%`);
  const count=(await r.query(`SELECT COUNT_BIG(*) n FROM dbo.[${m.name}] ${where}`)).recordset[0].n;
  res.json({rows:rows.map(x=>({...x,_id:idFor(m,x)})),count:Number(count),page,pageSize:limitPage});
}));
router.get('/records/:table/:id',authenticate,admin,safe(async(req,res)=>{
  const m=filterSchema(req.params.table);const q=await request();const where=existingWhere(m,parseId(m,req.params.id),q);
  const row=(await q.query(`SELECT ${projection(m)} FROM dbo.[${m.name}] WHERE ${where}`)).recordset[0];
  if(!row)return res.status(404).json({error:'Registro no encontrado.'});res.json({row:{...row,_id:idFor(m,row)}});
}));
async function save(req,res,isInsert) {
  const m=filterSchema(req.params.table);const payload=dataFor(m,req.body,isInsert);
  const p=await pool();const tx=new sql.Transaction(p);await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    let current=null;
    if(!isInsert){const r=await request(tx);const where=existingWhere(m,parseId(m,req.params.id),r);
      current=(await r.query(`SELECT * FROM dbo.[${m.name}] WITH (UPDLOCK,HOLDLOCK) WHERE ${where}`)).recordset[0];
      if(!current)throw Object.assign(new Error('Registro no encontrado.'),{status:404});
    }
    if(m.name==='Usuario') {
      if(isInsert){
        if(typeof req.body.Nueva_Clave!=='string'||req.body.Nueva_Clave.length<12||req.body.Nueva_Clave.length>72)throw rule('La contraseña inicial debe tener de 12 a 72 caracteres.');
        payload.Clave_Hash=await bcrypt.hash(req.body.Nueva_Clave,12);
        payload.Debe_Cambiar_Clave=true;
      } else if(Object.prototype.hasOwnProperty.call(req.body,'Nueva_Clave') && req.body.Nueva_Clave) {
        if(req.body.Nueva_Clave.length<12||req.body.Nueva_Clave.length>72)throw rule('La contraseña debe tener de 12 a 72 caracteres.');
        payload.Clave_Hash=await bcrypt.hash(req.body.Nueva_Clave,12);payload.Debe_Cambiar_Clave=true;
      }
    }
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
    await r.query(query);await tx.commit();res.status(isInsert?201:200).json({ok:true,message:isInsert?'Registro guardado.':'Cambios guardados.'});
  } catch(e) {try{await tx.rollback();}catch{}throw sqlError(e);}
}
router.post('/records/:table',authenticate,admin,safe((req,res)=>save(req,res,true)));
router.put('/records/:table/:id',authenticate,admin,safe((req,res)=>save(req,res,false)));
router.delete('/records/:table/:id',authenticate,admin,safe(async(req,res)=>{
  const m=filterSchema(req.params.table);if(m.name==='Usuario')throw rule('Por seguridad, desactiva usuarios en lugar de eliminarlos.');
  const p=await pool();const tx=new sql.Transaction(p);await tx.begin();
  try {
    const r=await request(tx);const where=existingWhere(m,parseId(m,req.params.id),r);
    // El motor SQL Server impediría eliminar registros con dependencias activas.
    const out=await r.query(`DELETE FROM dbo.[${m.name}] WHERE ${where}`);
    if(!out.rowsAffected?.[0]) throw Object.assign(new Error('Registro no encontrado.'),{status:404});
    await tx.commit();res.json({ok:true});
  } catch(e) {try{await tx.rollback();}catch{}throw sqlError(e);}
}));
router.get('/student/overview',authenticate,student,safe(async(req,res)=>{
  const dni=req.user.ALUMNO_DNI_Alu,p=await pool();
  async function query(text){const r=p.request();r.input('dni',sql.VarChar(8),dni);return (await r.query(text)).recordset;}
  const [profile,groups,notes,schedule,exams,payments]=await Promise.all([
    query('SELECT DNI_Alu,Nomb_Alu,Correo_Alu,CARRERA_Cod_Carrera FROM dbo.ALUMNO WHERE DNI_Alu=@dni'),
    query(`SELECT m.Cod_Matricula,m.ESTADO_MATRICULA_Cod_Estado_Matricula,g.Cod_Grupo,g.Nomb_Grupo,c.Nomb_Ciclo,p.Nomb_Programa FROM dbo.MATRICULA m JOIN dbo.Grupo g ON g.Cod_Grupo=m.Grupo_Cod_Grupo JOIN dbo.Ciclo c ON c.Cod_Ciclo=g.Ciclo_Cod_Ciclo JOIN dbo.Programa p ON p.Cod_Programa=c.Programa_Cod_Programa WHERE m.ALUMNO_DNI_Alu=@dni ORDER BY m.Fech_Matricula DESC`),
    query(`SELECT ne.Puntaje_total,ne.Fech_registro,ex.Nomb_Examen,ex.puntaje_maximo,g.Nomb_Grupo,eg.Fech_programada FROM dbo.Nota_Examen ne JOIN dbo.MATRICULA ma ON ma.Cod_Matricula=ne.MATRICULA_Cod_Matricula JOIN dbo.Examen_Grupo eg ON eg.Cod_examen_grupo=ne.Examen_Grupo_Cod_examen_grupo JOIN dbo.Examen ex ON ex.Cod_Examen=eg.Examen_Cod_Examen JOIN dbo.Grupo g ON g.Cod_Grupo=ma.Grupo_Cod_Grupo WHERE ma.ALUMNO_DNI_Alu=@dni AND eg.Publicado=1 ORDER BY eg.Fech_programada DESC`),
    query(`SELECT h.Dia_Semana,h.Hr_Inicio,h.Hr_Fin,h.TIPO_BLOQUE_Cod_Tipo,co.Nomb_Curso,d.Nom_Doc,g.Nomb_Grupo FROM dbo.Horario h JOIN dbo.Grupo g ON g.Cod_Grupo=h.Grupo_Cod_Grupo JOIN dbo.MATRICULA m ON m.Grupo_Cod_Grupo=g.Cod_Grupo LEFT JOIN dbo.CURSOS co ON co.Cod_Curso=h.Docente_Asignatura_CURSOS_Cod_Curso LEFT JOIN dbo.Docente d ON d.DNI_Doc=h.Docente_Asignatura_Docente_DNI_Doc WHERE m.ALUMNO_DNI_Alu=@dni AND m.ESTADO_MATRICULA_Cod_Estado_Matricula='ACTIVA' AND h.Activo=1 ORDER BY h.Dia_Semana,h.Hr_Inicio`),
    query(`SELECT eg.Fech_programada,eg.Hr_inicio,e.Nomb_Examen,g.Nomb_Grupo FROM dbo.Examen_Grupo eg JOIN dbo.Examen e ON e.Cod_Examen=eg.Examen_Cod_Examen JOIN dbo.Grupo g ON g.Cod_Grupo=eg.Grupo_Cod_Grupo JOIN dbo.MATRICULA m ON m.Grupo_Cod_Grupo=g.Cod_Grupo WHERE m.ALUMNO_DNI_Alu=@dni AND m.ESTADO_MATRICULA_Cod_Estado_Matricula='ACTIVA' AND eg.ESTADO_EXAMEN_GRUPO_Cod_Estado_Examen='PROGRAMADO' ORDER BY eg.Fech_programada`),
    query(`SELECT CONCEPTO_PAGO_Cod_Concepto,Nro_Mensualidad,Monto,ESTADO_PAGO_Cod_Estado,Fech_Vencimiento FROM dbo.Pago WHERE ALUMNO_DNI_Alu=@dni ORDER BY Fech_Vencimiento DESC`)
  ]);
  res.json({profile:profile[0]||null,groups,notes,schedule,exams,payments});
}));
module.exports=router;
