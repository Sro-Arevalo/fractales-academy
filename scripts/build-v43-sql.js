'use strict';
// Solo genera archivos revisables. No abre conexiones ni ejecuta migraciones.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const base=read('sql/01_AZURE_BASE_NUEVA_25_TABLAS.sql');
const files=[];
for(const folder of ['v4','v4_1'])for(const name of fs.readdirSync(path.join(root,'sql/migrations',folder)).sort()){
  if(folder==='v4'?/^0[0-6]/.test(name)&&!name.startsWith('00_DIAGNOSTICO'):/^0[1-4]_/.test(name))files.push(`sql/migrations/${folder}/${name}`);
}
files.push('sql/migrations/v4_3/01_APODERADOS_Y_PRUEBAS.sql');
const escape=s=>s.replace(/'/g,"''");
const chunks=base.split(/^\s*GO\s*$/im).map(s=>s.trim()).filter(Boolean);
let result=`-- V4.3: estructura completa para una base NUEVA y VACIA, previamente creada.
-- Generado por scripts/build-v43-sql.js. No ejecutar sobre una base existente.
-- Confirmar servidor y sustituir @BaseEsperada. El conjunto se ejecuta en una sola transaccion.
SET NOCOUNT ON; SET XACT_ABORT ON;
SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON; SET ANSI_WARNINGS ON;
SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF;
DECLARE @BaseEsperada sysname=N'FractalesAcademy';
IF DB_NAME()<>@BaseEsperada OR DB_NAME() IN ('master','model','msdb','tempdb') THROW 54300,'Confirma servidor y base de destino.',1;
IF EXISTS(SELECT 1 FROM sys.tables WHERE is_ms_shipped=0) THROW 54308,'La base debe estar vacia. Usa las migraciones incrementales para datos existentes.',1;
BEGIN TRY
BEGIN TRAN;
`;
for(const chunk of chunks)result+=`EXEC sys.sp_executesql N'${escape(chunk)}';\n`;
for(const file of files){
  // La comprobación de la base ya ocurre arriba; el batch interior conserva su propio ámbito.
  const text=read(file).replace("DECLARE @BaseEsperada sysname=N'FractalesAcademy';","DECLARE @BaseEsperada sysname=DB_NAME();");
  result+=`-- ${file}\nEXEC sys.sp_executesql N'${escape(text)}';\n`;
}
result+='COMMIT;\nEND TRY\nBEGIN CATCH\n IF XACT_STATE()<>0 ROLLBACK;\n THROW;\nEND CATCH;\n';
fs.writeFileSync(path.join(root,'sql/migrations/v4_3/02_BASE_NUEVA_COMPLETA.sql'),result,'utf8');
console.log('Generado sql/migrations/v4_3/02_BASE_NUEVA_COMPLETA.sql (sin ejecutar SQL).');
