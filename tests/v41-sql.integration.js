'use strict';
// Opt-in: SQL Server localhost, Windows integrado, base de pruebas vacía. No envíos reales.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
test('V4.1: SQL incremental, cuentas seguras y administración',async t=>{
  const database=process.env.V41_SQL_TEST_DATABASE;
  if(!/^FractalesAcademy_Pruebas_V4_1[A-Za-z0-9_]*$/.test(database||''))throw Error('Selecciona V41_SQL_TEST_DATABASE=FractalesAcademy_Pruebas_V4_1... vacía.');
  const sql=require('mssql/msnodesqlv8');const pool=await new sql.ConnectionPool({connectionString:`Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=${database};Trusted_Connection=Yes;Encrypt=No;TrustServerCertificate=Yes;`,pool:{max:8,min:0,idleTimeoutMillis:1000},requestTimeout:30000}).connect();t.after(()=>pool.close());
  const settings='SET NOCOUNT ON; SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON; SET ANSI_WARNINGS ON; SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF; ';
  const db={sql,pool:async()=>pool,request:async tx=>{const r=tx?new sql.Request(tx):pool.request(),run=r.query.bind(r);r.query=text=>run(settings+text);return r;}};
  const query=async(text,inputs={})=>{const r=await db.request();for(const [k,v] of Object.entries(inputs))r.input(k,v);return r.query(text);};
  const count=async text=>(await query(text)).recordset[0].n;
  const load=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
  const migrate=async(folder,file)=>pool.request().batch(load(`sql/migrations/${folder}/${file}`).replace("DECLARE @BaseEsperada sysname=N'FractalesAcademy';",`DECLARE @BaseEsperada sysname=N'${database}';`));
  await t.test('prepara el modelo V4 en una base independiente',async()=>{
    assert.equal(await count('SELECT COUNT(*) n FROM sys.tables WHERE is_ms_shipped=0'),0,'Usa otra base vacía; no se limpia ni reconstruye esta base.');
    await pool.request().batch(load('sql/testing/CREAR_ESTRUCTURA_PRUEBAS.sql'));await pool.request().batch(load('sql/testing/DATOS_PRUEBA_V4.sql'));
    for(const file of fs.readdirSync(path.join(__dirname,'../sql/migrations/v4')).filter(f=>/^0[0-6]/.test(f)&&!f.startsWith('00_DIAGNOSTICO')).sort())await migrate('v4',file);
  });
  const dbPath=require.resolve('../server/db');require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:db};
  process.env.JWT_SECRET=crypto.randomBytes(48).toString('hex');process.env.NODE_ENV='test';process.env.ACCOUNT_SECURITY_V41='auto';
  const bcrypt=require('bcryptjs'),mailbox=[];const {createAccountSecurity}=require('../server/account-security');
  const accounts=createAccountSecurity({emailConfigured:true,smsConfigured:false,sendEmail:async message=>mailbox.push({...message}),sendSMS:async()=>{throw Error('SMS real prohibido en pruebas');}});
  const servicePath=require.resolve('../server/account-service');require.cache[servicePath]={id:servicePath,filename:servicePath,loaded:true,exports:accounts};
  const adminPassword=crypto.randomBytes(18).toString('base64url'),legacyPassword=crypto.randomBytes(18).toString('base64url');
  await query("INSERT dbo.Usuario(Cod_Usuario,Nomb_Usuario,Clave_Hash,ROL_Cod_Rol,Debe_Cambiar_Clave) VALUES ('V41-ADMIN','v41-admin',@hash,'ADMIN',0)",{hash:await bcrypt.hash(adminPassword,12)});
  await query("INSERT dbo.Usuario(Cod_Usuario,Nomb_Usuario,Clave_Hash,ROL_Cod_Rol,ALUMNO_DNI_Alu,Debe_Cambiar_Clave) VALUES ('V41-LEGACY','legado-v41',@hash,'ALUMNO','00000001',0)",{hash:await bcrypt.hash(legacyPassword,12)});
  const app=require('../server/index'),server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base=`http://127.0.0.1:${server.address().port}`;let adminCookie='',legacyCookie='',dniCookie='';
  let ipCounter=1;
  async function http(route,method='GET',body,cookie=adminCookie,ip){
    const response=await fetch(base+'/api'+route,{method,headers:{'Content-Type':'application/json',Cookie:cookie||'','X-Forwarded-For':ip||`10.20.0.${ipCounter++%240+1}`},...(body===undefined?{}:{body:JSON.stringify(body)})});
    const value=await response.json();return {status:response.status,body:value,cookie:response.headers.get('set-cookie')?.split(';')[0]};
  }
  const id=value=>Buffer.from(JSON.stringify([value])).toString('base64url');
  const student=dni=>({DNI_Alu:dni,Nomb_Alu:'Estudiante Ficticio V41 '+dni,Nomb_Apoderado:'Tutor Ficticio',PARENTESCO_Cod_Paren:'TUTOR',CARRERA_Cod_Carrera:'V4-TEST',Cel_Alu:'900001234'});
  const signup=(dni,mode)=>http('/inscripciones','POST',{alumno:student(dni),Grupo_Cod_Grupo:'V4-GR',...(mode?{accesoInicial:{modo:mode,identidadConfirmada:true}}:{})});
  await t.test('sin migraciones V4.1 mantiene acceso V4 y deshabilita recuperación/activación DNI',async()=>{
    const admin=await http('/auth/login','POST',{usuario:'v41-admin',clave:adminPassword},'');assert.equal(admin.status,200);adminCookie=admin.cookie;
    const login=await http('/auth/login','POST',{usuario:'legado-v41',clave:legacyPassword},'');assert.equal(login.status,200);legacyCookie=login.cookie;
    assert.equal((await http('/auth/capabilities')).body.v41,false);assert.equal((await signup('81000001','DNI_ACTIVACION')).status,400);
    const request=await http('/auth/recovery/request','POST',{dni:'00000001'});assert.equal(request.status,202);assert.equal(request.body.disponible,false);assert.equal(mailbox.length,0);
    assert.equal((await http('/student/overview','GET',undefined,legacyCookie)).status,200);
    process.env.ACCOUNT_SECURITY_V41='required';try{assert.equal((await http('/auth/capabilities')).status,503);}finally{process.env.ACCOUNT_SECURITY_V41='auto';}
    assert.equal((await http('/auth/me','GET',undefined,legacyCookie)).status,200);
  });
  await t.test('elimina un catálogo sin dependencias solo con confirmación y deja auditoría',async()=>{
    assert.equal((await http('/records/CURSOS','POST',{Cod_Curso:'V41-LIBRE',Nomb_Curso:'Curso Ficticio para eliminar'})).status,201);
    const endpoint='/records/CURSOS/'+id('V41-LIBRE');const review=await http(endpoint+'/actions');assert.ok(review.body.acciones.find(a=>a.id==='eliminar'&&a.enabled));
    assert.equal((await http(endpoint,'DELETE',{motivo:'Eliminación ficticia sin confirmación'})).status,400);
    assert.equal((await http(endpoint,'DELETE',{confirmacion:'ELIMINAR',motivo:'Catálogo ficticio sin dependencias'})).status,200);
    assert.equal(await count("SELECT COUNT(*) n FROM dbo.CURSOS WHERE Cod_Curso='V41-LIBRE'"),0);
    assert.equal(await count("SELECT COUNT(*) n FROM dbo.Auditoria_V4 WHERE Entidad='CURSOS' AND Codigo='V41-LIBRE' AND Accion='ELIMINAR'"),1);
  });
  await t.test('bloquea eliminación con FK y muestra las relaciones dependientes',async()=>{
    const endpoint='/records/CARRERA/'+id('V4-TEST'),review=await http(endpoint+'/actions');assert.ok(review.body.dependencias.some(d=>d.tabla==='ALUMNO'&&d.cantidad>0));assert.equal(review.body.acciones.find(a=>a.id==='eliminar').enabled,false);
    const r=await http(endpoint,'DELETE',{confirmacion:'ELIMINAR',motivo:'Intento ficticio con dependencias'});assert.equal(r.status,409);assert.ok(r.body.dependencias.length);assert.equal(await count("SELECT COUNT(*) n FROM dbo.CARRERA WHERE Cod_Carrera='V4-TEST'"),1);
  });
  await t.test('migra V4.1 dos veces sin cambiar filas de las 25 tablas originales ni claves antiguas',async()=>{
    const model=require('../server/model.json'),snapshots={};for(const m of Object.values(model))snapshots[m.name]=JSON.stringify((await query(`SELECT * FROM dbo.[${m.name}] ORDER BY ${m.pk.map(k=>'['+k+']').join(',')}`)).recordset);
    const dir=path.join(__dirname,'../sql/migrations/v4_1'),files=fs.readdirSync(dir).filter(f=>/^0[1-4]_/.test(f)).sort();
    await pool.request().batch(load('sql/migrations/v4_1/00_DIAGNOSTICO_V4_1.sql'));
    await assert.rejects(pool.request().batch(load('sql/migrations/v4_1/01_RECUPERACION_CUENTAS.sql')));
    for(const file of files)await migrate('v4_1',file);for(const file of files)await migrate('v4_1',file);
    await pool.request().batch(load('sql/migrations/v4_1/99_VERIFICACION_FINAL_V4_1.sql'));
    for(const m of Object.values(model))assert.equal(JSON.stringify((await query(`SELECT * FROM dbo.[${m.name}] ORDER BY ${m.pk.map(k=>'['+k+']').join(',')}`)).recordset),snapshots[m.name],m.name);
    assert.equal(await count('SELECT COUNT(*) n FROM sys.tables WHERE is_ms_shipped=0'),35);assert.equal(await count('SELECT COUNT(*) n FROM sys.foreign_keys'),40);assert.equal(await count("SELECT COUNT(*) n FROM dbo.Control_Migracion_V4 WHERE Script LIKE 'V41[_]%'"),4);
    assert.equal(await count('SELECT COUNT(*) n FROM dbo.Contacto_Verificado_V41'),0);assert.equal(await count('SELECT COUNT(*) n FROM dbo.Usuario_Seguridad_V41'),0);
    assert.equal((await http('/auth/capabilities')).body.v41,true);assert.equal((await http('/student/overview','GET',undefined,legacyCookie)).status,200);
  });
  await t.test('permisos opcionales requieren principal explícito y no conceden borrado financiero',async()=>{
    const source=load('sql/migrations/v4_1/05_PERMISOS_APLICACION_OPCIONAL.sql').replace("DECLARE @BaseEsperada sysname=N'FractalesAcademy';",`DECLARE @BaseEsperada sysname=N'${database}';`);
    await assert.rejects(pool.request().batch(source));
    await query('CREATE USER [V41-APP-TEST] WITHOUT LOGIN');
    await pool.request().batch(source.replace("DECLARE @UsuarioAplicacion sysname=N'REEMPLAZAR_POR_USUARIO_SQL_EXISTENTE';","DECLARE @UsuarioAplicacion sysname=N'V41-APP-TEST';"));
    const permissions=(await query(`EXECUTE AS USER='V41-APP-TEST'; BEGIN TRY SELECT
      HAS_PERMS_BY_NAME('dbo.Cuenta_Codigo_V41','OBJECT','UPDATE') AS ActualizarCodigo,
      HAS_PERMS_BY_NAME('dbo.CURSOS','OBJECT','DELETE') AS EliminarCatalogo,
      HAS_PERMS_BY_NAME('dbo.ALUMNO','OBJECT','DELETE') AS EliminarAlumno,
      HAS_PERMS_BY_NAME('dbo.Pago','OBJECT','DELETE') AS EliminarPago,
      HAS_PERMS_BY_NAME('dbo.Cuenta_Codigo_V41','OBJECT','DELETE') AS EliminarCodigo;
      REVERT; END TRY BEGIN CATCH REVERT; THROW; END CATCH;`)).recordset[0];
    assert.equal(permissions.ActualizarCodigo,1);assert.equal(permissions.EliminarCatalogo,1);assert.notEqual(permissions.EliminarAlumno,1);assert.notEqual(permissions.EliminarPago,1);assert.equal(permissions.EliminarCodigo,0);
  });
  await t.test('un esquema V4.1 incompleto falla cerrado sin reactivar sesiones mediante compatibilidad V4',async()=>{
    await query("UPDATE dbo.Control_Migracion_V4 SET Script='V41_04_ENSAYO_INCOMPLETO' WHERE Script='V41_04_AUDITORIA_ADMINISTRATIVA'");
    try{assert.equal((await http('/auth/capabilities')).status,503);assert.equal((await http('/auth/me','GET',undefined,legacyCookie)).status,503);}
    finally{await query("UPDATE dbo.Control_Migracion_V4 SET Script='V41_04_AUDITORIA_ADMINISTRATIVA' WHERE Script='V41_04_ENSAYO_INCOMPLETO'");}
    assert.equal((await http('/auth/me','GET',undefined,legacyCookie)).status,200);
  });
  let initial;
  await t.test('DNI inicial exige identificación administrativa y código adicional; nunca concede datos por DNI solo',async()=>{
    const invalid=await http('/inscripciones','POST',{alumno:student('81000002'),Grupo_Cod_Grupo:'V4-GR',accesoInicial:{modo:'DNI_ACTIVACION'}});assert.equal(invalid.status,400);
    const result=await signup('81000002','DNI_ACTIVACION');assert.equal(result.status,201,JSON.stringify(result.body));initial=result.body;assert.equal(initial.claveTemporal,'81000002');assert.ok(initial.codigoActivacion.length>=16);
    assert.equal((await http('/auth/login','POST',{usuario:'81000002',clave:'81000002'},'')).status,401);
    assert.equal((await http('/auth/login','POST',{usuario:'81000002',clave:'81000002',codigoActivacion:'incorrecto'},'')).status,401);
    assert.equal((await http('/student/overview','GET',undefined,'')).status,401);
    const login=await http('/auth/login','POST',{usuario:'81000002',clave:'81000002',codigoActivacion:initial.codigoActivacion},'');assert.equal(login.status,200);dniCookie=login.cookie;assert.equal(login.body.user.cambiar,true);
    assert.equal((await http('/student/overview','GET',undefined,dniCookie)).status,403);assert.equal((await http('/student/profile','GET',undefined,dniCookie)).status,403);
    assert.equal((await http('/auth/login','POST',{usuario:'81000002',clave:'81000002',codigoActivacion:initial.codigoActivacion},'')).status,401);
  });
  let dniFullCookie;
  await t.test('primer ingreso cambia clave con confirmación, invalida desafío y conserva acceso posterior',async()=>{
    assert.equal((await http('/auth/change-password','POST',{nueva:'81000002',confirmacion:'81000002'},dniCookie)).status,400);
    assert.equal((await http('/auth/change-password','POST',{nueva:'MiFrasePersonalV41!',confirmacion:'NoCoincideV41!'},dniCookie)).status,400);
    const change=await http('/auth/change-password','POST',{nueva:'MiFrasePersonalV41!',confirmacion:'MiFrasePersonalV41!'},dniCookie);assert.equal(change.status,200,JSON.stringify(change.body));dniFullCookie=change.cookie;
    assert.equal((await http('/student/profile','GET',undefined,dniFullCookie)).status,200);assert.equal((await http('/student/profile','GET',undefined,dniCookie)).status,401);
    assert.equal((await http('/auth/login','POST',{usuario:'81000002',clave:'81000002'},'')).status,401);assert.equal((await http('/auth/login','POST',{usuario:'81000002',clave:'MiFrasePersonalV41!'},'')).status,200);
  });
  await t.test('activación bloquea el código después de cinco intentos',async()=>{
    const result=await signup('81000003','DNI_ACTIVACION');assert.equal(result.status,201);
    for(let n=0;n<5;n++)assert.equal((await http('/auth/login','POST',{usuario:'81000003',clave:'81000003',codigoActivacion:'incorrecto'},'')).status,401);
    assert.equal((await http('/auth/login','POST',{usuario:'81000003',clave:'81000003',codigoActivacion:result.body.codigoActivacion},'')).status,401);
    const row=(await query("SELECT Intentos,Consumido FROM dbo.Cuenta_Codigo_V41 c JOIN dbo.Usuario u ON u.Cod_Usuario=c.Usuario_Cod_Usuario WHERE u.ALUMNO_DNI_Alu='81000003' AND c.Proposito='ACTIVACION'")).recordset[0];assert.equal(row.Intentos,5);assert.equal(row.Consumido,true);
  });
  await t.test('correo registrado sin verificar y DNI inexistente reciben respuesta idéntica y no generan envío',async()=>{
    await query("UPDATE dbo.ALUMNO SET Correo_Alu='sin-verificar@example.test' WHERE DNI_Alu='81000002'");const before=mailbox.length;
    const a=await http('/auth/recovery/request','POST',{dni:'81000002'}),b=await http('/auth/recovery/request','POST',{dni:'99999998'});assert.deepEqual(a.body,b.body);assert.equal(a.status,202);assert.equal(mailbox.length,before);
  });
  await t.test('verifica correo con prueba de propiedad, actualiza el perfil y protege el código',async()=>{
    const r=await http('/student/contact/request','POST',{tipo:'EMAIL',destino:'legado-verificado@example.test',actual:legacyPassword},legacyCookie);assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(r.body.requiereCodigo,true);await accounts.flush();
    const delivery=mailbox.at(-1);assert.equal(delivery.purpose,'VERIFICAR_CONTACTO');assert.match(delivery.code,/^\d{6}$/);assert.ok(!JSON.stringify(r.body).includes(delivery.code));
    const saved=(await query("SELECT Codigo_Hash,Nonce FROM dbo.Cuenta_Codigo_V41 WHERE Usuario_Cod_Usuario='V41-LEGACY' AND Consumido=0")).recordset[0];assert.notEqual(saved.Codigo_Hash,delivery.code);assert.equal(saved.Codigo_Hash.length,64);
    assert.equal((await http('/student/contact/confirm','POST',{codigo:delivery.code},legacyCookie)).status,200);assert.equal((await http('/student/contact/confirm','POST',{codigo:delivery.code},legacyCookie)).status,400);
    const profile=(await http('/student/profile?dni=81000002','GET',undefined,legacyCookie)).body;assert.equal(profile.profile.DNI_Alu,'00000001');assert.equal(profile.profile.Correo_Alu,'legado-verificado@example.test');assert.ok(profile.contactos.some(c=>c.Tipo==='EMAIL'));
    await query("UPDATE dbo.ALUMNO SET Correo_Alu='cambio-ficticio@example.test' WHERE DNI_Alu='00000001'");assert.equal(await count("SELECT COUNT(*) n FROM dbo.Contacto_Verificado_V41 WHERE ALUMNO_DNI_Alu='00000001' AND Tipo='EMAIL' AND Activo=1"),0);
    const before=mailbox.length;await http('/auth/recovery/request','POST',{dni:'00000001'});await accounts.flush();assert.equal(mailbox.length,before,'Una edición de perfil invalida la verificación anterior.');
    await query("UPDATE dbo.Cuenta_Codigo_V41 SET Creado=DATEADD(second,-61,SYSUTCDATETIME()) WHERE Usuario_Cod_Usuario='V41-LEGACY' AND Proposito='VERIFICAR_CONTACTO'");
    assert.equal((await http('/student/contact/request','POST',{tipo:'EMAIL',destino:'legado-verificado@example.test',actual:legacyPassword},legacyCookie)).status,200);await accounts.flush();assert.equal((await http('/student/contact/confirm','POST',{codigo:mailbox.at(-1).code},legacyCookie)).status,200);
  });
  let oldCode;
  await t.test('recuperación usa exclusivamente correo verificado y persiste cinco intentos fallidos',async()=>{
    const r=await http('/auth/recovery/request','POST',{dni:'00000001'});assert.equal(r.status,202);await accounts.flush();oldCode=mailbox.at(-1).code;assert.equal(mailbox.at(-1).purpose,'RECUPERACION');
    const bad=oldCode==='000000'?'000001':'000000';for(let n=0;n<5;n++)assert.equal((await http('/auth/recovery/complete','POST',{dni:'00000001',codigo:bad,nueva:'MiNuevaFraseV41Segura!',confirmacion:'MiNuevaFraseV41Segura!'},'')).status,400);
    assert.equal((await http('/auth/recovery/complete','POST',{dni:'00000001',codigo:oldCode,nueva:'MiNuevaFraseV41Segura!',confirmacion:'MiNuevaFraseV41Segura!'},'')).status,400);
    const saved=(await query("SELECT TOP(1) Intentos,Consumido FROM dbo.Cuenta_Codigo_V41 WHERE Usuario_Cod_Usuario='V41-LEGACY' AND Proposito='RECUPERACION' ORDER BY Creado DESC")).recordset[0];assert.equal(saved.Intentos,5);assert.equal(saved.Consumido,true);
  });
  await t.test('limita reenvío por cuenta, invalida códigos anteriores y rechaza expirados',async()=>{
    let before=mailbox.length;await http('/auth/recovery/request','POST',{dni:'00000001'});await accounts.flush();assert.equal(mailbox.length,before);
    await query("UPDATE dbo.Cuenta_Codigo_V41 SET Creado=DATEADD(second,-61,SYSUTCDATETIME()) WHERE Usuario_Cod_Usuario='V41-LEGACY' AND Proposito='RECUPERACION'");
    await http('/auth/recovery/request','POST',{dni:'00000001'});await accounts.flush();assert.equal(mailbox.length,before+1);const expired=mailbox.at(-1).code;
    assert.equal(await count("SELECT COUNT(*) n FROM dbo.Cuenta_Codigo_V41 WHERE Usuario_Cod_Usuario='V41-LEGACY' AND Proposito='RECUPERACION' AND Consumido=0"),1);
    await query("UPDATE dbo.Cuenta_Codigo_V41 SET Creado=DATEADD(minute,-20,SYSUTCDATETIME()),Expira=DATEADD(minute,-10,SYSUTCDATETIME()) WHERE Usuario_Cod_Usuario='V41-LEGACY' AND Proposito='RECUPERACION' AND Consumido=0");
    assert.equal((await http('/auth/recovery/complete','POST',{dni:'00000001',codigo:expired,nueva:'MiNuevaFraseV41Segura!',confirmacion:'MiNuevaFraseV41Segura!'},'')).status,400);
  });
  let recoveredPassword;
  await t.test('un código válido restablece una sola vez, revoca sesiones anteriores y permite nuevo ingreso',async()=>{
    await http('/auth/recovery/request','POST',{dni:'00000001'});await accounts.flush();const code=mailbox.at(-1).code;
    const first='RecuperadaSeguraV41-A!',second='RecuperadaSeguraV41-B!';
    const results=await Promise.all([http('/auth/recovery/complete','POST',{dni:'00000001',codigo:code,nueva:first,confirmacion:first},''),http('/auth/recovery/complete','POST',{dni:'00000001',codigo:code,nueva:second,confirmacion:second},'')]);
    assert.equal(results.filter(r=>r.status===200).length,1,JSON.stringify(results.map(r=>r.body)));recoveredPassword=results[0].status===200?first:second;
    assert.equal((await http('/student/profile','GET',undefined,legacyCookie)).status,401);
    const login=await http('/auth/login','POST',{usuario:'legado-v41',clave:recoveredPassword},'');assert.equal(login.status,200);legacyCookie=login.cookie;
    const before=mailbox.length;await http('/auth/recovery/request','POST',{dni:'00000001'});await accounts.flush();assert.equal(mailbox.length,before,'Tres solicitudes por hora se mantienen incluso tras recuperar.');
  });
  await t.test('el límite por IP se aplica también a DNI inexistentes',async()=>{
    for(let n=0;n<5;n++)assert.equal((await http('/auth/recovery/request','POST',{dni:'99999998'},'','10.99.0.1')).status,202);
    assert.equal((await http('/auth/recovery/request','POST',{dni:'99999998'},'','10.99.0.1')).status,429);
  });
  await t.test('recuperación administrativa exige identidad, entrega clave individual y revoca el acceso anterior',async()=>{
    assert.equal((await http('/admin/accounts/00000001/recover','POST',{motivo:'Solicitud ficticia sin confirmar identidad'})).status,400);
    const reset=await http('/admin/accounts/00000001/recover','POST',{motivo:'Identidad ficticia comprobada en pruebas',identidadConfirmada:true});assert.equal(reset.status,200);assert.notEqual(reset.body.claveTemporal,'00000001');assert.ok(reset.body.claveTemporal.length>=24);
    assert.equal((await http('/student/profile','GET',undefined,legacyCookie)).status,401);
    const login=await http('/auth/login','POST',{usuario:'legado-v41',clave:reset.body.claveTemporal},'');assert.equal(login.status,200);assert.equal(login.body.user.cambiar,true);
    const changed=await http('/auth/change-password','POST',{nueva:'MiAccesoAdministradoV41!',confirmacion:'MiAccesoAdministradoV41!'},login.cookie);assert.equal(changed.status,200);legacyCookie=changed.cookie;
    const audit=(await query("SELECT Anterior,Nuevo FROM dbo.Auditoria_V4 WHERE Entidad='Usuario'")).recordset;assert.ok(!JSON.stringify(audit).includes('Clave_Hash'));assert.ok(!JSON.stringify(audit).includes(reset.body.claveTemporal));
  });
  await t.test('desactiva y restaura catálogos, alumnos y cuentas conservando matrículas y pagos',async()=>{
    await http('/records/CURSOS','POST',{Cod_Curso:'V41-ESTADO',Nomb_Curso:'Curso Ficticio con Estado'});const course='/records/CURSOS/'+id('V41-ESTADO');
    assert.equal((await http(course+'/state','POST',{accion:'desactivar',confirmacion:true,motivo:'Desactivar catálogo ficticio'})).status,200);assert.equal((await query("SELECT Activa FROM dbo.CURSOS WHERE Cod_Curso='V41-ESTADO'")).recordset[0].Activa,false);
    assert.equal((await http(course+'/state','POST',{accion:'restaurar',confirmacion:true,motivo:'Restaurar catálogo ficticio'})).status,200);
    const beforeMat=await count('SELECT COUNT(*) n FROM dbo.MATRICULA'),beforePay=await count('SELECT COUNT(*) n FROM dbo.Pago');
    const alumno='/records/ALUMNO/'+id('00000001');assert.equal((await http(alumno+'/state','POST',{accion:'desactivar',confirmacion:true,motivo:'Baja ficticia solicitada en pruebas'})).status,200);
    const inactive=await http('/records/ALUMNO?estado=inactivo');assert.equal(inactive.status,200,JSON.stringify(inactive.body));assert.ok(inactive.body.rows.some(r=>r.DNI_Alu==='00000001'&&r._estadoGestion==='BAJA'));
    await query("UPDATE dbo.Usuario SET Activo=1 WHERE Cod_Usuario='V41-LEGACY'");assert.equal((await http('/auth/login','POST',{usuario:'legado-v41',clave:'MiAccesoAdministradoV41!'},'')).status,401,'La baja del alumno también protege una cuenta reactivada por fuera del flujo.');
    assert.equal((await http('/student/profile','GET',undefined,legacyCookie)).status,401);assert.equal((await http(alumno+'/state','POST',{accion:'restaurar',confirmacion:true,motivo:'Restauración ficticia autorizada'})).status,200);
    assert.equal(await count('SELECT COUNT(*) n FROM dbo.MATRICULA'),beforeMat);assert.equal(await count('SELECT COUNT(*) n FROM dbo.Pago'),beforePay);
    const login=await http('/auth/login','POST',{usuario:'legado-v41',clave:'MiAccesoAdministradoV41!'},'');assert.equal(login.status,200);legacyCookie=login.cookie;
    assert.equal((await http('/records/Usuario/'+id('V41-ADMIN')+'/state','POST',{accion:'desactivar',confirmacion:true,motivo:'No debe desactivarse a sí mismo'})).status,400);
  });
  await t.test('anula y restaura matrículas sin eliminar ni modificar obligaciones',async()=>{
    const before=JSON.stringify((await query('SELECT * FROM dbo.Pago ORDER BY Cod_Pago')).recordset);const endpoint='/records/MATRICULA/'+id('V4-MAT-LEGADO')+'/state';
    assert.equal((await http(endpoint,'POST',{accion:'anular',confirmacion:true,motivo:'Anulación ficticia de matrícula'})).status,200);
    assert.equal((await query("SELECT ESTADO_MATRICULA_Cod_Estado_Matricula AS Estado FROM dbo.MATRICULA WHERE Cod_Matricula='V4-MAT-LEGADO'")).recordset[0].Estado,'ANULADA');
    assert.equal((await http(endpoint,'POST',{accion:'restaurar',confirmacion:true,motivo:'Restauración ficticia de matrícula'})).status,200);assert.equal(JSON.stringify((await query('SELECT * FROM dbo.Pago ORDER BY Cod_Pago')).recordset),before);
  });
  await t.test('calificaciones anuladas conservan puntaje e historial y dejan de mostrarse al alumno',async()=>{
    assert.equal((await http('/simulacros','POST',{Cod_Examen:'V41-SIM',Nomb_Examen:'Simulacro Ficticio V41',puntaje_maximo:100,Fech_programada:'2027-02-20',Hr_inicio:'09:00',Duracion_minutos:120,grupos:['V4-GR']})).status,201);
    const note=await http('/simulacros/V41-SIM/resultados','POST',{DNI_Alu:'00000001',Puntaje_total:80});assert.equal(note.status,200);await http('/simulacros/V41-SIM/publicacion','POST',{Publicado:true});
    const route='/records/Nota_Examen/'+id(note.body.codigo)+'/state';assert.equal((await http(route,'POST',{accion:'anular',confirmacion:true,motivo:'Anulación ficticia de resultado'})).status,200);
    const cancelled=await http('/records/Nota_Examen?estado=inactivo');assert.equal(cancelled.status,200,JSON.stringify(cancelled.body));assert.ok(cancelled.body.rows.some(r=>r.Cod_Nota===note.body.codigo&&r._estadoGestion==='ANULADA'));
    assert.equal((await http('/student/overview','GET',undefined,legacyCookie)).body.notes.length,0);assert.equal((await query('SELECT Puntaje_total FROM dbo.Nota_Examen WHERE Cod_Nota=@id',{id:note.body.codigo})).recordset[0].Puntaje_total,80);
    assert.equal((await http(route,'POST',{accion:'restaurar',confirmacion:true,motivo:'Restauración ficticia de resultado'})).status,200);assert.equal((await http('/student/overview','GET',undefined,legacyCookie)).body.notes.length,1);
  });
  await t.test('sin proveedor no simula envíos y permite solicitud de contacto para revisión administrativa',async()=>{
    const disabled=createAccountSecurity({emailConfigured:false,smsConfigured:false,sendEmail:async()=>{throw Error('No debe enviarse');}});const before=mailbox.length;
    assert.equal((await disabled.requestRecovery('00000001')).disponible,false);assert.equal(mailbox.length,before);
    const user=(await query("SELECT * FROM dbo.Usuario WHERE Cod_Usuario='V41-LEGACY'")).recordset[0];const request=await disabled.requestContact(user,{tipo:'SMS',destino:'900009999',actual:'MiAccesoAdministradoV41!'});assert.equal(request.requiereCodigo,false);
    const pending=(await http('/admin/contact-requests')).body.rows.find(r=>r.Tipo==='SMS');assert.ok(pending);
    assert.equal((await http(`/admin/contact-requests/${pending.Id}/resolve`,'POST',{aprobar:true,motivo:'Intento sin verificar identidad'})).status,400);
    assert.equal((await http(`/admin/contact-requests/${pending.Id}/resolve`,'POST',{aprobar:true,identidadConfirmada:true,motivo:'Identidad y control ficticios comprobados'})).status,200);
    assert.equal((await query("SELECT Cel_Alu FROM dbo.ALUMNO WHERE DNI_Alu='00000001'")).recordset[0].Cel_Alu,'900009999');assert.equal((await http('/auth/capabilities')).body.sms,false);
  });
  await t.test('protege datos ajenos, auditoría y eliminación desde sesiones de alumno',async()=>{
    assert.equal((await http('/admin/audit','GET',undefined,legacyCookie)).status,403);assert.equal((await http('/records/CURSOS/'+id('V41-ESTADO'),'DELETE',{confirmacion:'ELIMINAR',motivo:'Alumno sin permisos'},legacyCookie)).status,403);
    assert.equal((await http('/admin/accounts/81000002/recover','POST',{motivo:'Alumno no autorizado',identidadConfirmada:true},legacyCookie)).status,403);
    assert.equal((await http('/student/profile?dni=81000002','GET',undefined,legacyCookie)).body.profile.DNI_Alu,'00000001');
  });
  await accounts.flush();
});
