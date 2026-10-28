-- Solo lectura. Ejecutar en la base V4.3; no cambia datos ni permisos.
SET NOCOUNT ON;
SELECT DB_NAME() BaseActual,@@VERSION Motor;
SELECT s.name Esquema,t.name Tabla,SUM(p.rows) Filas FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id
 JOIN sys.partitions p ON p.object_id=t.object_id AND p.index_id IN(0,1) WHERE t.is_ms_shipped=0 GROUP BY s.name,t.name ORDER BY s.name,t.name;
SELECT fk.name Relacion,OBJECT_SCHEMA_NAME(fk.parent_object_id) Esquema,OBJECT_NAME(fk.parent_object_id) Hija,
 pc.name Columna,OBJECT_NAME(fk.referenced_object_id) Padre,rc.name Referencia,fk.is_disabled,fk.is_not_trusted,fk.delete_referential_action_desc
 FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fc ON fc.constraint_object_id=fk.object_id
 JOIN sys.columns pc ON pc.object_id=fc.parent_object_id AND pc.column_id=fc.parent_column_id
 JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id ORDER BY Padre,Hija,fk.name,fc.constraint_column_id;
SELECT OBJECT_SCHEMA_NAME(referencing_id) Esquema,OBJECT_NAME(referencing_id) Objeto,referenced_entity_name Dependencia
 FROM sys.sql_expression_dependencies WHERE referenced_id IN(OBJECT_ID('dbo.Grupo'),OBJECT_ID('dbo.APODERADO'));
SELECT OBJECT_SCHEMA_NAME(object_id) Esquema,OBJECT_NAME(object_id) ModuloConReferenciaTextual FROM sys.sql_modules
 WHERE (N' '+definition+N' ') COLLATE Latin1_General_100_CI_AS LIKE N'%[^a-z0-9_]APODERADO[^a-z0-9_]%' OR definition IS NULL;
SELECT g.*,c.Modalidad,c.Fech_Inicio,c.Fech_Fin,
 (SELECT COUNT(*) FROM dbo.MATRICULA m WHERE m.Grupo_Cod_Grupo=g.Cod_Grupo) Matriculas,
 (SELECT COUNT(*) FROM dbo.Horario h WHERE h.Grupo_Cod_Grupo=g.Cod_Grupo) Bloques,
 (SELECT COUNT(*) FROM dbo.Examen_Grupo e WHERE e.Grupo_Cod_Grupo=g.Cod_Grupo) Simulacros FROM dbo.Grupo g JOIN dbo.Ciclo c ON c.Cod_Ciclo=g.Ciclo_Cod_Ciclo;
-- Unidad academica: ciclo + turno + aula. Diferentes aulas permiten conjuntos del mismo ciclo.
SELECT Ciclo_Cod_Ciclo,Turno_Cod_Turno,Aula_Cod_Aula,COUNT(*) DuplicadosActivos FROM dbo.Grupo g WHERE Activo=1
 AND (EXISTS(SELECT 1 FROM dbo.Horario h WHERE h.Grupo_Cod_Grupo=g.Cod_Grupo AND h.Activo=1)
 OR EXISTS(SELECT 1 FROM dbo.MATRICULA m WHERE m.Grupo_Cod_Grupo=g.Cod_Grupo))
 GROUP BY Ciclo_Cod_Ciclo,Turno_Cod_Turno,Aula_Cod_Aula HAVING COUNT(*)>1;
IF OBJECT_ID('dbo.APODERADO') IS NOT NULL
 EXEC(N'SELECT p.*,(SELECT COUNT(*) FROM dbo.ALUMNO a WHERE a.DNI_Apoderado=p.DNI_Apoderado) Alumnos FROM dbo.APODERADO p;
 SELECT a.DNI_Alu,a.DNI_Apoderado,a.Nomb_Apoderado NombreAlumno,p.Nomb_Apoderado NombreEntidad FROM dbo.ALUMNO a
 JOIN dbo.APODERADO p ON p.DNI_Apoderado=a.DNI_Apoderado WHERE
 (NULLIF(a.Nomb_Apoderado,'''') IS NOT NULL AND a.Nomb_Apoderado<>p.Nomb_Apoderado)
 OR (a.Cel_Apoderado IS NOT NULL AND ISNULL(a.Cel_Apoderado,'''')<>ISNULL(p.Cel_Apoderado,''''))
 OR (a.Correo_Apoderado IS NOT NULL AND ISNULL(a.Correo_Apoderado,'''')<>ISNULL(p.Correo_Apoderado,''''));');
SELECT i.name Indice,i.is_unique,c.name Columna FROM sys.indexes i JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id
 JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE i.object_id=OBJECT_ID('dbo.ALUMNO') AND c.name='DNI_Apoderado';
SELECT Script,Fecha FROM dbo.Control_Migracion_V4 ORDER BY Script;
