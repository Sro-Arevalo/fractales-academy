-- Solo lectura. La funcionalidad HTTP se prueba con npm run test:sql:v44, solo localhost.
SET NOCOUNT ON;
IF OBJECT_ID('dbo.APODERADO') IS NOT NULL THROW 54440,'Entidad antigua todavia presente.',1;
IF (SELECT COUNT(*) FROM dbo.Control_Migracion_V4 WHERE Script IN('V44_01_PREPARAR','V44_02_MIGRAR','V44_04_RETIRAR'))<>3 THROW 54440,'V4.4 incompleta.',1;
IF EXISTS(SELECT 1 FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1)
 OR EXISTS(SELECT 1 FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1) THROW 54441,'Restricciones no confiables.',1;
IF COL_LENGTH('dbo.Grupo','Estado_Horario') IS NULL OR COL_LENGTH('dbo.Horario','Excepcion_Turno') IS NULL THROW 54442,'Backend incompatible.',1;
IF EXISTS(SELECT 1 FROM sys.sql_modules WHERE (N' '+definition+N' ') COLLATE Latin1_General_100_CI_AS LIKE N'%[^a-z0-9_]APODERADO[^a-z0-9_]%') THROW 54443,'Modulo SQL depende de tabla retirada.',1;
IF EXISTS(SELECT 1 FROM sys.indexes i JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id
 WHERE i.object_id=OBJECT_ID('dbo.ALUMNO') AND i.is_unique=1 AND c.name='DNI_Apoderado' AND ic.key_ordinal>0) THROW 54444,'DNI de apoderado indebidamente unico.',1;
IF (SELECT COUNT(*) FROM sys.triggers WHERE name IN('TR_Horario_Sin_Cruces','TR_V43_MarcaPrueba','TR_V44_Grupo_Publicacion','TR_V44_Matricula_Publicada','TR_V44_Nota_Eliminar','TR_V44_Pago_Eliminar') AND is_disabled=0)<>6 THROW 54445,'Falta un trigger de proteccion activo.',1;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Grupo') AND name='UX_Grupo_UnidadPublicada' AND is_unique=1 AND is_disabled=0) THROW 54446,'Falta indice de unidad academica.',1;
DBCC CHECKCONSTRAINTS WITH ALL_CONSTRAINTS;
SELECT COUNT(*) TablasFinales,35 TablasEstandarEsperadas FROM sys.tables WHERE is_ms_shipped=0;
SELECT name Relacion,OBJECT_NAME(parent_object_id) Hija,OBJECT_NAME(referenced_object_id) Padre FROM sys.foreign_keys ORDER BY Padre,Hija;
SELECT Estado_Horario,Activo,COUNT(*) Horarios FROM dbo.Grupo GROUP BY Estado_Horario,Activo;
SELECT Script,Fecha FROM dbo.Control_Migracion_V4 WHERE Script LIKE 'V44[_]%' ORDER BY Script;
