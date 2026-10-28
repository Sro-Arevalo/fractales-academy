-- Solo lectura; incluir los resultados en la evidencia del ensayo.
SET NOCOUNT ON;
SELECT DB_NAME() BaseSeleccionada;
IF OBJECT_ID('dbo.APODERADO') IS NULL OR COL_LENGTH('dbo.ALUMNO','Es_Prueba') IS NULL THROW 54307,'Falta la estructura V4.3.',1;
SELECT Script,Fecha FROM dbo.Control_Migracion_V4 ORDER BY Script;
SELECT fk.name Relacion,OBJECT_NAME(fk.parent_object_id) Tabla,OBJECT_NAME(fk.referenced_object_id) Destino,fk.is_disabled,fk.is_not_trusted FROM sys.foreign_keys fk ORDER BY Tabla,Relacion;
SELECT OBJECT_NAME(i.object_id) Tabla,i.name,i.is_unique,i.filter_definition FROM sys.indexes i WHERE i.index_id>0 AND OBJECTPROPERTY(i.object_id,'IsUserTable')=1 ORDER BY Tabla,i.name;
SELECT OBJECT_NAME(parent_object_id) Tabla,name,is_disabled,is_not_trusted FROM sys.check_constraints;
SELECT OBJECT_NAME(parent_id) Tabla,name,is_disabled,OBJECT_DEFINITION(object_id) Definicion FROM sys.triggers WHERE parent_class=1;
SELECT a.DNI_Alu FROM dbo.ALUMNO a LEFT JOIN dbo.APODERADO p ON p.DNI_Apoderado=a.DNI_Apoderado WHERE a.DNI_Apoderado IS NOT NULL AND p.DNI_Apoderado IS NULL;
SELECT p.Cod_Pago FROM dbo.Pago p LEFT JOIN dbo.ALUMNO a ON a.DNI_Alu=p.ALUMNO_DNI_Alu LEFT JOIN dbo.MATRICULA m ON m.Cod_Matricula=p.MATRICULA_Cod_Matricula WHERE a.DNI_Alu IS NULL OR (p.MATRICULA_Cod_Matricula IS NOT NULL AND (m.Cod_Matricula IS NULL OR m.ALUMNO_DNI_Alu<>p.ALUMNO_DNI_Alu));
SELECT MATRICULA_Cod_Matricula,Nro_Mensualidad,COUNT(*) Cantidad FROM dbo.Pago WHERE CONCEPTO_PAGO_Cod_Concepto='MENSUALIDAD' GROUP BY MATRICULA_Cod_Matricula,Nro_Mensualidad HAVING COUNT(*)>1;
IF EXISTS(SELECT 1 FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1) OR EXISTS(SELECT 1 FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1) THROW 54302,'Hay restricciones sin validar.',1;
DBCC CHECKCONSTRAINTS WITH ALL_CONSTRAINTS;
