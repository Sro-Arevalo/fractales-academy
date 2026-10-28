'use strict';
// Crea bases NUEVAS en localhost para el ensayo. Nunca borra ni reutiliza bases.
const crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const sql=require('mssql/msnodesqlv8');
(async()=>{
  const suffix='20261028_'+crypto.randomBytes(5).toString('hex');
  const databases=[`FractalesAcademy_Pruebas_V4_3_${suffix}`,`FractalesAcademy_Pruebas_V4_3_${suffix}_Nueva`];
  const master=await new sql.ConnectionPool({connectionString:'Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=master;Trusted_Connection=Yes;Encrypt=No;TrustServerCertificate=Yes;',pool:{min:0,max:1,idleTimeoutMillis:1000}}).connect();
  try{for(const name of databases){if(!/^FractalesAcademy_Pruebas_V4_3_[A-Za-z0-9_]+$/.test(name))throw Error('Nombre de pruebas inválido.');await master.request().batch(`IF DB_ID(N'${name}') IS NOT NULL THROW 54900,'No se reutilizan bases existentes.',1; CREATE DATABASE [${name}];`);}}finally{await master.close();}
  console.log('Bases locales nuevas de ensayo:',databases.join(', '));
  const result=spawnSync(process.execPath,['--test','tests/v43-sql.integration.js'],{stdio:'inherit',env:{...process.env,V43_SQL_TEST_DATABASE:databases[0],V43_SQL_FRESH_DATABASE:databases[1]}});
  process.exitCode=result.status??1;
})().catch(e=>{console.error(e.message);process.exitCode=1;});
