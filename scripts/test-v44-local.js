'use strict';
// NUEVA base local exclusivamente. Nunca lee .env, reutiliza bases o conecta a Azure.
const crypto=require('node:crypto'),{spawnSync}=require('node:child_process'),sql=require('mssql/msnodesqlv8');
(async()=>{
 const name='FractalesAcademy_Pruebas_V4_4_'+new Date().toISOString().slice(0,10).replaceAll('-','')+'_'+crypto.randomBytes(5).toString('hex');
 const master=await new sql.ConnectionPool({connectionString:'Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=master;Trusted_Connection=Yes;Encrypt=No;TrustServerCertificate=Yes;',pool:{min:0,max:1,idleTimeoutMillis:1000}}).connect();
 try{if(!/^FractalesAcademy_Pruebas_V4_4_\d{8}_[a-f0-9]{10}$/.test(name))throw Error('Nombre local invalido');await master.request().batch(`IF DB_ID(N'${name}') IS NOT NULL THROW 54900,'Base ya existe: no se reutiliza.',1; CREATE DATABASE [${name}];`);}finally{await master.close();}
 console.log('Nueva base de pruebas SOLO LOCAL:',name);
 const result=spawnSync(process.execPath,['--test','tests/v44-sql.integration.js'],{stdio:'inherit',env:{...process.env,V44_SQL_TEST_DATABASE:name}});process.exitCode=result.status??1;
})().catch(e=>{console.error(e.message);process.exitCode=1;});
