'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
test('V4.4: copia representativa V4.3, migraciones por etapas y API real',async t=>{
 let database=process.env.V44_SQL_TEST_DATABASE;
 if(!/^FractalesAcademy_Pruebas_V4_4_\d{8}_[a-f0-9]{10}$/.test(database||''))throw Error('Requiere base V44 local NUEVA. Usa npm run test:sql:v44.');
 const sql=require('mssql/msnodesqlv8'),bcrypt=require('bcryptjs');
 const connect=name=>new sql.ConnectionPool({connectionString:`Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=${name};Trusted_Connection=Yes;Encrypt=No;TrustServerCertificate=Yes;`,pool:{max:8,min:0,idleTimeoutMillis:1000},requestTimeout:60000}).connect();
 let pool=await connect(database);t.after(()=>pool.close());
 const settings='SET NOCOUNT ON; SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON; SET ANSI_WARNINGS ON; SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF; ';
 const db={sql,pool:async()=>pool,request:async tx=>{const r=tx?new sql.Request(tx):pool.request(),run=r.query.bind(r);r.query=text=>run(settings+text);return r;}};
 const query=async(text,inputs={})=>{const r=await db.request();for(const [k,v] of Object.entries(inputs))r.input(k,v);return r.query(text);};
 const scalar=async text=>(await query(text)).recordset[0].n;
 const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
 const script=file=>read('sql/migrations/v4_4/'+file).replace("DECLARE @BaseEsperada sysname=N'FractalesAcademy';",`DECLARE @BaseEsperada sysname=N'${database}';`).replace("'REEMPLAZAR_ADMIN'","'V44-ADMIN'").replace("N'REVISAR_ANTES_DE_EJECUTAR'","N'RETIRAR APODERADO V4.4'");
 const migrate=file=>pool.request().batch(script(file));
 assert.equal(await scalar('SELECT COUNT(*) n FROM sys.tables WHERE is_ms_shipped=0'),0,'Nunca se limpia una base preexistente.');
 await pool.request().batch(read('sql/migrations/v4_3/02_BASE_NUEVA_COMPLETA.sql').replace("DECLARE @BaseEsperada sysname=N'FractalesAcademy';",`DECLARE @BaseEsperada sysname=N'${database}';`));
 await pool.request().batch(read('sql/testing/DATOS_PRUEBA_V4.sql'));
 const password=crypto.randomBytes(18).toString('base64url'),hash=await bcrypt.hash(password,12);
 await query("INSERT dbo.Usuario(Cod_Usuario,Nomb_Usuario,Clave_Hash,ROL_Cod_Rol,Debe_Cambiar_Clave) VALUES('V44-ADMIN','v44-admin',@hash,'ADMIN',0); INSERT dbo.APODERADO VALUES('44999991','Tutora ficticia migrada','900999991','migrada@example.test'),('44999992','Contacto ficticio sin alumno',NULL,NULL); UPDATE dbo.ALUMNO SET DNI_Apoderado='44999991',Nomb_Apoderado='Tutora ficticia migrada',Cel_Apoderado='900999991',Correo_Apoderado='migrada@example.test' WHERE DNI_Alu='00000001';",{hash});
 await query("INSERT dbo.Horario(Cod_Horario,Dia_Semana,Hr_Inicio,Hr_Fin,Grupo_Cod_Grupo,TIPO_BLOQUE_Cod_Tipo,Docente_Asignatura_CURSOS_Cod_Curso,Docente_Asignatura_Docente_DNI_Doc) VALUES('V44-LEGADO',1,'07:00','08:00','V4-GR','CLASE','V4-MAT','00000003'); INSERT dbo.Examen(Cod_Examen,Nomb_Examen,puntaje_maximo) VALUES('V44-EX','Simulacro ficticio migrado',100); INSERT dbo.Examen_Grupo(Cod_examen_grupo,Examen_Cod_Examen,Grupo_Cod_Grupo,Fech_programada,Hr_inicio,Duracion_minutos,Estado,ESTADO_EXAMEN_GRUPO_Cod_Estado_Examen) VALUES('V44-EG','V44-EX','V4-GR','20270205','08:00',60,'PROGRAMADO','PROGRAMADO'); INSERT dbo.Nota_Examen(Cod_Nota,Puntaje_total,MATRICULA_Cod_Matricula,Examen_Grupo_Cod_examen_grupo,Grupo_Cod_Grupo) VALUES('V44-N-REAL',85,'V4-MAT-LEGADO','V44-EG','V4-GR');");
 await t.test('14: copia fisica local V4.3 mediante backup COPY_ONLY y restauracion en otra base NUEVA',async()=>{
  const source=database,target='FractalesAcademy_Pruebas_V4_4_'+new Date().toISOString().slice(0,10).replaceAll('-','')+'_'+crypto.randomBytes(5).toString('hex');
  const master=await connect('master');
  try{
   const paths=(await master.request().query("SELECT CONVERT(nvarchar(4000),SERVERPROPERTY('InstanceDefaultBackupPath')) b,CONVERT(nvarchar(4000),SERVERPROPERTY('InstanceDefaultDataPath')) d,CONVERT(nvarchar(4000),SERVERPROPERTY('InstanceDefaultLogPath')) l")).recordset[0];
   if(!paths.b||!paths.d||!paths.l||!/^FractalesAcademy_Pruebas_V4_4_\d{8}_[a-f0-9]{10}$/.test(source)||!/^FractalesAcademy_Pruebas_V4_4_\d{8}_[a-f0-9]{10}$/.test(target)||source===target)throw Error('Solo copiar bases ficticias de este ensayo local.');
   const backup=path.win32.join(paths.b,source+'_'+crypto.randomBytes(5).toString('hex')+'.bak');
   const q=master.request();q.input('backup',backup);await q.batch(`BACKUP DATABASE [${source}] TO DISK=@backup WITH COPY_ONLY,CHECKSUM; RESTORE VERIFYONLY FROM DISK=@backup WITH CHECKSUM;`);
   const files=(await master.request().input('backup',backup).query('RESTORE FILELISTONLY FROM DISK=@backup')).recordset;
   assert.equal(files.length,2);const quote=s=>"N'"+s.replaceAll("'","''")+"'";
   const moves=files.map(f=>'MOVE '+quote(f.LogicalName)+' TO '+quote(path.win32.join(f.Type==='L'?paths.l:paths.d,target+(f.Type==='L'?'.ldf':'.mdf')))).join(',');
   await master.request().input('backup',backup).batch(`IF DB_ID(N'${target}') IS NOT NULL THROW 54900,'La copia destino debe ser NUEVA; no se reemplaza ninguna base.',1; RESTORE DATABASE [${target}] FROM DISK=@backup WITH ${moves},CHECKSUM;`);
   await pool.close();database=target;pool=await connect(database);assert.equal(await scalar('SELECT COUNT(*) n FROM sys.tables WHERE is_ms_shipped=0'),36);assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.Nota_Examen WHERE Cod_Nota='V44-N-REAL'"),1);
   console.log('Copia restaurada local para migrar/preview:',target);console.log('Origen ficticio V4.3 conservado:',source);
  }finally{await master.close();}
 });
 const before=JSON.stringify((await query('SELECT * FROM dbo.Pago ORDER BY Cod_Pago')).recordset);
 const dbPath=require.resolve('../server/db');require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:db};
 process.env.JWT_SECRET=crypto.randomBytes(48).toString('hex');process.env.NODE_ENV='test';process.env.EMAIL_PROVIDER='local';process.env.ACCOUNT_SECURITY_V41='required';
 await t.test('14: diagnostico V4.3 con 36 tablas y preparacion aditiva reejecutable',async()=>{
  assert.equal(await scalar('SELECT COUNT(*) n FROM sys.tables WHERE is_ms_shipped=0'),36);await migrate('00_DIAGNOSTICO_PREVIO.sql');await migrate('01_PREPARAR_NUEVA_ESTRUCTURA.sql');await migrate('01_PREPARAR_NUEVA_ESTRUCTURA.sql');
  await assert.rejects(require('../server/schema-v44').ready(),/incompleta/);await migrate('02_MIGRAR_DATOS.sql');await migrate('02_MIGRAR_DATOS.sql');await migrate('03_VERIFICAR_MIGRACION.sql');
 });
 await t.test('14: DROP manual bloquea cambios desde la linea base y FK desconocidas',async()=>{
  const raw=read('sql/migrations/v4_4/04_ELIMINAR_ESTRUCTURA_ANTIGUA.sql').replace("DECLARE @BaseEsperada sysname=N'FractalesAcademy';",`DECLARE @BaseEsperada sysname=N'${database}';`);await assert.rejects(pool.request().batch(raw),/confirmar/);
  await query("UPDATE dbo.ALUMNO SET Nomb_Alu='Cambio posterior' WHERE DNI_Alu='00000001'");await assert.rejects(migrate('04_ELIMINAR_ESTRUCTURA_ANTIGUA.sql'),/Cambio o perdida/);assert.equal(await scalar("SELECT COUNT(*) n FROM sys.tables WHERE name='APODERADO'"),1);await query("UPDATE dbo.ALUMNO SET Nomb_Alu='Estudiante Ficticio Legado V4' WHERE DNI_Alu='00000001'");
  await query('CREATE TABLE dbo.V44_Dep_Ensayo(Dni varchar(8) REFERENCES dbo.APODERADO(DNI_Apoderado))');await assert.rejects(migrate('04_ELIMINAR_ESTRUCTURA_ANTIGUA.sql'),/desconocida/);await query('DROP TABLE dbo.V44_Dep_Ensayo');
  await pool.request().batch("CREATE PROCEDURE dbo.V44_Dinamico_Ensayo AS EXEC(N'SELECT * FROM dbo.APODERADO');");await assert.rejects(migrate('04_ELIMINAR_ESTRUCTURA_ANTIGUA.sql'),/adicional/);await query('DROP PROCEDURE dbo.V44_Dinamico_Ensayo');
 });
 await t.test('14: migracion conserva datos, respaldo de contactos sin alumnos y retira solo APODERADO',async()=>{
  await migrate('03_VERIFICAR_MIGRACION.sql');await migrate('04_ELIMINAR_ESTRUCTURA_ANTIGUA.sql');await migrate('04_ELIMINAR_ESTRUCTURA_ANTIGUA.sql');await migrate('05_VERIFICACION_FINAL.sql');
  assert.equal(await scalar('SELECT COUNT(*) n FROM sys.tables WHERE is_ms_shipped=0'),35);assert.equal(before,JSON.stringify((await query('SELECT * FROM dbo.Pago ORDER BY Cod_Pago')).recordset));assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.Auditoria_V4 WHERE Accion='MIGRAR_V44'"),2);
  assert.equal((await query("SELECT Nomb_Apoderado FROM dbo.ALUMNO WHERE DNI_Alu='00000001'")).recordset[0].Nomb_Apoderado,'Tutora ficticia migrada');assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.Nota_Examen WHERE Cod_Nota='V44-N-REAL'"),1);
 });
 const app=require('../server/index'),server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)));
 let cookie='',ip=1;const key=id=>Buffer.from(JSON.stringify([id])).toString('base64url'),endpoint=(table,id)=>'/records/'+table+'/'+key(id);
 async function http(route,method='GET',body,session=cookie){const r=await fetch(`http://127.0.0.1:${server.address().port}/api`+route,{method,headers:{'Content-Type':'application/json',Cookie:session,'X-Forwarded-For':`10.44.0.${ip++%240+1}`},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 const login=await http('/auth/login','POST',{usuario:'v44-admin',clave:password},'');assert.equal(login.status,200);cookie=login.cookie;
 const block=(dia=2,inicio='08:00',fin='09:30')=>({dia,inicio,fin,tipo:'CLASE',curso:'V4-MAT',docente:'00000003'});
 let scheduleNumber=0;
 const schedule=extra=>({nombre:'Horario ficticio V44 '+(++scheduleNumber),ciclo:'V4-REGULAR',modalidad:'REGULAR',turno:'MANANA',aula:'V4-AULA2',capacidad:10,estado:'PUBLICADO',bloques:[block(),block(6,'10:00','11:15')],...extra});
 let created;
 await t.test('1/2: guardar semana multibloque, sabado, curso repetido y duracion variable',async()=>{const r=await http('/academic/schedules','POST',schedule());assert.equal(r.status,201,JSON.stringify(r.body));created=r.body;assert.equal(r.body.bloques,2);assert.equal(await scalar(`SELECT COUNT(*) n FROM dbo.Horario WHERE Grupo_Cod_Grupo='${created.id}'`),2);});
 await t.test('3: rechazar unidad duplicada; borrador vacio permitido',async()=>{const duplicate=await http('/academic/schedules','POST',schedule({nombre:'Otro nombre accidental'}));assert.equal(duplicate.status,409,JSON.stringify(duplicate.body));const draft=await http('/academic/schedules','POST',schedule({estado:'BORRADOR',bloques:[]}));assert.equal(draft.status,201);assert.ok(!(await http('/academic/context')).body.grupos.some(g=>g.Cod_Grupo===draft.body.id));});
 await t.test('4: cruces docente entre ciclos de fechas coincidentes, aula, propio y turno',async()=>{
  await query("INSERT dbo.Ciclo(Cod_Ciclo,Programa_Cod_Programa,Nomb_Ciclo,Modalidad,Fech_Inicio,Fech_Fin,Nro_Mensualidades,Precio_Mensual,ESTADO_CICLO_Cod_Estado) VALUES('V44-OTRO','REFUERZO','Otro ciclo ficticio','REGULAR','20270201','20270530',4,250,'PROGRAMADO'); INSERT dbo.Docente(DNI_Doc,Nom_Doc,Cel_Doc) VALUES('44990002','Segunda docente ficticia','900123456');");
  const teacher=await http('/academic/schedules','POST',schedule({ciclo:'V44-OTRO',aula:'V4-AULA',bloques:[block()]}));assert.equal(teacher.status,409,JSON.stringify(teacher.body));
  const room=await http('/academic/schedules','POST',schedule({ciclo:'V44-OTRO',bloques:[{...block(),docente:'44990002'}]}));assert.equal(room.status,409);
  assert.equal((await http('/academic/schedules','POST',schedule({estado:'BORRADOR',bloques:[block(),block(2,'09:00','10:00')]}))).status,400);
  assert.equal((await http('/academic/schedules','POST',schedule({estado:'BORRADOR',bloques:[block(3,'06:00','07:00')]}))).status,400);
  const exception=await http('/academic/schedules','POST',schedule({estado:'BORRADOR',bloques:[{...block(3,'06:00','07:00'),excepcion:true,motivo:'Clase especial autorizada de ensayo'}]}));assert.equal(exception.status,201,JSON.stringify(exception.body));
 });
 await t.test('2/4: rollback total ante bloque invalido final y version concurrente',async()=>{
  const original=(await http('/academic/schedules/'+created.id)).body;
  const bad=await http('/academic/schedules/'+created.id,'PUT',schedule({version:created.version,bloques:[block(4),{...block(5),docente:'44999999'}]}));assert.equal(bad.status,400);assert.deepEqual((await http('/academic/schedules/'+created.id)).body,original);
  const concurrent=await Promise.all([http('/academic/schedules/'+created.id,'PUT',schedule({version:created.version})),http('/academic/schedules/'+created.id,'PUT',schedule({version:created.version}))]);assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);created.version++;
 });
 await t.test('3/4: dos administradores publican simultaneamente, sin duplicar unidad ni docente',async()=>{
  const deletion=async id=>{const r=await http(endpoint('Grupo',id),'DELETE',{confirmacion:'ELIMINAR',motivo:'Retirar horario ficticio del ensayo concurrente'});assert.equal(r.status,200,JSON.stringify(r.body));};
  let pair=await Promise.all([http('/academic/schedules','POST',schedule({ciclo:'V44-OTRO',bloques:[block(3,'10:00','11:00')]})),http('/academic/schedules','POST',schedule({ciclo:'V44-OTRO',bloques:[block(3,'10:00','11:00')]}))]);assert.deepEqual(pair.map(r=>r.status).sort(),[201,409]);await deletion(pair.find(r=>r.status===201).body.id);
  await query("INSERT dbo.Aula(Cod_Aula,Nomb_Aula,Capacidad) VALUES('V44-A3','Tercera aula ficticia',20),('V44-A4','Cuarta aula ficticia',20)");
  pair=await Promise.all(['V44-A3','V44-A4'].map(aula=>http('/academic/schedules','POST',schedule({ciclo:'V44-OTRO',aula,bloques:[{...block(3,'11:00','12:00'),docente:'44990002'}]}))));assert.deepEqual(pair.map(r=>r.status).sort(),[201,409]);await deletion(pair.find(r=>r.status===201).body.id);
 });
 const enrollment=(dni,extra={})=>({alumno:{DNI_Alu:dni,Nomb_Alu:'Estudiante ficticio '+dni,Cel_Alu:'900123456',CARRERA_Cod_Carrera:'V4-TEST'},Grupo_Cod_Grupo:created.id,esPrueba:true,...extra});
 const deactivate=async dni=>{const r=await http(endpoint('ALUMNO',dni)+'/state','POST',{accion:'desactivar',confirmacion:true,motivo:'Ensayo de desactivacion y conservacion'});assert.equal(r.status,200,JSON.stringify(r.body));};
 const review=async dni=>(await http(endpoint('ALUMNO',dni)+'/actions')).body;
 const remove=(dni,p)=>http(endpoint('ALUMNO',dni),'DELETE',{confirmacion:'ELIMINAR '+dni,revision:p.revision,motivo:'Eliminar datos ficticios revisados en ensayo'});
 let enrolled;
 await t.test('5/7/8: inscripcion sin apoderado en horario, cuatro mensualidades de 250 y cargo inicial50',async()=>{const r=await http('/inscripciones','POST',enrollment('44000001'));assert.equal(r.status,201,JSON.stringify(r.body));enrolled=r.body;assert.equal(r.body.cuotas,4);assert.equal(r.body.total,1050);assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.Pago WHERE ALUMNO_DNI_Alu='44000001' AND Monto=250"),4);assert.equal((await query("SELECT Nomb_Apoderado FROM dbo.ALUMNO WHERE DNI_Alu='44000001'")).recordset[0].Nomb_Apoderado,null);});
 await t.test('6: mismo DNI de apoderado con datos independientes para dos estudiantes',async()=>{for(const dni of ['44000002','44000003']){const body=enrollment(dni);Object.assign(body.alumno,{DNI_Apoderado:'44999991',Nomb_Apoderado:'Tutora '+dni,Cel_Apoderado:'900123456',PARENTESCO_Cod_Paren:'TUTOR'});const r=await http('/inscripciones','POST',body);assert.equal(r.status,201,JSON.stringify(r.body));}assert.equal(await scalar("SELECT COUNT(DISTINCT Nomb_Apoderado) n FROM dbo.ALUMNO WHERE DNI_Apoderado='44999991'"),3);});
 await t.test('8: Acelerado genera dos cuotas; cupo y borrador impiden inscripcion parcial',async()=>{const acc=await http('/academic/schedules','POST',schedule({nombre:'Acelerado ficticio',ciclo:'V4-ACELERADO',modalidad:'ACELERADO',turno:'TARDE',aula:'V4-AULA',capacidad:1,bloques:[block(2,'15:00','16:00')]}));assert.equal(acc.status,201,JSON.stringify(acc.body));const r=await http('/inscripciones','POST',enrollment('44000004',{Grupo_Cod_Grupo:acc.body.id}));assert.equal(r.status,201);assert.equal(r.body.total,550);assert.equal(r.body.cuotas,2);assert.equal((await http('/inscripciones','POST',enrollment('44000005',{Grupo_Cod_Grupo:acc.body.id}))).status,400);assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.ALUMNO WHERE DNI_Alu='44000005'"),0);assert.equal((await http('/inscripciones','POST',enrollment('44000005',{Grupo_Cod_Grupo:'V4-GR2'}))).status,400);});
 let studentCookie;
 await t.test('12: alumno solo lee su horario y ve cambios publicados inmediatamente',async()=>{
  await query("UPDATE dbo.Usuario SET Debe_Cambiar_Clave=0 WHERE ALUMNO_DNI_Alu='44000001'");const r=await http('/auth/login','POST',{usuario:'44000001',clave:enrolled.claveTemporal},'');assert.equal(r.status,200,JSON.stringify(r.body));studentCookie=r.cookie;
  const d=await http('/student/overview','GET',undefined,studentCookie);assert.equal(d.status,200);assert.equal(d.body.schedule.length,2);
  const exam=await http('/simulacros','POST',{Cod_Examen:'V44-PUB',Nomb_Examen:'Simulacro de publicacion ficticia',puntaje_maximo:100,Fech_programada:'20270206'.replace(/(\d{4})(\d{2})(\d{2})/,'$1-$2-$3'),Hr_inicio:'08:00',Duracion_minutos:60,grupos:[created.id]});assert.equal(exam.status,201,JSON.stringify(exam.body));
  assert.equal((await http('/simulacros/V44-PUB/resultados','POST',{DNI_Alu:'44000001',Puntaje_total:60})).status,200);assert.equal((await http('/student/overview','GET',undefined,studentCookie)).body.notes.length,0);
  assert.equal((await http('/simulacros/V44-PUB/publicacion','POST',{Publicado:true})).status,200);assert.equal((await http('/student/overview','GET',undefined,studentCookie)).body.notes[0].Puntaje_total,60);
  assert.equal((await http('/simulacros/V44-PUB/resultados','POST',{DNI_Alu:'44000001',Puntaje_total:70,Motivo_Cambio:'Correccion ficticia autorizada para ensayo'})).status,200);assert.equal((await http('/student/overview','GET',undefined,studentCookie)).body.notes[0].Puntaje_total,70);
  assert.equal((await http('/simulacros/V44-PUB/publicacion','POST',{Publicado:false})).status,200);assert.equal((await http('/student/overview','GET',undefined,studentCookie)).body.notes.length,0);
  const s=await http('/academic/schedules/'+created.id,'PUT',schedule({version:created.version,bloques:[block(2,'08:00','09:45'),block(6,'10:00','11:15')]}));assert.equal(s.status,200);created.version=s.body.version;
  assert.ok((await http('/student/overview','GET',undefined,studentCookie)).body.schedule.some(b=>b.Dia_Semana===2&&new Date(b.Hr_Fin).getUTCMinutes()===45));assert.equal((await http('/academic/schedules','POST',schedule(),studentCookie)).status,403);
 });
 await t.test('9: desactivar conserva cuotas y matriculas y revoca acceso',async()=>{await deactivate('44000001');assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.Pago WHERE ALUMNO_DNI_Alu='44000001'"),5);assert.equal((await http('/student/overview','GET',undefined,studentCookie)).status,401);});
 await t.test('10: eliminar ficticio con notas de prueba, deudas, confirmacion DNI y auditoria',async()=>{
  await query(`INSERT dbo.Examen_Grupo(Cod_examen_grupo,Examen_Cod_Examen,Grupo_Cod_Grupo,Fech_programada,Hr_inicio,Duracion_minutos,Estado,ESTADO_EXAMEN_GRUPO_Cod_Estado_Examen) VALUES('V44-EG-TEST','V44-EX',@g,'20270205','08:00',60,'PROGRAMADO','PROGRAMADO')`,{g:created.id});
  const result=await http('/simulacros/V44-EX/resultados','POST',{DNI_Alu:'44000001',Puntaje_total:75});assert.equal(result.status,200,JSON.stringify(result.body));const p=await review('44000001');assert.equal(p.acciones.find(a=>a.id==='eliminar').enabled,true,JSON.stringify(p));assert.equal(p.detalle.notas.length,2);
  assert.equal((await http(endpoint('ALUMNO','44000001'),'DELETE',{confirmacion:'ELIMINAR',revision:p.revision,motivo:'Ensayo sin confirmacion suficiente'})).status,400);const r=await remove('44000001',p);assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.Pago WHERE ALUMNO_DNI_Alu='44000001'"),0);assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.Nota_Examen WHERE Cod_Nota='"+result.body.codigo+"'"),0);assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.Auditoria_V4 WHERE Codigo='44000001' AND Accion='ELIMINAR_CONTROLADO'"),1);
 });
 await t.test('10/11: notas reales y cobros incluso revertidos siempre bloquean',async()=>{
  await deactivate('00000001');assert.equal((await review('00000001')).acciones.find(a=>a.id==='eliminar').enabled,false);
  const payment=(await query("SELECT TOP(1) Cod_Pago FROM dbo.Pago WHERE ALUMNO_DNI_Alu='44000002'")).recordset[0];assert.equal((await http('/pagos/'+payment.Cod_Pago+'/confirmar','POST',{medio:'EFECTIVO'})).status,200);await deactivate('44000002');assert.equal((await review('44000002')).acciones.find(a=>a.id==='eliminar').enabled,false);await http('/pagos/'+payment.Cod_Pago+'/anular','POST',{motivo:'Reversion ficticia de ensayo financiero'});assert.equal((await review('44000002')).acciones.find(a=>a.id==='eliminar').enabled,false);
  await assert.rejects(query("DELETE dbo.Nota_Examen WHERE Cod_Nota='V44-N-REAL'"),/personas reales/);await assert.rejects(query('DELETE dbo.Pago WHERE Cod_Pago=@id',{id:payment.Cod_Pago}),/cobro realizado/);
 });
 await t.test('10: falla de auditoria revierte eliminacion completa; dependencias desconocidas bloquean',async()=>{
  await deactivate('44000003');const p=await review('44000003');await pool.request().batch("CREATE OR ALTER TRIGGER dbo.TR_V44_TEST_Fallo ON dbo.Auditoria_V4 AFTER INSERT AS IF EXISTS(SELECT 1 FROM inserted WHERE Accion='ELIMINAR_CONTROLADO' AND Codigo='44000003') THROW 54999,'Fallo inyectado de ensayo',1;");assert.equal((await remove('44000003',p)).status,500);await query('DROP TRIGGER dbo.TR_V44_TEST_Fallo');assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.Pago WHERE ALUMNO_DNI_Alu='44000003'"),5);
  await query("CREATE TABLE dbo.V44_Dep_Alumno(Dni varchar(8) REFERENCES dbo.ALUMNO(DNI_Alu)); INSERT dbo.V44_Dep_Alumno VALUES('44000003')");assert.equal((await review('44000003')).acciones.find(a=>a.id==='eliminar').enabled,false);await query('DROP TABLE dbo.V44_Dep_Alumno');
 });
 await t.test('15: cursos/docentes sin uso y horarios con bloques sin matriculas se eliminan; propio admin protegido',async()=>{
  for(const [table,body] of [['CURSOS',{Cod_Curso:'V44-NO-USO',Nomb_Curso:'Curso ficticio sin uso'}],['Docente',{DNI_Doc:'44990003',Nom_Doc:'Docente sin asignaciones',Cel_Doc:'900123456'}]]){const r=await http('/records/'+table,'POST',body);assert.equal(r.status,201);const id=body.Cod_Curso||body.DNI_Doc;assert.equal((await http(endpoint(table,id),'DELETE',{confirmacion:'ELIMINAR',motivo:'Correccion de registro ficticio sin uso'})).status,200);}
  const draft=await http('/academic/schedules','POST',schedule({estado:'BORRADOR'}));assert.equal(draft.status,201);assert.equal((await http(endpoint('Grupo',draft.body.id),'DELETE',{confirmacion:'ELIMINAR',motivo:'Borrador de ensayo no utilizado'})).status,200);
  assert.equal((await http(endpoint('Usuario','V44-ADMIN'),'DELETE',{confirmacion:'ELIMINAR',motivo:'Ensayo de cuenta propia'})).status,409);
 });
 await t.test('15: restaurar horario revalida cruces; alumno real no puede convertirse en prueba',async()=>{
  await assert.rejects(query("UPDATE dbo.ALUMNO SET Es_Prueba=1 WHERE DNI_Alu='00000001'"),/solo se establece/);
  const state=accion=>http(endpoint('Grupo',created.id)+'/state','POST',{accion,confirmacion:true,motivo:'Ensayo de reactivacion con conflictos'});
  assert.equal((await state('desactivar')).status,200);const other=await http('/academic/schedules','POST',schedule({ciclo:'V44-OTRO',bloques:[{...block(2,'08:00','09:00'),docente:'44990002'}]}));assert.equal(other.status,201,JSON.stringify(other.body));assert.equal((await state('restaurar')).status,400);
  assert.equal((await http(endpoint('Grupo',other.body.id),'DELETE',{confirmacion:'ELIMINAR',motivo:'Retirar horario que causa conflicto de ensayo'})).status,200);assert.equal((await state('restaurar')).status,200);
 });
 await t.test('15: verificar correo y recuperar administrador despues de retirar entidad antigua',async()=>{
  const accounts=require('../server/account-service');const requested=await http('/admin/maintenance/account-email/request','POST',{email:'admin-v44@example.test',actual:password});assert.equal(requested.status,200,JSON.stringify(requested.body));await accounts.flush();const verification=accounts.notifications.inbox.at(-1);assert.equal(verification.to,'admin-v44@example.test');assert.equal((await http('/admin/maintenance/account-email/confirm','POST',{codigo:verification.code})).status,200);
  assert.equal((await http('/auth/recovery/request','POST',{email:verification.to},'')).status,202);await accounts.flush();const code=accounts.notifications.inbox.at(-1).code,next=crypto.randomBytes(18).toString('base64url');const recovered=await http('/auth/recovery/complete','POST',{email:verification.to,codigo:code,nueva:next,confirmacion:next},'');assert.equal(recovered.status,200,JSON.stringify(recovered.body));const again=await http('/auth/login','POST',{usuario:'v44-admin',clave:next},'');assert.equal(again.status,200);cookie=again.cookie;
 });
 await t.test('15: permisos limitados complementarios e integridad de protecciones SQL',async()=>{
  await query('CREATE USER [V44-APP-TEST] WITHOUT LOGIN');await pool.request().batch(script('07_PERMISOS_OPCIONALES.sql').replace("N'REEMPLAZAR_POR_USUARIO_SQL_EXISTENTE'","N'V44-APP-TEST'"));
  const grants=(await query("EXECUTE AS USER='V44-APP-TEST'; SELECT HAS_PERMS_BY_NAME('dbo.Horario','OBJECT','DELETE') Bloque,HAS_PERMS_BY_NAME('dbo.Nota_Examen','OBJECT','DELETE') Nota,HAS_PERMS_BY_NAME('dbo.Auditoria_V4','OBJECT','DELETE') Auditoria,HAS_PERMS_BY_NAME(DB_NAME(),'DATABASE','VIEW DEFINITION') Metadata; REVERT;")).recordset[0];assert.equal(grants.Bloque,1);assert.equal(grants.Nota,1);assert.equal(grants.Metadata,1);assert.notEqual(grants.Auditoria,1);
  const locked=(await query("BEGIN TRAN; EXECUTE AS USER='V44-APP-TEST'; DECLARE @r int; EXEC @r=sys.sp_getapplock @Resource='Fractales/Horarios/V44',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=1000; SELECT @r n; REVERT; ROLLBACK;")).recordset[0].n;assert.ok(locked>=0);
 });
 await t.test('13/15: sin consultas a entidad retirada, modulos, portal, recovery y restricciones completos',async()=>{
  assert.equal((await http('/admin/maintenance/guardians')).status,404);for(const f of fs.readdirSync(path.join(__dirname,'../server')).filter(f=>f.endsWith('.js'))){const s=read('server/'+f);assert.doesNotMatch(s,/(?:FROM|JOIN|INSERT\s+(?:INTO\s+)?|UPDATE|DELETE\s+(?:FROM\s+)?)\s+(?:dbo\.)?\[?APODERADO\b/i,f);}
  const meta=await http('/meta');assert.equal(meta.status,200);for(const m of meta.body.modules){const r=await http('/records/'+m.name);assert.equal(r.status,200,m.name+JSON.stringify(r.body));}
  assert.equal((await http('/dashboard')).status,200);assert.equal((await http('/admin/maintenance/account-email')).status,200);assert.equal((await http('/admin/maintenance/test-data')).status,200);assert.equal((await http('/admin/maintenance/reports')).status,200);assert.equal((await http('/auth/recovery/request','POST',{email:'nadie@example.test'},'')).status,202);
  assert.equal(await scalar('SELECT COUNT(*) n FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1'),0);await migrate('05_VERIFICACION_FINAL.sql');
 });
});
