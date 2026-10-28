'use strict';
// Opt-in. Usa autenticación integrada de Windows contra localhost y una base VACÍA de pruebas.
// No lee .env, no crea bases, no borra datos y nunca admite un servidor remoto.
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const database=process.env.V4_SQL_TEST_DATABASE;
test('V4: migraciones y API con SQL Server local real',async t=>{
  if(!/^FractalesAcademy_Pruebas_V4[A-Za-z0-9_]*$/.test(database))throw Error('Nombre de base de pruebas no permitido.');
  const sql=require('mssql/msnodesqlv8');
  const pool=await new sql.ConnectionPool({connectionString:`Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=${database};Trusted_Connection=Yes;Encrypt=No;TrustServerCertificate=Yes;`,pool:{max:8,min:0,idleTimeoutMillis:1000},requestTimeout:30000}).connect();
  t.after(()=>pool.close());
  const settings='SET NOCOUNT ON; SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON; SET ANSI_WARNINGS ON; SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF; ';
  const db={sql,pool:async()=>pool,request:async tx=>{
    const r=tx?new sql.Request(tx):pool.request();const run=r.query.bind(r);r.query=text=>run(settings+text);return r;
  }};
  async function query(text,inputs={}){const r=await db.request();for(const [k,v] of Object.entries(inputs))r.input(k,v);return r.query(text);}
  const scalar=async text=>(await query(text)).recordset[0].n;
  const root=path.join(__dirname,'..');
  const load=p=>fs.readFileSync(path.join(root,p),'utf8');
  const files=fs.readdirSync(path.join(root,'sql/migrations/v4')).filter(n=>/^0[0-6]/.test(n)&&!n.startsWith('00_DIAGNOSTICO')).sort();
  const migrate=filename=>pool.request().batch(load('sql/migrations/v4/'+filename).replace("DECLARE @BaseEsperada sysname=N'FractalesAcademy';",`DECLARE @BaseEsperada sysname=N'${database}';`));
  await t.test('prepara esquema original vacío y datos ficticios, sin reconstruir bases',async()=>{
    assert.equal(await scalar('SELECT COUNT(*) n FROM sys.tables WHERE is_ms_shipped=0'),0,'Usa una base nueva y vacía para cada ejecución.');
    await pool.request().batch(load('sql/testing/CREAR_ESTRUCTURA_PRUEBAS.sql'));
    await pool.request().batch(load('sql/testing/DATOS_PRUEBA_V4.sql'));
    assert.equal(await scalar('SELECT COUNT(*) n FROM sys.tables WHERE is_ms_shipped=0'),25);
    assert.equal(await scalar('SELECT COUNT(*) n FROM dbo.ALUMNO'),1);
  });
  await t.test('diagnóstico ejecutable y guarda de base incorrecta',async()=>{
    await pool.request().batch(load('sql/migrations/v4/00_DIAGNOSTICO_PREVIO.sql'));
    await assert.rejects(pool.request().batch(load('sql/migrations/v4/00A_PREPARACION_Y_LINEA_BASE.sql')));
    assert.equal(await scalar("SELECT COUNT(*) n FROM sys.tables WHERE name='Control_Migracion_V4'"),0);
  });
  await t.test('celular legado incompatible detiene la migración sin truncarlo',async()=>{
    await migrate(files[0]);
    await query("UPDATE dbo.ALUMNO SET Cel_Alu='9000000001' WHERE DNI_Alu='00000001'");
    await assert.rejects(migrate('01_ACTUALIZACION_CELULARES.sql'));
    assert.equal(await scalar("SELECT COL_LENGTH('dbo.ALUMNO','Cel_Alu') n"),15);
    assert.equal((await query("SELECT Cel_Alu FROM dbo.ALUMNO WHERE DNI_Alu='00000001'")).recordset[0].Cel_Alu,'9000000001');
    await query("UPDATE dbo.ALUMNO SET Cel_Alu='900000001' WHERE DNI_Alu='00000001'");
  });
  await t.test('las siete migraciones se aplican y se reejecutan conservando los registros originales',async()=>{
    for(const filename of files)await migrate(filename);
    for(const filename of files)await migrate(filename);
    const result=await pool.request().batch(load('sql/migrations/v4/99_VERIFICACION_FINAL.sql'));
    const checks=result.recordsets.flat().filter(r=>Object.hasOwn(r,'FilasFaltantes'));
    assert.ok(checks.length>=10);for(const row of checks){assert.equal(row.FilasFaltantes,0);assert.equal(row.FilasModificadas,0);}
    assert.equal(await scalar('SELECT COUNT(*) n FROM dbo.Control_Migracion_V4'),7);
    assert.equal(await scalar('SELECT COUNT(*) n FROM sys.tables WHERE is_ms_shipped=0'),29);
    assert.equal(await scalar('SELECT COUNT(*) n FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1'),0);
  });
  const dbPath=require.resolve('../server/db');require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:db};
  const operations=require('../server/operations');const bcrypt=require('bcryptjs');
  const password=crypto.randomBytes(24).toString('base64url');process.env.JWT_SECRET=crypto.randomBytes(48).toString('hex');
  const actor={Cod_Usuario:'V4-ADMIN-PRUEBA'};
  await query("INSERT dbo.Usuario(Cod_Usuario,Nomb_Usuario,Clave_Hash,ROL_Cod_Rol,Debe_Cambiar_Clave) VALUES (@code,'v4-prueba-admin',@hash,'ADMIN',0)",{code:actor.Cod_Usuario,hash:await bcrypt.hash(password,12)});
  const app=require('../server/index');const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base=`http://127.0.0.1:${server.address().port}`;let adminCookie='';
  async function http(route,method='GET',body,cookie=adminCookie){
    const response=await fetch(base+'/api'+route,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
    return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
  }
  const studentData=dni=>({DNI_Alu:dni,Nomb_Alu:'Alumno Ficticio de Integración '+dni,Cel_Alu:'900001234',Cel_Apoderado:null,Nomb_Apoderado:'Tutor Ficticio',PARENTESCO_Cod_Paren:'TUTOR',CARRERA_Cod_Carrera:'V4-TEST'});
  let regular,accelerated,studentCookie='';
  await t.test('autenticación administrativa real',async()=>{const r=await http('/auth/login','POST',{usuario:'v4-prueba-admin',clave:password},'');assert.equal(r.status,200);adminCookie=r.cookie;});
  await t.test('alumno nuevo: usuario DNI, hash bcrypt, cambio obligatorio, matrícula y cuatro cuotas Regular',async()=>{
    const r=await http('/inscripciones','POST',{alumno:studentData('80000001'),Grupo_Cod_Grupo:'V4-GR'});assert.equal(r.status,201,JSON.stringify(r.body));regular=r.body;
    assert.equal(r.body.cuotas,4);assert.equal(r.body.total,1050);assert.notEqual(r.body.claveTemporal,'80000001');assert.ok(r.body.claveTemporal.length>=24);
    const u=(await query("SELECT * FROM dbo.Usuario WHERE ALUMNO_DNI_Alu='80000001'")).recordset[0];assert.equal(u.Nomb_Usuario,'80000001');assert.equal(u.Debe_Cambiar_Clave,true);assert.ok(await bcrypt.compare(r.body.claveTemporal,u.Clave_Hash));assert.notEqual(u.Clave_Hash,r.body.claveTemporal);
    assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.MATRICULA WHERE ALUMNO_DNI_Alu='80000001'"),1);
    const payments=(await query("SELECT * FROM dbo.Pago WHERE ALUMNO_DNI_Alu='80000001' ORDER BY Nro_Mensualidad")).recordset;assert.equal(payments.length,5);assert.equal(payments.filter(p=>p.Monto===250).length,4);assert.equal(payments.filter(p=>p.Monto===50).length,1);
    assert.equal(payments.find(p=>p.Nro_Mensualidad===2).Fech_Vencimiento.toISOString().slice(0,10),'2027-02-28');
  });
  await t.test('ciclo Acelerado genera dos cuotas de S/ 250 y un único cargo de S/ 50',async()=>{
    const r=await http('/inscripciones','POST',{alumno:studentData('80000002'),Grupo_Cod_Grupo:'V4-GA'});assert.equal(r.status,201,JSON.stringify(r.body));accelerated=r.body;assert.equal(r.body.cuotas,2);assert.equal(r.body.total,550);
    assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.Pago WHERE ALUMNO_DNI_Alu='80000002' AND CONCEPTO_PAGO_Cod_Concepto='MENSUALIDAD'"),2);
  });
  await t.test('reinscripción reutiliza alumno y cuenta; no duplica inscripción inicial',async()=>{
    const r=await http('/inscripciones','POST',{alumno:{DNI_Alu:'80000001'},Grupo_Cod_Grupo:'V4-GA'});assert.equal(r.status,201,JSON.stringify(r.body));assert.equal(r.body.claveTemporal,null);assert.equal(r.body.total,500);
    assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.ALUMNO WHERE DNI_Alu='80000001'"),1);assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.Usuario WHERE ALUMNO_DNI_Alu='80000001'"),1);
    assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.Pago WHERE ALUMNO_DNI_Alu='80000001' AND CONCEPTO_PAGO_Cod_Concepto IN ('MATRICULA_INICIAL','MATERIALES')"),1);
  });
  await t.test('DNI existente no se duplica y rechaza otra matrícula del mismo ciclo',async()=>{
    const r=await http('/inscripciones','POST',{alumno:studentData('80000001'),Grupo_Cod_Grupo:'V4-GR2'});assert.equal(r.status,400);assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.MATRICULA WHERE ALUMNO_DNI_Alu='80000001'"),2);
  });
  await t.test('dos inscripciones simultáneas del mismo DNI crean un solo conjunto de registros',async()=>{
    const body={alumno:studentData('80000005'),Grupo_Cod_Grupo:'V4-GR'};
    const result=await Promise.all([http('/inscripciones','POST',body),http('/inscripciones','POST',body)]);
    assert.equal(result.filter(r=>r.status===201).length,1);assert.equal(result.filter(r=>r.status===400||r.status===409).length,1);
    assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.ALUMNO WHERE DNI_Alu='80000005'"),1);assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.Usuario WHERE ALUMNO_DNI_Alu='80000005'"),1);
    assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.MATRICULA WHERE ALUMNO_DNI_Alu='80000005'"),1);assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.Pago WHERE ALUMNO_DNI_Alu='80000005'"),5);
  });
  await t.test('fallo en la segunda cuota revierte alumno, usuario, matrícula y primera cuota',async()=>{
    let inserts=0;const broken=operations.createOperations({...db,request:async tx=>{const r=await db.request(tx);const run=r.query.bind(r);r.query=text=>{if(text.includes('INSERT dbo.Pago')&&++inserts===2)throw Error('Fallo de prueba después de primera cuota');return run(text);};return r;}});
    await assert.rejects(broken.enroll({alumno:studentData('80000003'),Grupo_Cod_Grupo:'V4-GR'},actor),/Fallo de prueba/);
    for(const [table,column] of [['ALUMNO','DNI_Alu'],['Usuario','ALUMNO_DNI_Alu'],['MATRICULA','ALUMNO_DNI_Alu'],['Pago','ALUMNO_DNI_Alu']])assert.equal(await scalar(`SELECT COUNT(*) n FROM dbo.${table} WHERE ${column}='80000003'`),0);
  });
  await t.test('celulares inválidos rechazados por API y CHECK SQL',async()=>{
    for(const value of ['90000000','9000000011','9000A0001','90000000 ']){const r=await http('/inscripciones','POST',{alumno:{...studentData('80000004'),Cel_Alu:value},Grupo_Cod_Grupo:'V4-GR'});assert.equal(r.status,400);}
    await assert.rejects(query("UPDATE dbo.ALUMNO SET Cel_Alu='90000000 ' WHERE DNI_Alu='00000001'"));
    await query("UPDATE dbo.ALUMNO SET Cel_Apoderado=NULL WHERE DNI_Alu='80000001'");
  });
  await t.test('códigos administrativos obligatorios y prevención de duplicados',async()=>{
    for(const body of [{Nomb_Curso:'Ficticio sin código'},{Cod_Curso:'',Nomb_Curso:'Ficticio vacío'},{Cod_Curso:'COD MUY LARGO',Nomb_Curso:'Ficticio inválido'}])assert.equal((await http('/records/CURSOS','POST',body)).status,400);
    assert.equal((await http('/records/CURSOS','POST',{Cod_Curso:'V4-API',Nomb_Curso:'Curso Ficticio API'})).status,201);
    assert.equal((await http('/records/CURSOS','POST',{Cod_Curso:'V4-API',Nomb_Curso:'Curso Ficticio duplicado'})).status,400);
    assert.equal((await http('/records/Docente','POST',{DNI_Doc:'00000004',Nom_Doc:'Docente Ficticio API',Cel_Doc:'900000004'})).status,201);
    assert.equal((await http('/records/Docente_Asignatura','POST',{CURSOS_Cod_Curso:'V4-API',Docente_DNI_Doc:'00000004'})).status,201);
  });
  let paidCode;
  await t.test('pago concurrente: una confirmación, fecha, administrador y auditoría',async()=>{
    const rows=(await http('/pagos/alumno/80000001')).body.rows;paidCode=rows.find(p=>p.Nro_Mensualidad===1).Cod_Pago;
    const result=await Promise.all([http(`/pagos/${paidCode}/confirmar`,'POST',{medio:'YAPE'}),http(`/pagos/${paidCode}/confirmar`,'POST',{medio:'EFECTIVO'})]);assert.equal(result.filter(r=>r.status===200).length,1);assert.equal(result.filter(r=>r.status===409).length,1);
    const row=(await query('SELECT * FROM dbo.Pago WHERE Cod_Pago=@code',{code:paidCode})).recordset[0];assert.equal(row.ESTADO_PAGO_Cod_Estado,'PAGADO');assert.equal(row.Usuario_Cod_Usuario,actor.Cod_Usuario);assert.ok(row.Fech_Pago);
    const history=(await http(`/auditoria/Pago/${paidCode}`)).body.rows;assert.equal(history.length,1);assert.equal(JSON.parse(history[0].Anterior).ESTADO_PAGO_Cod_Estado,'PENDIENTE');
  });
  await t.test('precio del ciclo cambia sin reescribir la cuota existente; anulación auditable',async()=>{
    await query("UPDATE dbo.Ciclo SET Precio_Mensual=275 WHERE Cod_Ciclo='V4-REGULAR'");
    assert.equal((await http(`/pagos/${paidCode}/anular`,'POST',{motivo:'Corrección ficticia del medio recibido'})).status,200);
    assert.equal((await http('/pagos/medios','POST',{codigo:'OTRO',nombre:'Otro medio ficticio',activo:true})).status,200);
    assert.equal((await http(`/pagos/${paidCode}/confirmar`,'POST',{medio:'OTRO'})).status,200);
    const r=(await query('SELECT Monto FROM dbo.Pago WHERE Cod_Pago=@code',{code:paidCode})).recordset[0];assert.equal(r.Monto,250);
    assert.equal((await http(`/auditoria/Pago/${paidCode}`)).body.rows.length,3);
    await assert.rejects(query('UPDATE dbo.Pago SET Monto=300 WHERE Cod_Pago=@code',{code:paidCode}));
    await assert.rejects(query("UPDATE dbo.Auditoria_V4 SET Motivo='borrado' WHERE Entidad='Pago'"));
  });
  await t.test('primer acceso obliga a cambiar contraseña y bloquea reutilizar la temporal',async()=>{
    const login=await http('/auth/login','POST',{usuario:'80000001',clave:regular.claveTemporal},'');assert.equal(login.status,200);studentCookie=login.cookie;
    assert.equal((await http('/student/overview','GET',undefined,studentCookie)).status,403);
    assert.equal((await http('/auth/change-password','POST',{actual:regular.claveTemporal,nueva:regular.claveTemporal},studentCookie)).status,400);
    const changed=await http('/auth/change-password','POST',{actual:regular.claveTemporal,nueva:crypto.randomBytes(18).toString('base64url')},studentCookie);assert.equal(changed.status,200);studentCookie=changed.cookie;
  });
  await t.test('simulacro general, un puntaje por DNI y validación de grupo y máximo',async()=>{
    assert.equal((await http('/simulacros','POST',{Cod_Examen:'V4-SIM',Nomb_Examen:'Simulacro Ficticio V4',puntaje_maximo:100,Fech_programada:'2027-02-15',Hr_inicio:'09:00',Duracion_minutos:120,grupos:['V4-GR']})).status,201);
    const lookup=await http('/simulacros/V4-SIM/alumno/80000001');assert.equal(lookup.status,200);assert.equal(lookup.body.alumno.DNI_Alu,'80000001');assert.equal(lookup.body.alumno.puntaje_maximo,100);
    assert.equal((await http('/simulacros/V4-SIM/alumno/80000002')).status,400);
    for(const score of [-1,101])assert.equal((await http('/simulacros/V4-SIM/resultados','POST',{DNI_Alu:'80000001',Puntaje_total:score})).status,400);
    assert.equal((await http('/simulacros/V4-SIM/resultados','POST',{DNI_Alu:'80000002',Puntaje_total:70})).status,400);
    assert.equal((await http('/simulacros/V4-SIM/resultados','POST',{DNI_Alu:'80000001',Puntaje_total:80.5})).status,200);
    assert.equal((await http('/simulacros/V4-SIM/resultados','POST',{DNI_Alu:'80000001',Puntaje_total:81})).status,400);
    const correction=await http('/simulacros/V4-SIM/resultados','POST',{DNI_Alu:'80000001',Puntaje_total:81,Motivo_Cambio:'Corrección ficticia autorizada'});assert.equal(correction.status,200);assert.equal((await http('/auditoria/Nota_Examen/'+correction.body.codigo)).body.rows.length,2);
    assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.Nota_Examen WHERE MATRICULA_Cod_Matricula='"+regular.matricula+"'"),1);
  });
  await t.test('alumno consulta solamente sus resultados publicados',async()=>{
    assert.equal((await http('/student/overview','GET',undefined,studentCookie)).body.notes.length,0);
    assert.equal((await http('/simulacros/V4-SIM/publicacion','POST',{Publicado:true})).status,200);
    const overview=(await http('/student/overview?dni=80000002','GET',undefined,studentCookie)).body;assert.equal(overview.profile.DNI_Alu,'80000001');assert.equal(overview.notes.length,1);assert.equal(overview.notes[0].Puntaje_total,81);
    assert.equal((await http('/pagos/alumno/80000002','GET',undefined,studentCookie)).status,403);assert.equal((await http('/records/ALUMNO','GET',undefined,studentCookie)).status,403);
  });
  const block=(code,group='V4-GR',start='07:00',end='08:00')=>({Cod_Horario:code,Dia_Semana:1,Hr_Inicio:start,Hr_Fin:end,Grupo_Cod_Grupo:group,TIPO_BLOQUE_Cod_Tipo:'CLASE',Docente_Asignatura_CURSOS_Cod_Curso:'V4-MAT',Docente_Asignatura_Docente_DNI_Doc:'00000003'});
  await t.test('horarios: asignación docente/curso, cruces de grupo, docente y aula',async()=>{
    assert.equal((await http('/records/Horario','POST',block('V4-H1'))).status,201);
    assert.equal((await http('/records/Horario','POST',block('V4-H2','V4-GR','07:30','08:30'))).status,400);
    assert.equal((await http('/records/Horario','POST',block('V4-H3','V4-GR2','07:30','08:30'))).status,400);
    assert.equal((await http('/records/Grupo','POST',{Cod_Grupo:'V4-GR3',Nomb_Grupo:'Regular ficticio C',Cupo_Max:100,Turno_Cod_Turno:'MANANA',Aula_Cod_Aula:'V4-AULA',Ciclo_Cod_Ciclo:'V4-REGULAR'})).status,201);
    assert.equal((await http('/records/Horario','POST',{...block('V4-H4','V4-GR3','07:30','08:30'),Docente_Asignatura_CURSOS_Cod_Curso:'V4-API',Docente_Asignatura_Docente_DNI_Doc:'00000004'})).status,400);
    // V4.3 permite seleccionar cualquier curso/docente activo y crea la asignación de forma atómica.
    assert.equal((await http('/records/Horario','POST',{...block('V4-H5','V4-GR2','09:00','10:00'),Docente_Asignatura_CURSOS_Cod_Curso:'V4-API',Docente_Asignatura_Docente_DNI_Doc:'00000003'})).status,201);
    assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.Docente_Asignatura WHERE CURSOS_Cod_Curso='V4-API' AND Docente_DNI_Doc='00000003'"),1);
  });
  await t.test('turnos mañana/tarde, recreos y consulta del horario semanal',async()=>{
    assert.equal((await http('/records/Horario','POST',block('V4-H6','V4-GR','12:30','13:30'))).status,400);
    assert.equal((await http('/records/Horario','POST',block('V4-H7','V4-GA','14:00','15:00'))).status,400);
    assert.equal((await http('/records/Horario','POST',block('V4-H8','V4-GA','15:00','16:00'))).status,201);
    assert.equal((await http('/records/Horario','POST',{Cod_Horario:'V4-RECREO',Dia_Semana:1,Hr_Inicio:'08:00',Hr_Fin:'08:15',Grupo_Cod_Grupo:'V4-GR',TIPO_BLOQUE_Cod_Tipo:'RECREO',Docente_Asignatura_CURSOS_Cod_Curso:null,Docente_Asignatura_Docente_DNI_Doc:null})).status,201);
    const overview=(await http('/student/overview','GET',undefined,studentCookie)).body;assert.ok(overview.schedule.some(h=>h.TIPO_BLOQUE_Cod_Tipo==='RECREO'));assert.ok(overview.schedule.every(h=>h.Nomb_Aula&&h.Nomb_Turno));assert.ok(overview.groups.every(g=>g.Fech_Inicio&&g.Fech_Fin));
  });
  await t.test('compatibilidad legado, sin cobro inicial retroactivo y sin eliminar historial',async()=>{
    const r=await http('/inscripciones','POST',{alumno:{DNI_Alu:'00000001'},Grupo_Cod_Grupo:'V4-GA'});assert.equal(r.status,201);assert.equal(r.body.total,500);
    assert.equal(await scalar("SELECT COUNT(*) n FROM dbo.Pago WHERE ALUMNO_DNI_Alu='00000001' AND CONCEPTO_PAGO_Cod_Concepto='MATRICULA_INICIAL'"),1);
    const id=Buffer.from(JSON.stringify(['00000001'])).toString('base64url');assert.equal((await http('/records/ALUMNO/'+id,'DELETE',{})).status,400);
  });
});
