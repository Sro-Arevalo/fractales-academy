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
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='V41_03_ESTADOS_Y_ANULACIONES') THROW 54104,'Falta la migracion V4.1 anterior.',1;
BEGIN TRY
 BEGIN TRAN;

-- Reutiliza Auditoria_V4 y su FK a Usuario. No cambia su estructura ni borra historia.
IF OBJECT_ID('dbo.TR_V4_Auditoria_Inmutable','TR') IS NULL OR EXISTS(SELECT 1 FROM sys.triggers WHERE object_id=OBJECT_ID('dbo.TR_V4_Auditoria_Inmutable') AND is_disabled=1)
 THROW 54140,'La proteccion de auditoria V4 debe estar instalada y activa.',1;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Auditoria_V4') AND name='IX_Auditoria_V41_Fecha')
 CREATE INDEX IX_Auditoria_V41_Fecha ON dbo.Auditoria_V4(Fecha DESC,Id DESC) INCLUDE(Entidad,Codigo,Accion,Usuario_Cod_Usuario);
-- El backend registra cambios y eliminaciones de catalogos en la misma transaccion.
-- Nunca registra contrasenas, OTP, hashes de claves ni desafios de activacion en Auditoria_V4.


 IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='V41_04_AUDITORIA_ADMINISTRATIVA') INSERT dbo.Control_Migracion_V4(Script) VALUES ('V41_04_AUDITORIA_ADMINISTRATIVA');
 COMMIT;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
SELECT Script,Fecha FROM dbo.Control_Migracion_V4 WHERE Script LIKE 'V41[_]%' ORDER BY Script;
