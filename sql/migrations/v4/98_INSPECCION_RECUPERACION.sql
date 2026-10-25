-- SOLO LECTURA. Evidencia para aplicar el procedimiento de recuperación de la guía.
-- No revierte DDL ni pagos, no restaura bases y no cambia conexiones.
SET NOCOUNT ON;
SELECT DB_NAME() AS BaseActual,CONVERT(nvarchar(128),SERVERPROPERTY('ServerName')) AS Servidor,
       SYSUTCDATETIME() AS HoraUTC, SYSDATETIMEOFFSET() AT TIME ZONE 'SA Pacific Standard Time' AS HoraPeru;
IF OBJECT_ID('dbo.Control_Migracion_V4') IS NOT NULL
 EXEC(N'SELECT Script,Fecha FROM dbo.Control_Migracion_V4 ORDER BY Fecha,Script');
IF OBJECT_ID('dbo.Linea_Base_V4') IS NOT NULL
 EXEC(N'SELECT Tabla,COUNT_BIG(*) AS RegistrosCapturados FROM dbo.Linea_Base_V4 GROUP BY Tabla ORDER BY Tabla');
IF OBJECT_ID('dbo.Auditoria_V4') IS NOT NULL
 EXEC(N'SELECT TOP(100) Id,Entidad,Codigo,Accion,Usuario_Cod_Usuario,Motivo,Fecha FROM dbo.Auditoria_V4 ORDER BY Id DESC');
SELECT name,is_disabled FROM sys.triggers WHERE parent_class=1;
SELECT name,is_disabled,is_not_trusted FROM sys.foreign_keys;
SELECT name,is_disabled,is_not_trusted FROM sys.check_constraints;
-- Conservar esta salida y la de 99_VERIFICACION_FINAL junto al respaldo verificado.
-- Si ya hubo operaciones V4, NO reactivar V3 ni eliminar objetos como reversión.
-- La guía distingue fallo transaccional, publicación fallida y restauración PITR a otra base.
