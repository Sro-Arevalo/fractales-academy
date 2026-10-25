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
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='V41_01_RECUPERACION_CUENTAS') THROW 54104,'Falta la migracion V4.1 anterior.',1;
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='V41_02_VERIFICACION_CONTACTOS') AND (OBJECT_ID('dbo.Contacto_Verificado_V41') IS NOT NULL OR OBJECT_ID('dbo.Solicitud_Contacto_V41') IS NOT NULL) THROW 54105,'Existe un objeto V4.1 sin registro de esta migracion. Revisar; no se asume propiedad ni se reconstruye.',1;
IF EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='V41_02_VERIFICACION_CONTACTOS') AND (OBJECT_ID('dbo.Contacto_Verificado_V41') IS NULL OR OBJECT_ID('dbo.Solicitud_Contacto_V41') IS NULL) THROW 54106,'Falta un objeto de una migracion ya aplicada. Revisar recuperacion; no se reconstruye una tabla que pudo tener datos.',1;
BEGIN TRY
 BEGIN TRAN;

IF OBJECT_ID('dbo.Contacto_Verificado_V41') IS NULL
 CREATE TABLE dbo.Contacto_Verificado_V41 (
 Id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_Contacto_Verificado_V41 PRIMARY KEY,
 ALUMNO_DNI_Alu varchar(8) NOT NULL,Tipo varchar(7) NOT NULL,Destino varchar(150) NOT NULL,
 Activo bit NOT NULL CONSTRAINT DF_Contacto_V41_Activo DEFAULT(1),Metodo varchar(12) NOT NULL,
 Usuario_Cod_Usuario varchar(20) NOT NULL,Verificado datetime2(0) NOT NULL CONSTRAINT DF_Contacto_V41_Fecha DEFAULT SYSUTCDATETIME(),
 CONSTRAINT FK_Contacto_V41_Alumno FOREIGN KEY(ALUMNO_DNI_Alu) REFERENCES dbo.ALUMNO(DNI_Alu),
 CONSTRAINT FK_Contacto_V41_Usuario FOREIGN KEY(Usuario_Cod_Usuario) REFERENCES dbo.Usuario(Cod_Usuario),
 CONSTRAINT CK_Contacto_V41_Tipo CHECK(Tipo IN ('EMAIL','SMS')),
 CONSTRAINT CK_Contacto_V41_Metodo CHECK(Metodo IN ('CODIGO','PRESENCIAL')),
 CONSTRAINT CK_Contacto_V41_Destino CHECK((Tipo='SMS' AND DATALENGTH(Destino)=9 AND Destino COLLATE Latin1_General_100_BIN2 NOT LIKE '%[^0-9]%') OR (Tipo='EMAIL' AND Destino LIKE '%_@_%._%' AND Destino NOT LIKE '% %')));
ELSE IF COL_LENGTH('dbo.Contacto_Verificado_V41','Destino')<>150 OR COL_LENGTH('dbo.Contacto_Verificado_V41','Activo') IS NULL
 THROW 54120,'Contacto_Verificado_V41 tiene una estructura inesperada.',1;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Contacto_Verificado_V41') AND name='UX_Contacto_V41_Actual')
 CREATE UNIQUE INDEX UX_Contacto_V41_Actual ON dbo.Contacto_Verificado_V41(ALUMNO_DNI_Alu,Tipo) WHERE Activo=1;
IF OBJECT_ID('dbo.Solicitud_Contacto_V41') IS NULL
 CREATE TABLE dbo.Solicitud_Contacto_V41 (
 Id uniqueidentifier NOT NULL CONSTRAINT PK_Solicitud_Contacto_V41 PRIMARY KEY,ALUMNO_DNI_Alu varchar(8) NOT NULL,
 Tipo varchar(7) NOT NULL,Destino varchar(150) NOT NULL,Estado varchar(20) NOT NULL,Codigo_Id uniqueidentifier NULL,
 Creado datetime2(0) NOT NULL CONSTRAINT DF_Solicitud_V41_Creado DEFAULT SYSUTCDATETIME(),Resuelto datetime2(0) NULL,
 Usuario_Cod_Usuario varchar(20) NULL,Motivo varchar(250) NULL,
 CONSTRAINT FK_Solicitud_V41_Alumno FOREIGN KEY(ALUMNO_DNI_Alu) REFERENCES dbo.ALUMNO(DNI_Alu),
 CONSTRAINT FK_Solicitud_V41_Codigo FOREIGN KEY(Codigo_Id) REFERENCES dbo.Cuenta_Codigo_V41(Id),
 CONSTRAINT FK_Solicitud_V41_Usuario FOREIGN KEY(Usuario_Cod_Usuario) REFERENCES dbo.Usuario(Cod_Usuario),
 CONSTRAINT CK_Solicitud_V41_Tipo CHECK(Tipo IN ('EMAIL','SMS')),
 CONSTRAINT CK_Solicitud_V41_Estado CHECK(Estado IN ('PENDIENTE','PENDIENTE_ADMIN','VERIFICADA','APROBADA','RECHAZADA','REEMPLAZADA')));
ELSE IF COL_LENGTH('dbo.Solicitud_Contacto_V41','Codigo_Id') IS NULL OR COL_LENGTH('dbo.Solicitud_Contacto_V41','Estado')<>20
 THROW 54121,'Solicitud_Contacto_V41 tiene una estructura inesperada.',1;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Solicitud_Contacto_V41') AND name='IX_Solicitud_V41_AlumnoFecha')
 CREATE INDEX IX_Solicitud_V41_AlumnoFecha ON dbo.Solicitud_Contacto_V41(ALUMNO_DNI_Alu,Creado) INCLUDE(Estado);
-- La lectura de contactos exige coincidencia con ALUMNO. Este trigger invalida verificaciones al editar contactos por cualquier ruta.
EXEC sys.sp_executesql N'CREATE OR ALTER TRIGGER dbo.TR_V41_Alumno_Contacto ON dbo.ALUMNO AFTER UPDATE AS
BEGIN SET NOCOUNT ON;
 UPDATE c SET Activo=0 FROM dbo.Contacto_Verificado_V41 c JOIN inserted i ON i.DNI_Alu=c.ALUMNO_DNI_Alu
 WHERE c.Activo=1 AND ((c.Tipo=''EMAIL'' AND (i.Correo_Alu IS NULL OR c.Destino<>i.Correo_Alu)) OR (c.Tipo=''SMS'' AND (i.Cel_Alu IS NULL OR c.Destino<>i.Cel_Alu)));
END;';
-- No se marca ningun contacto preexistente como verificado.

DECLARE @Esperadas TABLE(Tabla sysname,Columna sysname,Tipo sysname,Longitud int,AdmiteNull bit,Identidad bit,Escala int);
INSERT @Esperadas VALUES ('Contacto_Verificado_V41','Id','bigint',NULL,0,1,NULL),
('Contacto_Verificado_V41','ALUMNO_DNI_Alu','varchar',8,0,0,NULL),
('Contacto_Verificado_V41','Tipo','varchar',7,0,0,NULL),
('Contacto_Verificado_V41','Destino','varchar',150,0,0,NULL),
('Contacto_Verificado_V41','Activo','bit',NULL,0,0,NULL),
('Contacto_Verificado_V41','Metodo','varchar',12,0,0,NULL),
('Contacto_Verificado_V41','Usuario_Cod_Usuario','varchar',20,0,0,NULL),
('Contacto_Verificado_V41','Verificado','datetime2',NULL,0,0,0),
('Solicitud_Contacto_V41','Id','uniqueidentifier',NULL,0,0,NULL),
('Solicitud_Contacto_V41','ALUMNO_DNI_Alu','varchar',8,0,0,NULL),
('Solicitud_Contacto_V41','Tipo','varchar',7,0,0,NULL),
('Solicitud_Contacto_V41','Destino','varchar',150,0,0,NULL),
('Solicitud_Contacto_V41','Estado','varchar',20,0,0,NULL),
('Solicitud_Contacto_V41','Codigo_Id','uniqueidentifier',NULL,1,0,NULL),
('Solicitud_Contacto_V41','Creado','datetime2',NULL,0,0,0),
('Solicitud_Contacto_V41','Resuelto','datetime2',NULL,1,0,0),
('Solicitud_Contacto_V41','Usuario_Cod_Usuario','varchar',20,1,0,NULL),
('Solicitud_Contacto_V41','Motivo','varchar',250,1,0,NULL);
IF EXISTS(SELECT 1 FROM @Esperadas e LEFT JOIN sys.columns c ON c.object_id=OBJECT_ID('dbo.'+e.Tabla) AND c.name=e.Columna LEFT JOIN sys.types ty ON ty.user_type_id=c.user_type_id WHERE c.column_id IS NULL OR ty.name<>e.Tipo OR c.is_nullable<>e.AdmiteNull OR c.is_identity<>e.Identidad OR (e.Longitud IS NOT NULL AND c.max_length<>e.Longitud) OR (e.Escala IS NOT NULL AND c.scale<>e.Escala))
 THROW 54107,'Tipos, longitudes, nulabilidad o identidad inesperados en las tablas V4.1. No se alteraron datos.',1;
IF OBJECT_ID('dbo.PK_Contacto_Verificado_V41','PK') IS NULL THROW 54108,'Falta la restriccion V4.1 PK_Contacto_Verificado_V41. Revisar antes de continuar.',1;
IF OBJECT_ID('dbo.FK_Contacto_V41_Alumno','F') IS NULL THROW 54108,'Falta la restriccion V4.1 FK_Contacto_V41_Alumno. Revisar antes de continuar.',1;
IF OBJECT_ID('dbo.FK_Contacto_V41_Usuario','F') IS NULL THROW 54108,'Falta la restriccion V4.1 FK_Contacto_V41_Usuario. Revisar antes de continuar.',1;
IF OBJECT_ID('dbo.CK_Contacto_V41_Tipo','C') IS NULL THROW 54108,'Falta la restriccion V4.1 CK_Contacto_V41_Tipo. Revisar antes de continuar.',1;
IF OBJECT_ID('dbo.CK_Contacto_V41_Metodo','C') IS NULL THROW 54108,'Falta la restriccion V4.1 CK_Contacto_V41_Metodo. Revisar antes de continuar.',1;
IF OBJECT_ID('dbo.CK_Contacto_V41_Destino','C') IS NULL THROW 54108,'Falta la restriccion V4.1 CK_Contacto_V41_Destino. Revisar antes de continuar.',1;
IF OBJECT_ID('dbo.PK_Solicitud_Contacto_V41','PK') IS NULL THROW 54108,'Falta la restriccion V4.1 PK_Solicitud_Contacto_V41. Revisar antes de continuar.',1;
IF OBJECT_ID('dbo.FK_Solicitud_V41_Alumno','F') IS NULL THROW 54108,'Falta la restriccion V4.1 FK_Solicitud_V41_Alumno. Revisar antes de continuar.',1;
IF OBJECT_ID('dbo.FK_Solicitud_V41_Codigo','F') IS NULL THROW 54108,'Falta la restriccion V4.1 FK_Solicitud_V41_Codigo. Revisar antes de continuar.',1;
IF OBJECT_ID('dbo.FK_Solicitud_V41_Usuario','F') IS NULL THROW 54108,'Falta la restriccion V4.1 FK_Solicitud_V41_Usuario. Revisar antes de continuar.',1;
IF OBJECT_ID('dbo.CK_Solicitud_V41_Tipo','C') IS NULL THROW 54108,'Falta la restriccion V4.1 CK_Solicitud_V41_Tipo. Revisar antes de continuar.',1;
IF OBJECT_ID('dbo.CK_Solicitud_V41_Estado','C') IS NULL THROW 54108,'Falta la restriccion V4.1 CK_Solicitud_V41_Estado. Revisar antes de continuar.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='V41_02_VERIFICACION_CONTACTOS') INSERT dbo.Control_Migracion_V4(Script) VALUES ('V41_02_VERIFICACION_CONTACTOS');
 COMMIT;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
SELECT Script,Fecha FROM dbo.Control_Migracion_V4 WHERE Script LIKE 'V41[_]%' ORDER BY Script;
