'use strict';
// Vista local aislada. No usar este script como comando de inicio en Azure.
const crypto=require('node:crypto');
const database=process.env.V45_SQL_TEST_DATABASE;
if(!/^FractalesAcademy_Pruebas_V4_5_\d{8}_[a-f0-9]{10}$/.test(database||''))throw Error('Selecciona V45_SQL_TEST_DATABASE con una base V4.5 local de pruebas.');
const sql=require('mssql/msnodesqlv8');
(async()=>{
  const pool=await new sql.ConnectionPool({connectionString:`Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=${database};Trusted_Connection=Yes;Encrypt=No;TrustServerCertificate=Yes;`,pool:{max:8,min:0,idleTimeoutMillis:1000}}).connect();
  const settings='SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON; SET ANSI_WARNINGS ON; SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF; ';
  const db={sql,pool:async()=>pool,request:async tx=>{const r=tx?new sql.Request(tx):pool.request(),run=r.query.bind(r);r.query=text=>run(settings+text);return r;}};
  const dbPath=require.resolve('../server/db');require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:db};
  process.env.NODE_ENV='development';process.env.JWT_SECRET=crypto.randomBytes(48).toString('hex');process.env.EMAIL_PROVIDER='local';process.env.SMS_PROVIDER='disabled';process.env.ACCOUNT_SECURITY_V41='required';
  const ops=require('../server/operations');await require('../server/schema-v45').required();
  const hash=await require('bcryptjs').hash(crypto.randomBytes(32).toString('base64url'),12);
  await ops.query(null,`IF EXISTS(SELECT 1 FROM dbo.USUARIO WHERE ID_USUARIO='V45-PREVIEW') UPDATE dbo.USUARIO SET CLAVE_HASH=@hash,ACTIVO=1,DEBE_CAMBIAR_CLAVE=0 WHERE ID_USUARIO='V45-PREVIEW';
    ELSE INSERT dbo.USUARIO(ID_USUARIO,NOMBRE_USUARIO,CLAVE_HASH,ID_ROL,DEBE_CAMBIAR_CLAVE) VALUES('V45-PREVIEW','vista-local-v45',@hash,'ADMIN',0);`,{hash});
  await ops.query(null,"UPDATE dbo.USUARIO SET DEBE_CAMBIAR_CLAVE=0 WHERE DNI_ALUMNO='45000001' AND ID_ROL='ALUMNO';");
  const express=require('express'),preview=express(),fs=require('node:fs'),path=require('node:path');
  preview.use((req,res,next)=>{res.setHeader('Cache-Control','no-store');next();});
  // Acceso de desarrollo exclusivo de este servidor ligado a loopback y esta base de pruebas.
  preview.get('/__local/login',async(req,res,next)=>{try{
    const user=(await ops.query(null,"SELECT * FROM dbo.USUARIO WHERE ID_USUARIO='V45-PREVIEW'")).recordset[0];
    require('../server/auth').createSession(res,await require('../server/security-schema').securityFor(user));res.redirect('/');
  }catch(e){next(e);}});
  preview.get('/__local/student',async(req,res,next)=>{try{
    const user=(await ops.query(null,"SELECT TOP(1) * FROM dbo.USUARIO WHERE ID_ROL='ALUMNO' AND ACTIVO=1 AND DEBE_CAMBIAR_CLAVE=0 ORDER BY ID_USUARIO")).recordset[0];
    if(!user)return res.status(404).json({error:'Ejecuta antes el ensayo SQL V4.5.'});
    require('../server/auth').createSession(res,await require('../server/security-schema').securityFor(user));res.redirect('/');
  }catch(e){next(e);}});
  preview.get('/__local/mail',(req,res)=>res.json({aviso:'Bandeja de pruebas local. No se enviaron correos reales.',messages:require('../server/account-service').notifications.inbox}));
  preview.get('/',(req,res)=>{
    const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8').replace('<body>','<body><div class="v42-preview-notice" role="note">VISTA LOCAL V4.5 · DATOS FICTICIOS · CORREO SIMULADO</div>');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'");res.type('html').send(html);
  });
  preview.use(require('../server/index'));
  const server=preview.listen(Number(process.env.PREVIEW_PORT||3003),'127.0.0.1',()=>console.log('Vista local: http://127.0.0.1:'+server.address().port+'/__local/login · SQL localhost · correo simulado.'));
  process.on('SIGINT',()=>server.close(async()=>{await pool.close();process.exit(0);}));
})().catch(e=>{console.error({name:e.name,code:e.code||e.number||'PREVIEW_ERROR'});process.exitCode=1;});
