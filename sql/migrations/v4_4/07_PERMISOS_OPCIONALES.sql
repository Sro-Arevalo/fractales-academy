-- OPCIONAL, ejecutar como DBA. Complementa permisos V4.1/V4.2/V4.3 existentes.
-- La identidad de la aplicacion no debe ser db_owner ni compartirse con personas.
SET NOCOUNT ON; SET XACT_ABORT ON;
DECLARE @BaseEsperada sysname=N'FractalesAcademy';
DECLARE @UsuarioAplicacion sysname=N'REEMPLAZAR_POR_USUARIO_SQL_EXISTENTE';
IF DB_NAME()<>@BaseEsperada OR USER_ID(@UsuarioAplicacion) IS NULL OR @UsuarioAplicacion=N'REEMPLAZAR_POR_USUARIO_SQL_EXISTENTE' THROW 54400,'Confirma base y principal limitado existente.',1;
IF @UsuarioAplicacion IN('dbo','guest','public','sys','INFORMATION_SCHEMA') OR NOT EXISTS(SELECT 1 FROM sys.database_principals WHERE name=@UsuarioAplicacion AND type IN('S','E','X','U','G')) THROW 54400,'Usar un usuario o identidad limitada, no un rol ni principal del sistema.',1;
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='V44_04_RETIRAR') THROW 54401,'Completa V4.4 antes de ajustar permisos.',1;
DECLARE @s nvarchar(max)=N'GRANT SELECT,INSERT,UPDATE,DELETE ON dbo.Grupo TO '+QUOTENAME(@UsuarioAplicacion)+N';
 GRANT SELECT,INSERT,UPDATE,DELETE ON dbo.Horario TO '+QUOTENAME(@UsuarioAplicacion)+N';
 GRANT DELETE ON dbo.Nota_Examen TO '+QUOTENAME(@UsuarioAplicacion)+N';
 GRANT SELECT,DELETE ON dbo.Nota_Estado_V41 TO '+QUOTENAME(@UsuarioAplicacion)+N';
 GRANT VIEW DEFINITION TO '+QUOTENAME(@UsuarioAplicacion)+N';';
BEGIN TRY BEGIN TRAN; EXEC sys.sp_executesql @s; COMMIT; END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;
-- No otorga DELETE/UPDATE sobre auditoria, ALTER ni roles administrativos.
-- La API revisa alumno inactivo, marca inmutable, cobros, FK, confirmacion, motivo y preview firmado.
-- Los triggers SQL impiden borrar notas reales y cobros realizados, aun con DELETE concedido.
