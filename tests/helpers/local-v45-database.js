'use strict';
// Fixtures de migracion: los nombres V4.3/V4.4 son intencionados SOLO en este origen.
const sql=require('mssql/msnodesqlv8'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const connection=name=>new sql.ConnectionPool({connectionString:`Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=${name};Trusted_Connection=Yes;Encrypt=No;TrustServerCertificate=Yes;`,pool:{max:8,min:0,idleTimeoutMillis:1000},requestTimeout:60000}).connect();
const settings='SET NOCOUNT ON; SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON; SET ANSI_WARNINGS ON; SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF; ';
async function freshCopy(){
 const prefix='FractalesAcademy_Pruebas_V4_5_'+new Date().toISOString().slice(0,10).replaceAll('-','')+'_'+crypto.randomBytes(5).toString('hex'),source=prefix+'_Origen',target=prefix;
 const master=await connection('master');let sourcePool;
 try{
  await master.request().batch(`IF DB_ID(N'${source}') IS NOT NULL OR DB_ID(N'${target}') IS NOT NULL THROW 54900,'No se reutilizan bases existentes.',1; CREATE DATABASE [${source}];`);
  sourcePool=await connection(source);const load=p=>fs.readFileSync(path.join(root,p),'utf8').replace("DECLARE @BaseEsperada sysname=N'FractalesAcademy';",`DECLARE @BaseEsperada sysname=N'${source}';`);
  await sourcePool.request().batch(load('sql/migrations/v4_3/02_BASE_NUEVA_COMPLETA.sql'));await sourcePool.request().batch(load('sql/testing/DATOS_PRUEBA_V4.sql'));
  const password=crypto.randomBytes(18).toString('base64url'),hash=await require('bcryptjs').hash(password,12);
  await sourcePool.request().input('hash',hash).query(settings+"INSERT dbo.Usuario(Cod_Usuario,Nomb_Usuario,Clave_Hash,ROL_Cod_Rol,Debe_Cambiar_Clave) VALUES('V45-ADMIN','v45-admin',@hash,'ADMIN',0);");
  for(const file of ['01_PREPARAR_NUEVA_ESTRUCTURA.sql','02_MIGRAR_DATOS.sql','04_ELIMINAR_ESTRUCTURA_ANTIGUA.sql'])await sourcePool.request().batch(load('sql/migrations/v4_4/'+file).replace(/DECLARE @AdministradorMigracion varchar\(20\)='[^']*';/,"DECLARE @AdministradorMigracion varchar(20)='V45-ADMIN';").replace("N'REVISAR_ANTES_DE_EJECUTAR'","N'RETIRAR APODERADO V4.4'"));
  await sourcePool.request().input('hash',hash).query(settings+`INSERT dbo.ALUMNO(DNI_Alu,Nomb_Alu,CARRERA_Cod_Carrera) VALUES('99999999','Alumno heredado ficticio','V4-TEST'); INSERT dbo.Usuario(Cod_Usuario,Nomb_Usuario,Clave_Hash,ROL_Cod_Rol,ALUMNO_DNI_Alu,Activo,Debe_Cambiar_Clave) VALUES('V45-LEGACY','99999999',@hash,'ALUMNO','99999999',0,0); INSERT dbo.Alumno_Estado_V41(ALUMNO_DNI_Alu,Activo,Usuario_Activo_Anterior,Motivo,Usuario_Cod_Usuario) VALUES('99999999',0,1,'Fixture de regresion legado','V45-ADMIN'); INSERT dbo.Auditoria_V4(Entidad,Codigo,Accion,Usuario_Cod_Usuario,Motivo) VALUES('Contacto','99999999','CONTACTO_SOLICITADO','V45-LEGACY','Evento de prueba heredado'),('Usuario','V45-LEGACY','RECUPERACION_SOLICITADA','V45-LEGACY','Evento de prueba heredado'),('Usuario','V45-LEGACY','CLAVE_CAMBIADA','V45-LEGACY','Evento de prueba heredado');`);
  await sourcePool.request().query(settings+`INSERT dbo.Auditoria_V4(Entidad,Codigo,Accion,Anterior,Nuevo,Usuario_Cod_Usuario,Motivo) VALUES('ALUMNO','00000001','EDITAR',N'{"Cel_Alu":"900000001","Nomb_Alu":"Nombre conservado","anidado":{"Activo":true,"Cod_Curso":"V4-MAT"},"lista":[{"Hr_Fin":"08:00"}]}',N'{"Cel_Alu":"900000002","Nomb_Alu":"Nombre nuevo"}','V45-ADMIN','Prueba de normalizacion JSON sin cambio de valores');`);
  const paths=(await master.request().query("SELECT CONVERT(nvarchar(4000),SERVERPROPERTY('InstanceDefaultBackupPath')) b,CONVERT(nvarchar(4000),SERVERPROPERTY('InstanceDefaultDataPath')) d,CONVERT(nvarchar(4000),SERVERPROPERTY('InstanceDefaultLogPath')) l")).recordset[0],backup=path.win32.join(paths.b,source+'.bak');
  await master.request().input('backup',backup).batch(`BACKUP DATABASE [${source}] TO DISK=@backup WITH COPY_ONLY,CHECKSUM; RESTORE VERIFYONLY FROM DISK=@backup WITH CHECKSUM;`);
  const files=(await master.request().input('backup',backup).query('RESTORE FILELISTONLY FROM DISK=@backup')).recordset;if(files.length!==2)throw Error('Revisar archivos de la copia ficticia.');
  const lit=s=>"N'"+s.replaceAll("'","''")+"'";
  const moves=files.map(f=>'MOVE '+lit(f.LogicalName)+' TO '+lit(path.win32.join(f.Type==='L'?paths.l:paths.d,target+(f.Type==='L'?'.ldf':'.mdf')))).join(',');
  await master.request().input('backup',backup).batch(`IF DB_ID(N'${target}') IS NOT NULL THROW 54900,'Destino ya existe: no se reemplaza.',1; RESTORE DATABASE [${target}] FROM DISK=@backup WITH ${moves},CHECKSUM;`);
  console.log('Origen V4.4 ficticio conservado:',source);console.log('Copia local de migracion V4.5:',target);return {source,target,password};
 }finally{if(sourcePool)await sourcePool.close();await master.close();}
}
function adapter(pool){return {sql,pool:async()=>pool,request:async tx=>{const r=tx?new sql.Request(tx):pool.request(),run=r.query.bind(r);r.query=text=>run(settings+text);return r;}};}
module.exports={connection,freshCopy,adapter,root,settings};
