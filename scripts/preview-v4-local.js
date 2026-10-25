'use strict';
// Vista funcional exclusivamente sobre SQL Server LOCAL de pruebas con autenticación Windows.
// Nunca utiliza db.js/configuration ni las conexiones de Azure. No requiere modificar .env.
const crypto=require('node:crypto');
const database=process.env.V4_SQL_TEST_DATABASE;
if(!/^FractalesAcademy_Pruebas_V4[A-Za-z0-9_]*$/.test(database||''))throw Error('Selecciona V4_SQL_TEST_DATABASE=FractalesAcademy_Pruebas_V4... ya migrada.');
const sql=require('mssql/msnodesqlv8');const bcrypt=require('bcryptjs');
const settings='SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON; SET ANSI_WARNINGS ON; SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF; ';
(async()=>{
  const pool=await new sql.ConnectionPool({connectionString:`Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=${database};Trusted_Connection=Yes;Encrypt=No;TrustServerCertificate=Yes;`,pool:{max:8,min:0,idleTimeoutMillis:1000}}).connect();
  const db={sql,pool:async()=>pool,request:async tx=>{const r=tx?new sql.Request(tx):pool.request();const query=r.query.bind(r);r.query=text=>query(settings+text);return r;}};
  const check=await db.request();await check.query("IF OBJECT_ID('dbo.MEDIO_PAGO') IS NULL OR (SELECT COUNT(*) FROM dbo.Control_Migracion_V4 WHERE Script NOT LIKE 'V41[_]%')<>7 THROW 54920,'Complete las migraciones de pruebas antes de abrir la vista.',1;");
  const password=crypto.randomBytes(18).toString('base64url');const hash=await bcrypt.hash(password,12);
  const seed=await db.request();seed.input('hash',sql.VarChar(255),hash);
  await seed.query("IF EXISTS(SELECT 1 FROM dbo.Usuario WHERE Cod_Usuario='V4-PREVIEW') UPDATE dbo.Usuario SET Clave_Hash=@hash,Activo=1,Debe_Cambiar_Clave=0 WHERE Cod_Usuario='V4-PREVIEW'; ELSE INSERT dbo.Usuario(Cod_Usuario,Nomb_Usuario,Clave_Hash,ROL_Cod_Rol,Debe_Cambiar_Clave) VALUES ('V4-PREVIEW','v4-preview',@hash,'ADMIN',0);");
  const dbPath=require.resolve('../server/db');require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:db};
  process.env.JWT_SECRET=crypto.randomBytes(48).toString('hex');process.env.NODE_ENV='development';process.env.EMAIL_PROVIDER='disabled';process.env.SMS_PROVIDER='disabled';
  const app=require('../server/index');const server=app.listen(3001,'127.0.0.1',()=>console.log(JSON.stringify({url:'http://127.0.0.1:3001',database,usuario:'v4-preview',claveTemporalSoloPruebas:password})));
  process.on('SIGINT',()=>server.close(async()=>{await pool.close();process.exit(0);}));
})().catch(e=>{console.error(e.message);process.exit(1);});
