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
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='V41_01_RECUPERACION_CUENTAS') AND (OBJECT_ID('dbo.Usuario_Seguridad_V41') IS NOT NULL OR OBJECT_ID('dbo.Cuenta_Codigo_V41') IS NOT NULL) THROW 54105,'Existe un objeto V4.1 sin registro de esta migracion. Revisar; no se asume propiedad ni se reconstruye.',1;
IF EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='V41_01_RECUPERACION_CUENTAS') AND (OBJECT_ID('dbo.Usuario_Seguridad_V41') IS NULL OR OBJECT_ID('dbo.Cuenta_Codigo_V41') IS NULL) THROW 54106,'Falta un objeto de una migracion ya aplicada. Revisar recuperacion; no se reconstruye una tabla que pudo tener datos.',1;
BEGIN TRY
 BEGIN TRAN;

-- Estructuras laterales: no cambian claves, nombres ni sesiones de las cuentas existentes.
IF EXISTS(SELECT 1 FROM dbo.Usuario WHERE ROL_Cod_Rol NOT IN ('ADMIN','ALUMNO')) THROW 54110,'Hay roles ajenos a ADMIN/ALUMNO; revisar sin eliminarlos.',1;
IF OBJECT_ID('dbo.Usuario_Seguridad_V41') IS NULL
 CREATE TABLE dbo.Usuario_Seguridad_V41 (
 Usuario_Cod_Usuario varchar(20) NOT NULL CONSTRAINT PK_Usuario_Seguridad_V41 PRIMARY KEY,
 Version_Sesion int NOT NULL CONSTRAINT DF_Seguridad_V41_Version DEFAULT(0),
 Activacion_Requerida bit NOT NULL CONSTRAINT DF_Seguridad_V41_Activacion DEFAULT(0),
 CONSTRAINT FK_Seguridad_V41_Usuario FOREIGN KEY(Usuario_Cod_Usuario) REFERENCES dbo.Usuario(Cod_Usuario),
 CONSTRAINT CK_Seguridad_V41_Version CHECK(Version_Sesion>=0));
ELSE IF COL_LENGTH('dbo.Usuario_Seguridad_V41','Version_Sesion') IS NULL OR COL_LENGTH('dbo.Usuario_Seguridad_V41','Activacion_Requerida') IS NULL
 THROW 54111,'Usuario_Seguridad_V41 tiene una estructura inesperada.',1;
IF OBJECT_ID('dbo.Cuenta_Codigo_V41') IS NULL
 CREATE TABLE dbo.Cuenta_Codigo_V41 (
 Id uniqueidentifier NOT NULL CONSTRAINT PK_Cuenta_Codigo_V41 PRIMARY KEY,
 Usuario_Cod_Usuario varchar(20) NOT NULL,Proposito varchar(20) NOT NULL,Canal varchar(7) NOT NULL,Destino varchar(150) NULL,
 Nonce char(32) NOT NULL,Codigo_Hash char(64) NOT NULL,Desafio_Hash char(64) NULL,
 Expira datetime2(0) NOT NULL,Intentos tinyint NOT NULL CONSTRAINT DF_Codigo_V41_Intentos DEFAULT(0),
 Consumido bit NOT NULL CONSTRAINT DF_Codigo_V41_Consumido DEFAULT(0),Creado datetime2(0) NOT NULL CONSTRAINT DF_Codigo_V41_Creado DEFAULT SYSUTCDATETIME(),
 CONSTRAINT FK_Codigo_V41_Usuario FOREIGN KEY(Usuario_Cod_Usuario) REFERENCES dbo.Usuario(Cod_Usuario),
 CONSTRAINT CK_Codigo_V41_Proposito CHECK(Proposito IN ('ACTIVACION','RECUPERACION','VERIFICAR_CONTACTO')),
 CONSTRAINT CK_Codigo_V41_Canal CHECK(Canal IN ('EMAIL','SMS','DIRECTO')),
 CONSTRAINT CK_Codigo_V41_Intentos CHECK(Intentos<=5),
 CONSTRAINT CK_Codigo_V41_Hash CHECK(DATALENGTH(Codigo_Hash)=64 AND Codigo_Hash COLLATE Latin1_General_100_BIN2 NOT LIKE '%[^0-9a-f]%' AND DATALENGTH(Nonce)=32 AND Nonce COLLATE Latin1_General_100_BIN2 NOT LIKE '%[^0-9a-f]%'
 AND (Desafio_Hash IS NULL OR (DATALENGTH(Desafio_Hash)=64 AND Desafio_Hash COLLATE Latin1_General_100_BIN2 NOT LIKE '%[^0-9a-f]%'))),
 CONSTRAINT CK_Codigo_V41_Fechas CHECK(Expira>Creado));
ELSE IF COL_LENGTH('dbo.Cuenta_Codigo_V41','Codigo_Hash')<>64 OR COL_LENGTH('dbo.Cuenta_Codigo_V41','Nonce')<>32 OR COL_LENGTH('dbo.Cuenta_Codigo_V41','Desafio_Hash') IS NULL
 THROW 54112,'Cuenta_Codigo_V41 tiene una estructura inesperada.',1;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Cuenta_Codigo_V41') AND name='UX_Codigo_V41_Pendiente')
 CREATE UNIQUE INDEX UX_Codigo_V41_Pendiente ON dbo.Cuenta_Codigo_V41(Usuario_Cod_Usuario,Proposito) WHERE Consumido=0;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Cuenta_Codigo_V41') AND name='IX_Codigo_V41_Limites')
 CREATE INDEX IX_Codigo_V41_Limites ON dbo.Cuenta_Codigo_V41(Usuario_Cod_Usuario,Proposito,Creado) INCLUDE(Expira,Intentos,Consumido);
-- No se insertan codigos ni filas para cuentas antiguas.

DECLARE @Esperadas TABLE(Tabla sysname,Columna sysname,Tipo sysname,Longitud int,AdmiteNull bit,Identidad bit,Escala int);
INSERT @Esperadas VALUES ('Usuario_Seguridad_V41','Usuario_Cod_Usuario','varchar',20,0,0,NULL),
('Usuario_Seguridad_V41','Version_Sesion','int',NULL,0,0,NULL),
('Usuario_Seguridad_V41','Activacion_Requerida','bit',NULL,0,0,NULL),
('Cuenta_Codigo_V41','Id','uniqueidentifier',NULL,0,0,NULL),
('Cuenta_Codigo_V41','Usuario_Cod_Usuario','varchar',20,0,0,NULL),
('Cuenta_Codigo_V41','Proposito','varchar',20,0,0,NULL),
('Cuenta_Codigo_V41','Canal','varchar',7,0,0,NULL),
('Cuenta_Codigo_V41','Destino','varchar',150,1,0,NULL),
('Cuenta_Codigo_V41','Nonce','char',32,0,0,NULL),
('Cuenta_Codigo_V41','Codigo_Hash','char',64,0,0,NULL),
('Cuenta_Codigo_V41','Desafio_Hash','char',64,1,0,NULL),
('Cuenta_Codigo_V41','Expira','datetime2',NULL,0,0,0),
('Cuenta_Codigo_V41','Consumido','bit',NULL,0,0,NULL),
('Cuenta_Codigo_V41','Creado','datetime2',NULL,0,0,0);
IF EXISTS(SELECT 1 FROM @Esperadas e LEFT JOIN sys.columns c ON c.object_id=OBJECT_ID('dbo.'+e.Tabla) AND c.name=e.Columna LEFT JOIN sys.types ty ON ty.user_type_id=c.user_type_id WHERE c.column_id IS NULL OR ty.name<>e.Tipo OR c.is_nullable<>e.AdmiteNull OR c.is_identity<>e.Identidad OR (e.Longitud IS NOT NULL AND c.max_length<>e.Longitud) OR (e.Escala IS NOT NULL AND c.scale<>e.Escala))
 THROW 54107,'Tipos, longitudes, nulabilidad o identidad inesperados en las tablas V4.1. No se alteraron datos.',1;
IF OBJECT_ID('dbo.PK_Usuario_Seguridad_V41','PK') IS NULL THROW 54108,'Falta la restriccion V4.1 PK_Usuario_Seguridad_V41. Revisar antes de continuar.',1;
IF OBJECT_ID('dbo.FK_Seguridad_V41_Usuario','F') IS NULL THROW 54108,'Falta la restriccion V4.1 FK_Seguridad_V41_Usuario. Revisar antes de continuar.',1;
IF OBJECT_ID('dbo.CK_Seguridad_V41_Version','C') IS NULL THROW 54108,'Falta la restriccion V4.1 CK_Seguridad_V41_Version. Revisar antes de continuar.',1;
IF OBJECT_ID('dbo.PK_Cuenta_Codigo_V41','PK') IS NULL THROW 54108,'Falta la restriccion V4.1 PK_Cuenta_Codigo_V41. Revisar antes de continuar.',1;
IF OBJECT_ID('dbo.FK_Codigo_V41_Usuario','F') IS NULL THROW 54108,'Falta la restriccion V4.1 FK_Codigo_V41_Usuario. Revisar antes de continuar.',1;
IF OBJECT_ID('dbo.CK_Codigo_V41_Proposito','C') IS NULL THROW 54108,'Falta la restriccion V4.1 CK_Codigo_V41_Proposito. Revisar antes de continuar.',1;
IF OBJECT_ID('dbo.CK_Codigo_V41_Canal','C') IS NULL THROW 54108,'Falta la restriccion V4.1 CK_Codigo_V41_Canal. Revisar antes de continuar.',1;
IF OBJECT_ID('dbo.CK_Codigo_V41_Intentos','C') IS NULL THROW 54108,'Falta la restriccion V4.1 CK_Codigo_V41_Intentos. Revisar antes de continuar.',1;
IF OBJECT_ID('dbo.CK_Codigo_V41_Hash','C') IS NULL THROW 54108,'Falta la restriccion V4.1 CK_Codigo_V41_Hash. Revisar antes de continuar.',1;
IF OBJECT_ID('dbo.CK_Codigo_V41_Fechas','C') IS NULL THROW 54108,'Falta la restriccion V4.1 CK_Codigo_V41_Fechas. Revisar antes de continuar.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='V41_01_RECUPERACION_CUENTAS') INSERT dbo.Control_Migracion_V4(Script) VALUES ('V41_01_RECUPERACION_CUENTAS');
 COMMIT;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
SELECT Script,Fecha FROM dbo.Control_Migracion_V4 WHERE Script LIKE 'V41[_]%' ORDER BY Script;
