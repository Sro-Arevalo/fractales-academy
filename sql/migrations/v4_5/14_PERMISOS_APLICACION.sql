-- MANUAL, ejecutar como administrador de la base DESPUES de 09.
-- La identidad de App Service debe ser usuario contenido, sin db_owner/db_ddladmin.
-- No modifica administradores SQL ni crea credenciales.
DECLARE @UsuarioAplicacion sysname=N'REEMPLAZAR_USUARIO_CONTENIDO';
IF @UsuarioAplicacion=N'REEMPLAZAR_USUARIO_CONTENIDO' OR DATABASE_PRINCIPAL_ID(@UsuarioAplicacion) IS NULL THROW 54514,'Selecciona el usuario SQL contenido de la aplicacion.',1;
IF IS_ROLEMEMBER('db_owner',@UsuarioAplicacion)=1 OR IS_ROLEMEMBER('db_ddladmin',@UsuarioAplicacion)=1 THROW 54514,'Retira roles elevados antes de aplicar permisos minimos.',1;
DECLARE @q nvarchar(max)=N'GRANT VIEW DEFINITION TO '+QUOTENAME(@UsuarioAplicacion)+N';';
SELECT @q+=N' GRANT SELECT,INSERT,UPDATE,DELETE ON dbo.'+QUOTENAME(name)+N' TO '+QUOTENAME(@UsuarioAplicacion)+N';'
 FROM sys.tables WHERE schema_id=SCHEMA_ID('dbo') AND is_ms_shipped=0 AND name NOT IN('sysdiagrams','AUDITORIA_SISTEMA','CONSTANCIA_AUDITORIA','CONTROL_MIGRACION','LINEA_BASE_MIGRACION');
SET @q+=N' GRANT SELECT ON dbo.CONTROL_MIGRACION TO '+QUOTENAME(@UsuarioAplicacion)+N'; GRANT SELECT ON dbo.LINEA_BASE_MIGRACION TO '+QUOTENAME(@UsuarioAplicacion)+N';
 GRANT SELECT,INSERT ON dbo.AUDITORIA_SISTEMA TO '+QUOTENAME(@UsuarioAplicacion)+N'; DENY UPDATE,DELETE ON dbo.AUDITORIA_SISTEMA TO '+QUOTENAME(@UsuarioAplicacion)+N';
 GRANT SELECT ON dbo.CONSTANCIA_AUDITORIA TO '+QUOTENAME(@UsuarioAplicacion)+N'; DENY INSERT,UPDATE,DELETE ON dbo.CONSTANCIA_AUDITORIA TO '+QUOTENAME(@UsuarioAplicacion)+N';
 GRANT EXECUTE ON dbo.SP_AUDITORIA_PROCESAR_PRUEBAS TO '+QUOTENAME(@UsuarioAplicacion)+N'; GRANT UPDATE ON OBJECT::dbo.SECUENCIA_OPERACION TO '+QUOTENAME(@UsuarioAplicacion)+N';';
EXEC sys.sp_executesql @q;
