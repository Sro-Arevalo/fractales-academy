'use strict';
// Solo metadata en una base ficticia localhost; nunca .env ni filas de personas.
const sql=require('mssql/msnodesqlv8'),fs=require('node:fs');
(async()=>{const name=process.env.V44_SCHEMA_DATABASE;if(!/^FractalesAcademy_Pruebas_V4_4_\d{8}_[a-f0-9]{10}$/.test(name||''))throw Error('Selecciona una base ficticia local V4.4.');
 const p=await new sql.ConnectionPool({connectionString:`Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=${name};Trusted_Connection=Yes;Encrypt=No;TrustServerCertificate=Yes;`}).connect();try{
 const columns=(await p.request().query(`SELECT t.name tabla,c.name columna,ty.name tipo,c.max_length longitud,c.precision,c.scale,c.is_nullable,c.column_id,c.is_identity FROM sys.tables t JOIN sys.columns c ON c.object_id=t.object_id JOIN sys.types ty ON ty.user_type_id=c.user_type_id WHERE t.is_ms_shipped=0 AND t.name<>'sysdiagrams' ORDER BY t.name,c.column_id`)).recordset;
 const objects=(await p.request().query(`SELECT o.name nombre,RTRIM(o.type) tipo,OBJECT_NAME(o.parent_object_id) tabla,COALESCE(sm.definition,cc.definition,dc.definition) definicion,
 COL_NAME(dc.parent_object_id,dc.parent_column_id) columna,
 (SELECT c.name columna FROM sys.indexes i JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE i.object_id=o.parent_object_id AND i.name=o.name AND ic.key_ordinal>0 ORDER BY ic.key_ordinal FOR JSON PATH) claves,
 OBJECT_NAME(fk.referenced_object_id) referencia FROM sys.objects o LEFT JOIN sys.sql_modules sm ON sm.object_id=o.object_id LEFT JOIN sys.check_constraints cc ON cc.object_id=o.object_id LEFT JOIN sys.default_constraints dc ON dc.object_id=o.object_id LEFT JOIN sys.foreign_keys fk ON fk.object_id=o.object_id
 WHERE o.is_ms_shipped=0 AND o.type IN('PK','F','UQ','C','D','TR','P','V') ORDER BY o.type,o.name`)).recordset;
 const indexes=(await p.request().query(`SELECT t.name tabla,i.name nombre,i.is_unique,i.filter_definition,STRING_AGG(CONVERT(nvarchar(max),c.name),',') WITHIN GROUP(ORDER BY ic.key_ordinal) columnas,
 (SELECT c2.name columna FROM sys.index_columns ic2 JOIN sys.columns c2 ON c2.object_id=ic2.object_id AND c2.column_id=ic2.column_id WHERE ic2.object_id=i.object_id AND ic2.index_id=i.index_id AND ic2.is_included_column=1 FOR JSON PATH) incluidas
 FROM sys.indexes i JOIN sys.tables t ON t.object_id=i.object_id JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE i.name IS NOT NULL AND i.is_primary_key=0 AND i.is_unique_constraint=0 AND ic.key_ordinal>0 GROUP BY t.name,i.name,i.object_id,i.index_id,i.is_unique,i.filter_definition`)).recordset;
 fs.mkdirSync('scripts/fixtures',{recursive:true});fs.writeFileSync('scripts/fixtures/v44-schema.json',JSON.stringify({columns,objects,indexes},null,2));console.log('Metadata capturada:',new Set(columns.map(c=>c.tabla)).size,'tablas;',columns.length,'columnas.');
 }finally{await p.close();}})().catch(e=>{console.error(e.code||e.message);process.exitCode=1;});
