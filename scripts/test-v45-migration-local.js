'use strict';
// Solo localhost y bases nuevas de datos ficticios. No usa .env ni Azure.
const {freshCopy,connection,root}=require('../tests/helpers/local-v45-database'),fs=require('node:fs'),path=require('node:path');
(async()=>{const copy=await freshCopy(),pool=await connection(copy.target);try{
 for(const file of ['00_DIAGNOSTICO_INICIAL.sql','01_PREPARAR_ESTRUCTURA.sql','02_MIGRAR_DATOS.sql','03_NORMALIZAR_NOMBRES.sql','07_VERIFICACION_PREVIA.sql']){
  const script=fs.readFileSync(path.join(root,'sql/migrations/v4_5',file),'utf8').replace("DECLARE @BaseEsperada sysname=N'FractalesAcademy';",`DECLARE @BaseEsperada sysname=N'${copy.target}';`);try{await pool.request().batch(script);console.log('PASS',file);}catch(e){console.error('FALLO',file,{number:e.number,line:e.lineNumber,message:e.message});throw e;}
 }
}finally{await pool.close();}})().catch(e=>{console.error({number:e.number,line:e.lineNumber,message:e.message});process.exitCode=1;});
