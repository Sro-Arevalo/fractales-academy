-- SOLO LECTURA. V4.2 no cambia tablas, columnas, relaciones ni datos.
-- Ejecutar con visibilidad completa de metadatos. No interpretar relaciones ocultas como inexistentes.
SET NOCOUNT ON;
SELECT DB_NAME() AS BaseActual,USER_NAME() AS PrincipalActual;
IF OBJECT_ID('dbo.Auditoria_V4') IS NULL OR OBJECT_ID('dbo.Usuario') IS NULL OR OBJECT_ID('dbo.ALUMNO') IS NULL
 THROW 54200,'Falta el esquema V4 y su auditoria. Complete y verifique V4 antes de continuar.',1;
SELECT Script,Fecha FROM dbo.Control_Migracion_V4 ORDER BY Script;
SELECT t.name AS Tabla,p.rows AS Filas
FROM sys.tables t JOIN sys.partitions p ON p.object_id=t.object_id AND p.index_id IN (0,1)
WHERE t.is_ms_shipped=0 ORDER BY t.name;
SELECT fk.name AS Relacion,OBJECT_SCHEMA_NAME(fk.parent_object_id) AS Esquema,
 OBJECT_NAME(fk.parent_object_id) AS TablaDependiente,OBJECT_NAME(fk.referenced_object_id) AS TablaReferenciada,
 fk.is_disabled,fk.is_not_trusted,fk.delete_referential_action_desc
FROM sys.foreign_keys fk WHERE fk.referenced_object_id IN (OBJECT_ID('dbo.Usuario'),OBJECT_ID('dbo.ALUMNO')) ORDER BY TablaReferenciada,TablaDependiente;
SELECT name AS Restriccion,'FK' AS Tipo FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1
UNION ALL SELECT name,'CHECK' FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1;
SELECT 'ALUMNO' AS Tabla,HAS_PERMS_BY_NAME('dbo.ALUMNO','OBJECT','DELETE') AS PuedeEliminar
UNION ALL SELECT 'Usuario',HAS_PERMS_BY_NAME('dbo.Usuario','OBJECT','DELETE');
SELECT COUNT_BIG(*) AS AdministradoresActivos FROM dbo.Usuario WHERE ROL_Cod_Rol='ADMIN' AND Activo=1;
SELECT Entidad,Accion,COUNT_BIG(*) AS Operaciones FROM dbo.Auditoria_V4 WHERE Entidad IN ('ALUMNO','Usuario') GROUP BY Entidad,Accion;
-- No propone personas para eliminar. La aplicación revisa cada registro en una transacción.
