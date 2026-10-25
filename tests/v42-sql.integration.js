'use strict';
// Opt-in. Solo SQL Server localhost, Windows integrado y una base independiente VACÍA.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
test('V4.2: eliminación individual y preservación con SQL/HTTP reales',async t=>{
  const database=process.env.V42_SQL_TEST_DATABASE;
  if(!/^FractalesAcademy_Pruebas_V4_2[A-Za-z0-9_]*$/.test(database||''))throw Error('Selecciona una base vacía V42_SQL_TEST_DATABASE=FractalesAcademy_Pruebas_V4_2...');
  const sql=require('mssql/msnodesqlv8'),bcrypt=require('bcryptjs');
  const pool=await new sql.ConnectionPool({connectionString:`Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=${database};Trusted_Connection=Yes;Encrypt=No;TrustServerCertificate=Yes;`,pool:{max:8,min:0,idleTimeoutMillis:1000},requestTimeout:30000}).connect();t.after(()=>pool.close());
  const settings='SET NOCOUNT ON; SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON; SET ANSI_WARNINGS ON; SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF; ';
  const db={sql,pool:async()=>pool,request:async tx=>{const r=tx?new sql.Request(tx):pool.request(),run=r.query.bind(r);r.query=text=>run(settings+text);return r;}};
  const query=async(text,inputs={})=>{const r=await db.request();for(const [k,v] of Object.entries(inputs))r.input(k,v);return r.query(text);};
  const scalar=async text=>(await query(text)).recordset[0].n;
  const load=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
  const migrate=async(folder,file)=>pool.request().batch(load(`sql/migrations/${folder}/${file}`).replace("DECLARE @BaseEsperada sysname=N'FractalesAcademy';",`DECLARE @BaseEsperada sysname=N'${database}';`));
  await t.test('prepara únicamente la base vacía y conserva el esquema V4.1',async()=>{
    assert.equal(await scalar('SELECT COUNT(*) n FROM sys.tables WHERE is_ms_shipped=0'),0,'No se limpia una base existente.');
    await pool.request().batch(load('sql/testing/CREAR_ESTRUCTURA_PRUEBAS.sql'));await pool.request().batch(load('sql/testing/DATOS_PRUEBA_V4.sql'));
    for(const file of fs.readdirSync(path.join(__dirname,'../sql/migrations/v4')).filter(f=>/^0[0-6]/.test(f)&&!f.startsWith('00_DIAGNOSTICO')).sort())await migrate('v4',file);
    for(const file of fs.readdirSync(path.join(__dirname,'../sql/migrations/v4_1')).filter(f=>/^0[1-4]_/.test(f)).sort())await migrate('v4_1',file);
    assert.equal(await scalar('SELECT COUNT(*) n FROM sys.tables WHERE is_ms_shipped=0'),35);assert.equal(await scalar('SELECT COUNT(*) n FROM sys.foreign_keys'),40);
  });
  const dbPath=require.resolve('../server/db');require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:db};
  process.env.JWT_SECRET=crypto.randomBytes(48).toString('hex');process.env.NODE_ENV='test';process.env.EMAIL_PROVIDER='disabled';process.env.SMS_PROVIDER='disabled';process.env.ACCOUNT_SECURITY_V41='required';
  const password=crypto.randomBytes(18).toString('base64url'),hash=await bcrypt.hash(password,12);
  await query("INSERT dbo.Usuario(Cod_Usuario,Nomb_Usuario,Clave_Hash,ROL_Cod_Rol,Debe_Cambiar_Clave) VALUES ('V42-ADMIN','v42-admin',@hash,'ADMIN',0)",{hash});
  const app=require('../server/index'),server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  let adminCookie='',ip=1;const id=value=>Buffer.from(JSON.stringify([value])).toString('base64url');
  const endpoint=(table,key)=>`/records/${table}/${id(key)}`;
  async function http(route,method='GET',body,cookie=adminCookie){const r=await fetch(`http://127.0.0.1:${server.address().port}/api`+route,{method,headers:{'Content-Type':'application/json',Cookie:cookie,'X-Forwarded-For':`10.42.0.${ip++%240+1}`},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
  const deletion={confirmacion:'ELIMINAR',motivo:'Registro ficticio V42 sin uso, eliminación autorizada'};
  const createStudent=async(dni)=>query("INSERT dbo.ALUMNO(DNI_Alu,Nomb_Alu,Nomb_Apoderado,PARENTESCO_Cod_Paren,CARRERA_Cod_Carrera) VALUES (@dni,'Estudiante Ficticio V42','Tutor Ficticio','TUTOR','V4-TEST')",{dni});
  await t.test('autentica administrador y conserva dashboard real',async()=>{
    const login=await http('/auth/login','POST',{usuario:'v42-admin',clave:password},'');assert.equal(login.status,200);adminCookie=login.cookie;
    const dashboard=await http('/dashboard');assert.equal(dashboard.status,200);assert.equal(dashboard.body.alumnos,1);
    const review=await require('../server/administration').review('Usuario',id('V42-ADMIN'),{Cod_Usuario:'OTRO-ACTOR'});
    assert.match(review.acciones.find(a=>a.id==='eliminar').explanation,/al menos una cuenta administradora activa/);
  });
  await t.test('diagnóstico y permisos opcionales son reejecutables y no modifican datos ni estructura',async()=>{
    const before=JSON.stringify((await query('SELECT * FROM dbo.ALUMNO ORDER BY DNI_Alu')).recordset);
    await pool.request().batch(load('sql/migrations/v4_2/00_DIAGNOSTICO_V4_2.sql'));await pool.request().batch(load('sql/migrations/v4_2/99_VERIFICACION_FINAL_V4_2.sql'));
    const source=load('sql/migrations/v4_2/01_PERMISOS_ELIMINACION_OPCIONAL.sql');await assert.rejects(pool.request().batch(source));
    await query('CREATE USER [V42-APP-TEST] WITHOUT LOGIN');
    const adapted=source.replace("DECLARE @BaseEsperada sysname=N'FractalesAcademy';",`DECLARE @BaseEsperada sysname=N'${database}';`).replace("DECLARE @UsuarioAplicacion sysname=N'REEMPLAZAR_POR_USUARIO_SQL_EXISTENTE';","DECLARE @UsuarioAplicacion sysname=N'V42-APP-TEST';");
    await pool.request().batch(adapted);await pool.request().batch(adapted);
    const p=(await query("EXECUTE AS USER='V42-APP-TEST'; BEGIN TRY SELECT HAS_PERMS_BY_NAME('dbo.ALUMNO','OBJECT','DELETE') AS Alumno,HAS_PERMS_BY_NAME('dbo.Usuario','OBJECT','DELETE') AS Usuario,HAS_PERMS_BY_NAME('dbo.Pago','OBJECT','DELETE') AS Pago,HAS_PERMS_BY_NAME('dbo.MATRICULA','OBJECT','DELETE') AS Matricula,HAS_PERMS_BY_NAME('dbo.Auditoria_V4','OBJECT','DELETE') AS Auditoria; REVERT; END TRY BEGIN CATCH REVERT; THROW; END CATCH;")).recordset[0];
    assert.equal(p.Alumno,1);assert.equal(p.Usuario,1);assert.notEqual(p.Pago,1);assert.notEqual(p.Matricula,1);assert.notEqual(p.Auditoria,1);
    assert.equal(JSON.stringify((await query('SELECT * FROM dbo.ALUMNO ORDER BY DNI_Alu')).recordset),before);assert.equal(await scalar('SELECT COUNT(*) n FROM sys.tables WHERE is_ms_shipped=0'),35);assert.equal(await scalar('SELECT COUNT(*) n FROM sys.foreign_keys'),40);assert.equal(await scalar('SELECT COUNT(*) n FROM dbo.Control_Migracion_V4'),11);
  });
  let freeUser;
  await t.test('usuario creado por la interfaz sin uso puede eliminarse y su hash nunca aparece en auditoría',async()=>{
    assert.equal((await http('/records/Usuario','POST',{Nomb_Usuario:'usuario-ficticio-v42',ROL_Cod_Rol:'ADMIN',Nueva_Clave:password})).status,201);
    freeUser=(await query("SELECT Cod_Usuario FROM dbo.Usuario WHERE Nomb_Usuario='usuario-ficticio-v42'")).recordset[0].Cod_Usuario;
    assert.equal(await scalar(`SELECT COUNT(*) n FROM dbo.Usuario_Seguridad_V41 WHERE Usuario_Cod_Usuario='${freeUser}'`),0);
    const route=endpoint('Usuario',freeUser),review=await http(route+'/actions');assert.equal(review.body.acciones.find(a=>a.id==='eliminar').enabled,true);assert.equal(review.body.acciones.find(a=>a.id==='eliminar').label,'Eliminar definitivamente');
    assert.equal((await http(route,'DELETE',{motivo:deletion.motivo})).status,400);assert.equal((await http(route,'DELETE',deletion)).status,200);
    assert.equal(await scalar(`SELECT COUNT(*) n FROM dbo.Usuario WHERE Cod_Usuario='${freeUser}'`),0);
    const history=(await query("SELECT Accion,Anterior,Nuevo FROM dbo.Auditoria_V4 WHERE Entidad='Usuario' AND Codigo=@code ORDER BY Id",{code:freeUser})).recordset;assert.equal(history.length,2);assert.equal(history.at(-1).Accion,'ELIMINAR');assert.ok(!JSON.stringify(history).includes(hash));assert.ok(!JSON.stringify(history).includes('Clave_Hash'));
  });
  await t.test('alumno anterior sin dependencias ni historia operativa puede eliminarse individualmente',async()=>{
    await createStudent('42000101');const route=endpoint('ALUMNO','42000101');
    assert.equal((await http(route+'/actions')).body.acciones.find(a=>a.id==='eliminar').enabled,true);assert.equal((await http(route,'DELETE',deletion)).status,200);
    assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.ALUMNO WHERE DNI_Alu='42000101'"),0);assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.Auditoria_V4 WHERE Entidad='ALUMNO' AND Codigo='42000101' AND Accion='ELIMINAR'"),1);
  });
  await t.test('cuenta vinculada bloquea alumno; borrar esa cuenta libre no borra al estudiante en cascada',async()=>{
    await createStudent('42000102');await query("INSERT dbo.Usuario(Cod_Usuario,Nomb_Usuario,Clave_Hash,ROL_Cod_Rol,ALUMNO_DNI_Alu) VALUES ('V42-SIN-USO','42000102',@hash,'ALUMNO','42000102')",{hash});
    const route=endpoint('ALUMNO','42000102'),review=await http(route+'/actions');assert.ok(review.body.dependencias.some(d=>d.tabla==='Usuario'));assert.equal(review.body.acciones.find(a=>a.id==='eliminar').enabled,false);assert.equal((await http(route,'DELETE',deletion)).status,409);
    assert.equal((await http(endpoint('Usuario','V42-SIN-USO'),'DELETE',deletion)).status,200);assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.ALUMNO WHERE DNI_Alu='42000102'"),1);assert.equal((await http(route,'DELETE',deletion)).status,200);
  });
  await t.test('matrículas y pagos bloquean alumno sin alterar importes o filas históricas',async()=>{
    const before=JSON.stringify((await query('SELECT * FROM dbo.Pago ORDER BY Cod_Pago')).recordset),route=endpoint('ALUMNO','00000001'),review=await http(route+'/actions');
    assert.ok(review.body.dependencias.some(d=>d.tabla==='MATRICULA'));assert.ok(review.body.dependencias.some(d=>d.tabla==='Pago'));assert.equal((await http(route,'DELETE',deletion)).status,409);
    for(const [table,key] of [['MATRICULA','V4-MAT-LEGADO'],['Pago','V4-PAGO-LEGADO']])assert.equal((await http(endpoint(table,key),'DELETE',deletion)).status,400);
    assert.equal(JSON.stringify((await query('SELECT * FROM dbo.Pago ORDER BY Cod_Pago')).recordset),before);
  });
  await t.test('historial lógico impide eliminar aunque no existan FK dependientes',async()=>{
    await createStudent('42000103');await query("INSERT dbo.Auditoria_V4(Entidad,Codigo,Accion,Usuario_Cod_Usuario,Motivo) VALUES ('ALUMNO','42000103','EDITAR','V42-ADMIN','Historia ficticia que debe conservarse')");
    const route=endpoint('ALUMNO','42000103'),review=await http(route+'/actions');assert.ok(review.body.dependencias.some(d=>d.tipo==='historial'));assert.equal((await http(route,'DELETE',deletion)).status,409);
    assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.ALUMNO WHERE DNI_Alu='42000103'"),1);
  });
  await t.test('dependencias de seguridad y usuario autor de auditoría impiden borrar cuentas',async()=>{
    await query("INSERT dbo.Usuario(Cod_Usuario,Nomb_Usuario,Clave_Hash,ROL_Cod_Rol) VALUES ('V42-SEGURIDAD','seguridad-ficticia',@hash,'ADMIN'),('V42-ACTOR','actor-ficticio',@hash,'ADMIN')",{hash});
    await query("INSERT dbo.Usuario_Seguridad_V41(Usuario_Cod_Usuario) VALUES ('V42-SEGURIDAD'); INSERT dbo.Auditoria_V4(Entidad,Codigo,Accion,Usuario_Cod_Usuario) VALUES ('CURSOS','FICTICIO','CREAR','V42-ACTOR')");
    for(const key of ['V42-SEGURIDAD','V42-ACTOR'])assert.equal((await http(endpoint('Usuario',key),'DELETE',deletion)).status,409);
  });
  await t.test('protege la cuenta propia y vuelve a comprobar vínculos creados después de la revisión',async()=>{
    const self=endpoint('Usuario','V42-ADMIN');assert.equal((await http(self+'/actions')).body.acciones.find(a=>a.id==='eliminar').enabled,false);assert.equal((await http(self,'DELETE',deletion)).status,409);
    await createStudent('42000104');const route=endpoint('ALUMNO','42000104');assert.equal((await http(route+'/actions')).body.acciones.find(a=>a.id==='eliminar').enabled,true);
    await query("INSERT dbo.Usuario(Cod_Usuario,Nomb_Usuario,Clave_Hash,ROL_Cod_Rol,ALUMNO_DNI_Alu) VALUES ('V42-NUEVO-VINCULO','42000104',@hash,'ALUMNO','42000104')",{hash});
    assert.equal((await http(route,'DELETE',deletion)).status,409);
  });
  await t.test('no elimina catálogos con historial lógico, y mantiene baja/restauración',async()=>{
    await http('/records/CURSOS','POST',{Cod_Curso:'V42-HIST',Nomb_Curso:'Catálogo Ficticio V42'});await http(endpoint('CURSOS','V42-HIST'),'PUT',{Nomb_Curso:'Catálogo Ficticio V42 editado'});
    assert.equal((await http(endpoint('CURSOS','V42-HIST'),'DELETE',deletion)).status,409);
    const student=endpoint('ALUMNO','42000103');for(const action of ['desactivar','restaurar'])assert.equal((await http(student+'/state','POST',{accion:action,confirmacion:true,motivo:'Cambio de estado ficticio V42'})).status,200);
    assert.equal((await http(student,'DELETE',deletion)).status,409);
  });
  await t.test('sin sesión o con rol alumno no permite eliminación ni ver acciones administrativas',async()=>{
    assert.equal((await http(endpoint('ALUMNO','42000103'),'DELETE',deletion,'')).status,401);
    await query("UPDATE dbo.Usuario SET Debe_Cambiar_Clave=0 WHERE Cod_Usuario='V42-NUEVO-VINCULO'");const login=await http('/auth/login','POST',{usuario:'42000104',clave:password},'');assert.equal(login.status,200);
    assert.equal((await http(endpoint('ALUMNO','42000103'),'DELETE',deletion,login.cookie)).status,403);assert.equal((await http(endpoint('Usuario','V42-SEGURIDAD')+'/actions','GET',undefined,login.cookie)).status,403);
    const overview=await http('/student/overview','GET',undefined,login.cookie);assert.equal(overview.status,200);assert.equal(overview.body.profile.DNI_Alu,'42000104');
  });
  await t.test('auditoría fallida revierte la eliminación completa',async()=>{
    await query("INSERT dbo.CURSOS(Cod_Curso,Nomb_Curso) VALUES ('V42-ROLL','Catálogo Ficticio Rollback')");
    const administration=require('../server/administration');await assert.rejects(administration.remove('CURSOS',id('V42-ROLL'),deletion,{Cod_Usuario:'ACTOR-INEXISTENTE'}));
    assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.CURSOS WHERE Cod_Curso='V42-ROLL'"),1);
  });
});
