-- V4.1 incremental. Revisar respaldo, mantenimiento y servidor antes de ejecutar.
SET NOCOUNT ON; SET XACT_ABORT ON; SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON; SET ANSI_WARNINGS ON; SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF;
DECLARE @BaseEsperada sysname=N'FractalesAcademy';
IF DB_NAME()<>@BaseEsperada OR DB_NAME() IN ('master','model','msdb','tempdb') THROW 54100,'Base incorrecta. Confirme @BaseEsperada y el servidor.',1;
IF OBJECT_ID('dbo.Control_Migracion_V4') IS NULL OR OBJECT_ID('dbo.Auditoria_V4') IS NULL OR OBJECT_ID('dbo.MEDIO_PAGO') IS NULL
 THROW 54101,'Se requiere completar primero V4. No reconstruya la base.',1;
IF (SELECT COUNT(*) FROM dbo.Control_Migracion_V4 WHERE Script IN ('00A_PREPARACION_Y_LINEA_BASE','01_ACTUALIZACION_CELULARES','02_ACTUALIZACION_MATRICULAS','03_ACTUALIZACION_PAGOS','04_ACTUALIZACION_SIMULACROS','05_ACTUALIZACION_HORARIOS','06_ACTUALIZACION_USUARIOS'))<>7
 THROW 54102,'El registro de migraciones V4 esta incompleto.',1;
IF EXISTS(SELECT 1 FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1) THROW 54103,'Hay relaciones deshabilitadas o no confiables. Revisar antes de continuar.',1;
IF EXISTS(SELECT 1 FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1) THROW 54109,'Hay restricciones CHECK deshabilitadas o no confiables. Revisar sin omitir validaciones.',1;
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='V41_02_VERIFICACION_CONTACTOS') THROW 54104,'Falta la migracion V4.1 anterior.',1;
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='V41_03_ESTADOS_Y_ANULACIONES') AND (OBJECT_ID('dbo.Alumno_Estado_V41') IS NOT NULL OR OBJECT_ID('dbo.Nota_Estado_V41') IS NOT NULL) THROW 54105,'Existe un objeto V4.1 sin registro de esta migracion. Revisar; no se asume propiedad ni se reconstruye.',1;
IF EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='V41_03_ESTADOS_Y_ANULACIONES') AND (OBJECT_ID('dbo.Alumno_Estado_V41') IS NULL OR OBJECT_ID('dbo.Nota_Estado_V41') IS NULL) THROW 54106,'Falta un objeto de una migracion ya aplicada. Revisar recuperacion; no se reconstruye una tabla que pudo tener datos.',1;
BEGIN TRY
 BEGIN TRAN;

-- MATRICULA y Examen_Grupo ya tienen ANULADA/CANCELADO; Pago conserva su anulacion de confirmacion V4.
-- Las dos tablas laterales preservan las claves y el contenido original de alumnos/notas.
IF OBJECT_ID('dbo.Alumno_Estado_V41') IS NULL
 CREATE TABLE dbo.Alumno_Estado_V41 (
 ALUMNO_DNI_Alu varchar(8) NOT NULL CONSTRAINT PK_Alumno_Estado_V41 PRIMARY KEY,
 Activo bit NOT NULL,Usuario_Activo_Anterior bit NULL,Motivo varchar(250) NOT NULL,Usuario_Cod_Usuario varchar(20) NOT NULL,
 Fecha datetime2(0) NOT NULL CONSTRAINT DF_Alumno_Estado_V41_Fecha DEFAULT SYSUTCDATETIME(),
 CONSTRAINT FK_Alumno_Estado_V41_Alumno FOREIGN KEY(ALUMNO_DNI_Alu) REFERENCES dbo.ALUMNO(DNI_Alu),
 CONSTRAINT FK_Alumno_Estado_V41_Usuario FOREIGN KEY(Usuario_Cod_Usuario) REFERENCES dbo.Usuario(Cod_Usuario));
ELSE IF COL_LENGTH('dbo.Alumno_Estado_V41','Usuario_Activo_Anterior') IS NULL THROW 54130,'Alumno_Estado_V41 tiene una estructura inesperada.',1;
IF OBJECT_ID('dbo.Nota_Estado_V41') IS NULL
 CREATE TABLE dbo.Nota_Estado_V41 (
 Nota_Examen_Cod_Nota varchar(20) NOT NULL CONSTRAINT PK_Nota_Estado_V41 PRIMARY KEY,
 Anulada bit NOT NULL,Motivo varchar(250) NOT NULL,Usuario_Cod_Usuario varchar(20) NOT NULL,
 Fecha datetime2(0) NOT NULL CONSTRAINT DF_Nota_Estado_V41_Fecha DEFAULT SYSUTCDATETIME(),
 CONSTRAINT FK_Nota_Estado_V41_Nota FOREIGN KEY(Nota_Examen_Cod_Nota) REFERENCES dbo.Nota_Examen(Cod_Nota),
 CONSTRAINT FK_Nota_Estado_V41_Usuario FOREIGN KEY(Usuario_Cod_Usuario) REFERENCES dbo.Usuario(Cod_Usuario));
ELSE IF COL_LENGTH('dbo.Nota_Estado_V41','Anulada') IS NULL THROW 54131,'Nota_Estado_V41 tiene una estructura inesperada.',1;
-- No se desactiva, anula ni restaura ningun registro durante la migracion.

DECLARE @Esperadas TABLE(Tabla sysname,Columna sysname,Tipo sysname,Longitud int,AdmiteNull bit,Identidad bit,Escala int);
INSERT @Esperadas VALUES ('Alumno_Estado_V41','ALUMNO_DNI_Alu','varchar',8,0,0,NULL),
('Alumno_Estado_V41','Activo','bit',NULL,0,0,NULL),
('Alumno_Estado_V41','Usuario_Activo_Anterior','bit',NULL,1,0,NULL),
('Alumno_Estado_V41','Motivo','varchar',250,0,0,NULL),
('Alumno_Estado_V41','Usuario_Cod_Usuario','varchar',20,0,0,NULL),
('Alumno_Estado_V41','Fecha','datetime2',NULL,0,0,0),
('Nota_Estado_V41','Nota_Examen_Cod_Nota','varchar',20,0,0,NULL),
('Nota_Estado_V41','Anulada','bit',NULL,0,0,NULL),
('Nota_Estado_V41','Motivo','varchar',250,0,0,NULL),
('Nota_Estado_V41','Usuario_Cod_Usuario','varchar',20,0,0,NULL),
('Nota_Estado_V41','Fecha','datetime2',NULL,0,0,0);
IF EXISTS(SELECT 1 FROM @Esperadas e LEFT JOIN sys.columns c ON c.object_id=OBJECT_ID('dbo.'+e.Tabla) AND c.name=e.Columna LEFT JOIN sys.types ty ON ty.user_type_id=c.user_type_id WHERE c.column_id IS NULL OR ty.name<>e.Tipo OR c.is_nullable<>e.AdmiteNull OR c.is_identity<>e.Identidad OR (e.Longitud IS NOT NULL AND c.max_length<>e.Longitud) OR (e.Escala IS NOT NULL AND c.scale<>e.Escala))
 THROW 54107,'Tipos, longitudes, nulabilidad o identidad inesperados en las tablas V4.1. No se alteraron datos.',1;
IF OBJECT_ID('dbo.PK_Alumno_Estado_V41','PK') IS NULL THROW 54108,'Falta la restriccion V4.1 PK_Alumno_Estado_V41. Revisar antes de continuar.',1;
IF OBJECT_ID('dbo.FK_Alumno_Estado_V41_Alumno','F') IS NULL THROW 54108,'Falta la restriccion V4.1 FK_Alumno_Estado_V41_Alumno. Revisar antes de continuar.',1;
IF OBJECT_ID('dbo.FK_Alumno_Estado_V41_Usuario','F') IS NULL THROW 54108,'Falta la restriccion V4.1 FK_Alumno_Estado_V41_Usuario. Revisar antes de continuar.',1;
IF OBJECT_ID('dbo.PK_Nota_Estado_V41','PK') IS NULL THROW 54108,'Falta la restriccion V4.1 PK_Nota_Estado_V41. Revisar antes de continuar.',1;
IF OBJECT_ID('dbo.FK_Nota_Estado_V41_Nota','F') IS NULL THROW 54108,'Falta la restriccion V4.1 FK_Nota_Estado_V41_Nota. Revisar antes de continuar.',1;
IF OBJECT_ID('dbo.FK_Nota_Estado_V41_Usuario','F') IS NULL THROW 54108,'Falta la restriccion V4.1 FK_Nota_Estado_V41_Usuario. Revisar antes de continuar.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='V41_03_ESTADOS_Y_ANULACIONES') INSERT dbo.Control_Migracion_V4(Script) VALUES ('V41_03_ESTADOS_Y_ANULACIONES');
 COMMIT;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
SELECT Script,Fecha FROM dbo.Control_Migracion_V4 WHERE Script LIKE 'V41[_]%' ORDER BY Script;
