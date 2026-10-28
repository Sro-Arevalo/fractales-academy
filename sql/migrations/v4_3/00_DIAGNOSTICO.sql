-- Solo lectura. Ejecutar en la base seleccionada, nunca en master.
SET NOCOUNT ON;
SELECT DB_NAME() BaseSeleccionada, @@SERVERNAME Servidor;
SELECT t.name Tabla, SUM(p.rows) Filas FROM sys.tables t JOIN sys.partitions p ON p.object_id=t.object_id AND p.index_id IN (0,1) GROUP BY t.name ORDER BY t.name;
SELECT DNI_Apoderado, COUNT(*) Alumnos FROM dbo.ALUMNO WHERE DNI_Apoderado IS NOT NULL
 GROUP BY DNI_Apoderado HAVING COUNT(DISTINCT Nomb_Apoderado)>1 OR COUNT(DISTINCT ISNULL(Cel_Apoderado,''))>1 OR COUNT(DISTINCT ISNULL(Correo_Apoderado,''))>1;
SELECT name, is_disabled, is_not_trusted FROM sys.foreign_keys;
SELECT name, is_disabled, is_not_trusted FROM sys.check_constraints;
SELECT name, is_disabled, OBJECT_DEFINITION(object_id) Definicion FROM sys.triggers WHERE parent_class=1;
SELECT OBJECT_SCHEMA_NAME(object_id) Esquema, OBJECT_NAME(object_id) Tabla, name, is_unique, filter_definition FROM sys.indexes WHERE index_id>0 AND OBJECTPROPERTY(object_id,'IsUserTable')=1;
SELECT name, delete_referential_action_desc FROM sys.foreign_keys WHERE delete_referential_action<>0;
