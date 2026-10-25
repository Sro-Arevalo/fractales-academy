-- V4: ejecutar manualmente, en mantenimiento, después de respaldo verificado.
-- Cambiar SOLO @BaseEsperada por el nombre de la base independiente al ensayar.
SET NOCOUNT ON; SET XACT_ABORT ON;
SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON; SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF;
DECLARE @BaseEsperada sysname=N'FractalesAcademy';
IF DB_NAME()<>@BaseEsperada OR DB_NAME() IN ('master','model','msdb','tempdb')
    THROW 54000, 'Base incorrecta. Verifique servidor y @BaseEsperada; no se hizo ningun cambio.', 1;
BEGIN TRY
BEGIN TRAN;
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

IF EXISTS (SELECT e.*,ty.name AS TipoReal,c.max_length AS LongitudReal,c.is_nullable AS NullReal
 FROM @Columnas e LEFT JOIN sys.tables t ON t.name=e.Tabla AND t.schema_id=SCHEMA_ID('dbo')
 LEFT JOIN sys.columns c ON c.object_id=t.object_id AND c.name=e.Columna LEFT JOIN sys.types ty ON ty.user_type_id=c.user_type_id
 WHERE c.column_id IS NULL OR ty.name<>e.Tipo OR c.is_nullable<>e.AdmiteNull
 OR (e.Longitud IS NOT NULL AND c.max_length<>e.Longitud AND NOT (e.Columna LIKE 'Cel[_]%' AND c.max_length IN (9,15)))
 OR (e.PrecisionNum IS NOT NULL AND (c.precision<>e.PrecisionNum OR c.scale<>e.Escala))) BEGIN
 SELECT e.*,ty.name AS TipoReal,c.max_length AS LongitudReal,c.is_nullable AS NullReal
 FROM @Columnas e LEFT JOIN sys.tables t ON t.name=e.Tabla AND t.schema_id=SCHEMA_ID('dbo')
 LEFT JOIN sys.columns c ON c.object_id=t.object_id AND c.name=e.Columna LEFT JOIN sys.types ty ON ty.user_type_id=c.user_type_id
 WHERE c.column_id IS NULL OR ty.name<>e.Tipo OR c.is_nullable<>e.AdmiteNull
 OR (e.Longitud IS NOT NULL AND c.max_length<>e.Longitud AND NOT (e.Columna LIKE 'Cel[_]%' AND c.max_length IN (9,15)))
 OR (e.PrecisionNum IS NOT NULL AND (c.precision<>e.PrecisionNum OR c.scale<>e.Escala));
 THROW 54002,'El esquema difiere del modelo local. Compare el diagnostico antes de continuar.',1;
END;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID('dbo.ALUMNO') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),',') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)='DNI_Alu')
 THROW 54003,'Clave primaria inesperada en ALUMNO.',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID('dbo.Aula') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),',') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)='Cod_Aula')
 THROW 54003,'Clave primaria inesperada en Aula.',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID('dbo.CARRERA') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),',') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)='Cod_Carrera')
 THROW 54003,'Clave primaria inesperada en CARRERA.',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID('dbo.CONCEPTO_PAGO') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),',') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)='Cod_Concepto')
 THROW 54003,'Clave primaria inesperada en CONCEPTO_PAGO.',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID('dbo.CURSOS') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),',') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)='Cod_Curso')
 THROW 54003,'Clave primaria inesperada en CURSOS.',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID('dbo.Ciclo') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),',') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)='Cod_Ciclo')
 THROW 54003,'Clave primaria inesperada en Ciclo.',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID('dbo.Docente') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),',') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)='DNI_Doc')
 THROW 54003,'Clave primaria inesperada en Docente.',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID('dbo.Docente_Asignatura') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),',') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)='CURSOS_Cod_Curso,Docente_DNI_Doc')
 THROW 54003,'Clave primaria inesperada en Docente_Asignatura.',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID('dbo.ESTADO_CICLO') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),',') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)='Cod_Estado_Ciclo')
 THROW 54003,'Clave primaria inesperada en ESTADO_CICLO.',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID('dbo.ESTADO_EXAMEN_GRUPO') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),',') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)='Cod_Estado_Examen')
 THROW 54003,'Clave primaria inesperada en ESTADO_EXAMEN_GRUPO.',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID('dbo.ESTADO_MATRICULA') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),',') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)='Cod_Estado_Matricula')
 THROW 54003,'Clave primaria inesperada en ESTADO_MATRICULA.',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID('dbo.ESTADO_PAGO') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),',') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)='Cod_Estado')
 THROW 54003,'Clave primaria inesperada en ESTADO_PAGO.',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID('dbo.Examen') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),',') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)='Cod_Examen')
 THROW 54003,'Clave primaria inesperada en Examen.',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID('dbo.Examen_Grupo') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),',') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)='Cod_examen_grupo')
 THROW 54003,'Clave primaria inesperada en Examen_Grupo.',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID('dbo.Grupo') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),',') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)='Cod_Grupo')
 THROW 54003,'Clave primaria inesperada en Grupo.',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID('dbo.Horario') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),',') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)='Cod_Horario')
 THROW 54003,'Clave primaria inesperada en Horario.',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID('dbo.MATRICULA') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),',') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)='Cod_Matricula')
 THROW 54003,'Clave primaria inesperada en MATRICULA.',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID('dbo.Nota_Examen') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),',') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)='Cod_Nota')
 THROW 54003,'Clave primaria inesperada en Nota_Examen.',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID('dbo.PARENTESCO') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),',') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)='Cod_Paren')
 THROW 54003,'Clave primaria inesperada en PARENTESCO.',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID('dbo.Pago') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),',') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)='Cod_Pago')
 THROW 54003,'Clave primaria inesperada en Pago.',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID('dbo.Programa') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),',') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)='Cod_Programa')
 THROW 54003,'Clave primaria inesperada en Programa.',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID('dbo.ROL') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),',') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)='Cod_Rol')
 THROW 54003,'Clave primaria inesperada en ROL.',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID('dbo.TIPO_BLOQUE') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),',') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)='Cod_Tipo')
 THROW 54003,'Clave primaria inesperada en TIPO_BLOQUE.',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID('dbo.Turno') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),',') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)='Cod_Turno')
 THROW 54003,'Clave primaria inesperada en Turno.',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID('dbo.Usuario') AND i.is_primary_key=1 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),',') WITHIN GROUP (ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)='Cod_Usuario')
 THROW 54003,'Clave primaria inesperada en Usuario.',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID('dbo.ALUMNO') AND fk.referenced_object_id=OBJECT_ID('dbo.CARRERA') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+'>'+rc.name),',') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)='CARRERA_Cod_Carrera>Cod_Carrera')
 THROW 54004,'Relacion ausente o inesperada: ALUMNO a CARRERA.',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID('dbo.ALUMNO') AND fk.referenced_object_id=OBJECT_ID('dbo.PARENTESCO') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+'>'+rc.name),',') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)='PARENTESCO_Cod_Paren>Cod_Paren')
 THROW 54004,'Relacion ausente o inesperada: ALUMNO a PARENTESCO.',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID('dbo.Ciclo') AND fk.referenced_object_id=OBJECT_ID('dbo.ESTADO_CICLO') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+'>'+rc.name),',') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)='ESTADO_CICLO_Cod_Estado>Cod_Estado_Ciclo')
 THROW 54004,'Relacion ausente o inesperada: Ciclo a ESTADO_CICLO.',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID('dbo.Ciclo') AND fk.referenced_object_id=OBJECT_ID('dbo.Programa') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+'>'+rc.name),',') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)='Programa_Cod_Programa>Cod_Programa')
 THROW 54004,'Relacion ausente o inesperada: Ciclo a Programa.',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID('dbo.Docente_Asignatura') AND fk.referenced_object_id=OBJECT_ID('dbo.Docente') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+'>'+rc.name),',') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)='Docente_DNI_Doc>DNI_Doc')
 THROW 54004,'Relacion ausente o inesperada: Docente_Asignatura a Docente.',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID('dbo.Docente_Asignatura') AND fk.referenced_object_id=OBJECT_ID('dbo.CURSOS') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+'>'+rc.name),',') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)='CURSOS_Cod_Curso>Cod_Curso')
 THROW 54004,'Relacion ausente o inesperada: Docente_Asignatura a CURSOS.',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID('dbo.Examen_Grupo') AND fk.referenced_object_id=OBJECT_ID('dbo.ESTADO_EXAMEN_GRUPO') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+'>'+rc.name),',') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)='ESTADO_EXAMEN_GRUPO_Cod_Estado_Examen>Cod_Estado_Examen')
 THROW 54004,'Relacion ausente o inesperada: Examen_Grupo a ESTADO_EXAMEN_GRUPO.',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID('dbo.Examen_Grupo') AND fk.referenced_object_id=OBJECT_ID('dbo.Examen') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+'>'+rc.name),',') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)='Examen_Cod_Examen>Cod_Examen')
 THROW 54004,'Relacion ausente o inesperada: Examen_Grupo a Examen.',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID('dbo.Examen_Grupo') AND fk.referenced_object_id=OBJECT_ID('dbo.Grupo') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+'>'+rc.name),',') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)='Grupo_Cod_Grupo>Cod_Grupo')
 THROW 54004,'Relacion ausente o inesperada: Examen_Grupo a Grupo.',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID('dbo.Grupo') AND fk.referenced_object_id=OBJECT_ID('dbo.Aula') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+'>'+rc.name),',') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)='Aula_Cod_Aula>Cod_Aula')
 THROW 54004,'Relacion ausente o inesperada: Grupo a Aula.',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID('dbo.Grupo') AND fk.referenced_object_id=OBJECT_ID('dbo.Ciclo') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+'>'+rc.name),',') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)='Ciclo_Cod_Ciclo>Cod_Ciclo')
 THROW 54004,'Relacion ausente o inesperada: Grupo a Ciclo.',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID('dbo.Grupo') AND fk.referenced_object_id=OBJECT_ID('dbo.Turno') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+'>'+rc.name),',') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)='Turno_Cod_Turno>Cod_Turno')
 THROW 54004,'Relacion ausente o inesperada: Grupo a Turno.',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID('dbo.Horario') AND fk.referenced_object_id=OBJECT_ID('dbo.Docente_Asignatura') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+'>'+rc.name),',') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)='Docente_Asignatura_CURSOS_Cod_Curso>CURSOS_Cod_Curso,Docente_Asignatura_Docente_DNI_Doc>Docente_DNI_Doc')
 THROW 54004,'Relacion ausente o inesperada: Horario a Docente_Asignatura.',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID('dbo.Horario') AND fk.referenced_object_id=OBJECT_ID('dbo.Grupo') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+'>'+rc.name),',') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)='Grupo_Cod_Grupo>Cod_Grupo')
 THROW 54004,'Relacion ausente o inesperada: Horario a Grupo.',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID('dbo.Horario') AND fk.referenced_object_id=OBJECT_ID('dbo.TIPO_BLOQUE') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+'>'+rc.name),',') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)='TIPO_BLOQUE_Cod_Tipo>Cod_Tipo')
 THROW 54004,'Relacion ausente o inesperada: Horario a TIPO_BLOQUE.',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID('dbo.MATRICULA') AND fk.referenced_object_id=OBJECT_ID('dbo.ALUMNO') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+'>'+rc.name),',') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)='ALUMNO_DNI_Alu>DNI_Alu')
 THROW 54004,'Relacion ausente o inesperada: MATRICULA a ALUMNO.',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID('dbo.MATRICULA') AND fk.referenced_object_id=OBJECT_ID('dbo.ESTADO_MATRICULA') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+'>'+rc.name),',') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)='ESTADO_MATRICULA_Cod_Estado_Matricula>Cod_Estado_Matricula')
 THROW 54004,'Relacion ausente o inesperada: MATRICULA a ESTADO_MATRICULA.',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID('dbo.MATRICULA') AND fk.referenced_object_id=OBJECT_ID('dbo.Grupo') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+'>'+rc.name),',') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)='Grupo_Cod_Grupo>Cod_Grupo')
 THROW 54004,'Relacion ausente o inesperada: MATRICULA a Grupo.',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID('dbo.Nota_Examen') AND fk.referenced_object_id=OBJECT_ID('dbo.Examen_Grupo') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+'>'+rc.name),',') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)='Examen_Grupo_Cod_examen_grupo>Cod_examen_grupo,Grupo_Cod_Grupo>Grupo_Cod_Grupo')
 THROW 54004,'Relacion ausente o inesperada: Nota_Examen a Examen_Grupo.',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID('dbo.Nota_Examen') AND fk.referenced_object_id=OBJECT_ID('dbo.MATRICULA') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+'>'+rc.name),',') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)='MATRICULA_Cod_Matricula>Cod_Matricula,Grupo_Cod_Grupo>Grupo_Cod_Grupo')
 THROW 54004,'Relacion ausente o inesperada: Nota_Examen a MATRICULA.',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID('dbo.Pago') AND fk.referenced_object_id=OBJECT_ID('dbo.ALUMNO') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+'>'+rc.name),',') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)='ALUMNO_DNI_Alu>DNI_Alu')
 THROW 54004,'Relacion ausente o inesperada: Pago a ALUMNO.',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID('dbo.Pago') AND fk.referenced_object_id=OBJECT_ID('dbo.CONCEPTO_PAGO') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+'>'+rc.name),',') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)='CONCEPTO_PAGO_Cod_Concepto>Cod_Concepto')
 THROW 54004,'Relacion ausente o inesperada: Pago a CONCEPTO_PAGO.',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID('dbo.Pago') AND fk.referenced_object_id=OBJECT_ID('dbo.ESTADO_PAGO') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+'>'+rc.name),',') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)='ESTADO_PAGO_Cod_Estado>Cod_Estado')
 THROW 54004,'Relacion ausente o inesperada: Pago a ESTADO_PAGO.',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID('dbo.Pago') AND fk.referenced_object_id=OBJECT_ID('dbo.MATRICULA') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+'>'+rc.name),',') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)='MATRICULA_Cod_Matricula>Cod_Matricula,ALUMNO_DNI_Alu>ALUMNO_DNI_Alu')
 THROW 54004,'Relacion ausente o inesperada: Pago a MATRICULA.',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID('dbo.Pago') AND fk.referenced_object_id=OBJECT_ID('dbo.Usuario') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+'>'+rc.name),',') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)='Usuario_Cod_Usuario>Cod_Usuario')
 THROW 54004,'Relacion ausente o inesperada: Pago a Usuario.',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID('dbo.Usuario') AND fk.referenced_object_id=OBJECT_ID('dbo.ALUMNO') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+'>'+rc.name),',') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)='ALUMNO_DNI_Alu>DNI_Alu')
 THROW 54004,'Relacion ausente o inesperada: Usuario a ALUMNO.',1;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID('dbo.Usuario') AND fk.referenced_object_id=OBJECT_ID('dbo.ROL') AND fk.is_disabled=0 AND fk.is_not_trusted=0 AND
 (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+'>'+rc.name),',') WITHIN GROUP (ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)='ROL_Cod_Rol>Cod_Rol')
 THROW 54004,'Relacion ausente o inesperada: Usuario a ROL.',1;
IF OBJECT_ID('dbo.CK_ALUMNO_DNI','C') IS NULL THROW 54009,'Falta restriccion original: CK_ALUMNO_DNI. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.CK_ALUMNO_DNI_Apoderado','C') IS NULL THROW 54009,'Falta restriccion original: CK_ALUMNO_DNI_Apoderado. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.UQ_Aula_Nombre','UQ') IS NULL THROW 54009,'Falta restriccion original: UQ_Aula_Nombre. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.CK_Aula_Capacidad','C') IS NULL THROW 54009,'Falta restriccion original: CK_Aula_Capacidad. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.UQ_CARRERA_Nombre','UQ') IS NULL THROW 54009,'Falta restriccion original: UQ_CARRERA_Nombre. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.UQ_CONCEPTO_PAGO_Nombre','UQ') IS NULL THROW 54009,'Falta restriccion original: UQ_CONCEPTO_PAGO_Nombre. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.CK_CONCEPTO_PAGO_Codigos','C') IS NULL THROW 54009,'Falta restriccion original: CK_CONCEPTO_PAGO_Codigos. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.UQ_CURSOS_Nombre','UQ') IS NULL THROW 54009,'Falta restriccion original: UQ_CURSOS_Nombre. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.UQ_Ciclo_Edicion','UQ') IS NULL THROW 54009,'Falta restriccion original: UQ_Ciclo_Edicion. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.CK_Ciclo_Modalidad','C') IS NULL THROW 54009,'Falta restriccion original: CK_Ciclo_Modalidad. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.CK_Ciclo_Fechas','C') IS NULL THROW 54009,'Falta restriccion original: CK_Ciclo_Fechas. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.CK_Ciclo_Precio','C') IS NULL THROW 54009,'Falta restriccion original: CK_Ciclo_Precio. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.CK_Docente_DNI','C') IS NULL THROW 54009,'Falta restriccion original: CK_Docente_DNI. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.UQ_ESTADO_CICLO_Nombre','UQ') IS NULL THROW 54009,'Falta restriccion original: UQ_ESTADO_CICLO_Nombre. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.CK_ESTADO_CICLO_Codigos','C') IS NULL THROW 54009,'Falta restriccion original: CK_ESTADO_CICLO_Codigos. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.UQ_ESTADO_EXAMEN_GRUPO_Nombre','UQ') IS NULL THROW 54009,'Falta restriccion original: UQ_ESTADO_EXAMEN_GRUPO_Nombre. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.CK_ESTADO_EXAMEN_GRUPO_Codigos','C') IS NULL THROW 54009,'Falta restriccion original: CK_ESTADO_EXAMEN_GRUPO_Codigos. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.UQ_ESTADO_MATRICULA_Nombre','UQ') IS NULL THROW 54009,'Falta restriccion original: UQ_ESTADO_MATRICULA_Nombre. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.CK_ESTADO_MATRICULA_Codigos','C') IS NULL THROW 54009,'Falta restriccion original: CK_ESTADO_MATRICULA_Codigos. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.UQ_ESTADO_PAGO_Nombre','UQ') IS NULL THROW 54009,'Falta restriccion original: UQ_ESTADO_PAGO_Nombre. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.CK_ESTADO_PAGO_Codigos','C') IS NULL THROW 54009,'Falta restriccion original: CK_ESTADO_PAGO_Codigos. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.CK_Examen_Puntaje','C') IS NULL THROW 54009,'Falta restriccion original: CK_Examen_Puntaje. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.UQ_ExamenGrupo_ExamenGrupo','UQ') IS NULL THROW 54009,'Falta restriccion original: UQ_ExamenGrupo_ExamenGrupo. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.UQ_ExamenGrupo_IdGrupo','UQ') IS NULL THROW 54009,'Falta restriccion original: UQ_ExamenGrupo_IdGrupo. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.CK_ExamenGrupo_Duracion','C') IS NULL THROW 54009,'Falta restriccion original: CK_ExamenGrupo_Duracion. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.CK_ExamenGrupo_Estado','C') IS NULL THROW 54009,'Falta restriccion original: CK_ExamenGrupo_Estado. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.UQ_Grupo_Ciclo_Nombre','UQ') IS NULL THROW 54009,'Falta restriccion original: UQ_Grupo_Ciclo_Nombre. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.CK_Grupo_Cupo','C') IS NULL THROW 54009,'Falta restriccion original: CK_Grupo_Cupo. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.CK_Horario_Dia','C') IS NULL THROW 54009,'Falta restriccion original: CK_Horario_Dia. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.CK_Horario_Horas','C') IS NULL THROW 54009,'Falta restriccion original: CK_Horario_Horas. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.CK_Horario_Bloque','C') IS NULL THROW 54009,'Falta restriccion original: CK_Horario_Bloque. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.UQ_Matricula_IdAlumno','UQ') IS NULL THROW 54009,'Falta restriccion original: UQ_Matricula_IdAlumno. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.UQ_Matricula_IdGrupo','UQ') IS NULL THROW 54009,'Falta restriccion original: UQ_Matricula_IdGrupo. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.UQ_Matricula_Alumno_Grupo','UQ') IS NULL THROW 54009,'Falta restriccion original: UQ_Matricula_Alumno_Grupo. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.UQ_Nota_ExamenMatricula','UQ') IS NULL THROW 54009,'Falta restriccion original: UQ_Nota_ExamenMatricula. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.CK_Nota_Puntaje','C') IS NULL THROW 54009,'Falta restriccion original: CK_Nota_Puntaje. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.UQ_PARENTESCO_Tipo','UQ') IS NULL THROW 54009,'Falta restriccion original: UQ_PARENTESCO_Tipo. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.CK_Parentesco_Lista','C') IS NULL THROW 54009,'Falta restriccion original: CK_Parentesco_Lista. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.CK_Pago_Monto','C') IS NULL THROW 54009,'Falta restriccion original: CK_Pago_Monto. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.CK_Pago_Concepto','C') IS NULL THROW 54009,'Falta restriccion original: CK_Pago_Concepto. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.CK_Pago_Medio','C') IS NULL AND OBJECT_ID('dbo.FK_V4_Pago_Medio','F') IS NULL THROW 54009,'Falta restriccion original: CK_Pago_Medio. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.CK_Pago_Estado','C') IS NULL THROW 54009,'Falta restriccion original: CK_Pago_Estado. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.UQ_Programa_Nombre','UQ') IS NULL THROW 54009,'Falta restriccion original: UQ_Programa_Nombre. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.CK_Programa_SoloDos','C') IS NULL THROW 54009,'Falta restriccion original: CK_Programa_SoloDos. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.UQ_ROL_Nombre','UQ') IS NULL THROW 54009,'Falta restriccion original: UQ_ROL_Nombre. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.CK_ROL_Codigos','C') IS NULL THROW 54009,'Falta restriccion original: CK_ROL_Codigos. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.UQ_TIPO_BLOQUE_Nombre','UQ') IS NULL THROW 54009,'Falta restriccion original: UQ_TIPO_BLOQUE_Nombre. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.CK_TIPO_BLOQUE_Codigos','C') IS NULL THROW 54009,'Falta restriccion original: CK_TIPO_BLOQUE_Codigos. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.UQ_Turno_Nombre','UQ') IS NULL THROW 54009,'Falta restriccion original: UQ_Turno_Nombre. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.CK_Turno_DosOpciones','C') IS NULL THROW 54009,'Falta restriccion original: CK_Turno_DosOpciones. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.UQ_Usuario_Nombre','UQ') IS NULL THROW 54009,'Falta restriccion original: UQ_Usuario_Nombre. Comparar el diagnostico antes de continuar.',1;
IF OBJECT_ID('dbo.CK_Usuario_Rol','C') IS NULL THROW 54009,'Falta restriccion original: CK_Usuario_Rol. Comparar el diagnostico antes de continuar.',1;
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
 INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT 'ALUMNO',(SELECT t.[DNI_Alu] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[ALUMNO] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT 'Aula',(SELECT t.[Cod_Aula] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[Aula] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT 'CARRERA',(SELECT t.[Cod_Carrera] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[CARRERA] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT 'CONCEPTO_PAGO',(SELECT t.[Cod_Concepto] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[CONCEPTO_PAGO] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT 'CURSOS',(SELECT t.[Cod_Curso] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[CURSOS] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT 'Ciclo',(SELECT t.[Cod_Ciclo] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[Ciclo] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT 'Docente',(SELECT t.[DNI_Doc] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[Docente] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT 'Docente_Asignatura',(SELECT t.[CURSOS_Cod_Curso],t.[Docente_DNI_Doc] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[Docente_Asignatura] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT 'ESTADO_CICLO',(SELECT t.[Cod_Estado_Ciclo] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[ESTADO_CICLO] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT 'ESTADO_EXAMEN_GRUPO',(SELECT t.[Cod_Estado_Examen] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[ESTADO_EXAMEN_GRUPO] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT 'ESTADO_MATRICULA',(SELECT t.[Cod_Estado_Matricula] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[ESTADO_MATRICULA] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT 'ESTADO_PAGO',(SELECT t.[Cod_Estado] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[ESTADO_PAGO] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT 'Examen',(SELECT t.[Cod_Examen] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[Examen] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT 'Examen_Grupo',(SELECT t.[Cod_examen_grupo] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[Examen_Grupo] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT 'Grupo',(SELECT t.[Cod_Grupo] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[Grupo] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT 'Horario',(SELECT t.[Cod_Horario] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[Horario] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT 'MATRICULA',(SELECT t.[Cod_Matricula] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[MATRICULA] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT 'Nota_Examen',(SELECT t.[Cod_Nota] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[Nota_Examen] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT 'PARENTESCO',(SELECT t.[Cod_Paren] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[PARENTESCO] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT 'Pago',(SELECT t.[Cod_Pago] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[Pago] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT 'Programa',(SELECT t.[Cod_Programa] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[Programa] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT 'ROL',(SELECT t.[Cod_Rol] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[ROL] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT 'TIPO_BLOQUE',(SELECT t.[Cod_Tipo] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[TIPO_BLOQUE] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT 'Turno',(SELECT t.[Cod_Turno] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[Turno] t;
INSERT dbo.Linea_Base_V4 (Tabla,Clave,Huella)
 SELECT 'Usuario',(SELECT t.[Cod_Usuario] FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),
 HASHBYTES('SHA2_256',CONVERT(varbinary(max),(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))) FROM dbo.[Usuario] t;
 INSERT dbo.Control_Migracion_V4 (Script) VALUES ('00A_PREPARACION_Y_LINEA_BASE');
END;
COMMIT;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
SELECT Script,Fecha FROM dbo.Control_Migracion_V4;
