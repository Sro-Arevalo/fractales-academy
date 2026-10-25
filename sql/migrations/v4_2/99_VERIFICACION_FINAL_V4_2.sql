-- SOLO LECTURA. Ejecutar con el principal de la aplicación para revisar sus permisos efectivos.
SET NOCOUNT ON;
SELECT DB_NAME() AS BaseActual,USER_NAME() AS PrincipalActual;
SELECT COUNT(*) AS Tablas FROM sys.tables WHERE is_ms_shipped=0;
SELECT COUNT(*) AS Relaciones FROM sys.foreign_keys;
SELECT name,'FK' AS Tipo FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1
UNION ALL SELECT name,'CHECK' FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1;
SELECT Script,Fecha FROM dbo.Control_Migracion_V4 ORDER BY Script;
SELECT t.Tabla,HAS_PERMS_BY_NAME('dbo.'+t.Tabla,'OBJECT','DELETE') AS PuedeEliminar
FROM (VALUES ('ALUMNO'),('Usuario'),('MATRICULA'),('Pago'),('Nota_Examen'),('Auditoria_V4')) t(Tabla);
SELECT name,is_disabled FROM sys.triggers WHERE name='TR_V4_Auditoria_Inmutable';
SELECT Entidad,Accion,COUNT_BIG(*) AS Operaciones FROM dbo.Auditoria_V4 WHERE Accion='ELIMINAR' GROUP BY Entidad,Accion;
-- Con permisos mínimos: DELETE=1 en ALUMNO/Usuario y 0 en las cuatro entidades históricas.
-- El modelo completo conserva 35 tablas y 40 FK; no elimina objetos adicionales legítimos.
-- Las marcas siguen siendo siete V4 y cuatro V4.1. No existe una marca estructural V4.2.
-- Verificar en entorno independiente: registro libre elimina/audita; vinculado bloquea; baja/anulación conservan datos.
