'use strict';
// Genera archivos estáticos revisables. No abre conexiones ni ejecuta SQL.
const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');const model=require('../server/model.json');
const dir=path.join(root,'sql/migrations/v4');fs.mkdirSync(dir,{recursive:true});fs.mkdirSync(path.join(root,'sql/testing'),{recursive:true});
const write=(name,text)=>fs.writeFileSync(path.join(root,name),text.replace(/\r\n/g,'\n'),'utf8');
const tables=Object.values(model);
const header=`-- V4: ejecutar manualmente, en mantenimiento, después de respaldo verificado.
-- Cambiar SOLO @BaseEsperada por el nombre de la base independiente al ensayar.
SET NOCOUNT ON; SET XACT_ABORT ON;
SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON; SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF;
DECLARE @BaseEsperada sysname=N'FractalesAcademy';
IF DB_NAME()<>@BaseEsperada OR DB_NAME() IN ('master','model','msdb','tempdb')
    THROW 54000, 'Base incorrecta. Verifique servidor y @BaseEsperada; no se hizo ningun cambio.', 1;
`;
const deps=`IF OBJECT_ID('dbo.Control_Migracion_V4') IS NULL OR OBJECT_ID('dbo.Linea_Base_V4') IS NULL OR OBJECT_ID('dbo.Auditoria_V4') IS NULL OR OBJECT_ID('dbo.Seq_Operacion_V4','SO') IS NULL THROW 54001, 'Ejecute primero 00A_PREPARACION_Y_LINEA_BASE.sql.',1;
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='00A_PREPARACION_Y_LINEA_BASE') THROW 54001,'Preparacion V4 incompleta.',1;
`;
const finish=name=>`IF NOT EXISTS (SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='${name}')
 INSERT dbo.Control_Migracion_V4 (Script) VALUES ('${name}');
`;
const predecessors={'02':'01_ACTUALIZACION_CELULARES','03':'02_ACTUALIZACION_MATRICULAS','04':'03_ACTUALIZACION_PAGOS','05':'04_ACTUALIZACION_SIMULACROS','06':'05_ACTUALIZACION_HORARIOS'};
const wrap=(name,body,extra='')=>header+deps+(predecessors[name.slice(0,2)]?`IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='${predecessors[name.slice(0,2)]}') THROW 54008,'Falta una migracion anterior. Respetar el orden de la guia.',1;\n`:'')+`BEGIN TRY
BEGIN TRAN;
${body}
${finish(name)}COMMIT;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
${extra}`;
const expected=tables.flatMap(m=>m.columns.map(c=>{
 const size=['varchar','nvarchar'].includes(c.type)?c.length*(c.type==='nvarchar'?2:1):null;
 return `('${m.name}','${c.name}','${c.type}',${size??'NULL'},${c.type==='decimal'?c.length:'NULL'},${c.scale??'NULL'},${c.required?0:1})`;
})).join(',\n');
const columns=`DECLARE @Columnas TABLE (Tabla sysname, Columna sysname, Tipo sysname, Longitud int, PrecisionNum int, Escala int, AdmiteNull bit);
INSERT @Columnas VALUES\n${expected};
`;
const mismatch=`SELECT e.*,ty.name AS TipoReal,c.max_length AS LongitudReal,c.is_nullable AS NullReal
 FROM @Columnas e LEFT JOIN sys.tables t ON t.name=e.Tabla AND t.schema_id=SCHEMA_ID('dbo')
 LEFT JOIN sys.columns c ON c.object_id=t.object_id AND c.name=e.Columna LEFT JOIN sys.types ty ON ty.user_type_id=c.user_type_id
 WHERE c.column_id IS NULL OR ty.name<>e.Tipo OR c.is_nullable<>e.AdmiteNull
 OR (e.Longitud IS NOT NULL AND c.max_length<>e.Longitud AND NOT (e.Columna LIKE 'Cel[_]%' AND c.max_length IN (9,15)))
 OR (e.PrecisionNum IS NOT NULL AND (c.precision<>e.PrecisionNum OR c.scale<>e.Escala))`;
const manifest=tables.map(m=>{
 const key=m.pk.map(k=>`t.[${k}]`).join(',');
 return `INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT '${m.name}',(SELECT ${key} FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[${m.name}] t;`;
}).join('\n');
const phones=[['ALUMNO','DNI_Alu','Cel_Alu',true],['ALUMNO','DNI_Alu','Cel_Apoderado',true],['Docente','DNI_Doc','Cel_Doc',false]];
const invalidPhones=phones.map(([t,pk,c,nullable])=>`SELECT '${t}.${c}' AS Campo,[${pk}] AS DNI,[${c}] AS Valor FROM dbo.[${t}] WHERE ${nullable?'['+c+'] IS NOT NULL AND ':''}(${nullable?'':'['+c+'] IS NULL OR '}DATALENGTH(CONVERT(varchar(max),[${c}]))<>9 OR CONVERT(varchar(max),[${c}]) COLLATE Latin1_General_100_BIN2 LIKE '%[^0-9]%');`).join('\n');
const duplicates=`SELECT ALUMNO_DNI_Alu,Grupo_Cod_Grupo,COUNT_BIG(*) AS Cantidad FROM dbo.MATRICULA GROUP BY ALUMNO_DNI_Alu,Grupo_Cod_Grupo HAVING COUNT_BIG(*)>1;
SELECT m.ALUMNO_DNI_Alu,g.Ciclo_Cod_Ciclo,COUNT_BIG(*) AS Cantidad FROM dbo.MATRICULA m JOIN dbo.Grupo g ON g.Cod_Grupo=m.Grupo_Cod_Grupo GROUP BY m.ALUMNO_DNI_Alu,g.Ciclo_Cod_Ciclo HAVING COUNT_BIG(*)>1;
SELECT MATRICULA_Cod_Matricula,Nro_Mensualidad,COUNT_BIG(*) AS Cantidad FROM dbo.Pago WHERE CONCEPTO_PAGO_Cod_Concepto='MENSUALIDAD' GROUP BY MATRICULA_Cod_Matricula,Nro_Mensualidad HAVING COUNT_BIG(*)>1;
SELECT ALUMNO_DNI_Alu,CONCEPTO_PAGO_Cod_Concepto,COUNT_BIG(*) AS Cantidad FROM dbo.Pago WHERE CONCEPTO_PAGO_Cod_Concepto IN ('MATRICULA_INICIAL','MATERIALES') GROUP BY ALUMNO_DNI_Alu,CONCEPTO_PAGO_Cod_Concepto HAVING COUNT_BIG(*)>1;
-- Informativo: ambos conceptos iniciales antiguos se conservan, requieren revisión humana.
SELECT ALUMNO_DNI_Alu,COUNT_BIG(*) AS CargosInicialesLegados FROM dbo.Pago WHERE CONCEPTO_PAGO_Cod_Concepto IN ('MATRICULA_INICIAL','MATERIALES') GROUP BY ALUMNO_DNI_Alu HAVING COUNT_BIG(*)>1;
SELECT ALUMNO_DNI_Alu,COUNT_BIG(*) AS Cuentas FROM dbo.Usuario WHERE ALUMNO_DNI_Alu IS NOT NULL GROUP BY ALUMNO_DNI_Alu HAVING COUNT_BIG(*)>1;
SELECT m.ALUMNO_DNI_Alu,eg.Examen_Cod_Examen,COUNT_BIG(*) AS Resultados FROM dbo.Nota_Examen n JOIN dbo.MATRICULA m ON m.Cod_Matricula=n.MATRICULA_Cod_Matricula JOIN dbo.Examen_Grupo eg ON eg.Cod_examen_grupo=n.Examen_Grupo_Cod_examen_grupo GROUP BY m.ALUMNO_DNI_Alu,eg.Examen_Cod_Examen HAVING COUNT_BIG(*)>1;
`;
const meta=`SELECT DB_NAME() AS BaseSeleccionada,CONVERT(nvarchar(128),SERVERPROPERTY('ServerName')) AS Servidor,CONVERT(varchar(32),SERVERPROPERTY('ProductVersion')) AS Version, DATABASEPROPERTYEX(DB_NAME(),'ServiceObjective') AS NivelAzure;
SELECT s.name AS Esquema,t.name AS Tabla,c.column_id,c.name AS Columna,ty.name AS Tipo,c.max_length,c.precision,c.scale,c.is_nullable,dc.definition AS ValorPredeterminado
 FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id JOIN sys.columns c ON c.object_id=t.object_id JOIN sys.types ty ON ty.user_type_id=c.user_type_id LEFT JOIN sys.default_constraints dc ON dc.object_id=c.default_object_id ORDER BY s.name,t.name,c.column_id;
SELECT OBJECT_SCHEMA_NAME(i.object_id) AS Esquema,OBJECT_NAME(i.object_id) AS Tabla,i.name,i.is_primary_key,i.is_unique,i.filter_definition,ic.key_ordinal,c.name AS Columna
 FROM sys.indexes i JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE i.index_id>0 ORDER BY Tabla,i.name,ic.key_ordinal;
SELECT fk.name,OBJECT_NAME(fk.parent_object_id) AS Tabla,c.name AS Columna,OBJECT_NAME(fk.referenced_object_id) AS TablaReferencia,rc.name AS ColumnaReferencia,fkc.constraint_column_id,fk.is_disabled,fk.is_not_trusted FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id=fk.object_id JOIN sys.columns c ON c.object_id=fkc.parent_object_id AND c.column_id=fkc.parent_column_id JOIN sys.columns rc ON rc.object_id=fkc.referenced_object_id AND rc.column_id=fkc.referenced_column_id ORDER BY fk.name,fkc.constraint_column_id;
SELECT OBJECT_NAME(parent_object_id) AS Tabla,name,definition,is_disabled,is_not_trusted FROM sys.check_constraints ORDER BY Tabla,name;
SELECT OBJECT_NAME(t.parent_id) AS Tabla,t.name,t.is_disabled,m.definition FROM sys.triggers t LEFT JOIN sys.sql_modules m ON m.object_id=t.object_id;
SELECT s.name AS Esquema,p.name,m.definition FROM sys.procedures p JOIN sys.schemas s ON s.schema_id=p.schema_id LEFT JOIN sys.sql_modules m ON m.object_id=p.object_id;
`;
const counts=tables.map(m=>`IF OBJECT_ID('dbo.${m.name}') IS NOT NULL EXEC(N'SELECT ''${m.name}'' AS Tabla,COUNT_BIG(*) AS Registros FROM dbo.[${m.name}]');`).join('\n');
write('sql/migrations/v4/00_DIAGNOSTICO_PREVIO.sql',`-- SOLO LECTURA. Guardar todos los resultados antes de actualizar. No exige un nombre de base.
SET NOCOUNT ON;
${meta}${columns}${mismatch};
${counts}
-- Las siguientes consultas se compilan dinámicamente para permitir inspeccionar esquemas incompletos.
${[invalidPhones,duplicates].map(s=>`IF OBJECT_ID('dbo.ALUMNO') IS NOT NULL AND COL_LENGTH('dbo.Pago','Nro_Mensualidad') IS NOT NULL AND COL_LENGTH('dbo.Nota_Examen','Grupo_Cod_Grupo') IS NOT NULL
 EXEC(N'${s.replace(/'/g,"''")}');`).join('\n')}
IF COL_LENGTH('dbo.Usuario','Debe_Cambiar_Clave') IS NOT NULL EXEC(N'SELECT Cod_Usuario,Nomb_Usuario,ROL_Cod_Rol,ALUMNO_DNI_Alu FROM dbo.Usuario WHERE ROL_Cod_Rol NOT IN (''ADMIN'',''ALUMNO'') OR (ROL_Cod_Rol=''ALUMNO'' AND ALUMNO_DNI_Alu IS NULL)');
`);
const expectedKeys=tables.map(m=>`IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID('dbo.${m.name}') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),',') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)='${m.pk.join(',')}')
 THROW 54003,'Clave primaria inesperada en ${m.name}.',1;`).join('\n');
const expectedFks=tables.flatMap(m=>m.fks.map(f=>`IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID('dbo.${m.name}') AND fk.referenced_object_id=OBJECT_ID('dbo.${f.table}') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+'>'+rc.name),',') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)='${f.columns.map((k,i)=>k+'>'+f.references[i]).join(',')}')
 THROW 54004,'Relacion ausente o inesperada: ${m.name} a ${f.table}.',1;`)).join('\n');
const sourceSchema=fs.readFileSync(path.join(root,'sql/01_AZURE_BASE_NUEVA_25_TABLAS.sql'),'utf8').split('-- foreign keys')[0];
const expectedConstraints=[...sourceSchema.matchAll(/CONSTRAINT (\w+)\s+(CHECK|UNIQUE)\b/g)].map(([,name,type])=>{
 const exception=name==='CK_Pago_Medio'?" AND OBJECT_ID('dbo.FK_V4_Pago_Medio','F') IS NULL":'';
 return `IF OBJECT_ID('dbo.${name}','${type==='CHECK'?'C':'UQ'}') IS NULL${exception} THROW 54009,'Falta restriccion original: ${name}. Comparar el diagnostico antes de continuar.',1;`;
}).join('\n');
write('sql/migrations/v4/00A_PREPARACION_Y_LINEA_BASE.sql',header+`BEGIN TRY
BEGIN TRAN;
${columns}
IF EXISTS (${mismatch}) BEGIN
 ${mismatch};
 THROW 54002,'El esquema difiere del modelo local. Compare el diagnostico antes de continuar.',1;
END;
${expectedKeys}
${expectedFks}
${expectedConstraints}
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1)
 THROW 54005,'Hay restricciones deshabilitadas o no confiables. Revisar manualmente.',1;
IF OBJECT_ID('dbo.Control_Migracion_V4') IS NULL
 CREATE TABLE dbo.Control_Migracion_V4 (Script varchar(100) NOT NULL CONSTRAINT PK_Control_Migracion_V4 PRIMARY KEY,Fecha datetime2(0) NOT NULL CONSTRAINT DF_Control_V4_Fecha DEFAULT SYSUTCDATETIME());
IF OBJECT_ID('dbo.Linea_Base_V4') IS NULL
 CREATE TABLE dbo.Linea_Base_V4 (Tabla sysname NOT NULL,Clave nvarchar(200) NOT NULL,Huella varbinary(32) NOT NULL,CONSTRAINT PK_Linea_Base_V4 PRIMARY KEY (Tabla,Clave));
IF OBJECT_ID('dbo.Auditoria_V4') IS NULL
 CREATE TABLE dbo.Auditoria_V4 (Id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_Auditoria_V4 PRIMARY KEY,
 Entidad varchar(20) NOT NULL,Codigo varchar(20) NOT NULL,Accion varchar(30) NOT NULL,Anterior nvarchar(max) NULL,Nuevo nvarchar(max) NULL,
 Usuario_Cod_Usuario varchar(20) NOT NULL,Motivo varchar(250) NULL,Fecha datetime2(0) NOT NULL CONSTRAINT DF_Auditoria_V4_Fecha DEFAULT SYSUTCDATETIME(),
 CONSTRAINT FK_Auditoria_V4_Usuario FOREIGN KEY (Usuario_Cod_Usuario) REFERENCES dbo.Usuario(Cod_Usuario),
 CONSTRAINT CK_Auditoria_V4_JSON CHECK ((Anterior IS NULL OR ISJSON(Anterior)=1) AND (Nuevo IS NULL OR ISJSON(Nuevo)=1)));
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Auditoria_V4') AND name='IX_Auditoria_V4_Referencia')
 CREATE INDEX IX_Auditoria_V4_Referencia ON dbo.Auditoria_V4(Entidad,Codigo,Id);
IF OBJECT_ID('dbo.Seq_Operacion_V4','SO') IS NULL
BEGIN
 DECLARE @Max bigint;
 SELECT @Max=ISNULL(MAX(TRY_CONVERT(bigint,SUBSTRING(Codigo,3,18))),0) FROM (
 SELECT Cod_Matricula AS Codigo FROM dbo.MATRICULA UNION ALL SELECT Cod_Pago FROM dbo.Pago UNION ALL SELECT Cod_Usuario FROM dbo.Usuario UNION ALL SELECT Cod_Nota FROM dbo.Nota_Examen UNION ALL SELECT Cod_examen_grupo FROM dbo.Examen_Grupo) x
 WHERE DATALENGTH(Codigo)=20 AND LEFT(Codigo,2) IN ('M4','P4','U4','N4','E4') AND SUBSTRING(Codigo,3,18) NOT LIKE '%[^0-9]%';
 IF @Max>=999999999999999999 THROW 54006,'Espacio de identificadores agotado.',1;
 DECLARE @SeqSQL nvarchar(max)=N'CREATE SEQUENCE dbo.Seq_Operacion_V4 AS bigint START WITH '+CONVERT(nvarchar(20),@Max+1)+N' INCREMENT BY 1 MINVALUE 1 MAXVALUE 999999999999999999 NO CYCLE CACHE 50';
 EXEC sys.sp_executesql @SeqSQL;
END;
IF NOT EXISTS (SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='00A_PREPARACION_Y_LINEA_BASE')
BEGIN
 -- No sobrescribir la línea base en reejecuciones. Captura el contenido completo de las 25 tablas.
 ${manifest}
 INSERT dbo.Control_Migracion_V4 (Script) VALUES ('00A_PREPARACION_Y_LINEA_BASE');
END;
COMMIT;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
SELECT Script,Fecha FROM dbo.Control_Migracion_V4;
`);
write('sql/migrations/v4/01_ACTUALIZACION_CELULARES.sql',wrap('01_ACTUALIZACION_CELULARES',phones.map(([t,pk,c,nullable])=>`IF EXISTS (SELECT 1 FROM dbo.[${t}] WHERE ${nullable?'['+c+'] IS NOT NULL AND ':''}(${nullable?'':'['+c+'] IS NULL OR '}DATALENGTH(CONVERT(varchar(max),[${c}]))<>9 OR CONVERT(varchar(max),[${c}]) COLLATE Latin1_General_100_BIN2 LIKE '%[^0-9]%'))
 BEGIN
 ${invalidPhones}
 THROW 54010,'Celulares incompatibles. No se truncaron ni corrigieron valores; solicitar correccion autorizada.',1;
 END;
IF COL_LENGTH('dbo.${t}','${c}')<>9 ALTER TABLE dbo.[${t}] ALTER COLUMN [${c}] varchar(9) ${nullable?'NULL':'NOT NULL'};
IF OBJECT_ID('dbo.CK_V4_${t}_${c}','C') IS NULL
 ALTER TABLE dbo.[${t}] WITH CHECK ADD CONSTRAINT [CK_V4_${t}_${c}] CHECK (${nullable?'['+c+'] IS NULL OR ':''}(DATALENGTH([${c}])=9 AND [${c}] COLLATE Latin1_General_100_BIN2 NOT LIKE '%[^0-9]%'));
ALTER TABLE dbo.[${t}] WITH CHECK CHECK CONSTRAINT [CK_V4_${t}_${c}];`).join('\n'),`SELECT OBJECT_NAME(object_id) AS Tabla,name,max_length,is_nullable FROM sys.columns WHERE name IN ('Cel_Alu','Cel_Apoderado','Cel_Doc');\n`));

// Esquema de pruebas: un único lote dinámico. Un THROW de la guarda impide TODO el DDL.
const original=fs.readFileSync(path.join(root,'sql/01_AZURE_BASE_NUEVA_25_TABLAS.sql'),'utf8');
const start=original.indexOf('-- 1) ESQUEMA');
const end=original.indexOf('-- 4) COMPROBACION FINAL');
const batches=original.slice(start,end).split(/^GO\s*$/gmi).map(s=>s.trim()).filter(Boolean);
write('sql/testing/CREAR_ESTRUCTURA_PRUEBAS.sql',`-- SOLO PRUEBAS. La base vacía debe existir y estar seleccionada previamente.
-- No abre conexiones. No crea bases. No usar los antiguos scripts de base nueva en producción.
SET NOCOUNT ON; SET XACT_ABORT ON;
SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON; SET ANSI_WARNINGS ON;
SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF;
IF DB_NAME() NOT LIKE N'FractalesAcademy[_]Pruebas[_]V4%' OR DB_NAME()=N'FractalesAcademy'
 THROW 54900,'Solo se admite una base llamada FractalesAcademy_Pruebas_V4... previamente creada y seleccionada.',1;
IF EXISTS (SELECT 1 FROM sys.tables WHERE is_ms_shipped=0) THROW 54901,'La base de pruebas debe estar vacia.',1;
BEGIN TRY
 BEGIN TRAN;
 ${batches.map(s=>`EXEC sys.sp_executesql N'${s.replace(/'/g,"''")}';`).join('\n')}
 COMMIT;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
SELECT DB_NAME() AS BasePruebas,COUNT(*) AS Tablas FROM sys.tables WHERE schema_id=SCHEMA_ID('dbo');
`);
// Comprobación de preservación: faltantes y modificaciones se muestran por separado.
const compare=tables.map(m=>`INSERT @Actual (Tabla,Clave,Huella) SELECT '${m.name}',(SELECT ${m.pk.map(k=>`t.[${k}]`).join(',')} FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[${m.name}] t;`).join('\n');
write('sql/migrations/v4/99_VERIFICACION_FINAL.sql',`-- SOLO LECTURA. Ejecutar inmediatamente tras migrar, antes de admitir escrituras.
SET NOCOUNT ON;
${meta}${counts}
${invalidPhones}${duplicates}
SELECT * FROM dbo.Control_Migracion_V4 ORDER BY Script;
SELECT name,current_value,maximum_value,is_cycling FROM sys.sequences WHERE name='Seq_Operacion_V4';
DECLARE @Actual TABLE (Tabla sysname,Clave nvarchar(200),Huella varbinary(32));
${compare}
SELECT b.Tabla,COUNT_BIG(*) AS FilasBase,SUM(CASE WHEN a.Clave IS NULL THEN 1 ELSE 0 END) AS FilasFaltantes,
 SUM(CASE WHEN a.Clave IS NOT NULL AND a.Huella<>b.Huella THEN 1 ELSE 0 END) AS FilasModificadas
 FROM dbo.Linea_Base_V4 b LEFT JOIN @Actual a ON a.Tabla=b.Tabla AND a.Clave=b.Clave GROUP BY b.Tabla;
SELECT b.Tabla,b.Clave,CASE WHEN a.Clave IS NULL THEN 'FALTA' ELSE 'CAMBIO' END AS Diferencia
 FROM dbo.Linea_Base_V4 b LEFT JOIN @Actual a ON a.Tabla=b.Tabla AND a.Clave=b.Clave WHERE a.Clave IS NULL OR a.Huella<>b.Huella;
SELECT OBJECT_NAME(object_id) AS Tabla,name,max_length,is_nullable FROM sys.columns WHERE name IN ('Cel_Alu','Cel_Apoderado','Cel_Doc');
SELECT name,is_disabled,is_not_trusted FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1;
SELECT name,is_disabled,is_not_trusted FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1;
SELECT name,is_disabled FROM sys.triggers WHERE is_disabled=1;
${columns}${mismatch.replace(" AND NOT (e.Columna LIKE 'Cel[_]%' AND c.max_length IN (9,15))",'')};
SELECT o.name AS ObjetoNecesario,CASE WHEN OBJECT_ID('dbo.'+o.name) IS NULL THEN 'FALTA' ELSE 'OK' END AS Estado FROM (VALUES ('MEDIO_PAGO'),('Auditoria_V4'),('Control_Migracion_V4'),('Linea_Base_V4'),('Seq_Operacion_V4')) o(name);
-- Deben existir los siete scripts de modificación: 00A,01,02,03,04,05,06.
SELECT COUNT(*) AS MigracionesAplicadas FROM dbo.Control_Migracion_V4;
`);
module.exports={header,deps,wrap,write};
