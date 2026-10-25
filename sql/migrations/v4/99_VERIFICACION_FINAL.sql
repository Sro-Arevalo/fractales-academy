-- SOLO LECTURA. Ejecutar inmediatamente tras migrar, antes de admitir escrituras.
SET NOCOUNT ON;
SELECT DB_NAME() AS BaseSeleccionada,CONVERT(nvarchar(128),SERVERPROPERTY('ServerName')) AS Servidor,CONVERT(varchar(32),SERVERPROPERTY('ProductVersion')) AS Version, DATABASEPROPERTYEX(DB_NAME(),'ServiceObjective') AS NivelAzure;
SELECT s.name AS Esquema,t.name AS Tabla,c.column_id,c.name AS Columna,ty.name AS Tipo,c.max_length,c.precision,c.scale,c.is_nullable,dc.definition AS ValorPredeterminado
 FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id JOIN sys.columns c ON c.object_id=t.object_id JOIN sys.types ty ON ty.user_type_id=c.user_type_id LEFT JOIN sys.default_constraints dc ON dc.object_id=c.default_object_id ORDER BY s.name,t.name,c.column_id;
SELECT OBJECT_SCHEMA_NAME(i.object_id) AS Esquema,OBJECT_NAME(i.object_id) AS Tabla,i.name,i.is_primary_key,i.is_unique,i.filter_definition,ic.key_ordinal,c.name AS Columna
 FROM sys.indexes i JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE i.index_id>0 ORDER BY Tabla,i.name,ic.key_ordinal;
SELECT fk.name,OBJECT_NAME(fk.parent_object_id) AS Tabla,c.name AS Columna,OBJECT_NAME(fk.referenced_object_id) AS TablaReferencia,rc.name AS ColumnaReferencia,fkc.constraint_column_id,fk.is_disabled,fk.is_not_trusted FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id=fk.object_id JOIN sys.columns c ON c.object_id=fkc.parent_object_id AND c.column_id=fkc.parent_column_id JOIN sys.columns rc ON rc.object_id=fkc.referenced_object_id AND rc.column_id=fkc.referenced_column_id ORDER BY fk.name,fkc.constraint_column_id;
SELECT OBJECT_NAME(parent_object_id) AS Tabla,name,definition,is_disabled,is_not_trusted FROM sys.check_constraints ORDER BY Tabla,name;
SELECT OBJECT_NAME(t.parent_id) AS Tabla,t.name,t.is_disabled,m.definition FROM sys.triggers t LEFT JOIN sys.sql_modules m ON m.object_id=t.object_id;
SELECT s.name AS Esquema,p.name,m.definition FROM sys.procedures p JOIN sys.schemas s ON s.schema_id=p.schema_id LEFT JOIN sys.sql_modules m ON m.object_id=p.object_id;
IF OBJECT_ID('dbo.ALUMNO') IS NOT NULL EXEC(N'SELECT ''ALUMNO'' AS Tabla,COUNT_BIG(*) AS Registros FROM dbo.[ALUMNO]');
IF OBJECT_ID('dbo.Aula') IS NOT NULL EXEC(N'SELECT ''Aula'' AS Tabla,COUNT_BIG(*) AS Registros FROM dbo.[Aula]');
IF OBJECT_ID('dbo.CARRERA') IS NOT NULL EXEC(N'SELECT ''CARRERA'' AS Tabla,COUNT_BIG(*) AS Registros FROM dbo.[CARRERA]');
IF OBJECT_ID('dbo.CONCEPTO_PAGO') IS NOT NULL EXEC(N'SELECT ''CONCEPTO_PAGO'' AS Tabla,COUNT_BIG(*) AS Registros FROM dbo.[CONCEPTO_PAGO]');
IF OBJECT_ID('dbo.CURSOS') IS NOT NULL EXEC(N'SELECT ''CURSOS'' AS Tabla,COUNT_BIG(*) AS Registros FROM dbo.[CURSOS]');
IF OBJECT_ID('dbo.Ciclo') IS NOT NULL EXEC(N'SELECT ''Ciclo'' AS Tabla,COUNT_BIG(*) AS Registros FROM dbo.[Ciclo]');
IF OBJECT_ID('dbo.Docente') IS NOT NULL EXEC(N'SELECT ''Docente'' AS Tabla,COUNT_BIG(*) AS Registros FROM dbo.[Docente]');
IF OBJECT_ID('dbo.Docente_Asignatura') IS NOT NULL EXEC(N'SELECT ''Docente_Asignatura'' AS Tabla,COUNT_BIG(*) AS Registros FROM dbo.[Docente_Asignatura]');
IF OBJECT_ID('dbo.ESTADO_CICLO') IS NOT NULL EXEC(N'SELECT ''ESTADO_CICLO'' AS Tabla,COUNT_BIG(*) AS Registros FROM dbo.[ESTADO_CICLO]');
IF OBJECT_ID('dbo.ESTADO_EXAMEN_GRUPO') IS NOT NULL EXEC(N'SELECT ''ESTADO_EXAMEN_GRUPO'' AS Tabla,COUNT_BIG(*) AS Registros FROM dbo.[ESTADO_EXAMEN_GRUPO]');
IF OBJECT_ID('dbo.ESTADO_MATRICULA') IS NOT NULL EXEC(N'SELECT ''ESTADO_MATRICULA'' AS Tabla,COUNT_BIG(*) AS Registros FROM dbo.[ESTADO_MATRICULA]');
IF OBJECT_ID('dbo.ESTADO_PAGO') IS NOT NULL EXEC(N'SELECT ''ESTADO_PAGO'' AS Tabla,COUNT_BIG(*) AS Registros FROM dbo.[ESTADO_PAGO]');
IF OBJECT_ID('dbo.Examen') IS NOT NULL EXEC(N'SELECT ''Examen'' AS Tabla,COUNT_BIG(*) AS Registros FROM dbo.[Examen]');
IF OBJECT_ID('dbo.Examen_Grupo') IS NOT NULL EXEC(N'SELECT ''Examen_Grupo'' AS Tabla,COUNT_BIG(*) AS Registros FROM dbo.[Examen_Grupo]');
IF OBJECT_ID('dbo.Grupo') IS NOT NULL EXEC(N'SELECT ''Grupo'' AS Tabla,COUNT_BIG(*) AS Registros FROM dbo.[Grupo]');
IF OBJECT_ID('dbo.Horario') IS NOT NULL EXEC(N'SELECT ''Horario'' AS Tabla,COUNT_BIG(*) AS Registros FROM dbo.[Horario]');
IF OBJECT_ID('dbo.MATRICULA') IS NOT NULL EXEC(N'SELECT ''MATRICULA'' AS Tabla,COUNT_BIG(*) AS Registros FROM dbo.[MATRICULA]');
IF OBJECT_ID('dbo.Nota_Examen') IS NOT NULL EXEC(N'SELECT ''Nota_Examen'' AS Tabla,COUNT_BIG(*) AS Registros FROM dbo.[Nota_Examen]');
IF OBJECT_ID('dbo.PARENTESCO') IS NOT NULL EXEC(N'SELECT ''PARENTESCO'' AS Tabla,COUNT_BIG(*) AS Registros FROM dbo.[PARENTESCO]');
IF OBJECT_ID('dbo.Pago') IS NOT NULL EXEC(N'SELECT ''Pago'' AS Tabla,COUNT_BIG(*) AS Registros FROM dbo.[Pago]');
IF OBJECT_ID('dbo.Programa') IS NOT NULL EXEC(N'SELECT ''Programa'' AS Tabla,COUNT_BIG(*) AS Registros FROM dbo.[Programa]');
IF OBJECT_ID('dbo.ROL') IS NOT NULL EXEC(N'SELECT ''ROL'' AS Tabla,COUNT_BIG(*) AS Registros FROM dbo.[ROL]');
IF OBJECT_ID('dbo.TIPO_BLOQUE') IS NOT NULL EXEC(N'SELECT ''TIPO_BLOQUE'' AS Tabla,COUNT_BIG(*) AS Registros FROM dbo.[TIPO_BLOQUE]');
IF OBJECT_ID('dbo.Turno') IS NOT NULL EXEC(N'SELECT ''Turno'' AS Tabla,COUNT_BIG(*) AS Registros FROM dbo.[Turno]');
IF OBJECT_ID('dbo.Usuario') IS NOT NULL EXEC(N'SELECT ''Usuario'' AS Tabla,COUNT_BIG(*) AS Registros FROM dbo.[Usuario]');
SELECT 'ALUMNO.Cel_Alu' AS Campo,[DNI_Alu] AS DNI,[Cel_Alu] AS Valor FROM dbo.[ALUMNO] WHERE [Cel_Alu] IS NOT NULL AND (DATALENGTH(CONVERT(varchar(max),[Cel_Alu]))<>9 OR CONVERT(varchar(max),[Cel_Alu]) COLLATE Latin1_General_100_BIN2 LIKE '%[^0-9]%');
SELECT 'ALUMNO.Cel_Apoderado' AS Campo,[DNI_Alu] AS DNI,[Cel_Apoderado] AS Valor FROM dbo.[ALUMNO] WHERE [Cel_Apoderado] IS NOT NULL AND (DATALENGTH(CONVERT(varchar(max),[Cel_Apoderado]))<>9 OR CONVERT(varchar(max),[Cel_Apoderado]) COLLATE Latin1_General_100_BIN2 LIKE '%[^0-9]%');
SELECT 'Docente.Cel_Doc' AS Campo,[DNI_Doc] AS DNI,[Cel_Doc] AS Valor FROM dbo.[Docente] WHERE ([Cel_Doc] IS NULL OR DATALENGTH(CONVERT(varchar(max),[Cel_Doc]))<>9 OR CONVERT(varchar(max),[Cel_Doc]) COLLATE Latin1_General_100_BIN2 LIKE '%[^0-9]%');SELECT ALUMNO_DNI_Alu,Grupo_Cod_Grupo,COUNT_BIG(*) AS Cantidad FROM dbo.MATRICULA GROUP BY ALUMNO_DNI_Alu,Grupo_Cod_Grupo HAVING COUNT_BIG(*)>1;
SELECT m.ALUMNO_DNI_Alu,g.Ciclo_Cod_Ciclo,COUNT_BIG(*) AS Cantidad FROM dbo.MATRICULA m JOIN dbo.Grupo g ON g.Cod_Grupo=m.Grupo_Cod_Grupo GROUP BY m.ALUMNO_DNI_Alu,g.Ciclo_Cod_Ciclo HAVING COUNT_BIG(*)>1;
SELECT MATRICULA_Cod_Matricula,Nro_Mensualidad,COUNT_BIG(*) AS Cantidad FROM dbo.Pago WHERE CONCEPTO_PAGO_Cod_Concepto='MENSUALIDAD' GROUP BY MATRICULA_Cod_Matricula,Nro_Mensualidad HAVING COUNT_BIG(*)>1;
SELECT ALUMNO_DNI_Alu,CONCEPTO_PAGO_Cod_Concepto,COUNT_BIG(*) AS Cantidad FROM dbo.Pago WHERE CONCEPTO_PAGO_Cod_Concepto IN ('MATRICULA_INICIAL','MATERIALES') GROUP BY ALUMNO_DNI_Alu,CONCEPTO_PAGO_Cod_Concepto HAVING COUNT_BIG(*)>1;
-- Informativo: ambos conceptos iniciales antiguos se conservan, requieren revisión humana.
SELECT ALUMNO_DNI_Alu,COUNT_BIG(*) AS CargosInicialesLegados FROM dbo.Pago WHERE CONCEPTO_PAGO_Cod_Concepto IN ('MATRICULA_INICIAL','MATERIALES') GROUP BY ALUMNO_DNI_Alu HAVING COUNT_BIG(*)>1;
SELECT ALUMNO_DNI_Alu,COUNT_BIG(*) AS Cuentas FROM dbo.Usuario WHERE ALUMNO_DNI_Alu IS NOT NULL GROUP BY ALUMNO_DNI_Alu HAVING COUNT_BIG(*)>1;
SELECT m.ALUMNO_DNI_Alu,eg.Examen_Cod_Examen,COUNT_BIG(*) AS Resultados FROM dbo.Nota_Examen n JOIN dbo.MATRICULA m ON m.Cod_Matricula=n.MATRICULA_Cod_Matricula JOIN dbo.Examen_Grupo eg ON eg.Cod_examen_grupo=n.Examen_Grupo_Cod_examen_grupo GROUP BY m.ALUMNO_DNI_Alu,eg.Examen_Cod_Examen HAVING COUNT_BIG(*)>1;

SELECT * FROM dbo.Control_Migracion_V4 ORDER BY Script;
SELECT name,current_value,maximum_value,is_cycling FROM sys.sequences WHERE name='Seq_Operacion_V4';
DECLARE @Actual TABLE (Tabla sysname,Clave nvarchar(200),Huella varbinary(32));
INSERT @Actual (Tabla,Clave,Huella) SELECT 'ALUMNO',(SELECT t.[DNI_Alu] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[ALUMNO] t;
INSERT @Actual (Tabla,Clave,Huella) SELECT 'Aula',(SELECT t.[Cod_Aula] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[Aula] t;
INSERT @Actual (Tabla,Clave,Huella) SELECT 'CARRERA',(SELECT t.[Cod_Carrera] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[CARRERA] t;
INSERT @Actual (Tabla,Clave,Huella) SELECT 'CONCEPTO_PAGO',(SELECT t.[Cod_Concepto] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[CONCEPTO_PAGO] t;
INSERT @Actual (Tabla,Clave,Huella) SELECT 'CURSOS',(SELECT t.[Cod_Curso] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[CURSOS] t;
INSERT @Actual (Tabla,Clave,Huella) SELECT 'Ciclo',(SELECT t.[Cod_Ciclo] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[Ciclo] t;
INSERT @Actual (Tabla,Clave,Huella) SELECT 'Docente',(SELECT t.[DNI_Doc] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[Docente] t;
INSERT @Actual (Tabla,Clave,Huella) SELECT 'Docente_Asignatura',(SELECT t.[CURSOS_Cod_Curso],t.[Docente_DNI_Doc] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[Docente_Asignatura] t;
INSERT @Actual (Tabla,Clave,Huella) SELECT 'ESTADO_CICLO',(SELECT t.[Cod_Estado_Ciclo] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[ESTADO_CICLO] t;
INSERT @Actual (Tabla,Clave,Huella) SELECT 'ESTADO_EXAMEN_GRUPO',(SELECT t.[Cod_Estado_Examen] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[ESTADO_EXAMEN_GRUPO] t;
INSERT @Actual (Tabla,Clave,Huella) SELECT 'ESTADO_MATRICULA',(SELECT t.[Cod_Estado_Matricula] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[ESTADO_MATRICULA] t;
INSERT @Actual (Tabla,Clave,Huella) SELECT 'ESTADO_PAGO',(SELECT t.[Cod_Estado] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[ESTADO_PAGO] t;
INSERT @Actual (Tabla,Clave,Huella) SELECT 'Examen',(SELECT t.[Cod_Examen] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[Examen] t;
INSERT @Actual (Tabla,Clave,Huella) SELECT 'Examen_Grupo',(SELECT t.[Cod_examen_grupo] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[Examen_Grupo] t;
INSERT @Actual (Tabla,Clave,Huella) SELECT 'Grupo',(SELECT t.[Cod_Grupo] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[Grupo] t;
INSERT @Actual (Tabla,Clave,Huella) SELECT 'Horario',(SELECT t.[Cod_Horario] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[Horario] t;
INSERT @Actual (Tabla,Clave,Huella) SELECT 'MATRICULA',(SELECT t.[Cod_Matricula] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[MATRICULA] t;
INSERT @Actual (Tabla,Clave,Huella) SELECT 'Nota_Examen',(SELECT t.[Cod_Nota] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[Nota_Examen] t;
INSERT @Actual (Tabla,Clave,Huella) SELECT 'PARENTESCO',(SELECT t.[Cod_Paren] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[PARENTESCO] t;
INSERT @Actual (Tabla,Clave,Huella) SELECT 'Pago',(SELECT t.[Cod_Pago] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[Pago] t;
INSERT @Actual (Tabla,Clave,Huella) SELECT 'Programa',(SELECT t.[Cod_Programa] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[Programa] t;
INSERT @Actual (Tabla,Clave,Huella) SELECT 'ROL',(SELECT t.[Cod_Rol] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[ROL] t;
INSERT @Actual (Tabla,Clave,Huella) SELECT 'TIPO_BLOQUE',(SELECT t.[Cod_Tipo] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[TIPO_BLOQUE] t;
INSERT @Actual (Tabla,Clave,Huella) SELECT 'Turno',(SELECT t.[Cod_Turno] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[Turno] t;
INSERT @Actual (Tabla,Clave,Huella) SELECT 'Usuario',(SELECT t.[Cod_Usuario] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[Usuario] t;
SELECT b.Tabla,COUNT_BIG(*) AS FilasBase,SUM(CASE WHEN a.Clave IS NULL THEN 1 ELSE 0 END) AS FilasFaltantes,
 SUM(CASE WHEN a.Clave IS NOT NULL AND a.Huella<>b.Huella THEN 1 ELSE 0 END) AS FilasModificadas
 FROM dbo.Linea_Base_V4 b LEFT JOIN @Actual a ON a.Tabla=b.Tabla AND a.Clave=b.Clave GROUP BY b.Tabla;
SELECT b.Tabla,b.Clave,CASE WHEN a.Clave IS NULL THEN 'FALTA' ELSE 'CAMBIO' END AS Diferencia
 FROM dbo.Linea_Base_V4 b LEFT JOIN @Actual a ON a.Tabla=b.Tabla AND a.Clave=b.Clave WHERE a.Clave IS NULL OR a.Huella<>b.Huella;
SELECT OBJECT_NAME(object_id) AS Tabla,name,max_length,is_nullable FROM sys.columns WHERE name IN ('Cel_Alu','Cel_Apoderado','Cel_Doc');
SELECT name,is_disabled,is_not_trusted FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1;
SELECT name,is_disabled,is_not_trusted FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1;
SELECT name,is_disabled FROM sys.triggers WHERE is_disabled=1;
DECLARE @Columnas TABLE (Tabla sysname, Columna sysname, Tipo sysname, Longitud int, PrecisionNum int, Escala int, AdmiteNull bit);
INSERT @Columnas VALUES
('ALUMNO','DNI_Alu','varchar',8,NULL,NULL,0),
('ALUMNO','Nomb_Alu','varchar',120,NULL,NULL,0),
('ALUMNO','Correo_Alu','varchar',150,NULL,NULL,1),
('ALUMNO','Fech_Nac','date',NULL,NULL,NULL,1),
('ALUMNO','Cel_Alu','varchar',9,NULL,NULL,1),
('ALUMNO','Dir_Alu','varchar',200,NULL,NULL,1),
('ALUMNO','Nomb_Apoderado','varchar',120,NULL,NULL,0),
('ALUMNO','DNI_Apoderado','varchar',8,NULL,NULL,1),
('ALUMNO','Cel_Apoderado','varchar',9,NULL,NULL,1),
('ALUMNO','Correo_Apoderado','varchar',150,NULL,NULL,1),
('ALUMNO','PARENTESCO_Cod_Paren','varchar',5,NULL,NULL,0),
('ALUMNO','CARRERA_Cod_Carrera','varchar',10,NULL,NULL,0),
('Aula','Cod_Aula','varchar',10,NULL,NULL,0),
('Aula','Nomb_Aula','varchar',60,NULL,NULL,0),
('Aula','Capacidad','smallint',NULL,NULL,NULL,0),
('Aula','Activa','bit',NULL,NULL,NULL,0),
('CARRERA','Cod_Carrera','varchar',10,NULL,NULL,0),
('CARRERA','Nomb_Carrera','varchar',120,NULL,NULL,0),
('CONCEPTO_PAGO','Cod_Concepto','varchar',20,NULL,NULL,0),
('CONCEPTO_PAGO','Nomb_Concepto','varchar',60,NULL,NULL,0),
('CURSOS','Cod_Curso','varchar',10,NULL,NULL,0),
('CURSOS','Nomb_Curso','varchar',100,NULL,NULL,0),
('CURSOS','Activa','bit',NULL,NULL,NULL,0),
('Ciclo','Cod_Ciclo','varchar',20,NULL,NULL,0),
('Ciclo','Programa_Cod_Programa','varchar',20,NULL,NULL,0),
('Ciclo','Nomb_Ciclo','varchar',100,NULL,NULL,0),
('Ciclo','Modalidad','varchar',12,NULL,NULL,0),
('Ciclo','Fech_Inicio','date',NULL,NULL,NULL,0),
('Ciclo','Fech_Fin','date',NULL,NULL,NULL,0),
('Ciclo','Nro_Mensualidades','tinyint',NULL,NULL,NULL,0),
('Ciclo','Precio_Mensual','decimal',NULL,10,2,0),
('Ciclo','ESTADO_CICLO_Cod_Estado','varchar',15,NULL,NULL,0),
('Docente','DNI_Doc','varchar',8,NULL,NULL,0),
('Docente','Nom_Doc','varchar',120,NULL,NULL,0),
('Docente','Cel_Doc','varchar',9,NULL,NULL,0),
('Docente','Especialidad','varchar',120,NULL,NULL,1),
('Docente','Activo','bit',NULL,NULL,NULL,0),
('Docente_Asignatura','CURSOS_Cod_Curso','varchar',10,NULL,NULL,0),
('Docente_Asignatura','Docente_DNI_Doc','varchar',8,NULL,NULL,0),
('ESTADO_CICLO','Cod_Estado_Ciclo','varchar',15,NULL,NULL,0),
('ESTADO_CICLO','Nomb_Estado_Ciclo','varchar',60,NULL,NULL,0),
('ESTADO_EXAMEN_GRUPO','Cod_Estado_Examen','varchar',15,NULL,NULL,0),
('ESTADO_EXAMEN_GRUPO','Nomb_Estado_Examen','varchar',60,NULL,NULL,0),
('ESTADO_MATRICULA','Cod_Estado_Matricula','varchar',15,NULL,NULL,0),
('ESTADO_MATRICULA','Nomb_Estado_Matricula','varchar',60,NULL,NULL,0),
('ESTADO_PAGO','Cod_Estado','varchar',10,NULL,NULL,0),
('ESTADO_PAGO','Nomb_Estado','varchar',60,NULL,NULL,0),
('Examen','Cod_Examen','varchar',20,NULL,NULL,0),
('Examen','Nomb_Examen','nvarchar',300,NULL,NULL,0),
('Examen','Descripcion','nvarchar',600,NULL,NULL,1),
('Examen','puntaje_maximo','decimal',NULL,8,2,0),
('Examen','activo','bit',NULL,NULL,NULL,0),
('Examen_Grupo','Cod_examen_grupo','varchar',20,NULL,NULL,0),
('Examen_Grupo','Fech_programada','date',NULL,NULL,NULL,0),
('Examen_Grupo','Hr_inicio','time',NULL,NULL,NULL,0),
('Examen_Grupo','Duracion_minutos','smallint',NULL,NULL,NULL,0),
('Examen_Grupo','Estado','varchar',15,NULL,NULL,0),
('Examen_Grupo','Publicado','bit',NULL,NULL,NULL,0),
('Examen_Grupo','Examen_Cod_Examen','varchar',20,NULL,NULL,0),
('Examen_Grupo','Grupo_Cod_Grupo','varchar',20,NULL,NULL,0),
('Examen_Grupo','ESTADO_EXAMEN_GRUPO_Cod_Estado_Examen','varchar',15,NULL,NULL,0),
('Grupo','Cod_Grupo','varchar',20,NULL,NULL,0),
('Grupo','Nomb_Grupo','varchar',60,NULL,NULL,0),
('Grupo','Cupo_Max','smallint',NULL,NULL,NULL,0),
('Grupo','Activo','bit',NULL,NULL,NULL,0),
('Grupo','Turno_Cod_Turno','varchar',10,NULL,NULL,0),
('Grupo','Aula_Cod_Aula','varchar',10,NULL,NULL,0),
('Grupo','Ciclo_Cod_Ciclo','varchar',20,NULL,NULL,0),
('Horario','Cod_Horario','varchar',20,NULL,NULL,0),
('Horario','Dia_Semana','tinyint',NULL,NULL,NULL,0),
('Horario','Hr_Inicio','time',NULL,NULL,NULL,0),
('Horario','Hr_Fin','time',NULL,NULL,NULL,0),
('Horario','Activo','bit',NULL,NULL,NULL,0),
('Horario','Grupo_Cod_Grupo','varchar',20,NULL,NULL,0),
('Horario','TIPO_BLOQUE_Cod_Tipo','varchar',10,NULL,NULL,0),
('Horario','Docente_Asignatura_CURSOS_Cod_Curso','varchar',10,NULL,NULL,1),
('Horario','Docente_Asignatura_Docente_DNI_Doc','varchar',8,NULL,NULL,1),
('MATRICULA','ALUMNO_DNI_Alu','varchar',8,NULL,NULL,0),
('MATRICULA','Cod_Matricula','varchar',20,NULL,NULL,0),
('MATRICULA','ESTADO_MATRICULA_Cod_Estado_Matricula','varchar',15,NULL,NULL,0),
('MATRICULA','Fech_Matricula','date',NULL,NULL,NULL,0),
('MATRICULA','Observaciones','varchar',250,NULL,NULL,1),
('MATRICULA','Grupo_Cod_Grupo','varchar',20,NULL,NULL,0),
('Nota_Examen','Cod_Nota','varchar',20,NULL,NULL,0),
('Nota_Examen','Puntaje_total','decimal',NULL,8,2,0),
('Nota_Examen','Fech_registro','datetime2',NULL,NULL,NULL,0),
('Nota_Examen','MATRICULA_Cod_Matricula','varchar',20,NULL,NULL,0),
('Nota_Examen','Examen_Grupo_Cod_examen_grupo','varchar',20,NULL,NULL,0),
('Nota_Examen','Grupo_Cod_Grupo','varchar',20,NULL,NULL,0),
('PARENTESCO','Cod_Paren','varchar',5,NULL,NULL,0),
('PARENTESCO','Tipo_Paren','varchar',40,NULL,NULL,0),
('Pago','Cod_Pago','varchar',20,NULL,NULL,0),
('Pago','CONCEPTO_PAGO_Cod_Concepto','varchar',20,NULL,NULL,0),
('Pago','Nro_Mensualidad','tinyint',NULL,NULL,NULL,1),
('Pago','Monto','decimal',NULL,10,2,0),
('Pago','Fech_Vencimiento','date',NULL,NULL,NULL,1),
('Pago','ESTADO_PAGO_Cod_Estado','varchar',10,NULL,NULL,0),
('Pago','Fech_Pago','datetime2',NULL,NULL,NULL,1),
('Pago','Medio_Pago','varchar',10,NULL,NULL,1),
('Pago','Usuario_Cod_Usuario','varchar',20,NULL,NULL,1),
('Pago','ALUMNO_DNI_Alu','varchar',8,NULL,NULL,0),
('Pago','MATRICULA_Cod_Matricula','varchar',20,NULL,NULL,1),
('Programa','Cod_Programa','varchar',20,NULL,NULL,0),
('Programa','Nomb_Programa','varchar',100,NULL,NULL,0),
('Programa','Descripcion','varchar',250,NULL,NULL,1),
('Programa','Activo','bit',NULL,NULL,NULL,0),
('ROL','Cod_Rol','varchar',10,NULL,NULL,0),
('ROL','Nomb_Rol','varchar',60,NULL,NULL,0),
('TIPO_BLOQUE','Cod_Tipo','varchar',10,NULL,NULL,0),
('TIPO_BLOQUE','Nomb_Tipo','varchar',60,NULL,NULL,0),
('Turno','Cod_Turno','varchar',10,NULL,NULL,0),
('Turno','Nomb_Turno','varchar',15,NULL,NULL,0),
('Turno','Hr_Inicio','time',NULL,NULL,NULL,0),
('Turno','Hr_Fin','time',NULL,NULL,NULL,0),
('Usuario','Cod_Usuario','varchar',20,NULL,NULL,0),
('Usuario','Nomb_Usuario','varchar',80,NULL,NULL,0),
('Usuario','Clave_Hash','varchar',255,NULL,NULL,0),
('Usuario','ROL_Cod_Rol','varchar',10,NULL,NULL,0),
('Usuario','Activo','bit',NULL,NULL,NULL,0),
('Usuario','Debe_Cambiar_Clave','bit',NULL,NULL,NULL,0),
('Usuario','ALUMNO_DNI_Alu','varchar',8,NULL,NULL,1);
SELECT e.*,ty.name AS TipoReal,c.max_length AS LongitudReal,c.is_nullable AS NullReal
 FROM @Columnas e LEFT JOIN sys.tables t ON t.name=e.Tabla AND t.schema_id=SCHEMA_ID('dbo')
 LEFT JOIN sys.columns c ON c.object_id=t.object_id AND c.name=e.Columna LEFT JOIN sys.types ty ON ty.user_type_id=c.user_type_id
 WHERE c.column_id IS NULL OR ty.name<>e.Tipo OR c.is_nullable<>e.AdmiteNull
 OR (e.Longitud IS NOT NULL AND c.max_length<>e.Longitud)
 OR (e.PrecisionNum IS NOT NULL AND (c.precision<>e.PrecisionNum OR c.scale<>e.Escala));
SELECT o.name AS ObjetoNecesario,CASE WHEN OBJECT_ID('dbo.'+o.name) IS NULL THEN 'FALTA' ELSE 'OK' END AS Estado FROM (VALUES ('MEDIO_PAGO'),('Auditoria_V4'),('Control_Migracion_V4'),('Linea_Base_V4'),('Seq_Operacion_V4')) o(name);
-- Deben existir los siete scripts de modificación: 00A,01,02,03,04,05,06.
SELECT COUNT(*) AS MigracionesAplicadas FROM dbo.Control_Migracion_V4;
