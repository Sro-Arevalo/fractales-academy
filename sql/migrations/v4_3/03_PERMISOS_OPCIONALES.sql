-- Aplicar como DBA después de revisar los permisos V4.1/V4.2. No concede roles de propietario.
SET NOCOUNT ON; SET XACT_ABORT ON;
DECLARE @BaseEsperada sysname=N'FractalesAcademy';
DECLARE @UsuarioAplicacion sysname=N'REEMPLAZAR_POR_USUARIO_SQL_EXISTENTE';
IF DB_NAME()<>@BaseEsperada OR USER_ID(@UsuarioAplicacion) IS NULL OR @UsuarioAplicacion=N'REEMPLAZAR_POR_USUARIO_SQL_EXISTENTE' THROW 54300,'Confirma base y principal de la aplicacion.',1;
IF @UsuarioAplicacion IN ('dbo','guest','public','sys','INFORMATION_SCHEMA') OR NOT EXISTS(SELECT 1 FROM sys.database_principals WHERE name=@UsuarioAplicacion AND type IN ('S','E','X','U','G')) THROW 54300,'Selecciona un usuario o identidad de aplicacion limitado, no un principal del sistema.',1;
IF OBJECT_ID('dbo.APODERADO') IS NULL THROW 54307,'Completa V4.3 antes de conceder permisos.',1;
DECLARE @s nvarchar(max)=N'GRANT SELECT,INSERT,UPDATE,DELETE ON dbo.APODERADO TO '+QUOTENAME(@UsuarioAplicacion)+N';
 GRANT SELECT,INSERT,DELETE ON dbo.ALUMNO TO '+QUOTENAME(@UsuarioAplicacion)+N';
 GRANT DELETE ON dbo.MATRICULA TO '+QUOTENAME(@UsuarioAplicacion)+N';
 GRANT DELETE ON dbo.Pago TO '+QUOTENAME(@UsuarioAplicacion)+N';
 GRANT DELETE ON dbo.Usuario TO '+QUOTENAME(@UsuarioAplicacion)+N';
 GRANT SELECT,UPDATE ON dbo.Usuario (Correo_Recuperacion,Correo_Verificado) TO '+QUOTENAME(@UsuarioAplicacion)+N';
 GRANT DELETE ON dbo.Solicitud_Contacto_V41 TO '+QUOTENAME(@UsuarioAplicacion)+N';
 GRANT DELETE ON dbo.Contacto_Verificado_V41 TO '+QUOTENAME(@UsuarioAplicacion)+N';
 GRANT DELETE ON dbo.Cuenta_Codigo_V41 TO '+QUOTENAME(@UsuarioAplicacion)+N';
 GRANT DELETE ON dbo.Usuario_Seguridad_V41 TO '+QUOTENAME(@UsuarioAplicacion)+N';
 GRANT DELETE ON dbo.Alumno_Estado_V41 TO '+QUOTENAME(@UsuarioAplicacion)+N';
 GRANT VIEW DEFINITION TO '+QUOTENAME(@UsuarioAplicacion)+N';';
BEGIN TRY
 BEGIN TRAN;
 EXEC sys.sp_executesql @s;
 COMMIT;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
-- No conceder DELETE/UPDATE sobre Auditoria_V4 ni DELETE sobre Nota_Examen.
-- Estos permisos confían en la API administrativa para la política de eliminación.
-- No compartir las credenciales SQL con usuarios ni estudiantes.
