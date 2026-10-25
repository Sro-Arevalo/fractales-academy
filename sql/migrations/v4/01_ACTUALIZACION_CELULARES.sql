-- V4: ejecutar manualmente, en mantenimiento, después de respaldo verificado.
-- Cambiar SOLO @BaseEsperada por el nombre de la base independiente al ensayar.
SET NOCOUNT ON; SET XACT_ABORT ON;
SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON; SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF;
DECLARE @BaseEsperada sysname=N'FractalesAcademy';
IF DB_NAME()<>@BaseEsperada OR DB_NAME() IN ('master','model','msdb','tempdb')
    THROW 54000, 'Base incorrecta. Verifique servidor y @BaseEsperada; no se hizo ningun cambio.', 1;
IF OBJECT_ID('dbo.Control_Migracion_V4') IS NULL OR OBJECT_ID('dbo.Linea_Base_V4') IS NULL OR OBJECT_ID('dbo.Auditoria_V4') IS NULL OR OBJECT_ID('dbo.Seq_Operacion_V4','SO') IS NULL THROW 54001, 'Ejecute primero 00A_PREPARACION_Y_LINEA_BASE.sql.',1;
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='00A_PREPARACION_Y_LINEA_BASE') THROW 54001,'Preparacion V4 incompleta.',1;
BEGIN TRY
BEGIN TRAN;
IF EXISTS (SELECT 1 FROM dbo.[ALUMNO] WHERE [Cel_Alu] IS NOT NULL AND (DATALENGTH(CONVERT(varchar(max),[Cel_Alu]))<>9 OR CONVERT(varchar(max),[Cel_Alu]) COLLATE Latin1_General_100_BIN2 LIKE '%[^0-9]%'))
 BEGIN
 SELECT 'ALUMNO.Cel_Alu' AS Campo,[DNI_Alu] AS DNI,[Cel_Alu] AS Valor FROM dbo.[ALUMNO] WHERE [Cel_Alu] IS NOT NULL AND (DATALENGTH(CONVERT(varchar(max),[Cel_Alu]))<>9 OR CONVERT(varchar(max),[Cel_Alu]) COLLATE Latin1_General_100_BIN2 LIKE '%[^0-9]%');
SELECT 'ALUMNO.Cel_Apoderado' AS Campo,[DNI_Alu] AS DNI,[Cel_Apoderado] AS Valor FROM dbo.[ALUMNO] WHERE [Cel_Apoderado] IS NOT NULL AND (DATALENGTH(CONVERT(varchar(max),[Cel_Apoderado]))<>9 OR CONVERT(varchar(max),[Cel_Apoderado]) COLLATE Latin1_General_100_BIN2 LIKE '%[^0-9]%');
SELECT 'Docente.Cel_Doc' AS Campo,[DNI_Doc] AS DNI,[Cel_Doc] AS Valor FROM dbo.[Docente] WHERE ([Cel_Doc] IS NULL OR DATALENGTH(CONVERT(varchar(max),[Cel_Doc]))<>9 OR CONVERT(varchar(max),[Cel_Doc]) COLLATE Latin1_General_100_BIN2 LIKE '%[^0-9]%');
 THROW 54010,'Celulares incompatibles. No se truncaron ni corrigieron valores; solicitar correccion autorizada.',1;
 END;
IF COL_LENGTH('dbo.ALUMNO','Cel_Alu')<>9 ALTER TABLE dbo.[ALUMNO] ALTER COLUMN [Cel_Alu] varchar(9) NULL;
IF OBJECT_ID('dbo.CK_V4_ALUMNO_Cel_Alu','C') IS NULL
 ALTER TABLE dbo.[ALUMNO] WITH CHECK ADD CONSTRAINT [CK_V4_ALUMNO_Cel_Alu] CHECK ([Cel_Alu] IS NULL OR (DATALENGTH([Cel_Alu])=9 AND [Cel_Alu] COLLATE Latin1_General_100_BIN2 NOT LIKE '%[^0-9]%'));
ALTER TABLE dbo.[ALUMNO] WITH CHECK CHECK CONSTRAINT [CK_V4_ALUMNO_Cel_Alu];
IF EXISTS (SELECT 1 FROM dbo.[ALUMNO] WHERE [Cel_Apoderado] IS NOT NULL AND (DATALENGTH(CONVERT(varchar(max),[Cel_Apoderado]))<>9 OR CONVERT(varchar(max),[Cel_Apoderado]) COLLATE Latin1_General_100_BIN2 LIKE '%[^0-9]%'))
 BEGIN
 SELECT 'ALUMNO.Cel_Alu' AS Campo,[DNI_Alu] AS DNI,[Cel_Alu] AS Valor FROM dbo.[ALUMNO] WHERE [Cel_Alu] IS NOT NULL AND (DATALENGTH(CONVERT(varchar(max),[Cel_Alu]))<>9 OR CONVERT(varchar(max),[Cel_Alu]) COLLATE Latin1_General_100_BIN2 LIKE '%[^0-9]%');
SELECT 'ALUMNO.Cel_Apoderado' AS Campo,[DNI_Alu] AS DNI,[Cel_Apoderado] AS Valor FROM dbo.[ALUMNO] WHERE [Cel_Apoderado] IS NOT NULL AND (DATALENGTH(CONVERT(varchar(max),[Cel_Apoderado]))<>9 OR CONVERT(varchar(max),[Cel_Apoderado]) COLLATE Latin1_General_100_BIN2 LIKE '%[^0-9]%');
SELECT 'Docente.Cel_Doc' AS Campo,[DNI_Doc] AS DNI,[Cel_Doc] AS Valor FROM dbo.[Docente] WHERE ([Cel_Doc] IS NULL OR DATALENGTH(CONVERT(varchar(max),[Cel_Doc]))<>9 OR CONVERT(varchar(max),[Cel_Doc]) COLLATE Latin1_General_100_BIN2 LIKE '%[^0-9]%');
 THROW 54010,'Celulares incompatibles. No se truncaron ni corrigieron valores; solicitar correccion autorizada.',1;
 END;
IF COL_LENGTH('dbo.ALUMNO','Cel_Apoderado')<>9 ALTER TABLE dbo.[ALUMNO] ALTER COLUMN [Cel_Apoderado] varchar(9) NULL;
IF OBJECT_ID('dbo.CK_V4_ALUMNO_Cel_Apoderado','C') IS NULL
 ALTER TABLE dbo.[ALUMNO] WITH CHECK ADD CONSTRAINT [CK_V4_ALUMNO_Cel_Apoderado] CHECK ([Cel_Apoderado] IS NULL OR (DATALENGTH([Cel_Apoderado])=9 AND [Cel_Apoderado] COLLATE Latin1_General_100_BIN2 NOT LIKE '%[^0-9]%'));
ALTER TABLE dbo.[ALUMNO] WITH CHECK CHECK CONSTRAINT [CK_V4_ALUMNO_Cel_Apoderado];
IF EXISTS (SELECT 1 FROM dbo.[Docente] WHERE ([Cel_Doc] IS NULL OR DATALENGTH(CONVERT(varchar(max),[Cel_Doc]))<>9 OR CONVERT(varchar(max),[Cel_Doc]) COLLATE Latin1_General_100_BIN2 LIKE '%[^0-9]%'))
 BEGIN
 SELECT 'ALUMNO.Cel_Alu' AS Campo,[DNI_Alu] AS DNI,[Cel_Alu] AS Valor FROM dbo.[ALUMNO] WHERE [Cel_Alu] IS NOT NULL AND (DATALENGTH(CONVERT(varchar(max),[Cel_Alu]))<>9 OR CONVERT(varchar(max),[Cel_Alu]) COLLATE Latin1_General_100_BIN2 LIKE '%[^0-9]%');
SELECT 'ALUMNO.Cel_Apoderado' AS Campo,[DNI_Alu] AS DNI,[Cel_Apoderado] AS Valor FROM dbo.[ALUMNO] WHERE [Cel_Apoderado] IS NOT NULL AND (DATALENGTH(CONVERT(varchar(max),[Cel_Apoderado]))<>9 OR CONVERT(varchar(max),[Cel_Apoderado]) COLLATE Latin1_General_100_BIN2 LIKE '%[^0-9]%');
SELECT 'Docente.Cel_Doc' AS Campo,[DNI_Doc] AS DNI,[Cel_Doc] AS Valor FROM dbo.[Docente] WHERE ([Cel_Doc] IS NULL OR DATALENGTH(CONVERT(varchar(max),[Cel_Doc]))<>9 OR CONVERT(varchar(max),[Cel_Doc]) COLLATE Latin1_General_100_BIN2 LIKE '%[^0-9]%');
 THROW 54010,'Celulares incompatibles. No se truncaron ni corrigieron valores; solicitar correccion autorizada.',1;
 END;
IF COL_LENGTH('dbo.Docente','Cel_Doc')<>9 ALTER TABLE dbo.[Docente] ALTER COLUMN [Cel_Doc] varchar(9) NOT NULL;
IF OBJECT_ID('dbo.CK_V4_Docente_Cel_Doc','C') IS NULL
 ALTER TABLE dbo.[Docente] WITH CHECK ADD CONSTRAINT [CK_V4_Docente_Cel_Doc] CHECK ((DATALENGTH([Cel_Doc])=9 AND [Cel_Doc] COLLATE Latin1_General_100_BIN2 NOT LIKE '%[^0-9]%'));
ALTER TABLE dbo.[Docente] WITH CHECK CHECK CONSTRAINT [CK_V4_Docente_Cel_Doc];
IF NOT EXISTS (SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='01_ACTUALIZACION_CELULARES')
 INSERT dbo.Control_Migracion_V4 (Script) VALUES ('01_ACTUALIZACION_CELULARES');
COMMIT;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
SELECT OBJECT_NAME(object_id) AS Tabla,name,max_length,is_nullable FROM sys.columns WHERE name IN ('Cel_Alu','Cel_Apoderado','Cel_Doc');
