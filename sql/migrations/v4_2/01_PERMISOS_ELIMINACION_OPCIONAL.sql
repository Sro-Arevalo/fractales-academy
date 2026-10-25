-- ÚNICA escritura opcional V4.2: permisos a un usuario de aplicación YA EXISTENTE.
-- No modifica estructura/datos. No crea usuarios, roles, secretos ni cascadas.
-- Revisar base y principal manualmente. Requiere V4.1 completo y sus permisos anteriores.
SET NOCOUNT ON; SET XACT_ABORT ON;
DECLARE @BaseEsperada sysname=N'FractalesAcademy';
DECLARE @UsuarioAplicacion sysname=N'REEMPLAZAR_POR_USUARIO_SQL_EXISTENTE';
IF DB_NAME()<>@BaseEsperada OR DB_NAME() IN ('master','model','msdb','tempdb') THROW 54210,'Base incorrecta.',1;
IF @UsuarioAplicacion=N'REEMPLAZAR_POR_USUARIO_SQL_EXISTENTE' OR @UsuarioAplicacion IN ('dbo','guest','public','sys','INFORMATION_SCHEMA')
 THROW 54211,'Seleccione explicitamente el principal existente de la aplicacion.',1;
IF NOT EXISTS(SELECT 1 FROM sys.database_principals WHERE name=@UsuarioAplicacion AND type IN ('S','E','X','U','G'))
 THROW 54212,'El usuario/grupo indicado no existe o no corresponde a un principal de aplicacion.',1;
IF OBJECT_ID('dbo.Auditoria_V4') IS NULL OR OBJECT_ID('dbo.Control_Migracion_V4') IS NULL THROW 54213,'Falta V4.',1;
IF (SELECT COUNT(*) FROM dbo.Control_Migracion_V4 WHERE Script IN ('V41_01_RECUPERACION_CUENTAS','V41_02_VERIFICACION_CONTACTOS','V41_03_ESTADOS_Y_ANULACIONES','V41_04_AUDITORIA_ADMINISTRATIVA'))<>4
 THROW 54214,'Complete y verifique primero V4.1.',1;
IF EXISTS(SELECT 1 FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1)
 OR EXISTS(SELECT 1 FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1)
 THROW 54215,'Revise primero las restricciones deshabilitadas o no confiables.',1;
BEGIN TRY
 BEGIN TRAN;
 DECLARE @Sql nvarchar(max)=N'GRANT DELETE ON OBJECT::dbo.ALUMNO TO '+QUOTENAME(@UsuarioAplicacion)+N'; GRANT DELETE ON OBJECT::dbo.Usuario TO '+QUOTENAME(@UsuarioAplicacion)+N';';
 EXEC sys.sp_executesql @Sql;
 COMMIT;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
SELECT p.name AS Principal,OBJECT_NAME(dp.major_id) AS Objeto,dp.permission_name,dp.state_desc
FROM sys.database_permissions dp JOIN sys.database_principals p ON p.principal_id=dp.grantee_principal_id
WHERE p.name=@UsuarioAplicacion AND dp.class=1 AND dp.major_id IN (OBJECT_ID('dbo.ALUMNO'),OBJECT_ID('dbo.Usuario'));
-- No concede DELETE sobre matrículas, pagos, notas, auditoría o tablas V4.1.
-- No reduce privilegios anteriores ni supera DENY heredados. No concede db_owner/db_datawriter.
