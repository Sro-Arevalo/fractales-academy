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
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='05_ACTUALIZACION_HORARIOS') THROW 54008,'Falta una migracion anterior. Respetar el orden de la guia.',1;
BEGIN TRY
BEGIN TRAN;

-- Los campos de hash y cambio obligatorio ya existen: NO se cambian hashes, claves ni usuarios antiguos.
IF EXISTS (SELECT ALUMNO_DNI_Alu FROM dbo.Usuario WHERE ALUMNO_DNI_Alu IS NOT NULL GROUP BY ALUMNO_DNI_Alu HAVING COUNT_BIG(*)>1)
 THROW 54060,'Hay cuentas de alumno duplicadas. Requiere conciliacion manual.',1;
IF EXISTS (SELECT 1 FROM dbo.Usuario WHERE ROL_Cod_Rol NOT IN ('ADMIN','ALUMNO') OR (ROL_Cod_Rol='ALUMNO' AND ALUMNO_DNI_Alu IS NULL) OR (ROL_Cod_Rol='ADMIN' AND ALUMNO_DNI_Alu IS NOT NULL))
 THROW 54061,'Hay cuentas incompatibles con los roles ADMIN/ALUMNO.',1;
IF EXISTS (SELECT 1 FROM dbo.ROL WHERE Cod_Rol NOT IN ('ADMIN','ALUMNO')) THROW 54062,'Hay roles fuera del modelo acordado; revisar sin eliminarlos.',1;
IF NOT EXISTS (SELECT 1 FROM dbo.ROL WHERE Cod_Rol='ADMIN') OR NOT EXISTS (SELECT 1 FROM dbo.ROL WHERE Cod_Rol='ALUMNO') THROW 54063,'Faltan los roles originales. Revisar los catalogos antes de continuar.',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Usuario') AND name='UX_Usuario_UnicaCuentaAlumno')
 CREATE UNIQUE INDEX UX_Usuario_UnicaCuentaAlumno ON dbo.Usuario(ALUMNO_DNI_Alu) WHERE ALUMNO_DNI_Alu IS NOT NULL;
-- Nomb_Usuario mantiene UNIQUE; las cuentas NUEVAS usan DNI, las anteriores conservan su acceso.

IF NOT EXISTS (SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='06_ACTUALIZACION_USUARIOS')
 INSERT dbo.Control_Migracion_V4 (Script) VALUES ('06_ACTUALIZACION_USUARIOS');
COMMIT;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
SELECT Cod_Rol,Nomb_Rol FROM dbo.ROL; SELECT name,is_unique,filter_definition FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Usuario');
