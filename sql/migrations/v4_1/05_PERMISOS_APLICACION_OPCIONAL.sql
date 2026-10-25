-- OPCIONAL: solo si el principal SQL existente de la aplicación tiene permisos por tabla.
-- No crea usuarios, roles, logins, contraseñas ni conexiones. No ejecutar sin revisar el principal.
-- Los cuatro scripts estructurales V4.1 deben estar completos.
SET NOCOUNT ON; SET XACT_ABORT ON;
DECLARE @BaseEsperada sysname=N'FractalesAcademy';
DECLARE @UsuarioAplicacion sysname=N'REEMPLAZAR_POR_USUARIO_SQL_EXISTENTE';
IF DB_NAME()<>@BaseEsperada OR DB_NAME() IN ('master','model','msdb','tempdb') THROW 54150,'Base incorrecta.',1;
IF @UsuarioAplicacion=N'REEMPLAZAR_POR_USUARIO_SQL_EXISTENTE' OR @UsuarioAplicacion IN ('dbo','guest','public','sys','INFORMATION_SCHEMA')
 THROW 54151,'Seleccione explicitamente el usuario de base de datos que usa la aplicacion.',1;
IF NOT EXISTS(SELECT 1 FROM sys.database_principals WHERE name=@UsuarioAplicacion AND type IN ('S','E','X','U','G'))
 THROW 54152,'El principal indicado no existe o no es un usuario/grupo de aplicacion.',1;
IF (SELECT COUNT(*) FROM dbo.Control_Migracion_V4 WHERE Script IN ('V41_01_RECUPERACION_CUENTAS','V41_02_VERIFICACION_CONTACTOS','V41_03_ESTADOS_Y_ANULACIONES','V41_04_AUDITORIA_ADMINISTRATIVA'))<>4
 THROW 54153,'Complete primero las cuatro migraciones V4.1.',1;
BEGIN TRY
 BEGIN TRAN;
 DECLARE @Comando nvarchar(max)=N'';
 SET @Comando=N'GRANT SELECT ON OBJECT::dbo.Control_Migracion_V4 TO '+QUOTENAME(@UsuarioAplicacion)+N';';
 SELECT @Comando=@Comando+N'GRANT SELECT,INSERT,UPDATE ON OBJECT::dbo.'+QUOTENAME(t.Tabla)+N' TO '+QUOTENAME(@UsuarioAplicacion)+N';'
 FROM (VALUES ('Usuario_Seguridad_V41'),('Cuenta_Codigo_V41'),('Contacto_Verificado_V41'),('Solicitud_Contacto_V41'),('Alumno_Estado_V41'),('Nota_Estado_V41')) t(Tabla);
 SELECT @Comando=@Comando+N'GRANT DELETE ON OBJECT::dbo.'+QUOTENAME(t.Tabla)+N' TO '+QUOTENAME(@UsuarioAplicacion)+N';'
 FROM (VALUES ('CURSOS'),('CARRERA'),('Aula'),('Grupo'),('Ciclo'),('Docente'),('Docente_Asignatura'),('Examen'),('Horario')) t(Tabla);
 EXEC sys.sp_executesql @Comando;
 COMMIT;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
SELECT p.name AS Principal,OBJECT_NAME(dp.major_id) AS Objeto,dp.permission_name,dp.state_desc
FROM sys.database_permissions dp JOIN sys.database_principals p ON p.principal_id=dp.grantee_principal_id
WHERE p.name=@UsuarioAplicacion AND dp.class=1 ORDER BY Objeto,dp.permission_name;
-- No se concede DELETE sobre alumnos, matrículas, pagos, notas, usuarios, códigos, contactos ni auditoría.
-- No revoca permisos anteriores: comprobar por separado que el principal no tenga db_owner innecesario.
