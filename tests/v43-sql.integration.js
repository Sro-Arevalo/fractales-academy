'use strict';
// Exclusivamente localhost con autenticación Windows y una base nueva, nunca .env/Azure.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
test('V4.3: migraciones y casos A–I con SQL Server y HTTP reales',async t=>{
  const database=process.env.V43_SQL_TEST_DATABASE;
  if(!/^FractalesAcademy_Pruebas_V4_3[A-Za-z0-9_]*$/.test(database||''))throw Error('Selecciona V43_SQL_TEST_DATABASE=FractalesAcademy_Pruebas_V4_3... vacía.');
  const sql=require('mssql/msnodesqlv8'),bcrypt=require('bcryptjs');
  const pool=await new sql.ConnectionPool({connectionString:`Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=${database};Trusted_Connection=Yes;Encrypt=No;TrustServerCertificate=Yes;`,pool:{max:8,min:0,idleTimeoutMillis:1000},requestTimeout:30000}).connect();t.after(()=>pool.close());
  const settings='SET NOCOUNT ON; SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON; SET ANSI_WARNINGS ON; SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF; ';
  const db={sql,pool:async()=>pool,request:async tx=>{const r=tx?new sql.Request(tx):pool.request(),run=r.query.bind(r);r.query=text=>run(settings+text);return r;}};
  const query=async(text,inputs={})=>{const r=await db.request();for(const [k,v] of Object.entries(inputs))r.input(k,v);return r.query(text);};
  const scalar=async text=>(await query(text)).recordset[0].n;
  const load=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
  const migrate=async(folder,file)=>pool.request().batch(load(`sql/migrations/${folder}/${file}`).replace("DECLARE @BaseEsperada sysname=N'FractalesAcademy';",`DECLARE @BaseEsperada sysname=N'${database}';`));
  await t.test('instalación completa nueva en una sola transacción, sin admitir segunda ejecución',async()=>{
    const fresh=process.env.V43_SQL_FRESH_DATABASE;if(!/^FractalesAcademy_Pruebas_V4_3[A-Za-z0-9_]*_Nueva$/.test(fresh||''))throw Error('Se requiere otra base vacía V43_SQL_FRESH_DATABASE.');
    const p=await new sql.ConnectionPool({connectionString:`Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=${fresh};Trusted_Connection=Yes;Encrypt=No;TrustServerCertificate=Yes;`,pool:{max:1,min:0,idleTimeoutMillis:1000},requestTimeout:60000}).connect();
    try{
      const script=load('sql/migrations/v4_3/02_BASE_NUEVA_COMPLETA.sql').replace("DECLARE @BaseEsperada sysname=N'FractalesAcademy';",`DECLARE @BaseEsperada sysname=N'${fresh}';`);
      await p.request().batch(script);assert.equal((await p.request().query('SELECT COUNT(*) n FROM sys.tables WHERE is_ms_shipped=0')).recordset[0].n,36);
      assert.equal((await p.request().query('SELECT COUNT(*) n FROM sys.foreign_keys')).recordset[0].n,41);
      await assert.rejects(p.request().batch(script));await p.request().batch(load('sql/migrations/v4_3/99_VERIFICAR.sql'));
    }finally{await p.close();}
  });
  await t.test('migración incremental conserva legado y es reejecutable',async()=>{
    assert.equal(await scalar('SELECT COUNT(*) n FROM sys.tables WHERE is_ms_shipped=0'),0,'No se limpia una base existente.');
    await pool.request().batch(load('sql/testing/CREAR_ESTRUCTURA_PRUEBAS.sql'));await pool.request().batch(load('sql/testing/DATOS_PRUEBA_V4.sql'));
    for(const file of fs.readdirSync(path.join(__dirname,'../sql/migrations/v4')).filter(f=>/^0[0-6]/.test(f)&&!f.startsWith('00_DIAGNOSTICO')).sort())await migrate('v4',file);
    for(const file of fs.readdirSync(path.join(__dirname,'../sql/migrations/v4_1')).filter(f=>/^0[1-4]_/.test(f)).sort())await migrate('v4_1',file);
    const before=JSON.stringify((await query('SELECT * FROM dbo.Pago')).recordset);
    await migrate('v4_3','01_APODERADOS_Y_PRUEBAS.sql');await migrate('v4_3','01_APODERADOS_Y_PRUEBAS.sql');
    assert.equal(await scalar('SELECT COUNT(*) n FROM sys.tables WHERE is_ms_shipped=0'),36);assert.equal(await scalar('SELECT COUNT(*) n FROM sys.foreign_keys'),41);
    assert.equal((await query("SELECT Es_Prueba,DNI_Apoderado FROM dbo.ALUMNO WHERE DNI_Alu='00000001'")).recordset[0].Es_Prueba,false);
    assert.equal(JSON.stringify((await query('SELECT * FROM dbo.Pago')).recordset),before);
  });
  const dbPath=require.resolve('../server/db');require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:db};
  process.env.JWT_SECRET=crypto.randomBytes(48).toString('hex');process.env.NODE_ENV='test';process.env.EMAIL_PROVIDER='local';process.env.ACCOUNT_SECURITY_V41='required';
  const password=crypto.randomBytes(18).toString('base64url'),hash=await bcrypt.hash(password,12);
  await query("INSERT dbo.Usuario(Cod_Usuario,Nomb_Usuario,Clave_Hash,ROL_Cod_Rol,Debe_Cambiar_Clave) VALUES('V43-ADMIN','v43-admin',@hash,'ADMIN',0)",{hash});
  const app=require('../server/index'),server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)));
  let cookie='',ip=1;const id=dni=>Buffer.from(JSON.stringify([dni])).toString('base64url'),endpoint=dni=>'/records/ALUMNO/'+id(dni);
  async function http(route,method='GET',body,session=cookie,headers={}){const r=await fetch(`http://127.0.0.1:${server.address().port}/api`+route,{method,headers:{'Content-Type':'application/json',Cookie:session,'X-Forwarded-For':`10.43.0.${ip++%240+1}`,...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
  const guardian={DNI_Apoderado:'43999001',Nomb_Apoderado:'Apoderada ficticia compartida',Cel_Apoderado:'900123456',Correo_Apoderado:'tutora@example.test'};
  const enrollment=(dni,extra={})=>({alumno:{DNI_Alu:dni,Nomb_Alu:'Estudiante ficticio '+dni,Cel_Alu:'900123456',Correo_Alu:dni+'@example.test',PARENTESCO_Cod_Paren:'TUTOR',CARRERA_Cod_Carrera:'V4-TEST',DNI_Apoderado:guardian.DNI_Apoderado},Grupo_Cod_Grupo:'V4-GR',...extra});
  async function deactivate(dni){const r=await http(endpoint(dni)+'/state','POST',{accion:'desactivar',confirmacion:true,motivo:'Desactivación de registro ficticio para ensayo'});assert.equal(r.status,200,JSON.stringify(r.body));}
  async function review(dni){const r=await http(endpoint(dni)+'/actions');assert.equal(r.status,200,JSON.stringify(r.body));return r.body;}
  async function remove(dni,p){return http(endpoint(dni),'DELETE',{confirmacion:'ELIMINAR '+dni,revision:p.revision,motivo:'Eliminación autorizada de inscripción de prueba'});}
  const login=await http('/auth/login','POST',{usuario:'v43-admin',clave:password},'');assert.equal(login.status,200);cookie=login.cookie;
  await t.test('diagnóstico y permisos opcionales son ejecutables sin ampliar acceso a notas o auditorías',async()=>{
    await pool.request().batch(load('sql/migrations/v4_3/00_DIAGNOSTICO.sql'));
    await query('CREATE USER [V43-APP-TEST] WITHOUT LOGIN');
    const script=load('sql/migrations/v4_3/03_PERMISOS_OPCIONALES.sql').replace("DECLARE @BaseEsperada sysname=N'FractalesAcademy';",`DECLARE @BaseEsperada sysname=N'${database}';`).replace("DECLARE @UsuarioAplicacion sysname=N'REEMPLAZAR_POR_USUARIO_SQL_EXISTENTE';","DECLARE @UsuarioAplicacion sysname=N'V43-APP-TEST';");
    await pool.request().batch(script);await pool.request().batch(script);
    const grants=(await query("EXECUTE AS USER='V43-APP-TEST'; SELECT HAS_PERMS_BY_NAME(DB_NAME(),'DATABASE','VIEW DEFINITION') Metadata,HAS_PERMS_BY_NAME('dbo.Pago','OBJECT','DELETE') Pago,HAS_PERMS_BY_NAME('dbo.Nota_Examen','OBJECT','DELETE') Nota,HAS_PERMS_BY_NAME('dbo.Auditoria_V4','OBJECT','DELETE') Auditoria; REVERT;")).recordset[0];
    assert.equal(grants.Metadata,1);assert.equal(grants.Pago,1);assert.notEqual(grants.Nota,1);assert.notEqual(grants.Auditoria,1);
  });
  let first,accelerated;
  await t.test('A/B: alumno, apoderado, cuenta y cuatro cuotas Regular más S/50 atómicos',async()=>{
    const body=enrollment('43000001',{apoderado:guardian,esPrueba:true});delete body.alumno.DNI_Apoderado;
    const r=await http('/inscripciones','POST',body);assert.equal(r.status,201,JSON.stringify(r.body));first=r.body;assert.equal(first.total,1050);assert.equal(first.cuotas,4);
    assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.Pago WHERE ALUMNO_DNI_Alu='43000001'"),5);
    const u=(await query("SELECT * FROM dbo.Usuario WHERE ALUMNO_DNI_Alu='43000001'")).recordset[0];assert.ok(await bcrypt.compare(first.claveTemporal,u.Clave_Hash));assert.equal(u.Debe_Cambiar_Clave,true);
    assert.equal((await http('/inscripciones','POST',enrollment('43000001'))).status,400);
    assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.Pago WHERE ALUMNO_DNI_Alu='43000001'"),5);
  });
  await t.test('A/B: apoderado existente compartido y Acelerado con dos cuotas',async()=>{
    const r=await http('/inscripciones','POST',enrollment('43000002',{Grupo_Cod_Grupo:'V4-GA',esPrueba:true}));assert.equal(r.status,201,JSON.stringify(r.body));accelerated=r.body;assert.equal(r.body.total,550);assert.equal(r.body.cuotas,2);
    assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.ALUMNO WHERE DNI_Apoderado='43999001'"),2);assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.APODERADO WHERE DNI_Apoderado='43999001'"),1);
    const edited=await http('/admin/maintenance/guardians','POST',{...guardian,Cel_Apoderado:'900654321'});assert.equal(edited.status,200);
    assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.ALUMNO WHERE DNI_Apoderado='43999001' AND Cel_Apoderado='900654321'"),2);
  });
  await t.test('fallo posterior a crear alumno/apoderado revierte todas las filas',async()=>{
    const ops=require('../server/operations'),body=enrollment('43000003',{apoderado:{...guardian,DNI_Apoderado:'43999003'}});delete body.alumno.DNI_Apoderado;
    await assert.rejects(ops.enroll(body,{Cod_Usuario:'ACTOR-INEXISTENTE'}));assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.ALUMNO WHERE DNI_Alu='43000003'"),0);assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.APODERADO WHERE DNI_Apoderado='43999003'"),0);
  });
  await t.test('cupos llenos y celulares inválidos se rechazan sin registros incompletos',async()=>{
    const bad=enrollment('43000004');bad.alumno.Cel_Alu='123';assert.equal((await http('/inscripciones','POST',bad)).status,400);
    await query("UPDATE dbo.Grupo SET Cupo_Max=1 WHERE Cod_Grupo='V4-GA'");const r=await http('/inscripciones','POST',enrollment('43000004',{Grupo_Cod_Grupo:'V4-GA'}));assert.equal(r.status,400);assert.match(r.body.error,/cupo/i);assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.ALUMNO WHERE DNI_Alu='43000004'"),0);
  });
  const schedule={Cod_Horario:'V43-H1',Dia_Semana:1,Hr_Inicio:'08:00',Hr_Fin:'09:00',Activo:true,Grupo_Cod_Grupo:'V4-GR',TIPO_BLOQUE_Cod_Tipo:'CLASE',Docente_Asignatura_CURSOS_Cod_Curso:'V43-CURSO',Docente_Asignatura_Docente_DNI_Doc:'00000003'};
  await t.test('C: curso nuevo figura sin asignación previa y horario crea la relación',async()=>{
    assert.equal((await http('/records/CURSOS','POST',{Cod_Curso:'V43-CURSO',Nomb_Curso:'Curso nuevo desde API'})).status,201);
    const ctx=await http('/academic/context');assert.ok(ctx.body.cursos.some(c=>c.Cod_Curso==='V43-CURSO'));assert.ok(ctx.body.docentes.length);assert.ok(ctx.body.grupos.every(g=>Number.isInteger(g.Cupos_Disponibles)));
    const r=await http('/records/Horario','POST',schedule);assert.equal(r.status,201,JSON.stringify(r.body));assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.Docente_Asignatura WHERE CURSOS_Cod_Curso='V43-CURSO'"),1);
  });
  await t.test('D: cruces docente/aula/grupo y fuera de turno son rechazados',async()=>{
    const r=await http('/records/Horario','POST',{...schedule,Cod_Horario:'V43-CONFLICT',Grupo_Cod_Grupo:'V4-GR2'});assert.equal(r.status,400);assert.match(r.body.error,/cruce/i);
    assert.equal((await http('/records/Horario','POST',{...schedule,Cod_Horario:'V43-TURNO',Hr_Inicio:'14:00',Hr_Fin:'15:00'})).status,400);
    assert.equal((await http('/records/Horario','POST',{...schedule,Cod_Horario:'V43-INVALID',Hr_Inicio:'09:00',Hr_Fin:'08:00'})).status,400);
  });
  await t.test('E: eliminación exige baja, confirmación escrita y revisión vigente',async()=>{
    let p=await review('43000001');assert.equal(p.acciones.find(a=>a.id==='eliminar').enabled,false);
    await deactivate('43000001');p=await review('43000001');assert.equal(p.acciones.find(a=>a.id==='eliminar').enabled,true);assert.equal(p.totalPendiente,1050);
    assert.equal((await http(endpoint('43000001'),'DELETE',{confirmacion:'ELIMINAR',revision:p.revision,motivo:'Motivo de prueba'})).status,400);
    await query("UPDATE dbo.ALUMNO SET Dir_Alu='Cambio posterior a revisión' WHERE DNI_Alu='43000001'");assert.equal((await remove('43000001',p)).status,409);
    p=await review('43000001');const r=await remove('43000001',p);assert.equal(r.status,200,JSON.stringify(r.body));
    for(const table of ['ALUMNO','MATRICULA','Pago','Usuario'])assert.equal(await scalar(`SELECT COUNT(*) n FROM dbo.${table} WHERE ${table==='ALUMNO'?'DNI_Alu':'ALUMNO_DNI_Alu'}='43000001'`),0);
    assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.APODERADO WHERE DNI_Apoderado='43999001'"),1);
  });
  await t.test('F: cobro real y cobro anulado bloquean borrado y limpieza',async()=>{
    const code=(await query("SELECT TOP(1) Cod_Pago FROM dbo.Pago WHERE ALUMNO_DNI_Alu='43000002' ORDER BY Cod_Pago")).recordset[0].Cod_Pago;
    assert.equal((await http('/pagos/'+code+'/confirmar','POST',{medio:'EFECTIVO'})).status,200);await deactivate('43000002');let p=await review('43000002');assert.equal(p.acciones.find(a=>a.id==='eliminar').enabled,false);assert.match(p.acciones[0].explanation,/pagos|cobro/i);
    assert.equal((await http('/pagos/'+code+'/anular','POST',{motivo:'Anulación de cobro ficticio para ensayo'})).status,200);p=await review('43000002');assert.equal(p.acciones[0].enabled,false);assert.match(p.acciones[0].explanation,/anulado/i);assert.equal((await remove('43000002',p)).status,409);
  });
  await t.test('G: recuperación por correo, primer acceso, OTP de un uso y contraseña anterior inválida',async()=>{
    const r=await http('/inscripciones','POST',enrollment('43000005'));assert.equal(r.status,201,JSON.stringify(r.body));
    const accounts=require('../server/account-service');
    const user=(await query("SELECT Cod_Usuario FROM dbo.Usuario WHERE ALUMNO_DNI_Alu='43000005'")).recordset[0];
    await query("INSERT dbo.Contacto_Verificado_V41(ALUMNO_DNI_Alu,Tipo,Destino,Metodo,Usuario_Cod_Usuario) VALUES('43000005','EMAIL','43000005@example.test','PRESENCIAL','V43-ADMIN')");
    const initial=await http('/auth/login','POST',{usuario:'43000005',clave:r.body.claveTemporal},'');assert.equal(initial.status,200);assert.equal((await http('/student/overview','GET',undefined,initial.cookie)).status,403);
    const normal='Frase personal inicial de prueba';assert.equal((await http('/auth/change-password','POST',{nueva:normal,confirmacion:normal},initial.cookie)).status,200);
    const before=await http('/auth/login','POST',{usuario:'43000005',clave:normal},'');assert.equal(before.status,200);
    const request=await http('/auth/recovery/request','POST',{email:'43000005@example.test'},'');assert.equal(request.status,202);await accounts.flush();
    const messages=accounts.notifications.inbox;const mail=messages.at(-1);assert.equal(mail.to,'43000005@example.test');assert.match(mail.code,/^\d{6}$/);
    const stored=(await query('SELECT Codigo_Hash FROM dbo.Cuenta_Codigo_V41 WHERE Usuario_Cod_Usuario=@id AND Consumido=0',{id:user.Cod_Usuario})).recordset[0];assert.notEqual(stored.Codigo_Hash,mail.code);assert.equal(stored.Codigo_Hash.length,64);
    const newPassword='Una frase nueva después de recuperar';const complete={email:mail.to,codigo:mail.code,nueva:newPassword,confirmacion:newPassword};assert.equal((await http('/auth/recovery/complete','POST',complete,'')).status,200);
    assert.equal((await http('/auth/recovery/complete','POST',complete,'')).status,400);assert.equal((await http('/auth/login','POST',{usuario:'43000005',clave:normal},'')).status,401);assert.equal((await http('/auth/login','POST',{usuario:'43000005',clave:newPassword},'')).status,200);
    assert.equal((await http('/student/overview','GET',undefined,before.cookie)).status,401);
    const missing=await http('/auth/recovery/request','POST',{email:'no-existe@example.test'},'');assert.deepEqual(missing.body,request.body);
  });
  await t.test('H: estudiante no accede a otros registros ni funciones administrativas',async()=>{
    const r=await http('/auth/login','POST',{usuario:'43000005',clave:'Una frase nueva después de recuperar'},'');
    for(const route of ['/records/ALUMNO','/pagos/alumno/43000002','/admin/maintenance/test-data','/admin/maintenance/guardians','/admin/maintenance/reports','/admin/maintenance/account-email'])assert.equal((await http(route,'GET',undefined,r.cookie)).status,403,route);
    const own=await http('/student/overview?dni=43000002','GET',undefined,r.cookie);assert.equal(own.status,200);assert.equal(own.body.profile.DNI_Alu,'43000005');
    assert.equal((await http('/student/43000002/overview','GET',undefined,r.cookie)).status,404);
    assert.equal((await http('/auth/logout','POST',{},cookie,{Origin:'invalid-origin'})).status,403);
  });
  await t.test('limpieza solo incluye marca explícita y es atómica ante datos protegidos',async()=>{
    for(const dni of ['43000006','43000007']){assert.equal((await http('/inscripciones','POST',enrollment(dni,{esPrueba:true}))).status,201);await deactivate(dni);}
    const d=await http('/admin/maintenance/test-data');assert.ok(d.body.rows.every(r=>r.esPrueba));assert.ok(!d.body.rows.some(r=>r.dni==='43000005'));
    const pick=dnis=>d.body.rows.filter(r=>dnis.includes(r.dni)).map(r=>({dni:r.dni,revision:r.revision}));
    const body={confirmacion:'ELIMINAR PRUEBAS',motivo:'Limpieza del lote ficticio verificado',registros:pick(['43000006','43000002'])};assert.equal((await http('/admin/maintenance/test-data/clean','POST',body)).status,409);assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.ALUMNO WHERE DNI_Alu='43000006'"),1);
    body.registros=pick(['43000006','43000007']);const clean=await http('/admin/maintenance/test-data/clean','POST',body);assert.equal(clean.status,200,JSON.stringify(clean.body));assert.equal(clean.body.eliminados,2);
    await assert.rejects(query("UPDATE dbo.ALUMNO SET Es_Prueba=1 WHERE DNI_Alu='43000005'"));
  });
  await t.test('historia académica y referencias adicionales impiden el borrado',async()=>{
    assert.equal((await http('/inscripciones','POST',enrollment('43000008',{esPrueba:true}))).status,201);
    assert.equal((await http('/simulacros','POST',{Cod_Examen:'V43-EX',Nomb_Examen:'Simulacro ficticio protegido',puntaje_maximo:100,Fech_programada:'2027-02-05',Hr_inicio:'10:00',Duracion_minutos:60,grupos:['V4-GR']})).status,201);
    assert.equal((await http('/simulacros/V43-EX/resultados','POST',{DNI_Alu:'43000008',Puntaje_total:80})).status,200);await deactivate('43000008');let p=await review('43000008');assert.equal(p.acciones[0].enabled,false);assert.match(p.acciones[0].explanation,/académicos/);
    assert.equal((await http('/inscripciones','POST',enrollment('43000009',{esPrueba:true}))).status,201);await deactivate('43000009');
    await query('CREATE TABLE dbo.V43_Referencia_Prueba(Id int PRIMARY KEY,DNI varchar(8) NOT NULL REFERENCES dbo.ALUMNO(DNI_Alu)); INSERT dbo.V43_Referencia_Prueba VALUES(1,\'43000009\')');
    p=await review('43000009');assert.equal(p.acciones[0].enabled,false);assert.match(p.acciones[0].explanation,/V43_Referencia_Prueba/);
    await query('DROP TABLE dbo.V43_Referencia_Prueba');
  });
  await t.test('fallo de auditoría revierte una eliminación ya iniciada',async()=>{
    const lifecycle=require('../server/student-lifecycle'),actor={Cod_Usuario:'ACTOR-INEXISTENTE'},p=await lifecycle.review('43000009',actor);
    await assert.rejects(lifecycle.remove('43000009',{confirmacion:'ELIMINAR 43000009',revision:p.revision,motivo:'Ensayo de reversión al fallar la auditoría'},actor));
    assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.ALUMNO WHERE DNI_Alu='43000009'"),1);assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.Pago WHERE ALUMNO_DNI_Alu='43000009'"),5);
  });
  await t.test('usuario administrador sin operaciones se desactiva y elimina con su control de sesión',async()=>{
    const r=await http('/records/Usuario','POST',{Nomb_Usuario:'v43-admin-error',ROL_Cod_Rol:'ADMIN',Nueva_Clave:password});assert.equal(r.status,201);
    const user=(await query("SELECT Cod_Usuario FROM dbo.Usuario WHERE Nomb_Usuario='v43-admin-error'")).recordset[0],url='/records/Usuario/'+id(user.Cod_Usuario);
    assert.equal((await http(url+'/actions')).body.acciones[0].enabled,false);
    assert.equal((await http(url+'/state','POST',{accion:'desactivar',confirmacion:true,motivo:'Usuario administrador creado por error en pruebas'})).status,200);
    assert.equal((await http(url+'/actions')).body.acciones[0].enabled,true);assert.equal((await http(url,'DELETE',{confirmacion:'ELIMINAR',motivo:'Eliminación de cuenta ficticia sin operaciones'})).status,200);
    assert.equal(await scalar(`SELECT COUNT(*) n FROM dbo.Usuario WHERE Cod_Usuario='${user.Cod_Usuario}'`),0);
  });
  await t.test('scripts SQL ficticios y limpieza confirman alcance y preservan apoderados',async()=>{
    const seed=load('sql/migrations/v4_3/04_DATOS_FICTICIOS.sql').replace("DECLARE @Confirmacion varchar(40)='';","DECLARE @Confirmacion varchar(40)='CREAR DATOS FICTICIOS';").replace("DECLARE @Administrador varchar(20)='REEMPLAZAR';","DECLARE @Administrador varchar(20)='V43-ADMIN';").replace("DECLARE @HashBcrypt varchar(255)='';",`DECLARE @HashBcrypt varchar(255)='${hash}';`);
    await pool.request().batch(seed);assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.Pago WHERE ALUMNO_DNI_Alu='43000090'"),5);
    let cleanup=load('sql/migrations/v4_3/05_LIMPIEZA_SEGURA_PRUEBAS.sql').replace("DECLARE @BaseEsperada sysname=N'FractalesAcademy';",`DECLARE @BaseEsperada sysname=N'${database}';`).replace("DECLARE @Administrador varchar(20)='REEMPLAZAR';","DECLARE @Administrador varchar(20)='V43-ADMIN';").replace("DECLARE @Motivo varchar(250)='';","DECLARE @Motivo varchar(250)='Ensayo SQL de limpieza ficticia';").replace("DECLARE @DnisJson nvarchar(max)=N'[]';",`DECLARE @DnisJson nvarchar(max)=N'["43000090"]';`);
    await pool.request().batch(cleanup);assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.ALUMNO WHERE DNI_Alu='43000090'"),1);
    cleanup=cleanup.replace("DECLARE @Confirmacion varchar(30)='';","DECLARE @Confirmacion varchar(30)='ELIMINAR PRUEBAS';");await assert.rejects(pool.request().batch(cleanup));await deactivate('43000090');await pool.request().batch(cleanup);
    assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.ALUMNO WHERE DNI_Alu='43000090'"),0);assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.APODERADO WHERE DNI_Apoderado='43999090'"),1);
  });
  await t.test('operaciones de módulos: editar, desactivar, reactivar, anular, publicar y eliminar cuando corresponde',async()=>{
    const record=(table,key)=>'/records/'+table+'/'+id(key);
    async function ok(route,method,body,status=200){const r=await http(route,method,body);assert.equal(r.status,status,r.body.error||route);return r.body;}
    async function state(table,key,accion){return ok(record(table,key)+'/state','POST',{accion,confirmacion:true,motivo:'Ensayo funcional de estados del módulo'});}
    for(const [table,key,body,update,active] of [
      ['CARRERA','V43-OPS',{Cod_Carrera:'V43-OPS',Nomb_Carrera:'Carrera ficticia para operaciones'},{Nomb_Carrera:'Carrera ficticia editada'},false],
      ['Docente','43999881',{DNI_Doc:'43999881',Nom_Doc:'Docente ficticio para operaciones',Cel_Doc:'900000081'},{Cel_Doc:'900000082'},true],
      ['CURSOS','V43-OPS',{Cod_Curso:'V43-OPS',Nomb_Curso:'Curso ficticio para operaciones'},{Nomb_Curso:'Curso ficticio editado'},true],
      ['Aula','V43-OPS',{Cod_Aula:'V43-OPS',Nomb_Aula:'Aula ficticia para operaciones',Capacidad:20},{Capacidad:25},true]
    ]){
      await ok('/records/'+table,'POST',body,201);const search=await ok('/records/'+table+'?q='+key,'GET');assert.equal(search.rows.length,1);await ok(record(table,key),'PUT',update);
      if(active){await state(table,key,'desactivar');await state(table,key,'restaurar');}
    }
    await ok('/records/Aula','POST',{Cod_Aula:'V43-LIBRE',Nomb_Aula:'Aula ficticia sin uso',Capacidad:10},201);
    const free=await ok(record('Aula','V43-LIBRE')+'/actions','GET');assert.equal(free.acciones[0].enabled,true);await ok(record('Aula','V43-LIBRE'),'DELETE',{confirmacion:'ELIMINAR',motivo:'Aula ficticia creada por error sin relaciones'});
    await ok('/records/Ciclo','POST',{Cod_Ciclo:'V43-OPS',Programa_Cod_Programa:'PREUNIV',Nomb_Ciclo:'Ciclo ficticio de operaciones',Modalidad:'REGULAR',Fech_Inicio:'2029-01-31',Fech_Fin:'2029-05-30',Nro_Mensualidades:4,Precio_Mensual:250,ESTADO_CICLO_Cod_Estado:'PROGRAMADO'},201);
    await ok(record('Ciclo','V43-OPS'),'PUT',{Nomb_Ciclo:'Ciclo ficticio editado'});await state('Ciclo','V43-OPS','anular');await state('Ciclo','V43-OPS','restaurar');
    await ok('/records/Grupo','POST',{Cod_Grupo:'V43-OPS',Nomb_Grupo:'Grupo ficticio de operaciones',Cupo_Max:20,Turno_Cod_Turno:'MANANA',Aula_Cod_Aula:'V43-OPS',Ciclo_Cod_Ciclo:'V43-OPS'},201);
    await ok(record('Grupo','V43-OPS'),'PUT',{Nomb_Grupo:'Grupo ficticio editado'});await state('Grupo','V43-OPS','desactivar');await state('Grupo','V43-OPS','restaurar');
    await ok('/records/Horario','POST',{...schedule,Cod_Horario:'V43-OPS',Grupo_Cod_Grupo:'V43-OPS',Docente_Asignatura_CURSOS_Cod_Curso:'V43-OPS',Docente_Asignatura_Docente_DNI_Doc:'43999881'},201);
    await ok(record('Horario','V43-OPS'),'PUT',{Hr_Inicio:'09:00',Hr_Fin:'10:00'});await state('Horario','V43-OPS','desactivar');await state('Horario','V43-OPS','restaurar');
    const enroll=await ok('/inscripciones','POST',enrollment('43000010',{Grupo_Cod_Grupo:'V43-OPS'}),201);await ok(endpoint('43000010'),'PUT',{Dir_Alu:'Dirección ficticia editada'});
    await state('MATRICULA',enroll.matricula,'anular');await state('MATRICULA',enroll.matricula,'restaurar');
    await ok('/simulacros','POST',{Cod_Examen:'V43-OPS-EX',Nomb_Examen:'Evaluación ficticia de operaciones',puntaje_maximo:100,Fech_programada:'2029-02-07',Hr_inicio:'10:00',Duracion_minutos:60,grupos:['V43-OPS']},201);
    const note=await ok('/simulacros/V43-OPS-EX/resultados','POST',{DNI_Alu:'43000010',Puntaje_total:80});await ok('/simulacros/V43-OPS-EX/resultados','POST',{DNI_Alu:'43000010',Puntaje_total:85,Motivo_Cambio:'Corrección ficticia del puntaje para ensayo'});
    await state('Nota_Examen',note.codigo,'anular');await state('Nota_Examen',note.codigo,'restaurar');await ok('/simulacros/V43-OPS-EX/publicacion','POST',{Publicado:true});await ok('/simulacros/V43-OPS-EX/publicacion','POST',{Publicado:false});
    const report=await ok('/admin/maintenance/reports','GET');assert.equal(report.rows.find(r=>r.Cod_Grupo==='V43-OPS').Matriculas_Activas,1);
    const restricted=await http('/records/Programa','POST',{Cod_Programa:'V43-OPS',Nomb_Programa:'No es una opción académica permitida'});assert.equal(restricted.status,400);assert.match(restricted.body.error,/catálogo del sistema/);
  });
  await t.test('administrador verifica su propio correo y recupera acceso sin otro administrador',async()=>{
    const accounts=require('../server/account-service');
    await assert.rejects(query("UPDATE dbo.Usuario SET Correo_Recuperacion='sin-verificar@example.test',Correo_Verificado=1 WHERE Cod_Usuario='V43-ADMIN'"));
    assert.equal((await http('/admin/maintenance/account-email/request','POST',{email:'admin-v43@example.test',actual:'Contraseña equivocada'})).status,400);
    const requested=await http('/admin/maintenance/account-email/request','POST',{email:'admin-v43@example.test',actual:password});assert.equal(requested.status,200,requested.body.error);await accounts.flush();
    const verification=accounts.notifications.inbox.at(-1);assert.equal(verification.to,'admin-v43@example.test');
    assert.equal((await http('/admin/maintenance/account-email/confirm','POST',{codigo:verification.code})).status,200);
    const profile=await http('/admin/maintenance/account-email');assert.equal(profile.body.email,verification.to);assert.equal(profile.body.verificado,true);
    const recovery=await http('/auth/recovery/request','POST',{email:verification.to},'');assert.equal(recovery.status,202);await accounts.flush();const code=accounts.notifications.inbox.at(-1).code;
    const nextPassword='Frase administradora recuperada de prueba';assert.equal((await http('/auth/recovery/complete','POST',{email:verification.to,codigo:code,nueva:nextPassword,confirmacion:nextPassword},'')).status,200);
    assert.equal((await http('/dashboard')).status,401);assert.equal((await http('/auth/login','POST',{usuario:'v43-admin',clave:password},'')).status,401);
    const login=await http('/auth/login','POST',{usuario:'v43-admin',clave:nextPassword},'');assert.equal(login.status,200);cookie=login.cookie;
    assert.equal((await http('/auth/recovery/complete','POST',{email:verification.to,codigo:code,nueva:nextPassword,confirmacion:nextPassword},'')).status,400);
  });
  await t.test('I: FK/CHECK confiables, auditoría conservada y ningún huérfano',async()=>{
    await pool.request().batch(load('sql/migrations/v4_3/99_VERIFICAR.sql'));assert.equal(await scalar('SELECT COUNT(*) n FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1'),0);
    assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.Auditoria_V4 WHERE Accion='ELIMINAR_CONTROLADO'"),3);assert.equal(await scalar('SELECT COUNT(*) n FROM dbo.Pago p LEFT JOIN dbo.ALUMNO a ON a.DNI_Alu=p.ALUMNO_DNI_Alu WHERE a.DNI_Alu IS NULL'),0);
    assert.equal(await scalar('SELECT COUNT(*) n FROM dbo.Usuario u LEFT JOIN dbo.ALUMNO a ON a.DNI_Alu=u.ALUMNO_DNI_Alu WHERE u.ALUMNO_DNI_Alu IS NOT NULL AND a.DNI_Alu IS NULL'),0);
  });
});
