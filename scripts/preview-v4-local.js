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
  const ops=require('../server/operations'),dni='42000001',studentName='Estudiante de vista local V42';
  const existing=(await ops.query(null,'SELECT Nomb_Alu FROM dbo.ALUMNO WHERE DNI_Alu=@dni',{dni})).recordset[0];
  if(existing&&existing.Nomb_Alu!==studentName)throw Error('El DNI reservado para vista local ya tiene otro registro. Usa una nueva base de pruebas.');
  if(!existing)await ops.enroll({alumno:{DNI_Alu:dni,Nomb_Alu:studentName,Nomb_Apoderado:'Tutor Ficticio de Vista Local',PARENTESCO_Cod_Paren:'TUTOR',CARRERA_Cod_Carrera:'V4-TEST'},Grupo_Cod_Grupo:'V4-GR'},{Cod_Usuario:'V4-PREVIEW'});
  const studentPassword=crypto.randomBytes(18).toString('base64url');
  await ops.query(null,"UPDATE dbo.Usuario SET Clave_Hash=@hash,Activo=1,Debe_Cambiar_Clave=0 WHERE ALUMNO_DNI_Alu=@dni AND Nomb_Usuario=@dni AND ROL_Cod_Rol='ALUMNO'",{dni,hash:await bcrypt.hash(studentPassword,12)});
  const app=require('../server/index'),express=require('express'),fs=require('node:fs'),path=require('node:path');
  const preview=express();
  // Accesos exclusivos de desarrollo, en loopback y una base ficticia seleccionada.
  // Las claves aleatorias de estas cuentas no se imprimen ni se registran.
  preview.get('/__local/login',async(req,res,next)=>{try{
    const user=(await ops.query(null,"SELECT * FROM dbo.Usuario WHERE Cod_Usuario='V4-PREVIEW'")).recordset[0];
    require('../server/auth').createSession(res,await require('../server/security-schema').securityFor(user));res.redirect('/');
  }catch(e){next(e);}});
  preview.get('/__local/student',async(req,res,next)=>{try{
    const user=(await ops.query(null,"SELECT * FROM dbo.Usuario WHERE ALUMNO_DNI_Alu=@dni AND ROL_Cod_Rol='ALUMNO'",{dni})).recordset[0];
    require('../server/auth').createSession(res,await require('../server/security-schema').securityFor(user));res.redirect('/');
  }catch(e){next(e);}});
  // Cabecera institucional y aviso permanente solo en este servidor local. La app/API real sigue intacta.
  preview.get('/',(req,res,next)=>{
    const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8').replace('<body>','<body><div class="v42-preview-notice" role="note">VISTA LOCAL · DATOS FICTICIOS · Correo y SMS desactivados</div>');
    res.setHeader('Cache-Control','no-store');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'");res.type('html').send(html);
  });
  preview.use(app);
  const server=preview.listen(3001,'127.0.0.1',()=>console.log(JSON.stringify({aviso:'VISTA LOCAL CON DATOS FICTICIOS. No conecta a Azure ni envía mensajes.',url:'http://127.0.0.1:3001',database,administrador:'http://127.0.0.1:3001/__local/login',alumno:'http://127.0.0.1:3001/__local/student'})));
  process.on('SIGINT',()=>server.close(async()=>{await pool.close();process.exit(0);}));
})().catch(e=>{console.error(e.message);process.exit(1);});
